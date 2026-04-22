import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase.server";
import { createServerClient } from "@/lib/supabase";
import { resolvePlanInfo } from "@/lib/plans";

function buildResponse(plan: string, planStatus: string, planExpiresAt: string | null) {
  const planInfo = resolvePlanInfo({ plan, plan_status: planStatus, plan_expires_at: planExpiresAt });
  return {
    plan:               planInfo.plan,
    plan_label:         planInfo.planLabel,
    plan_status:        planStatus,
    plan_expires_at:    planExpiresAt,
    is_pro:             planInfo.isPaid,
    is_premium:         planInfo.plan === "premium",
    is_active:          true,
    is_unlimited:       planInfo.isUnlimited,
    max_active_jobs:    planInfo.maxActiveJobs,
    max_hires_per_job:  planInfo.maxHiresPerJob,
    commission_rate:    planInfo.commissionRate,
    commission_label:   planInfo.commissionLabel,
    talent_share_label: planInfo.talentShareLabel,
    private_environment: planInfo.privateEnvironment,
  };
}

export async function GET() {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const supabase = createServerClient({ useServiceRole: true });

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan       = profile?.plan ?? "free";
  const planStatus = plan === "free" ? "free" : "active";

  console.log("[plan] current_user_plan", {
    userId: user.id,
    plan,
    planStatus,
    commissionLabel: resolvePlanInfo({ plan }).commissionLabel,
  });

  return NextResponse.json(buildResponse(plan, planStatus, null));
}

export async function PATCH() {
  return NextResponse.json(
    { error: "Plan changes must go through billing checkout" },
    { status: 405 }
  );
}
