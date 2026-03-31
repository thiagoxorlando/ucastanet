import { redirect } from "next/navigation";

// Moved to /agency/create
export default function LegacyCreatePage() {
  redirect("/agency/create");
}
