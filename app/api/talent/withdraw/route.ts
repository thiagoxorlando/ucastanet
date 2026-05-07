import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DISABLED_MESSAGE = "Este fluxo de saque foi desativado. Use Asaas.";

export async function POST() {
  return NextResponse.json({ error: DISABLED_MESSAGE }, { status: 410 });
}
