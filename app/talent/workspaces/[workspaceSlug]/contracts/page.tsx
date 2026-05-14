import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { brl } from "@/lib/brl";
import {
  getContractPaymentStatus,
  contractStatusLabel,
  contractStatusTone,
  resolveContractAmounts,
} from "@/lib/contractStatus";

export const metadata: Metadata = { title: "Contratos — BrisaHub" };

type Props = { params: Promise<{ workspaceSlug: string }> };

export default async function WorkspaceContractsPage({ params }: Props) {
  const { workspaceSlug } = await params;

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) notFound();

  const supabase = createServerClient({ useServiceRole: true });

  const { data: workspace } = await supabase
    .from("premium_workspaces")
    .select("id, name, brand_primary_color, brand_accent_color")
    .eq("slug", workspaceSlug)
    .is("deleted_at", null)
    .eq("status", "active")
    .maybeSingle();

  if (!workspace) notFound();

  const { data: allJobs } = await supabase
    .from("jobs")
    .select("id, title")
    .eq("workspace_id", workspace.id);

  const workspaceJobIds = (allJobs ?? []).map((j) => j.id);
  const jobMap = new Map((allJobs ?? []).map((j) => [String(j.id), String(j.title ?? "Vaga")]));

  const { data: contractRows } = workspaceJobIds.length
    ? await supabase
        .from("contracts")
        .select("id, job_id, status, payment_amount, net_amount, commission_amount, commission_percent, paid_at, job_date, location, created_at")
        .eq("talent_id", user.id)
        .in("job_id", workspaceJobIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const contracts = contractRows ?? [];

  const active = contracts.filter((c) => ["sent", "signed", "confirmed"].includes(c.status ?? ""));
  const paid   = contracts.filter((c) => c.status === "paid");
  const other  = contracts.filter((c) => ["cancelled", "rejected"].includes(c.status ?? ""));

  const primary = (workspace.brand_primary_color as string | null) ?? "#1ABC9C";
  const accent  = (workspace.brand_accent_color  as string | null) ?? "#27C1D6";

  const totalEarned = paid.reduce((s, c) => {
    const { net } = resolveContractAmounts(c as Parameters<typeof resolveContractAmounts>[0]);
    return s + net;
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.3rem] font-bold text-zinc-950">Contratos</h1>
        <p className="mt-0.5 text-[13px] text-zinc-500">
          Seus contratos com <span className="font-medium">{workspace.name as string}</span>.
        </p>
      </div>

      {/* Summary bar */}
      {contracts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[12px] font-medium text-zinc-600">
            {contracts.length} total
          </span>
          {active.length > 0 && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[12px] font-medium text-amber-700">
              {active.length} em andamento
            </span>
          )}
          {paid.length > 0 && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[12px] font-medium text-emerald-700">
              {paid.length} pago{paid.length !== 1 ? "s" : ""} · {brl(totalEarned)}
            </span>
          )}
        </div>
      )}

      {/* Empty state */}
      {contracts.length === 0 && (
        <div className="rounded-[22px] border border-zinc-200 bg-white px-6 py-12 text-center">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: `linear-gradient(135deg, ${primary}20, ${accent}10)` }}
          >
            <svg className="h-5 w-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-[14px] font-semibold text-zinc-600">Nenhum contrato com esta agência ainda.</p>
          <p className="mt-1 text-[13px] text-zinc-400">Os contratos enviados pela agência aparecerão aqui.</p>
        </div>
      )}

      {/* Active / pending contracts */}
      {active.length > 0 && (
        <section className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Em andamento</p>
          <ul className="flex flex-col gap-3">
            {active.map((contract) => {
              const ps    = getContractPaymentStatus(contract as Parameters<typeof getContractPaymentStatus>[0]);
              const label = contractStatusLabel(ps);
              const tone  = contractStatusTone(ps);
              const { net, gross } = resolveContractAmounts(contract as Parameters<typeof resolveContractAmounts>[0]);
              return (
                <li key={contract.id}>
                  <div className="overflow-hidden rounded-[20px] border border-amber-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                    <div className="h-[3px] bg-gradient-to-r from-amber-400 to-orange-400" />
                    <div className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold text-zinc-900 truncate">
                            {jobMap.get(String(contract.job_id)) ?? "Vaga"}
                          </p>
                          {contract.job_date && (
                            <p className="mt-0.5 text-[12px] text-zinc-500">
                              {new Date(`${contract.job_date}T00:00:00`).toLocaleDateString("pt-BR", {
                                weekday: "short", day: "numeric", month: "short",
                              })}
                            </p>
                          )}
                        </div>
                        <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>{label}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-zinc-500">
                        <span>
                          <span className="font-medium text-zinc-700">Valor bruto:</span> {brl(gross)}
                        </span>
                        <span>
                          <span className="font-medium text-zinc-700">Valor líquido:</span>{" "}
                          <span className="font-semibold text-emerald-600">{brl(net)}</span>
                        </span>
                        {contract.location && (
                          <span>
                            <span className="font-medium text-zinc-700">Local:</span> {contract.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Paid contracts */}
      {paid.length > 0 && (
        <section className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Pagos</p>
          <ul className="flex flex-col gap-3">
            {paid.map((contract) => {
              const { net, gross, commissionPct } = resolveContractAmounts(contract as Parameters<typeof resolveContractAmounts>[0]);
              return (
                <li key={contract.id}>
                  <div className="overflow-hidden rounded-[20px] border border-emerald-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                    <div
                      className="h-[3px]"
                      style={{ background: `linear-gradient(to right, ${primary}, ${accent})` }}
                    />
                    <div className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold text-zinc-900 truncate">
                            {jobMap.get(String(contract.job_id)) ?? "Vaga"}
                          </p>
                          {contract.job_date && (
                            <p className="mt-0.5 text-[12px] text-zinc-500">
                              {new Date(`${contract.job_date}T00:00:00`).toLocaleDateString("pt-BR", {
                                weekday: "short", day: "numeric", month: "short",
                              })}
                            </p>
                          )}
                        </div>
                        <span className="flex-shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          Pago ao talento
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-zinc-500">
                        <span>
                          <span className="font-medium text-zinc-700">Valor líquido:</span>{" "}
                          <span className="font-semibold text-emerald-600">{brl(net)}</span>
                        </span>
                        <span>
                          <span className="font-medium text-zinc-700">Bruto:</span> {brl(gross)}
                        </span>
                        <span>
                          <span className="font-medium text-zinc-700">Comissão:</span> {commissionPct}%
                        </span>
                        {contract.location && (
                          <span>
                            <span className="font-medium text-zinc-700">Local:</span> {contract.location}
                          </span>
                        )}
                      </div>
                      {contract.paid_at && (
                        <p className="mt-2 text-[11px] text-emerald-600">
                          Pago em {new Date(contract.paid_at).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Cancelled / rejected */}
      {other.length > 0 && (
        <section className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Cancelados / rejeitados</p>
          <ul className="flex flex-col gap-2.5">
            {other.map((contract) => {
              const ps    = getContractPaymentStatus(contract as Parameters<typeof getContractPaymentStatus>[0]);
              const label = contractStatusLabel(ps);
              const tone  = contractStatusTone(ps);
              const { gross } = resolveContractAmounts(contract as Parameters<typeof resolveContractAmounts>[0]);
              return (
                <li key={contract.id}>
                  <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-zinc-500 truncate">
                        {jobMap.get(String(contract.job_id)) ?? "Vaga"}
                      </p>
                      <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>{label}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-3 text-[12px] text-zinc-400">
                      <span>{brl(gross)}</span>
                      <span>
                        {new Date(contract.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
