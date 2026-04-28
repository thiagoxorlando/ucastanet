import { NextRequest, NextResponse } from "next/server";
import { notifyAdmins } from "@/lib/notify";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";

type TalentWithdrawalResult = {
  ok?: boolean;
  error?: string;
  tx_id?: string;
  amount?: number;
  net_amount?: number;
  remaining_balance?: number;
};

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export async function POST(req: NextRequest) {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { amount?: unknown };
  const requestedAmount = Number(body.amount);

  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
    return NextResponse.json({ error: "Valor de saque inválido." }, { status: 400 });
  }

  if (parseFloat(requestedAmount.toFixed(2)) !== requestedAmount) {
    return NextResponse.json({ error: "Valor de saque inválido." }, { status: 400 });
  }

  if (requestedAmount > 50_000) {
    return NextResponse.json({ error: "Valor de saque excede o limite por solicitação." }, { status: 400 });
  }

  const supabase = createServerClient({ useServiceRole: true });
  const { data: result, error: rpcError } = await supabase.rpc("request_talent_withdrawal", {
    p_user_id: user.id,
    p_amount: requestedAmount,
  });

  if (rpcError) {
    console.error("[POST /api/talent/withdraw] rpc error:", rpcError.message);
    return NextResponse.json({ error: "Erro ao processar saque." }, { status: 500 });
  }

  const withdrawal = result as TalentWithdrawalResult | null;
  if (!withdrawal?.ok) {
    if (withdrawal?.error === "pix_not_configured") {
      return NextResponse.json({ error: "Configure sua chave PIX antes de solicitar saque." }, { status: 400 });
    }
    if (withdrawal?.error === "invalid_amount") {
      return NextResponse.json({ error: "Valor de saque inválido." }, { status: 400 });
    }
    if (withdrawal?.error === "insufficient_balance") {
      return NextResponse.json({ error: "Saldo insuficiente para saque." }, { status: 400 });
    }
    if (withdrawal?.error === "not_talent") {
      return NextResponse.json({ error: "Apenas talentos podem solicitar este saque." }, { status: 403 });
    }
    if (withdrawal?.error === "profile_not_found") {
      return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao processar saque." }, { status: 500 });
  }

  const amount = Number(withdrawal.amount ?? requestedAmount);
  const { data: talent } = await supabase
    .from("talent_profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  await notifyAdmins(
    "payment",
    `Novo saque solicitado — ${talent?.full_name ?? user.email ?? "Talento"}: ${brl(amount)}`,
    "/admin/finances",
    `admin-talent-withdrawal-request:${withdrawal.tx_id ?? user.id}`,
  );

  return NextResponse.json({
    success: true,
    amount,
    net_amount: Number(withdrawal.net_amount ?? amount),
    remaining_balance: Number(withdrawal.remaining_balance ?? 0),
    tx_id: withdrawal.tx_id,
  });
}
