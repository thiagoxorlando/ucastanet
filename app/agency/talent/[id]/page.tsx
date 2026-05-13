import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AgencyTalentProfile from "@/features/agency/AgencyTalentProfile";
import { createServerClient } from "@/lib/supabase";
import { isMarketplaceVisibilitySchemaError } from "@/lib/talentMarketplace";

export const metadata: Metadata = { title: "Perfil do talento — BrisaHub" };

export default async function AgencyTalentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerClient({ useServiceRole: true });

  const fetchTalent = async (requireMarketplaceVisibility: boolean) => {
    let query = supabase
      .from("talent_profiles")
      .select("*")
      .eq("id", id);

    if (requireMarketplaceVisibility) {
      query = query.eq("marketplace_visible", true);
    }

    return query.maybeSingle();
  };

  let [
    { data: talent, error: talentError },
    { data: jobs },
    { data: submissions },
    { count: completedJobsCount },
  ] = await Promise.all([
    fetchTalent(true),
    supabase
      .from("jobs")
      .select("id, title")
      .eq("status", "open")
      .order("created_at", { ascending: false }),
    supabase
      .from("submissions")
      .select("job_id")
      .eq("talent_user_id", id),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("talent_user_id", id)
      .in("status", ["paid", "completed", "confirmed"])
      .is("deleted_at", null),
  ]);

  if (isMarketplaceVisibilitySchemaError(talentError)) {
    ({ data: talent, error: talentError } = await fetchTalent(false));
  }

  if (!talent) notFound();

  const appliedJobIds = (submissions ?? []).map((s: { job_id: string }) => s.job_id);

  return (
    <AgencyTalentProfile
      talent={talent}
      jobs={jobs ?? []}
      appliedJobIds={appliedJobIds}
      completedJobsCount={completedJobsCount ?? 0}
    />
  );
}
