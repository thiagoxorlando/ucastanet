import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import WorkspaceJobListClient, { type WorkspaceJob } from "@/features/talent/WorkspaceJobListClient";

export const metadata: Metadata = { title: "Vagas privadas — BrisaHub" };

type Props = { params: Promise<{ workspaceSlug: string }> };

export default async function WorkspaceJobsPage({ params }: Props) {
  const { workspaceSlug } = await params;

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) notFound();

  const supabase = createServerClient({ useServiceRole: true });

  const { data: workspace } = await supabase
    .from("premium_workspaces")
    .select("id, name")
    .eq("slug", workspaceSlug)
    .is("deleted_at", null)
    .eq("status", "active")
    .maybeSingle();

  if (!workspace) notFound();

  const { data: jobRows } = await supabase
    .from("jobs")
    .select("id, title, category, budget, description, location, deadline, job_date, created_at, visibility")
    .eq("workspace_id", workspace.id)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const rawJobs = (jobRows ?? []).filter(
    (j) => j.visibility === "private_invite" || j.visibility === "private_portal",
  );

  const jobIds = rawJobs.map((j) => j.id);
  const { data: submissions } = jobIds.length
    ? await supabase
        .from("submissions")
        .select("job_id")
        .eq("talent_user_id", user.id)
        .in("job_id", jobIds)
        .neq("status", "rejected")
    : { data: [] };

  const appliedIds = new Set((submissions ?? []).map((s) => String(s.job_id)));

  const jobs: WorkspaceJob[] = rawJobs.map((job) => ({
    id:          String(job.id),
    title:       job.title       ?? "",
    description: job.description ?? "",
    category:    job.category    ?? "",
    budget:      job.budget      ?? null,
    deadline:    job.deadline    ?? null,
    jobDate:     job.job_date    ?? null,
    location:    job.location    ?? null,
    createdAt:   job.created_at  ?? "",
    applied:     appliedIds.has(String(job.id)),
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[1.3rem] font-bold text-zinc-950">Vagas privadas</h1>
        <p className="mt-0.5 text-[13px] text-zinc-500">
          Vagas exclusivas de <span className="font-medium">{workspace.name as string}</span> publicadas para você.
        </p>
      </div>
      <WorkspaceJobListClient jobs={jobs} workspaceSlug={workspaceSlug} />
    </div>
  );
}
