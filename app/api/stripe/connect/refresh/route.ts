import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase.server";
import { createServerClient } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";
import { getStripeConnectStatusForUser } from "@/lib/stripeConnect";

export const runtime = "nodejs";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function GET() {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/", APP_URL));
  }

  const supabase = createServerClient({ useServiceRole: true });
  const status = await getStripeConnectStatusForUser(supabase, user.id);
  if (!status) return NextResponse.redirect(new URL("/", APP_URL));

  const accountId = status.stripe_account_id;
  if (!accountId) {
    console.warn("[stripe] refresh called but no account_id", { userId: user.id, role: status.role });
    return NextResponse.redirect(new URL(status.finances_path, APP_URL));
  }

  const accountLink = await getStripe().accountLinks.create({
    account: accountId,
    refresh_url: `${APP_URL}/api/stripe/connect/refresh`,
    return_url: `${APP_URL}/api/stripe/connect/return`,
    type: "account_onboarding",
  });

  console.log("[stripe] refreshing onboarding link", { accountId, role: status.role, userId: user.id });

  return NextResponse.redirect(accountLink.url);
}
