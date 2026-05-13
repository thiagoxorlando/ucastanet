"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type WorkspaceData = {
  name: string;
  logoUrl: string | null;
  brandPrimaryColor: string | null;
  brandAccentColor: string | null;
};

type Props = {
  workspace: WorkspaceData;
  workspaceSlug: string;
  children: React.ReactNode;
};

export default function WorkspacePortalShell({ workspace, workspaceSlug, children }: Props) {
  const pathname = usePathname();
  const base = `/talent/workspaces/${workspaceSlug}`;
  const primary = workspace.brandPrimaryColor ?? "#1ABC9C";
  const accent  = workspace.brandAccentColor  ?? "#27C1D6";

  const navItems = [
    { label: "Painel",       href: base,                   exact: true  },
    { label: "Vagas",        href: `${base}/jobs`,         exact: false },
    { label: "Candidaturas", href: `${base}/applications`, exact: false },
    { label: "Contratos",    href: `${base}/contracts`,    exact: false },
    { label: "Financeiro",   href: `${base}/finances`,     exact: false },
    { label: "Perfil",       href: `${base}/profile`,      exact: false },
    { label: "Suporte",      href: "/talent/support",      exact: true  },
  ];

  function isActive(item: typeof navItems[0]): boolean {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  const initials = workspace.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

  return (
    <div className="space-y-5">
      {/* Branded workspace header + sub-nav */}
      <div className="overflow-hidden rounded-[22px] border border-zinc-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
        <div className="h-[3px]" style={{ background: `linear-gradient(to right, ${primary}, ${accent})` }} />

        {/* Identity row */}
        <div className="flex items-center gap-3 px-5 py-3.5">
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-100"
            style={{ background: workspace.logoUrl ? "#f4f4f5" : primary }}
          >
            {workspace.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={workspace.logoUrl} alt={workspace.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[11px] font-bold text-white select-none">{initials}</span>
            )}
          </div>
          <p className="text-[14px] font-semibold text-zinc-900 truncate">{workspace.name}</p>
        </div>

        {/* Sub-nav tabs */}
        <div className="border-t border-zinc-100 overflow-x-auto">
          <nav className="flex min-w-max px-2">
            {navItems.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex-shrink-0 px-3.5 py-3 text-[13px] font-medium transition-colors ${
                    active ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  {item.label}
                  {active && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full"
                      style={{ background: primary }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Page content */}
      <div>{children}</div>
    </div>
  );
}
