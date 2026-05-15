import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSessionClient } from "@/lib/supabase.server";
import { createServerClient } from "@/lib/supabase";
import DashboardShell from "@/components/layout/DashboardShell";
import type { WorkspacePortalData } from "@/lib/WorkspacePortalContext";

export default async function TalentLayout({ children }: { children: React.ReactNode }) {
  // ── Auth check ───────────────────────────────────────────────────────────────
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) redirect("/login");

  // ── Onboarding gate ──────────────────────────────────────────────────────────
  const supabase = createServerClient({ useServiceRole: true });
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarding_completed")
    .eq("id", user.id)
    .single();

  // Wrong role — shouldn't be on a talent route
  if (profile?.role && profile.role !== "talent") {
    redirect(`/${profile.role}/dashboard`);
  }

  // Onboarding gate — only redirect genuinely new accounts
  if (!profile?.onboarding_completed) {
    // Check if they already have a talent profile (pre-existing account)
    const { data: existing } = await supabase
      .from("talent_profiles")
      .select("id, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (existing?.full_name) {
      // Existing account — silently mark onboarding complete and let through
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id);
    } else {
      // Genuinely new account without a profile — redirect to setup
      redirect("/setup-profile");
    }
  }

  // ── Portal-only talent gate ──────────────────────────────────────────────────
  // A talent is portal-only if they have an active premium_workspace_talents row
  // AND marketplace_visible = false. Open-marketplace talents (marketplace_visible = true)
  // are never redirected, even if they also have a workspace membership.
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  if (!pathname.startsWith("/talent/workspaces/")) {
    const [portalRes, profileRes] = await Promise.all([
      supabase
        .from("premium_workspace_talents")
        .select("workspace_id")
        .eq("talent_user_id", user.id)
        .is("removed_at", null)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("talent_profiles")
        .select("marketplace_visible")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    const isPortalOnly =
      portalRes.data?.workspace_id != null &&
      profileRes.data?.marketplace_visible === false;

    if (isPortalOnly) {
      const { data: workspace } = await supabase
        .from("premium_workspaces")
        .select("slug")
        .eq("id", portalRes.data!.workspace_id)
        .is("deleted_at", null)
        .eq("status", "active")
        .maybeSingle();

      if (workspace?.slug) {
        redirect(`/talent/workspaces/${workspace.slug}`);
      }
    }
  }

  let initialWorkspacePortal: WorkspacePortalData | null = null;
  const workspaceSlug = pathname.match(/^\/talent\/workspaces\/([^/]+)/)?.[1] ?? null;

  if (workspaceSlug) {
    const { data: workspace } = await supabase
      .from("premium_workspaces")
      .select("slug, name, logo_url, brand_primary_color, brand_accent_color")
      .eq("slug", workspaceSlug)
      .is("deleted_at", null)
      .eq("status", "active")
      .maybeSingle();

    if (workspace) {
      initialWorkspacePortal = {
        slug:         workspace.slug,
        name:         workspace.name,
        logoUrl:      (workspace.logo_url as string | null) ?? null,
        primaryColor: (workspace.brand_primary_color as string | null) ?? "#1ABC9C",
        accentColor:  (workspace.brand_accent_color as string | null) ?? "#27C1D6",
        mode:         "talent" as const,
      };
    }
  }

  return <DashboardShell initialWorkspacePortal={initialWorkspacePortal}>{children}</DashboardShell>;
}
