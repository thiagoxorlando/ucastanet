import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/requireAdmin";
import { resolveSupportUsers } from "@/lib/resolveSupportUsers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const supabase = createServerClient({ useServiceRole: true });

  const { data: conv } = await supabase
    .from("support_conversations")
    .select("id, user_id, subject, status, priority, last_message_at, created_at, closed_at, archived_at")
    .eq("id", id)
    .single();

  if (!conv) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });

  const [userMap, { data: messages }] = await Promise.all([
    resolveSupportUsers([conv.user_id]),
    supabase
      .from("support_messages")
      .select("id, sender_id, sender_role, message, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const u = userMap.get(conv.user_id);

  return NextResponse.json({
    conversation: {
      ...conv,
      archived_at:   (conv as Record<string, unknown>).archived_at as string | null ?? null,
      userName:      u?.name      ?? "Usuário removido",
      userEmail:     u?.email     ?? "",
      userRole:      u?.role      ?? "unknown",
      userRoleLabel: u?.roleLabel ?? "Usuário",
    },
    messages: messages ?? [],
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json() as { status?: string; priority?: string; archived?: boolean };

  const validStatuses   = ["open", "waiting_admin", "waiting_user", "closed"];
  const validPriorities = ["low", "normal", "high", "urgent"];

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.archived !== undefined) {
    if (body.archived) {
      update.archived_at = new Date().toISOString();
      update.archived_by = auth.userId;
    } else {
      update.archived_at = null;
      update.archived_by = null;
    }
  }

  if (body.status !== undefined) {
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }
    update.status = body.status;
    if (body.status === "closed") update.closed_at = new Date().toISOString();
  }

  if (body.priority !== undefined) {
    if (!validPriorities.includes(body.priority)) {
      return NextResponse.json({ error: "Prioridade inválida." }, { status: 400 });
    }
    update.priority = body.priority;
  }

  const supabase = createServerClient({ useServiceRole: true });
  const { error } = await supabase
    .from("support_conversations")
    .update(update)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
