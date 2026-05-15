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
    .select("id, name, logo_url, brand_primary_color, brand_accent_color")
    .eq("slug", workspaceSlug)
    .is("deleted_at", null)
    .eq("status", "active")
    .maybeSingle();

  if (!workspace) notFound();

  const primary = (workspace.brand_primary_color as string | null) ?? "#1ABC9C";
  const accent  = (workspace.brand_accent_color  as string | null) ?? "#27C1D6";

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
    <div className="space-y-6">
      {/* Branded page header */}
      <div className="flex items-center gap-3.5">
        {workspace.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={workspace.logo_url as string}
            alt={workspace.name as string}
            className="h-10 w-10 flex-shrink-0 rounded-xl border border-zinc-200 object-cover shadow-sm"
          />
        ) : (
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}
          >
            {(workspace.name as string).slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-zinc-400">
            {workspace.name as string}
          </p>
          <h1 className="text-[1.3rem] font-bold leading-tight text-zinc-950">Vagas privadas</h1>
        </div>
      </div>

      {rawJobs.length === 0 ? (
        <div className="rounded-[22px] border border-zinc-200 bg-white px-6 py-14 text-center">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: `linear-gradient(135deg, ${primary}20, ${accent}10)` }}
          >
            <svg className="h-5 w-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-[14px] font-semibold text-zinc-600">Nenhuma vaga disponível no momento.</p>
          <p className="mt-1 text-[13px] text-zinc-400">
            Novas oportunidades aparecerão aqui quando a agência as publicar.
          </p>
        </div>
      ) : (
        <WorkspaceJobListClient jobs={jobs} workspaceSlug={workspaceSlug} />
      )}
    </div>
  );
}
