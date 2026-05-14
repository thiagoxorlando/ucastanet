import { createServerClient } from "@/lib/supabase";

export async function getPortalOnlyHome(userId: string): Promise<string | null> {
  const supabase = createServerClient({ useServiceRole: true });

  const [portalRes, profileRes] = await Promise.all([
    supabase
      .from("premium_workspace_talents")
      .select("workspace_id")
      .eq("talent_user_id", userId)
      .is("removed_at", null)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("talent_profiles")
      .select("marketplace_visible")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (
    !portalRes.data?.workspace_id ||
    profileRes.data?.marketplace_visible !== false
  ) {
    return null;
  }

  const { data: workspace } = await supabase
    .from("premium_workspaces")
    .select("slug")
    .eq("id", portalRes.data.workspace_id)
    .is("deleted_at", null)
    .eq("status", "active")
    .maybeSingle();

  return workspace?.slug ? `/talent/workspaces/${workspace.slug}` : null;
}
