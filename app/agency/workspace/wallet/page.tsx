import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { brl } from "@/lib/brl";
import {
  contractStatusLabel,
  contractStatusTone,
  getContractPaymentStatus,
  resolveContractAmounts,
} from "@/lib/contractStatus";
import {
  getAgentLedgerBalance,
  getOwnerAllocationSummary,
  getWorkspaceAgentLedgerBalances,
  getWorkspaceMembers,
} from "@/lib/premiumWorkspace.server";
import { requirePremiumWorkspacePageContext } from "@/lib/premiumWorkspaceApp.server";
import WorkspaceWalletAllocator from "@/features/agency/WorkspaceWalletAllocator";

export const metadata: Metadata = { title: "Carteira Premium - BrisaHub" };

type LedgerTxBase = {
  id: string;
  type: string;
  amount: number;
  status: string;
  note: string | null;
  created_at: string;
  related_job_id: string | null;
  related_contract_id: string | null;
  agent_user_id: string;
};

type ContractLedgerRow = {
  id: string;
  label: string;
  tone: string;
  gross: number;
  commission: number;
  net: number;
  paidAt: string | null;
};

type WorkspaceLedgerContractRow = {
  id: string;
  job_id: string | null;
  payment_amount: number | null;
  commission_amount: number | null;
  net_amount: number | null;
  commission_percent: number | null;
  status: string;
  paid_at: string | null;
};

