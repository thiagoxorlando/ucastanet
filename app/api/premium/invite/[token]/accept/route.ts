import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase.server";
import { createServerClient } from "@/lib/supabase";
import { getWorkspaceSeatUsage } from "@/lib/premiumWorkspace.server";

// POST /api/premium/invite/[token]/accept
// Authenticated agency user accepts a workspace agent invite.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient({ useServiceRole: true });

  // Require agency account — safer first version
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "agency") {
    return NextResponse.json(
      { error: "Este convite precisa ser aceito com uma conta de agência." },
      { status: 422 }
    );
  }

  const { data: invite } = await supabase
    .from("premium_agent_invites")
    .select(
      "id, workspace_id, invited_email, status, expires_at, spending_limit, role, created_by"
    )
    .eq("token", token)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: "Convite inválido." }, { status: 404 });
  }
  if (invite.status !== "pending") {
    return NextResponse.json({ error: "Este convite não está mais disponível." }, { status: 422 });
  }
  if (new Date(invite.expires_at as string) < new Date()) {
    await supabase
      .from("premium_agent_invites")
      .update({ status: "expired" })
      .eq("id", invite.id);
    return NextResponse.json({ error: "Este convite expirou." }, { status: 422 });
  }

  // Seat limit check (re-checked at acceptance to guard against race conditions)
  const usage = await getWorkspaceSeatUsage(invite.workspace_id as string);
  if (usage.remaining <= 0) {
    return NextResponse.json(
      { error: "O workspace atingiu o limite de agentes. Entre em contato com o proprietário." },
      { status: 422 }
    );
  }

  // Check existing membership (non-removed rows only — unique index covers this)
  const { data: existing } = await supabase
    .from("premium_workspace_members")
    .select("id, status")
    .eq("workspace_id", invite.workspace_id)
    .eq("user_id", user.id)
    .is("removed_at", null)
    .maybeSingle();

  if (existing) {
    if (existing.status === "active") {
      return NextResponse.json({ error: "Você já é membro deste workspace." }, { status: 422 });
    }
    // Re-activate suspended member
    const { error: reactivateError } = await supabase
      .from("premium_workspace_members")
      .update({ status: "active" })
      .eq("id", existing.id);
    if (reactivateError) {
      console.error("[invite/accept] Reactivate failed:", reactivateError);
      return NextResponse.json({ error: "Não foi possível aceitar o convite." }, { status: 500 });
    }
  } else {
    const { error: memberError } = await supabase
      .from("premium_workspace_members")
      .insert({
        workspace_id: invite.workspace_id,
        user_id: user.id,
        role: invite.role ?? "agent",
        status: "active",
        spending_limit: invite.spending_limit,
        created_by: invite.created_by,
      });

    if (memberError) {
      console.error("[invite/accept] Member insert failed:", memberError);
      return NextResponse.json({ error: "Não foi possível aceitar o convite." }, { status: 500 });
    }
  }

  // Mark invite as accepted
  await supabase
    .from("premium_agent_invites")
    .update({
      status: "accepted",
      accepted_by: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invite.id);

  return NextResponse.json({ ok: true });
}
