"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

// ─── Types ────────────────────────────────────────────────────────────────────

type SocialLink = {
  id: string;
  platform: string;
  handle: string;
};

type FormData = {
  name: string;
  username: string;
  bio: string;
  imageDataUrl: string;
  links: SocialLink[];
};

type FormErrors = {
  name?: string;
  username?: string;
  bio?: string;
  links?: Record<string, string>;
};

type Touched = {
  name?: boolean;
  username?: boolean;
  bio?: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const BIO_MAX = 200;

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: "IG", prefix: "@" },
  { id: "tiktok",    label: "TikTok",    icon: "TT", prefix: "@" },
  { id: "youtube",   label: "YouTube",   icon: "YT", prefix: ""  },
  { id: "twitter",   label: "Twitter/X", icon: "X",  prefix: "@" },
  { id: "linkedin",  label: "LinkedIn",  icon: "LI", prefix: ""  },
  { id: "website",   label: "Website",   icon: "WW", prefix: ""  },
] as const;

type PlatformId = (typeof PLATFORMS)[number]["id"];

const platformMeta: Record<PlatformId, { label: string; prefix: string; color: string }> = {
  instagram: { label: "Instagram", prefix: "@", color: "bg-rose-50 text-rose-600 border-rose-100" },
  tiktok:    { label: "TikTok",    prefix: "@", color: "bg-zinc-900 text-white border-zinc-800" },
  youtube:   { label: "YouTube",   prefix: "",  color: "bg-red-50 text-red-600 border-red-100" },
  twitter:   { label: "Twitter/X", prefix: "@", color: "bg-sky-50 text-sky-600 border-sky-100" },
  linkedin:  { label: "LinkedIn",  prefix: "",  color: "bg-blue-50 text-blue-700 border-blue-100" },
  website:   { label: "Website",   prefix: "",  color: "bg-violet-50 text-violet-700 border-violet-100" },
};

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(form: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!form.name.trim()) {
    errors.name = "Name is required.";
  } else if (form.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters.";
  }

  if (!form.username.trim()) {
    errors.username = "Username is required.";
  } else if (!/^[a-z0-9_]{3,30}$/.test(form.username)) {
    errors.username = "3–30 chars, only lowercase letters, numbers, and underscores.";
  }

  if (form.bio.length > BIO_MAX) {
    errors.bio = `Bio must be ${BIO_MAX} characters or fewer.`;
  }

  const linkErrors: Record<string, string> = {};
  form.links.forEach((link) => {
    if (link.platform && !link.handle.trim()) {
      linkErrors[link.id] = "Handle is required when a platform is selected.";
    }
    if (!link.platform && link.handle.trim()) {
      linkErrors[link.id] = "Select a platform.";
    }
  });
  if (Object.keys(linkErrors).length) errors.links = linkErrors;

  return errors;
}

function hasErrors(e: FormErrors) {
  return !!(
    e.name ||
    e.username ||
    e.bio ||
    (e.links && Object.keys(e.links).length > 0)
  );
}

// ─── Image Upload ─────────────────────────────────────────────────────────────

function ImageUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function processFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
      />
      {value ? (
        <div className="flex items-center gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Profile preview"
            className="w-20 h-20 rounded-full object-cover border-2 border-zinc-200 flex-shrink-0"
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-sm font-medium text-zinc-900 hover:underline text-left"
            >
              Change photo
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-sm text-zinc-400 hover:text-red-500 transition-colors text-left"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) processFile(file);
          }}
          className={[
            "w-full border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer focus:outline-none",
            dragging
              ? "border-zinc-400 bg-zinc-50"
              : "border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50",
          ].join(" ")}
        >
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-700">Click or drag to upload</p>
          <p className="text-xs text-zinc-400 mt-1">PNG, JPG, WEBP · max 5 MB</p>
        </button>
      )}
    </div>
  );
}

// ─── Social Links Editor ──────────────────────────────────────────────────────

