import { supabase } from "@/lib/supabase";

/**
 * Determines where an agency user should land after login.
 * - Has any jobs → /agency/dashboard (primary agency home)
 * - Neither      → /agency/first-job (first login only)
 */
export async function getAgencyLanding(userId?: string): Promise<string> {
  const id =
    userId ?? (await supabase.auth.getUser()).data.user?.id;

  if (!id) return "/agency/first-job";

  const { count: jobCount } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", id);

  if (jobCount  && jobCount  > 0) return "/agency/dashboard";
  return "/agency/first-job";
}
