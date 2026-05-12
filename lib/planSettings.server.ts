/**
 * Server-side utility for reading live plan settings from plan_settings table.
 * Falls back to PLAN_DEFINITIONS values if the table is unavailable.
 * Import only in server components and route handlers.
 */
import { createServerClient } from "@/lib/supabase";
import { PLAN_KEYS, type Plan } from "@/lib/plans";
import { buildPlanSettingsFallback, type PublicPlanSetting } from "@/lib/planSettings.shared";

export type LivePlanSetting = PublicPlanSetting;

export async function getLivePlanSettings(): Promise<Record<Plan, LivePlanSetting>> {
  const supabase = createServerClient({ useServiceRole: true });

  // Base query — columns that have existed since the table was created.
  let { data, error } = await supabase
    .from("plan_settings")
    .select("plan_key, name, price, commission_percent, is_available, job_limit");

  if (error) {
    console.error("[planSettings.server] Failed to load plan_settings, using hardcoded fallback:", error);
    return buildPlanSettingsFallback();
  }

  const result = buildPlanSettingsFallback();

  for (const row of data ?? []) {
    const key = row.plan_key as Plan;
    if (!PLAN_KEYS.includes(key)) continue;
    const commissionPercent = Number(row.commission_percent);
    result[key] = {
      ...result[key],
      plan_key: key,
      name: String(row.name ?? key),
      price: Number(row.price),
      commission_percent: commissionPercent,
      commission_rate: commissionPercent / 100,
      is_available: Boolean(row.is_available),
      job_limit: row.job_limit ?? null,
      included_agent_seats: result[key].included_agent_seats,
      extra_agent_seat_price: result[key].extra_agent_seat_price,
    };
  }

  // max_hires_per_job was added later — fetch separately so the column missing
  // doesn't collapse the entire settings into fallback.
  try {
    const { data: hiresData } = await supabase
      .from("plan_settings")
      .select("plan_key, max_hires_per_job");

    for (const row of hiresData ?? []) {
      const key = row.plan_key as Plan;
      if (!PLAN_KEYS.includes(key)) continue;
      result[key].max_hires_per_job = (row as { max_hires_per_job?: number | null }).max_hires_per_job ?? result[key].max_hires_per_job;
    }
  } catch {
    // Column doesn't exist yet — keep the PLAN_DEFINITIONS fallback value already in result.
  }

  try {
    const { data: seatData } = await supabase
      .from("plan_settings")
      .select("plan_key, included_agent_seats, extra_agent_seat_price");

    for (const row of seatData ?? []) {
      const key = row.plan_key as Plan;
      if (!PLAN_KEYS.includes(key)) continue;
      result[key].included_agent_seats =
        (row as { included_agent_seats?: number | null }).included_agent_seats ?? result[key].included_agent_seats;
      result[key].extra_agent_seat_price =
        (row as { extra_agent_seat_price?: number | null }).extra_agent_seat_price ?? result[key].extra_agent_seat_price;
    }
  } catch {
    // Seat fields may not exist yet — keep fallback values.
  }

  return result;
}

export async function getLivePlanSetting(plan: Plan): Promise<LivePlanSetting> {
  const settings = await getLivePlanSettings();
  return settings[plan];
}

export async function getLiveCommissionRate(plan: Plan): Promise<number> {
  const setting = await getLivePlanSetting(plan);
  return setting.commission_rate;
}
