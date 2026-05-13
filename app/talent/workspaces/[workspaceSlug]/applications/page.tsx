import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { brl } from "@/lib/brl";
import { submissionStatusLabel, submissionStatusTone } from "@/lib/submissionStatus";

export const metadata: Metadata = { title: "Candidaturas — BrisaHub" };

type Props = { params: Promise<{ workspaceSlug: string }> };

export default async function WorkspaceApplicationsPage({ params }: Props) {
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

  // All workspace jobs (any status)
  const { data: allJobs } = await supabase
    .from("jobs")
    .select("id, title, budget, visibility")
    .eq("workspace_id", workspace.id);

  const workspaceJobIds = (allJobs ?? []).map((j) => j.id);
  const jobMap = new Map((allJobs ?? []).map((j) => [String(j.id), j]));

  const { data: submissionRows } = workspaceJobIds.length
    ? await supabase
        .from("submissions")
        .select("id, job_id, status, created_at")
        .eq("talent_user_id", user.id)
        .in("job_id", workspaceJobIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const submissions = submissionRows ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[1.3rem] font-bold text-zinc-950">Candidaturas</h1>
        <p className="mt-0.5 text-[13px] text-zinc-500">
          Suas candidaturas às vagas desta agência.
        </p>
      </div>

      {submissions.length === 0 ? (
        <div className="rounded-[22px] border border-zinc-200 bg-white px-6 py-12 text-center">
          <p className="text-[14px] font-semibold text-zinc-600">Nenhuma candidatura ainda.</p>
          <p className="mt-1 text-[13px] text-zinc-400">
            Candidate-se às{" "}
            <Link href={`/talent/workspaces/${workspaceSlug}/jobs`} className="font-medium text-zinc-700 hover:underline">
              vagas privadas
            </Link>{" "}
            desta agência.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {submissions.map((sub) => {
            const job = jobMap.get(String(sub.job_id));
            const label = submissionStatusLabel(String(sub.status));
            const tone  = submissionStatusTone(String(sub.status));
            return (
              <li key={sub.id}>
                <div className="rounded-[20px] border border-zinc-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[14px] font-semibold text-zinc-900 truncate">
                      {job?.title ?? "Vaga"}
                    </p>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
                      {label}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-[12px] text-zinc-500">
                    {job?.budget != null && (
                      <span><span className="font-medium text-zinc-700">Cachê:</span> {brl(job.budget)}</span>
                    )}
                    <span>
                      {new Date(sub.created_at).toLocaleDateString("pt-BR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {job?.id && (
                      <Link
                        href={`/talent/jobs/${job.id}`}
                        className="ml-auto text-[12px] font-medium text-zinc-500 hover:text-zinc-700"
                      >
                        Ver vaga →
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
