import type { Metadata } from "next";
import TalentList from "@/features/agency/TalentList";

export const metadata: Metadata = { title: "Talent — ucastanet" };

export default function AgencyTalentPage() {
  return <TalentList />;
}
