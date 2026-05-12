/**
 * Server-only helpers for Premium workspace membership and seat management.
 * All functions use the service-role client — import only in Server Components
 * and Route Handlers, never in client components.
 */
import { createServerClient } from "@/lib/supabase";

// -- Types -------------------------------------------------------------------

export type PremiumWorkspace = {
  id: string;
  ownerUserId: string;
  agencyId: string | null;
  name: string;
  slug: string | null;
  logoUrl: string | null;
  brandPrimaryColor: string | null;
  brandAccentColor: string | null;
  welcomeMessage: string | null;
  status: string;
  includedAgentSeats: number;
  extraAgentSeats: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type PremiumMembership = {
  id: string;
  workspaceId: string;
  userId: string;
  role: "owner" | "agent";
  status: string;
  spendingLimit: number | null;
  createdAt: string;
};

export type WorkspaceSeatUsage = {
  activeAgentCount: number;
  includedSeats: number;
  extraSeats: number;
  totalAllowed: number;
  remaining: number;
};

export type WorkspaceBranding = {
  name: string;
  logoUrl: string | null;
  brandPrimaryColor: string | null;
  brandAccentColor: string | null;
  welcomeMessage: string | null;
};

// -- Public API --------------------------------------------------------------

/**
 * Returns the workspace + membership if the user is an active owner or agent.
 * Returns null if the user has no active premium workspace membership.
 */
export async function getUserPremiumWorkspace(userId: string): Promise<{
  workspace: PremiumWorkspace;
  membership: PremiumMembership;
} | null> {
  const supabase = createServerClient({ useServiceRole: true });

  const { data: member } = await supabase
    .from("premium_workspace_members")
    .select("id, workspace_id, user_id, role, status, spending_limit, created_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!member) return null;

  const { data: workspace } = await supabase
    .from("premium_workspaces")
    .select(
      "id, owner_user_id, agency_id, name, slug, logo_url, brand_primary_color, brand_accent_color, welcome_message, status, included_agent_seats, extra_agent_seats, created_at, updated_at, deleted_at"
    )
    .eq("id", member.workspace_id)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (!workspace) return null;

  return {
    workspace: mapWorkspace(workspace),
    membership: mapMembership(member),
  };
}

/**
 * If the user has an active Premium plan and no workspace yet, creates one
 * automatically and inserts an owner membership row.
 *
 * Safe to call on every Premium page load — returns the existing workspace
 * immediately if it already exists. A unique partial index on owner_user_id
 * prevents duplicate workspaces even under concurrent calls.
 *
 * Returns null if the user is not on the Premium plan.
 */
export async function ensurePremiumWorkspaceForAgency(userId: string): Promise<{
  workspace: PremiumWorkspace;
  membership: PremiumMembership;
} | null> {
  const supabase = createServerClient({ useServiceRole: true });

  // Verify Premium plan before doing anything else.
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || profile.plan !== "premium") return null;

  // Return early if a workspace already exists.
  const existing = await getUserPremiumWorkspace(userId);
  if (existing) return existing;

  // Fetch agency name to seed the workspace name.
  const { data: agency } = await supabase
    .from("agencies")
    .select("id, company_name")
    .eq("user_id", userId)
    .maybeSingle();

  const workspaceName = agency?.company_name ?? "Meu Workspace Premium";
  const agencyId = agency?.id ?? null;

  // Create the workspace (the unique index prevents duplicates on race).
  const { data: newWorkspace, error: wsError } = await supabase
    .from("premium_workspaces")
    .insert({
      owner_user_id: userId,
      agency_id: agencyId,
      name: workspaceName,
      status: "active",
      included_agent_seats: 2,
      extra_agent_seats: 0,
    })
    .select(
      "id, owner_user_id, agency_id, name, slug, logo_url, brand_primary_color, brand_accent_color, welcome_message, status, included_agent_seats, extra_agent_seats, created_at, updated_at, deleted_at"
    )
    .single();

  if (wsError || !newWorkspace) {
    console.error("[premiumWorkspace] Failed to create workspace:", wsError);
    // Another request may have beaten us — try to return the existing one.
    return getUserPremiumWorkspace(userId);
  }

  // Create the owner membership.
  const { data: newMember, error: memberError } = await supabase
    .from("premium_workspace_members")
    .insert({
      workspace_id: newWorkspace.id,
      user_id: userId,
      role: "owner",
      status: "active",
      created_by: userId,
    })
    .select("id, workspace_id, user_id, role, status, spending_limit, created_at")
    .single();

  if (memberError || !newMember) {
    console.error("[premiumWorkspace] Failed to create owner membership:", memberError);
    return null;
  }

  return {
    workspace: mapWorkspace(newWorkspace),
    membership: mapMembership(newMember),
  };
}

/**
 * Returns true if the user holds the owner role in the given workspace.
 */
export async function isPremiumOwner(userId: string, workspaceId: string): Promise<boolean> {
  const supabase = createServerClient({ useServiceRole: true });

  const { data } = await supabase
    .from("premium_workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("role", "owner")
    .eq("status", "active")
    .maybeSingle();

  return !!data;
}

/**
 * Returns true if the user is an active member (owner or agent) in the workspace.
 */
export async function isPremiumAgent(userId: string, workspaceId: string): Promise<boolean> {
  const supabase = createServerClient({ useServiceRole: true });

  const { data } = await supabase
    .from("premium_workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .in("role", ["owner", "agent"])
    .eq("status", "active")
    .maybeSingle();

  return !!data;
}

/**
 * Returns current seat usage for a workspace.
 * active_agent_count includes the owner seat.
 */
export async function getWorkspaceSeatUsage(workspaceId: string): Promise<WorkspaceSeatUsage> {
  const supabase = createServerClient({ useServiceRole: true });

  const [{ count }, { data: workspace }] = await Promise.all([
    supabase
      .from("premium_workspace_members")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "active"),
    supabase
      .from("premium_workspaces")
      .select("included_agent_seats, extra_agent_seats")
      .eq("id", workspaceId)
      .maybeSingle(),
  ]);

  const includedSeats = workspace?.included_agent_seats ?? 2;
  const extraSeats = workspace?.extra_agent_seats ?? 0;
  const totalAllowed = includedSeats + extraSeats;
  const activeAgentCount = count ?? 0;

  return {
    activeAgentCount,
    includedSeats,
    extraSeats,
    totalAllowed,
    remaining: Math.max(0, totalAllowed - activeAgentCount),
  };
}

/**
 * Returns true if the workspace can accept another agent invite.
 * Compares active member count (including owner) against total allowed seats.
 */
export async function canInviteAgent(workspaceId: string): Promise<boolean> {
  const usage = await getWorkspaceSeatUsage(workspaceId);
  return usage.activeAgentCount < usage.totalAllowed;
}

/**
 * Returns the branding fields for a workspace.
 * Returns null if the workspace is not found or is deleted.
 */
export async function getWorkspaceBranding(workspaceId: string): Promise<WorkspaceBranding | null> {
  const supabase = createServerClient({ useServiceRole: true });

  const { data } = await supabase
    .from("premium_workspaces")
    .select("name, logo_url, brand_primary_color, brand_accent_color, welcome_message")
    .eq("id", workspaceId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!data) return null;

  return {
    name: data.name,
    logoUrl: (data.logo_url as string | null) ?? null,
    brandPrimaryColor: (data.brand_primary_color as string | null) ?? null,
    brandAccentColor: (data.brand_accent_color as string | null) ?? null,
    welcomeMessage: (data.welcome_message as string | null) ?? null,
  };
}

// -- Internal mappers --------------------------------------------------------

function mapWorkspace(row: Record<string, unknown>): PremiumWorkspace {
  return {
    id: String(row.id),
    ownerUserId: String(row.owner_user_id),
    agencyId: (row.agency_id as string | null) ?? null,
    name: String(row.name),
    slug: (row.slug as string | null) ?? null,
    logoUrl: (row.logo_url as string | null) ?? null,
    brandPrimaryColor: (row.brand_primary_color as string | null) ?? null,
    brandAccentColor: (row.brand_accent_color as string | null) ?? null,
    welcomeMessage: (row.welcome_message as string | null) ?? null,
    status: String(row.status),
    includedAgentSeats: Number(row.included_agent_seats ?? 2),
    extraAgentSeats: Number(row.extra_agent_seats ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    deletedAt: (row.deleted_at as string | null) ?? null,
  };
}

function mapMembership(row: Record<string, unknown>): PremiumMembership {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    userId: String(row.user_id),
    role: row.role === "owner" ? "owner" : "agent",
    status: String(row.status),
    spendingLimit: row.spending_limit != null ? Number(row.spending_limit) : null,
    createdAt: String(row.created_at),
  };
}
