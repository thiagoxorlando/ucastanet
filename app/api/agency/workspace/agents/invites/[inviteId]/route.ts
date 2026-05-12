import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase.server";
import { createServerClient } from "@/lib/supabase";
import { getUserPremiumWorkspace } from "@/lib/premiumWorkspace.server";

// PATCH /api/agency/workspace/agents/invites/[inviteId]
// Owner-only. action = "cancel" → sets invite status to cancelled.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  const { inviteId } = await params;

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await getUserPremiumWorkspace(user.id);
  if (!ws || ws.membership.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as { action?: string };
  if (body.action !== "cancel") {
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  }

  const supabase = createServerClient({ useServiceRole: true });

  const { data: invite } = await supabase
    .from("premium_agent_invites")
    .select("id, workspace_id, status")
    .eq("id", inviteId)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: "Convite não encontrado." }, { status: 404 });
  }
  if (invite.workspace_id !== ws.workspace.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (invite.status !== "pending") {
    return NextResponse.json({ error: "Este convite não pode ser cancelado." }, { status: 422 });
  }

  const { error } = await supabase
    .from("premium_agent_invites")
    .update({ status: "cancelled" })
    .eq("id", inviteId);

  if (error) {
    console.error("[workspace/invites/cancel] Update failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
