import { NextResponse } from "next/server";

const DISABLED_PAYMENT_MESSAGE = "Este fluxo de pagamento foi desativado. Use Asaas.";

export async function DELETE() {
  return NextResponse.json({ error: DISABLED_PAYMENT_MESSAGE }, { status: 410 });
}
