import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";

export async function POST(req: NextRequest) {
  const { job_id, talent_ids, agency_id } = await req.json();

  if (!job_id || !Array.isArray(talent_ids) || talent_ids.length === 0) {
    return NextResponse.json({ error: "job_id and talent_ids are required" }, { status: 400 });
  }

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient({ useServiceRole: true });
  const { data: caller } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (caller?.role !== "agency") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (agency_id && agency_id !== user.id) {
    return NextResponse.json({ error: "Cannot invite for another agency" }, { status: 403 });
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("agency_id")
    .eq("id", job_id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.agency_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const safeTalentIds = Array.from(
    new Set(talent_ids.filter((id: unknown): id is string => typeof id === "string" && id.length > 0)),
  );

  if (safeTalentIds.length === 0) {
    return NextResponse.json({ error: "No valid talent_ids provided" }, { status: 400 });
  }

  for (const talent_id of safeTalentIds) {
    const { error } = await supabase.from("notifications").insert({
      user_id: talent_id,
      type: "job_invite",
      message: "You were invited to apply for a job",
      link: `/talent/jobs/${job_id}`,
    });

    if (error) console.error("[invite] Insert failed:", error.message, { talent_id, job_id });
  }

  return NextResponse.json({ ok: true });
}
