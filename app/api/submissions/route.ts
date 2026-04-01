import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

const MOCK_REFERRER_ID = "00000000-0000-0000-0000-000000000002";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    job_id, talent_name, email, bio, mode,
    photo_front_url, photo_left_url, photo_right_url, video_url,
    talent_user_id,
  } = body;

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
      photo_front_url: photo_front_url ?? null,
      photo_left_url:  photo_left_url  ?? null,
      photo_right_url: photo_right_url ?? null,
      video_url:       video_url       ?? null,
      talent_user_id:  talent_user_id  ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/submissions] Supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ submission: data }, { status: 201 });
}
