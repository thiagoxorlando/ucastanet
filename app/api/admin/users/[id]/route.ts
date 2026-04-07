import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

// Update role
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { role } = await req.json();

  if (!["talent", "agency", "admin"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const supabase = createServerClient({ useServiceRole: true });

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

// Soft delete user (talent_profile or agency, based on their role)
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { table } = await req.json().catch(() => ({ table: null }));

  if (!["talent_profiles", "agencies"].includes(table)) {
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });
  }

  const supabase = createServerClient({ useServiceRole: true });
  const deletedAt = new Date().toISOString();

  const { error } = await supabase
    .from(table)
    .update({ deleted_at: deletedAt })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
