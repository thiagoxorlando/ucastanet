import { supabase } from "@/lib/supabase";

/**
 * Determines where an agency user should land after login.
 * - Active workspace agent → /agency/workspace
 * - Has any jobs → /agency/dashboard (primary agency home)
 * - Neither      → /agency/first-job (first login only)
 */
export async function getAgencyLanding(userId?: string): Promise<string> {
  const id =
    userId ?? (await supabase.auth.getUser()).data.user?.id;

  if (!id) return "/agency/first-job";

  // Workspace agents (invited, role=agent) have no open-platform access.
  const { data: agentMembership } = await supabase
    .from("premium_workspace_members")
    .select("role")
    .eq("user_id", id)
    .eq("role", "agent")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (agentMembership) return "/agency/workspace";

  const { count: jobCount } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", id);

  if (jobCount  && jobCount  > 0) return "/agency/dashboard";
  return "/agency/first-job";
}
