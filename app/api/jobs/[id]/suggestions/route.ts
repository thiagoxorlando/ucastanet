import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { getJobSuggestions } from "@/lib/getJobSuggestions";

type Props = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Props) {
  const { id: jobId } = await params;
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

  const { data: job } = await supabase
    .from("jobs")
    .select("agency_id")
    .eq("id", jobId)
    .single();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  if (job.agency_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const queryAgencyId = req.nextUrl.searchParams.get("agency_id");
  if (queryAgencyId && queryAgencyId !== user.id) {
    return NextResponse.json({ error: "Cannot view suggestions for another agency" }, { status: 403 });
  }

  const { suggestions, job_date } = await getJobSuggestions(jobId, user.id);

  return NextResponse.json({ suggestions, job_date });
}
