import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { requirePremiumWorkspacePageContext } from "@/lib/premiumWorkspaceApp.server";

export const metadata: Metadata = { title: "Talentos — BrisaHub" };

type InvitedTalent = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  jobTitles: string[];
  status: "Contratado" | "Candidatou-se";
  lastActivity: string;
};

type PortalMember = {
  userId: string;
  name: string;
  email: string;
  joinedAt: string;
  applicationCount: number;
  contractCount: number;
  status: "active" | "removed";
};

function statusBadge(status: InvitedTalent["status"]) {
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
  const workspaceId = context.workspace.id;

  // ── Fetch workspace jobs ──────────────────────────────────────────────────
  const { data: allJobs } = await supabase
    .from("jobs")
    .select("id, title, created_by_user_id")
    .eq("workspace_id", workspaceId);

  const visibleJobs = context.isOwner
    ? (allJobs ?? [])
    : (allJobs ?? []).filter((j) => j.created_by_user_id === context.userId);

  const jobIds = visibleJobs.map((j) => j.id);
  const jobTitleMap = new Map(visibleJobs.map((j) => [j.id, j.title ?? "Vaga"]));

  // ── Fetch portal members ──────────────────────────────────────────────────
  const { data: portalMemberRows } = await supabase
    .from("premium_workspace_talents")
    .select("talent_user_id, status, joined_at, created_at")
    .eq("workspace_id", workspaceId)
    .is("removed_at", null)
    .order("created_at", { ascending: false });

  const portalMemberIds = (portalMemberRows ?? []).map((m) => String(m.talent_user_id));

  // ── Batch data for portal members ─────────────────────────────────────────
  const [portalProfilesResult, portalSubsResult, portalContractsResult, authResult] = await Promise.all([
    portalMemberIds.length
      ? supabase.from("talent_profiles").select("user_id, full_name").in("user_id", portalMemberIds)
      : Promise.resolve({ data: [] }),
    portalMemberIds.length && jobIds.length
      ? supabase.from("submissions").select("talent_user_id, job_id").in("talent_user_id", portalMemberIds).in("job_id", jobIds)
      : Promise.resolve({ data: [] }),
    portalMemberIds.length && jobIds.length
      ? supabase.from("contracts").select("talent_id, job_id").in("talent_id", portalMemberIds).in("job_id", jobIds)
      : Promise.resolve({ data: [] }),
    portalMemberIds.length
      ? supabase.auth.admin.listUsers({ perPage: 1000 })
      : Promise.resolve({ data: { users: [] } }),
  ]);

  const portalProfileMap = new Map(
    (portalProfilesResult.data ?? []).map((p) => [String(p.user_id), String(p.full_name ?? "")])
  );
  const authEmailMap = new Map(
    ((authResult as { data: { users: Array<{ id: string; email?: string }> } }).data.users ?? []).map((u) => [u.id, u.email ?? ""])
  );
  const portalSubCountMap = new Map<string, number>();
  for (const s of portalSubsResult.data ?? []) {
    const uid = String(s.talent_user_id);
    portalSubCountMap.set(uid, (portalSubCountMap.get(uid) ?? 0) + 1);
  }
  const portalContractCountMap = new Map<string, number>();
  for (const c of portalContractsResult.data ?? []) {
    const uid = String(c.talent_id);
    portalContractCountMap.set(uid, (portalContractCountMap.get(uid) ?? 0) + 1);
  }

  const portalMembers: PortalMember[] = (portalMemberRows ?? []).map((m) => {
    const uid = String(m.talent_user_id);
    const name = portalProfileMap.get(uid) || authEmailMap.get(uid) || "Talento";
    return {
      userId: uid,
      name,
      email: authEmailMap.get(uid) ?? "",
      joinedAt: String(m.joined_at ?? m.created_at ?? ""),
      applicationCount: portalSubCountMap.get(uid) ?? 0,
      contractCount: portalContractCountMap.get(uid) ?? 0,
      status: m.status === "active" ? "active" : "removed",
    };
  });

  // ── Fetch invited talents (submissions-based) ─────────────────────────────
  let invitedTalents: InvitedTalent[] = [];

  if (jobIds.length > 0) {
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
    const bookedSet = new Set(bookings.map((b) => b.talent_user_id).filter(Boolean));

    type TalentAgg = { jobIds: Set<string>; latestActivity: string };
    const talentMap = new Map<string, TalentAgg>();

    for (const sub of submissions) {
      if (!sub.talent_user_id) continue;
      const existing = talentMap.get(sub.talent_user_id);
      if (existing) {
        existing.jobIds.add(sub.job_id);
        if ((sub.created_at ?? "") > existing.latestActivity)
          existing.latestActivity = sub.created_at ?? "";
      } else {
        talentMap.set(sub.talent_user_id, {
          jobIds: new Set([sub.job_id]),
          latestActivity: sub.created_at ?? "",
        });
      }
    }
    for (const b of bookings) {
      if (!b.talent_user_id || talentMap.has(b.talent_user_id)) continue;
      talentMap.set(b.talent_user_id, {
        jobIds: new Set([b.job_id].filter(Boolean)),
        latestActivity: "",
      });
    }

    const talentIds = Array.from(talentMap.keys());
    if (talentIds.length > 0) {
      const { data: profiles } = await supabase
        .from("talent_profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", talentIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
      invitedTalents = talentIds
        .map((uid) => {
          const agg = talentMap.get(uid)!;
          const profile = profileMap.get(uid);
          return {
            userId: uid,
            name: profile?.full_name ?? "Talento",
            avatarUrl: profile?.avatar_url ?? null,
            jobTitles: Array.from(agg.jobIds).map((jid) => jobTitleMap.get(jid) ?? "Vaga"),
            status: bookedSet.has(uid) ? "Contratado" : "Candidatou-se",
            lastActivity: agg.latestActivity,
          } satisfies InvitedTalent;
        })
        .sort((a, b) => {
          if (a.status !== b.status) return a.status === "Contratado" ? -1 : 1;
          return b.lastActivity.localeCompare(a.lastActivity);
        });
    }
  }

  return (
    <div className="space-y-10">
      {/* ── Portal members ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[1.8rem] font-bold tracking-tight text-zinc-950">Talentos</h1>
            <p className="mt-0.5 text-[14px] text-zinc-500">
              Membros do portal e candidatos às suas vagas privadas.
            </p>
          </div>
          {portalMembers.length > 0 && (
            <p className="text-[12px] text-zinc-400">{portalMembers.length} membro{portalMembers.length !== 1 ? "s" : ""} no portal</p>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-zinc-400">Membros do portal</h2>
          {portalMembers.length === 0 ? (
            <div className="rounded-[24px] border border-zinc-200 bg-white px-6 py-10 text-center shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
              <p className="text-[14px] font-semibold text-zinc-600">Nenhum talento no portal ainda.</p>
              <p className="mt-1 text-[13px] text-zinc-400">
                Talentos aparecem aqui quando acessam o link público do seu portal.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-zinc-100 text-left">
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Talento</th>
                    <th className="hidden px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 sm:table-cell">E-mail</th>
                    <th className="hidden px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 md:table-cell">Entrou em</th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Candidaturas</th>
                    <th className="hidden px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 sm:table-cell">Contratos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {portalMembers.map((member) => (
                    <tr key={member.userId} className="hover:bg-zinc-50/50">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-zinc-900 truncate max-w-[160px]">{member.name}</p>
                      </td>
                      <td className="hidden px-5 py-3.5 text-zinc-500 sm:table-cell">
                        <span className="truncate max-w-[180px] block">{member.email || "—"}</span>
                      </td>
                      <td className="hidden px-5 py-3.5 text-zinc-500 md:table-cell">
                        {member.joinedAt
                          ? new Date(member.joinedAt).toLocaleDateString("pt-BR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-700 font-medium">{member.applicationCount}</td>
                      <td className="hidden px-5 py-3.5 text-zinc-700 font-medium sm:table-cell">{member.contractCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ── Invited via jobs ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-zinc-400">Candidatos via vagas privadas</h2>

        {invitedTalents.length === 0 ? (
          <div className="rounded-[24px] border border-zinc-200 bg-white px-6 py-10 text-center shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <p className="text-[14px] font-semibold text-zinc-600">Nenhum talento convidado ainda.</p>
            <p className="mt-1 text-[13px] text-zinc-400">
              Crie uma vaga privada e envie o link para talentos.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {invitedTalents.map((talent) => (
              <div
                key={talent.userId}
                className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]"
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
        )}
      </section>
    </div>
  );
}
