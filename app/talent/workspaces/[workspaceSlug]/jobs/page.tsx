import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { brl } from "@/lib/brl";

export const metadata: Metadata = { title: "Vagas — BrisaHub" };

type Props = { params: Promise<{ workspaceSlug: string }> };

export default async function WorkspaceJobsPage({ params }: Props) {
  const { workspaceSlug } = await params;

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) notFound();

  const supabase = createServerClient({ useServiceRole: true });

  const { data: workspace } = await supabase
    .from("premium_workspaces")
    .select("id")
    .eq("slug", workspaceSlug)
    .is("deleted_at", null)
    .eq("status", "active")
    .maybeSingle();

  if (!workspace) notFound();

  const { data: jobRows } = await supabase
    .from("jobs")
    .select("id, title, status, budget, number_of_talents_required, created_at, visibility, description, location, deadline")
    .eq("workspace_id", workspace.id)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const jobs = (jobRows ?? []).filter(
    (j) => j.visibility === "private_invite" || j.visibility === "private_portal",
  );

  // Check which jobs this talent already applied to
  const jobIds = jobs.map((j) => j.id);
  const { data: submissions } = jobIds.length
    ? await supabase
        .from("submissions")
        .select("job_id")
        .eq("talent_user_id", user.id)
        .in("job_id", jobIds)
        .neq("status", "rejected")
    : { data: [] };

  const appliedIds = new Set((submissions ?? []).map((s) => String(s.job_id)));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[1.3rem] font-bold text-zinc-950">Vagas privadas</h1>
        <p className="mt-0.5 text-[13px] text-zinc-500">
          Vagas exclusivas publicadas neste espaço para você.
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-[22px] border border-zinc-200 bg-white px-6 py-12 text-center">
          <p className="text-[14px] font-semibold text-zinc-600">Nenhuma vaga disponível no momento.</p>
          <p className="mt-1 text-[13px] text-zinc-400">Novas vagas aparecerão aqui quando publicadas pela agência.</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {jobs.map((job) => {
            const applied = appliedIds.has(String(job.id));
            return (
              <li key={job.id}>
                <Link
                  href={`/talent/workspaces/${workspaceSlug}/jobs/${job.id}`}
                  className="block rounded-[20px] border border-zinc-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[15px] font-semibold text-zinc-950 truncate">{job.title}</p>
                    {applied && (
                      <span className="flex-shrink-0 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">
                        Candidatado
                      </span>
                    )}
                  </div>
                  {job.description && (
                    <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-500 line-clamp-2">{job.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-zinc-500">
                    {job.budget != null && (
                      <span><span className="font-medium text-zinc-700">Cachê:</span> {brl(job.budget)}</span>
                    )}
                    {job.location && (
                      <span><span className="font-medium text-zinc-700">Local:</span> {job.location}</span>
                    )}
                    {job.deadline && (
                      <span>
                        <span className="font-medium text-zinc-700">Prazo:</span>{" "}
                        {new Date(job.deadline).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                    <span className="ml-auto text-[11px] text-zinc-400">
                      {new Date(job.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
