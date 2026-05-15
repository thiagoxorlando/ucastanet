import type { Metadata } from "next";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase";
import { brl } from "@/lib/brl";
import { getServerLang, getServerT } from "@/lib/i18n/server";
import { jobStatusLabel, jobStatusTone } from "@/lib/jobStatus";
import { getWorkspaceMembers } from "@/lib/premiumWorkspace.server";
import { requirePremiumWorkspacePageContext } from "@/lib/premiumWorkspaceApp.server";
import WorkspacePrivateInviteButton from "@/features/agency/WorkspacePrivateInviteButton";

export const metadata: Metadata = { title: "Vagas privadas — BrisaHub" };

export default async function WorkspaceJobsPage() {
  const context = await requirePremiumWorkspacePageContext();
  const [t, lang] = await Promise.all([getServerT(), getServerLang()]);
  const locale = lang === "en" ? "en-US" : "pt-BR";
  const supabase = createServerClient({ useServiceRole: true });

  const [members, jobsResult] = await Promise.all([
    getWorkspaceMembers(context.workspace.id),
    supabase
      .from("jobs")
      .select("id, title, visibility, status, budget, created_at, created_by_user_id, job_date")
      .eq("workspace_id", context.workspace.id)
      .order("created_at", { ascending: false }),
  ]);

  const jobs = jobsResult.data ?? [];
  const jobIds = jobs.map((job) => job.id);
  const creatorMap = new Map(members.map((member) => [member.userId, member.displayName || member.email]));

  const submissionsMap = new Map<string, number>();
  if (jobIds.length > 0) {
    const { data: submissions } = await supabase.from("submissions").select("job_id").in("job_id", jobIds);
    for (const row of submissions ?? []) {
      submissionsMap.set(row.job_id, (submissionsMap.get(row.job_id) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.8rem] font-bold tracking-tight text-zinc-950">{t("nav_workspace_jobs")}</h1>
          <p className="mt-1 text-[14px] text-zinc-500">
            {t("workspace_jobs_page_subtitle")}
          </p>
        </div>
        {/* Only owners can create workspace jobs.
            Agents have read access to all jobs in this list and manage rights over their own. */}
        {context.isOwner && (
          <Link
            href="/agency/post-job"
            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#1ABC9C] to-[#27C1D6] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_14px_28px_rgba(26,188,156,0.24)]"
          >
            {t("workspace_jobs_create_private")}
          </Link>
        )}
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-[28px] border border-zinc-200 bg-white px-6 py-10 text-center shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
          <p className="text-[15px] font-semibold text-zinc-900">{t("workspace_jobs_empty_title")}</p>
          <p className="mt-2 text-[13px] leading-6 text-zinc-500">
            {t("workspace_jobs_empty_description")}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => {
            const createdBy = creatorMap.get(job.created_by_user_id ?? "") ?? t("workspace_jobs_team_default");
            const isOwnJob = job.created_by_user_id === context.userId;

            return (
              <div key={job.id} className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-[18px] font-semibold text-zinc-950">{job.title}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${jobStatusTone(job.status ?? "open")}`}>
                        {jobStatusLabel(job.status ?? "open", context.lang)}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${job.visibility === "private_invite" ? "border border-violet-200 bg-violet-50 text-violet-700" : "border border-sky-200 bg-sky-50 text-sky-700"}`}>
                        {job.visibility === "private_invite" ? t("workspace_jobs_visibility_private") : t("workspace_jobs_visibility_public")}
                      </span>
                      {isOwnJob ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          {t("workspace_jobs_my_job")}
                        </span>
                      ) : !context.isOwner ? (
                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-500">
                          {t("workspace_jobs_team_badge")}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 grid gap-3 text-[13px] text-zinc-600 sm:grid-cols-2 xl:grid-cols-5">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{t("workspace_jobs_created_by")}</p>
                        <p className="mt-1 font-medium text-zinc-800">{createdBy}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{t("workspace_jobs_date")}</p>
                        <p className="mt-1 font-medium text-zinc-800">
                          {job.job_date ? new Date(`${job.job_date}T00:00:00`).toLocaleDateString(locale) : t("workspace_jobs_tbd")}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{t("workspace_jobs_budget")}</p>
                        <p className="mt-1 font-medium text-zinc-800">{job.budget != null ? brl(job.budget) : t("workspace_jobs_negotiable")}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{t("workspace_jobs_candidates")}</p>
                        <p className="mt-1 font-medium text-zinc-800">{submissionsMap.get(job.id) ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{t("workspace_jobs_created_at")}</p>
                        <p className="mt-1 font-medium text-zinc-800">{new Date(job.created_at ?? "").toLocaleDateString(locale)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/agency/workspace/jobs/${job.id}`}
                      className="inline-flex items-center rounded-xl border border-zinc-200 px-3 py-2 text-[12px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                    >
                      {t("workspace_jobs_view_detail")}
                    </Link>
                    {job.visibility === "private_invite" && (context.isOwner || isOwnJob) ? (
                      <WorkspacePrivateInviteButton jobId={job.id} />
                    ) : job.visibility === "private_invite" && !context.isOwner && !isOwnJob ? (
                      <span
                        title={t("workspace_jobs_invite_disabled_title")}
                        className="inline-flex cursor-not-allowed items-center rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 text-[12px] font-semibold text-zinc-400"
                      >
                        {t("workspace_private_invite")}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