function SocialLinksEditor({
  links,
  errors,
  onChange,
}: {
  links: SocialLink[];
  errors?: Record<string, string>;
  onChange: (links: SocialLink[]) => void;
}) {
  function addLink() {
    onChange([...links, { id: crypto.randomUUID(), platform: "", handle: "" }]);
  }

  function removeLink(id: string) {
    onChange(links.filter((l) => l.id !== id));
  }

  function updateLink(id: string, field: "platform" | "handle", value: string) {
    onChange(links.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  }

  const usedPlatforms = links.map((l) => l.platform).filter(Boolean);

  return (
    <div className="space-y-3">
      {links.map((link) => {
        const meta = link.platform ? platformMeta[link.platform as PlatformId] : null;
        const error = errors?.[link.id];

        return (
          <div key={link.id} className="space-y-1">
            <div className="flex items-center gap-2">
              {/* Platform selector */}
              <select
                value={link.platform}
                onChange={(e) => updateLink(link.id, "platform", e.target.value)}
                className="w-36 flex-shrink-0 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              >
                <option value="">Platform</option>
                {PLATFORMS.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    disabled={usedPlatforms.includes(p.id) && p.id !== link.platform}
                  >
                    {p.label}
                  </option>
                ))}
              </select>

              {/* Handle input with optional prefix */}
              <div className="flex-1 relative">
                {meta?.prefix && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 pointer-events-none select-none">
                    {meta.prefix}
                  </span>
                )}
                <input
                  type="text"
                  value={link.handle}
                  onChange={(e) => updateLink(link.id, "handle", e.target.value)}
                  placeholder={
                    link.platform === "website" ? "yoursite.com" :
                    link.platform === "youtube" ? "channel name" : "username"
                  }
                  className={[
                    "w-full rounded-lg border bg-white py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent",
                    meta?.prefix ? "pl-7 pr-3" : "px-3",
                    error ? "border-red-400" : "border-zinc-200",
                  ].join(" ")}
                />
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={() => removeLink(link.id)}
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                aria-label="Remove link"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {error && <p className="text-xs text-red-500 pl-[152px]">{error}</p>}
          </div>
        );
      })}

      {links.length < PLATFORMS.length && (
        <button
          type="button"
          onClick={addLink}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mt-1 group"
        >
          <span className="w-7 h-7 rounded-lg border-2 border-dashed border-zinc-200 group-hover:border-zinc-400 flex items-center justify-center transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </span>
          Add social link
        </button>
      )}
    </div>
  );
}

// ─── Profile Preview ──────────────────────────────────────────────────────────

function avatarInitials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
}

function avatarColor(name: string) {
  const palette = [
    "from-violet-400 to-purple-600",
    "from-blue-400 to-cyan-500",
    "from-emerald-400 to-teal-500",
    "from-amber-400 to-orange-500",
    "from-rose-400 to-pink-500",
    "from-indigo-400 to-blue-600",
  ];
  const i = (name.charCodeAt(0) || 0) % palette.length;
  return palette[i];
}

function completionPct(form: FormData): number {
  let score = 0;
  if (form.name.trim().length >= 2) score += 25;
  if (/^[a-z0-9_]{3,30}$/.test(form.username)) score += 25;
  if (form.bio.trim().length > 0) score += 20;
  if (form.imageDataUrl) score += 15;
  if (form.links.some((l) => l.platform && l.handle)) score += 15;
  return score;
}

