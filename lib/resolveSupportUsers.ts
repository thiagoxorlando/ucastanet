import { createServerClient } from "@/lib/supabase";

export type ResolvedUser = {
  id: string;
  name: string;
  email: string;
  role: "agency" | "talent" | "admin" | "unknown";
  roleLabel: "Agência" | "Talento" | "Admin" | "Usuário";
  avatarUrl: string | null;
};

export async function resolveSupportUsers(userIds: string[]): Promise<Map<string, ResolvedUser>> {
  if (!userIds.length) return new Map();

  const supabase = createServerClient({ useServiceRole: true });

  const [
    { data: profiles },
    { data: talentProfiles },
    { data: agencies },
    authResults,
  ] = await Promise.all([
    supabase.from("profiles").select("id, role, full_name").in("id", userIds),
    supabase.from("talent_profiles").select("id, user_id, full_name, avatar_url").in("id", userIds),
    // agencies links via user_id → auth user id
    supabase.from("agencies").select("id, user_id, company_name, avatar_url").in("user_id", userIds),
    // email comes from auth layer, not from any table
    Promise.all(
      userIds.map(async (uid) => {
        const { data } = await supabase.auth.admin.getUserById(uid);
        return [uid, data?.user?.email ?? ""] as [string, string];
      }),
    ),
  ]);

  const emailMap = new Map<string, string>(authResults);

  // talent_profiles: ownerId = user_id ?? id (matches pattern in admin/users/page.tsx)
  const talentMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
  for (const t of (talentProfiles ?? []) as Array<{ id: string; user_id?: string | null; full_name?: string | null; avatar_url?: string | null }>) {
    const ownerId = t.user_id ?? t.id;
    if (ownerId) talentMap.set(ownerId, { full_name: t.full_name ?? null, avatar_url: t.avatar_url ?? null });
  }

  // agencies: ownerId = user_id ?? id
  const agencyMap = new Map<string, { company_name: string | null; avatar_url: string | null }>();
  for (const a of (agencies ?? []) as Array<{ id: string; user_id?: string | null; company_name?: string | null; avatar_url?: string | null }>) {
    const ownerId = a.user_id ?? a.id;
    if (ownerId) agencyMap.set(ownerId, { company_name: a.company_name ?? null, avatar_url: a.avatar_url ?? null });
  }

  const profileMap = new Map<string, { role: string; full_name: string | null }>();
  for (const p of (profiles ?? []) as Array<{ id: string; role?: string | null; full_name?: string | null }>) {
    profileMap.set(p.id, { role: p.role ?? "unknown", full_name: p.full_name ?? null });
  }

  const result = new Map<string, ResolvedUser>();

  for (const uid of userIds) {
    const profile = profileMap.get(uid);
    const talent  = talentMap.get(uid);
    const agency  = agencyMap.get(uid);
    const email   = emailMap.get(uid) ?? "";

    const rawRole = profile?.role ?? (agency ? "agency" : talent ? "talent" : "unknown");
    const role = (["agency", "talent", "admin"].includes(rawRole) ? rawRole : "unknown") as ResolvedUser["role"];

    let name: string;
    if (role === "agency") {
      name = agency?.company_name || profile?.full_name || email || "Agência sem nome";
    } else if (role === "talent") {
      name = talent?.full_name || profile?.full_name || email || "Talento sem nome";
    } else if (role === "admin") {
      name = profile?.full_name || email || "Admin";
    } else {
      name = profile?.full_name || agency?.company_name || talent?.full_name || email || "Usuário removido";
    }

    const roleLabel = (
      role === "agency" ? "Agência" :
      role === "talent" ? "Talento" :
      role === "admin"  ? "Admin"   : "Usuário"
    ) as ResolvedUser["roleLabel"];

    result.set(uid, {
      id: uid,
      name,
      email,
      role,
      roleLabel,
      avatarUrl: agency?.avatar_url ?? talent?.avatar_url ?? null,
    });
  }

  return result;
}
