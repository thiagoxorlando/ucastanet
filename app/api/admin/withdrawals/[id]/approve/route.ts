import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { createServerClient } from "@/lib/supabase";

// POST /api/admin/withdrawals/[id]/approve
// Marks withdrawal as paid via RPC. Does NOT move money — admin must have
// already sent the PIX manually before confirming here.

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id obrigatório." }, { status: 400 });

  const body = await req.json().catch(() => ({})) as { note?: string };
  const note = body.note?.trim() ?? "";

  const supabase = createServerClient({ useServiceRole: true });

  const { data: result, error: rpcError } = await supabase.rpc("mark_agency_withdrawal_paid", {
    p_tx_id:    id,
    p_admin_id: auth.userId,
    p_note:     note,
  });

  if (rpcError) {
    console.error("[approve-withdrawal] rpc error:", {
      message: rpcError.message,
      code:    rpcError.code,
      details: rpcError.details,
      hint:    rpcError.hint,
    });
    return NextResponse.json({
      error:   "Erro ao chamar RPC mark_agency_withdrawal_paid.",
      details: rpcError.message,
      code:    rpcError.code,
    }, { status: 500 });
  }

  if (!result?.ok) {
    console.error("[approve-withdrawal] rpc returned not-ok:", result);
    if (result?.error === "not_found") {
      return NextResponse.json({ error: "Saque não encontrado.", details: `tx_id: ${id}` }, { status: 404 });
    }
    if (result?.error === "not_pending") {
      return NextResponse.json({
        error:   `Saque já está com status "${result.current_status}". Apenas saques pendentes podem ser aprovados.`,
        details: result,
      }, { status: 409 });
    }
    return NextResponse.json({ error: "RPC retornou erro desconhecido.", details: result }, { status: 500 });
  }

  console.log("[approve-withdrawal] paid:", id, "by admin:", auth.userId);
  return NextResponse.json({ ok: true, id, status: "paid" });
}
