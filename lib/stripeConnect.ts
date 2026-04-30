import type Stripe from "stripe";
import { createServerClient } from "@/lib/supabase";

type Supabase = ReturnType<typeof createServerClient>;

export type StripeConnectRole = "agency" | "talent";

export type StripeConnectStatus = {
  role: StripeConnectRole;
  connected: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  transfers_active: boolean;
  stripe_account_id: string | null;
  pix_key_type: string | null;
  pix_key_value: string | null;
  pix_holder_name: string | null;
  display_name: string;
  finances_path: "/agency/finances" | "/talent/finances";
};

type StoredStripeConnectFields = {
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean | null;
  stripe_payouts_enabled: boolean | null;
  stripe_details_submitted: boolean | null;
  stripe_transfers_active: boolean | null;
  pix_key_type: string | null;
  pix_key_value: string | null;
  pix_holder_name: string | null;
  company_name?: string | null;
  full_name?: string | null;
};

export function isStripeConnectReady(status: Pick<StripeConnectStatus, "connected" | "payouts_enabled" | "details_submitted" | "transfers_active">) {
  return Boolean(status.connected && status.payouts_enabled && status.details_submitted && status.transfers_active);
}

export function hasManualPixFallback(status: Pick<StripeConnectStatus, "pix_key_value">) {
  return Boolean(status.pix_key_value?.trim());
}

export async function getStripeConnectStatusForUser(supabase: Supabase, userId: string): Promise<StripeConnectStatus | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  const role = profile?.role;
  if (role !== "agency" && role !== "talent") return null;

  if (role === "agency") {
    const { data: agency } = await supabase
      .from("agencies")
      .select("stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_details_submitted, stripe_transfers_active, pix_key_type, pix_key_value, pix_holder_name, company_name")
      .eq("id", userId)
      .maybeSingle();

    const row = (agency ?? null) as StoredStripeConnectFields | null;
    return {
      role,
      connected: Boolean(row?.stripe_account_id),
      charges_enabled: Boolean(row?.stripe_charges_enabled),
      payouts_enabled: Boolean(row?.stripe_payouts_enabled),
      details_submitted: Boolean(row?.stripe_details_submitted),
      transfers_active: Boolean(row?.stripe_transfers_active),
      stripe_account_id: row?.stripe_account_id ?? null,
      pix_key_type: row?.pix_key_type ?? null,
      pix_key_value: row?.pix_key_value ?? null,
      pix_holder_name: row?.pix_holder_name ?? null,
      display_name: row?.company_name ?? "Agencia",
      finances_path: "/agency/finances",
    };
  }

  const { data: talent } = await supabase
    .from("talent_profiles")
    .select("stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_details_submitted, stripe_transfers_active, pix_key_type, pix_key_value, pix_holder_name, full_name")
    .eq("id", userId)
    .maybeSingle();

  const row = (talent ?? null) as StoredStripeConnectFields | null;
  return {
    role,
    connected: Boolean(row?.stripe_account_id),
    charges_enabled: Boolean(row?.stripe_charges_enabled),
    payouts_enabled: Boolean(row?.stripe_payouts_enabled),
    details_submitted: Boolean(row?.stripe_details_submitted),
    transfers_active: Boolean(row?.stripe_transfers_active),
    stripe_account_id: row?.stripe_account_id ?? null,
    pix_key_type: row?.pix_key_type ?? null,
    pix_key_value: row?.pix_key_value ?? null,
    pix_holder_name: row?.pix_holder_name ?? null,
    display_name: row?.full_name ?? "Talento",
    finances_path: "/talent/finances",
  };
}

export async function syncStripeConnectAccountStatus(supabase: Supabase, account: Stripe.Account) {
  const payload = {
    stripe_charges_enabled: account.charges_enabled ?? false,
    stripe_payouts_enabled: account.payouts_enabled ?? false,
    stripe_details_submitted: account.details_submitted ?? false,
    stripe_transfers_active: account.capabilities?.transfers === "active",
    stripe_connect_updated_at: new Date().toISOString(),
  };

  const [agencyResult, talentResult] = await Promise.all([
    supabase.from("agencies").update(payload).eq("stripe_account_id", account.id),
    supabase.from("talent_profiles").update(payload).eq("stripe_account_id", account.id),
  ]);

  if (agencyResult.error) {
    console.error("[stripe connect] failed to sync agency account status", {
      accountId: account.id,
      error: agencyResult.error.message,
    });
  }

  if (talentResult.error) {
    console.error("[stripe connect] failed to sync talent account status", {
      accountId: account.id,
      error: talentResult.error.message,
    });
  }
}
