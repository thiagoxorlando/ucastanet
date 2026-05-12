import type { Metadata } from "next";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { isJobOpenForApplications } from "@/lib/jobAvailability";
import { getLivePlanSetting } from "@/lib/planSettings.server";
import type { Plan } from "@/lib/plans";
import InviteJobClient from "./InviteJobClient";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const supabase = createServerClient({ useServiceRole: true });
  const { data: link } = await supabase
    .from("job_invite_links")
    .select("job_id")
    .eq("token", token)
    .maybeSingle();
  if (!link) return { title: "Convite inválido — BrisaHub" };
  const { data: job } = await supabase.from("jobs").select("title").eq("id", link.job_id).maybeSingle();
  return { title: job?.title ? `${job.title} — Convite BrisaHub` : "Convite de vaga — BrisaHub" };
}

function formatBudget(value: number | null | undefined) {
  const n = Number(value ?? 0);
  if (!n) return "A combinar";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(n);
}

function formatDate(v: string | null | undefined) {
  if (!v) return null;
  return new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function InvalidInvite() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-[20px] font-bold text-zinc-900 mb-2">Convite inválido ou expirado.</h1>
        <p className="text-[14px] text-zinc-500 mb-6">
          Este link de convite não é mais válido. Peça um novo link ao responsável pela vaga.
        </p>
        <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-[13px] font-semibold hover:bg-zinc-700 transition-colors">
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}

function JobUnavailable() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-[20px] font-bold text-zinc-900 mb-2">Vaga não disponível para novas candidaturas.</h1>
        <p className="text-[14px] text-zinc-500 mb-6">
          Esta vaga pode ter sido encerrada ou atingiu o número máximo de talentos.
        </p>
        <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-[13px] font-semibold hover:bg-zinc-700 transition-colors">
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}

export default async function InviteJobPage({ params }: Props) {
  const { token } = await params;
  const supabase = createServerClient({ useServiceRole: true });
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();

  // Validate invite link
  const { data: link } = await supabase
    .from("job_invite_links")
    .select("id, job_id, workspace_id, status, expires_at, revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (!link) return <InvalidInvite />;
  if (link.status !== "active") return <InvalidInvite />;
  if (link.revoked_at) return <InvalidInvite />;
  if (link.expires_at && new Date(link.expires_at) < new Date()) return <InvalidInvite />;

  // Load job
  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, description, category, budget, deadline, job_date, job_time, location, agency_id, status, deleted_at, number_of_talents_required, visibility")
    .eq("id", link.job_id)
    .maybeSingle();

  if (!job || job.status === "inactive" || job.deleted_at) return <JobUnavailable />;

  // Check if job is open for applications
  const [{ data: agencyProfile }, { count: activeHires }] = await Promise.all([
    job.agency_id
      ? supabase.from("profiles").select("plan").eq("id", job.agency_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("job_id", job.id)
      .not("status", "in", '("cancelled","rejected")')
      .is("deleted_at", null),
  ]);

  const liveSetting = await getLivePlanSetting((agencyProfile?.plan ?? "free") as Plan);
  const isOpen = isJobOpenForApplications({
    status: job.status ?? null,
    deletedAt: (job as { deleted_at?: string | null }).deleted_at ?? null,
    currentHires: activeHires ?? 0,
    talentsNeeded: (job as { number_of_talents_required?: number | null }).number_of_talents_required ?? 1,
    maxHiresPerJob: liveSetting.max_hires_per_job,
  });

  if (!isOpen) return <JobUnavailable />;

  // Load workspace branding
  let workspaceName: string | null = null;
  let workspaceWelcome: string | null = null;
  let workspaceLogoUrl: string | null = null;
  let workspacePrimaryColor: string | null = null;
  let workspaceAccentColor: string | null = null;
  if (link.workspace_id) {
    const { data: ws } = await supabase
      .from("premium_workspaces")
      .select("name, welcome_message, logo_url, brand_primary_color, brand_accent_color")
      .eq("id", link.workspace_id)
      .maybeSingle();
    workspaceName = ws?.name ?? null;
    workspaceWelcome = (ws?.welcome_message as string | null) ?? null;
    workspaceLogoUrl = (ws?.logo_url as string | null) ?? null;
    workspacePrimaryColor = (ws?.brand_primary_color as string | null) ?? null;
    workspaceAccentColor = (ws?.brand_accent_color as string | null) ?? null;
  }

  // Load agency name as fallback
  let agencyName: string | null = null;
  if (job.agency_id && !workspaceName) {
    const { data: agency } = await supabase
      .from("agencies")
      .select("company_name")
      .eq("id", job.agency_id)
      .maybeSingle();
    agencyName = agency?.company_name ?? null;
  }

  // Determine user role
  let userRole: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    userRole = profile?.role ?? null;
  }

  const jobData = {
    id:          String(job.id),
    title:       job.title ?? "",
    description: job.description ?? "",
    category:    job.category ?? "",
    budget:      formatBudget(job.budget),
    deadline:    formatDate(job.deadline),
    jobDate:     formatDate(job.job_date),
    jobTime:     job.job_time ? (job.job_time as string).slice(0, 5) : null,
    location:    job.location ?? null,
  };

  return (
    <InviteJobClient
      token={token}
      job={jobData}
      workspaceName={workspaceName}
      workspaceWelcome={workspaceWelcome}
      workspaceLogoUrl={workspaceLogoUrl}
      workspacePrimaryColor={workspacePrimaryColor}
      workspaceAccentColor={workspaceAccentColor}
      agencyName={agencyName}
      isLoggedIn={!!user}
      userRole={userRole}
    />
  );
}
