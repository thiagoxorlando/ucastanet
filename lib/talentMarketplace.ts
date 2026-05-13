import { createServerClient } from "@/lib/supabase";

type AdminSupabaseClient = ReturnType<typeof createServerClient>;

type TalentVisibilityRow = {
  id: string;
  user_id: string | null;
  marketplace_visible: boolean | null;
};

export function getTalentAuthUserId(talent: Pick<TalentVisibilityRow, "id" | "user_id">) {
  return String(talent.user_id ?? talent.id);
}

export async function ensurePortalTalentMarketplacePrivacy(
  supabase: AdminSupabaseClient,
  userId: string,
) {
  const { data: talentProfiles } = await supabase
    .from("talent_profiles")
    .select("id, user_id, full_name, marketplace_visible")
    .or(`id.eq.${userId},user_id.eq.${userId}`);

  if (!talentProfiles || talentProfiles.length === 0) {
    await supabase.from("talent_profiles").upsert(
      {
        id: userId,
        user_id: userId,
        deleted_at: null,
        marketplace_visible: false,
      },
      { onConflict: "id" },
    );
    return;
  }

  for (const talentProfile of talentProfiles) {
    const hasCompletedProfile = Boolean(String(talentProfile.full_name ?? "").trim());
    if (!hasCompletedProfile && talentProfile.marketplace_visible !== false) {
      await supabase
        .from("talent_profiles")
        .update({ marketplace_visible: false, deleted_at: null })
        .eq("id", talentProfile.id);
    }
  }
}

export async function canViewerAccessTalentProfile(
  supabase: AdminSupabaseClient,
  talent: TalentVisibilityRow,
  viewerId: string | null,
) {
  if (talent.marketplace_visible) return true;
  if (!viewerId) return false;

  const talentAuthUserId = getTalentAuthUserId(talent);
  if (viewerId === talentAuthUserId) return true;

  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", viewerId)
    .maybeSingle();

  if (viewerProfile?.role === "admin") return true;

  const { data: workspaceRows } = await supabase
    .from("premium_workspace_talents")
    .select("workspace_id")
    .eq("talent_user_id", talentAuthUserId)
    .eq("status", "active")
    .is("removed_at", null);

  const workspaceIds = [...new Set((workspaceRows ?? []).map((row) => String(row.workspace_id)))];
  if (workspaceIds.length === 0) return false;

  const [memberAccess, portalAccess] = await Promise.all([
    supabase
      .from("premium_workspace_members")
      .select("id")
      .eq("user_id", viewerId)
      .eq("status", "active")
      .in("workspace_id", workspaceIds)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("premium_workspace_talents")
      .select("id")
      .eq("talent_user_id", viewerId)
      .eq("status", "active")
      .is("removed_at", null)
      .in("workspace_id", workspaceIds)
      .limit(1)
      .maybeSingle(),
  ]);

  return Boolean(memberAccess.data || portalAccess.data);
}
