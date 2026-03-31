import type { Metadata } from "next";
import JobList from "@/features/agency/JobList";
import { createServerClient } from "@/lib/supabase";

export const metadata: Metadata = { title: "Jobs — ucastanet" };

export default async function JobsPage() {
  const supabase = createServerClient({ useServiceRole: true });

  const { data, error } = await supabase
    .from("jobs")
    .select("id, title, category, budget, deadline, description, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[JobsPage] Failed to fetch jobs:", error.message);
  }

  const jobs = (data ?? []).map((row) => ({
    id:          String(row.id),
    title:       row.title       ?? "",
    category:    row.category    ?? "",
    budget:      row.budget      ?? 0,
    deadline:    row.deadline    ?? "",
    description: row.description ?? "",
    status:      "open" as const,
    applicants:  0,
    postedAt:    row.created_at  ?? "",
  }));

  return <JobList jobs={jobs} />;
}
