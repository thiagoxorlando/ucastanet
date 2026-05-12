import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase.server";
import { getUserPremiumWorkspace, getAgentBudgetUsage } from "@/lib/premiumWorkspace.server";

export async function GET() {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await getUserPremiumWorkspace(user.id);
  if (!ws || ws.membership.role !== "agent") {
    return NextResponse.json({ budget: null });
  }

  const spendingLimit = ws.membership.spendingLimit;
  if (spendingLimit == null) {
    return NextResponse.json({ budget: { spendingLimit: null, usedAmount: 0, availableAmount: null } });
  }

  const usage = await getAgentBudgetUsage(ws.workspace.id, user.id);
  return NextResponse.json({ budget: usage });
}
