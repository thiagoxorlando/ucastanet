import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Este fluxo de pagamento foi desativado. Use Asaas." },
    { status: 410 },
  );
}
