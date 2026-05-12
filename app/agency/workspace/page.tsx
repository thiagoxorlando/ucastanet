import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase.server";
import { createServerClient } from "@/lib/supabase";
import {
  ensurePremiumWorkspaceForAgency,
  getWorkspaceSeatUsage,
  type PremiumWorkspace,
  type PremiumMembership,
  type WorkspaceSeatUsage,
} from "@/lib/premiumWorkspace.server";

export const metadata: Metadata = { title: "Espaço Premium — BrisaHub" };

// ── Locked screen (non-Premium) ───────────────────────────────────────────────

function LockedScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-5">
        <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h1 className="text-[18px] font-bold text-zinc-900 mb-2">Espaço Premium</h1>
      <p className="text-[14px] text-zinc-500 max-w-sm mb-6">
        O Espaço Premium está disponível exclusivamente para agências com o plano Premium ativo.
        Faça upgrade para acessar seu workspace privado, gerenciar agentes e criar vagas exclusivas.
      </p>
      <a
        href="/agency/billing"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[13px] font-semibold transition-colors"
      >
        Ver planos
      </a>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">{label}</p>
      <p className="text-[28px] font-bold text-zinc-900 leading-none">{value}</p>
      {sub && <p className="text-[12px] text-zinc-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Owner dashboard ───────────────────────────────────────────────────────────

function OwnerDashboard({
  workspace,
  membership,
  seatUsage,
}: {
  workspace: PremiumWorkspace;
  membership: PremiumMembership;
  seatUsage: WorkspaceSeatUsage;
}) {
  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-amber-400 to-amber-600" />
        <div className="p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[16px] font-bold text-zinc-900 truncate">{workspace.name}</h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-100">
                Premium
              </span>
            </div>
            <p className="text-[13px] text-zinc-500 mt-0.5">
              Proprietário · workspace criado em{" "}
              {new Date(workspace.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* Seat usage stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Assentos inclusos"
          value={seatUsage.includedSeats}
          sub="no plano Premium"
        />
        <StatCard
          label="Assentos extras"
          value={seatUsage.extraSeats}
          sub="adicionados"
        />
        <StatCard
          label="Membros ativos"
          value={seatUsage.activeAgentCount}
          sub={`de ${seatUsage.totalAllowed} permitidos`}
        />
        <StatCard
          label="Vagas disponíveis"
          value={seatUsage.remaining}
          sub="para novos agentes"
        />
      </div>

      {/* Agents section placeholder */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="p-5 border-b border-zinc-50 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-zinc-900">Agentes do workspace</p>
            <p className="text-[12px] text-zinc-400 mt-0.5">
              {seatUsage.activeAgentCount} membro{seatUsage.activeAgentCount !== 1 ? "s" : ""} ativo{seatUsage.activeAgentCount !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            disabled
            title="Em breve"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-[12px] font-semibold text-zinc-400 cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Convidar agente
          </button>
        </div>
        <div className="p-8 text-center">
          <p className="text-[13px] text-zinc-400">Gestão de agentes em breve.</p>
        </div>
      </div>

      {/* Jobs section placeholder */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="p-5 border-b border-zinc-50 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-zinc-900">Vagas exclusivas</p>
            <p className="text-[12px] text-zinc-400 mt-0.5">Vagas privadas visíveis apenas para membros do workspace</p>
          </div>
          <button
            disabled
            title="Em breve"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-[12px] font-semibold text-zinc-400 cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nova vaga exclusiva
          </button>
        </div>
        <div className="p-8 text-center">
          <p className="text-[13px] text-zinc-400">Vagas exclusivas em breve.</p>
        </div>
      </div>
    </div>
  );
}

// ── Agent dashboard ───────────────────────────────────────────────────────────

function AgentDashboard({
  workspace,
  membership,
}: {
  workspace: PremiumWorkspace;
  membership: PremiumMembership;
}) {
  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-indigo-400 to-indigo-600" />
        <div className="p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[16px] font-bold text-zinc-900 truncate">{workspace.name}</h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">
                Agente
              </span>
            </div>
            <p className="text-[13px] text-zinc-500 mt-0.5">
              Membro desde{" "}
              {new Date(membership.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* Jobs section placeholder */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="p-5 border-b border-zinc-50">
          <p className="text-[13px] font-semibold text-zinc-900">Vagas do workspace</p>
          <p className="text-[12px] text-zinc-400 mt-0.5">Vagas exclusivas disponíveis para membros deste workspace</p>
        </div>
        <div className="p-8 text-center">
          <p className="text-[13px] text-zinc-400">Vagas exclusivas em breve.</p>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function WorkspacePage() {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();

  if (!user) redirect("/login");

  const supabase = createServerClient({ useServiceRole: true });

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "agency") redirect("/agency/dashboard");

  if (profile.plan !== "premium") {
    return <LockedScreen />;
  }

  const result = await ensurePremiumWorkspaceForAgency(user.id);

  if (!result) {
    return <LockedScreen />;
  }

  const { workspace, membership } = result;

  if (membership.role === "owner") {
    const seatUsage = await getWorkspaceSeatUsage(workspace.id);
    return <OwnerDashboard workspace={workspace} membership={membership} seatUsage={seatUsage} />;
  }

  return <AgentDashboard workspace={workspace} membership={membership} />;
}
