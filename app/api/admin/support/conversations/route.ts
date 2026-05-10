import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/requireAdmin";
import { resolveSupportUsers } from "@/lib/resolveSupportUsers";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status") ?? "";
  const search = (searchParams.get("search") ?? "").toLowerCase();

  const supabase = createServerClient({ useServiceRole: true });

  let query = supabase
    .from("support_conversations")
    .select("id, user_id, subject, status, priority, last_message_at, created_at, closed_at")
    .order("last_message_at", { ascending: false });

  if (statusFilter) query = query.eq("status", statusFilter);

  const { data: convs, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const userIds = [...new Set((convs ?? []).map((c) => c.user_id))];
  const userMap = await resolveSupportUsers(userIds);

  let conversations = (convs ?? []).map((c) => {
    const u = userMap.get(c.user_id);
    return {
      ...c,
      userName:      u?.name      ?? "Usuário removido",
      userEmail:     u?.email     ?? "",
      userRole:      u?.role      ?? "unknown",
      userRoleLabel: u?.roleLabel ?? "Usuário",
    };
  });

  if (search) {
    conversations = conversations.filter(
      (c) =>
        c.subject.toLowerCase().includes(search) ||
        c.userName.toLowerCase().includes(search) ||
        c.userEmail.toLowerCase().includes(search),
    );
  }

  return NextResponse.json({ conversations });
}
