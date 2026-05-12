"use client";

import { useState, useRef } from "react";
import type { PremiumWorkspace, PremiumMembership } from "@/lib/premiumWorkspace.server";

const WELCOME_MAX = 500;
const DEFAULT_PRIMARY = "#1ABC9C";
const DEFAULT_ACCENT = "#27C1D6";

interface Props {
  workspace: PremiumWorkspace;
  membership: PremiumMembership;
}

// ── Logo avatar ────────────────────────────────────────────────────────────────

function LogoAvatar({ logoUrl, name, color }: { logoUrl: string | null; name: string; color: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

  return (
    <div
      className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-zinc-200"
      style={{ background: logoUrl ? "#f4f4f5" : color }}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="Logo do workspace" className="w-full h-full object-cover" />
      ) : (
        <span className="text-[22px] font-bold text-white select-none">{initials}</span>
      )}
    </div>
  );
}

// ── Color field ────────────────────────────────────────────────────────────────

function ColorField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-semibold text-zinc-500 uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-zinc-200 cursor-pointer p-0.5 bg-white"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          placeholder={placeholder}
          className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-[13px] text-zinc-700 font-mono focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
      </div>
    </div>
  );
}

// ── Branding form (owner only) ─────────────────────────────────────────────────

function BrandingForm({ workspace }: { workspace: PremiumWorkspace }) {
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

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/agency/workspace/branding/logo", { method: "POST", body: form });
    setLogoUploading(false);
    if (res.ok) {
      const data = (await res.json()) as { logoUrl: string };
      setLogoUrl(data.logoUrl);
      showToast("Logo enviado com sucesso.", true);
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      showToast(data.error ?? "Não foi possível enviar o logo.", false);
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleRemoveLogo() {
    setLogoUrl(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/agency/workspace/branding", {
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
    if (res.ok) {
      showToast("Personalização salva com sucesso.", true);
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      showToast(data.error ?? "Não foi possível salvar a personalização.", false);
    }
  }

  const previewPrimary = /^#[0-9a-fA-F]{6}$/.test(primaryColor) ? primaryColor : DEFAULT_PRIMARY;

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Logo upload */}
      <div className="flex items-start gap-5">
        <LogoAvatar logoUrl={logoUrl} name={name} color={previewPrimary} />
        <div className="space-y-2 pt-1">
          <p className="text-[12px] font-semibold text-zinc-500 uppercase tracking-wide">Logo</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={logoUploading}
              className="px-3.5 py-1.5 rounded-xl border border-zinc-200 text-[12px] font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {logoUploading ? "Enviando…" : logoUrl ? "Trocar logo" : "Enviar logo"}
            </button>
            {logoUrl && (
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="px-3.5 py-1.5 rounded-xl border border-red-100 text-[12px] font-semibold text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
              >
                Remover logo
              </button>
            )}
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

      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-[12px] font-semibold text-zinc-500 uppercase tracking-wide">
          Nome do espaço <span className="text-rose-400">*</span>
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder="ex: Agência Elite Models"
          className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-[14px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
      </div>

      {/* Colors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ColorField
          label="Cor principal"
          value={primaryColor}
          onChange={setPrimaryColor}
          placeholder={DEFAULT_PRIMARY}
        />
        <ColorField
          label="Cor de destaque"
          value={accentColor}
          onChange={setAccentColor}
          placeholder={DEFAULT_ACCENT}
        />
      </div>

      {/* Live color preview strip */}
      <div
        className="h-1.5 rounded-full"
        style={{ background: `linear-gradient(to right, ${previewPrimary}, ${/^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : DEFAULT_ACCENT})` }}
      />

      {/* Welcome message */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[12px] font-semibold text-zinc-500 uppercase tracking-wide">
            Mensagem de boas-vindas
          </label>
          <span className={`text-[11px] tabular-nums ${welcomeMessage.length > WELCOME_MAX ? "text-rose-400 font-medium" : "text-zinc-400"}`}>
            {welcomeMessage.length}/{WELCOME_MAX}
          </span>
        </div>
        <textarea
          value={welcomeMessage}
          onChange={(e) => setWelcomeMessage(e.target.value)}
          rows={3}
          maxLength={WELCOME_MAX}
          placeholder="Bem-vindo ao ambiente privado da nossa agência."
          className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-[14px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none leading-relaxed"
        />
      </div>

      {/* Toast */}
      {toast && (
        <p className={`text-[12px] font-medium ${toast.ok ? "text-emerald-600" : "text-rose-500"}`}>
          {toast.ok ? "✓ " : "✗ "}{toast.msg}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={saving || !name.trim() || welcomeMessage.length > WELCOME_MAX}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {saving ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Salvando…
          </>
        ) : "Salvar personalização"}
      </button>
    </form>
  );
}

// ── Agent read-only view ───────────────────────────────────────────────────────

function BrandingReadOnly({ workspace }: { workspace: PremiumWorkspace }) {
  const primary = workspace.brandPrimaryColor ?? DEFAULT_PRIMARY;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <LogoAvatar logoUrl={workspace.logoUrl} name={workspace.name} color={primary} />
        <div>
          <p className="text-[15px] font-semibold text-zinc-900">{workspace.name}</p>
          {workspace.welcomeMessage && (
            <p className="text-[13px] text-zinc-500 mt-1 leading-snug">{workspace.welcomeMessage}</p>
          )}
        </div>
      </div>
      {(workspace.brandPrimaryColor || workspace.brandAccentColor) && (
        <div
          className="h-1 rounded-full"
          style={{ background: `linear-gradient(to right, ${primary}, ${workspace.brandAccentColor ?? primary})` }}
        />
      )}
      <p className="text-[12px] text-zinc-400">Somente o proprietário pode editar a personalização.</p>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export default function WorkspaceBrandingForm({ workspace, membership }: Props) {
  if (membership.role === "owner") {
    return <BrandingForm workspace={workspace} />;
  }
  return <BrandingReadOnly workspace={workspace} />;
}
