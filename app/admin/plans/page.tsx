import type { Metadata } from "next";
import AdminPlans, { type AdminPlansAgency } from "@/features/admin/AdminPlans";
import { getPlanLabel, parsePlan } from "@/lib/plans";
import { createServerClient } from "@/lib/supabase";

export const metadata: Metadata = { title: "Administracao - Planos - BrisaHub" };

type AgencyProfileRow = {
  id: string;
  plan: string | null;
  plan_status: string | null;
  plan_expires_at: string | null;
  asaas_customer_id: string | null;
  asaas_subscription_id: string | null;
};

type AgencyRow = {
  id: string;
  user_id: string | null;
  company_name: string | null;
  contact_name: string | null;
  deleted_at: string | null;
};

type PlanChargeRow = {
  id: string;
  user_id: string;
  amount: number | null;
  description: string | null;
  created_at: string | null;
  status: string | null;
  payment_id: string | null;
  processed_at: string | null;
  provider: string | null;
  invoice_url?: string | null;
};

async function fetchPlanChargeRows(supabase: ReturnType<typeof createServerClient>) {
  const baseSelect = "id, user_id, amount, description, created_at, status, payment_id, processed_at, provider";
  const withInvoice = await supabase
    .from("wallet_transactions")
    .select(`${baseSelect}, invoice_url`)
    .eq("type", "plan_charge")
    .order("created_at", { ascending: false });

  if (!withInvoice.error) {
    return (withInvoice.data ?? []) as PlanChargeRow[];
  }

  if (!withInvoice.error.message.includes("invoice_url")) {
    throw withInvoice.error;
  }

  const fallback = await supabase
    .from("wallet_transactions")
    .select(baseSelect)
    .eq("type", "plan_charge")
    .order("created_at", { ascending: false });

  if (fallback.error) {
    throw fallback.error;
  }

  return (fallback.data ?? []) as PlanChargeRow[];
}

function normalizeStatus(status: string | null | undefined) {
  return String(status ?? "").trim().toLowerCase();
}

function inferPlanName(description: string | null | undefined, currentPlan: string | null | undefined) {
  const text = String(description ?? "").toLowerCase();
  if (text.includes("premium")) return "Premium";
  if (text.includes("pro")) return "Pro";
  return getPlanLabel(currentPlan);
}

export default async function AdminPlansPage() {
  const supabase = createServerClient({ useServiceRole: true });

  const [{ data: profiles }, { data: agencies }, chargeRows] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, plan, plan_status, plan_expires_at, asaas_customer_id, asaas_subscription_id")
      .eq("role", "agency"),
    supabase
      .from("agencies")
      .select("id, user_id, company_name, contact_name, deleted_at")
      .is("deleted_at", null),
    fetchPlanChargeRows(supabase),
  ]);

  const agencyMap = new Map<string, AgencyRow>();
  for (const agency of (agencies ?? []) as AgencyRow[]) {
    const ownerId = agency.user_id ?? agency.id;
    if (ownerId) agencyMap.set(ownerId, agency);
  }

  const chargesByUser = new Map<string, PlanChargeRow[]>();
  for (const charge of chargeRows) {
    const list = chargesByUser.get(charge.user_id) ?? [];
    list.push(charge);
    chargesByUser.set(charge.user_id, list);
  }

  const agenciesData: AdminPlansAgency[] = ((profiles ?? []) as AgencyProfileRow[])
    .map((profile) => {
      const agency = agencyMap.get(profile.id);
      const currentPlan = parsePlan(profile.plan);
      const agencyCharges = chargesByUser.get(profile.id) ?? [];

      const paidCharges = agencyCharges.filter((charge) => normalizeStatus(charge.status) === "paid");
      const pendingCharges = agencyCharges.filter((charge) => {
        const status = normalizeStatus(charge.status);
        return status === "pending" || status === "processing" || status === "awaiting_payment" || status === "pending_payment";
      });
      const failedCharges = agencyCharges.filter((charge) => {
        const status = normalizeStatus(charge.status);
        return status !== "paid" && !pendingCharges.includes(charge);
      });

      const serializeCharge = (charge: PlanChargeRow) => ({
        id: charge.id,
        createdAt: charge.created_at ?? "",
        planName: inferPlanName(charge.description, currentPlan),
        amount: Math.abs(Number(charge.amount ?? 0)),
        status: normalizeStatus(charge.status),
        provider: charge.provider ? String(charge.provider).toUpperCase() : "ASAAS",
        paymentId: charge.payment_id ?? null,
        processedAt: charge.processed_at ?? null,
        invoiceUrl: charge.invoice_url ?? null,
        description: charge.description ?? null,
      });

      return {
        id: profile.id,
        agencyName: agency?.company_name?.trim() || "Agencia sem nome",
        contactName: agency?.contact_name?.trim() || null,
        currentPlan,
        currentPlanLabel: getPlanLabel(currentPlan),
        planStatus: normalizeStatus(profile.plan_status) || (currentPlan === "free" ? "inactive" : "active"),
        nextChargeDate: profile.plan_expires_at ?? null,
        asaasCustomerId: profile.asaas_customer_id ?? null,
        asaasSubscriptionId: profile.asaas_subscription_id ?? null,
        totalPaid: paidCharges.reduce((sum, charge) => sum + Math.abs(Number(charge.amount ?? 0)), 0),
        paidChargeCount: paidCharges.length,
        paidCharges: paidCharges.map(serializeCharge),
        pendingCharges: pendingCharges.map(serializeCharge),
        failedCharges: failedCharges.map(serializeCharge),
      };
    })
    .sort((left, right) => left.agencyName.localeCompare(right.agencyName, "pt-BR"));

  const summary = {
    freeCount: agenciesData.filter((agency) => agency.currentPlan === "free").length,
    proCount: agenciesData.filter((agency) => agency.currentPlan === "pro").length,
    premiumCount: agenciesData.filter((agency) => agency.currentPlan === "premium").length,
    totalRevenuePaid: agenciesData.reduce((sum, agency) => sum + agency.totalPaid, 0),
    pendingChargeCount: agenciesData.reduce((sum, agency) => sum + agency.pendingCharges.length, 0),
    pendingChargeAmount: agenciesData.reduce(
      (sum, agency) => sum + agency.pendingCharges.reduce((inner, charge) => inner + charge.amount, 0),
      0,
    ),
  };

  return <AdminPlans agencies={agenciesData} summary={summary} />;
}
