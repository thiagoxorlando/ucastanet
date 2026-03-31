import type { Metadata } from "next";
import AgencyDashboardOverview from "@/features/agency/AgencyDashboardOverview";

export const metadata: Metadata = { title: "Dashboard — ucastanet" };

export default function AgencyDashboardPage() {
  return <AgencyDashboardOverview />;
}
