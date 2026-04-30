import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase.server";
import { createServerClient } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";
import { getStripeConnectStatusForUser, syncStripeConnectAccountStatus } from "@/lib/stripeConnect";

export const runtime = "nodejs";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function POST() {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient({ useServiceRole: true });
  const status = await getStripeConnectStatusForUser(supabase, user.id);
  if (!status) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let accountId = status.stripe_account_id;
  const tableName = status.role === "agency" ? "agencies" : "talent_profiles";

  if (!accountId) {
    const account = await getStripe().accounts.create({
      type: "express",
      country: "BR",
      capabilities: {
        transfers:     { requested: true },
        card_payments: { requested: true },
      },
    });

    accountId = account.id;
    await syncStripeConnectAccountStatus(supabase, account);

    const { error: updateErr } = await supabase
      .from(tableName)
      .update({ stripe_account_id: accountId })
      .eq("id", user.id);

    if (updateErr) {
      console.error("[stripe connect create] failed to save stripe_account_id:", {
        userId: user.id,
        role: status.role,
        error: updateErr.message,
      });
      return NextResponse.json({ error: "Erro ao salvar conta Stripe." }, { status: 500 });
    }
  }

  const returnPath = status.finances_path;
  const accountLink = await getStripe().accountLinks.create({
    account:     accountId,
    refresh_url: `${APP_URL}/api/stripe/connect/refresh`,
    return_url:  `${APP_URL}/api/stripe/connect/return`,
    type:        "account_onboarding",
  });

  console.log("[stripe onboarding link] created", {
    accountId,
    userId: user.id,
    role: status.role,
    returnPath,
  });

  return NextResponse.json({ url: accountLink.url });
}
