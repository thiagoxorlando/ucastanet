import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { brl } from "@/lib/brl";
import {
  getWorkspaceAgentLedgerBalances,
  getWorkspaceMembers,
  getOwnerAllocationSummary,
  getAgentLedgerBalance,
} from "@/lib/premiumWorkspace.server";
import { requirePremiumWorkspacePageContext } from "@/lib/premiumWorkspaceApp.server";

export const metadata: Metadata = { title: "Carteira Premium — BrisaHub" };

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "emerald" | "amber" | "rose";
}) {
  const colors = { emerald: "text-emerald-700", amber: "text-amber-700", rose: "text-rose-600" };
  return (
    <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{label}</p>
      <p className={`mt-2 text-[1.8rem] font-bold ${accent ? colors[accent] : "text-zinc-950"}`}>{value}</p>
      {hint ? <p className="mt-1 text-[12px] text-zinc-500">{hint}</p> : null}
    </div>
  );
}

type TxRow = {
  id: string;
  type: string;
  amount: number;
  status: string;
  note: string | null;
  created_at: string;
  related_job_id: string | null;
};

function txLabel(type: string): string {
  const map: Record<string, string> = {
    allocation:          "Saldo adicionado pelo proprietário",
    allocation_reversal: "Saldo recolhido pelo proprietário",
    job_commitment:      "Valor reservado em vaga",
    job_release:         "Valor liberado",
    refund:              "Reembolso",
    adjustment:          "Ajuste",
  };
  return map[type] ?? type;
}

function txSign(type: string): "+" | "-" {
  return ["allocation", "job_release", "refund"].includes(type) ? "+" : "-";
}

function txColor(type: string): string {
  if (["allocation", "job_release", "refund"].includes(type)) return "text-emerald-600";
  if (type === "job_commitment") return "text-amber-600";
  return "text-rose-500";
}

