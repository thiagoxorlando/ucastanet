import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createSessionClient } from "@/lib/supabase.server";
import { createServerClient } from "@/lib/supabase";
import {
  ensurePremiumWorkspaceForAgency,
  getUserPremiumWorkspace,
  getWorkspaceAgentLedgerBalances,
  getOwnerAllocationSummary,
  getAgentLedgerBalance,
  getWorkspaceMembers,
  getWorkspacePendingInvites,
  getWorkspaceSeatUsage,
  type AgentLedgerBalance,
  type OwnerAllocationSummary,
  type PremiumMembership,
  type PremiumWorkspace,
} from "@/lib/premiumWorkspace.server";
import WorkspaceAgentManager from "@/features/agency/WorkspaceAgentManager";
import WorkspaceBrandingForm from "@/features/agency/WorkspaceBrandingForm";
import { jobStatusLabel, jobStatusTone } from "@/lib/jobStatus";
import { brl } from "@/lib/brl";
import { getLivePlanSetting } from "@/lib/planSettings.server";
import { premiumSeatHighlights } from "@/lib/planSettings.shared";

export const metadata: Metadata = { title: "Espaço Premium — BrisaHub" };

type WorkspaceJob = {
  id: string;
  title: string;
  status: string;
  visibility: string;
  budget: number | null;
  createdAt: string;
  applicants: number;
  creatorName: string | null;
  createdByUserId: string | null;
};

function FeatureChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/80">
      {children}
    </span>
  );
}

