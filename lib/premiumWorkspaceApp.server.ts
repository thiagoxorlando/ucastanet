import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import {
  ensurePremiumWorkspaceForAgency,
  getUserPremiumWorkspace,
  type PremiumMembership,
  type PremiumWorkspace,
} from "@/lib/premiumWorkspace.server";
import { resolveLang, type Lang } from "@/lib/i18n";

export type PremiumWorkspacePageContext = {
  userId: string;
  lang: Lang;
  workspace: PremiumWorkspace;
  membership: PremiumMembership;
  isOwner: boolean;
};

export async function requirePremiumWorkspacePageContext(): Promise<PremiumWorkspacePageContext> {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) redirect("/login");

  const supabase = createServerClient({ useServiceRole: true });
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, role, language_preference")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "agency") {
    redirect("/agency/dashboard");
  }

  let access = await getUserPremiumWorkspace(user.id);
  if (!access && profile.plan === "premium") {
    access = await ensurePremiumWorkspaceForAgency(user.id);
  }

  if (!access || access.membership.status !== "active" || access.workspace.status !== "active") {
    redirect("/agency/workspace");
  }

  return {
    userId: user.id,
    lang: resolveLang(profile.language_preference),
    workspace: access.workspace,
    membership: access.membership,
    isOwner: access.membership.role === "owner",
  };
}
