import { NextResponse } from "next/server";

const DISABLED_PAYMENT_MESSAGE = "Este fluxo de pagamento foi desativado. Use Asaas.";

export const runtime = "nodejs";

export type StripeConnectStatusResponse = {
  connected: boolean;
  details_submitted: boolean;
  payouts_enabled: boolean;
  transfers_active: boolean;
  bank_ready: boolean;
  can_withdraw: boolean;
  availability_state: "unconnected" | "review" | "processing" | "available" | "blocked";
  display_message: string;
};

export async function GET() {
  return NextResponse.json({ error: DISABLED_PAYMENT_MESSAGE }, { status: 410 });
}