function TxList({ rows, jobTitleMap }: { rows: TxRow[]; jobTitleMap: Map<string, string> }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[28px] border border-zinc-200 bg-white px-6 py-10 text-center shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
        <p className="text-[14px] text-zinc-500">Nenhuma movimentação ainda.</p>
      </div>
    );
  }
  return (
    <div className="rounded-[28px] border border-zinc-200 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.05)] overflow-hidden">
      <ul className="divide-y divide-zinc-100">
        {rows.map((tx) => (
          <li key={tx.id} className="flex items-start justify-between gap-4 px-5 py-3.5">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-zinc-900">{txLabel(tx.type)}</p>
              <p className="mt-0.5 text-[11px] text-zinc-400">
                {new Date(tx.created_at).toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                {tx.related_job_id && jobTitleMap.get(tx.related_job_id)
                  ? ` · ${jobTitleMap.get(tx.related_job_id)}`
                  : null}
                {tx.note ? ` · ${tx.note}` : null}
              </p>
            </div>
            <p className={`flex-shrink-0 text-[14px] font-bold tabular-nums ${txColor(tx.type)}`}>
              {txSign(tx.type)}{brl(tx.amount)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function WorkspaceWalletPage() {
  const context = await requirePremiumWorkspacePageContext();
  const supabase = createServerClient({ useServiceRole: true });

  // ── Agent view ───────────────────────────────────────────────────────────────
  if (!context.isOwner) {
    const [ledger, txResult] = await Promise.all([
      getAgentLedgerBalance(context.workspace.id, context.userId),
      supabase
        .from("premium_agent_wallet_transactions")
        .select("id, type, amount, status, note, created_at, related_job_id")
        .eq("workspace_id", context.workspace.id)
        .eq("agent_user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const txRows: TxRow[] = (txResult.data ?? []).map((r) => ({
      id: String(r.id),
      type: String(r.type),
      amount: Number(r.amount),
      status: String(r.status),
      note: r.note ?? null,
      created_at: String(r.created_at),
      related_job_id: r.related_job_id ?? null,
    }));

    const relatedJobIds = [...new Set(txRows.map((r) => r.related_job_id).filter((id): id is string => !!id))];
    const jobTitleMap = new Map<string, string>();
    if (relatedJobIds.length > 0) {
      const { data: jobs } = await supabase.from("jobs").select("id, title").in("id", relatedJobIds);
      for (const j of jobs ?? []) jobTitleMap.set(j.id, j.title ?? "Vaga");
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[1.8rem] font-bold tracking-tight text-zinc-950">Carteira Premium</h1>
          <p className="mt-1 text-[14px] text-zinc-500">Seu saldo alocado dentro do Espaço Premium.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Saldo alocado"
            value={brl(ledger.allocatedAmount)}
            hint="Total adicionado pelo proprietário"
          />
          <StatCard
            label="Saldo comprometido"
            value={brl(ledger.committedAmount)}
            hint="Reservado em vagas ativas"
            accent="amber"
          />
          <StatCard
            label="Saldo disponível"
            value={brl(ledger.availableAmount)}
            hint="Disponível para criar vagas"
            accent={ledger.availableAmount === 0 ? "rose" : "emerald"}
          />
        </div>

        <div>
          <h2 className="mb-3 text-[13px] font-semibold text-zinc-700">Histórico de movimentações</h2>
          <TxList rows={txRows} jobTitleMap={jobTitleMap} />
        </div>
      </div>
    );
  }

  // ── Owner view ───────────────────────────────────────────────────────────────
  const [summary, members, ledgerMap] = await Promise.all([
    getOwnerAllocationSummary(context.workspace.id, context.workspace.ownerUserId),
    getWorkspaceMembers(context.workspace.id),
    getWorkspaceAgentLedgerBalances(context.workspace.id),
  ]);

  const agents = members.filter((m) => m.role === "agent");
  const totalCommitted = Array.from(ledgerMap.values()).reduce((s, l) => s + l.committedAmount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.8rem] font-bold tracking-tight text-zinc-950">Carteira Premium</h1>
        <p className="mt-1 text-[14px] text-zinc-500">
          Saldo da agência, alocações por agente e comprometimentos ativos.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Saldo total da agência"
          value={brl(summary.ownerWalletBalance)}
          hint="Saldo disponível na sua conta BrisaHub"
        />
        <StatCard
          label="Alocado a agentes"
          value={brl(summary.totalAllocatedToAgents)}
          hint="Total distribuído para a equipe"
          accent="amber"
        />
        <StatCard
          label="Disponível para alocar"
          value={brl(summary.ownerUnallocatedAvailable)}
          hint="Pode ser distribuído a agentes"
          accent="emerald"
        />
      </div>

      {agents.length > 0 ? (
        <div className="space-y-3">
          <p className="text-[13px] font-semibold text-zinc-700">Saldo por agente</p>
          {agents.map((agent) => {
            const ledger = ledgerMap.get(agent.userId) ?? {
              allocatedAmount: 0,
              committedAmount: 0,
              availableAmount: 0,
              agentUserId: agent.userId,
            };
            return (
              <div
                key={agent.id}
                className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-[16px] font-semibold text-zinc-950">
                      {agent.displayName || agent.email}
                    </h2>
                    <p className="mt-1 text-[12px] text-zinc-500">{agent.email}</p>
                  </div>
                  <div className="grid gap-3 text-[13px] text-zinc-600 sm:grid-cols-3">
                    <p>
                      <span className="font-semibold text-zinc-800">Alocado:</span>{" "}
                      {brl(ledger.allocatedAmount)}
                    </p>
                    <p>
                      <span className="font-semibold text-zinc-800">Comprometido:</span>{" "}
                      {brl(ledger.committedAmount)}
                    </p>
                    <p
                      className={`font-semibold ${
                        ledger.availableAmount === 0 ? "text-rose-600" : "text-emerald-700"
                      }`}
                    >
                      Disponível: {brl(ledger.availableAmount)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <p className="text-[12px] text-zinc-400">
            Total comprometido em vagas ativas:{" "}
            <strong className="text-zinc-600">{brl(totalCommitted)}</strong>
          </p>
        </div>
      ) : (
        <div className="rounded-[28px] border border-zinc-200 bg-white px-6 py-8 text-center shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
          <p className="text-[14px] text-zinc-500">
            Nenhum agente ativo. Convide agentes na página de Agentes.
          </p>
        </div>
      )}
    </div>
  );
}
