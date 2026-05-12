import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase.server";
import { createServerClient } from "@/lib/supabase";
import {
  getUserPremiumWorkspace,
  ensurePremiumWorkspaceForAgency,
  getWorkspaceSeatUsage,
  getWorkspaceMembers,
  getWorkspacePendingInvites,
  getWorkspaceAgentBudgets,
  type PremiumWorkspace,
  type PremiumMembership,
  type AgentBudgetUsage,
} from "@/lib/premiumWorkspace.server";
import WorkspaceAgentManager from "@/features/agency/WorkspaceAgentManager";
import { jobStatusLabel, jobStatusTone } from "@/lib/jobStatus";
import { brl } from "@/lib/brl";

export const metadata: Metadata = { title: "Espaço Premium — BrisaHub" };

// ── Locked screen (non-Premium, no workspace membership) ─────────────────────

function LockedScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-5">
        <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h1 className="text-[18px] font-bold text-zinc-900 mb-2">Espaço Premium</h1>
      <p className="text-[14px] text-zinc-500 max-w-sm mb-6">
        O Espaço Premium está disponível exclusivamente para agências com o plano Premium ativo.
        Faça upgrade para acessar seu workspace privado, gerenciar agentes e criar vagas exclusivas.
      </p>
      <a
        href="/agency/billing"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[13px] font-semibold transition-colors"
      >
        Ver planos
      </a>
    </div>
  );
}

// ── Workspace header card ─────────────────────────────────────────────────────

function WorkspaceHeader({
  workspace,
  membership,
}: {
  workspace: PremiumWorkspace;
  membership: PremiumMembership;
}) {
  const isOwner = membership.role === "owner";
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
      <div
        className={`h-[3px] bg-gradient-to-r ${isOwner ? "from-amber-400 to-amber-600" : "from-indigo-400 to-indigo-600"}`}
      />
      <div className="p-6 flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isOwner ? "bg-amber-50 border border-amber-100" : "bg-indigo-50 border border-indigo-100"}`}
        >
          <svg
            className={`w-6 h-6 ${isOwner ? "text-amber-500" : "text-indigo-500"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[16px] font-bold text-zinc-900 truncate">{workspace.name}</h2>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${isOwner ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-indigo-50 text-indigo-600 border-indigo-100"}`}
            >
              {isOwner ? "Premium · Proprietário" : "Agente"}
            </span>
          </div>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            {isOwner
              ? `Workspace criado em ${new Date(workspace.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`
              : `Membro desde ${new Date(membership.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Team jobs section ─────────────────────────────────────────────────────────

type WorkspaceJob = {
  id: string;
  title: string;
  status: string;
  visibility: string;
  budget: number | null;
  createdAt: string;
  applicants: number;
  creatorName: string | null;
};

function TeamJobRow({ job }: { job: WorkspaceJob }) {
  const isPrivate = job.visibility === "private_invite";
  return (
    <Link
      href={`/agency/jobs/${job.id}`}
      className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50 transition-colors border-b border-zinc-50 last:border-0"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-semibold text-zinc-900 truncate">{job.title}</p>
          {isPrivate && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100 flex-shrink-0">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Privada
            </span>
          )}
        </div>
        {job.creatorName && (
          <p className="text-[11px] text-zinc-400 mt-0.5">Criada por {job.creatorName}</p>
        )}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {job.budget != null && job.budget > 0 && (
          <span className="text-[12px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            {brl(job.budget)}
          </span>
        )}
        {job.applicants > 0 && (
          <span className="text-[11px] text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded-full">
            {job.applicants} candidatura{job.applicants !== 1 ? "s" : ""}
          </span>
        )}
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${jobStatusTone(job.status)}`}>
          {jobStatusLabel(job.status)}
        </span>
      </div>
    </Link>
  );
}

