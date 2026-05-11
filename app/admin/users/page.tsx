import type { Metadata } from "next";
import AdminUsers from "@/features/admin/AdminUsers";
import { createServerClient } from "@/lib/supabase";

export const metadata: Metadata = { title: "Administração — Usuários — BrisaHub" };

export default async function AdminUsersPage() {
  const supabase = createServerClient({ useServiceRole: true });

  const [
    { data: { users: authUsers } },
    { data: profiles },
    { data: talentProfiles },
    { data: agencies },
    { data: paidContracts },
    { data: frozenProfiles },
    { data: openJobsData },
  ] = await Promise.all([
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    // Only active (non-frozen, non-deleted) profiles
    supabase.from("profiles")
      .select("id, role, full_name, wallet_balance")
      .is("deleted_at", null)
      .or("is_frozen.is.null,is_frozen.eq.false"),
    supabase.from("talent_profiles").select("id, user_id, full_name, avatar_url, deleted_at").is("deleted_at", null),
    supabase.from("agencies").select("id, user_id, company_name, avatar_url, deleted_at").is("deleted_at", null),
    supabase.from("contracts").select("talent_id, agency_id, commission_amount, payment_amount").eq("status", "paid"),
    supabase.from("profiles").select("id, is_frozen"),
    supabase.from("jobs").select("agency_id").eq("status", "open").is("deleted_at", null),
  ]);

  const planMap = new Map<string, string>();
  try {
    const { data: planProfiles } = await supabase.from("profiles").select("id, plan");
    for (const profile of planProfiles ?? []) {
      planMap.set(profile.id, (profile as { plan?: string | null }).plan ?? "free");
    }
  } catch {
    // Ignore environments where the plan column is still missing.
  }

  const openJobCountMap = new Map<string, number>();
  for (const job of (openJobsData ?? []) as Array<{ agency_id?: string | null }>) {
    if (job.agency_id) {
      openJobCountMap.set(job.agency_id, (openJobCountMap.get(job.agency_id) ?? 0) + 1);
    }
  }

  const roleMap = new Map<string, string>();
  const profileMap = new Map<string, string>();
  const frozenMap = new Map<string, boolean>();
  const walletMap = new Map<string, number>();
  const talentMap  = new Map<string, string>();
  const agencyMap  = new Map<string, string>();
  const avatarMap  = new Map<string, string | null>();
  const activeProfileIds = new Set<string>();

  for (const profile of profiles ?? []) {
    activeProfileIds.add(profile.id);
    roleMap.set(profile.id, profile.role ?? "");
    if (profile.full_name) profileMap.set(profile.id, profile.full_name);
    walletMap.set(profile.id, Number((profile as { wallet_balance?: number | null }).wallet_balance ?? 0));
  }

  for (const profile of frozenProfiles ?? []) {
    frozenMap.set(profile.id, (profile as { is_frozen?: boolean }).is_frozen ?? false);
  }

  for (const talent of (talentProfiles ?? []) as Array<{ id: string; user_id?: string | null; full_name?: string | null; avatar_url?: string | null; deleted_at?: string | null }>) {
    if (talent.deleted_at) continue;
    const ownerId = talent.user_id ?? talent.id;
    if (!ownerId || !activeProfileIds.has(ownerId)) continue;
    talentMap.set(ownerId, talent.full_name ?? "");
    if (talent.avatar_url) avatarMap.set(ownerId, talent.avatar_url);
  }

  for (const agency of (agencies ?? []) as Array<{ id: string; user_id?: string | null; company_name?: string | null; avatar_url?: string | null; deleted_at?: string | null }>) {
    if (agency.deleted_at) continue;
    const ownerId = agency.user_id ?? agency.id;
    if (!ownerId || !activeProfileIds.has(ownerId)) continue;
    agencyMap.set(ownerId, agency.company_name ?? "");
    if (agency.avatar_url) avatarMap.set(ownerId, agency.avatar_url);
  }

  const commissionMap = new Map<string, number>();
  const spentMap = new Map<string, number>();

  for (const contract of (paidContracts ?? []) as Array<{ talent_id?: string | null; agency_id?: string | null; commission_amount?: number | null; payment_amount?: number | null }>) {
    if (contract.talent_id) {
      const commission = Number(contract.commission_amount ?? 0);
      commissionMap.set(contract.talent_id, (commissionMap.get(contract.talent_id) ?? 0) + commission);
    }
    if (contract.agency_id) {
      const amount = Number(contract.payment_amount ?? 0);
      spentMap.set(contract.agency_id, (spentMap.get(contract.agency_id) ?? 0) + amount);
    }
  }

  const users = (authUsers ?? [])
    .filter((user) => activeProfileIds.has(user.id))
    .map((user) => {
    const role = roleMap.get(user.id) ?? "";
    const name =
      role === "agency"
        ? agencyMap.get(user.id) || talentMap.get(user.id) || profileMap.get(user.id) || ""
        : role === "admin"
          ? profileMap.get(user.id) || ""
          : talentMap.get(user.id) || "";

    return {
      id: user.id,
      email: user.email ?? "",
      name,
      role,
      isFrozen: frozenMap.get(user.id) ?? false,
      created_at: user.created_at ?? "",
      commissionGenerated: commissionMap.get(user.id) ?? 0,
      totalSpent: spentMap.get(user.id) ?? 0,
      walletBalance: walletMap.get(user.id) ?? 0,
      openJobCount: openJobCountMap.get(user.id) ?? 0,
      plan:      planMap.get(user.id) ?? null,
      avatarUrl: avatarMap.get(user.id) ?? null,
    };
    });

  return <AdminUsers users={users} />;
}
