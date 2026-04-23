import type { Metadata } from "next";
import TalentProfileForm from "@/features/talent/TalentProfileForm";

export const metadata: Metadata = {
  title: "Criar perfil — BrisaHub",
};

export default function CreateProfilePage() {
  return <TalentProfileForm />;
}
