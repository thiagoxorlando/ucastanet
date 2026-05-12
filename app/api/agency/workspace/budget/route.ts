import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase.server";
import { getAgentBudgetUsage, getUserPremiumWorkspace } from "@/lib/premiumWorkspace.server";

export async function GET() {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const workspaceAccess = await getUserPremiumWorkspace(user.id);
  if (!workspaceAccess || workspaceAccess.membership.role !== "agent") {
    return NextResponse.json({ budget: null });
  }

  const usage = await getAgentBudgetUsage(workspaceAccess.workspace.id, user.id);
  return NextResponse.json({ budget: usage });
}
