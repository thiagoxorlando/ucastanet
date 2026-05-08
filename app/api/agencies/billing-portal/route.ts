import { NextResponse } from "next/server";

// Stripe billing portal is disabled — app uses Asaas for all billing.
export async function POST() {
  return NextResponse.json(
    { error: "Este fluxo de cobrança foi desativado. Use Asaas." },
    { status: 410 },
  );
}
