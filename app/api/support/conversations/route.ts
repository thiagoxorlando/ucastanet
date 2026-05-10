import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { notifyAdmins } from "@/lib/notify";

export async function GET() {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient({ useServiceRole: true });
  const { data, error } = await supabase
    .from("support_conversations")
    .select("id, subject, status, priority, last_message_at, created_at, closed_at")
    .eq("user_id", user.id)
    .order("last_message_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ conversations: data ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { subject?: string; message?: string };
  const subject = (body.subject ?? "").trim();
  const message = (body.message ?? "").trim();

  if (!subject) return NextResponse.json({ error: "Assunto é obrigatório." }, { status: 400 });
  if (!message) return NextResponse.json({ error: "Mensagem é obrigatória." }, { status: 400 });
  if (message.length > 5000) return NextResponse.json({ error: "Mensagem muito longa (máx. 5000 caracteres)." }, { status: 400 });

  const supabase = createServerClient({ useServiceRole: true });

  const { data: conv, error: convErr } = await supabase
    .from("support_conversations")
    .insert({ user_id: user.id, subject, status: "waiting_admin" })
    .select("id")
    .single();

  if (convErr || !conv) {
    return NextResponse.json({ error: convErr?.message ?? "Erro ao criar conversa." }, { status: 400 });
  }

  const { error: msgErr } = await supabase
    .from("support_messages")
    .insert({ conversation_id: conv.id, sender_id: user.id, sender_role: "user", message });

  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 400 });

  await notifyAdmins(
    "support",
    "Nova solicitação de suporte recebida.",
    "/admin/support",
    `support-new:${conv.id}`,
  );

  return NextResponse.json({ conversation: conv }, { status: 201 });
}
