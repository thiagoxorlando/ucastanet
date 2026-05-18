"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────

type Candidate = {
  id: string;
  name: string;
  avatarUrl: string | null;
  age: number | null;
  city: string | null;
  gender: string | null;
  bio: string;
  photoFrontUrl: string | null;
  photoLeftUrl: string | null;
  photoRightUrl: string | null;
  videoUrl: string | null;
  portfolioUrl: string | null;
  curriculumUrl: string | null;
};

type Workspace = {
  name: string;
  logoUrl: string | null;
  brandColor: string;
};

type PresentationData = {
  id: string;
  title: string;
  intro: string | null;
  workspace: Workspace;
  candidates: Candidate[];
};

type Vote = "approved" | "rejected" | "favorite";
type VoteMap = Record<string, Vote>;

// ─── Client session token ─────────────────────────────────────────────────────

function getClientToken(): string {
  const KEY = "brisa_presentation_session";
  if (typeof localStorage === "undefined") return crypto.randomUUID();
  const existing = localStorage.getItem(KEY);
  if (existing) return existing;
  const next = crypto.randomUUID();
  localStorage.setItem(KEY, next);
  return next;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function genderLabel(g: string | null): string | null {
  if (!g) return null;
  const map: Record<string, string> = {
    male: "Masculino", female: "Feminino", non_binary: "Não-binário",
    masculino: "Masculino", feminino: "Feminino",
  };
  return map[g.toLowerCase()] ?? g;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ClientPresentation({ token }: { token: string }) {
  const [state, setState] = useState<"loading" | "gate" | "ready" | "expired" | "error">("loading");
  const [gatePassword, setGatePassword] = useState("");
  const [gateError, setGateError] = useState("");
  const [gateLoading, setGateLoading] = useState(false);
  const [data, setData] = useState<PresentationData | null>(null);
  const [votes, setVotes] = useState<VoteMap>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const clientTokenRef = useRef<string>("");

  const fetchPresentation = useCallback(async (password?: string) => {
    const url = password
      ? `/api/presentation/${token}?password=${encodeURIComponent(password)}`
      : `/api/presentation/${token}`;

    const res = await fetch(url);
    const json = await res.json() as {
      requiresPassword?: boolean;
      error?: string;
      presentation?: PresentationData;
    };

    if (res.status === 401 && json.requiresPassword) { setState("gate"); return; }
    if (res.status === 401) { setGateError(json.error ?? "Senha incorreta."); setGateLoading(false); return; }
    if (res.status === 410) { setState("expired"); return; }
    if (!res.ok || !json.presentation) { setState("error"); return; }

    setData(json.presentation);
    setState("ready");
  }, [token]);

  useEffect(() => {
    clientTokenRef.current = getClientToken();
    fetchPresentation();
  }, [fetchPresentation]);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gatePassword.trim()) return;
    setGateLoading(true);
    setGateError("");
    await fetchPresentation(gatePassword.trim());
  }

  async function submitVote(candidateId: string, vote: Vote) {
    const prev = votes[candidateId];
    const nextVote = prev === vote ? null : vote;
    setVotes((v) => {
      const next = { ...v };
      if (nextVote) next[candidateId] = nextVote;
      else delete next[candidateId];
      return next;
    });

    if (!nextVote) return;

    fetch(`/api/presentation/${token}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submissionId: candidateId,
        vote: nextVote,
        clientToken: clientTokenRef.current,
      }),
    }).catch(() => {});
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#E6F0FD] border-t-[#1ABC9C]" />
          <p className="text-[13px] font-medium text-[#647B7B]">Carregando apresentação…</p>
        </div>
      </div>
    );
  }

  // ── Expired ──────────────────────────────────────────────────────────────────
  if (state === "expired") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
        <div className="w-full max-w-sm rounded-3xl border border-[#E6F0FD] bg-white p-10 text-center shadow-[0_8px_40px_rgba(26,188,156,0.08)]">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E6F0FD]">
            <svg className="h-8 w-8 text-[#0E7CB6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-[1.2rem] font-bold text-[#1F2D2E]">Apresentação expirada</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[#647B7B]">O link desta apresentação não está mais ativo. Entre em contato com a agência.</p>
          <p className="mt-6 text-[11px] text-[#7FA9A8]">Powered by BrisaHub</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
        <div className="w-full max-w-sm rounded-3xl border border-[#E6F0FD] bg-white p-10 text-center shadow-[0_8px_40px_rgba(26,188,156,0.08)]">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E6F0FD]">
            <svg className="h-8 w-8 text-[#0E7CB6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h1 className="text-[1.2rem] font-bold text-[#1F2D2E]">Apresentação não encontrada</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[#647B7B]">Verifique o link enviado pela agência e tente novamente.</p>
          <p className="mt-6 text-[11px] text-[#7FA9A8]">Powered by BrisaHub</p>
        </div>
      </div>
    );
  }

  // ── Password gate ─────────────────────────────────────────────────────────────
  if (state === "gate") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
        <div className="w-full max-w-sm">
          {/* Brand mark */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "linear-gradient(135deg, #1ABC9C 0%, #0E7CB6 100%)" }}>
              <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-[1.25rem] font-bold text-[#1F2D2E]">Apresentação protegida</h2>
            <p className="mt-1.5 text-[13px] text-[#647B7B]">Insira a senha para visualizar os talentos.</p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <input
              type="password"
              placeholder="Senha de acesso"
              value={gatePassword}
              onChange={(e) => setGatePassword(e.target.value)}
              autoFocus
              className="h-12 w-full rounded-2xl border border-[#E6F0FD] bg-white px-4 text-[14px] text-[#1F2D2E] placeholder:text-[#7FA9A8] focus:border-[#1ABC9C] focus:outline-none focus:ring-2 focus:ring-[#1ABC9C]/20 transition-all"
            />
            {gateError && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-[12px] font-medium text-red-600">{gateError}</p>
            )}
            <button
              type="submit"
              disabled={gateLoading || !gatePassword.trim()}
              className="h-12 w-full rounded-2xl text-[14px] font-bold text-white transition-all disabled:opacity-50 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #1ABC9C 0%, #0E7CB6 100%)" }}
            >
              {gateLoading ? "Verificando…" : "Acessar apresentação"}
            </button>
          </form>
          <p className="mt-6 text-center text-[11px] text-[#7FA9A8]">Powered by BrisaHub</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const ws = data.workspace;
  const brandColor = ws.brandColor || "#1ABC9C";
  const totalVoted = Object.keys(votes).length;
  const approvedCount  = Object.values(votes).filter((v) => v === "approved").length;
  const favoriteCount  = Object.values(votes).filter((v) => v === "favorite").length;
  const rejectedCount  = Object.values(votes).filter((v) => v === "rejected").length;

  // ── Presentation ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* Hero header — brand gradient */}
      <header className="relative overflow-hidden pb-10 pt-8" style={{ background: "radial-gradient(ellipse at top, #1ABC9C 0%, #0B3C3D 100%)" }}>

        {/* Decorative rings */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full border border-white/8" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full border border-white/10" />

        <div className="relative mx-auto max-w-4xl px-5 sm:px-8">
          {/* Workspace identity */}
          <div className="mb-6 flex items-center gap-3">
            {ws.logoUrl ? (
              <Image
                src={ws.logoUrl}
                alt={ws.name}
                width={44}
                height={44}
                className="h-11 w-11 rounded-2xl object-contain ring-2 ring-white/20"
              />
            ) : (
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl text-[13px] font-bold text-white ring-2 ring-white/20"
                style={{ background: `linear-gradient(135deg, ${brandColor}dd, ${brandColor}88)` }}
              >
                {ws.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6EE7E7]">
                {ws.name}
              </p>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-[2rem] font-black leading-tight tracking-tight text-white sm:text-[2.4rem]">
            {data.title}
          </h1>

          {/* Intro */}
          {data.intro && (
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-white/75 whitespace-pre-wrap">
              {data.intro}
            </p>
          )}

          {/* Stats row */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#6EE7E7]" />
              {data.candidates.length} talento{data.candidates.length !== 1 ? "s" : ""}
            </span>
            {totalVoted > 0 && (
              <>
                {approvedCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1.5 text-[12px] font-semibold text-emerald-200">
                    ✓ {approvedCount} aprovado{approvedCount !== 1 ? "s" : ""}
                  </span>
                )}
                {favoriteCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1.5 text-[12px] font-semibold text-amber-200">
                    ★ {favoriteCount} favorito{favoriteCount !== 1 ? "s" : ""}
                  </span>
                )}
                {rejectedCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white/60">
                    ✕ {rejectedCount} rejeitado{rejectedCount !== 1 ? "s" : ""}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 32" preserveAspectRatio="none" className="h-8 w-full" fill="#F8FAFC">
            <path d="M0,32 C360,0 1080,0 1440,32 L1440,32 L0,32 Z" />
          </svg>
        </div>
      </header>

      {/* Feedback hint — shown until first vote */}
      {totalVoted === 0 && data.candidates.length > 0 && (
        <div className="mx-auto max-w-4xl px-5 pt-6 sm:px-8">
          <div className="flex items-center gap-2.5 rounded-2xl border border-[#6EE7E7]/40 bg-[#E6F0FD]/60 px-4 py-3">
            <svg className="h-4 w-4 flex-shrink-0 text-[#0E7CB6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[12px] font-medium text-[#0B3C3D]">
              Avalie cada talento usando os botões{" "}
              <span className="font-bold text-emerald-700">Aprovar</span>,{" "}
              <span className="font-bold text-amber-600">Favorito</span> e{" "}
              <span className="font-bold text-zinc-600">Rejeitar</span> abaixo de cada card.
            </p>
          </div>
        </div>
      )}

      {/* Candidates grid */}
      <main className="mx-auto max-w-4xl px-5 pb-16 pt-6 sm:px-8">
        {data.candidates.length === 0 ? (
          <div className="rounded-3xl border border-[#E6F0FD] bg-white py-20 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E6F0FD]">
              <svg className="h-7 w-7 text-[#0E7CB6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-[15px] font-bold text-[#1F2D2E]">Nenhum talento</p>
            <p className="mt-1 text-[13px] text-[#7FA9A8]">Esta apresentação ainda não possui candidatos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.candidates.map((c) => (
              <CandidateCard
                key={c.id}
                candidate={c}
                vote={votes[c.id] ?? null}
                expanded={expanded === c.id}
                onToggleExpand={() => setExpanded((prev) => prev === c.id ? null : c.id)}
                onVote={(v) => submitVote(c.id, v)}
                brandColor={brandColor}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-14 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-md" style={{ background: "linear-gradient(135deg, #1ABC9C 0%, #0E7CB6 100%)" }} />
            <span className="text-[12px] font-bold text-[#0B3C3D]">BrisaHub</span>
          </div>
          <p className="text-[11px] text-[#7FA9A8]">Plataforma de casting e talentos</p>
        </div>
      </main>
    </div>
  );
}

// ─── Candidate card ───────────────────────────────────────────────────────────

function CandidateCard({
  candidate: c,
  vote,
  expanded,
  onToggleExpand,
  onVote,
  brandColor,
}: {
  candidate: Candidate;
  vote: Vote | null;
  expanded: boolean;
  onToggleExpand: () => void;
  onVote: (v: Vote) => void;
  brandColor: string;
}) {
  const photos = [c.photoFrontUrl, c.photoLeftUrl, c.photoRightUrl].filter(Boolean) as string[];
  const [photoIdx, setPhotoIdx] = useState(0);

  const metaParts: string[] = [];
  if (c.age) metaParts.push(`${c.age} anos`);
  if (c.city) metaParts.push(c.city);
  if (c.gender) { const gl = genderLabel(c.gender); if (gl) metaParts.push(gl); }

  const hasExpandable = !!(c.videoUrl || c.portfolioUrl || c.curriculumUrl || (c.bio && c.bio.length > 100));

  // Vote ring color on the card border
  const voteRing =
    vote === "approved" ? "ring-2 ring-emerald-400 ring-offset-2" :
    vote === "favorite" ? "ring-2 ring-amber-400 ring-offset-2" :
    vote === "rejected" ? "ring-2 ring-zinc-300 ring-offset-2" :
    "";

  return (
    <div className={[
      "group flex flex-col rounded-3xl bg-white overflow-hidden shadow-[0_2px_16px_rgba(11,60,61,0.08)] transition-all duration-200 hover:shadow-[0_8px_32px_rgba(11,60,61,0.14)] hover:-translate-y-0.5",
      voteRing,
    ].join(" ")}>

      {/* Photo area */}
      <div className="relative aspect-[3/4] overflow-hidden bg-[#E6F0FD]">
        {photos.length > 0 ? (
          <>
            <img
              src={photos[photoIdx]}
              alt={c.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />

            {/* Gradient overlay bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black/50 to-transparent" />

            {/* Photo nav — arrows */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setPhotoIdx((i) => (i - 1 + photos.length) % photos.length); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-all hover:bg-black/50 cursor-pointer opacity-0 group-hover:opacity-100"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setPhotoIdx((i) => (i + 1) % photos.length); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-all hover:bg-black/50 cursor-pointer opacity-0 group-hover:opacity-100"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Dot indicators */}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); setPhotoIdx(i); }}
                      className={[
                        "rounded-full transition-all cursor-pointer",
                        i === photoIdx ? "h-1.5 w-5 bg-white" : "h-1.5 w-1.5 bg-white/50 hover:bg-white/80",
                      ].join(" ")}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Vote badge overlaid on photo when voted */}
            {vote && (
              <div className={[
                "absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full text-[15px] shadow-md",
                vote === "approved" ? "bg-emerald-500" :
                vote === "favorite" ? "bg-amber-400" :
                "bg-zinc-500",
              ].join(" ")}>
                {vote === "approved" ? "✓" : vote === "favorite" ? "★" : "✕"}
              </div>
            )}
          </>
        ) : (
          // No photo — avatar placeholder
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full text-4xl font-black text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, ${brandColor} 0%, #0E7CB6 100%)` }}
            >
              {initials(c.name)}
            </div>
            <p className="text-[11px] font-medium text-[#7FA9A8]">Sem foto</p>
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">

        {/* Name + meta */}
        <h3 className="text-[15px] font-black leading-tight text-[#1F2D2E]">{c.name}</h3>
        {metaParts.length > 0 && (
          <p className="mt-1 text-[12px] font-medium text-[#647B7B]">{metaParts.join(" · ")}</p>
        )}

        {/* Bio preview */}
        {c.bio && (
          <p className="mt-2.5 text-[12px] leading-relaxed text-[#647B7B] line-clamp-2">
            {c.bio}
          </p>
        )}

        {/* Expand toggle */}
        {hasExpandable && (
          <button
            onClick={onToggleExpand}
            className="mt-2 inline-flex items-center gap-1 text-left text-[11px] font-bold transition-colors cursor-pointer"
            style={{ color: brandColor }}
          >
            {expanded ? "Ver menos ↑" : "Ver mais ↓"}
          </button>
        )}

        {/* Expanded section */}
        {expanded && (
          <div className="mt-3 space-y-2 border-t border-[#E6F0FD] pt-3">
            {c.bio && c.bio.length > 100 && (
              <p className="text-[12px] leading-relaxed text-[#647B7B] whitespace-pre-wrap">
                {c.bio}
              </p>
            )}
            {c.videoUrl && (
              <a
                href={c.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-[#E6F0FD] bg-[#F8FAFC] px-3 py-2.5 text-[12px] font-semibold text-[#0E7CB6] transition-colors hover:bg-[#E6F0FD]"
              >
                <VideoIcon />
                Assistir vídeo
              </a>
            )}
            {c.portfolioUrl && (
              <a
                href={c.portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-[#E6F0FD] bg-[#F8FAFC] px-3 py-2.5 text-[12px] font-semibold text-[#0E7CB6] transition-colors hover:bg-[#E6F0FD]"
              >
                <LinkIcon />
                Ver portfólio
              </a>
            )}
            {c.curriculumUrl && (
              <a
                href={c.curriculumUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-[#E6F0FD] bg-[#F8FAFC] px-3 py-2.5 text-[12px] font-semibold text-[#0E7CB6] transition-colors hover:bg-[#E6F0FD]"
              >
                <DocIcon />
                Ver currículo
              </a>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Vote buttons */}
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#E6F0FD] pt-3.5">
          <VoteBtn
            active={vote === "approved"}
            label="Aprovar"
            activeClass="bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-200"
            inactiveClass="border-[#E6F0FD] text-[#647B7B] hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50"
            onClick={() => onVote("approved")}
            icon={<ThumbUpIcon />}
          />
          <VoteBtn
            active={vote === "favorite"}
            label="Favorito"
            activeClass="bg-amber-400 border-amber-400 text-white shadow-sm shadow-amber-200"
            inactiveClass="border-[#E6F0FD] text-[#647B7B] hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50"
            onClick={() => onVote("favorite")}
            icon={<StarIcon />}
          />
          <VoteBtn
            active={vote === "rejected"}
            label="Rejeitar"
            activeClass="bg-zinc-500 border-zinc-500 text-white shadow-sm"
            inactiveClass="border-[#E6F0FD] text-[#647B7B] hover:border-zinc-300 hover:text-zinc-700 hover:bg-zinc-50"
            onClick={() => onVote("rejected")}
            icon={<ThumbDownIcon />}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Vote button ──────────────────────────────────────────────────────────────

function VoteBtn({
  active,
  label,
  activeClass,
  inactiveClass,
  onClick,
  icon,
}: {
  active: boolean;
  label: string;
  activeClass: string;
  inactiveClass: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={[
        "flex flex-col items-center justify-center gap-1 rounded-xl border py-2.5 text-[10px] font-bold transition-all cursor-pointer",
        active ? activeClass : inactiveClass,
      ].join(" ")}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ThumbUpIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
    </svg>
  );
}

function ThumbDownIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
