import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/requireAdmin";
import { logAdminAction } from "@/lib/auditLog";
import { ensurePremiumWorkspaceForAgency } from "@/lib/premiumWorkspace.server";

const VALID_PLANS = ["free", "pro", "premium"] as const;
const VALID_ROLES = ["talent", "agency", "admin"] as const;

type Plan = typeof VALID_PLANS[number];
type Role = typeof VALID_ROLES[number];

// PATCH /api/admin/users/plan
// Body for plan change:  { user_id, plan, reason }   — requires non-empty reason
// Body for role change:  { user_id, role }            — no reason required
// Admin-only: bypasses Asaas/payment; sets plan or role directly.
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerClient({ useServiceRole: true });
  const body = (await req.json()) as {
    user_id: string;
    plan?: Plan;
    role?: Role;
    reason?: string;
  };
  const { user_id, plan, role, reason } = body;

  if (!user_id) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400 });
  }

  // ── Role change ─────────────────────────────────────────────────────────────
  if (role) {
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "invalid_role" }, { status: 400 });
    }

    const { error } = await supabase.from("profiles").update({ role }).eq("id", user_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (role === "agency") {
      await supabase.from("agencies").upsert({ id: user_id }, { onConflict: "id", ignoreDuplicates: true });
    }

    return NextResponse.json({ ok: true });
  }

  // ── Plan change ─────────────────────────────────────────────────────────────
  if (!plan) {
    return NextResponse.json({ error: "plan or role required" }, { status: 400 });
  }

  if (!VALID_PLANS.includes(plan)) {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }

  // Reason is mandatory for plan overrides
  if (!reason?.trim()) {
    return NextResponse.json({ error: "Motivo é obrigatório." }, { status: 400 });
  }

  // Verify target user exists and is an agency
  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("role, plan, plan_status")
    .eq("id", user_id)
    .maybeSingle();

  if (!targetProfile) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  if (targetProfile.role !== "agency") {
    return NextResponse.json(
      { error: "Alteração de plano disponível apenas para agências." },
      { status: 422 },
    );
  }

  // Verify the plan exists and is available in plan_settings
  const { data: planSetting, error: planSettingError } = await supabase
    .from("plan_settings")
    .select("name, is_available")
    .eq("plan_key", plan)
    .maybeSingle();

  if (planSettingError || !planSetting) {
    return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
  }

  if (!planSetting.is_available) {
    return NextResponse.json({ error: "Este plano ainda não está disponível." }, { status: 422 });
  }

  const oldPlan       = targetProfile.plan ?? "free";
  const oldPlanStatus = targetProfile.plan_status ?? "inactive";
  const newPlanStatus = plan === "free" ? "inactive" : "active";

  // Update profiles
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ plan, plan_status: newPlanStatus })
    .eq("id", user_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Keep agencies.subscription_status in sync (best-effort)
  await supabase
    .from("agencies")
    .update({ subscription_status: newPlanStatus })
    .eq("id", user_id);

  // Audit log — failures are swallowed internally by logAdminAction
  await logAdminAction({
    adminId:    auth.userId,
    action:     "admin_plan_override",
    entityType: "user",
    entityId:   user_id,
    before: { plan: oldPlan, plan_status: oldPlanStatus },
    after:  { plan,          plan_status: newPlanStatus },
    metadata: { reason: reason.trim(), plan_name: planSetting.name },
  });

  // For Premium: auto-create workspace if it doesn't exist yet.
  // Fire-and-forget — workspace creation failure must not block the plan update.
  if (plan === "premium") {
    ensurePremiumWorkspaceForAgency(user_id).catch((err: unknown) => {
      console.error("[admin/plan] Premium workspace auto-create failed:", err);
    });
  }

  return NextResponse.json({ ok: true });
}
