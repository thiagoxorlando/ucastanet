import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment, CardToken } from "mercadopago";
import { createSessionClient } from "@/lib/supabase.server";
import { createServerClient } from "@/lib/supabase";
import { PLAN_DEFINITIONS, PLAN_KEYS, type Plan } from "@/lib/plans";

// MP SDK throws parsed JSON, not Error instances.
type MpCause = { code: number; description: string };
type MpErrorInfo = { message: string; httpStatus: number; statusDetail?: string; causes: MpCause[] };
function extractMpErrorDetails(err: unknown): MpErrorInfo {
  if (!err || typeof err !== "object") return { message: String(err), httpStatus: 502, causes: [] };
  const e = err as Record<string, unknown>;
  const causes: MpCause[] = Array.isArray(e.cause)
    ? (e.cause as Array<Record<string, unknown>>).map((c) => ({ code: Number(c.code ?? 0), description: String(c.description ?? "") }))
    : [];
  return {
    message:      String(e.message ?? e.error ?? causes[0]?.description ?? "unknown"),
    httpStatus:   typeof e.status === "number" && e.status >= 400 ? e.status : 502,
    statusDetail: e.status_detail ? String(e.status_detail) : undefined,
    causes,
  };
}
function mapPaymentError(msg: string, statusDetail?: string, causes: MpCause[] = []): string {
  const corpus = [msg, statusDetail ?? "", ...causes.map((c) => c.description)].join(" ").toLowerCase();
  if (corpus.includes("cc_rejected_high_risk"))
    return "Pagamento recusado por segurança. Tente outro cartão ou outra forma de pagamento.";
  if (corpus.includes("invalid_user_identification") || corpus.includes("identification number"))
    return "CPF/CNPJ inválido. Verifique os dados do titular do cartão.";
  if (corpus.includes("not_result_by_params"))
    return "Pagamento não aprovado com os dados informados. Verifique o cartão e tente novamente.";
  if (corpus.includes("security_code") || causes.some((c) => c.code === 3031))
    return "CVV inválido ou ausente. Verifique o código do cartão e tente novamente.";
  if (corpus.includes("cc_rejected_insufficient_amount"))
    return "Saldo insuficiente no cartão.";
  return "Pagamento recusado pelo processador.";
}

const PLAN_PRICES: Record<Plan, number> = Object.fromEntries(
  PLAN_KEYS.map((plan) => [plan, PLAN_DEFINITIONS[plan].price]),
) as Record<Plan, number>;

