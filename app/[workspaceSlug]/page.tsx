import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";

// All top-level named routes — must match the list in the slug API.
const RESERVED_SLUGS = new Set([
  "admin", "agency", "talent", "api", "login", "signup", "jobs", "job",
  "premium", "support", "terms", "privacy", "dashboard", "app", "www",
  "brisahub", "onboarding", "setup-profile", "account-frozen",
]);

type Props = { params: Promise<{ workspaceSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspaceSlug } = await params;
  const supabase = createServerClient({ useServiceRole: true });
  const { data } = await supabase
    .from("premium_workspaces")
    .select("name")
    .eq("slug", workspaceSlug)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return { title: "BrisaHub" };
  return { title: `${data.name} — BrisaHub` };
}

export default async function WorkspacePortalPage({ params }: Props) {
  const { workspaceSlug } = await params;

  // Never resolve reserved segments as portals — they belong to named routes.
  if (RESERVED_SLUGS.has(workspaceSlug)) notFound();

  const supabase = createServerClient({ useServiceRole: true });
  const { data: workspace } = await supabase
    .from("premium_workspaces")
    .select("id, name, slug, logo_url, brand_primary_color, brand_accent_color, welcome_message, status, deleted_at")
    .eq("slug", workspaceSlug)
    .is("deleted_at", null)
    .eq("status", "active")
    .maybeSingle();

  if (!workspace) notFound();

  const primary = workspace.brand_primary_color ?? "#1ABC9C";
  const accent  = workspace.brand_accent_color  ?? "#27C1D6";

  // Detect authenticated user — redirect talent directly into their workspace
  let userRole: string | null = null;
  try {
    const session = await createSessionClient();
    const { data: { user } } = await session.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      userRole = profile?.role ?? null;
      // Talent already authenticated — skip landing page
      if (userRole === "talent") redirect(`/talent/workspaces/${workspaceSlug}`);
    }
  } catch { /* unauthenticated — show public portal */ }

  const dashboardHref = `/talent/workspaces/${workspaceSlug}`;
  const loginHref     = `/login?next=${encodeURIComponent(dashboardHref)}`;
  const signupHref    = `/signup?role=talent&next=${encodeURIComponent(dashboardHref)}`;

  const initials = workspace.name
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">

        {/* Brand card */}
        <div className="overflow-hidden rounded-[32px] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.10)] border border-zinc-100">

          {/* Color banner */}
          <div
            className="h-2"
            style={{ background: `linear-gradient(to right, ${primary}, ${accent})` }}
          />

          <div className="px-8 py-10 text-center space-y-6">
            {/* Logo / initials */}
            <div className="flex justify-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden border border-zinc-100 shadow-sm"
                style={{ background: workspace.logo_url ? "#f4f4f5" : primary }}
              >
                {workspace.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={workspace.logo_url} alt={workspace.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[26px] font-bold text-white select-none">{initials}</span>
                )}
              </div>
            </div>

            {/* Name */}
            <div>
              <h1 className="text-[1.6rem] font-bold tracking-tight text-zinc-950">{workspace.name}</h1>
              {workspace.welcome_message ? (
                <p className="mt-3 text-[14px] leading-relaxed text-zinc-500">{workspace.welcome_message}</p>
              ) : (
                <p className="mt-3 text-[14px] text-zinc-400">Bem-vindo ao portal privado de talentos.</p>
              )}
            </div>

            {/* CTA — depends on auth state */}
            {userRole === "agency" || userRole === "admin" ? (
              <div className="rounded-2xl bg-amber-50 border border-amber-100 px-5 py-4 text-[13px] text-amber-700">
                Entre com uma conta de talento para acessar este portal.
              </div>
            ) : userRole === "talent" ? (
              <Link
                href={dashboardHref}
                className="flex w-full items-center justify-center rounded-xl px-6 py-3 text-[14px] font-semibold text-white shadow-sm transition-all hover:brightness-105"
                style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}
              >
                Entrar no portal
              </Link>
            ) : (
              <div className="flex flex-col gap-3">
                <Link
                  href={loginHref}
                  className="flex w-full items-center justify-center rounded-xl px-6 py-3 text-[14px] font-semibold text-white shadow-sm transition-all hover:brightness-105"
                  style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}
                >
                  Entrar no portal
                </Link>
                <Link
                  href={signupHref}
                  className="flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-6 py-3 text-[14px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  Criar conta como talento
                </Link>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-zinc-100 px-8 py-4 text-center">
            <p className="text-[11px] text-zinc-400">
              Powered by{" "}
              <Link href="/" className="font-semibold text-zinc-500 hover:text-zinc-700 transition-colors">
                BrisaHub
              </Link>
            </p>
          </div>
        </div>

        {/* Tiny url hint */}
        <p className="mt-4 text-center text-[11px] text-zinc-400">
          brisahub.com.br/{workspaceSlug}
        </p>
      </div>
    </div>
  );
}
