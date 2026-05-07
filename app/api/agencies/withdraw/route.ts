import { NextResponse } from "next/server";

const DISABLED_PAYMENT_MESSAGE = "Este fluxo de saque foi desativado. Use Asaas.";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json({ error: DISABLED_PAYMENT_MESSAGE }, { status: 410 });
}
