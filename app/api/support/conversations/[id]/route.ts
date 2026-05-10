import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient({ useServiceRole: true });

  const { data: conv } = await supabase
    .from("support_conversations")
    .select("id, subject, status, priority, last_message_at, created_at, closed_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!conv) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });

  const { data: messages } = await supabase
    .from("support_messages")
    .select("id, sender_id, sender_role, message, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ conversation: conv, messages: messages ?? [] });
}
