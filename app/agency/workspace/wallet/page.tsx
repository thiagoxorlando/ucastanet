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

function StatCard({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: "emerald" | "amber" | "rose" }) {
  const colors = {
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    rose: "text-rose-600",
  };
  return (
    <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{label}</p>
      <p className={`mt-2 text-[1.8rem] font-bold ${accent ? colors[accent] : "text-zinc-950"}`}>{value}</p>
      {hint ? <p className="mt-1 text-[12px] text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export default async function WorkspaceWalletPage() {
  const context = await requirePremiumWorkspacePageContext();
  const supabase = createServerClient({ useServiceRole: true });

  if (!context.isOwner) {
    const ledger = await getAgentLedgerBalance(context.workspace.id, context.userId);
    const ownerBalance = await supabase
      .from("profiles").select("wallet_balance").eq("id", context.workspace.ownerUserId).maybeSingle();

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[1.8rem] font-bold tracking-tight text-zinc-950">Carteira Premium</h1>
          <p className="mt-1 text-[14px] text-zinc-500">Seu saldo alocado dentro do Espaço Premium.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Saldo alocado" value={brl(ledger.allocatedAmount)} hint="Total alocado pelo proprietário" />
          <StatCard label="Saldo comprometido" value={brl(ledger.committedAmount)} hint="Reservado em vagas ativas" accent="amber" />
          <StatCard label="Saldo disponível" value={brl(ledger.availableAmount)} hint="Disponível para criar vagas" accent={ledger.availableAmount === 0 ? "rose" : "emerald"} />
        </div>
        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Carteira da agência</p>
          <p className="mt-2 text-[1.8rem] font-bold text-zinc-950">
            {brl(Number(ownerBalance.data?.wallet_balance ?? 0))}
          </p>
          <p className="mt-1 text-[12px] text-zinc-500">Saldo da conta principal do workspace.</p>
        </div>
      </div>
    );
  }

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
        <StatCard label="Saldo total da agência" value={brl(summary.ownerWalletBalance)} hint="profiles.wallet_balance do proprietário" />
        <StatCard label="Alocado a agentes" value={brl(summary.totalAllocatedToAgents)} hint="Total distribuído para a equipe" accent="amber" />
        <StatCard label="Disponível para alocar" value={brl(summary.ownerUnallocatedAvailable)} hint="Pode ser distribuído a novos agentes" accent="emerald" />
      </div>

      {agents.length > 0 ? (
        <div className="space-y-3">
          <p className="text-[13px] font-semibold text-zinc-700">Saldo por agente</p>
          {agents.map((agent) => {
            const ledger = ledgerMap.get(agent.userId) ?? { allocatedAmount: 0, committedAmount: 0, availableAmount: 0, agentUserId: agent.userId };
            return (
              <div key={agent.id} className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-[16px] font-semibold text-zinc-950">{agent.displayName || agent.email}</h2>
                    <p className="mt-1 text-[12px] text-zinc-500">{agent.email}</p>
                  </div>
                  <div className="grid gap-3 text-[13px] text-zinc-600 sm:grid-cols-3">
                    <p><span className="font-semibold text-zinc-800">Alocado:</span> {brl(ledger.allocatedAmount)}</p>
                    <p><span className="font-semibold text-zinc-800">Comprometido:</span> {brl(ledger.committedAmount)}</p>
                    <p><span className={`font-semibold ${ledger.availableAmount === 0 ? "text-rose-600" : "text-emerald-700"}`}>Disponível: {brl(ledger.availableAmount)}</span></p>
                  </div>
                </div>
              </div>
            );
          })}
          <p className="text-[12px] text-zinc-400">
            Total comprometido em vagas ativas: <strong className="text-zinc-600">{brl(totalCommitted)}</strong>
          </p>
        </div>
      ) : (
        <div className="rounded-[28px] border border-zinc-200 bg-white px-6 py-8 text-center shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
          <p className="text-[14px] text-zinc-500">Nenhum agente ativo. Convide agentes na página de Agentes.</p>
        </div>
      )}
    </div>
  );
}
