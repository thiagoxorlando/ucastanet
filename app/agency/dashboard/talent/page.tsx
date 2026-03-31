import { redirect } from "next/navigation";

// Moved to /agency/talent
export default function LegacyTalentPage() {
  redirect("/agency/talent");
}
