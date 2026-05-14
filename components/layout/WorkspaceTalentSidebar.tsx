"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { useWorkspacePortal } from "@/lib/WorkspacePortalContext";
import heroBrandImage from "@/public/landing/brisahub-hero-brand.png";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type PortalNavItem = {
  label: string;
  href: string;
  exact?: boolean;
  icon: React.ReactNode;
};

function normalizeHexColor(color: string | null | undefined, fallback: string) {
  if (!color) return fallback;
  const value = color.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value) ? value : fallback;
}

function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const full = value.length === 3
    ? value.split("").map((char) => char + char).join("")
    : value;

  const red = Number.parseInt(full.slice(0, 2), 16);
  const green = Number.parseInt(full.slice(2, 4), 16);
  const blue = Number.parseInt(full.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

export default function WorkspaceTalentSidebar({ isOpen, onClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { workspace } = useWorkspacePortal();
  const { displayName, email, initials: userInitials, avatarUrl, loading } = useUserProfile();
  const [imgError, setImgError] = useState(false);

  if (!workspace) return null;

  const primary = normalizeHexColor(workspace.primaryColor, "#1ABC9C");
  const accent = normalizeHexColor(workspace.accentColor, "#27C1D6");
  const glow = hexToRgba(accent, 0.24);
  const activeBg = `linear-gradient(135deg, ${hexToRgba(primary, 0.26)} 0%, ${hexToRgba(accent, 0.16)} 100%)`;
  const cardBg = `linear-gradient(160deg, ${hexToRgba(primary, 0.20)} 0%, ${hexToRgba(accent, 0.10)} 100%)`;
  const hoverBg = hexToRgba(primary, 0.10);

  const navItems: PortalNavItem[] = [
    {
      label: "Painel",
      href: `/talent/workspaces/${workspace.slug}`,
      exact: true,
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 21V12h6v9" />
        </svg>
      ),
    },
    {
      label: "Vagas",
      href: `/talent/workspaces/${workspace.slug}/jobs`,
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: "Candidaturas",
      href: `/talent/workspaces/${workspace.slug}/applications`,
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      label: "Contratos",
      href: `/talent/workspaces/${workspace.slug}/contracts`,
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      label: "Financeiro",
      href: `/talent/workspaces/${workspace.slug}/finances`,
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Perfil",
      href: `/talent/workspaces/${workspace.slug}/profile`,
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      label: "Suporte",
      href: `/talent/workspaces/${workspace.slug}/support`,
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
  ];

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={[
          "fixed left-0 top-0 z-30 flex h-screen w-72 flex-col overflow-hidden text-[#EAF4F2] transition-transform duration-300 ease-in-out",
          "lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        style={
          {
            "--workspace-primary": primary,
            "--workspace-accent": accent,
          } as CSSProperties
        }
      >
        {/* Dark base gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_28%),linear-gradient(180deg,#071416_0%,#041012_100%)]" />
        {/* Agency-tinted grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage: `linear-gradient(${hexToRgba(primary, 0.8)} 1px, transparent 1px), linear-gradient(90deg, ${hexToRgba(primary, 0.8)} 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
        {/* Top accent strip */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, ${primary} 0%, ${accent} 100%)` }}
        />
        {/* Top-left glow */}
        <div
          className="pointer-events-none absolute -left-12 top-12 h-36 w-36 rounded-full blur-3xl"
          style={{ background: glow }}
        />
        {/* Bottom-right accent glow */}
        <div
          className="pointer-events-none absolute -right-10 bottom-16 h-28 w-28 rounded-full blur-3xl"
          style={{ background: hexToRgba(accent, 0.14) }}
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-white/[0.08]" />

        <div className="relative flex h-16 items-center justify-between border-b border-white/[0.08] px-5">
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
              Portal
            </div>
          </div>
          <Link href="/" className="flex items-center gap-2 text-[11px] text-white/55 transition-colors hover:text-white/80">
            <Image
              src={heroBrandImage}
              alt="BrisaHub"
              width={heroBrandImage.width}
              height={heroBrandImage.height}
              className="h-auto w-12 opacity-80"
            />
          </Link>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#B8CECA] transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="relative px-4 pt-4">
          <div
            className="overflow-hidden rounded-[22px] border border-white/10 px-4 py-4 shadow-[0_18px_36px_rgba(3,10,11,0.26)]"
            style={{ background: cardBg, boxShadow: `0 20px 40px ${hexToRgba(primary, 0.12)}` }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-white/15 bg-white/10">
                {workspace.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={workspace.logoUrl} alt={workspace.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[15px] font-black text-white">{initials(workspace.name)}</span>
                )}
              </div>
              <div className="min-w-0">
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.24em]"
                  style={{ color: accent }}
                >
                  Portal
                </p>
                <p className="mt-1 truncate text-[16px] font-bold leading-tight text-white">
                  {workspace.name}
                </p>
                <p className="mt-1 text-[11px] text-white/62">
                  Powered by BrisaHub
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative flex-1 min-h-0 px-4 py-5">
          <div className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
            Navegação
          </div>
          <nav className="h-full overflow-y-auto pr-1 sidebar-scroll">
            <ul className="space-y-1.5">
              {navItems.map((item) => {
                const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={[
                        "group flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-[13px] font-medium transition-all duration-150",
                        isActive
                          ? "text-white shadow-[0_14px_26px_rgba(7,20,22,0.22)]"
                          : "border-transparent text-white/78 hover:text-white",
                      ].join(" ")}
                      style={
                        isActive
                          ? {
                              background: activeBg,
                              borderColor: hexToRgba(accent, 0.34),
                              boxShadow: `0 0 0 1px ${hexToRgba(accent, 0.20)}, 0 16px 28px ${hexToRgba(primary, 0.14)}`,
                            }
                          : { backgroundColor: "transparent" }
                      }
                      onMouseEnter={(event) => {
                        if (!isActive) event.currentTarget.style.backgroundColor = hoverBg;
                      }}
                      onMouseLeave={(event) => {
                        if (!isActive) event.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <span
                        className={[
                          "flex-shrink-0 transition-colors duration-150",
                          isActive ? "text-white" : "text-white/55 group-hover:text-white/80",
                        ].join(" ")}
                        style={!isActive ? { color: accent } : undefined}
                      >
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="relative px-4 pb-2">
          <div className="h-px bg-white/[0.08]" />
        </div>

        <div className="relative space-y-2 px-4 py-4">
          <div className="rounded-[20px] border border-white/8 bg-white/[0.05] px-3.5 py-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-white/10">
                {!loading && avatarUrl && !imgError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={userInitials}
                    className="h-full w-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-[12px] font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)` }}
                  >
                    {loading ? "..." : userInitials}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-white">
                  {loading ? "..." : (displayName || email)}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-white/55">
                  {loading ? "" : email}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-[13px] font-medium text-white/72 transition-colors hover:bg-white/[0.06] hover:text-[#FFB3B3]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
