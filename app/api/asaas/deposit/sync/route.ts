import { NextResponse } from "next/server";
import { getPayment } from "@/lib/asaas";
import { createServerClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/requireAdmin";

export const runtime = "nodejs";

const SETTLED_STATUSES = new Set(["RECEIVED", "CONFIRMED", "ACTIVE"]);

export async function POST() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) {
    return NextResponse.json(
      { error: "Apenas administradores podem sincronizar pagamentos manualmente." },
      { status: 403 },
    );
  }

  const supabase = createServerClient({ useServiceRole: true });

  // Scan ALL pending deposits across all users
  const { data: pendingDeposits, error: fetchErr } = await supabase
    .from("wallet_transactions")
    .select("id, user_id, amount, asaas_payment_id")
    .eq("type", "deposit")
    .neq("status", "paid")
    .not("asaas_payment_id", "is", null);

  if (fetchErr) {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  const rows = (pendingDeposits ?? []) as Array<{
    id: string;
    user_id: string;
    amount: number;
    asaas_payment_id: string;
  }>;

  if (rows.length === 0) {
    return NextResponse.json({ credited: 0 });
  }

  let credited = 0;
  const now = new Date().toISOString();

  for (const row of rows) {
    try {
      const payment = await getPayment(row.asaas_payment_id);
      if (!SETTLED_STATUSES.has(payment.status)) continue;

      const amount = Number(row.amount);

      const { error: rpcErr } = await supabase.rpc("increment_wallet_balance", {
        p_user_id: row.user_id,
        p_amount: amount,
      });

      if (rpcErr) {
        console.error("[deposit/sync] increment_wallet_balance failed", {
          txId: row.id, userId: row.user_id, err: rpcErr.message,
        });
        continue;
      }

      await supabase
        .from("wallet_transactions")
        .update({
          status: "paid",
          asaas_status: payment.status,
          processed_at: now,
          description: "Depósito via PIX Asaas",
        } as Record<string, unknown>)
        .eq("id", row.id);

      credited++;
      console.log("[deposit/sync] credited", {
        txId: row.id, userId: row.user_id, amount, asaasPaymentId: row.asaas_payment_id,
      });
    } catch (err) {
      console.error("[deposit/sync] getPayment failed", {
        txId: row.id, asaasPaymentId: row.asaas_payment_id, err: String(err),
      });
    }
  }

  return NextResponse.json({ credited, total: rows.length });
}
