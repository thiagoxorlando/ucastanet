import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerClient({ useServiceRole: true });
  const { data, error } = await supabase
    .from("plan_settings")
    .select("plan_key, name, price, commission_percent, is_available, job_limit")
    .order("plan_key");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

const VALID_PLAN_KEYS = ["free", "pro", "premium"] as const;

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null) as unknown;
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be an array of plan settings." }, { status: 400 });
  }

  const supabase = createServerClient({ useServiceRole: true });

  for (const setting of body as Record<string, unknown>[]) {
    const planKey = setting.plan_key as string;
    if (!VALID_PLAN_KEYS.includes(planKey as (typeof VALID_PLAN_KEYS)[number])) {
      return NextResponse.json({ error: `Invalid plan_key: ${planKey}` }, { status: 400 });
    }

    const price = Number(setting.price);
    const commission = Number(setting.commission_percent);

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "price must be a non-negative number." }, { status: 400 });
    }
    if (!Number.isFinite(commission) || commission < 0 || commission > 100) {
      return NextResponse.json({ error: "commission_percent must be between 0 and 100." }, { status: 400 });
    }

    const jobLimitRaw = setting.job_limit;
    const jobLimit =
      jobLimitRaw === null || jobLimitRaw === undefined || jobLimitRaw === ""
        ? null
        : Number(jobLimitRaw);

    const { error } = await supabase
      .from("plan_settings")
      .update({
        name: String(setting.name ?? planKey),
        price,
        commission_percent: commission,
        is_available: Boolean(setting.is_available),
        job_limit: jobLimit,
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq("plan_key", planKey);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
