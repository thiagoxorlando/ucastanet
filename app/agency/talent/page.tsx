import type { Metadata } from "next";
import TalentGrid from "@/features/agency/TalentGrid";

export const metadata: Metadata = { title: "Talent — ucastanet" };

export default function AgencyTalentPage() {
  return <TalentGrid />;
}
