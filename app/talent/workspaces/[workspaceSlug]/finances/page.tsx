import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { brl } from "@/lib/brl";
import { resolveContractAmounts } from "@/lib/contractStatus";
import WorkspaceFinancesClient from "@/features/talent/WorkspaceFinancesClient";

export const metadata: Metadata = { title: "Financeiro — BrisaHub" };

type Props = { params: Promise<{ workspaceSlug: string }> };

function StatCard({
  label, value, sub, accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "emerald" | "amber";
}) {
  const colors = {
    emerald: { text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100" },
    amber:   { text: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-100" },
  };
  const c = accent ? colors[accent] : null;
  return (
    <div className={`rounded-[20px] border p-5 ${c ? `${c.bg} ${c.border}` : "border-zinc-200 bg-white"} shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)]`}>
      <p className={`text-[11px] font-semibold uppercase tracking-widest ${c ? c.text : "text-zinc-400"}`}>{label}</p>
      <p className={`mt-2 text-[1.6rem] font-semibold tracking-tight ${c ? c.text : "text-zinc-950"}`}>{value}</p>
      {sub && <p className={`mt-1 text-[12px] ${c ? c.text : "text-zinc-400"} opacity-80`}>{sub}</p>}
    </div>
  );
}

export default async function WorkspaceFinancesPage({ params }: Props) {
  const { workspaceSlug } = await params;

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) notFound();

  const supabase = createServerClient({ useServiceRole: true });

  const workspace = (await supabase
    .from("premium_workspaces")
    .select("id, name, brand_primary_color, brand_accent_color")
    .eq("slug", workspaceSlug)
    .is("deleted_at", null)
    .eq("status", "active")
    .maybeSingle()).data;

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
        .select("id, job_id, status, payment_amount, net_amount, commission_amount, commission_percent, paid_at")
        .eq("talent_id", user.id)
        .in("job_id", workspaceJobIds)
        .order("paid_at", { ascending: false })
    : { data: [] };

  const contracts = contractRows ?? [];
  const paidContracts    = contracts.filter((c) => c.status === "paid");
  const pendingContracts = contracts.filter(
    (c) => c.status !== "paid" && c.status !== "cancelled" && c.status !== "rejected",
  );

  const totalEarned = paidContracts.reduce((s, c) => {
    const { net } = resolveContractAmounts(c as Parameters<typeof resolveContractAmounts>[0]);
    return s + net;
  }, 0);

  const totalPending = pendingContracts.reduce((s, c) => {
    const { net } = resolveContractAmounts(c as Parameters<typeof resolveContractAmounts>[0]);
    return s + net;
  }, 0);

  const { data: profileData } = await supabase
    .from("profiles")
    .select("wallet_balance")
    .eq("id", user.id)
    .maybeSingle();
  const walletBalance = Number(profileData?.wallet_balance ?? 0);

  const primary = (workspace.brand_primary_color as string | null) ?? "#1ABC9C";
  const accent  = (workspace.brand_accent_color  as string | null) ?? "#27C1D6";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[1.3rem] font-bold text-zinc-950">Financeiro</h1>
        <p className="mt-0.5 text-[13px] text-zinc-500">
          Pagamentos através do portal de{" "}
          <span className="font-medium">{workspace.name as string}</span>.
        </p>
      </div>

      {/* Summary cards — workspace-scoped */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Ganhos neste portal"
          value={brl(totalEarned)}
          sub={`${paidContracts.length} contrato${paidContracts.length !== 1 ? "s" : ""} pago${paidContracts.length !== 1 ? "s" : ""}`}
          accent="emerald"
        />
        <StatCard
          label="A receber"
          value={brl(totalPending)}
          sub={`${pendingContracts.length} contrato${pendingContracts.length !== 1 ? "s" : ""} em andamento`}
          accent="amber"
        />
        <StatCard
          label="Saldo disponível para saque"
          value={brl(walletBalance)}
          sub="Disponível via PIX"
          accent={walletBalance > 0 ? "emerald" : undefined}
        />
      </div>

      {/* Paid contracts history */}
      {paidContracts.length > 0 && (
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
            Histórico de pagamentos neste portal
          </p>
          <div className="overflow-hidden rounded-[22px] border border-zinc-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <ul className="divide-y divide-zinc-50">
              {paidContracts.map((contract) => {
                const { net, gross, commissionPct } = resolveContractAmounts(
                  contract as Parameters<typeof resolveContractAmounts>[0],
                );
                return (
                  <li key={contract.id} className="flex items-center gap-4 px-5 py-4">
                    <div
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `linear-gradient(135deg, ${primary}25, ${accent}15)` }}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: primary }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-zinc-900">
                        {jobMap.get(String(contract.job_id)) ?? "Vaga"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-400">
                        Bruto {brl(gross)} · Comissão {commissionPct}%
                        {contract.paid_at && (
                          <> · {new Date(contract.paid_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}</>
                        )}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-[16px] font-semibold tabular-nums text-emerald-700">{brl(net)}</p>
                      <p className="text-[10px] text-zinc-400">líquido</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {contracts.length === 0 && (
        <div className="rounded-[22px] border border-zinc-200 bg-white px-6 py-12 text-center">
          <p className="text-[14px] font-semibold text-zinc-600">
            Você ainda não possui pagamentos neste portal.
          </p>
          <p className="mt-1 text-[13px] text-zinc-400">
            Os valores aparecerão aqui quando a agência enviar contratos.
          </p>
        </div>
      )}

      {/* PIX setup + withdrawal (live, client-side) */}
      <WorkspaceFinancesClient />
    </div>
  );
}
