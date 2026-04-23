import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase.server";
import { createServerClient } from "@/lib/supabase";
import SetupProfile from "@/features/onboarding/SetupProfile";

export const metadata: Metadata = { title: "Configurar perfil — BrisaHub" };

export default async function SetupProfilePage() {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();

  if (!user) redirect("/login");

  const supabase = createServerClient({ useServiceRole: true });
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarding_completed")
    .eq("id", user.id)
    .single();

  // Already onboarded — send them straight to their dashboard
  if (profile?.onboarding_completed) {
    redirect(`/${profile.role}/dashboard`);
  }

  return <SetupProfile />;
}
