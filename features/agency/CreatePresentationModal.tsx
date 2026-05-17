"use client";

import { useState } from "react";

export type PresentationCandidate = {
  id: string;   // submission id
  name: string;
};

type Props = {
  workspaceId: string;
  jobId: string;
  preselected: PresentationCandidate[];
  onClose: () => void;
  onCreated: (token: string) => void;
};

export default function CreatePresentationModal({
  workspaceId,
  jobId,
  preselected,
  onClose,
  onCreated,
}: Props) {
  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [password, setPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Título obrigatório."); return; }
    if (!preselected.length) { setError("Selecione ao menos um candidato."); return; }

    setSaving(true);
    setError("");

    const res = await fetch("/api/workspace/presentations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        jobId,
        submissionIds: preselected.map((c) => c.id),
        title: title.trim(),
        intro: intro.trim() || undefined,
        password: password.trim() || undefined,
        expiresAt: expiresAt || undefined,
      }),
    });

    const data = await res.json() as { ok?: boolean; token?: string; error?: string };
    setSaving(false);

    if (!res.ok || !data.token) {
      setError(data.error ?? "Erro ao criar apresentação.");
      return;
    }

    onCreated(data.token);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-[24px] border border-zinc-200 bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-[1.1rem] font-bold text-zinc-900 mb-1">Criar apresentação</h2>
        <p className="text-[12px] text-zinc-500 mb-5">
          {preselected.length} candidato{preselected.length !== 1 ? "s" : ""} selecionado{preselected.length !== 1 ? "s" : ""}
        </p>

        {/* Candidate chips */}
        <div className="mb-5 flex flex-wrap gap-1.5">
          {preselected.map((c) => (
            <span
              key={c.id}
              className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-700"
            >
              {c.name}
            </span>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-zinc-700">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Shortlist — Campanha Verão 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 w-full rounded-xl border border-zinc-200 px-3 text-[13px] text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none transition-colors"
            />
          </div>

          {/* Intro */}
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-zinc-700">
              Mensagem de boas-vindas <span className="text-zinc-400">(opcional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Contexto para o cliente, instruções de aprovação..."
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2.5 text-[13px] text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none transition-colors"
            />
          </div>

          {/* Password + expiry row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-zinc-700">
                Senha <span className="text-zinc-400">(opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Deixe em branco = público"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 w-full rounded-xl border border-zinc-200 px-3 text-[13px] text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-zinc-700">
                Expira em <span className="text-zinc-400">(opcional)</span>
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="h-10 w-full rounded-xl border border-zinc-200 px-3 text-[13px] text-zinc-800 focus:border-zinc-400 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {error && <p className="text-[12px] text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-zinc-200 text-[13px] font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 h-10 rounded-xl bg-[#1ABC9C] text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
            >
              {saving ? "Criando..." : "Criar apresentação"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
