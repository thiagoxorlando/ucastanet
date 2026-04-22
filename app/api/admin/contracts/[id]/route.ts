import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/requireAdmin";

type Params = { params: Promise<{ id: string }> };

async function fetchContract(id: string) {
  const supabase = createServerClient({ useServiceRole: true });
  const { data } = await supabase
    .from("contracts")
    .select("status, payment_amount")
    .eq("id", id)
    .single();
  return { supabase, contract: data };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { supabase, contract } = await fetchContract(id);

  if (!contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }
  if (contract.status === "paid") {
    return NextResponse.json(
      { error: "Contract is paid and cannot be edited" },
      { status: 409 }
    );
  }

  const body = await req.json();
  const allowed = ["status", "payment_amount", "job_date", "location", "additional_notes"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if ("status" in updates) {
    if (String(updates.status) !== contract.status) {
      return NextResponse.json(
        { error: "Contract lifecycle status cannot be changed from admin. Use contract flow actions so escrow, payout, and refunds stay consistent." },
        { status: 409 }
      );
    }

    delete updates.status;
  }

  if ("payment_amount" in updates && contract.status === "confirmed") {
    const nextAmount = Number(updates.payment_amount ?? 0);
    const currentAmount = Number(contract.payment_amount ?? 0);
    if (Math.abs(nextAmount - currentAmount) > 0.01) {
      return NextResponse.json(
        { error: "Confirmed contract amount cannot be changed from admin because escrow is already locked." },
        { status: 409 }
      );
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase.from("contracts").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { supabase, contract } = await fetchContract(id);

  if (!contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }
  if (contract.status === "paid") {
    return NextResponse.json(
      { error: "Contract is paid and cannot be deleted" },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("contracts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
