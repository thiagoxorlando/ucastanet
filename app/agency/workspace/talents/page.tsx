import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { requirePremiumWorkspacePageContext } from "@/lib/premiumWorkspaceApp.server";

export const metadata: Metadata = { title: "Talentos convidados — BrisaHub" };

type WorkspaceTalent = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  jobTitles: string[];
  status: "Contratado" | "Candidatou-se";
  lastActivity: string;
};

function statusBadge(status: WorkspaceTalent["status"]) {
  if (status === "Contratado") return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border border-sky-200 bg-sky-50 text-sky-700";
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={name} className="h-10 w-10 rounded-full object-cover" />
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E7FAF7] text-[12px] font-bold text-[#0E7C86]">
      {initials || "?"}
    </div>
  );
}

export default async function WorkspaceTalentsPage() {
  const context = await requirePremiumWorkspacePageContext();
  const supabase = createServerClient({ useServiceRole: true });

  const { data: allJobs } = await supabase
    .from("jobs")
    .select("id, title, created_by_user_id")
    .eq("workspace_id", context.workspace.id);

  const visibleJobs = context.isOwner
    ? (allJobs ?? [])
    : (allJobs ?? []).filter((j) => j.created_by_user_id === context.userId);

  const jobIds = visibleJobs.map((j) => j.id);
  const jobTitleMap = new Map(visibleJobs.map((j) => [j.id, j.title ?? "Vaga"]));

  if (jobIds.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[1.8rem] font-bold tracking-tight text-zinc-950">Talentos convidados</h1>
          <p className="mt-1 text-[14px] text-zinc-500">
            Talentos conectados ao Espaço Premium via vagas privadas.
          </p>
        </div>
        <div className="rounded-[28px] border border-zinc-200 bg-white px-6 py-14 text-center shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 mb-4">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5M12 12a4 4 0 100-8 4 4 0 000 8z" />
            </svg>
          </div>
          <p className="text-[15px] font-semibold text-zinc-900">Nenhum talento convidado ainda.</p>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-zinc-500">
            Crie uma vaga privada e envie o link para talentos. Eles aparecerão aqui assim que se candidatarem.
          </p>
        </div>
      </div>
    );
  }

  const [submissionsResult, bookingsResult] = await Promise.all([
    supabase
      .from("submissions")
      .select("talent_user_id, job_id, created_at")
      .in("job_id", jobIds),
    supabase
      .from("bookings")
      .select("talent_user_id, job_id")
      .in("job_id", jobIds)
      .not("status", "eq", "cancelled"),
  ]);

  const submissions = submissionsResult.data ?? [];
  const bookings = bookingsResult.data ?? [];

  // Build per-talent data
  const bookedSet = new Set(bookings.map((b) => b.talent_user_id).filter(Boolean));

  type TalentAgg = {
    jobIds: Set<string>;
    latestActivity: string;
  };
  const talentMap = new Map<string, TalentAgg>();

  for (const sub of submissions) {
    if (!sub.talent_user_id) continue;
    const existing = talentMap.get(sub.talent_user_id);
    if (existing) {
      existing.jobIds.add(sub.job_id);
      if ((sub.created_at ?? "") > existing.latestActivity) {
        existing.latestActivity = sub.created_at ?? "";
      }
    } else {
      talentMap.set(sub.talent_user_id, {
        jobIds: new Set([sub.job_id]),
        latestActivity: sub.created_at ?? "",
      });
    }
  }

  // Also include talents only found in bookings (no submission row)
  for (const b of bookings) {
    if (!b.talent_user_id || talentMap.has(b.talent_user_id)) continue;
    talentMap.set(b.talent_user_id, {
      jobIds: new Set([b.job_id].filter(Boolean)),
      latestActivity: "",
    });
  }

  const talentIds = Array.from(talentMap.keys());

  if (talentIds.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[1.8rem] font-bold tracking-tight text-zinc-950">Talentos convidados</h1>
          <p className="mt-1 text-[14px] text-zinc-500">
            Talentos conectados ao Espaço Premium via vagas privadas.
          </p>
        </div>
        <div className="rounded-[28px] border border-zinc-200 bg-white px-6 py-14 text-center shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
          <p className="text-[15px] font-semibold text-zinc-900">Nenhum talento convidado ainda.</p>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-zinc-500">
            Crie uma vaga privada e envie o link para talentos. Eles aparecerão aqui assim que se candidatarem.
          </p>
        </div>
      </div>
    );
  }

  const { data: profiles } = await supabase
    .from("talent_profiles")
    .select("user_id, full_name, avatar_url")
    .in("user_id", talentIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  const talents: WorkspaceTalent[] = talentIds
    .map((uid) => {
      const agg = talentMap.get(uid)!;
      const profile = profileMap.get(uid);
      const jobTitles = Array.from(agg.jobIds)
        .map((jid) => jobTitleMap.get(jid) ?? "Vaga")
        .filter(Boolean);

      return {
        userId: uid,
        name: profile?.full_name ?? "Talento",
        avatarUrl: profile?.avatar_url ?? null,
        jobTitles,
        status: bookedSet.has(uid) ? "Contratado" : "Candidatou-se",
        lastActivity: agg.latestActivity,
      } satisfies WorkspaceTalent;
    })
    .sort((a, b) => {
      // Contratado first, then by activity desc
      if (a.status !== b.status) return a.status === "Contratado" ? -1 : 1;
      return b.lastActivity.localeCompare(a.lastActivity);
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.8rem] font-bold tracking-tight text-zinc-950">Talentos convidados</h1>
          <p className="mt-1 text-[14px] text-zinc-500">
            {talents.length} talento{talents.length !== 1 ? "s" : ""} conectado{talents.length !== 1 ? "s" : ""} ao Espaço Premium
          </p>
        </div>
        <div className="flex gap-3 text-[12px] font-semibold">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700">
            {talents.filter((t) => t.status === "Contratado").length} contratado{talents.filter((t) => t.status === "Contratado").length !== 1 ? "s" : ""}
          </span>
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-sky-700">
            {talents.filter((t) => t.status === "Candidatou-se").length} candidato{talents.filter((t) => t.status === "Candidatou-se").length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="grid gap-3">
        {talents.map((talent) => (
          <div
            key={talent.userId}
            className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={talent.name} url={talent.avatarUrl} />
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-zinc-950 truncate">{talent.name}</p>
                  {talent.lastActivity ? (
                    <p className="mt-0.5 text-[12px] text-zinc-500">
                      Última atividade:{" "}
                      {new Date(talent.lastActivity).toLocaleDateString("pt-BR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadge(talent.status)}`}>
                  {talent.status}
                </span>
                {talent.jobTitles.map((title) => (
                  <span
                    key={title}
                    className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] text-zinc-600"
                  >
                    {title}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
