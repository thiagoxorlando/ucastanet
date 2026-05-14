import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { brl } from "@/lib/brl";
import { resolveContractAmounts } from "@/lib/contractStatus";

export const metadata: Metadata = { title: "Financeiro Premium — BrisaHub" };

type Props = { params: Promise<{ workspaceSlug: string }> };

export default async function WorkspaceFinancesPage({ params }: Props) {
  const { workspaceSlug } = await params;

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) notFound();

  const supabase = createServerClient({ useServiceRole: true });

  const [workspaceResult, profileResult] = await Promise.all([
    supabase
      .from("premium_workspaces")
      .select("id, name")
      .eq("slug", workspaceSlug)
      .is("deleted_at", null)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const workspace = workspaceResult.data;
  if (!workspace) notFound();

  const globalWalletBalance = Number(profileResult.data?.wallet_balance ?? 0);

  const { data: allJobs } = await supabase
    .from("jobs")
    .select("id, title")
    .eq("workspace_id", workspace.id);

  const workspaceJobIds = (allJobs ?? []).map((j) => j.id);
  const jobMap = new Map((allJobs ?? []).map((j) => [String(j.id), String(j.title ?? "Vaga")]));

  const { data: contractRows } = workspaceJobIds.length
    ? await supabase
        .from("contracts")
        .select("id, job_id, status, payment_amount, net_amount, commission_amount, commission_percent, paid_at, job_date, created_at")
        .eq("talent_id", user.id)
        .in("job_id", workspaceJobIds)
        .order("paid_at", { ascending: false })
    : { data: [] };

  const contracts = contractRows ?? [];

  const paidContracts = contracts.filter((c) => c.status === "paid");
  const pendingContracts = contracts.filter((c) => c.status !== "paid" && c.status !== "cancelled" && c.status !== "rejected");

  const totalEarned = paidContracts.reduce((s, c) => {
    const { net } = resolveContractAmounts(c as Parameters<typeof resolveContractAmounts>[0]);
    return s + net;
  }, 0);

  const totalPending = pendingContracts.reduce((s, c) => {
    const { net } = resolveContractAmounts(c as Parameters<typeof resolveContractAmounts>[0]);
    return s + net;
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.3rem] font-bold text-zinc-950">Financeiro Premium</h1>
        <p className="mt-0.5 text-[13px] text-zinc-500">
          Seus ganhos no Portal da agência.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[20px] border border-zinc-200 bg-white p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Ganhos com {workspace.name}
          </p>
          <p className="mt-2 text-[1.5rem] font-bold text-zinc-950">{brl(totalEarned)}</p>
          <p className="mt-0.5 text-[12px] text-zinc-400">{paidContracts.length} contrato{paidContracts.length !== 1 ? "s" : ""} pago{paidContracts.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="rounded-[20px] border border-zinc-200 bg-white p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Valores a receber
          </p>
          <p className="mt-2 text-[1.5rem] font-bold text-zinc-950">{brl(totalPending)}</p>
          <p className="mt-0.5 text-[12px] text-zinc-400">{pendingContracts.length} contrato{pendingContracts.length !== 1 ? "s" : ""} em andamento</p>
        </div>

        <div className="rounded-[20px] border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-500">
            Saldo total na BrisaHub
          </p>
          <p className="mt-2 text-[1.5rem] font-bold text-emerald-700">{brl(globalWalletBalance)}</p>
          <p className="mt-0.5 text-[12px] text-emerald-500">Carteira global (todos os pagamentos)</p>
        </div>
      </div>

      {/* Paid contracts history */}
      {paidContracts.length > 0 && (
        <section>
          <h2 className="mb-3 text-[13px] font-semibold text-zinc-700">Histórico de pagamentos</h2>
          <ul className="flex flex-col gap-2.5">
            {paidContracts.map((contract) => {
              const { net, gross, commissionPct } = resolveContractAmounts(
                contract as Parameters<typeof resolveContractAmounts>[0],
              );
              return (
                <li key={contract.id}>
                  <div className="rounded-[18px] border border-zinc-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[14px] font-semibold text-zinc-900 truncate">
                        {jobMap.get(String(contract.job_id)) ?? "Vaga"}
                      </p>
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        Pago
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-[12px] text-zinc-500">
                      <span><span className="font-medium text-zinc-700">Valor líq.:</span> {brl(net)}</span>
                      <span><span className="font-medium text-zinc-700">Bruto:</span> {brl(gross)}</span>
                      <span><span className="font-medium text-zinc-700">Comissão:</span> {commissionPct}%</span>
                      {contract.paid_at && (
                        <span className="ml-auto text-[11px] text-zinc-400">
                          {new Date(contract.paid_at).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {contracts.length === 0 && (
        <div className="rounded-[22px] border border-zinc-200 bg-white px-6 py-12 text-center">
          <p className="text-[14px] font-semibold text-zinc-600">Nenhum dado financeiro ainda.</p>
          <p className="mt-1 text-[13px] text-zinc-400">
            Os valores aparecerão aqui quando a agência enviar contratos.
          </p>
        </div>
      )}
    </div>
  );
}
