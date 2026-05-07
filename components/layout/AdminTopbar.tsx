"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useUserProfile } from "@/lib/useUserProfile";
import NotificationBell from "@/components/layout/NotificationBell";

const pageMeta: Record<string, { title: string; description: string }> = {
  "/admin/dashboard":  { title: "Painel",      description: "Visão geral da plataforma" },
  "/admin/jobs":       { title: "Vagas",        description: "Visualize todas as vagas da plataforma" },
  "/admin/users":      { title: "Usuários",     description: "Gerencie agências e talentos" },
  "/admin/bookings":   { title: "Reservas",     description: "Visualize todas as reservas da plataforma" },
  "/admin/finances":   { title: "Financeiro",   description: "Receita e comissões da plataforma" },
  "/admin/plans":      { title: "Planos",       description: "Planos, cobranças e histórico das agências" },
  "/admin/contracts":  { title: "Contratos",    description: "Visualize todos os contratos da plataforma" },
  "/admin/referrals":  { title: "Indicações",   description: "Indicações e comissões da plataforma" },
  "/admin/trash":      { title: "Lixeira",      description: "Restaure ou exclua itens removidos" },
  "/admin/profile":    { title: "Perfil",       description: "Informações da conta administrativa" },
};

function getPageMeta(pathname: string) {
  const entries = Object.entries(pageMeta).sort((a, b) => b[0].length - a[0].length);
  for (const [route, meta] of entries) {
    if (pathname === route || pathname.startsWith(`${route}/`)) return meta;
  }
  return { title: "", description: "" };
}

export default function AdminTopbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const { displayName, email, initials, avatarUrl, loading } = useUserProfile();
  const [imgError, setImgError] = useState(false);
  const meta = getPageMeta(pathname);

  return (
    <header className="bg-[#061214]/80 backdrop-blur-md border-b border-white/8 px-6 py-4 flex items-center justify-between flex-shrink-0 sticky top-0 z-20">
      {/* Left — hamburger + page title */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:bg-white/8 hover:text-white transition-colors flex-shrink-0"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="min-w-0">
          <h1 className="text-[14px] font-bold leading-none tracking-tight truncate text-white">
            {meta.title}
          </h1>
          {meta.description && (
            <p className="text-[12px] text-white/40 mt-0.5 leading-none hidden sm:block truncate">
              {meta.description}
            </p>
          )}
        </div>
      </div>

      {/* Right — bell + user */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <NotificationBell />

        <div className="hidden sm:block w-px h-5 bg-white/10" />

        {/* User chip */}
        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden ring-1 ring-white/10">
            {!loading && avatarUrl && !imgError ? (
              <img src={avatarUrl} alt={initials} className="w-full h-full object-cover" onError={() => setImgError(true)} />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#1ABC9C] to-[#27C1D6] flex items-center justify-center text-[10px] font-bold text-white">
                {loading ? "…" : initials}
              </div>
            )}
          </div>
          <div className="hidden md:block">
            <p className="text-[12px] font-semibold leading-none text-white/80 truncate max-w-[120px]">
              {loading ? "…" : (displayName || email)}
            </p>
            <p className="text-[10px] text-white/35 mt-0.5 leading-none truncate max-w-[140px]">
              {loading ? "" : email}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
