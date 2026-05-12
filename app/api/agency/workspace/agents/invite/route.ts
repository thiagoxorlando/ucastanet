import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase.server";
import { createServerClient } from "@/lib/supabase";
import { getUserPremiumWorkspace, getWorkspaceSeatUsage } from "@/lib/premiumWorkspace.server";
import { randomBytes } from "crypto";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST /api/agency/workspace/agents/invite
// Owner-only: creates a pending invite for an agent email.
// Returns { invite, inviteUrl }
export async function POST(req: NextRequest) {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await getUserPremiumWorkspace(user.id);
  if (!ws || ws.membership.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (ws.workspace.status !== "active") {
    return NextResponse.json({ error: "Workspace inativo." }, { status: 422 });
  }

  const body = (await req.json()) as { email?: string; spendingLimit?: number | null };
  const email = (body.email ?? "").trim().toLowerCase();

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
  }

  const spendingLimit =
    body.spendingLimit != null && Number(body.spendingLimit) >= 0
      ? Number(body.spendingLimit)
      : null;

  // Check seat limit (active agents + pending invites vs. allowed)
  const usage = await getWorkspaceSeatUsage(ws.workspace.id);
  if (usage.remaining <= 0) {
    return NextResponse.json(
      {
        error: `Seu plano Premium inclui ${usage.includedSeats} agente${usage.includedSeats !== 1 ? "s" : ""}. Adicione assentos extras para convidar mais agentes.`,
      },
      { status: 422 }
    );
  }

  const supabase = createServerClient({ useServiceRole: true });

  // Check no existing pending invite for this email in this workspace
  const { data: dup } = await supabase
    .from("premium_agent_invites")
    .select("id")
    .eq("workspace_id", ws.workspace.id)
    .eq("invited_email", email)
    .eq("status", "pending")
    .maybeSingle();

  if (dup) {
    return NextResponse.json(
      { error: "Já existe um convite pendente para este e-mail." },
      { status: 422 }
    );
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: invite, error } = await supabase
    .from("premium_agent_invites")
    .insert({
      workspace_id: ws.workspace.id,
      invited_email: email,
      role: "agent",
      token,
      status: "pending",
      expires_at: expiresAt,
      created_by: user.id,
      spending_limit: spendingLimit,
    })
    .select(
      "id, workspace_id, invited_email, role, token, status, expires_at, created_at, spending_limit"
    )
    .single();

  if (error || !invite) {
    console.error("[workspace/invite] Insert failed:", error);
    return NextResponse.json({ error: "Não foi possível criar o convite." }, { status: 500 });
  }

  const origin = new URL(req.url).origin;
  const inviteUrl = `${origin}/premium/invite/${token}`;

  return NextResponse.json({ invite, inviteUrl }, { status: 201 });
}
