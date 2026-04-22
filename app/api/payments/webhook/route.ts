import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Legacy payment webhook disabled. Use /api/webhooks/mercadopago." },
    { status: 410 }
  );
}
