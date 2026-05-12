"use client";

import { useRef, useState } from "react";
import { useT } from "@/lib/LanguageContext";
import type { PremiumMembership, PremiumWorkspace } from "@/lib/premiumWorkspace.server";

const WELCOME_MAX = 500;
const DEFAULT_PRIMARY = "#1ABC9C";
const DEFAULT_ACCENT = "#27C1D6";

interface Props {
  workspace: PremiumWorkspace;
  membership: PremiumMembership;
}

function LogoAvatar({ logoUrl, name, color }: { logoUrl: string | null; name: string; color: string }) {
  const initials =
    name
      .split(" ")
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("") || "?";

  return (
    <div
      className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200"
      style={{ background: logoUrl ? "#f4f4f5" : color }}
    >
      {logoUrl ? (
        <img src={logoUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="select-none text-[22px] font-bold text-white">{initials}</span>
      )}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff"}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-10 cursor-pointer rounded-lg border border-zinc-200 bg-white p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={7}
          placeholder={placeholder}
          className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 font-mono text-[13px] text-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
      </div>
    </div>
  );
}

function BrandingForm({ workspace }: { workspace: PremiumWorkspace }) {
  const { t } = useT();
  const [name, setName] = useState(workspace.name);
  const [primaryColor, setPrimaryColor] = useState(workspace.brandPrimaryColor ?? DEFAULT_PRIMARY);
  const [accentColor, setAccentColor] = useState(workspace.brandAccentColor ?? DEFAULT_ACCENT);
  const [welcomeMessage, setWelcomeMessage] = useState(workspace.welcomeMessage ?? "");
  const [logoUrl, setLogoUrl] = useState<string | null>(workspace.logoUrl);
  const [logoUploading, setLogoUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 5000);
  }

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/agency/workspace/branding/logo", { method: "POST", body: form });
    setLogoUploading(false);

    if (response.ok) {
      const data = (await response.json()) as { logoUrl: string };
      setLogoUrl(data.logoUrl);
      showToast(t("workspace_branding_logo_uploaded" as never), true);
    } else {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      showToast(data.error ?? t("workspace_branding_logo_upload_failed" as never), false);
    }

    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    const response = await fetch("/api/agency/workspace/branding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        brandPrimaryColor: /^#[0-9a-fA-F]{6}$/.test(primaryColor) ? primaryColor : null,
        brandAccentColor: /^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : null,
        welcomeMessage: welcomeMessage.trim() || null,
        logoUrl,
      }),
    });
    setSaving(false);

    if (response.ok) {
      showToast(t("workspace_branding_saved" as never), true);
    } else {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      showToast(data.error ?? t("workspace_branding_save_failed" as never), false);
    }
  }

  const previewPrimary = /^#[0-9a-fA-F]{6}$/.test(primaryColor) ? primaryColor : DEFAULT_PRIMARY;
  const previewAccent = /^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : DEFAULT_ACCENT;

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex items-start gap-5">
        <LogoAvatar logoUrl={logoUrl} name={name} color={previewPrimary} />
        <div className="space-y-2 pt-1">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500">
            {t("workspace_branding_logo" as never)}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={logoUploading}
              className="rounded-xl border border-zinc-200 px-3.5 py-1.5 text-[12px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
            >
              {logoUploading
                ? t("action_loading" as never)
                : logoUrl
                  ? t("workspace_branding_change_logo" as never)
                  : t("workspace_branding_upload_logo" as never)}
            </button>
            {logoUrl ? (
              <button
                type="button"
                onClick={() => setLogoUrl(null)}
                className="rounded-xl border border-red-100 px-3.5 py-1.5 text-[12px] font-semibold text-red-500 transition-colors hover:bg-red-50"
              >
                {t("workspace_branding_remove_logo" as never)}
              </button>
            ) : null}
          </div>
          <p className="text-[11px] text-zinc-400">PNG, JPG ou WebP · Máx. 5MB</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleLogoUpload}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500">
          {t("workspace_branding_space_name" as never)} <span className="text-rose-400">*</span>
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={100}
          placeholder="ex: Agência Elite Models"
          className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-[14px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ColorField
          label={t("workspace_branding_primary_color" as never)}
          value={primaryColor}
          onChange={setPrimaryColor}
          placeholder={DEFAULT_PRIMARY}
        />
        <ColorField
          label={t("workspace_branding_accent_color" as never)}
          value={accentColor}
          onChange={setAccentColor}
          placeholder={DEFAULT_ACCENT}
        />
      </div>

      <div className="h-1.5 rounded-full" style={{ background: `linear-gradient(to right, ${previewPrimary}, ${previewAccent})` }} />

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500">
            {t("workspace_branding_welcome" as never)}
          </label>
          <span className={`text-[11px] tabular-nums ${welcomeMessage.length > WELCOME_MAX ? "font-medium text-rose-400" : "text-zinc-400"}`}>
            {welcomeMessage.length}/{WELCOME_MAX}
          </span>
        </div>
        <textarea
          value={welcomeMessage}
          onChange={(event) => setWelcomeMessage(event.target.value)}
          rows={3}
          maxLength={WELCOME_MAX}
          placeholder="Bem-vindo ao ambiente privado da nossa agência."
          className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2.5 text-[14px] leading-relaxed text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
      </div>

      {toast ? (
        <p className={`text-[12px] font-medium ${toast.ok ? "text-emerald-600" : "text-rose-500"}`}>
          {toast.msg}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving || !name.trim() || welcomeMessage.length > WELCOME_MAX}
        className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? t("action_loading" as never) : t("workspace_branding_save" as never)}
      </button>
    </form>
  );
}

function BrandingReadOnly({ workspace }: { workspace: PremiumWorkspace }) {
  const { t } = useT();
  const primary = workspace.brandPrimaryColor ?? DEFAULT_PRIMARY;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <LogoAvatar logoUrl={workspace.logoUrl} name={workspace.name} color={primary} />
        <div>
          <p className="text-[15px] font-semibold text-zinc-900">{workspace.name}</p>
          {workspace.welcomeMessage ? (
            <p className="mt-1 text-[13px] leading-snug text-zinc-500">{workspace.welcomeMessage}</p>
          ) : null}
        </div>
      </div>
      {workspace.brandPrimaryColor || workspace.brandAccentColor ? (
        <div
          className="h-1 rounded-full"
          style={{ background: `linear-gradient(to right, ${primary}, ${workspace.brandAccentColor ?? primary})` }}
        />
      ) : null}
      <p className="text-[12px] text-zinc-400">{t("workspace_branding_owner_only" as never)}</p>
    </div>
  );
}

export default function WorkspaceBrandingForm({ workspace, membership }: Props) {
  if (membership.role === "owner") return <BrandingForm workspace={workspace} />;
  return <BrandingReadOnly workspace={workspace} />;
}
