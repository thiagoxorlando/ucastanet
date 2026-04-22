import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/requireAdmin";

const TABLES = ["jobs", "bookings", "contracts", "talent_profiles", "agencies"] as const;
type TrashTable = (typeof TABLES)[number];

// GET — list all soft-deleted items
export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerClient({ useServiceRole: true });

  const [jobs, bookings, contracts, talent, agencies] = await Promise.all([
    supabase.from("jobs").select("id, title, deleted_at, created_at").not("deleted_at", "is", null),
    supabase.from("bookings").select("id, job_title, status, deleted_at, created_at").not("deleted_at", "is", null),
    supabase.from("contracts").select("id, status, payment_amount, deleted_at, created_at").not("deleted_at", "is", null),
    supabase.from("talent_profiles").select("id, full_name, deleted_at, created_at").not("deleted_at", "is", null),
    supabase.from("agencies").select("id, company_name, deleted_at, created_at").not("deleted_at", "is", null),
  ]);

  return NextResponse.json({
    jobs:      jobs.data      ?? [],
    bookings:  bookings.data  ?? [],
    contracts: contracts.data ?? [],
    talent:    talent.data    ?? [],
    agencies:  agencies.data  ?? [],
  });
}

// DELETE — permanently delete an item
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { table, id } = await req.json();

  if (!TABLES.includes(table)) {
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supabase = createServerClient({ useServiceRole: true });
  const { error } = await supabase.from(table as TrashTable).delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// POST — restore an item (clear deleted_at)
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { table, id } = await req.json();

  if (!TABLES.includes(table)) {
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supabase = createServerClient({ useServiceRole: true });
  const { error } = await supabase
    .from(table as TrashTable)
    .update({ deleted_at: null })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
