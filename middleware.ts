import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase";
import type { UserRole } from "@/lib/auth";

const ROLE_HOME: Record<UserRole, string> = {
  agency: "/agency/dashboard",
  talent: "/talent/dashboard",
  admin:  "/admin/dashboard",
};

// Which path prefixes each role is allowed to access
const ROLE_ALLOWED: Record<UserRole, string[]> = {
  agency: ["/agency"],
  talent: ["/talent"],
  admin:  ["/agency", "/talent", "/admin"],
};

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient(req, res);
  const { pathname } = req.nextUrl;

  // Refresh session cookie on every request
  const { data: { user } } = await supabase.auth.getUser();

  const isProtected =
    pathname.startsWith("/agency") ||
    pathname.startsWith("/talent") ||
    pathname.startsWith("/admin");

  // Not a protected route — let through
  if (!isProtected) return res;

  // No session → send to login
  if (!user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Fetch role from profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role as UserRole | undefined;

  // No role found — send to onboarding
  if (!role) return NextResponse.redirect(new URL("/onboarding/role", req.url));

  // Wrong role for this path — redirect to their home
  const allowed = ROLE_ALLOWED[role] ?? [];
  const hasAccess = allowed.some((prefix) => pathname.startsWith(prefix));
  if (!hasAccess) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/agency/:path*", "/talent/:path*", "/admin/:path*"],
};
