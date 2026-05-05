"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Talent = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  main_role: string | null;
};

type Job = {
  id: string;
  title: string;
};

interface Props {
  talent: Talent;
  agencyId: string;
  onClose: () => void;
}

export default function InviteModal({ talent, agencyId, onClose }: Props) {
  const [jobs, setJobs]       = useState<Job[]>([]);
  const [jobId, setJobId]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [done, setDone]       = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    supabase
      .from("jobs")
      .select("id, title")
      .eq("agency_id", agencyId)
      .eq("status", "open")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .then(({ data }) => setJobs(data ?? []));
  }, [agencyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!jobId) { setError("Selecione uma vaga."); return; }

    setLoading(true);
    setError(null);

    const res = await fetch(`/api/jobs/${jobId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ talent_id: talent.id }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json();
      if (body.error === "already_invited") {
        setError("Convite já enviado para esta vaga.");
        return;
      }
      setError(body.error ?? "Algo deu errado.");
      return;
    }

    setDone(true);
    setTimeout(onClose, 1800);
  }

  const initials = (talent.full_name ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-br from-[#1ABC9C] to-[#27C1D6] px-6 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-white/20">
              {talent.avatar_url ? (
                <img src={talent.avatar_url} alt={talent.full_name ?? ""} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/20 flex items-center justify-center text-white font-semibold text-[15px]">
                  {initials}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-[15px] truncate">{talent.full_name ?? "—"}</p>
              <p className="text-white/70 text-[12px]">{talent.main_role ?? "Talento"}</p>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-white/90 text-[13px] mt-3 font-semibold">Convidar talento para uma vaga</p>
        </div>

        {done ? (
          <div className="px-6 py-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-zinc-900">Convite enviado!</p>
            <p className="text-[13px] text-zinc-500">
              {talent.full_name} receberá uma notificação para se candidatar.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

            <div>
              <label className="block text-[12px] font-medium text-zinc-600 mb-1.5">
                Vaga aberta *
              </label>
              <div className="relative">
                <select
                  value={jobId}
                  onChange={(e) => { setJobId(e.target.value); setError(null); }}
                  className="w-full px-4 py-3 text-[14px] rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors bg-white appearance-none pr-10 cursor-pointer"
                >
                  <option value="">Selecione uma vaga aberta</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {jobs.length === 0 && (
                <p className="text-[12px] text-zinc-400 mt-1.5">Nenhuma vaga aberta no momento.</p>
              )}
            </div>

            {error && (
              <p className="text-[12px] text-rose-500 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-zinc-200 text-[14px] font-medium text-zinc-500 hover:bg-zinc-50 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || jobs.length === 0}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#1ABC9C] to-[#27C1D6] hover:from-[#17A58A] hover:to-[#22B5C2] active:scale-[0.98] text-white text-[14px] font-semibold transition-all disabled:opacity-50"
              >
                {loading ? "Enviando…" : "Enviar convite"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
