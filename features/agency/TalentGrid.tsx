"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Talent = {
  id: string;
  full_name: string;
  bio: string;
  country: string;
  city: string;
  categories: string[];
  avatar_url: string | null;
  gender: string | null;
  age: number | null;
  ethnicity: string | null;
};

const CATEGORIES = [
  "Actor", "Model", "Influencer", "Dancer", "Singer",
  "Comedian", "Presenter", "Content Creator", "Photographer", "Athlete",
  "Lifestyle & Fashion", "Technology", "Food & Cooking", "Health & Fitness",
  "Travel", "Beauty",
];

const GENDERS = ["Male", "Female", "Other"];

const inputCls = "w-full px-3.5 py-2.5 text-[13px] rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 focus:border-zinc-900 focus:outline-none transition-colors";

function Avatar({ name, src }: { name: string; src: string | null }) {
  const GRADIENTS = [
    "from-violet-500 to-indigo-600", "from-rose-400 to-pink-600",
    "from-amber-400 to-orange-500", "from-emerald-400 to-teal-600",
    "from-sky-400 to-blue-600",
  ];
  const gradient = GRADIENTS[(name.charCodeAt(0) ?? 0) % GRADIENTS.length];
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  if (src) {
    return <img src={src} alt={name} className="w-full h-full object-cover" />;
  }
  return (
    <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-[22px] font-bold`}>
      {initials}
    </div>
  );
}

function TalentCard({ talent, onClick }: { talent: Talent; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group text-left bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden hover:shadow-[0_4px_16px_rgba(0,0,0,0.09)] hover:border-zinc-200 transition-all duration-150 cursor-pointer"
    >
      {/* Photo */}
      <div className="aspect-[3/4] w-full overflow-hidden bg-zinc-100">
        <Avatar name={talent.full_name} src={talent.avatar_url} />
      </div>

      {/* Info */}
      <div className="p-3.5">
        <p className="text-[14px] font-semibold text-zinc-900 truncate leading-snug">
          {talent.full_name}
        </p>
        {(talent.city || talent.country) && (
          <p className="text-[12px] text-zinc-400 mt-0.5 truncate">
            {[talent.city, talent.country].filter(Boolean).join(", ")}
          </p>
        )}
        {talent.categories?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {talent.categories.slice(0, 2).map((c) => (
              <span key={c} className="text-[10px] font-medium bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

export default function TalentGrid() {
  const router = useRouter();
  const [talent, setTalent]     = useState<Talent[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [gender, setGender]     = useState("");
  const [category, setCategory] = useState("");
  const [ageMin, setAgeMin]     = useState("");
  const [ageMax, setAgeMax]     = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("talent_profiles")
        .select("id, full_name, bio, country, city, categories, avatar_url, gender, age, ethnicity")
        .order("full_name");
      setTalent(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = talent.filter((t) => {
    const q = search.toLowerCase();
    if (q && !t.full_name.toLowerCase().includes(q) &&
        !(t.city ?? "").toLowerCase().includes(q) &&
        !(t.country ?? "").toLowerCase().includes(q) &&
        !(t.categories ?? []).some((c) => c.toLowerCase().includes(q))) return false;
    if (gender && (t.gender ?? "").toLowerCase() !== gender.toLowerCase()) return false;
    if (category && !(t.categories ?? []).some((c) => c.toLowerCase() === category.toLowerCase())) return false;
    if (ageMin && (t.age ?? 0) < parseInt(ageMin)) return false;
    if (ageMax && (t.age ?? 999) > parseInt(ageMax)) return false;
    return true;
  });

  const activeFilters = [gender, category, ageMin, ageMax].filter(Boolean).length;

  return (
    <div className="max-w-6xl space-y-6">

      {/* Header */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">Roster</p>
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-zinc-900 leading-tight">Talent</h1>
        <p className="text-[13px] text-zinc-400 mt-1">{talent.length} profiles</p>
      </div>

      {/* Search + filter toggle */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="text" placeholder="Search by name, location, category…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-white border border-zinc-200 rounded-xl placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-900 focus:outline-none transition-colors"
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={[
            "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-medium transition-colors cursor-pointer",
            showFilters || activeFilters > 0
              ? "bg-zinc-900 text-white border-zinc-900"
              : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300",
          ].join(" ")}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 12h12M9 20h6" />
          </svg>
          Filters{activeFilters > 0 ? ` (${activeFilters})` : ""}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1.5">Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputCls}>
                <option value="">All</option>
                {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1.5">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                <option value="">All</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1.5">Min Age</label>
              <input type="number" placeholder="18" min={0} max={100} value={ageMin} onChange={(e) => setAgeMin(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1.5">Max Age</label>
              <input type="number" placeholder="60" min={0} max={100} value={ageMax} onChange={(e) => setAgeMax(e.target.value)} className={inputCls} />
            </div>
          </div>
          {activeFilters > 0 && (
            <button
              onClick={() => { setGender(""); setCategory(""); setAgeMin(""); setAgeMax(""); }}
              className="mt-3 text-[12px] text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-5 h-5 rounded-full border-2 border-zinc-200 border-t-zinc-900 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-[14px] font-medium text-zinc-500">No talent found</p>
          <p className="text-[13px] text-zinc-400 mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((t) => (
            <TalentCard
              key={t.id}
              talent={t}
              onClick={() => router.push(`/agency/talent/${t.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
