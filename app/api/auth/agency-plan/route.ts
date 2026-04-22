import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";

export async function POST(req: NextRequest) {
  const { user_id, plan } = await req.json();

  if (!user_id || !plan) {
    return NextResponse.json({ error: "Missing user_id or plan" }, { status: 400 });
  }

  // Legacy signup helper: only initialize agencies on the free plan.
  // Paid plan activation must go through billing/payment routes.
  if (plan !== "free") {
    return NextResponse.json({ error: "Paid plan activation must go through billing" }, { status: 403 });
  }

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user_id !== user.id) {
    return NextResponse.json({ error: "Cannot initialize another agency plan" }, { status: 403 });
  }

  const supabase = createServerClient({ useServiceRole: true });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, plan")
    .eq("id", user_id)
    .single();

  if (profile?.role !== "agency") {
    return NextResponse.json({ error: "Agency profile required" }, { status: 403 });
  }

  if (profile.plan && profile.plan !== "free") {
    return NextResponse.json({ error: "Existing paid plan cannot be changed here" }, { status: 409 });
  }

  // Attempt full update; fall back to plan-only if extra columns not in schema cache
  const { error: fullError } = await supabase
    .from("profiles")
    .update({ plan: "free", plan_status: "inactive", plan_expires_at: null })
    .eq("id", user_id);

  if (fullError) {
    console.warn("[agency-plan] full update failed, falling back to plan-only:", fullError.message);
    const { error: fallbackError } = await supabase
      .from("profiles")
      .update({ plan })
      .eq("id", user_id);
    if (fallbackError) {
      console.error("[agency-plan/route] update failed:", fallbackError.message);
      return NextResponse.json({ error: fallbackError.message }, { status: 400 });
    }
  }

  // Mirror to agencies.subscription_status for legacy compat
  await supabase
    .from("agencies")
    .update({ subscription_status: "inactive" })
    .eq("id", user_id);

  return NextResponse.json({ ok: true, plan: "free", price: 0 }, { status: 201 });
}
