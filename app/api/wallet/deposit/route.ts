import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createSessionClient } from "@/lib/supabase.server";
import { createServerClient } from "@/lib/supabase";

// POST /api/wallet/deposit
// Body: { amount: number, email?: string }
// Returns: { qr_code, qr_code_base64, payment_id }

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

  // ── Resolve payer email ───────────────────────────────────────────────────
  const email: string = body.email ?? user.email ?? "pagador@brisadigital.com";

  const supabase = createServerClient({ useServiceRole: true });

  // Pre-insert a pending transaction to get a stable idempotency key before
  // calling Mercado Pago. Retries with the same key let MP deduplicate the
  // PIX charge rather than issuing a second QR code.
  const { data: txRecord, error: txErr } = await supabase
    .from("wallet_transactions")
    .insert({
      user_id:     user.id,
      type:        "deposit",
      amount,
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
        transaction_amount: amount,
        description:        "Depósito — Brisa Digital",
        payment_method_id:  "pix",
        payer:              { email },
        metadata:           { type: "wallet_deposit", user_id: user.id, tx_id: txRecord.id },
        notification_url:   `${appUrl}/api/webhooks/mercadopago`,
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
  });
}
