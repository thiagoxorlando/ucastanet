import { supabase } from "@/lib/supabase";

/**
 * Determines where a talent user should land after login.
 *
 * Route boundary rules:
 * - Portal-only talent: has an active premium_workspace_talents membership AND
 *   talent_profiles.marketplace_visible = false  → /talent/workspaces/[slug]
 * - Everyone else → /talent/dashboard
 *
 * Uses the browser (anon) Supabase client so it can be called from client
 * components (login page). RLS guarantees the queried rows belong to the caller.
 */
export async function getTalentLanding(userId?: string): Promise<string> {
  const id =
    userId ?? (await supabase.auth.getUser()).data.user?.id;

  if (!id) return "/talent/dashboard";

  const [portalRes, profileRes] = await Promise.all([
    supabase
      .from("premium_workspace_talents")
      .select("workspace_id")
      .eq("talent_user_id", id)
      .is("removed_at", null)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("talent_profiles")
      .select("marketplace_visible")
      .eq("id", id)
      .maybeSingle(),
  ]);

  // Talents with marketplace_visible=true always go to the open dashboard,
  // even when they also have a portal membership.
  const isPortalOnly =
    portalRes.data?.workspace_id != null &&
    profileRes.data?.marketplace_visible === false;

  if (!isPortalOnly) return "/talent/dashboard";

  const { data: workspace } = await supabase
    .from("premium_workspaces")
    .select("slug")
    .eq("id", portalRes.data!.workspace_id)
    .is("deleted_at", null)
    .eq("status", "active")
    .maybeSingle();

  if (workspace?.slug) {
    return `/talent/workspaces/${workspace.slug}`;
  }

  // Workspace exists but has no active slug — log and fall back.
  console.warn("[getTalentLanding] portal-only talent has no active workspace slug", { userId: id });
  return "/talent/dashboard";
}
