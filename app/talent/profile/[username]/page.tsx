import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { mockTalent } from "@/lib/mockData";
import TalentProfilePreview from "@/features/talent/TalentProfilePreview";

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const talent = mockTalent.find((t) => t.username === username);
  if (!talent) return { title: "Profile not found — ucastanet" };
  return {
    title: `${talent.name} (@${talent.username}) — ucastanet`,
    description: talent.bio,
  };
}

export default async function TalentProfilePage({ params }: Props) {
  const { username } = await params;
  const talent = mockTalent.find((t) => t.username === username);
  if (!talent) notFound();
  return <TalentProfilePreview talent={talent} />;
}
