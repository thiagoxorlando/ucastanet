import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase.server";
import { createServerClient } from "@/lib/supabase";
import { getUserPremiumWorkspace } from "@/lib/premiumWorkspace.server";

const VALID_STATUSES = ["active", "suspended", "removed"] as const;
type MemberStatus = typeof VALID_STATUSES[number];

// PATCH /api/agency/workspace/agents/[memberId]
// Owner-only. Can update spending_limit and/or status.
// status = "removed" also sets removed_at = now().
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params;

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await getUserPremiumWorkspace(user.id);
  if (!ws || ws.membership.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createServerClient({ useServiceRole: true });

  const { data: member } = await supabase
    .from("premium_workspace_members")
    .select("id, workspace_id, role, status, user_id")
    .eq("id", memberId)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "Membro não encontrado." }, { status: 404 });
  }
  if (member.workspace_id !== ws.workspace.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (member.role === "owner") {
    return NextResponse.json({ error: "Não é possível modificar o proprietário." }, { status: 422 });
  }

  const body = (await req.json()) as { status?: string; spendingLimit?: number | null };
  const updates: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status as MemberStatus)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }
    updates.status = body.status;
    if (body.status === "removed") {
      updates.removed_at = new Date().toISOString();
    }
  }

  if (body.spendingLimit !== undefined) {
    updates.spending_limit =
      body.spendingLimit != null && Number(body.spendingLimit) >= 0
        ? Number(body.spendingLimit)
        : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nenhuma alteração enviada." }, { status: 400 });
  }

  const { error } = await supabase
    .from("premium_workspace_members")
    .update(updates)
    .eq("id", memberId);

  if (error) {
    console.error("[workspace/members/update] Update failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
