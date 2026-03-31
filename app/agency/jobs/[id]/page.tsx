import type { Metadata } from "next";
import JobDetail from "@/features/agency/JobDetail";
import { createServerClient } from "@/lib/supabase";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = createServerClient({ useServiceRole: true });
  const { data } = await supabase.from("jobs").select("title").eq("id", id).single();
  return { title: data ? `${data.title} — ucastanet` : "Job Not Found — ucastanet" };
}

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = createServerClient({ useServiceRole: true });

  const [{ data: jobData }, { data: submissionsData }] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, description, category, budget, deadline, created_at")
      .eq("id", id)
      .single(),
    supabase
      .from("submissions")
      .select("id, talent_name, bio, status, mode, created_at")
      .eq("job_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const job = jobData
    ? {
        id:          String(jobData.id),
        title:       jobData.title       ?? "",
        description: jobData.description ?? "",
        category:    jobData.category    ?? "",
        budget:      jobData.budget      ?? 0,
        deadline:    jobData.deadline    ?? "",
        status:      "open" as const,
        postedAt:    jobData.created_at  ?? "",
      }
    : null;

  const submissions = (submissionsData ?? []).map((s) => ({
    id:          String(s.id),
    talentName:  s.talent_name ?? "",
    bio:         s.bio         ?? "",
    status:      s.status      ?? "pending",
    mode:        s.mode        ?? "self",
    submittedAt: s.created_at  ?? "",
  }));

  return <JobDetail job={job} submissions={submissions} />;
}
