import { PLAN_DEFINITIONS, PLAN_KEYS, type Plan } from "@/lib/plans";
import { brlPlan } from "@/lib/brl";

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
  return brlPlan(price);
}

export function formatPlanMonthlyPrice(price: number): string {
  return price === 0 ? formatPlanPrice(price) : `${formatPlanPrice(price)}/mês`;
}

export function formatPlanCommission(commissionPercent: number): string {
  return `${commissionPercent.toFixed(0)}%`;
}

export function formatTalentShareLabel(commissionPercent: number): string {
  return `${Math.round(100 - commissionPercent)}%`;
}

export function planLimitHighlights(setting: PublicPlanSetting): string[] {
  const jobs =
    setting.job_limit === null
      ? "Vagas ativas ilimitadas"
      : `${setting.job_limit} vaga${setting.job_limit === 1 ? " ativa" : "s ativas"}`;

  const hires =
    setting.max_hires_per_job === null
      ? "Contratações ilimitadas por vaga"
      : `Até ${setting.max_hires_per_job} contratação${setting.max_hires_per_job === 1 ? "" : "es"} por vaga`;

  return [
    jobs,
    hires,
    `Comissão da plataforma de ${formatPlanCommission(setting.commission_percent)}`,
  ];
}
