import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase.server";
import { createServerClient } from "@/lib/supabase";
import { notifyAdmins } from "@/lib/notify";

export async function POST() {
  const session = await createSessionClient();
  const { data: { user }, error: authError } = await session.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient({ useServiceRole: true });

  // Read current balance
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("wallet_balance")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
  }

  const balance = Number(profile.wallet_balance ?? 0);
  if (balance <= 0) {
    return NextResponse.json({ error: "Saldo insuficiente para saque." }, { status: 400 });
  }

  // Deduct full balance and record the withdrawal
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ wallet_balance: 0 })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json({ error: "Erro ao processar saque." }, { status: 500 });
  }

  const { data: withdrawalTx, error: txError } = await supabase.from("wallet_transactions").insert({
    user_id:     user.id,
    type:        "withdrawal",
    amount:      balance,
    description: "Saque solicitado",
  }).select("id").single();

  if (txError) {
    console.error("[POST /api/agencies/withdraw] wallet transaction insert failed:", txError.message);
  }

  const brl = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(balance);
  await notifyAdmins(
    "payment",
    `Novo pedido de saque: ${brl}`,
    "/admin/finances",
    `admin-withdrawal-request:${withdrawalTx?.id ?? `${user.id}:${balance}`}`,
  );

  return NextResponse.json({ success: true, amount: balance });
}
