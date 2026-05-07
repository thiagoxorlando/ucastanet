import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase.server";
import { createServerClient } from "@/lib/supabase";
import { ensureAsaasCustomer } from "@/lib/asaasCustomer";
import { createSubscription, getSubscriptionPayments } from "@/lib/asaas";
import { PLAN_DEFINITIONS } from "@/lib/plans";
import { isValidCpfCnpj, normalizeCpfCnpj, digitsOnly } from "@/lib/cpf";

function extractAsaasError(err: unknown): string {
  try {
    const raw = err instanceof Error ? err.message : JSON.stringify(err);
    const parsed = JSON.parse(raw) as { errors?: { description?: string }[] };
    const desc = parsed?.errors?.[0]?.description;
    if (desc) return desc;
  } catch { /* ignore */ }
  return err instanceof Error ? err.message : String(err);
}

export async function POST(req: NextRequest) {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;

  const supabase = createServerClient({ useServiceRole: true });

  const [{ data: profileRow }, { data: agencyRow }] = await Promise.all([
    supabase.from("profiles").select("full_name, cpf_cnpj, asaas_subscription_id").eq("id", user.id).single(),
    supabase.from("agencies").select("phone").eq("id", user.id).maybeSingle(),
  ]);

  const profileRaw = profileRow as Record<string, unknown> | null;
  const name       = (profileRaw?.full_name as string | undefined) ?? "Agência";

  const requestedBodyPlan = body.plan as string | undefined;

  if (requestedBodyPlan && requestedBodyPlan !== "pro") {
    return NextResponse.json(
      { error: "Plano inválido para checkout." },
      { status: 400 },
    );
  }

  // Enforce plan as pro — never trust other frontend values
  const requestedPlan = "pro";

  // Fetch live price from plan_settings; fall back to hardcoded default if table unavailable
  let planPrice = PLAN_DEFINITIONS.pro.price;
  try {
    const { data: planSettingRow } = await supabase
      .from("plan_settings")
      .select("price, is_available")
      .eq("plan_key", "pro")
      .single();

    if (planSettingRow) {
      if (!(planSettingRow as Record<string, unknown>).is_available) {
        return NextResponse.json(
          { error: "Plano Pro não está disponível no momento." },
          { status: 422 },
        );
      }
      planPrice = Number((planSettingRow as Record<string, unknown>).price) || planPrice;
    }
  } catch {
    // plan_settings table may not exist yet — use hardcoded price
  }

  const planLabel = "PRO";

  // ── Idempotency: return pending payment from existing subscription ────────────
  const existingSubId = (profileRaw?.asaas_subscription_id as string | null) ?? null;
  if (existingSubId) {
    try {
      const payments = await getSubscriptionPayments(existingSubId);
      const pending  = (payments.data ?? []).find((p) => p.status === "PENDING");
      if (pending?.invoiceUrl) {
        console.log("[asaas/plan/checkout] returning pending payment for existing subscription", {
          userId: user.id, subscriptionId: existingSubId, paymentId: pending.id,
        });
        return NextResponse.json({ url: pending.invoiceUrl });
      }
      // No pending payment → subscription may already be fully paid/active
      console.log("[asaas/plan/checkout] existing subscription has no pending payment — plan likely already active", {
        userId: user.id, subscriptionId: existingSubId,
      });
      return NextResponse.json(
        { error: "Sua assinatura já está ativa. Acesse a página de cobrança para gerenciá-la." },
        { status: 409 },
      );
    } catch (err) {
      // Subscription not found in Asaas (e.g. sandbox reset) — fall through to create new
      console.warn("[asaas/plan/checkout] existing subscription not found in Asaas — creating new", {
        userId: user.id, subscriptionId: existingSubId, err: String(err),
      });
    }
  }

  // ── CPF/CNPJ validation ───────────────────────────────────────────────────────
  const rawDoc   = (body.cpfCnpj as string | undefined) ?? (profileRaw?.cpf_cnpj as string | undefined) ?? "";
  const cleanDoc = normalizeCpfCnpj(rawDoc);

  if (!isValidCpfCnpj(cleanDoc)) {
    console.error("[asaas/plan/checkout] invalid CPF/CNPJ:", { rawDoc, userId: user.id });
    return NextResponse.json(
      { error: "CPF/CNPJ inválido. Verifique os números e tente novamente." },
      { status: 400 },
    );
  }

  // ── Ensure Asaas customer ─────────────────────────────────────────────────────
  const rawPhone    = (agencyRow as Record<string, unknown> | null)?.phone as string | undefined;
  const mobilePhone = rawPhone ? digitsOnly(rawPhone) : undefined;

  let customerId: string;
  try {
    customerId = await ensureAsaasCustomer(user.id, name, user.email ?? "", cleanDoc, mobilePhone);
  } catch (err) {
    const desc = extractAsaasError(err);
    console.error("[asaas/plan/checkout] ensureAsaasCustomer failed:", desc);
    return NextResponse.json(
      { error: desc || "Não foi possível criar o cliente no Asaas. Confira CPF/CNPJ, telefone e e-mail." },
      { status: 500 },
    );
  }

  // ── Create recurring subscription ─────────────────────────────────────────────
  const nextDueDate = new Date();
  nextDueDate.setDate(nextDueDate.getDate() + 1);
  const nextDueDateStr = nextDueDate.toISOString().slice(0, 10);

  let subscription: Awaited<ReturnType<typeof createSubscription>>;
  try {
    subscription = await createSubscription({
      customer:          customerId,
      billingType:       "CREDIT_CARD",
      value:             planPrice,
      nextDueDate:       nextDueDateStr,
      cycle:             "MONTHLY",
      description:       `Assinatura ${planLabel} - BrisaHub`,
      externalReference: `plan:${requestedPlan}:${user.id}`,
    });
  } catch (err) {
    const desc = extractAsaasError(err);
    console.error("[asaas/plan/checkout] createSubscription failed:", desc);
    return NextResponse.json({ error: desc || "Erro ao criar assinatura. Tente novamente." }, { status: 500 });
  }

  // ── Fetch first payment's invoice URL ────────────────────────────────────────
  let invoiceUrl: string | undefined;
  let firstPaymentId: string | undefined;
  try {
    const payments    = await getSubscriptionPayments(subscription.id);
    const firstPayment = payments.data?.[0];
    invoiceUrl     = firstPayment?.invoiceUrl;
    firstPaymentId = firstPayment?.id;
  } catch (err) {
    console.error("[asaas/plan/checkout] getSubscriptionPayments failed:", String(err));
  }

  if (!invoiceUrl) {
    console.error("[asaas/plan/checkout] no invoiceUrl for subscription first payment", {
      subscriptionId: subscription.id,
    });
    return NextResponse.json({ error: "Erro ao obter link de pagamento." }, { status: 500 });
  }

  // ── Persist subscription ID to profiles ───────────────────────────────────────
  const { error: subUpdateErr } = await supabase
    .from("profiles")
    .update({ asaas_subscription_id: subscription.id } as Record<string, unknown>)
    .eq("id", user.id);

  if (subUpdateErr) {
    console.error("[asaas/plan/checkout] failed to store subscription id (non-fatal)", {
      userId: user.id, subscriptionId: subscription.id, err: subUpdateErr.message,
    });
  }

  // ── Insert pending plan_charge for immediate billing history visibility ────────
  // PAYMENT_CREATED webhook will also arrive shortly and upsert the same row.
  // The 23505 guard makes this idempotent against the unique partial index on payment_id.
  if (firstPaymentId) {
    const { error: chargeErr } = await supabase.from("wallet_transactions").insert({
      user_id:     user.id,
      type:        "plan_charge",
      amount:      planPrice,
      description: `Assinatura ${planLabel} - BrisaHub`,
      payment_id:  firstPaymentId,
      provider:    "asaas",
      status:      "pending",
    } as Record<string, unknown>);

    if (chargeErr && chargeErr.code !== "23505") {
      console.error("[asaas/plan/checkout] plan_charge insert failed (non-fatal)", {
        userId: user.id, paymentId: firstPaymentId, err: chargeErr.message,
      });
    }
  }

  console.log("[asaas/plan/checkout] subscription created", {
    userId: user.id, plan: requestedPlan, subscriptionId: subscription.id, firstPaymentId,
  });

  return NextResponse.json({ url: invoiceUrl });
}
