import { createServerClient } from "./supabase";

export type UserRole = "agency" | "talent" | "admin";

export const ROLE_HOME: Record<UserRole, string> = {
  agency: "/agency/dashboard",
  talent: "/talent/dashboard",
  admin:  "/admin/dashboard",
};

/**
 * Returns the role of the currently authenticated user by querying the
 * `profiles` table. Returns null if unauthenticated or no profile found.
 *
 * Only call this from Server Components or Route Handlers.
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const supabase = createServerClient({ useServiceRole: true });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return (data?.role as UserRole) ?? null;
}
