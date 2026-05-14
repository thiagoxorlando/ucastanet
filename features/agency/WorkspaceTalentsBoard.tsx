"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type WorkspaceTalentCard = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  joinedAt: string;
  lastActivity: string;
  applicationCount: number;
  contractCount: number;
  jobTitles: string[];
  isPortalMember: boolean;
  isCandidate: boolean;
  isContracted: boolean;
};

type Props = {
  talents: WorkspaceTalentCard[];
  workspaceSlug: string | null;
};

type FilterKey = "all" | "members" | "candidates" | "contracted";

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "members", label: "Membros" },
  { key: "candidates", label: "Candidatos" },
  { key: "contracted", label: "Contratados" },
];

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMonthKey(value: string) {
  const date = new Date(value);
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
}

function cardStatus(talent: WorkspaceTalentCard) {
  if (talent.isContracted) {
    return {
      label: "Contratado",
      className: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }
  if (talent.isCandidate) {
    return {
      label: "Candidato",
      className: "border border-sky-200 bg-sky-50 text-sky-700",
    };
  }
  return {
    label: "Membro do portal",
    className: "border border-[#CFEAE4] bg-[#ECFBF7] text-[#0E7C86]",
  };
}

function relationshipBadges(talent: WorkspaceTalentCard) {
  return [
    talent.isPortalMember ? { label: "Membro do portal", className: "bg-[#EEF8F6] text-[#0E7C86]" } : null,
    talent.isCandidate ? { label: "Candidato", className: "bg-sky-50 text-sky-700" } : null,
    talent.isContracted ? { label: "Contratado", className: "bg-emerald-50 text-emerald-700" } : null,
  ].filter(Boolean) as Array<{ label: string; className: string }>;
}

function matchesFilter(talent: WorkspaceTalentCard, filter: FilterKey) {
  if (filter === "members") return talent.isPortalMember;
  if (filter === "candidates") return talent.isCandidate;
  if (filter === "contracted") return talent.isContracted;
  return true;
}

function EmptyState({
  workspaceSlug,
  copyPortalLink,
  copied,
}: {
  workspaceSlug: string | null;
  copyPortalLink: () => void;
  copied: boolean;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-[#CFE0DE] bg-white px-6 py-12 text-center shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#ECFBF7] text-[#0E7C86]">
        <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-9 6h12a2 2 0 002-2V8a2 2 0 00-2-2h-3.17a2 2 0 01-1.42-.59l-.82-.82A2 2 0 0011.17 4H6a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h2 className="mt-5 text-[1.15rem] font-semibold tracking-tight text-zinc-950">
        Nenhum talento conectado ainda
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-[14px] leading-7 text-zinc-500">
        Compartilhe o link do portal ou crie uma vaga privada para convidar talentos.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        {workspaceSlug ? (
          <button
            type="button"
            onClick={copyPortalLink}
            className="inline-flex items-center justify-center rounded-2xl border border-[#CFE0DE] bg-white px-5 py-3 text-[13px] font-semibold text-[#173033] transition-colors hover:bg-[#F7FBFB]"
          >
            {copied ? "Link copiado" : "Copiar link do portal"}
          </button>
        ) : null}
        <Link
          href="/agency/post-job"
          className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#0E7C86] to-[#1ABC9C] px-5 py-3 text-[13px] font-semibold text-white shadow-[0_14px_28px_rgba(14,124,134,0.18)]"
        >
          Criar vaga privada
        </Link>
      </div>
    </div>
  );
}

export default function WorkspaceTalentsBoard({ talents, workspaceSlug }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [copied, setCopied] = useState(false);

  const summary = useMemo(() => {
    const nowMonthKey = formatMonthKey(new Date().toISOString());
    return {
      portalMembers: talents.filter((talent) => talent.isPortalMember).length,
      privateCandidates: talents.filter((talent) => talent.isCandidate).length,
      premiumContracts: talents.reduce((sum, talent) => sum + talent.contractCount, 0),
      newThisMonth: talents.filter((talent) => talent.joinedAt && formatMonthKey(talent.joinedAt) === nowMonthKey).length,
    };
  }, [talents]);

  const filteredTalents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return talents.filter((talent) => {
      if (!matchesFilter(talent, filter)) return false;
      if (!query) return true;

      const matchesText =
        talent.name.toLowerCase().includes(query) ||
        talent.email.toLowerCase().includes(query) ||
        talent.jobTitles.some((title) => title.toLowerCase().includes(query));

      return matchesText;
    });
  }, [filter, search, talents]);

  const privateActivity = useMemo(
    () =>
      talents
        .filter((talent) => talent.isCandidate || talent.isContracted)
        .sort((left, right) => {
          const rightDate = right.lastActivity || right.joinedAt;
          const leftDate = left.lastActivity || left.joinedAt;
          return rightDate.localeCompare(leftDate);
        }),
    [talents],
  );

  async function copyPortalLink() {
    if (!workspaceSlug) return;
    const url = `${window.location.origin}/${workspaceSlug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(26,188,156,0.24),transparent_35%),linear-gradient(135deg,#082326_0%,#0D3035_48%,#14444A_100%)] px-6 py-8 text-white sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                Espaco Premium
              </div>
              <h1 className="mt-4 text-[2rem] font-bold tracking-tight sm:text-[2.5rem]">
                Talentos convidados
              </h1>
              <p className="mt-3 text-[15px] leading-7 text-white/72">
                Gerencie os talentos conectados ao Espaco Premium.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {workspaceSlug ? (
                <button
                  type="button"
                  onClick={copyPortalLink}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-white/15"
                >
                  {copied ? "Link copiado" : "Copiar link do portal"}
                </button>
              ) : null}
              <Link
                href="/agency/post-job"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-[13px] font-semibold text-[#173033] shadow-[0_14px_28px_rgba(8,35,38,0.18)]"
              >
                Criar vaga privada
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-t border-zinc-100 px-6 py-6 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Membros do portal", value: summary.portalMembers, hint: "Talentos que entraram pelo link privado" },
            { label: "Candidaturas privadas", value: summary.privateCandidates, hint: "Talentos que responderam as vagas do workspace" },
            { label: "Contratos Premium", value: summary.premiumContracts, hint: "Contratos ligados ao Espaco Premium" },
            { label: "Novos este mes", value: summary.newThisMonth, hint: "Entradas recentes no portal privado" },
          ].map((item) => (
            <div key={item.label} className="rounded-[24px] border border-zinc-200 bg-[#FCFDFC] px-5 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">{item.label}</p>
              <p className="mt-2 text-[1.9rem] font-bold tracking-tight text-zinc-950">{item.value}</p>
              <p className="mt-1.5 text-[12px] leading-5 text-zinc-500">{item.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <svg className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, e-mail ou vaga privada"
              className="w-full rounded-2xl border border-[#DDE6E6] bg-white py-3 pl-11 pr-4 text-[13px] text-zinc-800 shadow-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-[#0E7C86]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => {
              const active = item.key === filter;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={[
                    "rounded-full px-4 py-2 text-[12px] font-semibold transition-all",
                    active
                      ? "bg-[#173033] text-white shadow-[0_10px_22px_rgba(23,48,51,0.18)]"
                      : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {filteredTalents.length === 0 ? (
          <EmptyState workspaceSlug={workspaceSlug} copyPortalLink={copyPortalLink} copied={copied} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredTalents.map((talent) => {
              const status = cardStatus(talent);
              const badges = relationshipBadges(talent);

              return (
                <article
                  key={talent.userId}
                  className="group rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.05)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_22px_46px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {talent.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={talent.avatarUrl} alt={talent.name} className="h-14 w-14 rounded-[18px] object-cover ring-1 ring-zinc-200" />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#0E7C86] to-[#1ABC9C] text-[15px] font-bold text-white shadow-[0_12px_28px_rgba(14,124,134,0.18)]">
                          {initials(talent.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-[16px] font-semibold text-zinc-950">{talent.name}</p>
                        <p className="mt-1 truncate text-[12px] text-zinc-500">{talent.email || "E-mail nao disponivel"}</p>
                      </div>
                    </div>

                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${status.className}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {badges.map((badge) => (
                      <span key={badge.label} className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">Candidaturas</p>
                      <p className="mt-1 text-[1.2rem] font-bold text-zinc-900">{talent.applicationCount}</p>
                    </div>
                    <div className="rounded-[20px] border border-zinc-100 bg-zinc-50 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">Contratos</p>
                      <p className="mt-1 text-[1.2rem] font-bold text-zinc-900">{talent.contractCount}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 text-[12px] text-zinc-500 sm:grid-cols-2">
                    <div>
                      <p className="font-semibold uppercase tracking-[0.14em] text-zinc-400">Entrou em</p>
                      <p className="mt-1 text-zinc-700">{formatDate(talent.joinedAt)}</p>
                    </div>
                    <div>
                      <p className="font-semibold uppercase tracking-[0.14em] text-zinc-400">Ultima atividade</p>
                      <p className="mt-1 text-zinc-700">{talent.lastActivity ? formatDate(talent.lastActivity) : "-"}</p>
                    </div>
                  </div>

                  {talent.jobTitles.length > 0 ? (
                    <div className="mt-5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">Vagas relacionadas</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {talent.jobTitles.slice(0, 3).map((title) => (
                          <span
                            key={`${talent.userId}-${title}`}
                            className="inline-flex rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-600"
                          >
                            {title}
                          </span>
                        ))}
                        {talent.jobTitles.length > 3 ? (
                          <span className="inline-flex rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-500">
                            +{talent.jobTitles.length - 3}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-6 flex flex-wrap gap-2">
                    <span className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#0E7C86] to-[#1ABC9C] px-4 py-2.5 text-[12px] font-semibold text-white shadow-[0_12px_24px_rgba(14,124,134,0.16)] opacity-70">
                      Perfil em breve
                    </span>
                    <span className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 px-4 py-2.5 text-[12px] font-semibold text-zinc-500">
                      Historico em breve
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
        <div className="border-b border-zinc-100 px-6 py-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[18px] font-semibold tracking-tight text-zinc-950">
                Atividade das vagas privadas
              </h2>
              <p className="mt-1 text-[13px] text-zinc-500">
                Relacoes recentes com talentos que responderam ou foram contratados nas vagas do workspace.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full border border-[#DCEDEA] bg-[#F5FCFA] px-3 py-1 text-[11px] font-semibold text-[#0E7C86]">
              Powered by BrisaHub Premium
            </span>
          </div>
        </div>

        {privateActivity.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-[15px] font-semibold text-zinc-800">Nenhuma atividade privada ainda.</p>
            <p className="mt-2 text-[13px] leading-6 text-zinc-500">
              Assim que talentos se candidatarem ou forem contratados nas vagas privadas, a atividade aparece aqui.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 p-6 md:grid-cols-2">
            {privateActivity.map((talent) => {
              const status = cardStatus(talent);
              return (
                <div key={`activity-${talent.userId}`} className="rounded-[24px] border border-zinc-200 bg-[#FCFDFC] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-semibold text-zinc-950">{talent.name}</p>
                      <p className="mt-1 text-[12px] text-zinc-500">
                        {talent.lastActivity ? `Ultima atividade em ${formatDate(talent.lastActivity)}` : "Atividade sem data registrada"}
                      </p>
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.className}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {talent.jobTitles.map((title) => (
                      <span
                        key={`activity-${talent.userId}-${title}`}
                        className="inline-flex rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-600"
                      >
                        {title}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
