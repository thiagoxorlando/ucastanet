// Mercado Pago processing fee configuration.
//
// When fee rate = 0 (default), the platform absorbs the MP fee.
// The wallet is credited the full requested amount and the platform
// receives slightly less from MP.
//
// To pass the fee through to the payer, set one or both of these in .env.local:
//
//   MERCADO_PAGO_PIX_FEE_RATE=0.0099    # example: 0.99% for PIX
//   MERCADO_PAGO_CARD_FEE_RATE=0.0249   # example: 2.49% for card
//
// Find your exact rate in: Mercado Pago dashboard → Custos → Taxas de pagamento.
// Do NOT guess fee percentages here. Leave at 0 until confirmed.
//
// IMPORTANT: These are server-side env vars (no NEXT_PUBLIC_ prefix).
// Fee amounts are returned by API routes and rendered by the client.

export const PIX_FEE_RATE  = Number(process.env.MERCADO_PAGO_PIX_FEE_RATE  ?? 0) || 0;
export const CARD_FEE_RATE = Number(process.env.MERCADO_PAGO_CARD_FEE_RATE ?? 0) || 0;

export interface FeeBreakdown {
  creditAmount: number; // amount credited to the wallet
  fee:          number; // processing fee paid by the payer
  totalCharged: number; // total charged via MP = creditAmount + fee
}

function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Given a desired wallet credit amount, compute the fee breakdown.
 *
 * When feeRate = 0 (platform absorbs fee):
 *   totalCharged = creditAmount, fee = 0
 *
 * When feeRate > 0 (fee passed through):
 *   totalCharged = ceil(creditAmount / (1 - feeRate)) so that
 *   after MP deducts its share the platform receives exactly creditAmount.
 */
export function calcFeeBreakdown(creditAmount: number, feeRate: number): FeeBreakdown {
  if (!feeRate) {
    return { creditAmount, fee: 0, totalCharged: creditAmount };
  }
  const totalCharged = roundCents(creditAmount / (1 - feeRate));
  const fee          = roundCents(totalCharged - creditAmount);
  return { creditAmount, fee, totalCharged };
}
