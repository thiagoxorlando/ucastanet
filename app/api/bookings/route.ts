import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { job_id, agency_id, talent_name, price, status } = body;

  const supabase = createServerClient({ useServiceRole: true });

  const { data, error } = await supabase
    .from("bookings")
    .insert({ job_id, agency_id, talent_name, price, status: status ?? "pending" })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/bookings] Supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ booking: data }, { status: 201 });
}
