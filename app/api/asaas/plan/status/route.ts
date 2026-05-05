import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase.server";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient({ useServiceRole: true });

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, plan_status")
    .eq("id", user.id)
    .single();

  const plan       = (profile?.plan as string | null) ?? null;
  const planStatus = (profile?.plan_status as string | null) ?? null;

  if ((plan === "pro" || plan === "premium") && planStatus === "active") {
    return NextResponse.json({ paid: true, plan });
  }

  // Secondary check: a paid plan_charge row (webhook may lag behind plan_status update)
  const { data: charge } = await supabase
    .from("wallet_transactions")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "plan_charge")
    .eq("status", "paid")
    .limit(1)
    .maybeSingle();

  if (charge) {
    return NextResponse.json({ paid: true, plan: plan ?? "pro" });
  }

  return NextResponse.json({ paid: false });
}
