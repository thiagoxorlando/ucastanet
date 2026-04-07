import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { notify } from "@/lib/notify";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { action } = await req.json();

  if (!["accept", "reject"].includes(action)) {
    return NextResponse.json({ error: "action must be 'accept' or 'reject'" }, { status: 400 });
  }

  const supabase = createServerClient({ useServiceRole: true });

  const { data: contract, error: fetchErr } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }
  if (contract.status !== "sent") {
    return NextResponse.json({ error: "Contract is no longer pending" }, { status: 409 });
  }

  // "accept" means talent signed the contract → status = "signed"
  const newStatus = action === "accept" ? "signed" : "rejected";

  const updatePayload: Record<string, unknown> = { status: newStatus };
  if (action === "accept") updatePayload.signed_at = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from("contracts")
    .update(updatePayload)
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  if (action === "accept") {
    // Upgrade the pending booking to pending_payment (awaiting agency to pay)
    let bookingQuery = supabase
      .from("bookings")
      .update({ status: "pending_payment" })
      .eq("talent_user_id", contract.talent_id)
      .eq("agency_id", contract.agency_id)
      .eq("status", "pending");

    if (contract.job_id) {
      bookingQuery = bookingQuery.eq("job_id", contract.job_id);
    } else {
      bookingQuery = bookingQuery.is("job_id", null);
    }

    const upgraded = await bookingQuery;

    if (upgraded.error || upgraded.count === 0) {
      // Fallback: create booking if the pending one was not found
      await supabase.from("bookings").insert({
        job_id:         contract.job_id    ?? null,
        agency_id:      contract.agency_id ?? null,
        talent_user_id: contract.talent_id,
        job_title:      contract.job_description?.slice(0, 100) ?? "Contract Job",
        price:          contract.payment_amount ?? 0,
        status:         "pending_payment",
      });
    }

    // Notify agency — contract signed
    await notify(contract.agency_id, "contract", "Talent signed the contract", "/agency/bookings");
    // Notify talent — booking confirmed
    await notify(contract.talent_id, "booking", "You were booked", "/talent/bookings");
  } else {
    // Remove the pending booking created when the contract was sent
    let deleteQuery = supabase
      .from("bookings")
      .delete()
      .eq("talent_user_id", contract.talent_id)
      .eq("agency_id", contract.agency_id)
      .eq("status", "pending");

    if (contract.job_id) {
      deleteQuery = deleteQuery.eq("job_id", contract.job_id);
    } else {
      deleteQuery = deleteQuery.is("job_id", null);
    }

    await deleteQuery;

    await notify(contract.agency_id, "contract", "Talent rejected your contract", "/agency/contracts");
  }

  return NextResponse.json({ ok: true, status: newStatus });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient({ useServiceRole: true });

  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ contract: data });
}
