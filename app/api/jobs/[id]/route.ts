import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";

const PATCH_ALLOWED = ["title", "description", "category", "budget", "deadline", "job_date", "status", "location", "gender", "age_min", "age_max", "number_of_talents_required", "visibility"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const update: Record<string, unknown> = {};
  for (const key of PATCH_ALLOWED) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const supabase = createServerClient({ useServiceRole: true });
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: caller } = await supabase
    .from("profiles")
    .select("role, plan")
    .eq("id", user.id)
    .single();

  if (caller?.role !== "agency") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: existingJob } = await supabase
    .from("jobs")
    .select("agency_id")
    .eq("id", id)
    .single();

  if (!existingJob) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (existingJob.agency_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (update.visibility === "private" && caller.plan !== "premium") {
    return NextResponse.json({ error: "Premium plan required for private jobs" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("jobs")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ job: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let hard = false;
  try {
    const body = await req.json();
    hard = body?.hard === true;
  } catch {
    // no body — soft delete
  }

  const supabase = createServerClient({ useServiceRole: true });
  const session  = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const { data: job } = await supabase
    .from("jobs")
    .select("agency_id")
    .eq("id", id)
    .single();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const isAdmin = profile?.role === "admin";
  const isOwnerAgency = profile?.role === "agency" && job.agency_id === user.id;
  if (!isAdmin && !isOwnerAgency) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!hard) {
    // Soft delete: set status = 'inactive'
    const { error } = await supabase
      .from("jobs")
      .update({ status: "inactive" })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, deleted: false });
  }

  // Cascade: delete submissions first, then the job
  await supabase.from("submissions").delete().eq("job_id", id);

  const { error } = await supabase.from("jobs").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, deleted: true });
}
