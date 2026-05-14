/**
 * Server-only access boundary helpers for Premium workspace route guarding.
 *
 * Import ONLY in Server Components, layouts, and Route Handlers.
 * Uses the service-role client — never expose to client components.
 *
 * Source-of-truth for each access class:
 *   Private Agent    → premium_workspace_members WHERE role='agent' AND status='active'
 *   Portal Talent    → premium_workspace_talents (removed_at IS NULL)
 *                      AND talent_profiles.marketplace_visible = false
 *   Workspace Owner  → premium_workspace_members WHERE role='owner'
 *                      (or premium_workspaces.owner_user_id)
 *
 * These helpers intentionally avoid reading profiles.plan — plan membership
 * is not the source of truth for workspace access boundaries.
 */
import { createServerClient } from "@/lib/supabase";

function db() {
  return createServerClient({ useServiceRole: true });
}

// ─────────────────────────────────────────────────────────────
// Classification helpers
// ─────────────────────────────────────────────────────────────

/**
 * Returns true if the user is an invited workspace agent (not the owner).
 * Private agents must be blocked from all open-platform agency routes.
 * Source of truth: premium_workspace_members, NOT profiles.plan.
 */
export async function isPrivateAgentOnly(userId: string): Promise<boolean> {
  const { data } = await db()
    .from("premium_workspace_members")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "agent")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  return data != null;
}

/**
 * Returns true if the talent is portal-only.
 * Portal-only = active premium_workspace_talents membership AND marketplace_visible=false.
 * Talents with marketplace_visible=true have open-platform access even if they
 * also belong to a workspace portal.
 */
export async function isPortalOnlyTalent(userId: string): Promise<boolean> {
  const [portalRes, profileRes] = await Promise.all([
    db()
      .from("premium_workspace_talents")
      .select("workspace_id")
      .eq("talent_user_id", userId)
      .is("removed_at", null)
      .limit(1)
      .maybeSingle(),
    db()
      .from("talent_profiles")
      .select("marketplace_visible")
      .eq("id", userId)
      .maybeSingle(),
  ]);
  return (
    portalRes.data?.workspace_id != null &&
    profileRes.data?.marketplace_visible === false
  );
}

// ─────────────────────────────────────────────────────────────
// Redirect helpers
// ─────────────────────────────────────────────────────────────

/**
 * Private agents always redirect to the Premium workspace hub.
 * Synchronous — no DB call needed.
 */
export function getPrivateAgentRedirect(): string {
  return "/agency/workspace";
}

/**
 * Returns the redirect destination for a portal-only talent.
 * Fetches their first active workspace slug. Falls back to /talent/dashboard
 * with a server-side warning if no active workspace exists.
 */
export async function getPortalOnlyTalentRedirect(userId: string): Promise<string> {
  const { data: portalRow } = await db()
    .from("premium_workspace_talents")
    .select("workspace_id")
    .eq("talent_user_id", userId)
    .is("removed_at", null)
    .limit(1)
    .maybeSingle();

  if (!portalRow?.workspace_id) {
    console.warn("[getPortalOnlyTalentRedirect] no workspace found for portal talent", { userId });
    return "/talent/dashboard";
  }

  const { data: workspace } = await db()
    .from("premium_workspaces")
    .select("slug")
    .eq("id", portalRow.workspace_id)
    .is("deleted_at", null)
    .eq("status", "active")
    .maybeSingle();

  if (workspace?.slug) return `/talent/workspaces/${workspace.slug}`;

  console.warn("[getPortalOnlyTalentRedirect] workspace has no active slug", {
    userId,
    workspaceId: portalRow.workspace_id,
  });
  return "/talent/dashboard";
}

// ─────────────────────────────────────────────────────────────
// Composite helper
// ─────────────────────────────────────────────────────────────

/**
 * Returns the user's workspace access class.
 *
 * "owner"        → owns a premium workspace (full access: open + workspace)
 * "agent"        → invited Private Agent (workspace-only, no open platform)
 * "portal_talent"→ portal-only talent (marketplace_visible=false)
 * null           → regular open-platform user with no workspace boundary
 */
export async function getUserWorkspaceRole(
  userId: string,
  userRole: "agency" | "talent" | "admin"
): Promise<"owner" | "agent" | "portal_talent" | null> {
  if (userRole === "admin") return null;

  if (userRole === "agency") {
    const { data } = await db()
      .from("premium_workspace_members")
      .select("role")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (data?.role === "owner") return "owner";
    if (data?.role === "agent") return "agent";
    return null;
  }

  // talent
  const portalOnly = await isPortalOnlyTalent(userId);
  return portalOnly ? "portal_talent" : null;
}
