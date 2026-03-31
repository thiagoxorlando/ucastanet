"use client";

import Link from "next/link";
import { useState } from "react";
import { type TalentProfile } from "@/lib/mockData";

// ─── Design tokens ────────────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
  "from-violet-500 to-indigo-600",
  "from-rose-400 to-pink-600",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-600",
  "from-sky-400 to-blue-600",
  "from-fuchsia-400 to-purple-600",
];

const CATEGORY_STRIPES: Record<string, string> = {
  "Lifestyle & Fashion": "from-rose-400 via-pink-400 to-fuchsia-400",
  "Technology":          "from-sky-500 via-blue-500 to-indigo-500",
  "Food & Cooking":      "from-amber-400 via-orange-400 to-red-400",
  "Health & Fitness":    "from-emerald-400 via-teal-400 to-cyan-400",
  "Travel":              "from-indigo-400 via-violet-400 to-purple-400",
  "Beauty":              "from-pink-400 via-rose-400 to-red-300",
  "Gaming":              "from-violet-500 via-purple-500 to-indigo-400",
  "Music":               "from-yellow-400 via-amber-400 to-orange-400",
  "Education":           "from-sky-400 via-cyan-400 to-teal-400",
  "Sports":              "from-green-400 via-emerald-400 to-teal-400",
  "Other":               "from-zinc-300 via-zinc-400 to-zinc-500",
};

const STATUS_STYLES = {
  active:   "bg-emerald-50 text-emerald-600 border border-emerald-100",
  pending:  "bg-amber-50  text-amber-600  border border-amber-100",
  inactive: "bg-zinc-100  text-zinc-500   border border-zinc-200",
};

function stripe(category: string) {
  return CATEGORY_STRIPES[category] ?? CATEGORY_STRIPES["Other"];
}

function avatarGradient(name: string) {
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ─── Social icons ─────────────────────────────────────────────────────────────

function SocialIcon({ platform }: { platform: string }) {
  const map: Record<string, React.ReactNode> = {
    instagram: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
    tiktok: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.3 6.3 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z" />
      </svg>
    ),
    youtube: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    twitter: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    website: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
  };
  return <>{map[platform] ?? null}</>;
}

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok:    "TikTok",
  youtube:   "YouTube",
  twitter:   "X (Twitter)",
  website:   "Website",
};

// ─── Book modal (UI only) ─────────────────────────────────────────────────────

