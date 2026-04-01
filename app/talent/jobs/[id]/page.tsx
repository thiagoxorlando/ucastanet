import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import TalentJobDetail from "@/features/talent/TalentJobDetail";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = createServerClient({ useServiceRole: true });
  const { data } = await supabase.from("jobs").select("title").eq("id", id).single();
  return { title: data ? `${data.title} — ucastanet` : "Job — ucastanet" };
}

export default async function TalentJobDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = createServerClient({ useServiceRole: true });

  const { data } = await supabase
    .from("jobs")
    .select("id, title, description, category, budget, deadline")
    .eq("id", id)
    .single();

  const job = data
    ? {
        id:          String(data.id),
        title:       data.title       ?? "",
        description: data.description ?? "",
        category:    data.category    ?? "",
        budget:      data.budget      ?? 0,
        deadline:    data.deadline    ?? "",
      }
    : null;

  return <TalentJobDetail job={job} />;
}
