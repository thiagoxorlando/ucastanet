import type { Metadata } from "next";
import { createSessionClient } from "@/lib/supabase.server";
import { createServerClient } from "@/lib/supabase";
import BillingDashboard from "@/features/agency/BillingDashboard";

export const metadata: Metadata = { title: "Assinatura — BrisaHub" };

export default async function BillingPage() {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  const userId = user?.id ?? "";

  const supabase = createServerClient({ useServiceRole: true });

  const [
    { data: profile, error: profileError },
    { data: stripeProfile, error: stripeProfileError },
    { data: transactions },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan, plan_status, plan_expires_at")
      .eq("id", userId)
      .maybeSingle(),

    supabase
      .from("profiles")
      .select("stripe_customer_id, stripe_subscription_id, stripe_subscription_status")
      .eq("id", userId)
      .maybeSingle(),

    supabase
      .from("wallet_transactions")
      .select("id, type, amount, description, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (profileError) {
    console.error("[agency billing] failed to load core profile", {
      userId,
      error: profileError.message,
    });
  }

  if (stripeProfileError) {
    console.warn("[agency billing] failed to load stripe profile fields", {
      userId,
      error: stripeProfileError.message,
    });
  }

  return (
    <BillingDashboard
      plan={profile?.plan ?? "free"}
      planStatus={profile?.plan_status ?? null}
      planExpiresAt={profile?.plan_expires_at ?? null}
      stripeCustomerId={stripeProfile?.stripe_customer_id ?? null}
      stripeSubscriptionId={stripeProfile?.stripe_subscription_id ?? null}
      stripeSubscriptionStatus={stripeProfile?.stripe_subscription_status ?? null}
      transactions={transactions ?? []}
    />
  );
}