function ProfilePreview({ form }: { form: FormData }) {
  const pct = completionPct(form);
  const gradientClass = avatarColor(form.name || "u");
  const filledLinks = form.links.filter((l) => l.platform && l.handle.trim());

  return (
    <div className="sticky top-6 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Live Preview</p>
        <span className={[
          "text-xs font-medium px-2 py-0.5 rounded-full",
          pct === 100 ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500",
        ].join(" ")}>
          {pct}% complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-zinc-900 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
        {/* Gradient header */}
        <div className={`h-20 bg-gradient-to-br ${gradientClass}`} />

        {/* Avatar */}
        <div className="px-5 pb-5">
          <div className="-mt-10 mb-3">
            {form.imageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.imageDataUrl}
                alt="Profile"
                className="w-20 h-20 rounded-full border-4 border-white object-cover shadow-sm"
              />
            ) : (
              <div
                className={`w-20 h-20 rounded-full border-4 border-white bg-gradient-to-br ${gradientClass} flex items-center justify-center shadow-sm`}
              >
                <span className="text-white font-bold text-xl">
                  {avatarInitials(form.name)}
                </span>
              </div>
            )}
          </div>

          {/* Name & username */}
          <div className="mb-3">
            <p className="font-semibold text-zinc-900 text-base leading-tight">
              {form.name.trim() || <span className="text-zinc-300">Your Name</span>}
            </p>
            {form.username ? (
              <p className="text-sm text-zinc-500 mt-0.5">@{form.username}</p>
            ) : (
              <p className="text-sm text-zinc-300 mt-0.5">@username</p>
            )}
          </div>

          {/* Bio */}
          {form.bio.trim() ? (
            <p className="text-sm text-zinc-600 leading-relaxed mb-4">{form.bio}</p>
          ) : (
            <p className="text-sm text-zinc-300 leading-relaxed mb-4 italic">
              Your bio will appear here…
            </p>
          )}

          {/* Social links */}
          {filledLinks.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {filledLinks.map((link) => {
                const meta = platformMeta[link.platform as PlatformId];
                const display = meta.prefix
                  ? `${meta.prefix}${link.handle}`
                  : link.handle;
                return (
                  <span
                    key={link.id}
                    className={[
                      "inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border",
                      meta.color,
                    ].join(" ")}
                  >
                    {meta.label.split("/")[0]} · {display}
                  </span>
                );
              })}
            </div>
          ) : (
            <div className="flex gap-1.5">
              {["IG", "TT", "YT"].map((p) => (
                <span
                  key={p}
                  className="text-xs px-2.5 py-1 rounded-full border border-zinc-100 text-zinc-300 bg-zinc-50"
                >
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-zinc-50 rounded-xl border border-zinc-100 px-4 py-3 space-y-1.5">
        {[
          { label: "Name",          done: form.name.trim().length >= 2 },
          { label: "Username",      done: /^[a-z0-9_]{3,30}$/.test(form.username) },
          { label: "Bio",           done: form.bio.trim().length > 0 },
          { label: "Profile photo", done: !!form.imageDataUrl },
          { label: "Social link",   done: form.links.some((l) => l.platform && l.handle) },
        ].map(({ label, done }) => (
          <div key={label} className="flex items-center gap-2">
            <span className={[
              "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0",
              done ? "bg-emerald-500" : "bg-zinc-200",
            ].join(" ")}>
              {done && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <span className={["text-xs", done ? "text-zinc-600" : "text-zinc-400"].join(" ")}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  error,
  children,
  aside,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-700">{label}</label>
        {aside}
      </div>
      {children}
      {hint && !error && <p className="text-xs text-zinc-400">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputCls = (hasError?: boolean) =>
  [
    "w-full rounded-lg border px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 bg-white",
    "focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-shadow",
    hasError ? "border-red-400 focus:ring-red-500" : "border-zinc-200",
  ].join(" ");

// ─── Main Form ────────────────────────────────────────────────────────────────

const INITIAL: FormData = {
  name: "",
  username: "",
  bio: "",
  imageDataUrl: "",
  links: [],
};

export default function TalentProfileForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [touched, setTouched] = useState<Touched>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const errors = validate(form);

  const set = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  function touch(field: keyof Touched) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function visibleError(field: keyof Touched): string | undefined {
    return (submitAttempted || touched[field]) ? errors[field] : undefined;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);
    if (hasErrors(errors)) return;
    setSubmitted(true);
    setTimeout(() => router.push(`/talent/${form.username}`), 1400);
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-xl font-semibold text-zinc-900">Profile published!</p>
          <p className="text-sm text-zinc-500 mt-2">Redirecting to your profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
            Create your profile
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Fill in your details to get discovered by agencies.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ── Form ── */}
          <form onSubmit={handleSubmit} noValidate className="lg:col-span-3 space-y-5">

            {/* Basic info */}
            <Card>
              <h2 className="text-sm font-semibold text-zinc-900 mb-5">Basic info</h2>
              <div className="space-y-4">

                <Field
                  label="Full Name"
                  error={visibleError("name")}
                >
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    onBlur={() => touch("name")}
                    placeholder="Sofia Mendes"
                    className={inputCls(!!visibleError("name"))}
                  />
                </Field>

                <Field
                  label="Username"
                  hint={`Profile URL: /talent/${form.username || "username"}`}
                  error={visibleError("username")}
                >
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 pointer-events-none select-none">
                      @
                    </span>
                    <input
                      type="text"
                      value={form.username}
                      onChange={(e) =>
                        set("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                      }
                      onBlur={() => touch("username")}
                      placeholder="sofiam"
                      className={inputCls(!!visibleError("username")) + " pl-7"}
                    />
                  </div>
                </Field>

                <Field
                  label="Bio"
                  error={visibleError("bio")}
                  aside={
                    <span className={[
                      "text-xs tabular-nums",
                      form.bio.length > BIO_MAX ? "text-red-500 font-medium" : "text-zinc-400",
                    ].join(" ")}>
                      {form.bio.length}/{BIO_MAX}
                    </span>
                  }
                >
                  <textarea
                    value={form.bio}
                    onChange={(e) => set("bio", e.target.value)}
                    onBlur={() => touch("bio")}
                    placeholder="Tell agencies about yourself and what you create…"
                    rows={4}
                    className={inputCls(!!visibleError("bio")) + " resize-none"}
                  />
                </Field>

              </div>
            </Card>

            {/* Photo */}
            <Card>
              <h2 className="text-sm font-semibold text-zinc-900 mb-1">Profile photo</h2>
              <p className="text-xs text-zinc-400 mb-5">
                Agencies will see this on your profile card. Square images work best.
              </p>
              <ImageUpload
                value={form.imageDataUrl}
                onChange={(v) => set("imageDataUrl", v)}
              />
            </Card>

            {/* Social links */}
            <Card>
              <h2 className="text-sm font-semibold text-zinc-900 mb-1">Social links</h2>
              <p className="text-xs text-zinc-400 mb-5">
                Add up to {PLATFORMS.length} platforms. At least one is recommended.
              </p>
              <SocialLinksEditor
                links={form.links}
                errors={submitAttempted ? errors.links : undefined}
                onChange={(v) => set("links", v)}
              />
            </Card>

            {/* Submit */}
            <div className="space-y-3">
              {submitAttempted && hasErrors(errors) && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  Fix the errors above before publishing.
                </div>
              )}
              <Button type="submit" size="lg" fullWidth>
                Publish Profile
              </Button>
            </div>
          </form>

          {/* ── Preview ── */}
          <div className="lg:col-span-2">
            <ProfilePreview form={form} />
          </div>
        </div>
      </div>
    </div>
  );
}
