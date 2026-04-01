import type { Metadata } from "next";
import TalentProfileEdit from "@/features/talent/TalentProfileEdit";

export const metadata: Metadata = { title: "My Profile — ucastanet" };

export default function TalentProfilePage() {
  return <TalentProfileEdit />;
}
