import type { Metadata } from "next";
import SetupProfile from "@/features/onboarding/SetupProfile";

export const metadata: Metadata = { title: "Set Up Profile — ucastanet" };

export default function SetupProfilePage() {
  return <SetupProfile />;
}
