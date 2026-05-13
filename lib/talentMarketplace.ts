import { createServerClient } from "@/lib/supabase";

type AdminSupabaseClient = ReturnType<typeof createServerClient>;

export function isWorkspacePortalPath(path: string | null | undefined) {
  return Boolean(path && /^\/talent\/workspaces\/[^/]+/.test(path));
}

export function isMarketplaceVisibilitySchemaError(error: { message?: string | null } | null | undefined) {
  return Boolean(error?.message?.includes("marketplace_visible"));
}

export async function ensurePortalTalentMarketplacePrivacy(
  supabase: AdminSupabaseClient,
  userId: string,
) {
  const { data: talentProfile } = await supabase
    .from("talent_profiles")
    .select("id, full_name, marketplace_visible")
    .eq("id", userId)
    .maybeSingle();

  if (!talentProfile) {
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

  const hasCompletedProfile = Boolean(String(talentProfile.full_name ?? "").trim());
  if (!hasCompletedProfile && talentProfile.marketplace_visible !== false) {
    await supabase
      .from("talent_profiles")
      .update({ marketplace_visible: false, deleted_at: null })
      .eq("id", userId);
  }
}
