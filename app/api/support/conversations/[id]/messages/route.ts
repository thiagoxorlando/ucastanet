import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { notifyAdmins } from "@/lib/notify";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { message?: string };
  const message = (body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "Mensagem é obrigatória." }, { status: 400 });
  if (message.length > 5000) return NextResponse.json({ error: "Mensagem muito longa (máx. 5000 caracteres)." }, { status: 400 });

  const supabase = createServerClient({ useServiceRole: true });

  const { data: conv } = await supabase
    .from("support_conversations")
    .select("id, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!conv) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  if (conv.status === "closed") {
    return NextResponse.json({ error: "Esta conversa foi encerrada." }, { status: 409 });
  }

  const now = new Date().toISOString();

  const { data: msg, error: msgErr } = await supabase
    .from("support_messages")
    .insert({ conversation_id: id, sender_id: user.id, sender_role: "user", message })
    .select("id, sender_id, sender_role, message, created_at")
    .single();

  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 400 });

  await supabase
    .from("support_conversations")
    .update({ status: "waiting_admin", last_message_at: now, updated_at: now })
    .eq("id", id);

  await notifyAdmins(
    "support",
    "Um usuário respondeu uma conversa de suporte.",
    "/admin/support",
    `support-user-msg:${msg.id}`,
  );

  return NextResponse.json({ message: msg }, { status: 201 });
}
