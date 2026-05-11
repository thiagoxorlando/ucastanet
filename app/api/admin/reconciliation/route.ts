import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { buildReconciliationData } from "@/lib/readModels/reconciliation";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const data = await buildReconciliationData();
  return NextResponse.json(data);
}
