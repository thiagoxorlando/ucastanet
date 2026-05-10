import type { Metadata } from "next";
import SupportPage from "@/features/support/SupportPage";

export const metadata: Metadata = { title: "Suporte — BrisaHub" };

export default function TalentSupportPage() {
  return <SupportPage />;
}
