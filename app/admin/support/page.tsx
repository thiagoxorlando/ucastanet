import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/requireAdmin";
import { redirect } from "next/navigation";
import AdminSupport, { type AdminConversation } from "@/features/admin/AdminSupport";

export const metadata: Metadata = { title: "Suporte — Administração — BrisaHub" };

export default async function AdminSupportPage() {
  const auth = await requireAdmin();
  if (!("userId" in auth)) redirect("/");

  const supabase = createServerClient({ useServiceRole: true });

  const { data: convs } = await supabase
    .from("support_conversations")
    .select("id, user_id, subject, status, priority, last_message_at, created_at, closed_at")
    .order("last_message_at", { ascending: false });

  const userIds = [...new Set((convs ?? []).map((c) => c.user_id))];
  const profileMap = new Map<string, { name: string; email: string; role: string }>();

  if (userIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.id, {
        name:  p.full_name ?? "—",
        email: p.email    ?? "—",
        role:  p.role     ?? "user",
      });
    }
  }

  const conversations: AdminConversation[] = (convs ?? []).map((c) => ({
    id:              c.id,
    user_id:         c.user_id,
    subject:         c.subject,
    status:          c.status,
    priority:        c.priority,
    last_message_at: c.last_message_at,
    created_at:      c.created_at,
    closed_at:       c.closed_at,
    userName:        profileMap.get(c.user_id)?.name  ?? "—",
    userEmail:       profileMap.get(c.user_id)?.email ?? "—",
    userRole:        profileMap.get(c.user_id)?.role  ?? "user",
  }));

  return <AdminSupport initialConversations={conversations} />;
}
