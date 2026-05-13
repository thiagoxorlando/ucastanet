import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { brl } from "@/lib/brl";
import { getAgentBudgetUsage, getWorkspaceAgentBudgets, getWorkspaceMembers } from "@/lib/premiumWorkspace.server";
import { requirePremiumWorkspacePageContext } from "@/lib/premiumWorkspaceApp.server";

export const metadata: Metadata = { title: "Carteira Premium — BrisaHub" };

export default async function WorkspaceWalletPage() {
  const context = await requirePremiumWorkspacePageContext();
  const supabase = createServerClient({ useServiceRole: true });

  const ownerBalancePromise = supabase
    .from("profiles")
    .select("wallet_balance")
    .eq("id", context.workspace.ownerUserId)
    .maybeSingle();

  if (!context.isOwner) {
    const [ownerBalanceResult, ownBudget] = await Promise.all([
      ownerBalancePromise,
      getAgentBudgetUsage(context.workspace.id, context.userId),
    ]);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[1.8rem] font-bold tracking-tight text-zinc-950">Carteira Premium</h1>
          <p className="mt-1 text-[14px] text-zinc-500">
            Seu limite de uso dentro do workspace e o saldo da conta principal.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Carteira Premium</p>
            <p className="mt-2 text-[1.8rem] font-bold text-zinc-950">{brl(Number(ownerBalanceResult.data?.wallet_balance ?? 0))}</p>
            <p className="mt-1 text-[12px] text-zinc-500">Saldo da conta principal do workspace.</p>
          </div>
          <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Limite de uso</p>
            <p className="mt-2 text-[1.8rem] font-bold text-zinc-950">{ownBudget?.spendingLimit != null ? brl(ownBudget.spendingLimit) : "Ilimitado"}</p>
            <p className="mt-1 text-[12px] text-zinc-500">Limite alocado pelo proprietário.</p>
          </div>
          <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Disponível</p>
            <p className="mt-2 text-[1.8rem] font-bold text-zinc-950">{ownBudget?.availableAmount != null ? brl(ownBudget.availableAmount) : "Ilimitado"}</p>
            <p className="mt-1 text-[12px] text-zinc-500">Saldo restante para novas vagas.</p>
          </div>
        </div>
      </div>
    );
  }

  const [ownerBalanceResult, members, budgetMap] = await Promise.all([
    ownerBalancePromise,
    getWorkspaceMembers(context.workspace.id),
    getWorkspaceAgentBudgets(context.workspace.id),
  ]);

  const agents = members.filter((member) => member.role === "agent");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.8rem] font-bold tracking-tight text-zinc-950">Carteira Premium</h1>
        <p className="mt-1 text-[14px] text-zinc-500">
          Saldo da conta principal e alocação de limite para cada agente do workspace.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Carteira Premium</p>
          <p className="mt-2 text-[1.8rem] font-bold text-zinc-950">{brl(Number(ownerBalanceResult.data?.wallet_balance ?? 0))}</p>
          <p className="mt-1 text-[12px] text-zinc-500">Saldo usado pela operação privada do workspace.</p>
        </div>
        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Agentes</p>
          <p className="mt-2 text-[1.8rem] font-bold text-zinc-950">{agents.length}</p>
          <p className="mt-1 text-[12px] text-zinc-500">Agentes ativos com limite alocado.</p>
        </div>
        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Uso total</p>
          <p className="mt-2 text-[1.8rem] font-bold text-zinc-950">
            {brl(Array.from(budgetMap.values()).reduce((sum, item) => sum + item.usedAmount, 0))}
          </p>
          <p className="mt-1 text-[12px] text-zinc-500">Valor já comprometido nas vagas criadas pelos agentes.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {agents.map((agent) => {
          const usage = budgetMap.get(agent.userId) ?? null;
          return (
            <div key={agent.id} className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-[17px] font-semibold text-zinc-950">{agent.displayName || agent.email}</h2>
                  <p className="mt-1 text-[13px] text-zinc-500">{agent.email}</p>
                </div>
                <div className="grid gap-3 text-[13px] text-zinc-600 sm:grid-cols-3">
                  <p><span className="font-semibold text-zinc-800">Limite:</span> {usage?.spendingLimit != null ? brl(usage.spendingLimit) : "Ilimitado"}</p>
                  <p><span className="font-semibold text-zinc-800">Usado:</span> {brl(usage?.usedAmount ?? 0)}</p>
                  <p><span className="font-semibold text-zinc-800">Disponível:</span> {usage?.availableAmount != null ? brl(usage.availableAmount) : "Ilimitado"}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
