import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase.server";
import { createServerClient } from "@/lib/supabase";
import {
  getUserPremiumWorkspace,
  getAgentLedgerBalance,
  getOwnerAllocationSummary,
} from "@/lib/premiumWorkspace.server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params;

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const workspaceAccess = await getUserPremiumWorkspace(user.id);
  if (!workspaceAccess || workspaceAccess.membership.role !== "owner") {
    return NextResponse.json({ error: "Somente o proprietário pode alocar saldo." }, { status: 403 });
  }

  const supabase = createServerClient({ useServiceRole: true });

  const { data: member } = await supabase
    .from("premium_workspace_members")
    .select("id, workspace_id, role, status, user_id")
    .eq("id", memberId)
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "Membro não encontrado." }, { status: 404 });
  if (member.workspace_id !== workspaceAccess.workspace.id) {
    return NextResponse.json({ error: "Membro não pertence a este workspace." }, { status: 403 });
  }
  if (member.role !== "agent" || member.status !== "active") {
    return NextResponse.json({ error: "Somente agentes ativos podem receber alocação." }, { status: 422 });
  }

  const body = (await req.json()) as {
    type: "allocation" | "allocation_reversal";
    amount: number;
    note?: string;
  };

  if (!["allocation", "allocation_reversal"].includes(body.type)) {
    return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Valor inválido." }, { status: 400 });
  }

  const workspaceId = workspaceAccess.workspace.id;
  const agentUserId = String(member.user_id);
  const ownerUserId = user.id;

  if (body.type === "allocation") {
    // Check owner has enough unallocated balance
    const summary = await getOwnerAllocationSummary(workspaceId, ownerUserId);
    if (amount > summary.ownerUnallocatedAvailable) {
      return NextResponse.json(
        { error: "Saldo disponível insuficiente para alocar a este agente." },
        { status: 422 }
      );
    }
  } else {
    // allocation_reversal: check agent available >= amount
    const ledger = await getAgentLedgerBalance(workspaceId, agentUserId);
    if (amount > ledger.availableAmount) {
      return NextResponse.json(
        { error: "O agente não tem saldo disponível suficiente para recolher este valor." },
        { status: 422 }
      );
    }
  }

  const { error: txError } = await supabase
    .from("premium_agent_wallet_transactions")
    .insert({
      workspace_id:  workspaceId,
      agent_user_id: agentUserId,
      owner_user_id: ownerUserId,
      type:          body.type,
      amount,
      status:        "completed",
      note:          body.note?.trim() || null,
      created_by:    ownerUserId,
    });

  if (txError) {
    console.error("[allocate] Insert failed:", txError);
    return NextResponse.json({ error: "Não foi possível registrar a alocação." }, { status: 500 });
  }

  const [agentBalance, ownerSummary] = await Promise.all([
    getAgentLedgerBalance(workspaceId, agentUserId),
    getOwnerAllocationSummary(workspaceId, ownerUserId),
  ]);

  return NextResponse.json({ ok: true, agentBalance, ownerSummary });
}
