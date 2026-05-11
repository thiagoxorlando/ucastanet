import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { createServerClient } from "@/lib/supabase";
import { notify } from "@/lib/notify";
import { logAdminAction } from "@/lib/auditLog";

type Audience = "all" | "agencies" | "talents" | "specific";

type RequestBody = {
  title: string;
  message: string;
  audience: Audience;
  userId?: string;
  link?: string;
};

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null) as RequestBody | null;

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const { title, message, audience, userId, link } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Título é obrigatório." }, { status: 400 });
  }
  if (!message?.trim()) {
    return NextResponse.json({ error: "Mensagem é obrigatória." }, { status: 400 });
  }
  if (!["all", "agencies", "talents", "specific"].includes(audience)) {
    return NextResponse.json({ error: "Destinatário inválido." }, { status: 400 });
  }
  if (audience === "specific" && !userId?.trim()) {
    return NextResponse.json({ error: "Selecione um usuário para envio específico." }, { status: 400 });
  }

  const supabase = createServerClient({ useServiceRole: true });

  let userIds: string[] = [];

  if (audience === "specific") {
    userIds = [userId!.trim()];
  } else {
    const roleFilter =
      audience === "agencies" ? "agency" :
      audience === "talents"  ? "talent"  : null;

    let query = supabase.from("profiles").select("id, role");
    if (roleFilter) {
      query = query.eq("role", roleFilter) as typeof query;
    } else {
      query = query.in("role", ["agency", "talent"]) as typeof query;
    }

    const { data: profiles, error } = await query;
    if (error) {
      return NextResponse.json({ error: "Erro ao buscar usuários." }, { status: 500 });
    }

    userIds = (profiles ?? []).map((p) => p.id as string);
  }

  if (userIds.length === 0) {
    return NextResponse.json({ error: "Nenhum usuário encontrado para o destinatário selecionado." }, { status: 400 });
  }

  const notifMessage = `**${title.trim()}**\n${message.trim()}`;

  await notify(userIds, "admin_broadcast", notifMessage, link?.trim() || "/");

  const { error: historyError } = await supabase
    .from("admin_notification_broadcasts")
    .insert({
      admin_id:       auth.userId,
      title:          title.trim(),
      message:        message.trim(),
      audience,
      target_user_id: audience === "specific" ? userId!.trim() : null,
      link:           link?.trim() || null,
      sent_count:     userIds.length,
    });

  if (historyError) {
    console.error("[admin/notifications/send] history insert failed (non-fatal):", historyError.message);
  }

  await logAdminAction({
    adminId: auth.userId,
    action: "notification_broadcast_sent",
    entityType: "notification",
    metadata: { audience, title: title.trim(), sentCount: userIds.length, targetUserId: audience === "specific" ? userId ?? null : null },
  });

  return NextResponse.json({ success: true, sent: userIds.length });
}
