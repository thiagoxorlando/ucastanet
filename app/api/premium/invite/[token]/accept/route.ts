import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase.server";
import { createServerClient } from "@/lib/supabase";
import { getWorkspaceSeatUsage } from "@/lib/premiumWorkspace.server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const supabase = createServerClient({ useServiceRole: true });
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

  const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
  const currentEmail = authUser.user?.email?.trim().toLowerCase() ?? "";

  const { data: invite } = await supabase
    .from("premium_agent_invites")
    .select("id, workspace_id, invited_email, status, expires_at, spending_limit, role, created_by")
    .eq("token", token)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: "Convite inválido ou expirado." }, { status: 404 });
  }
  if (invite.status !== "pending") {
    return NextResponse.json({ error: "Convite inválido ou expirado." }, { status: 422 });
  }
  if (new Date(invite.expires_at as string) < new Date()) {
    await supabase.from("premium_agent_invites").update({ status: "expired" }).eq("id", invite.id);
    return NextResponse.json({ error: "Convite inválido ou expirado." }, { status: 422 });
  }

  const invitedEmail = String(invite.invited_email ?? "").trim().toLowerCase();
  if (!currentEmail || currentEmail !== invitedEmail) {
    return NextResponse.json(
      { error: "Convite inválido ou expirado." },
      { status: 403 }
    );
  }

  const usage = await getWorkspaceSeatUsage(String(invite.workspace_id));
  if (usage.remaining <= 0) {
    return NextResponse.json(
      { error: "Você não tem acesso a este espaço Premium." },
      { status: 422 }
    );
  }

  const { data: existing } = await supabase
    .from("premium_workspace_members")
    .select("id, status")
    .eq("workspace_id", invite.workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    if (existing.status === "active") {
      return NextResponse.json({ error: "Você já faz parte deste espaço Premium." }, { status: 422 });
    }

    const { error: reactivateError } = await supabase
      .from("premium_workspace_members")
      .update({
        status: "active",
        removed_at: null,
        spending_limit: invite.spending_limit,
      })
      .eq("id", existing.id);

    if (reactivateError) {
      console.error("[invite/accept] Reactivate failed:", reactivateError);
      return NextResponse.json({ error: "Não foi possível aceitar o convite." }, { status: 500 });
    }
  } else {
    const { error: memberError } = await supabase.from("premium_workspace_members").insert({
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