// POST /api/agencies/plan-change
// Body: { plan, chargeImmediately, savedCardId }
export async function POST(req: NextRequest) {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const {
    plan,
    chargeImmediately,
    useWallet,
    savedCardId,
    cvv,
  } = (await req.json()) as {
    plan?: string;
    chargeImmediately?: boolean;
    useWallet?: boolean;
    savedCardId?: string;
    cvv?: string;
  };

  if (!plan || !PLAN_KEYS.includes(plan as Plan)) {
    return NextResponse.json({ error: "Plano invalido" }, { status: 400 });
  }

  const selectedPlan = plan as Plan;

  if (selectedPlan === "premium") {
    return NextResponse.json({ error: "Plano Premium em breve. Selecione o plano Pro." }, { status: 403 });
  }

  const supabase = createServerClient({ useServiceRole: true });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, plan, wallet_balance")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "agency") {
    return NextResponse.json({ error: "Apenas agencias podem alterar planos" }, { status: 403 });
  }

  const currentPlan = profile?.plan ?? "free";

  if (currentPlan === selectedPlan) {
    return NextResponse.json({ error: "Voce ja esta neste plano" }, { status: 400 });
  }

  const nextBillingDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  })();

  if (!chargeImmediately && selectedPlan !== "free") {
    return NextResponse.json(
      { error: "Planos pagos precisam de pagamento aprovado para ativacao" },
      { status: 403 },
    );
  }

  if (chargeImmediately && useWallet && selectedPlan !== "free") {
    const amount = PLAN_PRICES[selectedPlan];
    const balance = Number(profile?.wallet_balance ?? 0);

    if (balance < amount) {
      return NextResponse.json(
        { error: "Saldo insuficiente na carteira", available: balance, required: amount },
        { status: 402 },
      );
    }

    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 30);

    const { error: walletErr } = await supabase
      .from("profiles")
      .update({
        wallet_balance: balance - amount,
        plan: selectedPlan,
        plan_status: "active",
        plan_expires_at: newExpiry.toISOString(),
      })
      .eq("id", user.id)
      .gte("wallet_balance", amount)
      .select("id")
      .single();

    if (walletErr) {
      return NextResponse.json({ error: "Saldo insuficiente na carteira" }, { status: 402 });
    }

    await supabase.from("wallet_transactions").insert({
      user_id: user.id,
      type: "payment",
      amount: -amount,
      description: `Plano ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} - debitado da carteira`,
    });

    return NextResponse.json({
      ok: true,
      plan: selectedPlan,
      effectiveAt: new Date().toISOString(),
      expiresAt: newExpiry.toISOString(),
      paidVia: "wallet",
    });
  }

  if (chargeImmediately && selectedPlan !== "free") {
    if (!savedCardId) {
      return NextResponse.json({ error: "Cartão obrigatório para cobrança imediata." }, { status: 400 });
    }

    const rawCvv = String(cvv ?? "").replace(/\D/g, "");
    if (rawCvv.length < 3 || rawCvv.length > 4) {
      return NextResponse.json({ error: "CVV inválido ou ausente. Verifique o código do cartão." }, { status: 400 });
    }

    const { data: card } = await supabase
      .from("saved_cards")
      .select("id, mp_card_id, mp_customer_id, brand, last_four, issuer_id, holder_document_type, holder_document_number")
      .eq("id", savedCardId)
      .eq("user_id", user.id)
      .single();

    if (!card) {
      return NextResponse.json({ error: "Cartão não encontrado." }, { status: 404 });
    }

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ error: "Configuração de pagamento não encontrada." }, { status: 500 });
    }

    const mpClient = new MercadoPagoConfig({ accessToken });
    const amount = PLAN_PRICES[selectedPlan];

    // Tokenize saved card with CVV — required so MP can validate the security code
    let token: string;
    try {
      const cardToken = await new CardToken(mpClient).create({
        body: { card_id: card.mp_card_id, security_code: rawCvv },
      });
      token = cardToken.id!;
    } catch (err) {
      const { message, httpStatus, causes } = extractMpErrorDetails(err);
      const userMsg = mapPaymentError(message, undefined, causes);
      console.error("[plan-change] CardToken.create failed:", message, "causes:", causes.map((c) => `${c.code}:${c.description}`).join(", "));
      return NextResponse.json({ error: userMsg, step: "tokenize_failed", detail: message }, { status: httpStatus });
    }

    const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
    const email = authUser?.user?.email ?? "pagador@brisadigital.com";

    // Billing cycle = YYYYMM — stable idempotency key within the same calendar month
    const _now = new Date();
    const billingCycle = `${_now.getUTCFullYear()}${String(_now.getUTCMonth() + 1).padStart(2, "0")}`;

    const issuerId   = card.issuer_id ? Number(card.issuer_id) : undefined;
    const docDigits  = (card.holder_document_number ?? "").replace(/\D/g, "");

    console.log(
      "[plan-change] Payment.create",
      "plan:", selectedPlan, "amount:", amount,
      "payment_method_id:", card.brand,
      "issuer_id:", issuerId,
      "doc_type:", card.holder_document_type,
      "has_doc:", !!docDigits,
    );

    let result;
    try {
      result = await new Payment(mpClient).create({
        body: {
          transaction_amount: amount,
          description: `Plano ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} - Brisa Digital`,
          installments: 1,
          token,
          payment_method_id: card.brand ?? undefined,
          ...(issuerId !== undefined ? { issuer_id: issuerId } : {}),
          payer: {
            id:   card.mp_customer_id,
            email,
            type: "customer",
            ...(card.holder_document_type && docDigits ? {
              identification: {
                type:   card.holder_document_type,
                number: docDigits,
              },
            } : {}),
          },
          metadata: { user_id: user.id, plan: selectedPlan },
        },
        requestOptions: { idempotencyKey: `plan-change:${user.id}:${selectedPlan}:${billingCycle}` },
      });
    } catch (err) {
      const { message, httpStatus, statusDetail, causes } = extractMpErrorDetails(err);
      const userMsg = mapPaymentError(message, statusDetail, causes);
      console.error("[plan-change] Payment.create failed:", message, "httpStatus:", httpStatus, "causes:", causes.map((c) => `${c.code}:${c.description}`).join(", "));
      return NextResponse.json({ error: userMsg, step: "payment_failed", detail: message, mp_status_detail: statusDetail }, { status: httpStatus });
    }

    if (result.status === "rejected") {
      const userMsg = mapPaymentError("", result.status_detail);
      console.error("[plan-change] payment rejected, status_detail:", result.status_detail, "id:", result.id);
      return NextResponse.json(
        { error: userMsg, mp_status_detail: result.status_detail },
        { status: 402 },
      );
    }

    if (result.status !== "approved") {
      console.error("[plan-change] payment not approved, status:", result.status, "id:", result.id);
      return NextResponse.json(
        {
          error: "Pagamento ainda não aprovado. O plano não foi alterado.",
          paymentStatus: result.status,
          paymentId: result.id,
        },
        { status: 409 },
      );
    }

    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 30);

    await supabase
      .from("profiles")
      .update({
        plan: selectedPlan,
        plan_status: "active",
        plan_expires_at: newExpiry.toISOString(),
      })
      .eq("id", user.id);

    await supabase.from("wallet_transactions").insert({
      user_id: user.id,
      type: "payment",
      amount,
      description: `Plano ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} - cobranca imediata`,
    });

    return NextResponse.json({
      ok: true,
      plan: selectedPlan,
      effectiveAt: new Date().toISOString(),
      expiresAt: newExpiry.toISOString(),
      paidVia: "card",
      paymentId: result.id,
    });
  }

  if (selectedPlan === "free") {
    await supabase
      .from("profiles")
      .update({ plan: "free", plan_status: "inactive", plan_expires_at: null })
      .eq("id", user.id);

    await supabase
      .from("agencies")
      .update({ subscription_status: "cancelling" })
      .eq("id", user.id);

    return NextResponse.json({
      ok: true,
      plan: selectedPlan,
      effectiveAt: nextBillingDate.toISOString(),
      deferred: true,
    });
  }

  return NextResponse.json({ error: "Invalid plan change request" }, { status: 400 });
}
