"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FormData = {
  name: string;
  username: string;
  bio: string;
  category: string;
  location: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  twitter: string;
  website: string;
};

const INITIAL: FormData = {
  name: "", username: "", bio: "", category: "", location: "",
  instagram: "", tiktok: "", youtube: "", twitter: "", website: "",
};

const CATEGORIES = [
  "Lifestyle & Fashion", "Technology", "Food & Cooking", "Health & Fitness",
  "Travel", "Beauty", "Gaming", "Music", "Comedy", "Education", "Other",
];

const inputBase =
  "w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-zinc-900 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-900 focus:outline-none transition-colors duration-150 border-zinc-200";

const labelClass = "block text-[13px] font-medium text-zinc-600 mb-1.5";

const card = "bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] p-7";

const sectionHeader = "text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-5";

function SuccessScreen() {
  return (
    <div className="max-w-md mx-auto pt-20 text-center">
      <div className="relative w-16 h-16 mx-auto mb-6">
        <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-25" />
        <span className="relative flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500 text-white shadow-sm">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </span>
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 mb-2">
        Profile Created
      </p>
      <h2 className="text-[1.5rem] font-semibold tracking-tight text-zinc-900 mb-2">
        Talent added to roster
      </h2>
      <p className="text-[14px] text-zinc-500 mb-1">Redirecting to talent list…</p>
      <p className="text-[12px] text-zinc-400 flex items-center justify-center gap-1.5 mt-4">
        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Please wait
      </p>
    </div>
  );
}

export default function CreateTalentForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [submitted, setSubmitted] = useState(false);

  function set(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => router.push("/agency/talent"), 1800);
  }

  if (submitted) return <SuccessScreen />;

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Page header ── */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">
          Roster
        </p>
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-zinc-900 leading-tight">
          Add Talent
        </h1>
        <p className="text-[13px] text-zinc-400 mt-1">
          Create a new profile and add it to your talent roster.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Basic Info ── */}
        <div className={card}>
          <p className={sectionHeader}>Basic Info</p>
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Sofia Mendes"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  required
                  className={inputBase}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Username <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="sofiam"
                  value={form.username}
                  onChange={(e) => set("username", e.target.value)}
                  required
                  className={inputBase}
                />
                <p className="text-[12px] text-zinc-400 mt-1.5">Used for the public profile URL</p>
              </div>
            </div>

            <div>
              <label className={labelClass}>Bio</label>
              <textarea
                rows={4}
                placeholder="Tell us about this talent — their niche, style, and what makes them stand out…"
                value={form.bio}
                onChange={(e) => set("bio", e.target.value)}
                className={`${inputBase} resize-none leading-relaxed`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Category</label>
                <div className="relative">
                  <select
                    value={form.category}
                    onChange={(e) => set("category", e.target.value)}
                    className={`${inputBase} appearance-none pr-10 cursor-pointer`}
                  >
                    <option value="">Select a category…</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <label className={labelClass}>Location</label>
                <input
                  type="text"
                  placeholder="São Paulo, BR"
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  className={inputBase}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Profile Image ── */}
        <div className={card}>
          <p className={sectionHeader}>Profile Image</p>
          <div
            className="rounded-xl border-2 border-dashed border-zinc-200 hover:border-zinc-300 transition-colors cursor-pointer py-10 text-center"
            onClick={() => document.getElementById("img-upload")?.click()}
          >
            <div className="w-11 h-11 mx-auto mb-3 rounded-full bg-zinc-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-[14px] font-medium text-zinc-600">Click to upload a photo</p>
            <p className="text-[12px] text-zinc-400 mt-1">PNG, JPG up to 5 MB</p>
          </div>
          <input id="img-upload" type="file" accept="image/*" className="hidden" />
        </div>

        {/* ── Social Links ── */}
        <div className={card}>
          <p className={sectionHeader}>Social Links</p>
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                { key: "instagram" as const, label: "Instagram", placeholder: "username" },
                { key: "tiktok"    as const, label: "TikTok",    placeholder: "username" },
                { key: "youtube"   as const, label: "YouTube",   placeholder: "channel handle" },
                { key: "twitter"   as const, label: "Twitter / X", placeholder: "username" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className={labelClass}>{label}</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] text-zinc-400 pointer-events-none select-none">
                      @
                    </span>
                    <input
                      type="text"
                      placeholder={placeholder}
                      value={form[key]}
                      onChange={(e) => set(key, e.target.value)}
                      className={`${inputBase} pl-8`}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div>
              <label className={labelClass}>Website</label>
              <input
                type="text"
                placeholder="yoursite.com"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                className={inputBase}
              />
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] text-white text-[14px] font-semibold px-6 py-3 rounded-xl transition-all duration-150 shadow-sm cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Create Profile
          </button>
          <button
            type="button"
            onClick={() => router.push("/agency/talent")}
            className="text-[14px] font-medium text-zinc-400 hover:text-zinc-700 px-4 py-3 rounded-xl hover:bg-zinc-50 transition-all duration-150 cursor-pointer"
          >
            Cancel
          </button>
        </div>

      </form>
    </div>
  );
}
