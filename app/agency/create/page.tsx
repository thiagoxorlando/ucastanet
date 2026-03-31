import type { Metadata } from "next";
import CreateTalentForm from "@/features/agency/CreateTalentForm";

export const metadata: Metadata = { title: "Create Talent — ucastanet" };

export default function AgencyCreatePage() {
  return <CreateTalentForm />;
}
