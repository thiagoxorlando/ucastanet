import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { brl } from "@/lib/brl";
import {
  getContractPaymentStatus,
  contractStatusLabel,
  contractStatusTone,
  resolveContractAmounts,
} from "@/lib/contractStatus";
import { submissionStatusLabel, submissionStatusTone } from "@/lib/submissionStatus";

type Props = { params: Promise<{ workspaceSlug: string }> };

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, stripe, icon, href,
}: {
  label: string;
  value: string;
  sub?: string;
  stripe: string;
  icon: React.ReactNode;
  href?: string;
}) {
  const inner = (
    <>
      <div className={`h-[3px] bg-gradient-to-r ${stripe}`} />
      <div className="flex items-start gap-3.5 p-4">
        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-zinc-100 bg-zinc-50">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">{label}</p>
          <p className="text-[1.5rem] font-semibold leading-none tracking-tight text-zinc-900">{value}</p>
          {sub && <p className="mt-1 text-[11px] text-zinc-400">{sub}</p>}
        </div>
      </div>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="block overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] transition-all duration-150 hover:border-zinc-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.07)]"
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)]">
      {inner}
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({
  title, href, hrefLabel,
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">{title}</h2>
      {href && hrefLabel && (
        <Link href={href} className="flex items-center gap-1 text-[12px] font-medium text-zinc-400 transition-colors hover:text-zinc-900">
          {hrefLabel}
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function TalentWorkspaceDashboard({ params }: Props) {
  const { workspaceSlug } = await params;

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) notFound();

  const supabase = createServerClient({ useServiceRole: true });

  const { data: workspace } = await supabase
    .from("premium_workspaces")
    .select("id, name, logo_url, brand_primary_color, brand_accent_color, welcome_message")
    .eq("slug", workspaceSlug)
    .is("deleted_at", null)
    .eq("status", "active")
    .maybeSingle();

  if (!workspace) notFound();

  // All workspace jobs (needed for scoping + recent display)
  const { data: allJobRows } = await supabase
    .from("jobs")
    .select("id, title, budget, description, job_date, deadline, location, created_at, visibility, status")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });

  const allJobIds = (allJobRows ?? []).map((j) => j.id);
  const jobMap    = new Map((allJobRows ?? []).map((j) => [j.id, j.title ?? "Vaga"]));

  const availableJobs = (allJobRows ?? []).filter(
    (j) => j.status === "open" && (j.visibility === "private_invite" || j.visibility === "private_portal"),
  );

  let submissions: Array<{ id: string; job_id: string; status: string; created_at: string }> = [];
  let contracts: Array<{
    id: string; job_id: string | null; status: string | null;
    payment_amount: number | null; net_amount: number | null;
    commission_amount: number | null; commission_percent: number | null;
    paid_at: string | null; job_date: string | null; created_at: string;
  }> = [];

  if (allJobIds.length) {
    const [subsRes, contractsRes] = await Promise.all([
      supabase
        .from("submissions")
        .select("id, job_id, status, created_at")
        .eq("talent_user_id", user.id)
        .in("job_id", allJobIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("contracts")
        .select("id, job_id, status, payment_amount, net_amount, commission_amount, commission_percent, paid_at, job_date, created_at")
        .eq("talent_id", user.id)
        .in("job_id", allJobIds)
        .order("created_at", { ascending: false }),
    ]);
    submissions = (subsRes.data ?? []) as typeof submissions;
    contracts   = (contractsRes.data ?? []) as typeof contracts;
  }

  const activeContracts = contracts.filter((c) => ["sent", "signed", "confirmed"].includes(c.status ?? ""));
  const paidContracts   = contracts.filter((c) => c.status === "paid");

  const totalEarned = paidContracts.reduce((s, c) => {
    const { net } = resolveContractAmounts(c as Parameters<typeof resolveContractAmounts>[0]);
    return s + net;
  }, 0);

  const primary = (workspace.brand_primary_color as string | null) ?? "#1ABC9C";
  const accent  = (workspace.brand_accent_color  as string | null) ?? "#27C1D6";

  return (
    <div className="max-w-5xl space-y-8">

      {/* ── Agency welcome card ── */}
      <div
        className="relative overflow-hidden rounded-[28px] border border-zinc-200 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)]"
        style={{ background: `linear-gradient(135deg, ${primary}1a, ${accent}0d)` }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            {workspace.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={workspace.logo_url as string}
                alt={workspace.name as string}
                className="h-16 w-16 flex-shrink-0 rounded-2xl border border-white/60 object-cover shadow"
              />
            ) : (
              <div
                className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow"
                style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}
              >
                {(workspace.name as string).slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Portal Premium</p>
              <h1 className="text-[1.3rem] font-bold text-zinc-950">{workspace.name as string}</h1>
            </div>
          </div>

          {workspace.welcome_message && (
            <p className="text-[13px] leading-relaxed text-zinc-600 sm:border-l sm:border-zinc-200 sm:pl-4">
              {workspace.welcome_message as string}
            </p>
          )}

          {totalEarned > 0 && (
            <div className="flex-shrink-0 sm:ml-auto sm:text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Ganhos neste portal</p>
              <p className="mt-0.5 text-[1.2rem] font-bold text-emerald-700">{brl(totalEarned)}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Vagas disponíveis"
          value={String(availableJobs.length)}
          sub="abertas agora"
          href={`/talent/workspaces/${workspaceSlug}/jobs`}
          stripe="from-sky-400 to-blue-500"
          icon={
            <svg className="h-4 w-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <StatCard
          label="Reservas"
          value={String(submissions.length)}
          sub={submissions.length === 1 ? "candidatura" : "candidaturas"}
          href={`/talent/workspaces/${workspaceSlug}/applications`}
          stripe="from-violet-400 to-purple-500"
          icon={
            <svg className="h-4 w-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Contratos ativos"
          value={String(activeContracts.length)}
          sub="em andamento"
          href={`/talent/workspaces/${workspaceSlug}/contracts`}
          stripe="from-amber-400 to-orange-500"
          icon={
            <svg className="h-4 w-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          label="Ganhos neste portal"
          value={brl(totalEarned)}
          sub={`${paidContracts.length} pago${paidContracts.length !== 1 ? "s" : ""}`}
          href={`/talent/workspaces/${workspaceSlug}/finances`}
          stripe="from-emerald-400 to-teal-500"
          icon={
            <svg className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* ── Recent jobs ── */}
      <section>
        <SectionHeader
          title="Vagas recentes"
          href={`/talent/workspaces/${workspaceSlug}/jobs`}
          hrefLabel="Ver todas"
        />
        {availableJobs.length === 0 ? (
          <div className="rounded-[22px] border border-zinc-200 bg-white px-6 py-10 text-center">
            <p className="text-[13px] text-zinc-400">Nenhuma vaga disponível no momento.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {availableJobs.slice(0, 4).map((job) => (
              <Link
                key={job.id}
                href={`/talent/workspaces/${workspaceSlug}/jobs/${job.id}`}
                className="flex flex-col overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.07)]"
              >
                <div className="h-[3px]" style={{ background: `linear-gradient(to right, ${primary}, ${accent})` }} />
                <div className="p-4">
                  <p className="truncate text-[14px] font-semibold text-zinc-900">{job.title}</p>
                  {job.description && (
                    <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-zinc-500">{job.description}</p>
                  )}
                  <div className="mt-2.5 flex flex-wrap gap-3 text-[12px]">
                    {job.budget != null && (
                      <span className="font-semibold text-emerald-600">{brl(job.budget)}</span>
                    )}
                    {job.job_date && (
                      <span className="text-zinc-400">
                        {new Date(`${job.job_date}T00:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                      </span>
                    )}
                    {job.location && <span className="text-zinc-400">{job.location}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Recent reservations ── */}
      {submissions.length > 0 && (
        <section>
          <SectionHeader
            title="Reservas recentes"
            href={`/talent/workspaces/${workspaceSlug}/applications`}
            hrefLabel="Ver todas"
          />
          <div className="divide-y divide-zinc-50 overflow-hidden rounded-[22px] border border-zinc-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            {submissions.slice(0, 4).map((sub) => {
              const label = submissionStatusLabel(String(sub.status));
              const tone  = submissionStatusTone(String(sub.status));
              return (
                <div key={sub.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-zinc-900">
                      {jobMap.get(String(sub.job_id)) ?? "Vaga"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-400">
                      {new Date(sub.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Recent contracts ── */}
      {contracts.length > 0 && (
        <section>
          <SectionHeader
            title="Contratos recentes"
            href={`/talent/workspaces/${workspaceSlug}/contracts`}
            hrefLabel="Ver todos"
          />
          <div className="divide-y divide-zinc-50 overflow-hidden rounded-[22px] border border-zinc-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            {contracts.slice(0, 4).map((contract) => {
              const ps    = getContractPaymentStatus(contract as Parameters<typeof getContractPaymentStatus>[0]);
              const label = contractStatusLabel(ps);
              const tone  = contractStatusTone(ps);
              const { net } = resolveContractAmounts(contract as Parameters<typeof resolveContractAmounts>[0]);
              return (
                <div key={contract.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-zinc-900">
                      {jobMap.get(String(contract.job_id)) ?? "Vaga"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-400">
                      {brl(net)} ·{" "}
                      {contract.job_date
                        ? new Date(`${contract.job_date}T00:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })
                        : new Date(contract.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
