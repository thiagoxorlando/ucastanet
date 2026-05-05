"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ── Change Password ────────────────────────────────────────────────────────────

function ChangePasswordSection() {
  const [open, setOpen]           = useState(false);
  const [current, setCurrent]     = useState("");
  const [next, setNext]           = useState("");
  const [confirm, setConfirm]     = useState("");
  const [saving, setSaving]       = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSaving(true);

    const res = await fetch("/api/profile/change-password", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ currentPassword: current, newPassword: next, confirmPassword: confirm }),
    });
    const d = await res.json().catch(() => ({}));

    setSaving(false);

    if (res.ok) {
      setSuccess(true);
      setCurrent("");
      setNext("");
      setConfirm("");
      setTimeout(() => { setSuccess(false); setOpen(false); }, 3000);
    } else {
      setError(d.error ?? "Erro ao alterar senha.");
    }
  }

  const inputCls =
    "w-full px-4 py-3 text-[14px] rounded-xl border border-zinc-200 hover:border-zinc-300 focus:border-zinc-900 focus:outline-none transition-colors bg-white";

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-0.5">Segurança</p>
          <p className="text-[14px] font-semibold text-zinc-900">Alterar senha</p>
        </div>
        <button
          type="button"
          onClick={() => { setOpen((o) => !o); setError(""); setSuccess(false); }}
          className="text-[13px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
        >
          {open ? "Cancelar" : "Alterar"}
        </button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-zinc-600 mb-1.5">Senha atual</label>
            <input
              type="password" required autoComplete="current-password"
              value={current} onChange={(e) => setCurrent(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-zinc-600 mb-1.5">Nova senha</label>
            <input
              type="password" required autoComplete="new-password" minLength={8}
              value={next} onChange={(e) => setNext(e.target.value)}
              className={inputCls}
            />
            <p className="text-[11px] text-zinc-400 mt-1">Mínimo 8 caracteres.</p>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-zinc-600 mb-1.5">Confirmar nova senha</label>
            <input
              type="password" required autoComplete="new-password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className={inputCls}
            />
          </div>

          {error && (
            <p className="text-[13px] text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
              {error}
            </p>
          )}
          {success && (
            <p className="text-[13px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
              Senha alterada com sucesso.
            </p>
          )}

          <button
            type="submit" disabled={saving}
            className="w-full bg-zinc-900 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[14px] font-medium py-3 rounded-xl transition-colors cursor-pointer"
          >
            {saving ? "Alterando…" : "Confirmar alteração"}
          </button>
        </form>
      )}
    </div>
  );
}

// ── Delete Account ─────────────────────────────────────────────────────────────

function DeleteAccountSection() {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/profile/delete-account", { method: "POST" });
    const d   = await res.json().catch(() => ({}));

    if (!res.ok) {
      setLoading(false);
      setError(d.error ?? "Não foi possível excluir a conta. Tente novamente.");
      return;
    }

    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="bg-white rounded-2xl border border-rose-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-rose-400 mb-0.5">Zona de perigo</p>
          <p className="text-[14px] font-semibold text-zinc-900">Excluir minha conta</p>
          <p className="text-[12px] text-zinc-400 mt-0.5">
            Irreversível. Dados financeiros são preservados por obrigação legal.
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-[13px] font-medium text-rose-600 hover:text-rose-800 transition-colors cursor-pointer whitespace-nowrap ml-4"
          >
            Excluir
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={handleDelete} className="mt-5 space-y-4">
          <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3.5 text-[13px] text-rose-700 leading-relaxed">
            Para confirmar, você precisa ter saldo zero e nenhuma ação pendente (vagas abertas, contratos, saques).
          </div>

          <div>
            <label className="block text-[12px] font-medium text-zinc-600 mb-1.5">
              Digite <strong>EXCLUIR</strong> para confirmar
            </label>
            <input
              type="text" required autoComplete="off"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-3 text-[14px] rounded-xl border border-rose-200 focus:border-rose-400 focus:outline-none transition-colors"
            />
          </div>

          {error && (
            <p className="text-[13px] text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setOpen(false); setConfirm(""); setError(""); }}
              className="flex-1 border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-[14px] font-medium py-3 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || confirm !== "EXCLUIR"}
              className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[14px] font-medium py-3 rounded-xl transition-colors cursor-pointer"
            >
              {loading ? "Excluindo…" : "Excluir conta"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Exported combined section ──────────────────────────────────────────────────

export default function AccountActions() {
  return (
    <div className="space-y-4">
      <ChangePasswordSection />
      <DeleteAccountSection />
    </div>
  );
}
