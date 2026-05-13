import type { Metadata } from "next";
import TalentGrid from "@/features/agency/TalentGrid";
import TalentList from "@/features/agency/TalentList";
import TalentViewToggle from "@/features/agency/TalentViewToggle";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";

export const metadata: Metadata = { title: "Talentos — BrisaHub" };

export default async function AgencyTalentPage() {
  const supabase = createServerClient({ useServiceRole: true });

  // Resolve agency user so we can exclude portal-only talents
  let portalOnlyUserIds: string[] = [];
  try {
    const session = await createSessionClient();
    const { data: { user } } = await session.auth.getUser();
    if (user) {
      // Find this agency's workspace (may not exist for non-Premium agencies)
      const { data: workspace } = await supabase
        .from("premium_workspaces")
        .select("id")
        .eq("agency_user_id", user.id)
        .is("deleted_at", null)
        .maybeSingle();

      if (workspace) {
        const { data: portalRows } = await supabase
          .from("premium_workspace_talents")
          .select("talent_user_id")
          .eq("workspace_id", workspace.id)
          .is("removed_at", null);

        portalOnlyUserIds = (portalRows ?? []).map((r) => String(r.talent_user_id));
      }
    }
  } catch { /* unauthenticated or no workspace */ }

  let query = supabase
    .from("talent_profiles")
    .select("id, full_name, bio, country, city, categories, avatar_url, photo_front_url, gender, age, instagram")
    .is("deleted_at", null)
    .order("full_name");

  if (portalOnlyUserIds.length > 0) {
    query = query.not("user_id", "in", `(${portalOnlyUserIds.join(",")})`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[AgencyTalentPage]", error.message);
  }

  const talent = data ?? [];

  return (
    <TalentViewToggle
      gridView={<TalentGrid talent={talent} />}
      listView={<TalentList talent={talent} />}
      totalCount={talent.length}
    />
  );
}
