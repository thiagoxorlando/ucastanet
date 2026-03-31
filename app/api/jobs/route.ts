import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, category, budget, deadline, agency_id } = body;

  const supabase = createServerClient({ useServiceRole: true });

  const { data, error } = await supabase
    .from("jobs")
    .insert({ title, description, category, budget, deadline, agency_id })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/jobs] Supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ job: data }, { status: 201 });
}
