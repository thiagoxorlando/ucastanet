import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { notify } from "@/lib/notify";
import { requireJobLimit, requireTalentsNeededForJob } from "@/lib/requireActiveSubscription";
import { getJobSuggestions } from "@/lib/getJobSuggestions";
import { resolvePlanInfo } from "@/lib/plans";
import { getUserPremiumWorkspace, ensurePremiumWorkspaceForAgency, getAgentBudgetUsage } from "@/lib/premiumWorkspace.server";

function mapJobCreationError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("row-level security")) {
    return "Você não tem permissão para criar vagas com esta conta.";
  }

  return message;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    title, description, category, budget, deadline,
    job_date, job_time, job_role, agency_id, location,
    gender, age_min, age_max, status,
    number_of_talents_required, auto_invite,
    visibility: rawVisibility,
    application_requirements,
  } = body;

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado. Faça login novamente." }, { status: 401 });
  }

  const supabase = createServerClient({ useServiceRole: true });
  const { data: caller, error: callerError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (callerError) {
    console.error("[POST /api/jobs] profile lookup error:", callerError);
    return NextResponse.json({ error: mapJobCreationError(callerError.message) }, { status: 400 });
  }

  if (!caller) {
    return NextResponse.json({ error: "Perfil da conta não encontrado. Complete seu cadastro novamente." }, { status: 404 });
  }

  if (caller?.role !== "agency") {
    return NextResponse.json({ error: "Apenas contas de agência podem publicar vagas." }, { status: 403 });
  }
  if (agency_id && agency_id !== user.id) {
    return NextResponse.json({ error: "Você não pode publicar vagas para outra agência." }, { status: 403 });
  }

  const agencyId = user.id;
  const { data: agency, error: agencyError } = await supabase
    .from("agencies")
    .select("id")
    .eq("id", agencyId)
    .maybeSingle();

  if (agencyError) {
    console.error("[POST /api/jobs] agency lookup error:", agencyError);
    return NextResponse.json({ error: mapJobCreationError(agencyError.message) }, { status: 400 });
  }

  if (!agency) {
    return NextResponse.json({ error: "Cadastro de agência não encontrado. Atualize seu perfil antes de publicar uma vaga." }, { status: 404 });
  }

  const limited = await requireJobLimit(agencyId);
  if (limited) return limited;

  const hiresLimited = await requireTalentsNeededForJob(agencyId, Number(number_of_talents_required) || 1);
  if (hiresLimited) return hiresLimited;

  const [{ data: profile }, wsResult] = await Promise.all([
    supabase.from("profiles").select("plan").eq("id", agencyId).single(),
    getUserPremiumWorkspace(agencyId),
  ]);
  const planInfo = resolvePlanInfo(profile);

  // Resolve workspace: check membership first (agents may have plan=free),
  // then auto-create for Premium owners who haven't visited workspace page yet.
  let workspaceId: string | null = wsResult?.workspace.id ?? null;
  const isPremiumPlan = planInfo.plan === "premium";
  const isWorkspaceMember = !!wsResult;

  if (!workspaceId && isPremiumPlan) {
    const created = await ensurePremiumWorkspaceForAgency(agencyId);
    workspaceId = created?.workspace.id ?? null;
  }

  const canUsePrivateInvite = isWorkspaceMember || (isPremiumPlan && !!workspaceId);

  if (rawVisibility === "private_invite" && !canUsePrivateInvite) {
    return NextResponse.json(
      { error: "Vagas privadas estão disponíveis apenas no Premium." },
      { status: 403 }
    );
  }

  // Spending limit check: agents with a set limit cannot exceed it
  if (isWorkspaceMember && wsResult?.membership.role === "agent" && workspaceId) {
    const spendingLimit = wsResult.membership.spendingLimit;
    if (spendingLimit != null) {
      const budgetUsage = await getAgentBudgetUsage(workspaceId, agencyId);
      const jobEstimate = Number(budget ?? 0) * (Number(number_of_talents_required) || 1);
      if (budgetUsage && budgetUsage.availableAmount !== null && jobEstimate > budgetUsage.availableAmount) {
        return NextResponse.json(
          { error: "Seu limite disponível para criar vagas é insuficiente. Solicite ajuste ao responsável da conta Premium." },
          { status: 403 }
        );
      }
    }
  }

  let visibility: string;
  if (canUsePrivateInvite && rawVisibility === "private_invite") {
    visibility = "private_invite";
  } else if (isPremiumPlan && rawVisibility === "private") {
    visibility = "private";
  } else {
    visibility = "public";
  }

  console.log("[plan] create_job", {
    agencyId,
    plan: planInfo.plan,
    visibility,
    workspaceId,
    maxActiveJobs: planInfo.maxActiveJobs,
  });

  const baseInsert: Record<string, unknown> = {
    title, description, category, budget, deadline, agency_id: agencyId,
    visibility,
    job_date:                   job_date  ?? null,
    job_time:                   job_time  ?? null,
    job_role:                   job_role  ?? null,
    location:                   location  ?? null,
    gender:                     gender    ?? null,
    age_min:                    age_min   ?? null,
    age_max:                    age_max   ?? null,
    number_of_talents_required: number_of_talents_required ?? 1,
    status:                     status ?? "open",
  };

  // Tag workspace jobs with server-resolved workspace_id and creator identity
  if (workspaceId && canUsePrivateInvite) {
    baseInsert.workspace_id       = workspaceId;
    baseInsert.created_by_user_id = agencyId;
    baseInsert.invite_only        = visibility === "private_invite";
  }

  let { data, error } = await supabase
    .from("jobs")
    .insert({ ...baseInsert, application_requirements: Array.isArray(application_requirements) ? application_requirements : [] })
    .select()
    .single();

  // Column may not be in schema cache yet — fall back without it
  if (error?.message?.includes("application_requirements")) {
    ({ data, error } = await supabase
      .from("jobs")
      .insert(baseInsert)
      .select()
      .single());
  }

  if (error) {
    console.error("[POST /api/jobs] Supabase error:", error);
    return NextResponse.json({ error: mapJobCreationError(error.message) }, { status: 400 });
  }

  const isPublished = !status || status === "open";

  // Auto-invite — for private jobs, only invite from agency history + existing invitees
  if (auto_invite && isPublished) {
    const supabaseInvite = createServerClient({ useServiceRole: true });
    const { suggestions, job_date: jDate } = await getJobSuggestions(data.id, agencyId, 5, visibility === "private" || visibility === "private_invite");
    const toInvite = suggestions.filter((s) => !s.is_unavailable);

    if (toInvite.length > 0) {
      await supabaseInvite.from("job_invites").insert(
        toInvite.map((t) => ({
          job_id:    data.id,
          talent_id: t.id,
          agency_id: agencyId,
          status:    "pending",
        })),
      );

      const dateStr = jDate
        ? new Date(jDate + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
        : null;
      const msg = dateStr
        ? `Você foi convidado para um trabalho em ${dateStr}: "${title ?? "Nova vaga"}"`
        : `Você foi convidado para uma vaga: "${title ?? "Nova vaga"}"`;

      await notify(toInvite.map((t) => t.id), "job_invite", msg, `/talent/jobs/${data.id}`);
    }
  }

  // Public jobs: notify all available talents. Private jobs: invites only (above).
  if (isPublished && visibility === "public" && !workspaceId) {
    let talentIds: string[] = [];

    if (job_date) {
      const { data: availRows } = await supabase
        .from("talent_availability")
        .select("talent_id")
        .eq("date", job_date)
        .eq("is_available", true);
      talentIds = (availRows ?? []).map((r) => r.talent_id);
    }

    if (!talentIds.length) {
      const { data: talentProfiles } = await supabase.from("talent_profiles").select("id");
      talentIds = (talentProfiles ?? []).map((p) => p.id);
    }

    if (talentIds.length) {
      await notify(talentIds, "new_job", `Nova vaga publicada: "${title ?? "Sem título"}"`, `/talent/jobs/${data.id}`);
    }
  }

  return NextResponse.json({ job: data }, { status: 201 });
}
