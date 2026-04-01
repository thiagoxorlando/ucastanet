import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import TalentJobList from "@/features/talent/TalentJobList";

export const metadata: Metadata = { title: "Jobs — ucastanet" };

export default async function TalentJobsPage() {
  const supabase = createServerClient({ useServiceRole: true });

  const { data, error } = await supabase
    .from("jobs")
    .select("id, title, category, budget, deadline, description")
    .order("created_at", { ascending: false });

  if (error) console.error("[TalentJobsPage]", error.message);

  const jobs = (data ?? []).map((row) => ({
    id:          String(row.id),
    title:       row.title       ?? "",
    category:    row.category    ?? "",
    budget:      row.budget      ?? 0,
    deadline:    row.deadline    ?? "",
    description: row.description ?? "",
  }));

  return <TalentJobList jobs={jobs} />;
}
