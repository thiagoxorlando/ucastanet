import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { brl } from "@/lib/brl";
import { submissionStatusLabel, submissionStatusTone } from "@/lib/submissionStatus";

export const metadata: Metadata = { title: "Reservas — BrisaHub" };

type Props = { params: Promise<{ workspaceSlug: string }> };

const STATUS_ORDER: Record<string, number> = {
  approved: 0,
  pending:  1,
  rejected: 2,
};

export default async function WorkspaceApplicationsPage({ params }: Props) {
  const { workspaceSlug } = await params;

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) notFound();

  const supabase = createServerClient({ useServiceRole: true });

  const { data: workspace } = await supabase
    .from("premium_workspaces")
    .select("id, name, brand_primary_color, brand_accent_color")
    .eq("slug", workspaceSlug)
    .is("deleted_at", null)
    .eq("status", "active")
    .maybeSingle();

  if (!workspace) notFound();

  const { data: allJobs } = await supabase
    .from("jobs")
    .select("id, title, budget, job_date, location, visibility, status")
    .eq("workspace_id", workspace.id);

  const workspaceJobIds = (allJobs ?? []).map((j) => j.id);
  const jobMap = new Map((allJobs ?? []).map((j) => [String(j.id), j]));

  const { data: submissionRows } = workspaceJobIds.length
    ? await supabase
        .from("submissions")
        .select("id, job_id, status, created_at, bio, mode")
        .eq("talent_user_id", user.id)
        .in("job_id", workspaceJobIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const submissions = (submissionRows ?? []).sort((a, b) => {
    const ao = STATUS_ORDER[String(a.status)] ?? 9;
    const bo = STATUS_ORDER[String(b.status)] ?? 9;
    if (ao !== bo) return ao - bo;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const pending  = submissions.filter((s) => s.status === "pending");
  const approved = submissions.filter((s) => s.status === "approved");
  const rejected = submissions.filter((s) => s.status === "rejected");

  const primary = (workspace.brand_primary_color as string | null) ?? "#1ABC9C";
  const accent  = (workspace.brand_accent_color  as string | null) ?? "#27C1D6";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.3rem] font-bold text-zinc-950">Reservas</h1>
        <p className="mt-0.5 text-[13px] text-zinc-500">
          Suas candidaturas às vagas privadas de{" "}
          <span className="font-medium">{workspace.name as string}</span>.
        </p>
      </div>

      {/* Summary badges */}
      {submissions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[12px] font-medium text-zinc-600">
            {submissions.length} total
          </span>
          {approved.length > 0 && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[12px] font-medium text-emerald-700">
              {approved.length} aprovada{approved.length !== 1 ? "s" : ""}
            </span>
          )}
          {pending.length > 0 && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[12px] font-medium text-amber-700">
              {pending.length} em análise
            </span>
          )}
          {rejected.length > 0 && (
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[12px] font-medium text-zinc-500">
              {rejected.length} não selecionada{rejected.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Empty state */}
      {submissions.length === 0 && (
        <div className="rounded-[22px] border border-zinc-200 bg-white px-6 py-12 text-center">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: `linear-gradient(135deg, ${primary}20, ${accent}10)` }}
          >
            <svg className="h-5 w-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-[14px] font-semibold text-zinc-600">Nenhuma reserva ainda.</p>
          <p className="mt-1 text-[13px] text-zinc-400">
            Candidate-se às{" "}
            <Link href={`/talent/workspaces/${workspaceSlug}/jobs`} className="font-medium text-zinc-700 hover:underline">
              vagas privadas
            </Link>{" "}
            desta agência.
          </p>
        </div>
      )}

      {/* Submissions list */}
      {submissions.length > 0 && (
        <ul className="flex flex-col gap-3">
          {submissions.map((sub) => {
            const job   = jobMap.get(String(sub.job_id));
            const label = submissionStatusLabel(String(sub.status));
            const tone  = submissionStatusTone(String(sub.status));
            const isApproved = sub.status === "approved";
            const isPending  = sub.status === "pending";

            return (
              <li key={sub.id}>
                <div className={`overflow-hidden rounded-[20px] border bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)] ${
                  isApproved ? "border-emerald-200" : "border-zinc-200"
                }`}>
                  {/* Top accent stripe for approved */}
                  {isApproved && (
                    <div className="h-[3px]" style={{ background: `linear-gradient(to right, ${primary}, ${accent})` }} />
                  )}
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold text-zinc-900 truncate">
                          {job?.title ?? "Vaga"}
                        </p>
                        {job?.job_date && (
                          <p className="mt-0.5 text-[12px] text-zinc-500">
                            Data:{" "}
                            {new Date(`${job.job_date}T00:00:00`).toLocaleDateString("pt-BR", {
                              weekday: "short", day: "numeric", month: "short",
                            })}
                          </p>
                        )}
                      </div>
                      <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
                        {label}
                      </span>
                    </div>

                    {/* Meta row */}
                    <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-zinc-500">
                      {job?.budget != null && (
                        <span>
                          <span className="font-medium text-zinc-700">Cachê:</span>{" "}
                          {brl(job.budget)}
                        </span>
                      )}
                      {job?.location && (
                        <span>
                          <span className="font-medium text-zinc-700">Local:</span>{" "}
                          {job.location}
                        </span>
                      )}
                      <span className="text-zinc-400">
                        Candidatou-se em{" "}
                        {new Date(sub.created_at).toLocaleDateString("pt-BR", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </span>
                    </div>

                    {/* Status context */}
                    {isPending && (
                      <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                        <p className="text-[12px] text-amber-700">
                          Sua candidatura está em análise. A agência entrará em contato se selecionada.
                        </p>
                      </div>
                    )}
                    {isApproved && (
                      <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                        <p className="text-[12px] text-emerald-700">
                          Candidatura aprovada. Aguarde o envio do contrato pela agência.
                        </p>
                      </div>
                    )}

                    {/* Footer actions */}
                    {job?.id && (
                      <div className="mt-4 flex justify-end">
                        <Link
                          href={`/talent/workspaces/${workspaceSlug}/jobs/${job.id}`}
                          className="text-[12px] font-medium text-zinc-500 transition-colors hover:text-zinc-800"
                        >
                          Ver vaga →
                        </Link>
                      </div>
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
