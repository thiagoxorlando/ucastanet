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
    // Toggle off if same vote
    const nextVote = prev === vote ? null : vote;
    setVotes((v) => {
      const next = { ...v };
      if (nextVote) next[candidateId] = nextVote;
      else delete next[candidateId];
      return next;
    });

    if (!nextVote) return; // toggled off — nothing to persist

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
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-[#1ABC9C]" />
      </div>
    );
  }

  // ── Expired ──────────────────────────────────────────────────────────────────
  if (state === "expired") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <div className="mb-4 text-5xl">⏰</div>
          <h1 className="text-[1.4rem] font-bold text-zinc-900">Apresentação expirada</h1>
          <p className="mt-2 text-[14px] text-zinc-500">O link desta apresentação não está mais ativo.</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <div className="mb-4 text-5xl">🔍</div>
          <h1 className="text-[1.4rem] font-bold text-zinc-900">Apresentação não encontrada</h1>
          <p className="mt-2 text-[14px] text-zinc-500">Verifique o link e tente novamente.</p>
        </div>
      </div>
    );
  }

  // ── Password gate ─────────────────────────────────────────────────────────────
  if (state === "gate") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-[24px] border border-zinc-200 bg-white p-8 shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
          <div className="mb-6 text-center">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
              <svg className="h-5 w-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-[1.1rem] font-bold text-zinc-900">Apresentação protegida</h2>
            <p className="mt-1 text-[13px] text-zinc-500">Insira a senha para acessar.</p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              placeholder="Senha"
              value={gatePassword}
              onChange={(e) => setGatePassword(e.target.value)}
              autoFocus
              className="h-11 w-full rounded-xl border border-zinc-200 px-4 text-[14px] text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none transition-colors"
            />
            {gateError && (
              <p className="text-[12px] text-red-500">{gateError}</p>
            )}
            <button
              type="submit"
              disabled={gateLoading || !gatePassword.trim()}
              className="h-11 w-full rounded-xl bg-[#1ABC9C] text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {gateLoading ? "Verificando..." : "Acessar"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const ws = data.workspace;
  const brandColor = ws.brandColor || "#1ABC9C";

  // ── Presentation ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-50">

      {/* Header */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4 sm:px-6">
          {ws.logoUrl ? (
            <Image
              src={ws.logoUrl}
              alt={ws.name}
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl object-contain"
            />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-[13px] font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)` }}
            >
              {ws.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-[12px] font-medium text-zinc-500">{ws.name}</p>
            <h1 className="text-[1.1rem] font-bold leading-tight text-zinc-900">{data.title}</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">

        {/* Intro text */}
        {data.intro && (
          <div className="mb-8 rounded-2xl border border-zinc-200 bg-white px-6 py-5">
            <p className="text-[14px] leading-relaxed text-zinc-600 whitespace-pre-wrap">{data.intro}</p>
          </div>
        )}

        {/* Candidate count */}
        <p className="mb-4 text-[12px] text-zinc-400">
          {data.candidates.length} candidato{data.candidates.length !== 1 ? "s" : ""} nesta apresentação
        </p>

        {/* Candidates grid */}
        {data.candidates.length === 0 ? (
          <div className="rounded-2xl border border-zinc-100 bg-white py-16 text-center">
            <p className="text-[15px] font-semibold text-zinc-800">Nenhum candidato</p>
            <p className="mt-1 text-[13px] text-zinc-400">Esta apresentação ainda não possui candidatos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
        <p className="mt-10 text-center text-[11px] text-zinc-300">
          Powered by BrisaHub
        </p>
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

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">

      {/* Photo / avatar area */}
      <div className="relative aspect-[3/4] bg-zinc-100 overflow-hidden">
        {photos.length > 0 ? (
          <>
            <img
              src={photos[photoIdx]}
              alt={c.name}
              className="h-full w-full object-cover"
            />
            {photos.length > 1 && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setPhotoIdx(i); }}
                    className={[
                      "h-1.5 rounded-full transition-all cursor-pointer",
                      i === photoIdx ? "w-4 bg-white" : "w-1.5 bg-white/50",
                    ].join(" ")}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)` }}
            >
              {initials(c.name)}
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-[15px] font-bold text-zinc-900 leading-snug">{c.name}</h3>
        {metaParts.length > 0 && (
          <p className="mt-0.5 text-[12px] text-zinc-500">{metaParts.join(" · ")}</p>
        )}
        {c.bio && (
          <p className="mt-2 text-[12px] leading-relaxed text-zinc-600 line-clamp-3">
            {c.bio}
          </p>
        )}

        {/* Expand toggle */}
        {(c.videoUrl || c.portfolioUrl || c.curriculumUrl || c.bio.length > 100) && (
          <button
            onClick={onToggleExpand}
            className="mt-2 text-left text-[11px] font-medium transition-colors cursor-pointer"
            style={{ color: brandColor }}
          >
            {expanded ? "Ver menos ↑" : "Ver mais ↓"}
          </button>
        )}

        {/* Expanded content */}
        {expanded && (
          <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
            {c.bio.length > 100 && (
              <p className="text-[12px] leading-relaxed text-zinc-600 whitespace-pre-wrap">
                {c.bio}
              </p>
            )}
            {c.videoUrl && (
              <a
                href={c.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-[12px] font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
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
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-[12px] font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
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
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-[12px] font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <DocIcon />
                Ver currículo
              </a>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Feedback buttons */}
        <div className="mt-4 flex gap-2 border-t border-zinc-100 pt-3">
          <VoteBtn
            active={vote === "approved"}
            label="Aprovar"
            activeClass="bg-emerald-50 border-emerald-200 text-emerald-700"
            inactiveClass="border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
            onClick={() => onVote("approved")}
            icon={<ThumbUpIcon />}
          />
          <VoteBtn
            active={vote === "favorite"}
            label="Favorito"
            activeClass="bg-amber-50 border-amber-200 text-amber-700"
            inactiveClass="border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
            onClick={() => onVote("favorite")}
            icon={<StarIcon />}
          />
          <VoteBtn
            active={vote === "rejected"}
            label="Rejeitar"
            activeClass="bg-red-50 border-red-200 text-red-600"
            inactiveClass="border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
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
        "flex flex-1 items-center justify-center gap-1 rounded-lg border py-2 text-[11px] font-semibold transition-all cursor-pointer",
        active ? activeClass : inactiveClass,
      ].join(" ")}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
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
