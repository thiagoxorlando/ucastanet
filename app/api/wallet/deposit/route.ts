import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createSessionClient } from "@/lib/supabase.server";
import { createServerClient } from "@/lib/supabase";
import { calcFeeBreakdown, PIX_FEE_RATE } from "@/lib/mp-fees";

// POST /api/wallet/deposit
// Body: { amount: number, email?: string }
// Returns: { qr_code, qr_code_base64, payment_id, tx_id, creditAmount, fee, totalCharged }

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const amount = Number(body.amount);

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ error: "MERCADO_PAGO_ACCESS_TOKEN is not configured" }, { status: 500 });
  }

  // ── Resolve payer email and agency name ───────────────────────────────────
  const email: string = body.email ?? user.email ?? "deposito@brisahub.com.br";

  const supabase = createServerClient({ useServiceRole: true });

  const { data: agency } = await supabase
    .from("agencies")
    .select("company_name")
    .eq("id", user.id)
    .single();
  const agencyName = agency?.company_name ?? null;

  // ── Fee breakdown ─────────────────────────────────────────────────────────
  // When PIX_FEE_RATE = 0 (default), totalCharged = creditAmount = amount.
  // Set MERCADO_PAGO_PIX_FEE_RATE in .env.local to pass the fee to the payer.
  const { creditAmount, fee, totalCharged } = calcFeeBreakdown(amount, PIX_FEE_RATE);

  // Pre-insert a pending transaction to get a stable idempotency key.
  // amount = creditAmount — what will be credited to the wallet on approval.
  const { data: txRecord, error: txErr } = await supabase
    .from("wallet_transactions")
    .insert({
      user_id:     user.id,
      type:        "deposit",
      amount:      creditAmount,
      description: "Depósito via PIX (pendente)",
    })
    .select("id")
    .single();

  if (txErr || !txRecord) {
    console.error("[wallet/deposit] Failed to log pending deposit:", txErr?.message);
    return NextResponse.json({ error: "Could not create deposit record" }, { status: 500 });
  }

  // ── Create PIX payment ────────────────────────────────────────────────────
  const client        = new MercadoPagoConfig({ accessToken });
  const paymentClient = new Payment(client);
  const appUrl        = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  let result;
  try {
    result = await paymentClient.create({
      body: {
        transaction_amount: totalCharged,
        description:        agencyName
          ? `BrisaHub — Depósito de Saldo (${agencyName})`
          : "BrisaHub — Depósito de Saldo",
        payment_method_id:  "pix",
        payer: {
          email,
          first_name: agencyName ?? undefined,
        },
        metadata: {
          type:                   "wallet_deposit",
          user_id:                user.id,
          agency_id:              user.id,
          tx_id:                  txRecord.id,
          intended_credit_amount: String(creditAmount),
        },
        notification_url: `${appUrl}/api/webhooks/mercadopago`,
      },
      requestOptions: { idempotencyKey: `wallet-deposit:${txRecord.id}` },
    });
  } catch (err) {
    console.error("[wallet/deposit] Mercado Pago error:", err);
    await supabase.from("wallet_transactions").delete().eq("id", txRecord.id);
    return NextResponse.json({ error: "Failed to create PIX payment" }, { status: 502 });
  }

  const txData       = result.point_of_interaction?.transaction_data ?? {};
  const qrCode       = txData.qr_code        ?? null;
  const qrCodeBase64 = txData.qr_code_base64 ?? null;
  const paymentId    = result.id!;

  // Attach the MP payment_id so the webhook can match this transaction later
  await supabase
    .from("wallet_transactions")
    .update({ payment_id: String(paymentId) })
    .eq("id", txRecord.id);

  return NextResponse.json({
    qr_code:        qrCode,
    qr_code_base64: qrCodeBase64,
    payment_id:     paymentId,
    tx_id:          txRecord.id,
    creditAmount,
    fee,
    totalCharged,
  });
}
