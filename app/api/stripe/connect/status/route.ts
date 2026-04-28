import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase.server";
import { createServerClient } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";

export type StripeConnectStatus = "not_connected" | "incomplete" | "active";

// GET /api/stripe/connect/status
// Returns the talent's Stripe Connect onboarding status.
// Calls the Stripe API only when an account_id is already stored.
export async function GET(_req: NextRequest) {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient({ useServiceRole: true });

  const { data: talentRow } = await supabase
    .from("talent_profiles")
    .select("stripe_account_id")
    .eq("id", user.id)
    .maybeSingle();

  const accountId = talentRow?.stripe_account_id ?? null;

  if (!accountId) {
    return NextResponse.json({ status: "not_connected" as StripeConnectStatus });
  }

  try {
    const account = await getStripe().accounts.retrieve(accountId);
    console.log("[stripe] account status:", accountId, {
      details_submitted: account.details_submitted,
      payouts_enabled:   account.payouts_enabled,
    });

    const isActive = account.details_submitted && account.payouts_enabled;
    const status: StripeConnectStatus = isActive ? "active" : "incomplete";
    return NextResponse.json({ status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[stripe] failed to retrieve account:", accountId, msg);
    // Treat as incomplete so the UI shows a retry option rather than crashing.
    return NextResponse.json({ status: "incomplete" as StripeConnectStatus });
  }
}
