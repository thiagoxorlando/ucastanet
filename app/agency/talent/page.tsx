import type { Metadata } from "next";
import TalentGrid from "@/features/agency/TalentGrid";
import TalentList from "@/features/agency/TalentList";
import TalentViewToggle from "@/features/agency/TalentViewToggle";
import { createServerClient } from "@/lib/supabase";
import { isMarketplaceVisibilitySchemaError } from "@/lib/talentMarketplace";

export const metadata: Metadata = { title: "Talentos - BrisaHub" };

export default async function AgencyTalentPage() {
  const supabase = createServerClient({ useServiceRole: true });

  const baseQuery = () =>
    supabase
      .from("talent_profiles")
      .select("id, full_name, bio, country, city, categories, avatar_url, photo_front_url, gender, age, instagram")
      .is("deleted_at", null)
      .order("full_name");

  let { data, error } = await baseQuery().eq("marketplace_visible", true);

  if (isMarketplaceVisibilitySchemaError(error)) {
    ({ data, error } = await baseQuery());
  }

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
