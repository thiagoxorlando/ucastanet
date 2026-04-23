import type { Metadata } from "next";
import AdminUsers from "@/features/admin/AdminUsers";
import { calculateCommission, calculateNetAmount, parsePlan } from "@/lib/plans";
import { createServerClient } from "@/lib/supabase";

export const metadata: Metadata = { title: "Administração — Usuários — BrisaHub" };

export default async function AdminUsersPage() {
  const supabase = createServerClient({ useServiceRole: true });

  const [
    { data: { users: authUsers } },
    { data: profiles },
    { data: talentProfiles },
    { data: agencies },
    { data: bookingsData },
    { data: frozenProfiles },
  ] = await Promise.all([
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from("profiles").select("id, role, full_name, wallet_balance"),
    supabase.from("talent_profiles").select("id, full_name").is("deleted_at", null),
    supabase.from("agencies").select("id, company_name").is("deleted_at", null),
    supabase.from("bookings").select("talent_user_id, agency_id, price, status"),
    supabase.from("profiles").select("id, is_frozen"),
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

  const roleMap = new Map<string, string>();
  const profileMap = new Map<string, string>();
  const frozenMap = new Map<string, boolean>();
  const walletMap = new Map<string, number>();
  const talentMap = new Map<string, string>();
  const agencyMap = new Map<string, string>();

  for (const profile of profiles ?? []) {
    roleMap.set(profile.id, profile.role ?? "");
    if (profile.full_name) profileMap.set(profile.id, profile.full_name);
    walletMap.set(profile.id, Number((profile as { wallet_balance?: number | null }).wallet_balance ?? 0));
  }

  for (const profile of frozenProfiles ?? []) {
    frozenMap.set(profile.id, (profile as { is_frozen?: boolean }).is_frozen ?? false);
  }

  for (const talent of talentProfiles ?? []) {
    talentMap.set(talent.id, talent.full_name ?? "");
  }

  for (const agency of agencies ?? []) {
    agencyMap.set(agency.id, agency.company_name ?? "");
  }

  const earnedMap = new Map<string, number>();
  const spentMap = new Map<string, number>();
  const commissionMap = new Map<string, number>();

  for (const booking of bookingsData ?? []) {
    const price = booking.price ?? 0;
    const isConfirmed = booking.status === "confirmed" || booking.status === "paid";

    if (!isConfirmed || price <= 0) continue;

    const agencyPlan = parsePlan(booking.agency_id ? planMap.get(booking.agency_id) : "free");
    const commission = calculateCommission(price, agencyPlan);
    const netAmount = calculateNetAmount(price, agencyPlan);

    if (booking.talent_user_id) {
      earnedMap.set(booking.talent_user_id, (earnedMap.get(booking.talent_user_id) ?? 0) + netAmount);
      commissionMap.set(booking.talent_user_id, (commissionMap.get(booking.talent_user_id) ?? 0) + commission);
    }

    if (booking.agency_id) {
      spentMap.set(booking.agency_id, (spentMap.get(booking.agency_id) ?? 0) + price);
      commissionMap.set(booking.agency_id, (commissionMap.get(booking.agency_id) ?? 0) + commission);
    }
  }

  const users = (authUsers ?? []).map((user) => {
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
      totalEarned: earnedMap.get(user.id) ?? 0,
      totalSpent: spentMap.get(user.id) ?? 0,
      commissionGenerated: commissionMap.get(user.id) ?? 0,
      walletBalance: walletMap.get(user.id) ?? 0,
      plan: planMap.get(user.id) ?? null,
    };
  });

  return <AdminUsers users={users} />;
}
