import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";

const DISABLED_PAYMENT_MESSAGE = "Este fluxo de pagamento foi desativado. Use Asaas.";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json({ error: DISABLED_PAYMENT_MESSAGE }, { status: 410 });
}
