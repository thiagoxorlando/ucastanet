import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { notify } from "@/lib/notify";
import { resolveWorkspaceLifecycleByJobId, talentWorkspaceJobDetailHref } from "@/lib/workspaceLifecycle";

type Props = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Props) {
  const { id: jobId } = await params;
  const { talent_id, agency_id } = await req.json();

  if (!talent_id) {
    return NextResponse.json({ error: "talent_id required" }, { status: 400 });
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

  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, job_date, agency_id, status, deleted_at, workspace_id")
    .eq("id", jobId)
    .single();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.agency_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (job.deleted_at) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.status !== "open" && job.status !== "active") {
    return NextResponse.json({ error: "Job is not open" }, { status: 422 });
  }

  const { data: invite, error } = await supabase
    .from("job_invites")
    .insert({ job_id: jobId, talent_id, agency_id: user.id, status: "pending" })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "already_invited" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const dateStr = job.job_date
    ? new Date(job.job_date + "T00:00:00").toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      })
    : null;

  const msg = dateStr
    ? `Você recebeu um convite para se candidatar à vaga "${job.title}" (${dateStr}).`
    : `Você recebeu um convite para se candidatar à vaga "${job.title}".`;

  const workspaceLifecycle = await resolveWorkspaceLifecycleByJobId(supabase, jobId);
  await notify(talent_id, "job_invite", msg, talentWorkspaceJobDetailHref(workspaceLifecycle?.workspaceSlug, jobId));

  return NextResponse.json({ invite }, { status: 201 });
}