function TeamJobsSection({ jobs, isOwner }: { jobs: WorkspaceJob[]; isOwner: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-emerald-400 to-teal-500" />
      <div className="p-5 border-b border-zinc-50 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-zinc-900">Vagas da equipe</p>
          <p className="text-[12px] text-zinc-400 mt-0.5">
            {jobs.length} vaga{jobs.length !== 1 ? "s" : ""} no workspace
          </p>
        </div>
        {isOwner && (
          <Link
            href="/agency/post-job"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#1ABC9C] to-[#27C1D6] text-white text-[12px] font-semibold hover:from-[#17A58A] hover:to-[#22B5C2] transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nova vaga
          </Link>
        )}
      </div>
      {jobs.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-[13px] text-zinc-400">Nenhuma vaga criada no workspace ainda.</p>
          {isOwner && (
            <Link href="/agency/post-job" className="mt-3 inline-block text-[13px] font-semibold text-[#1ABC9C] hover:underline">
              Criar primeira vaga
            </Link>
          )}
        </div>
      ) : (
        <div>
          {jobs.map((job) => (
            <TeamJobRow key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function WorkspacePage() {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();

  if (!user) redirect("/login");

  const supabase = createServerClient({ useServiceRole: true });

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "agency") redirect("/agency/dashboard");

  // First: check if user already belongs to any workspace (as owner or agent)
  // Agents may not have Premium plan themselves — membership is the source of truth.
  let ws = await getUserPremiumWorkspace(user.id);

  if (!ws) {
    // Not in any workspace. Require Premium plan to auto-create one.
    if (profile.plan !== "premium") {
      return <LockedScreen />;
    }
    ws = await ensurePremiumWorkspaceForAgency(user.id);
    if (!ws) return <LockedScreen />;
  }

  const { workspace, membership } = ws;

  // Fetch full data in parallel
  const [seatUsage, members, invites, jobsResult, budgetMap] = await Promise.all([
    getWorkspaceSeatUsage(workspace.id),
    getWorkspaceMembers(workspace.id),
    membership.role === "owner" ? getWorkspacePendingInvites(workspace.id) : Promise.resolve([]),
    supabase
      .from("jobs")
      .select("id, title, status, visibility, budget, created_at, created_by_user_id")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false }),
    getWorkspaceAgentBudgets(workspace.id),
  ]);

  const budgetUsages: AgentBudgetUsage[] = Array.from(budgetMap.values());

  // Enrich jobs with submission counts and creator names
  const jobRows = jobsResult.data ?? [];
  const jobIds = jobRows.map((r) => r.id);
  const creatorIds = [...new Set(jobRows.map((r) => r.created_by_user_id).filter((id): id is string => !!id))];

  const [subsCountMap, creatorNameMap] = await Promise.all([
    jobIds.length
      ? supabase.from("submissions").select("job_id").in("job_id", jobIds).then(({ data }) => {
          const m = new Map<string, number>();
          for (const s of data ?? []) m.set(s.job_id, (m.get(s.job_id) ?? 0) + 1);
          return m;
        })
      : Promise.resolve(new Map<string, number>()),
    creatorIds.length
      ? supabase.from("agencies").select("id, company_name").in("id", creatorIds).then(({ data }) => {
          const m = new Map<string, string>();
          for (const a of data ?? []) m.set(a.id, a.company_name ?? "");
          return m;
        })
      : Promise.resolve(new Map<string, string>()),
  ]);

  const workspaceJobs: WorkspaceJob[] = jobRows.map((r) => ({
    id:          String(r.id),
    title:       r.title ?? "",
    status:      r.status ?? "open",
    visibility:  r.visibility ?? "public",
    budget:      r.budget ?? null,
    createdAt:   r.created_at ?? "",
    applicants:  subsCountMap.get(r.id) ?? 0,
    creatorName: r.created_by_user_id ? (creatorNameMap.get(r.created_by_user_id) ?? null) : null,
  }));

  return (
    <div className="space-y-6">
      <WorkspaceHeader workspace={workspace} membership={membership} />

      {/* Agents section */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-violet-500 to-indigo-600" />
        <div className="p-5 space-y-1 border-b border-zinc-50">
          <p className="text-[13px] font-semibold text-zinc-900">Agentes do workspace</p>
          <p className="text-[12px] text-zinc-400">
            {seatUsage.activeAgentCount} agente{seatUsage.activeAgentCount !== 1 ? "s" : ""} ativo{seatUsage.activeAgentCount !== 1 ? "s" : ""}
            {" · "}
            {seatUsage.totalAllowed} assento{seatUsage.totalAllowed !== 1 ? "s" : ""} incluído{seatUsage.totalAllowed !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="p-5">
          <WorkspaceAgentManager
            workspace={workspace}
            membership={membership}
            initialSeatUsage={seatUsage}
            initialMembers={members}
            initialInvites={invites}
            initialBudgetUsages={budgetUsages}
          />
        </div>
      </div>

      {/* Team jobs */}
      <TeamJobsSection jobs={workspaceJobs} isOwner={membership.role === "owner"} />
    </div>
  );
}