type LedgerRow = LedgerTxBase & {
  agentName: string | null;
  jobTitle: string | null;
  contract: ContractLedgerRow | null;
};

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "emerald" | "amber" | "rose" | "sky" | "indigo";
}) {
  const colors = {
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    rose: "text-rose-600",
    sky: "text-sky-700",
    indigo: "text-indigo-700",
  };

  return (
    <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{label}</p>
      <p className={`mt-2 text-[1.8rem] font-bold ${accent ? colors[accent] : "text-zinc-950"}`}>{value}</p>
      {hint ? <p className="mt-1 text-[12px] text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function txLabel(type: string): string {
  const map: Record<string, string> = {
    allocation: "Alocacao enviada ao agente",
    allocation_reversal: "Saldo puxado de volta",
    job_commitment: "Compromisso de vaga / escrow",
    job_release: "Compromisso liberado",
    job_settlement: "Pagamento ao talento liquidado",
    refund: "Reembolso / estorno de compromisso",
    adjustment: "Ajuste manual",
  };

  return map[type] ?? type;
}

function txTypeTone(type: string): string {
  const map: Record<string, string> = {
    allocation: "border-emerald-200 bg-emerald-50 text-emerald-700",
    allocation_reversal: "border-indigo-200 bg-indigo-50 text-indigo-700",
    job_commitment: "border-amber-200 bg-amber-50 text-amber-700",
    job_release: "border-sky-200 bg-sky-50 text-sky-700",
    job_settlement: "border-rose-200 bg-rose-50 text-rose-700",
    refund: "border-zinc-200 bg-zinc-100 text-zinc-700",
    adjustment: "border-zinc-200 bg-zinc-100 text-zinc-700",
  };

  return map[type] ?? "border-zinc-200 bg-zinc-100 text-zinc-700";
}

function txAmountTone(type: string): string {
  if (type === "job_settlement") return "text-rose-600";
  if (type === "job_commitment") return "text-amber-700";
  if (type === "allocation_reversal") return "text-indigo-700";
  if (type === "job_release") return "text-sky-700";
  if (type === "allocation") return "text-emerald-700";
  return "text-zinc-700";
}

function txAmountPrefix(type: string): string {
  if (["job_commitment", "job_settlement", "allocation_reversal"].includes(type)) return "-";
  if (["allocation", "job_release", "refund"].includes(type)) return "+";
  return "";
}

function txStatusTone(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "pending") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortId(value: string): string {
  return value.slice(0, 8).toUpperCase();
}

function TimelineCard({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: LedgerRow[];
}) {
  if (rows.length === 0) {
    return (
      <section className="rounded-[28px] border border-zinc-200 bg-white px-6 py-10 text-center shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
        <h2 className="text-[16px] font-semibold text-zinc-900">{title}</h2>
        <p className="mt-2 text-[13px] text-zinc-500">{description}</p>
        <p className="mt-5 text-[14px] text-zinc-500">Nenhuma movimentacao ainda.</p>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-zinc-200 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
      <div className="border-b border-zinc-100 px-6 py-5">
        <h2 className="text-[16px] font-semibold text-zinc-900">{title}</h2>
        <p className="mt-1 text-[13px] text-zinc-500">{description}</p>
      </div>
      <ul className="divide-y divide-zinc-100">
        {rows.map((tx) => (
          <li key={tx.id} className="px-6 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[15px] font-semibold text-zinc-900">{txLabel(tx.type)}</p>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${txTypeTone(tx.type)}`}>
                    {tx.type}
                  </span>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${txStatusTone(tx.status)}`}>
                    {tx.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 text-[11px] text-zinc-500">
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1">
                    Data: {formatDateTime(tx.created_at)}
                  </span>
                  {tx.agentName ? (
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1">
                      Agente: {tx.agentName}
                    </span>
                  ) : null}
                  {tx.jobTitle ? (
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1">
                      Vaga: {tx.jobTitle}
                    </span>
                  ) : null}
                  {tx.note ? (
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1">
                      Obs: {tx.note}
                    </span>
                  ) : null}
                </div>

                {tx.contract ? (
                  <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[12px] font-semibold text-zinc-800">
                        Contrato #{shortId(tx.contract.id)}
                      </p>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${tx.contract.tone}`}>
                        {tx.contract.label}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-3 text-[12px] text-zinc-600 sm:grid-cols-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Bruto</p>
                        <p className="mt-1 font-semibold text-zinc-900">{brl(tx.contract.gross)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Comissao</p>
                        <p className="mt-1 font-semibold text-zinc-900">{brl(tx.contract.commission)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Pago ao talento</p>
                        <p className="mt-1 font-semibold text-zinc-900">{brl(tx.contract.net)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Pago em</p>
                        <p className="mt-1 font-semibold text-zinc-900">{formatDateTime(tx.contract.paidAt)}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="lg:pl-6">
                <p className={`text-[1.1rem] font-bold tabular-nums ${txAmountTone(tx.type)}`}>
                  {txAmountPrefix(tx.type)}{brl(tx.amount)}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function buildLedgerRows(
  workspaceId: string,
  limit: number,
  agentUserId?: string,
): Promise<LedgerRow[]> {
  const supabase = createServerClient({ useServiceRole: true });

  let query = supabase
    .from("premium_agent_wallet_transactions")
    .select("id, type, amount, status, note, created_at, related_job_id, related_contract_id, agent_user_id")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (agentUserId) query = query.eq("agent_user_id", agentUserId);

  const { data } = await query;
  const rows: LedgerTxBase[] = (data ?? []).map((row) => ({
    id: String(row.id),
    type: String(row.type),
    amount: Number(row.amount ?? 0),
    status: String(row.status ?? "completed"),
    note: row.note ?? null,
    created_at: String(row.created_at),
    related_job_id: row.related_job_id ?? null,
    related_contract_id: row.related_contract_id ?? null,
    agent_user_id: String(row.agent_user_id),
  }));

  if (rows.length === 0) return [];

  const jobIds = [...new Set(rows.map((row) => row.related_job_id).filter((value): value is string => Boolean(value)))];
  const contractIds = [...new Set(rows.map((row) => row.related_contract_id).filter((value): value is string => Boolean(value)))];
  const agentIds = [...new Set(rows.map((row) => row.agent_user_id))];

  const [jobsResult, contractsResult, payoutResult, membersResult] = await Promise.all([
    jobIds.length > 0
      ? supabase.from("jobs").select("id, title").in("id", jobIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string | null }> }),
    contractIds.length > 0
      ? supabase
          .from("contracts")
          .select("id, job_id, payment_amount, commission_amount, net_amount, commission_percent, status, paid_at")
          .in("id", contractIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    contractIds.length > 0
      ? supabase
          .from("wallet_transactions")
          .select("reference_id, amount")
          .eq("type", "payout")
          .in("reference_id", contractIds)
      : Promise.resolve({ data: [] as Array<{ reference_id: string | null; amount: number | null }> }),
    getWorkspaceMembers(workspaceId),
  ]);

  const jobTitleMap = new Map<string, string>();
  for (const job of jobsResult.data ?? []) {
    jobTitleMap.set(String(job.id), job.title ?? "Vaga privada");
  }

  const payoutMap = new Map<string, number>();
  for (const payout of payoutResult.data ?? []) {
    if (!payout.reference_id) continue;
    payoutMap.set(String(payout.reference_id), Number(payout.amount ?? 0));
  }

  const memberNameMap = new Map<string, string>();
  for (const member of membersResult) {
    memberNameMap.set(member.userId, member.displayName || member.email || "Agente");
  }

  const contractMap = new Map<string, ContractLedgerRow>();
  for (const contract of (contractsResult.data ?? []) as WorkspaceLedgerContractRow[]) {
    const paymentStatus = getContractPaymentStatus(contract);
    const { gross, commission, net } = resolveContractAmounts(contract);
    const paidToTalent =
      payoutMap.get(String(contract.id))
      ?? (contract.net_amount != null ? Number(contract.net_amount) : null)
      ?? Math.max(0, gross - commission);

    contractMap.set(String(contract.id), {
      id: String(contract.id),
      label: contractStatusLabel(paymentStatus),
      tone: contractStatusTone(paymentStatus),
      gross,
      commission,
      net: paidToTalent ?? net,
      paidAt: (contract.paid_at as string | null) ?? null,
    });

    if (contract.job_id && !jobTitleMap.has(String(contract.job_id))) {
      jobTitleMap.set(String(contract.job_id), "Vaga privada");
    }
  }

  return rows.map((row) => ({
    ...row,
    agentName: memberNameMap.get(row.agent_user_id) ?? null,
    jobTitle: row.related_job_id ? jobTitleMap.get(row.related_job_id) ?? null : null,
    contract: row.related_contract_id ? contractMap.get(row.related_contract_id) ?? null : null,
  }));
}

export default async function WorkspaceWalletPage() {
  const context = await requirePremiumWorkspacePageContext();

  if (!context.isOwner) {
    const [ledger, rows] = await Promise.all([
      getAgentLedgerBalance(context.workspace.id, context.userId),
      buildLedgerRows(context.workspace.id, 120, context.userId),
    ]);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[1.8rem] font-bold tracking-tight text-zinc-950">Carteira Premium</h1>
          <p className="mt-1 text-[14px] text-zinc-500">Seu historico completo de alocacoes, compromissos, liberacoes e pagamentos no Espaco Premium.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Saldo alocado" value={brl(ledger.allocatedAmount)} hint="Total enviado pelo proprietario" />
          <StatCard label="Comprometido" value={brl(ledger.committedAmount)} hint="Reservado em vagas abertas" accent="amber" />
          <StatCard label="Pago a talentos" value={brl(ledger.spentAmount)} hint="Liquidado em contratos pagos" accent="rose" />
          <StatCard
            label="Disponivel"
            value={brl(ledger.availableAmount)}
            hint="Pode ser usado em novas vagas"
            accent={ledger.availableAmount > 0 ? "emerald" : "indigo"}
          />
        </div>

        <TimelineCard
          title="Linha do tempo da sua carteira"
          description="Cada linha mostra tipo, data, status, vaga, contrato e quanto desse saldo entrou, saiu ou ficou comprometido."
          rows={rows}
        />
      </div>
    );
  }

  const [summary, members, ledgerMap, rows] = await Promise.all([
    getOwnerAllocationSummary(context.workspace.id, context.workspace.ownerUserId),
    getWorkspaceMembers(context.workspace.id),
    getWorkspaceAgentLedgerBalances(context.workspace.id),
    buildLedgerRows(context.workspace.id, 250),
  ]);

  const agents = members.filter((member) => member.role === "agent");
  const ledgerBalances = Array.from(ledgerMap.values());
  const totalCommitted = ledgerBalances.reduce((sum, ledger) => sum + ledger.committedAmount, 0);
  const totalSettled = ledgerBalances.reduce((sum, ledger) => sum + ledger.spentAmount, 0);
  const totalAgentAvailable = ledgerBalances.reduce((sum, ledger) => sum + ledger.availableAmount, 0);
  const availableToAllocateOrReclaim = summary.ownerUnallocatedAvailable + totalAgentAvailable;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.8rem] font-bold tracking-tight text-zinc-950">Carteira Premium</h1>
        <p className="mt-1 text-[14px] text-zinc-500">
          Visao completa do dinheiro do workspace: saldo real da agencia, alocacoes virtuais por agente, compromissos, liberacoes e pagamentos aos talentos.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Saldo da carteira da agencia"
          value={brl(summary.ownerWalletBalance)}
          hint="Saldo real atual em BrisaHub"
        />
        <StatCard
          label="Alocado aos agentes"
          value={brl(summary.totalAllocatedToAgents)}
          hint="Ainda reservado na operacao dos agentes"
          accent="indigo"
        />
        <StatCard
          label="Comprometido / escrow"
          value={brl(totalCommitted)}
          hint="Travado em vagas ainda abertas"
          accent="amber"
        />
        <StatCard
          label="Pago a talentos"
          value={brl(totalSettled)}
          hint="Ja liquidado em contratos pagos"
          accent="rose"
        />
        <StatCard
          label="Disponivel para alocar / puxar"
          value={brl(availableToAllocateOrReclaim)}
          hint="Carteira livre da agencia + saldo livre dos agentes"
          accent="emerald"
        />
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-[16px] font-semibold text-zinc-900">Alocacoes e reclaim por agente</h2>
          <p className="mt-1 text-[13px] text-zinc-500">
            Selecione um agente, confira o saldo disponivel dele e use "Puxar saldo de volta" para criar uma linha `allocation_reversal` sem tocar em `profiles.wallet_balance`.
          </p>
        </div>
        <WorkspaceWalletAllocator
          agents={agents}
          initialLedgerBalances={ledgerBalances}
          initialOwnerSummary={summary}
        />
      </section>

      <TimelineCard
        title="Ledger completo do workspace"
        description="Mostra alocacoes enviadas aos agentes, dinheiro puxado de volta, compromissos de vaga, liberacoes, settlements e pagamentos relacionados a contratos."
        rows={rows}
      />
    </div>
  );
}
