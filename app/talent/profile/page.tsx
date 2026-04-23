import type { Metadata } from "next";
import TalentProfileEdit from "@/features/talent/TalentProfileEdit";

export const metadata: Metadata = { title: "Meu perfil — BrisaHub" };

export default function TalentProfilePage() {
  return <TalentProfileEdit />;
}
