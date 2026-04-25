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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "agency") {
    return NextResponse.json({ error: "Apenas agências podem solicitar saques." }, { status: 403 });
  }

  const { data: result, error: rpcError } = await supabase.rpc("request_agency_withdrawal", {
    p_user_id: user.id,
  });

  if (rpcError) {
    console.error("[POST /api/agencies/withdraw] rpc error:", rpcError.message);
    return NextResponse.json({ error: "Erro ao processar saque." }, { status: 500 });
  }

  if (!result?.ok) {
    if (result?.error === "insufficient_balance") {
      return NextResponse.json({ error: "Saldo insuficiente para saque." }, { status: 400 });
    }
    if (result?.error === "profile_not_found") {
      return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao processar saque." }, { status: 500 });
  }

  const amount = Number(result.amount);
  const brl = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(amount);
  await notifyAdmins(
    "payment",
    `Novo pedido de saque: ${brl}`,
    "/admin/finances",
    `admin-withdrawal-request:${user.id}:${amount}`,
  );

  return NextResponse.json({ success: true, amount });
}
