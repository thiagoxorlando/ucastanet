import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase.server";
import { createServerClient } from "@/lib/supabase";
import { getStripeConnectStatusForUser } from "@/lib/stripeConnect";

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

  console.log("[stripe] user returned from Connect onboarding", { userId: user.id, role: status.role });

  return NextResponse.redirect(new URL(`${status.finances_path}?stripe=return`, APP_URL));
}