function BookModal({ name, onClose }: { name: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-900/30 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative bg-white rounded-2xl border border-zinc-100 shadow-[0_8px_40px_rgba(0,0,0,0.12)] w-full max-w-sm p-7 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">
              Booking Request
            </p>
            <h2 className="text-[17px] font-semibold text-zinc-900 tracking-tight">
              Book {name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-zinc-500">Campaign Name</label>
            <input
              type="text"
              placeholder="e.g. Spring 2026 Launch"
              className="w-full rounded-xl border border-zinc-200 bg-white text-[14px] text-zinc-900 placeholder:text-zinc-300 px-3.5 py-2.5 hover:border-zinc-300 focus:border-zinc-900 focus:outline-none transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-zinc-500">Message</label>
            <textarea
              rows={3}
              placeholder="Tell the talent about your campaign…"
              className="w-full rounded-xl border border-zinc-200 bg-white text-[14px] text-zinc-900 placeholder:text-zinc-300 px-3.5 py-2.5 hover:border-zinc-300 focus:border-zinc-900 focus:outline-none transition-colors resize-none leading-relaxed"
            />
          </div>
        </div>

        <div className="flex gap-2.5 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-medium text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 transition-all duration-150 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] text-white text-[13px] font-medium py-2.5 rounded-xl transition-all duration-150 cursor-pointer"
          >
            Send Request
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TalentProfilePreview({ talent }: { talent: TalentProfile }) {
  const [bookOpen, setBookOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const socials = [
    talent.socialLinks.instagram && { platform: "instagram", handle: `@${talent.socialLinks.instagram}` },
    talent.socialLinks.tiktok    && { platform: "tiktok",    handle: `@${talent.socialLinks.tiktok}` },
    talent.socialLinks.youtube   && { platform: "youtube",   handle: talent.socialLinks.youtube },
    talent.socialLinks.twitter   && { platform: "twitter",   handle: `@${talent.socialLinks.twitter}` },
    talent.socialLinks.website   && { platform: "website",   handle: talent.socialLinks.website },
  ].filter(Boolean) as { platform: string; handle: string }[];

  const card = "bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)]";

  return (
    <>
      {bookOpen && (
        <BookModal name={talent.name} onClose={() => setBookOpen(false)} />
      )}

      <div className="min-h-screen bg-zinc-50">

        {/* ── Top nav ── */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-zinc-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link
              href="/agency/talent"
              className="inline-flex items-center gap-1.5 text-[13px] text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Talent Roster
            </Link>
            <span className="text-[13px] font-semibold tracking-tight text-zinc-900">
              ucastanet
            </span>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4">

          {/* ── Hero card ── */}
          <div className={`${card} overflow-hidden`}>
            <div className={`h-[3px] bg-gradient-to-r ${stripe(talent.category)}`} />

            <div className="p-7 space-y-6">
              {/* Identity row */}
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                {/* Avatar */}
                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${avatarGradient(talent.name)} flex items-center justify-center text-[1.5rem] font-bold text-white flex-shrink-0 shadow-[0_4px_12px_rgba(0,0,0,0.12)]`}>
                  {initials(talent.name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-[1.375rem] font-semibold tracking-tight text-zinc-900">
                      {talent.name}
                    </h1>
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[talent.status]}`}>
                      {talent.status}
                    </span>
                  </div>
                  <p className="text-[13px] text-zinc-400 font-mono">@{talent.username}</p>
                  <div className="flex items-center gap-1.5 text-[13px] text-zinc-400">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {talent.location}
                  </div>
                  <p className="text-[13px] font-medium text-zinc-600">{talent.category}</p>
                </div>

                {/* Followers */}
                <div className="flex-shrink-0 text-left sm:text-right">
                  <p className="text-[2.25rem] font-semibold tracking-tighter text-zinc-900 leading-none">
                    {talent.followers}
                  </p>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mt-1">
                    Followers
                  </p>
                </div>
              </div>

              {/* Bio */}
              <div className="pt-5 border-t border-zinc-50">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-3">
                  About
                </p>
                <p className="text-[15px] text-zinc-600 leading-relaxed">
                  {talent.bio}
                </p>
              </div>
            </div>
          </div>

          {/* ── Tags ── */}
          {talent.tags.length > 0 && (
            <div className={`${card} p-6`}>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-4">
                Categories
              </p>
              <div className="flex flex-wrap gap-2">
                {talent.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[13px] font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-600 px-3.5 py-1.5 rounded-full transition-colors"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Social links ── */}
          {socials.length > 0 && (
            <div className={`${card} p-6`}>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-4">
                Social Profiles
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {socials.map(({ platform, handle }) => (
                  <div
                    key={platform}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 transition-colors cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-zinc-100 group-hover:bg-zinc-200 flex items-center justify-center text-zinc-500 flex-shrink-0 transition-colors">
                      <SocialIcon platform={platform} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                        {SOCIAL_LABELS[platform] ?? platform}
                      </p>
                      <p className="text-[13px] font-medium text-zinc-800 truncate mt-0.5">
                        {handle}
                      </p>
                    </div>
                    <svg className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-400 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CTA ── */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2 pb-6">
            <button
              onClick={() => setBookOpen(true)}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] text-white text-[15px] font-medium px-6 py-3.5 rounded-xl transition-all duration-150 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Book Talent
            </button>
            <button
              onClick={() => setSaved((s) => !s)}
              className={[
                "flex-1 inline-flex items-center justify-center gap-2 text-[15px] font-medium px-6 py-3.5 rounded-xl border transition-all duration-150 cursor-pointer active:scale-[0.98]",
                saved
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                  : "bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50",
              ].join(" ")}
            >
              <svg className="w-4 h-4" fill={saved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              {saved ? "Saved" : "Save to List"}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
