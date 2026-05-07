import { createServerClient } from "@/lib/supabase";

const BLOCKED_MSG =
  "O usuário ainda possui saldo ou ações financeiras pendentes. Finalize as pendências antes de excluir.";

async function assertDeletionFinancialSafety(userId: string) {
  const supabase = createServerClient({ useServiceRole: true });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, wallet_balance")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return;

  const balance = Number(profile.wallet_balance ?? 0);
  if (balance > 0) {
    throw new Error(BLOCKED_MSG);
  }

  const { count: pendingWithdrawals } = await supabase
    .from("wallet_transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", "withdrawal")
    .in("status", ["pending", "processing"]);

  if ((pendingWithdrawals ?? 0) > 0) {
    throw new Error(BLOCKED_MSG);
  }

  const role = typeof profile.role === "string" ? profile.role : null;

  if (role === "agency") {
    const [{ count: openJobs }, { count: pendingBookings }, { count: pendingContracts }] = await Promise.all([
      supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("agency_id", userId)
        .eq("status", "open")
        .is("deleted_at", null),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("agency_id", userId)
        .in("status", ["pending", "pending_payment"])
        .is("deleted_at", null),
      supabase
        .from("contracts")
        .select("id", { count: "exact", head: true })
        .eq("agency_id", userId)
        .in("status", ["sent", "signed"])
        .is("deleted_at", null),
    ]);

    if ((openJobs ?? 0) > 0 || (pendingBookings ?? 0) > 0 || (pendingContracts ?? 0) > 0) {
      throw new Error(BLOCKED_MSG);
    }
  } else if (role === "talent") {
    const [{ count: pendingBookings }, { count: pendingContracts }] = await Promise.all([
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("talent_user_id", userId)
        .in("status", ["pending", "pending_payment"])
        .is("deleted_at", null),
      supabase
        .from("contracts")
        .select("id", { count: "exact", head: true })
        .eq("talent_id", userId)
        .in("status", ["sent", "signed"])
        .is("deleted_at", null),
    ]);

    if ((pendingBookings ?? 0) > 0 || (pendingContracts ?? 0) > 0) {
      throw new Error(BLOCKED_MSG);
    }
  }
}

export async function ensureUserDeletionFinancialSafety(userId: string) {
  await assertDeletionFinancialSafety(userId);
}

/**
 * Finalizes account deletion without erasing financial history.
 *
 * Keeps the frozen profile/auth identity so wallet_transactions and audit
 * records remain valid, while removing role rows and unlinking other records.
 */
export async function deleteUserDeep(userId: string): Promise<void> {
  const supabase = createServerClient({ useServiceRole: true });
  const now = new Date().toISOString();

  await assertDeletionFinancialSafety(userId);

  const candidateIds = new Set<string>([userId]);

  const [{ data: agencyRows }, { data: talentRows }] = await Promise.all([
    supabase.from("agencies").select("id, user_id").or(`id.eq.${userId},user_id.eq.${userId}`),
    supabase.from("talent_profiles").select("id, user_id").or(`id.eq.${userId},user_id.eq.${userId}`),
  ]);

  for (const row of agencyRows ?? []) {
    if (row.id) candidateIds.add(row.id);
    const linkedUserId = (row as Record<string, unknown>).user_id;
    if (typeof linkedUserId === "string" && linkedUserId) {
      candidateIds.add(linkedUserId);
    }
  }

  for (const row of talentRows ?? []) {
    if (row.id) candidateIds.add(row.id);
    const linkedUserId = (row as Record<string, unknown>).user_id;
    if (typeof linkedUserId === "string" && linkedUserId) {
      candidateIds.add(linkedUserId);
    }
  }

  const ids = [...candidateIds];

  const { data: jobRows } = await supabase.from("jobs").select("id").in("agency_id", ids);
  const jobIds = (jobRows ?? []).map((job) => job.id);

  await supabase.from("payments").update({ agency_id: null }).in("agency_id", ids);

  await supabase.from("notifications").delete().in("user_id", ids);

  await supabase.from("submissions").delete().in("talent_user_id", ids);
  if (jobIds.length > 0) {
    await supabase.from("submissions").delete().in("job_id", jobIds);
  }

  await supabase.from("bookings").update({ deleted_at: now }).in("talent_user_id", ids);
  await supabase.from("bookings").update({ deleted_at: now }).in("agency_id", ids);
  if (jobIds.length > 0) {
    await supabase.from("bookings").update({ deleted_at: now }).in("job_id", jobIds);
  }

  await supabase.from("contracts").update({ deleted_at: now }).in("talent_id", ids).neq("status", "paid");
  await supabase.from("contracts").update({ deleted_at: now }).in("agency_id", ids).neq("status", "paid");
  if (jobIds.length > 0) {
    await supabase.from("contracts").update({ deleted_at: now }).in("job_id", jobIds).neq("status", "paid");
  }

  if (jobIds.length > 0) {
    await supabase.from("jobs").update({ deleted_at: now }).in("id", jobIds);
    await supabase.from("jobs").update({ agency_id: null }).in("id", jobIds);
  }

  await supabase.from("bookings").update({ agency_id: null }).in("agency_id", ids);
  await supabase.from("bookings").update({ talent_user_id: null }).in("talent_user_id", ids);
  await supabase.from("contracts").update({ agency_id: null }).in("agency_id", ids);
  await supabase.from("contracts").update({ talent_id: null }).in("talent_id", ids);

  await supabase.from("talent_profiles").delete().in("id", ids);
  await supabase.from("agencies").delete().in("id", ids);
  await supabase.from("talent_profiles").delete().in("user_id", ids);
  await supabase.from("agencies").delete().in("user_id", ids);

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ is_frozen: true, deleted_at: now } as Record<string, unknown>)
    .in("id", ids);

  if (profileErr) {
    throw new Error(`Não foi possível desativar o perfil: ${profileErr.message}`);
  }

  for (const id of ids) {
    const { error: signOutErr } = await supabase.auth.admin.signOut(id, "others");
    if (signOutErr) {
      console.warn("[deleteUserDeep] auth signOut failed", { userId: id, error: signOutErr.message });
    }
  }
}
