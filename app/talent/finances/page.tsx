import type { Metadata } from "next";
import TalentFinances from "@/features/talent/TalentFinances";

export const metadata: Metadata = { title: "Finances — ucastanet" };

export default function TalentFinancesPage() {
  return <TalentFinances />;
}
