import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import TalentProfilePreview from "@/features/talent/TalentProfilePreview";
import { isMarketplaceVisibilitySchemaError } from "@/lib/talentMarketplace";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const supabase = createServerClient({ useServiceRole: true });
  const fetchProfile = async (requireMarketplaceVisibility: boolean) => {
    let query = supabase
      .from("talent_profiles")
      .select("full_name, bio")
      .eq("instagram", username);

    if (requireMarketplaceVisibility) {
      query = query.eq("marketplace_visible", true);
    }

    return query.maybeSingle();
  };

  let { data, error } = await fetchProfile(true);

  if (isMarketplaceVisibilitySchemaError(error)) {
    ({ data } = await fetchProfile(false));
  }

  if (!data) return { title: "Perfil nao encontrado - BrisaHub" };

  return {
    title: `${data.full_name ?? username} - BrisaHub`,
    description: data.bio ?? undefined,
  };
}

export default async function TalentProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = createServerClient({ useServiceRole: true });

  const fetchProfile = async (requireMarketplaceVisibility: boolean) => {
    let query = supabase
      .from("talent_profiles")
      .select("id, full_name, bio, city, country, categories, avatar_url, instagram, tiktok, youtube, gender, age, photo_front_url, photo_left_url, photo_right_url")
      .eq("instagram", username);

    if (requireMarketplaceVisibility) {
      query = query.eq("marketplace_visible", true);
    }

    return query.maybeSingle();
  };

  let { data, error } = await fetchProfile(true);

  if (isMarketplaceVisibilitySchemaError(error)) {
    ({ data } = await fetchProfile(false));
  }

  if (!data) notFound();
  return <TalentProfilePreview talent={data} />;
}
