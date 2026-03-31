import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

const MOCK_REFERRER_ID = "00000000-0000-0000-0000-000000000002";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { job_id, talent_name, email, bio, mode } = body;

  const supabase = createServerClient({ useServiceRole: true });

  const { data, error } = await supabase
    .from("submissions")
    .insert({
      job_id,
      talent_name,
      email,
      bio,
      referrer_id: mode === "other" ? MOCK_REFERRER_ID : null,
      status: "pending",
      mode,
    })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/submissions] Supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ submission: data }, { status: 201 });
}
