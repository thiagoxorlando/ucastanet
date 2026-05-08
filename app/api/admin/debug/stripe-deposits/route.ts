import { NextResponse } from "next/server";

// Legacy Stripe debug endpoint — disabled. App uses Asaas.
export async function GET() {
  return NextResponse.json(
    { error: "Este endpoint legado foi desativado. Use Asaas." },
    { status: 410 },
  );
}
