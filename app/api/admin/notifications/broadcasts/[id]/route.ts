import { NextRequest, NextResponse } from "next/server";
import { logAdminAction } from "@/lib/auditLog";
import { requireAdmin } from "@/lib/requireAdmin";
import { createServerClient } from "@/lib/supabase";

type Body = {
  action?: "archive" | "delete";
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Body | null;
  const action = body?.action;

  if (!id || !action || !["archive", "delete"].includes(action)) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const supabase = createServerClient({ useServiceRole: true });
  const now = new Date().toISOString();
  const patch = action === "archive" ? { archived_at: now } : { deleted_at: now };

  const { data: before } = await supabase
    .from("admin_notification_broadcasts")
    .select("id, archived_at, deleted_at")
    .eq("id", id)
    .maybeSingle();

  const { data, error } = await supabase
    .from("admin_notification_broadcasts")
    .update(patch)
    .eq("id", id)
    .select("id, archived_at, deleted_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Não foi possível atualizar o envio." }, { status: 500 });
  }

  await logAdminAction({
    adminId: auth.userId,
    action: action === "archive" ? "notification_broadcast_archived" : "notification_broadcast_deleted",
    entityType: "notification_broadcast",
    entityId: id,
    before: before ?? undefined,
    after: data ?? undefined,
  });

  return NextResponse.json({
    success: true,
    archivedAt: (data as { archived_at?: string | null } | null)?.archived_at ?? null,
    deletedAt: (data as { deleted_at?: string | null } | null)?.deleted_at ?? null,
  });
}
