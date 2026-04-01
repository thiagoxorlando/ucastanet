import type { Metadata } from "next";
import AgencyFinances from "@/features/agency/AgencyFinances";

export const metadata: Metadata = { title: "Finances — ucastanet" };

export default function AgencyFinancesPage() {
  return <AgencyFinances />;
}
