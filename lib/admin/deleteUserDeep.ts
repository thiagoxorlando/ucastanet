import { createServerClient } from "@/lib/supabase";

const FINANCIAL_BLOCKED_MSG =
  "O usuário ainda possui saldo ou ações financeiras pendentes. Finalize as pendências antes de excluir.";

// Statuses that represent money at risk in bookings/contracts
const BOOKING_MONEY_STATUSES  = ["pending_payment", "confirmed", "awaiting_deposit", "awaiting_payment", "processing_payment"];
const CONTRACT_MONEY_STATUSES = ["signed", "awaiting_deposit", "awaiting_payment", "processing_payment"];

export type SafetyCheckResult =
  | { ok: false; reason: string }
  | { ok: true; hasOpenJobs: boolean; openJobIds: string[] };

async function checkDeletionSafety(userId: string): Promise<SafetyCheckResult> {
  const supabase = createServerClient({ useServiceRole: true });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, wallet_balance")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return { ok: true, hasOpenJobs: false, openJobIds: [] };

  // 1. Wallet balance
  const balance = Number(profile.wallet_balance ?? 0);
  if (balance > 0) {
    return { ok: false, reason: `${FINANCIAL_BLOCKED_MSG} (saldo em carteira: R$ ${balance.toFixed(2)})` };
  }

  // 2. Pending / processing withdrawals
  const { count: pendingWithdrawals } = await supabase
    .from("wallet_transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", "withdrawal")
    .in("status", ["pending", "processing"]);

  if ((pendingWithdrawals ?? 0) > 0) {
    return { ok: false, reason: `${FINANCIAL_BLOCKED_MSG} (saque pendente)` };
  }

  const role = typeof profile.role === "string" ? profile.role : null;

  if (role === "agency") {
    const [
      { count: bookingsWithMoney },
      { count: contractsWithMoney },
      { data: openJobRows },
    ] = await Promise.all([
      // Bookings with actual money at risk (NOT just "pending" status with no payment)
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("agency_id", userId)
        .in("status", BOOKING_MONEY_STATUSES)
        .is("deleted_at", null),
      // Contracts with money at risk
      supabase
        .from("contracts")
        .select("id", { count: "exact", head: true })
        .eq("agency_id", userId)
        .in("status", CONTRACT_MONEY_STATUSES)
        .is("deleted_at", null),
      // Open jobs — NOT a financial blocker, but we need them to soft-delete
      supabase
        .from("jobs")
        .select("id")
        .eq("agency_id", userId)
        .eq("status", "open")
        .is("deleted_at", null),
    ]);

    if ((bookingsWithMoney ?? 0) > 0) {
      return { ok: false, reason: `${FINANCIAL_BLOCKED_MSG} (reserva com pagamento pendente)` };
    }
    if ((contractsWithMoney ?? 0) > 0) {
      return { ok: false, reason: `${FINANCIAL_BLOCKED_MSG} (contrato com pagamento pendente)` };
    }

    const openJobIds = (openJobRows ?? []).map((r) => r.id as string);
    return { ok: true, hasOpenJobs: openJobIds.length > 0, openJobIds };
  }

  if (role === "talent") {
    const [{ count: pendingBookings }, { count: pendingContracts }] = await Promise.all([
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("talent_user_id", userId)
        .in("status", ["pending", "pending_payment", "confirmed"])
        .is("deleted_at", null),
      supabase
        .from("contracts")
        .select("id", { count: "exact", head: true })
        .eq("talent_id", userId)
        .in("status", CONTRACT_MONEY_STATUSES)
        .is("deleted_at", null),
    ]);

    if ((pendingBookings ?? 0) > 0) {
      return { ok: false, reason: `${FINANCIAL_BLOCKED_MSG} (reserva pendente)` };
    }
    if ((pendingContracts ?? 0) > 0) {
      return { ok: false, reason: `${FINANCIAL_BLOCKED_MSG} (contrato com pagamento pendente)` };
    }
  }

  return { ok: true, hasOpenJobs: false, openJobIds: [] };
}

export async function ensureUserDeletionFinancialSafety(userId: string): Promise<{ hasOpenJobs: boolean; openJobIds: string[] }> {
  const result = await checkDeletionSafety(userId);
  if (!result.ok) throw new Error(result.reason);
  return { hasOpenJobs: result.hasOpenJobs, openJobIds: result.openJobIds };
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

  const safety = await checkDeletionSafety(userId);
  if (!safety.ok) throw new Error(safety.reason);

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
