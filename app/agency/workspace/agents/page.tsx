import type { Metadata } from "next";
import WorkspaceAgentManager from "@/features/agency/WorkspaceAgentManager";
import {
  getWorkspaceAgentLedgerBalances,
  getWorkspaceMembers,
  getWorkspacePendingInvites,
  getWorkspaceSeatUsage,
  getOwnerAllocationSummary,
} from "@/lib/premiumWorkspace.server";
import { requirePremiumWorkspacePageContext } from "@/lib/premiumWorkspaceApp.server";

export const metadata: Metadata = { title: "Agentes — BrisaHub" };

export default async function WorkspaceAgentsPage() {
  const context = await requirePremiumWorkspacePageContext();
  const [seatUsage, members, invites, ledgerMap, ownerSummary] = await Promise.all([
    getWorkspaceSeatUsage(context.workspace.id),
    getWorkspaceMembers(context.workspace.id),
    context.isOwner ? getWorkspacePendingInvites(context.workspace.id) : Promise.resolve([]),
    getWorkspaceAgentLedgerBalances(context.workspace.id),
    context.isOwner
      ? getOwnerAllocationSummary(context.workspace.id, context.workspace.ownerUserId)
      : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.8rem] font-bold tracking-tight text-zinc-950">Agentes</h1>
        <p className="mt-1 text-[14px] text-zinc-500">
          Saldo alocado, comprometido e disponível por agente. Somente o proprietário pode adicionar ou recolher saldo.
        </p>
      </div>

      <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
        <WorkspaceAgentManager
          membership={context.membership}
          initialSeatUsage={seatUsage}
          initialMembers={members}
          initialInvites={invites}
          initialLedgerBalances={Array.from(ledgerMap.values())}
          initialOwnerSummary={ownerSummary ?? undefined}
        />
      </div>
    </div>
  );
}
