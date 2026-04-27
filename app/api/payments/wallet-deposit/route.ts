import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { getEfiSdk } from "@/lib/efiSdk";

// POST /api/payments/wallet-deposit
// Body: { amount: number }
// Creates an Efí PIX charge to top up the agency's platform wallet balance.
//
// Response shape (unchanged from previous provider):
//   qr_code        — PIX copia-e-cola text
//   qr_code_base64 — raw base64 QR image (data: prefix stripped)
//   payment_id     — txid used to track payment via webhook
//   tx_id          — internal wallet_transactions UUID
//   creditAmount   — amount credited to wallet
//   fee            — 0
//   totalCharged   — same as creditAmount

interface EfiCobResponse {
  txid: string;
  loc:  { id: number; location: string; tipoCob: string };
  status: string;
}

interface EfiQrCodeResponse {
  qrcode:       string;
  imagemQrcode: string;
}

export async function POST(req: NextRequest) {
  const body      = await req.json();
  const numAmount = Number(body.amount);

  if (!numAmount || numAmount <= 0) {
    return NextResponse.json({ error: "amount must be greater than 0" }, { status: 400 });
  }

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pixKey = process.env.EFI_PIX_KEY;
  if (!process.env.EFI_CLIENT_ID || !process.env.EFI_CLIENT_SECRET || !pixKey) {
    console.error("[wallet-deposit] Efí env vars not fully configured", {
      hasClientId: Boolean(process.env.EFI_CLIENT_ID),
      hasSecret:   Boolean(process.env.EFI_CLIENT_SECRET),
      hasPixKey:   Boolean(pixKey),
    });
    return NextResponse.json({ error: "Integração de pagamento não configurada." }, { status: 500 });
  }

  const supabase = createServerClient({ useServiceRole: true });

  const { data: txRecord, error: txErr } = await supabase
    .from("wallet_transactions")
    .insert({
      user_id:     user.id,
      type:        "deposit",
      amount:      numAmount,
      description: "Depósito PIX — aguardando confirmação",
      provider:    "efi",
    })
    .select("id")
    .single();

  if (txErr || !txRecord) {
    console.error("[wallet-deposit] insert tx error:", txErr);
    return NextResponse.json({ error: "Could not create deposit record" }, { status: 500 });
  }

  // Efí txid: alphanumeric, 26–35 chars — UUID without hyphens = 32 chars
  const txid = randomUUID().replace(/-/g, "");

  const cobPayload = {
    calendario:         { expiracao: 3600 },
    valor:              { original: numAmount.toFixed(2) },
    chave:              pixKey,
    solicitacaoPagador: "Deposito BrisaHub",
  };

  console.log("[EFI PIX CREATE]", JSON.stringify({ txid, value: numAmount.toFixed(2) }, null, 2));
  console.log("[EFI PIX CREATE URL]", `pixCreateCharge /v2/cob/${txid}`);

  let efipay: ReturnType<typeof getEfiSdk>;
  try {
    efipay = getEfiSdk();
  } catch (err) {
    await supabase.from("wallet_transactions").delete().eq("id", txRecord.id);
    console.error("[wallet-deposit] Efí SDK init failed:", String(err));
    return NextResponse.json({ error: "Erro ao conectar com provedor de pagamento." }, { status: 500 });
  }

  // SDK: pixCreateCharge → PUT /v2/cob/:txid on pix.api.efipay.com.br
  let cob: EfiCobResponse;
  try {
    cob = await efipay.pixCreateCharge({ txid }, cobPayload) as EfiCobResponse;
  } catch (err: unknown) {
    await supabase.from("wallet_transactions").delete().eq("id", txRecord.id);
    console.error("[EFI PAYMENT ERROR FULL]", JSON.stringify(err, null, 2));
    return NextResponse.json({ error: "Erro ao criar pagamento PIX." }, { status: 502 });
  }

  // Store txid so the webhook can find and credit this transaction
  await supabase
    .from("wallet_transactions")
    .update({ payment_id: txid })
    .eq("id", txRecord.id);

  // SDK: pixGenerateQRCode → GET /v2/loc/:id/qrcode (non-fatal if it fails)
  let qrData: EfiQrCodeResponse | null = null;
  try {
    qrData = await efipay.pixGenerateQRCode({ id: cob.loc.id }) as EfiQrCodeResponse;
  } catch (err: unknown) {
    console.error("[wallet-deposit] Efí QR fetch failed (non-fatal):", JSON.stringify(err, null, 2));
  }

  // imagemQrcode may include "data:image/png;base64," prefix — strip it
  const rawBase64 = qrData?.imagemQrcode?.replace(/^data:image\/[^;]+;base64,/, "") ?? null;

  console.log("[wallet-deposit] Efí PIX created — txid:", txid, "tx:", txRecord.id);

  return NextResponse.json({
    qr_code:        qrData?.qrcode ?? null,
    qr_code_base64: rawBase64,
    payment_id:     txid,
    tx_id:          txRecord.id,
    creditAmount:   numAmount,
    fee:            0,
    totalCharged:   numAmount,
  });
}
