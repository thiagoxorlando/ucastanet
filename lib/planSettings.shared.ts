import { PLAN_DEFINITIONS, PLAN_KEYS, type Plan } from "@/lib/plans";

export type PublicPlanSetting = {
  plan_key: Plan;
  name: string;
  price: number;
  commission_percent: number;
  commission_rate: number;
  is_available: boolean;
  job_limit: number | null;
  max_hires_per_job: number | null;
};

export function buildPlanSettingsFallback(): Record<Plan, PublicPlanSetting> {
  const result = {} as Record<Plan, PublicPlanSetting>;

  for (const plan of PLAN_KEYS) {
    const def = PLAN_DEFINITIONS[plan];
    result[plan] = {
      plan_key: plan,
      name: def.label,
      price: def.price,
      commission_percent: def.commissionRate * 100,
      commission_rate: def.commissionRate,
      is_available: def.available,
      job_limit: def.maxActiveJobs,
      max_hires_per_job: def.maxHiresPerJob,
    };
  }

  return result;
}

export function formatPlanPrice(price: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);
}

export function formatPlanCommission(commissionPercent: number): string {
  return `${commissionPercent.toFixed(0)}%`;
}

export function formatTalentShareLabel(commissionPercent: number): string {
  return `${Math.round(100 - commissionPercent)}%`;
}