function LockedScreen({ premiumAvailable }: { premiumAvailable: boolean }) {
  const premiumHighlights = premiumSeatHighlights({
    plan_key: "premium",
    included_agent_seats: 2,
    extra_agent_seat_price: 0,
  });

  return (
    <div className="overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="bg-[radial-gradient(circle_at_top_left,rgba(26,188,156,0.30),transparent_36%),linear-gradient(135deg,#082326_0%,#0C2E33_45%,#143C43_100%)] px-6 py-10 text-white sm:px-10">
        <div className="max-w-3xl space-y-5">
          <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
            Espaço Premium
          </div>
          <div className="space-y-3">
            <h1 className="text-[2rem] font-bold tracking-tight sm:text-[2.6rem]">
              Espaço Premium
            </h1>
            <p className="max-w-2xl text-[15px] leading-7 text-white/72">
              Crie um ambiente privado para sua agência, gerencie agentes, envie convites exclusivos e acompanhe toda a operação em um só lugar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <FeatureChip>Proprietário</FeatureChip>
            <FeatureChip>Agente</FeatureChip>
            <FeatureChip>Vaga privada</FeatureChip>
            <FeatureChip>Convite privado</FeatureChip>
            <FeatureChip>Limite de uso</FeatureChip>
          </div>
        </div>
      </div>

      <div className="grid gap-4 px-6 py-6 sm:grid-cols-2 sm:px-10">
        {[
          "Espaço privado da agência",
          "Agentes internos",
          "Vagas privadas por convite",
          "Controle de limites",
          "Personalização com logo e cores",
          "Supervisão pelo proprietário",
        ].map((item) => (
          <div key={item} className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-[#E7FAF7] text-[#0E7C86]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-[14px] font-semibold text-zinc-800">{item}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 border-t border-zinc-100 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div className="text-[13px] text-zinc-500">
          {premiumAvailable ? "Pronto para ativar um ambiente privado para sua equipe." : "Em breve"}
        </div>
        {premiumAvailable ? (
          <Link
            href="/agency/billing"
            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#1ABC9C] to-[#27C1D6] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_14px_30px_rgba(26,188,156,0.25)] transition-all hover:translate-y-[-1px]"
          >
            Ver planos
          </Link>
        ) : (
          <span className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-100 px-5 py-3 text-[14px] font-semibold text-zinc-400">
            Em breve
          </span>
        )}
      </div>

      <div className="border-t border-zinc-100 px-6 py-4 text-[12px] text-zinc-400 sm:px-10">
        {premiumHighlights.slice(0, 5).join(" • ")}
      </div>
    </div>
  );
}

function WorkspaceHeader({
  workspace,
  membership,
}: {
  workspace: PremiumWorkspace;
  membership: PremiumMembership;
}) {
  const isOwner = membership.role === "owner";
  const primary = workspace.brandPrimaryColor ?? "#1ABC9C";
  const accent = workspace.brandAccentColor ?? "#27C1D6";
  const initials =
    workspace.name
      .split(" ")
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("") || "P";

  return (
    <div className="overflow-hidden rounded-[30px] border border-zinc-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div
        className="px-6 py-8 text-white sm:px-8"
        style={{
          background: `radial-gradient(circle at top left, ${primary}50, transparent 28%), linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`,
        }}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {workspace.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={workspace.logoUrl} alt="Logo do workspace" className="h-16 w-16 rounded-2xl border border-white/20 object-cover shadow-lg" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/14 text-[18px] font-bold text-white shadow-lg">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-white/18 bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                  Espaço Premium
                </span>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${
                  isOwner ? "bg-white/18 text-white" : "bg-[#EEF4FF] text-[#3156A6]"
                }`}>
                  {isOwner ? "Proprietário" : "Agente"}
                </span>
              </div>
              <h1 className="mt-3 truncate text-[2rem] font-bold tracking-tight">{workspace.name}</h1>
              <p className="mt-2 max-w-2xl text-[14px] leading-6 text-white/78">
                {workspace.welcomeMessage || "Personalize o espaço com o logo e as cores da sua agência."}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
            <div className="rounded-2xl border border-white/16 bg-white/10 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">Criado em</p>
              <p className="mt-1 text-[14px] font-semibold text-white">
                {new Date(isOwner ? workspace.createdAt : membership.createdAt).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <div className="rounded-2xl border border-white/16 bg-white/10 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">Acesso</p>
              <p className="mt-1 text-[14px] font-semibold text-white">
                {isOwner ? "Supervisão completa" : "Operação da equipe"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[26px] border border-zinc-200 bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className="mt-2 text-[1.65rem] font-bold tracking-tight text-zinc-900">{value}</p>
      {hint ? <p className="mt-1.5 text-[12px] leading-5 text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-6 py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 5v14m7-7H5" />
        </svg>
      </div>
      <p className="mt-4 text-[15px] font-semibold text-zinc-800">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-zinc-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function JobRow({ job }: { job: WorkspaceJob }) {
  return (
    <Link
      href={`/agency/workspace/jobs/${job.id}`}
      className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 transition-colors hover:bg-zinc-50 last:border-0 sm:flex-row sm:items-center"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[14px] font-semibold text-zinc-900">{job.title}</p>
          {job.visibility === "private_invite" ? (
            <span className="inline-flex items-center rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">
              Vaga privada
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-[12px] text-zinc-500">
          {job.creatorName ? `Criada por ${job.creatorName}` : "Criada dentro do Espaço Premium"}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {job.budget != null ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            {brl(job.budget)}
          </span>
        ) : null}
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] text-zinc-600">
          {job.applicants} candidatura{job.applicants !== 1 ? "s" : ""}
        </span>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${jobStatusTone(job.status)}`}>
          {jobStatusLabel(job.status)}
        </span>
      </div>
    </Link>
  );
}

function JobSection({
  title,
  subtitle,
  jobs,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  subtitle: string;
  jobs: WorkspaceJob[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
      <div className="border-b border-zinc-100 px-5 py-5">
        <p className="text-[15px] font-semibold text-zinc-900">{title}</p>
        <p className="mt-1 text-[12px] text-zinc-500">{subtitle}</p>
      </div>
      {jobs.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div>{jobs.map((job) => <JobRow key={job.id} job={job} />)}</div>
      )}
    </div>
  );
}

export default async function WorkspacePage() {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();

  if (!user) redirect("/login");

  const supabase = createServerClient({ useServiceRole: true });
  const { data: profile } = await supabase.from("profiles").select("plan, role").eq("id", user.id).maybeSingle();

  if (!profile || profile.role !== "agency") {
    redirect("/agency/dashboard");
  }

  const premiumPlan = await getLivePlanSetting("premium");
  let workspaceAccess = await getUserPremiumWorkspace(user.id);
  if (!workspaceAccess) {
    if (profile.plan !== "premium") {
      return <LockedScreen premiumAvailable={premiumPlan.is_available} />;
    }
    workspaceAccess = await ensurePremiumWorkspaceForAgency(user.id);
    if (!workspaceAccess) return <LockedScreen premiumAvailable={premiumPlan.is_available} />;
  }

  const { workspace, membership } = workspaceAccess;
  const isOwner = membership.role === "owner";

  const [seatUsage, members, invites, jobsResult, ledgerMap, ownerSummary, selfLedger, ownerProfile] = await Promise.all([
    getWorkspaceSeatUsage(workspace.id),
    getWorkspaceMembers(workspace.id),
    isOwner ? getWorkspacePendingInvites(workspace.id) : Promise.resolve([]),
    supabase
      .from("jobs")
      .select("id, title, status, visibility, budget, created_at, created_by_user_id")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false }),
    isOwner ? getWorkspaceAgentLedgerBalances(workspace.id) : Promise.resolve(new Map<string, AgentLedgerBalance>()),
    isOwner ? getOwnerAllocationSummary(workspace.id, workspace.ownerUserId) : Promise.resolve(null as OwnerAllocationSummary | null),
    !isOwner ? getAgentLedgerBalance(workspace.id, user.id) : Promise.resolve(null),
    supabase.from("profiles").select("wallet_balance").eq("id", workspace.ownerUserId).maybeSingle(),
  ]);

  const jobRows = jobsResult.data ?? [];
  const jobIds = jobRows.map((row) => row.id);
  const creatorIds = [...new Set(jobRows.map((row) => row.created_by_user_id).filter((id): id is string => !!id))];

  const [submissionRows, creatorAgencyRows, creatorTalentRows] = await Promise.all([
    jobIds.length ? supabase.from("submissions").select("job_id").in("job_id", jobIds) : Promise.resolve({ data: [] }),
    creatorIds.length
      ? supabase.from("agencies").select("user_id, company_name").in("user_id", creatorIds)
      : Promise.resolve({ data: [] }),
    creatorIds.length
      ? supabase.from("talent_profiles").select("user_id, full_name").in("user_id", creatorIds)
      : Promise.resolve({ data: [] }),
  ]);

  const submissionCountMap = new Map<string, number>();
  for (const row of submissionRows.data ?? []) {
    submissionCountMap.set(row.job_id, (submissionCountMap.get(row.job_id) ?? 0) + 1);
  }

  const creatorNameMap = new Map<string, string>();
  for (const row of creatorAgencyRows.data ?? []) {
    creatorNameMap.set(row.user_id, row.company_name ?? "");
  }
  for (const row of creatorTalentRows.data ?? []) {
    if (!creatorNameMap.has(row.user_id) && row.full_name) {
      creatorNameMap.set(row.user_id, row.full_name);
    }
  }

  const workspaceJobs: WorkspaceJob[] = jobRows.map((row) => ({
    id: String(row.id),
    title: row.title ?? "",
    status: row.status ?? "open",
    visibility: row.visibility ?? "public",
    budget: row.budget ?? null,
    createdAt: row.created_at ?? "",
    applicants: submissionCountMap.get(row.id) ?? 0,
    creatorName: row.created_by_user_id ? (creatorNameMap.get(row.created_by_user_id) ?? null) : null,
    createdByUserId: row.created_by_user_id ?? null,
  }));

  const myJobs = workspaceJobs.filter((job) => job.createdByUserId === user.id);
  const privateJobs = workspaceJobs.filter((job) => job.visibility === "private_invite");
  const walletBalance = Number(ownerProfile.data?.wallet_balance ?? 0);
  const ledgerBalances: AgentLedgerBalance[] = Array.from(ledgerMap.values());
  const seatLimitReached = isOwner && seatUsage.remaining === 0;
  const activeAgents = members.filter((member) => member.role === "agent" && member.status === "active");

  return (
    <div className="space-y-6">
      <WorkspaceHeader workspace={workspace} membership={membership} />

      {isOwner ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Assentos" value={`${seatUsage.usedSeats}/${seatUsage.totalAllowed}`} hint={`${seatUsage.remaining} disponível${seatUsage.remaining === 1 ? "" : "eis"}`} />
          <SummaryCard label="Agentes" value={String(activeAgents.length)} hint="Equipe ativa no espaço" />
          <SummaryCard label="Convite privado" value={String(invites.length)} hint="Convites privados pendentes" />
          <SummaryCard label="Vaga privada" value={String(privateJobs.length)} hint="Vagas privadas por convite" />
          <SummaryCard label="Vagas da equipe" value={String(workspaceJobs.length)} hint="Todas as vagas do Espaço Premium" />
          <SummaryCard label="Carteira" value={brl(walletBalance)} hint="Saldo da conta principal" />
          <SummaryCard label="Branding" value={workspace.logoUrl ? "Configurado" : "Pendente"} hint={workspace.logoUrl ? "Logo e identidade do espaço" : "Adicione logo e cores da agência"} />
          <SummaryCard label="Proprietário" value="Supervisão" hint="Controle total da operação" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Agente" value="Operação" hint="Acesso ao Espaço Premium" />
          <SummaryCard label="Saldo alocado" value={brl(selfLedger?.allocatedAmount ?? 0)} hint="Total alocado pelo proprietário" />
          <SummaryCard label="Comprometido" value={brl(selfLedger?.committedAmount ?? 0)} hint="Reservado em vagas ativas" />
          <SummaryCard label="Disponível" value={brl(selfLedger?.availableAmount ?? 0)} hint={(selfLedger?.availableAmount ?? 0) === 0 ? "Saldo esgotado" : "Saldo restante para operar"} />
        </div>
      )}

      {seatLimitReached ? (
        <div className="rounded-[26px] border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-[14px] font-semibold text-amber-800">
            Você atingiu o limite de agentes do Premium.
          </p>
          <p className="mt-1 text-[13px] leading-6 text-amber-700">
            Precisa de mais agentes? Solicite assentos extras.
          </p>
          <Link
            href="/agency/support"
            className="mt-3 inline-flex items-center rounded-xl bg-amber-500 px-4 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-amber-600"
          >
            Falar com suporte
          </Link>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
        <div className="border-b border-zinc-100 px-5 py-5">
          <p className="text-[15px] font-semibold text-zinc-900">Identidade do Espaço Premium</p>
          <p className="mt-1 text-[12px] text-zinc-500">
            {isOwner ? "Logo, cores e mensagem do espaço para sua equipe e seus convites privados." : "Branding do espaço em modo somente leitura."}
          </p>
        </div>
        <div className="p-5">
          <WorkspaceBrandingForm workspace={workspace} membership={membership} />
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
        <div className="border-b border-zinc-100 px-5 py-5">
          <p className="text-[15px] font-semibold text-zinc-900">
            {isOwner ? "Equipe e convites privados" : "Seu uso dentro da equipe"}
          </p>
          <p className="mt-1 text-[12px] text-zinc-500">
            {isOwner
              ? `${activeAgents.length} agente${activeAgents.length === 1 ? "" : "s"} ativo${activeAgents.length === 1 ? "" : "s"} • ${seatUsage.totalAllowed} assentos`
              : "Limite de uso, status atual e acesso operacional no Espaço Premium"}
          </p>
        </div>
        <div className="p-5">
          <WorkspaceAgentManager
            membership={membership}
            initialSeatUsage={seatUsage}
            initialMembers={members}
            initialInvites={invites}
            initialLedgerBalances={ledgerBalances}
            initialOwnerSummary={ownerSummary ?? undefined}
          />
        </div>
      </div>

      {!isOwner ? (
        <JobSection
          title="Minhas vagas"
          subtitle={`${myJobs.length} vaga${myJobs.length === 1 ? "" : "s"} criada${myJobs.length === 1 ? "" : "s"} por você`}
          jobs={myJobs}
          emptyTitle="Nenhuma vaga criada por você ainda."
          emptyDescription="Crie sua primeira vaga dentro do Espaço Premium para começar a operar com a equipe."
        />
      ) : null}

      <JobSection
        title={isOwner ? "Vagas da equipe" : "Vagas da equipe"}
        subtitle={`${workspaceJobs.length} vaga${workspaceJobs.length === 1 ? "" : "s"} no Espaço Premium`}
        jobs={workspaceJobs}
        emptyTitle={isOwner ? "Nenhuma vaga privada criada ainda." : "Nenhuma vaga da equipe ainda."}
        emptyDescription={isOwner ? "Crie a primeira vaga da equipe para começar a usar o fluxo privado do Espaço Premium." : "As vagas da equipe aparecem aqui assim que forem criadas."}
      />
    </div>
  );
}
