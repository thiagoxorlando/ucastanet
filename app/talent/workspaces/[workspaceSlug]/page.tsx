import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { brl } from "@/lib/brl";
import { getUnifiedBookingStatus, unifiedStatusInfo } from "@/lib/bookingStatus";
import { getContractPaymentStatus, contractStatusLabel, contractStatusTone, resolveContractAmounts } from "@/lib/contractStatus";

type Props = { params: Promise<{ workspaceSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspaceSlug } = await params;
  const supabase = createServerClient({ useServiceRole: true });
  const { data } = await supabase
    .from("premium_workspaces")
    .select("name")
    .eq("slug", workspaceSlug)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return { title: "Portal — BrisaHub" };
  return { title: `${data.name} — Portal — BrisaHub` };
}

export default async function TalentWorkspaceDashboard({ params }: Props) {
  const { workspaceSlug } = await params;

  // Auth is already enforced by talent layout — user is guaranteed talent here.
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) notFound();

  const supabase = createServerClient({ useServiceRole: true });

  // Resolve workspace
  const { data: workspace } = await supabase
    .from("premium_workspaces")
    .select("id, name, slug, logo_url, brand_primary_color, brand_accent_color, welcome_message, status, deleted_at")
    .eq("slug", workspaceSlug)
    .is("deleted_at", null)
    .eq("status", "active")
    .maybeSingle();

  if (!workspace) notFound();

  // Auto-join: create membership if not already a member (upsert-safe via unique index)
  const { data: existingMembership } = await supabase
    .from("premium_workspace_talents")
    .select("id, status")
    .eq("workspace_id", workspace.id)
    .eq("talent_user_id", user.id)
    .is("removed_at", null)
    .maybeSingle();

  if (!existingMembership) {
    await supabase.from("premium_workspace_talents").insert({
      workspace_id:   workspace.id,
      talent_user_id: user.id,
      status:         "active",
      source:         "portal",
    });
  } else if (existingMembership.status !== "active") {
    await supabase
      .from("premium_workspace_talents")
      .update({ status: "active", removed_at: null })
      .eq("id", existingMembership.id);
  }

  // Private jobs from this workspace visible to talent
  const { data: jobRows } = await supabase
    .from("jobs")
    .select("id, title, status, budget, number_of_talents_required, created_at, visibility")
    .eq("workspace_id", workspace.id)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(20);

  const jobs = (jobRows ?? []).filter(
    (j) => j.visibility === "private_invite" || j.visibility === "private_portal",
  );

  // Contracts for this talent linked to workspace jobs
  const workspaceJobIds = (jobRows ?? []).map((j) => j.id);
  const [contractRows, bookingRows] = await Promise.all([
    workspaceJobIds.length
      ? supabase
          .from("contracts")
          .select("id, job_id, status, payment_amount, net_amount, commission_amount, commission_percent, paid_at, job_date, created_at")
          .eq("talent_id", user.id)
          .in("job_id", workspaceJobIds)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
    workspaceJobIds.length
      ? supabase
          .from("bookings")
          .select("id, job_id, status, price, job_title, created_at, contracts!contracts_booking_id_fkey(id, status, signed_at, job_date, paid_at)")
          .eq("talent_user_id", user.id)
          .in("job_id", workspaceJobIds)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
  ]);

  const primary = workspace.brand_primary_color ?? "#1ABC9C";
  const accent  = workspace.brand_accent_color  ?? "#27C1D6";

  const initials = workspace.name
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

  const contracts = contractRows.data ?? [];
  const bookings  = bookingRows.data  ?? [];

  // Build job title map for contract rows
  const jobTitleMap = new Map((jobRows ?? []).map((j) => [j.id, j.title ?? "Vaga"]));

  // Earnings summary
  const totalEarned = contracts
    .filter((c) => c.status === "paid")
    .reduce((s, c) => {
      const { net } = resolveContractAmounts(c as Parameters<typeof resolveContractAmounts>[0]);
      return s + net;
    }, 0);

  return (
    <div className="space-y-8">

      {/* Branded header */}
      <div
        className="overflow-hidden rounded-[28px] border border-zinc-200 shadow-[0_12px_34px_rgba(15,23,42,0.06)]"
        style={{ background: `linear-gradient(135deg, ${primary}18, ${accent}10)` }}
      >
        <div className="h-1.5" style={{ background: `linear-gradient(to right, ${primary}, ${accent})` }} />
        <div className="px-6 py-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div
            className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/50 shadow-sm"
            style={{ background: workspace.logo_url ? "#f4f4f5" : primary }}
          >
            {workspace.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={workspace.logo_url} alt={workspace.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[20px] font-bold text-white select-none">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[1.6rem] font-bold tracking-tight text-zinc-950">{workspace.name}</h1>
            {workspace.welcome_message ? (
              <p className="mt-1 text-[14px] leading-relaxed text-zinc-500">{workspace.welcome_message}</p>
            ) : null}
          </div>
          {totalEarned > 0 && (
            <div className="flex-shrink-0 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Recebido desta agência</p>
              <p className="mt-1 text-[1.4rem] font-bold text-emerald-700">{brl(totalEarned)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Private jobs */}
      <section>
        <h2 className="mb-4 text-[1rem] font-bold text-zinc-900">Vagas privadas desta agência</h2>
        {jobs.length === 0 ? (
          <div className="rounded-[24px] border border-zinc-200 bg-white px-6 py-10 text-center shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <p className="text-[14px] font-semibold text-zinc-600">Nenhuma vaga privada disponível no momento.</p>
            <p className="mt-1 text-[13px] text-zinc-400">Novas vagas aparecerão aqui assim que forem publicadas.</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/talent/jobs/${job.id}`}
                  className="block rounded-[22px] border border-zinc-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                >
                  <p className="text-[15px] font-semibold text-zinc-950 truncate">{job.title}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-[12px] text-zinc-500">
                    {job.budget != null && (
                      <span>
                        <span className="font-semibold text-zinc-700">Cachê:</span> {brl(job.budget)}
                      </span>
                    )}
                    <span>
                      <span className="font-semibold text-zinc-700">Vagas:</span>{" "}
                      {job.number_of_talents_required ?? 1}
                    </span>
                    <span>{new Date(job.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* My contracts */}
      <section>
        <h2 className="mb-4 text-[1rem] font-bold text-zinc-900">Meus contratos com esta agência</h2>
        {contracts.length === 0 ? (
          <div className="rounded-[24px] border border-zinc-200 bg-white px-6 py-8 text-center shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <p className="text-[13px] text-zinc-400">Nenhum contrato com esta agência ainda.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {contracts.map((contract) => {
              const ps    = getContractPaymentStatus(contract as Parameters<typeof getContractPaymentStatus>[0]);
              const label = contractStatusLabel(ps);
              const tone  = contractStatusTone(ps);
              const { net } = resolveContractAmounts(contract as Parameters<typeof resolveContractAmounts>[0]);
              return (
                <li key={contract.id}>
                  <div className="rounded-[22px] border border-zinc-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                      <p className="text-[14px] font-semibold text-zinc-900 truncate">
                        {jobTitleMap.get(contract.job_id ?? "") ?? "Vaga"}
                      </p>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>{label}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-[12px] text-zinc-500">
                      <span><span className="font-semibold text-zinc-700">Valor líq.:</span> {brl(net)}</span>
                      {contract.job_date && (
                        <span>
                          <span className="font-semibold text-zinc-700">Data:</span>{" "}
                          {new Date(`${contract.job_date}T00:00:00`).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* My bookings */}
      <section>
        <h2 className="mb-4 text-[1rem] font-bold text-zinc-900">Meus pagamentos desta agência</h2>
        {bookings.length === 0 ? (
          <div className="rounded-[24px] border border-zinc-200 bg-white px-6 py-8 text-center shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <p className="text-[13px] text-zinc-400">Nenhuma reserva com esta agência ainda.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {bookings.map((booking) => {
              const contract = Array.isArray((booking as { contracts?: unknown[] }).contracts)
                ? ((booking as { contracts?: Record<string, unknown>[] }).contracts?.[0] ?? null)
                : null;
              const derivedStatus = getUnifiedBookingStatus(
                String(booking.status ?? "pending"),
                contract?.status ? String(contract.status) : null,
              );
              const statusInfo = unifiedStatusInfo(derivedStatus);
              return (
                <li key={booking.id}>
                  <div className="rounded-[22px] border border-zinc-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                      <p className="text-[14px] font-semibold text-zinc-900 truncate">
                        {String(booking.job_title ?? "Reserva")}
                      </p>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusInfo.badge}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-[12px] text-zinc-500">
                      <span><span className="font-semibold text-zinc-700">Valor:</span> {brl(Number(booking.price ?? 0))}</span>
                      <span>{new Date(String(booking.created_at ?? "")).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
