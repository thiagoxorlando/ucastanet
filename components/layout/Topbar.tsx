"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";

const pageMeta: Record<string, { title: string; description: string }> = {
  "/agency/dashboard": {
    title: "Dashboard",
    description: "Overview of your agency and talent roster",
  },
  "/agency/talent": {
    title: "Talent",
    description: "Browse and manage all talent profiles",
  },
  "/agency/create": {
    title: "Create Talent",
    description: "Add a new talent profile to your roster",
  },
  "/agency/post-job": {
    title: "Post a Job",
    description: "Create a new job listing for your roster",
  },
  "/agency/jobs": {
    title: "Jobs",
    description: "Manage your open positions and applicants",
  },
};

type TopbarProps = {
  onMenuClick: () => void;
};

export default function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const meta = pageMeta[pathname] ?? { title: "Agency", description: "" };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-6 lg:px-8 bg-white border-b border-zinc-100 flex-shrink-0">
      {/* Left — hamburger (mobile) + page title */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors flex-shrink-0"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="min-w-0">
          <h1 className="text-[14px] font-semibold text-zinc-900 leading-none tracking-tight truncate">
            {meta.title}
          </h1>
          {meta.description && (
            <p className="text-[12px] text-zinc-400 mt-0.5 leading-none hidden sm:block truncate">
              {meta.description}
            </p>
          )}
        </div>
      </div>

      {/* Right — actions + avatar */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Bell */}
        <button className="relative w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full" />
        </button>

        {/* Add Talent CTA */}
        {pathname !== "/agency/create" && (
          <Link href="/agency/create" className="hidden sm:block">
            <Button size="sm">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Talent
            </Button>
          </Link>
        )}

        {/* Divider */}
        <div className="hidden sm:block w-px h-5 bg-zinc-100 mx-1" />

        {/* User avatar */}
        <button className="flex items-center gap-2 pl-1 rounded-xl hover:bg-zinc-50 transition-colors py-1 pr-2.5 group">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
            DA
          </div>
          <div className="hidden md:block text-left">
            <p className="text-[12px] font-semibold text-zinc-900 leading-none">Demo Agency</p>
            <p className="text-[10px] text-zinc-400 mt-0.5 leading-none">agency@demo.com</p>
          </div>
          <svg
            className="hidden md:block w-3 h-3 text-zinc-400 group-hover:text-zinc-600 transition-colors ml-0.5"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </header>
  );
}
