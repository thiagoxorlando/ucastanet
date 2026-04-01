"use client";

import Link from "next/link";
import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import { mockTalent, TalentProfile } from "@/lib/mockData";

function statusVariant(status: TalentProfile["status"]) {
  if (status === "active") return "success";
  if (status === "pending") return "warning";
  return "default";
}

const STATUS_OPTIONS = ["All", "Active", "Pending", "Inactive"] as const;

export default function TalentList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("All");

  const filtered = mockTalent.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      t.name.toLowerCase().includes(q) ||
      t.username.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q);
    const matchStatus = status === "All" || t.status === status.toLowerCase();
    return matchSearch && matchStatus;
  });

  return (
    <div className="max-w-5xl space-y-8">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">
            Roster
          </p>
          <h1 className="text-[1.75rem] font-semibold tracking-tight text-zinc-900 leading-tight">
            Talent
          </h1>
          <p className="text-[13px] text-zinc-400 mt-1">
            {mockTalent.filter((t) => t.status === "active").length} active ·{" "}
            {mockTalent.length} total
          </p>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search talent…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-white border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-900 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl flex-shrink-0">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={[
                "px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 cursor-pointer",
                status === s
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700",
              ].join(" ")}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100">
              <th className="text-left px-6 py-3.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">
                Talent
              </th>
              <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">
                Username
              </th>
              <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-widest hidden sm:table-cell">
                Category
              </th>
              <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">
                Status
              </th>
              <th className="text-right px-4 py-3.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-widest hidden md:table-cell">
                Followers
              </th>
              <th className="px-6 py-3.5 w-12" />
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-50">
            {filtered.map((talent) => (
              <tr key={talent.id} className="hover:bg-zinc-50/60 transition-colors group">
                {/* Talent */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={talent.name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-zinc-900 truncate leading-none">
                        {talent.name}
                      </p>
                      <p className="text-[12px] text-zinc-400 mt-0.5 truncate">{talent.location}</p>
                    </div>
                  </div>
                </td>

                {/* Username */}
                <td className="px-4 py-4">
                  <span className="text-[12px] text-zinc-500 font-mono bg-zinc-100 px-2 py-1 rounded-lg">
                    @{talent.username}
                  </span>
                </td>

                {/* Category */}
                <td className="px-4 py-4 hidden sm:table-cell">
                  <span className="text-[13px] text-zinc-500">{talent.category}</span>
                </td>

                {/* Status */}
                <td className="px-4 py-4">
                  <Badge variant={statusVariant(talent.status)} className="capitalize">
                    {talent.status}
                  </Badge>
                </td>

                {/* Followers */}
                <td className="px-4 py-4 text-right hidden md:table-cell">
                  <span className="text-[14px] font-semibold text-zinc-900 tabular-nums">
                    {talent.followers}
                  </span>
                </td>

                {/* Action */}
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/talent/profile/${talent.username}`}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-zinc-400 hover:text-zinc-900 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    View
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <p className="text-[14px] font-medium text-zinc-500">No talent found</p>
                  <p className="text-[13px] text-zinc-400 mt-1">Try adjusting your search or filter.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
          <p className="text-[12px] text-zinc-400 font-medium">
            {filtered.length} of {mockTalent.length} talent
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled
              className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-200 transition-colors disabled:opacity-30 cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-[12px] text-zinc-500 px-2 font-medium">Page 1</span>
            <button
              disabled
              className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-200 transition-colors disabled:opacity-30 cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
