import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient({ useServiceRole: true });

  const { data: submission, error: fetchErr } = await supabase
    .from("submissions")
    .select("id, job_id, talent_user_id, referrer_id")
    .eq("id", id)
    .single();

  if (fetchErr || !submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const { data: caller } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let isOwningAgency = false;
  if (caller?.role === "agency" && submission.job_id) {
    const { data: job } = await supabase
      .from("jobs")
      .select("agency_id")
      .eq("id", submission.job_id)
      .single();
    isOwningAgency = job?.agency_id === user.id;
  }

  const canDelete =
    caller?.role === "admin" ||
    isOwningAgency ||
    submission.talent_user_id === user.id ||
    submission.referrer_id === user.id;

  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("submissions")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[DELETE /api/submissions/[id]]", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
