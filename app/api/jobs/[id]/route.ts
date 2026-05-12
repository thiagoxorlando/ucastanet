import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { requireTalentsNeededForJob } from "@/lib/requireActiveSubscription";
import { getLivePlanSetting } from "@/lib/planSettings.server";
import { isJobFull, JOB_FULL_MESSAGE } from "@/lib/jobAvailability";
import type { Plan } from "@/lib/plans";
import { getAgentBudgetUsage, getUserPremiumWorkspace } from "@/lib/premiumWorkspace.server";

const PATCH_ALLOWED = [
  "title",
  "description",
  "category",
  "budget",
  "deadline",
  "job_date",
  "status",
  "location",
  "gender",
  "age_min",
  "age_max",
  "number_of_talents_required",
  "visibility",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const update: Record<string, unknown> = {};
  for (const key of PATCH_ALLOWED) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nenhum campo válido para atualizar." }, { status: 400 });
  }

  const supabase = createServerClient({ useServiceRole: true });
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: caller } = await supabase
    .from("profiles")
    .select("role, plan")
    .eq("id", user.id)
    .single();

  if (caller?.role !== "agency") {
    return NextResponse.json({ error: "Você não tem permissão para alterar esta vaga." }, { status: 403 });
  }

  const { data: existingJob } = await supabase
    .from("jobs")
    .select(
      "agency_id, deleted_at, status, number_of_talents_required, budget, created_by_user_id, workspace_id, visibility"
    )
    .eq("id", id)
    .single();

  if (!existingJob) {
    return NextResponse.json({ error: "Vaga não encontrada." }, { status: 404 });
  }
  if (existingJob.deleted_at) {
    return NextResponse.json({ error: "Vaga não encontrada ou foi removida." }, { status: 404 });
  }

  const workspaceId = (existingJob as { workspace_id?: string | null }).workspace_id ?? null;
  const workspaceAccess = workspaceId ? await getUserPremiumWorkspace(user.id) : null;
  const belongsToWorkspace =
    !!workspaceId && workspaceAccess?.workspace.id === workspaceId && workspaceAccess.membership.status === "active";
  const isWorkspaceOwner = belongsToWorkspace && workspaceAccess?.membership.role === "owner";
  const isWorkspaceCreator =
    belongsToWorkspace &&
    (existingJob as { created_by_user_id?: string | null }).created_by_user_id === user.id;
  const isStandaloneOwner = !workspaceId && existingJob.agency_id === user.id;

  if (!isStandaloneOwner && !isWorkspaceOwner && !isWorkspaceCreator) {
    return NextResponse.json({ error: "Você não tem permissão para alterar esta vaga." }, { status: 403 });
  }

  if (workspaceId && "visibility" in update) {
    update.visibility = update.visibility === "public" ? "public" : "private_invite";
    update.invite_only = update.visibility === "private_invite";
  } else if (update.visibility === "private" && caller.plan !== "premium") {
    return NextResponse.json({ error: "Vagas privadas estão disponíveis apenas no Premium." }, { status: 403 });
  }

  if (isWorkspaceCreator && !isWorkspaceOwner) {
    const hasFinancialChange = "budget" in update || "number_of_talents_required" in update;
    if (hasFinancialChange && workspaceId) {
      const spendingLimit = workspaceAccess?.membership.spendingLimit ?? null;
      if (spendingLimit != null) {
        const budgetUsage = await getAgentBudgetUsage(workspaceId, user.id);
        if (budgetUsage) {
          const oldEstimate =
            Number((existingJob as { budget?: number | null }).budget ?? 0) *
            Number(existingJob.number_of_talents_required ?? 1);
          const newBudget =
            "budget" in update
              ? Number(update.budget ?? 0)
              : Number((existingJob as { budget?: number | null }).budget ?? 0);
          const newTalents =
            "number_of_talents_required" in update
              ? Number(update.number_of_talents_required ?? 1)
              : Number(existingJob.number_of_talents_required ?? 1);
          const newEstimate = newBudget * newTalents;
          const newTotal = budgetUsage.usedAmount - oldEstimate + newEstimate;

          if (newTotal > spendingLimit) {
            return NextResponse.json(
              {
                error:
                  "Seu limite disponível para criar vagas é insuficiente. Solicite ajuste ao responsável da conta Premium.",
              },
              { status: 403 }
            );
          }
        }
      }
    }
  }

  const ownerAgencyId = workspaceId ? existingJob.agency_id : user.id;
  const liveSetting = await getLivePlanSetting((caller.plan ?? "free") as Plan);
  const nextTalentsNeeded = Number(update.number_of_talents_required ?? existingJob.number_of_talents_required ?? 1);
  const { count: activeHireCount } = await supabase
    .from("contracts")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", ownerAgencyId)
    .eq("job_id", id)
    .not("status", "in", '("cancelled","rejected")')
    .is("deleted_at", null);

  const hasReachedCapacity = isJobFull({
    currentHires: activeHireCount ?? 0,
    talentsNeeded: nextTalentsNeeded,
    maxHiresPerJob: liveSetting.max_hires_per_job,
  });

  if (update.status !== undefined) {
    const validStatuses = ["open", "closed", "draft", "inactive"];
    if (!validStatuses.includes(update.status as string)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }

    if (update.status === "open") {
      const { count: paidContractCount } = await supabase
        .from("contracts")
        .select("id", { count: "exact", head: true })
        .eq("job_id", id)
        .eq("status", "paid")
        .is("deleted_at", null);

      if ((paidContractCount ?? 0) > 0) {
        return NextResponse.json(
          { error: "Esta vaga já possui reserva paga e não pode ser reaberta." },
          { status: 409 }
        );
      }

      if (hasReachedCapacity) {
        return NextResponse.json({ error: JOB_FULL_MESSAGE }, { status: 409 });
      }

      const jobLimit = liveSetting.job_limit;
      if (jobLimit !== null) {
        const { count } = await supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("agency_id", ownerAgencyId)
          .eq("status", "open")
          .neq("id", id)
          .is("deleted_at", null);
        if ((count ?? 0) >= jobLimit) {
          return NextResponse.json(
            {
              error: `O plano Free permite ${jobLimit} vaga${jobLimit > 1 ? "s" : ""} ativa${
                jobLimit > 1 ? "s" : ""
              }. Faça upgrade para reabrir esta vaga.`,
            },
            { status: 402 }
          );
        }
      }
    }
  }

  if (typeof update.number_of_talents_required === "number") {
    const hiresLimited = await requireTalentsNeededForJob(
      String(ownerAgencyId ?? user.id),
      update.number_of_talents_required
    );
    if (hiresLimited) return hiresLimited;
  }

  if (hasReachedCapacity && update.status !== "inactive") {
    update.status = "closed";
  }

  const { data, error } = await supabase.from("jobs").update(update).eq("id", id).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ job: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let hard = false;
  try {
    const body = await req.json();
    hard = body?.hard === true;
  } catch {
    hard = false;
  }

  const supabase = createServerClient({ useServiceRole: true });
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const { data: job } = await supabase
    .from("jobs")
    .select("agency_id, workspace_id, created_by_user_id")
    .eq("id", id)
    .single();

  if (!job) {
    return NextResponse.json({ error: "Vaga não encontrada." }, { status: 404 });
  }

  const isAdmin = profile?.role === "admin";
  const workspaceId = (job as { workspace_id?: string | null }).workspace_id ?? null;
  const workspaceAccess = workspaceId ? await getUserPremiumWorkspace(user.id) : null;
  const isWorkspaceOwner =
    !!workspaceId &&
    workspaceAccess?.workspace.id === workspaceId &&
    workspaceAccess.membership.role === "owner" &&
    workspaceAccess.membership.status === "active";
  const isWorkspaceCreator =
    !!workspaceId &&
    workspaceAccess?.workspace.id === workspaceId &&
    workspaceAccess.membership.status === "active" &&
    (job as { created_by_user_id?: string | null }).created_by_user_id === user.id;
  const isStandaloneOwner = !workspaceId && profile?.role === "agency" && job.agency_id === user.id;

  if (!isAdmin && !isWorkspaceOwner && !isWorkspaceCreator && !isStandaloneOwner) {
    return NextResponse.json({ error: "Você não tem permissão para remover esta vaga." }, { status: 403 });
  }

  if (!hard) {
    const { error } = await supabase.from("jobs").update({ status: "inactive" }).eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, deleted: false });
  }

  await supabase.from("submissions").delete().eq("job_id", id);
  const { error } = await supabase.from("jobs").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, deleted: true });
}
