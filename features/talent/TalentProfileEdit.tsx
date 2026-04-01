"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const TALENT_CATEGORIES = [
  "Actor", "Model", "Influencer", "Dancer", "Singer",
  "Comedian", "Presenter", "Content Creator", "Photographer", "Athlete",
];

const inputCls =
  "w-full px-4 py-3 text-[14px] rounded-xl border border-zinc-200 hover:border-zinc-300 focus:border-zinc-900 focus:outline-none transition-colors bg-white placeholder:text-zinc-400";

const labelCls = "block text-[12px] font-medium text-zinc-600 mb-1.5";

type Form = {
  fullName: string;
  phone: string;
  country: string;
  city: string;
  bio: string;
  categories: string[];
  instagram: string;
  tiktok: string;
  youtube: string;
};

const DEFAULTS: Form = {
  fullName: "", phone: "", country: "", city: "",
  bio: "", categories: [], instagram: "", tiktok: "", youtube: "",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] p-6 space-y-5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">{title}</p>
      {children}
    </div>
  );
}

export default function TalentProfileEdit() {
  const [form, setForm]       = useState<Form>(DEFAULTS);
  const [preview, setPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("talent_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setForm({
          fullName:   data.full_name   ?? "",
          phone:      data.phone       ?? "",
          country:    data.country     ?? "",
          city:       data.city        ?? "",
          bio:        data.bio         ?? "",
          categories: data.categories  ?? [],
          instagram:  data.instagram   ?? "",
          tiktok:     data.tiktok      ?? "",
          youtube:    data.youtube     ?? "",
        });
        if (data.avatar_url) setPreview(data.avatar_url);
      }
      setLoading(false);
    }
    load();
  }, []);

  function set(key: keyof Form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleCategory(cat: string) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  }

  function handleAvatarChange(file: File) {
    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim()) { setError("Full name is required."); return; }
    setError("");
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); setSaving(false); return; }

    let avatarUrl: string | undefined;

    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("talent-media")
        .upload(path, avatarFile, { upsert: true });
      if (uploadError) {
        setError("Photo upload failed: " + uploadError.message);
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("talent-media").getPublicUrl(path);
      avatarUrl = urlData.publicUrl;
    }

    const payload: Record<string, unknown> = {
      id:         user.id,
      full_name:  form.fullName.trim(),
      phone:      form.phone.trim(),
      country:    form.country.trim(),
      city:       form.city.trim(),
      bio:        form.bio.trim(),
      categories: form.categories,
      instagram:  form.instagram.trim(),
      tiktok:     form.tiktok.trim(),
      youtube:    form.youtube.trim(),
    };
    if (avatarUrl) payload.avatar_url = avatarUrl;

    const { error: dbError } = await supabase
      .from("talent_profiles")
      .upsert(payload, { onConflict: "id" });

    if (dbError) {
      setError(dbError.message);
      setSaving(false);
      return;
    }

    setSuccess(true);
    setSaving(false);
    setTimeout(() => setSuccess(false), 3000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 rounded-full border-2 border-zinc-200 border-t-zinc-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">Account</p>
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-zinc-900 leading-tight">My Profile</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title="Profile Photo">
          <div>
            <p className={labelCls}>Photo</p>
            <div
              onClick={() => fileRef.current?.click()}
              className="w-24 h-24 rounded-2xl border-2 border-dashed border-zinc-200 hover:border-zinc-400 cursor-pointer transition-colors flex items-center justify-center overflow-hidden bg-zinc-50"
            >
              {preview ? (
                <img src={preview} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-6 h-6 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4v16m8-8H4" />
                </svg>
              )}
            </div>
            <input
              ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleAvatarChange(e.target.files[0]); }}
            />
            <p className="text-[11px] text-zinc-400 mt-1.5">Click to upload · JPG, PNG, WebP</p>
          </div>
        </Section>

        <Section title="Personal Info">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Full Name *</label>
              <input className={inputCls} placeholder="Sofia Mendes" value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Phone Number</label>
              <input className={inputCls} placeholder="+55 11 99999-9999" value={form.phone}
                onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Country</label>
              <input className={inputCls} placeholder="Brazil" value={form.country}
                onChange={(e) => set("country", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>City</label>
              <input className={inputCls} placeholder="São Paulo" value={form.city}
                onChange={(e) => set("city", e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Bio</label>
            <textarea
              rows={4} className={`${inputCls} resize-none`}
              placeholder="Tell agencies what makes you unique."
              value={form.bio} onChange={(e) => set("bio", e.target.value)}
            />
          </div>
        </Section>

        <Section title="Categories">
          <div className="flex flex-wrap gap-2">
            {TALENT_CATEGORIES.map((cat) => {
              const active = form.categories.includes(cat);
              return (
                <button
                  key={cat} type="button" onClick={() => toggleCategory(cat)}
                  className={[
                    "px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer",
                    active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
                  ].join(" ")}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Social Links">
          <div>
            <label className={labelCls}>Instagram</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] text-zinc-400">@</span>
              <input className={`${inputCls} pl-8`} placeholder="yourhandle" value={form.instagram}
                onChange={(e) => set("instagram", e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>TikTok</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] text-zinc-400">@</span>
              <input className={`${inputCls} pl-8`} placeholder="yourhandle" value={form.tiktok}
                onChange={(e) => set("tiktok", e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>YouTube</label>
            <input className={inputCls} placeholder="https://youtube.com/@channel" value={form.youtube}
              onChange={(e) => set("youtube", e.target.value)} />
          </div>
        </Section>

        {error && (
          <p className="text-[13px] text-rose-500 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
            {error}
          </p>
        )}
        {success && (
          <p className="text-[13px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
            Profile saved successfully.
          </p>
        )}

        <button
          type="submit" disabled={saving}
          className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white text-[14px] font-semibold py-3.5 rounded-xl transition-colors cursor-pointer active:scale-[0.99]"
        >
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </form>
    </div>
  );
}
