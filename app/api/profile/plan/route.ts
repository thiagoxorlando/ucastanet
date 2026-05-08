import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase.server";
import { createServerClient } from "@/lib/supabase";
import { resolvePlanInfo, type Plan } from "@/lib/plans";
import { getLivePlanSetting } from "@/lib/planSettings.server";

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

  const plan       = (profile?.plan ?? "free") as Plan;
  const planStatus = plan === "free" ? "free" : "active";

  const [planInfo, liveSetting] = await Promise.all([
    Promise.resolve(resolvePlanInfo({ plan })),
    getLivePlanSetting(plan),
  ]);

  console.log("[plan] current_user_plan", {
    userId: user.id,
    plan,
    planStatus,
    commissionRate: liveSetting.commission_rate,
  });

  return NextResponse.json({
    plan,
    plan_label:          planInfo.planLabel,
    plan_status:         planStatus,
    plan_expires_at:     null,
    is_pro:              planInfo.isPaid,
    is_premium:          plan === "premium",
    is_active:           true,
    is_unlimited:        liveSetting.job_limit === null,
    max_active_jobs:     liveSetting.job_limit,
    max_hires_per_job:   liveSetting.max_hires_per_job ?? planInfo.maxHiresPerJob,
    commission_rate:     liveSetting.commission_rate,
    commission_label:    `${liveSetting.commission_percent.toFixed(0)}%`,
    talent_share_label:  planInfo.talentShareLabel,
    private_environment: planInfo.privateEnvironment,
  });
}

export async function PATCH() {
  return NextResponse.json(
    { error: "Plan changes must go through billing checkout" },
    { status: 405 }
  );
}
