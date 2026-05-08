import { createServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { resolvePlanInfo, type Plan } from "@/lib/plans";
import { getLivePlanSetting } from "@/lib/planSettings.server";

/**
 * Returns null if the agency has an active paid plan (pro or premium).
 * Returns a 403 NextResponse otherwise.
 *
 * Reads only profiles.plan — the single reliable column. plan_status and
 * plan_expires_at are omitted because they may not be in the PostgREST
 * schema cache and selecting them nulls the entire row.
 */
export async function requireActiveSubscription(agencyId: string): Promise<NextResponse | null> {
  if (!agencyId) return null;

  const supabase = createServerClient({ useServiceRole: true });

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", agencyId)
    .single();

  // Any non-free plan is considered active (admin grants, paid subscriptions)
  if (profile?.plan && profile.plan !== "free") return null;

  // Legacy fallback: agencies.subscription_status = 'active'
  const { data: agency } = await supabase
    .from("agencies")
    .select("subscription_status")
    .eq("id", agencyId)
    .single();

  if (agency?.subscription_status === "active") return null;

  return NextResponse.json(
    { error: "Assinatura inativa. Reative seu plano para realizar esta ação." },
    { status: 403 }
  );
}

// ── Plan-tier limits ──────────────────────────────────────────────────────────

/**
 * Returns null if the agency may create another job.
 * Reads job_limit from plan_settings (source of truth). null = unlimited.
 */
export async function requireJobLimit(agencyId: string): Promise<NextResponse | null> {
  if (!agencyId) return null;

  const supabase = createServerClient({ useServiceRole: true });

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", agencyId)
    .single();

  const plan = (profile?.plan ?? "free") as Plan;

  // Live plan_settings is the source of truth; null job_limit = unlimited
  const liveSetting = await getLivePlanSetting(plan);
  const jobLimit = liveSetting.job_limit;
  if (jobLimit === null) return null;

  const { count } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", agencyId)
    .is("deleted_at", null);

  console.log("[plan] job_limit_check", {
    agencyId,
    plan,
    currentJobs: count ?? 0,
    jobLimit,
  });

  if ((count ?? 0) >= jobLimit) {
    return NextResponse.json(
      {
        error: "plan_limit",
        message: `O plano Free permite ${jobLimit} vaga${jobLimit > 1 ? "s" : ""}. Faça upgrade para publicar mais vagas.`,
        limit: jobLimit,
        resource: "jobs",
        plan,
      },
      { status: 402 }
    );
  }

  return null;
}

/**
 * Returns null if the agency may hire another person for a job.
 * Returns a 402 NextResponse with error="plan_limit" if they're on FREE
 * and already have 3 hires for this job.
 */
export async function requireHireLimit(agencyId: string, jobId: string | null): Promise<NextResponse | null> {
  if (!agencyId || !jobId) return null;

  const supabase = createServerClient({ useServiceRole: true });

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", agencyId)
    .single();

  const plan = profile?.plan ?? "free";
  const liveSetting = await getLivePlanSetting(plan as Plan);

  // Use live job_limit as proxy for hire limits (null = unlimited)
  // Hire limit is not stored in plan_settings yet; keep using PLAN_DEFINITIONS for this one
  const { getPlanDefinition } = await import("@/lib/plans");
  const planDefinition = getPlanDefinition(plan);
  if (planDefinition.maxHiresPerJob === null) return null;

  const { count } = await supabase
    .from("contracts")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", agencyId)
    .eq("job_id", jobId)
    .not("status", "in", '("cancelled","rejected")')
    .is("deleted_at", null);

  console.log("[plan] hire_limit_check", {
    agencyId,
    jobId,
    plan,
    currentHires: count ?? 0,
    maxHiresPerJob: planDefinition.maxHiresPerJob,
  });

  if ((count ?? 0) >= planDefinition.maxHiresPerJob) {
    return NextResponse.json(
      {
        error: "plan_limit",
        limit: planDefinition.maxHiresPerJob,
        resource: "hires",
        plan,
      },
      { status: 402 }
    );
  }

  return null;
}

/**
 * Returns the plan info for a given user (for UI display).
 */
export async function getPlanInfo(userId: string) {
  const supabase = createServerClient({ useServiceRole: true });

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, wallet_balance")
    .eq("id", userId)
    .single();

  const plan = (profile?.plan ?? "free") as Plan;
  const planInfo = resolvePlanInfo({ plan });
  const liveSetting = await getLivePlanSetting(plan);

  return {
    plan:               planInfo.plan,
    planLabel:          planInfo.planLabel,
    planStatus:         plan === "free" ? "inactive" : "active",
    planExpiresAt:      null,
    walletBalance:      Number(profile?.wallet_balance ?? 0),
    isActive:           planInfo.isPaid,
    isUnlimited:        liveSetting.job_limit === null,
    maxActiveJobs:      liveSetting.job_limit,
    maxHiresPerJob:     planInfo.maxHiresPerJob,
    commissionRate:     liveSetting.commission_rate,
    commissionLabel:    `${liveSetting.commission_percent.toFixed(0)}%`,
    talentShareLabel:   planInfo.talentShareLabel,
    privateEnvironment: planInfo.privateEnvironment,
  };
}
