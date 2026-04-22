import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { syncBooking } from "@/lib/syncBooking";
import { notify } from "@/lib/notify";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { signed_contract_url } = body as { signed_contract_url?: string };

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient({ useServiceRole: true });

  const { data: contract, error: fetchErr } = await supabase
    .from("contracts")
    .select("agency_id, talent_id, job_id, booking_id, status")
    .eq("id", id)
    .single();

  if (fetchErr || !contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  const { data: caller } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (caller?.role !== "talent" || contract.talent_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (contract.status !== "sent") {
    return NextResponse.json({ error: "Contract is no longer pending" }, { status: 409 });
  }

  const updates: Record<string, string> = {
    status:    "signed",
    signed_at: new Date().toISOString(),
  };
  if (signed_contract_url) {
    updates.signed_contract_url = signed_contract_url;
  }

  const { error } = await supabase
    .from("contracts")
    .update(updates)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await syncBooking(supabase, contract, "pending_payment");

  // Notify agency only — talent already received "Você recebeu um novo contrato"
  // when the contract was created; a second notification here would be a duplicate.
  await notify(contract.agency_id, "contract", "Talento assinou o contrato", "/agency/bookings");

  return NextResponse.json({ ok: true, status: "signed" });
}
