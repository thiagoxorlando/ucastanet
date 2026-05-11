import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/requireAdmin";
import { logAdminAction } from "@/lib/auditLog";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const amount = Number(body.amount ?? 0);
  const reason = (body.reason as string | undefined)?.trim() ?? "";

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "O valor deve ser maior que zero." }, { status: 400 });
  }

  const rounded = Math.round(amount * 100) / 100;

  if (!reason) {
    return NextResponse.json({ error: "O motivo do débito é obrigatório." }, { status: 400 });
  }

  const supabase = createServerClient({ useServiceRole: true });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, wallet_balance")
    .eq("id", id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  if ((profile as Record<string, unknown>).role !== "agency") {
    return NextResponse.json({ error: "Apenas agências podem ter saldo debitado." }, { status: 400 });
  }

  const current = Number((profile as Record<string, unknown>).wallet_balance ?? 0);

  if (rounded > current) {
    return NextResponse.json(
      { error: "Valor superior ao saldo disponível da agência." },
      { status: 422 },
    );
  }

  const newBalance = Math.round((current - rounded) * 100) / 100;

  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ wallet_balance: newBalance } as Record<string, unknown>)
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await supabase.from("wallet_transactions").insert({
    user_id:     id,
    type:        "admin_debit",
    amount:      rounded,
    description: `Débito administrativo: ${reason}`,
    provider:    "admin",
    status:      "completed",
  } as Record<string, unknown>);

  await logAdminAction({
    adminId: auth.userId,
    action: "balance_adjusted",
    entityType: "user",
    entityId: id,
    before: { wallet_balance: current },
    after: { wallet_balance: newBalance },
    metadata: { type: "debit", amount: rounded, reason },
  });

  return NextResponse.json({ ok: true, newBalance });
}
