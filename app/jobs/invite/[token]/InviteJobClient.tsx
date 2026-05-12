"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type JobData = {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: string;
  deadline: string | null;
  jobDate: string | null;
  jobTime: string | null;
  location: string | null;
};

type Props = {
  token: string;
  job: JobData;
  workspaceName: string | null;
  workspaceWelcome: string | null;
  workspaceLogoUrl: string | null;
  workspacePrimaryColor: string | null;
  workspaceAccentColor: string | null;
  agencyName: string | null;
  isLoggedIn: boolean;
  userRole: string | null;
};

export default function InviteJobClient({
  token,
  job,
  workspaceName,
  workspaceWelcome,
  workspaceLogoUrl,
  workspacePrimaryColor,
  workspaceAccentColor,
  agencyName,
  isLoggedIn,
  userRole,
}: Props) {
  const router = useRouter();
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = workspaceName ?? agencyName;
  const next = encodeURIComponent(`/jobs/invite/${token}`);

  const primary = workspacePrimaryColor ?? "#1ABC9C";
  const accent = workspaceAccentColor ?? workspacePrimaryColor ?? "#27C1D6";

  const initials = displayName
    ? displayName.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")
    : "W";

  async function handleApply() {
    setError(null);
    setApplying(true);
    router.push(`/talent/jobs/${job.id}?invite=${encodeURIComponent(token)}`);
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#1F2D2E]">
      {/* Brand color top stripe */}
      <div className="h-1" style={{ background: `linear-gradient(to right, ${primary}, ${accent})` }} />

      <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8">

        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-[15px] font-bold tracking-tight text-[#1F2D2E]">
            BrisaHub
          </Link>
          {!isLoggedIn && (
            <Link href={`/login?next=${next}`} className="text-[13px] font-semibold text-[#0E7C86] hover:underline">
              Entrar
            </Link>
          )}
        </header>

        {/* Workspace identity card */}
        {displayName && (
          <div className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-white border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            {workspaceLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={workspaceLogoUrl} alt={displayName} className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-zinc-100" />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-[13px]"
                style={{ background: primary }}
              >
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-zinc-900 truncate">{displayName}</p>
              <p className="text-[11px] text-zinc-400">Ambiente privado de seleção de talentos</p>
            </div>
          </div>
        )}

        {/* Invite badge */}
        <div className="mb-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] font-semibold"
          style={{ background: `${primary}15`, borderColor: `${primary}30`, color: primary }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Vaga exclusiva por convite
        </div>

        {/* Job title */}
        <h1 className="text-[2rem] font-semibold leading-tight tracking-tight text-[#1F2D2E] sm:text-[2.5rem]">
          {job.title}
        </h1>

        {/* Meta chips */}
        <div className="mt-5 flex flex-wrap gap-2 text-[13px] font-semibold text-[#647B7B]">
          {job.category && (
            <span className="rounded-full border border-[#DDE6E6] bg-white px-3 py-1">{job.category}</span>
          )}
          <span className="rounded-full border border-[#DDE6E6] bg-white px-3 py-1">{job.budget}</span>
          {job.location && (
            <span className="rounded-full border border-[#DDE6E6] bg-white px-3 py-1">{job.location}</span>
          )}
          {job.deadline && (
            <span className="rounded-full border border-[#DDE6E6] bg-white px-3 py-1">Prazo: {job.deadline}</span>
          )}
          {job.jobDate && (
            <span className="rounded-full border border-[#DDE6E6] bg-white px-3 py-1">Data: {job.jobDate}{job.jobTime ? ` às ${job.jobTime}` : ""}</span>
          )}
        </div>

        {/* Description */}
        {job.description && (
          <p className="mt-6 whitespace-pre-line text-[15px] leading-7 text-[#475D5E]">
            {job.description}
          </p>
        )}

        {/* Workspace welcome message */}
        {workspaceWelcome && (
          <div className="mt-6 rounded-2xl bg-white px-5 py-4 border" style={{ borderColor: `${primary}25` }}>
            <div className="flex items-start gap-3">
              <div className="w-1 rounded-full self-stretch flex-shrink-0" style={{ background: primary }} />
              <p className="text-[14px] leading-6 text-[#475D5E]">{workspaceWelcome}</p>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-8">
          {isLoggedIn && userRole === "talent" ? (
            <div className="space-y-3">
              {error && (
                <p className="text-[13px] text-rose-500 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5">{error}</p>
              )}
              <button
                onClick={handleApply}
                disabled={applying}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-white text-[15px] font-semibold transition-all disabled:opacity-60 cursor-pointer"
                style={{ background: `linear-gradient(to right, ${primary}, ${accent})` }}
              >
                {applying ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Redirecionando…
                  </>
                ) : "Candidatar-se"}
              </button>
            </div>
          ) : isLoggedIn && userRole !== "talent" ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4">
              <p className="text-[14px] font-medium text-amber-800">
                Entre com uma conta de talento para se candidatar.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[14px] text-[#647B7B]">Faça login ou crie uma conta de talento para se candidatar a esta vaga.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/login?next=${next}`}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#1F2D2E] hover:bg-zinc-700 text-white text-[15px] font-semibold transition-colors"
                >
                  Entrar para se candidatar
                </Link>
                <Link
                  href={`/signup?role=talent&next=${next}`}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 text-[#1F2D2E] text-[15px] font-semibold transition-colors"
                >
                  Criar conta
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center">
          <p className="text-[12px] text-zinc-400">
            Powered by{" "}
            <Link href="/" className="font-semibold hover:text-zinc-600 transition-colors">
              BrisaHub
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
