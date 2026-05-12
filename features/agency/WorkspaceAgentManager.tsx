"use client";

import { useState, useRef } from "react";
import type {
  PremiumWorkspace,
  PremiumMembership,
  WorkspaceSeatUsage,
  PremiumAgentInvite,
  WorkspaceMemberDetail,
} from "@/lib/premiumWorkspace.server";

interface Props {
  workspace: PremiumWorkspace;
  membership: PremiumMembership;
  initialSeatUsage: WorkspaceSeatUsage;
  initialMembers: WorkspaceMemberDetail[];
  initialInvites: PremiumAgentInvite[];
}

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <p className={`text-[12px] font-medium ${ok ? "text-emerald-600" : "text-rose-500"}`}>
      {ok ? "✓ " : "✗ "}
      {msg}
    </p>
  );
}

// ── Seat usage bar ─────────────────────────────────────────────────────────────

function SeatBar({ usage }: { usage: WorkspaceSeatUsage }) {
  const pct = usage.totalAllowed === 0 ? 0 : Math.min(100, (usage.usedSeats / usage.totalAllowed) * 100);
  const full = usage.remaining === 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold text-zinc-700">
          {usage.usedSeats} / {usage.totalAllowed} agente{usage.totalAllowed !== 1 ? "s" : ""} usado{usage.usedSeats !== 1 ? "s" : ""}
        </p>
        {usage.pendingInviteCount > 0 && (
          <p className="text-[11px] text-zinc-400">
            {usage.pendingInviteCount} convite{usage.pendingInviteCount !== 1 ? "s" : ""} pendente{usage.pendingInviteCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>
      <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${full ? "bg-rose-400" : "bg-amber-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {full && (
        <p className="text-[11px] text-amber-600 font-medium">
          Seu plano Premium inclui {usage.includedSeats} agente{usage.includedSeats !== 1 ? "s" : ""}.
          Assentos extras serão adicionados em breve.
        </p>
      )}
    </div>
  );
}

// ── Invite form ────────────────────────────────────────────────────────────────

interface InviteFormProps {
  onSuccess: (email: string, url: string, invite: PremiumAgentInvite, usage: WorkspaceSeatUsage) => void;
  onError: (msg: string) => void;
  onCancel: () => void;
}

function InviteForm({ onSuccess, onError, onCancel }: InviteFormProps) {
  const [email, setEmail] = useState("");
  const [limit, setLimit] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const res = await fetch("/api/agency/workspace/agents/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        spendingLimit: limit.trim() ? Number(limit) : null,
      }),
    });
    setLoading(false);
    if (res.ok) {
      const data = (await res.json()) as {
        invite: PremiumAgentInvite;
        inviteUrl: string;
        usage?: WorkspaceSeatUsage;
      };
      onSuccess(email.trim().toLowerCase(), data.inviteUrl, data.invite, data.usage!);
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      onError(data.error ?? "Não foi possível criar o convite.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 pt-3 border-t border-zinc-50">
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
          E-mail do agente
        </label>
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="agente@empresa.com"
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-[13px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
          Limite de gastos (opcional)
        </label>
        <input
          type="number"
          min={0}
          step={0.01}
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          placeholder="Deixe vazio para ilimitado"
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-[13px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 rounded-xl border border-zinc-200 text-[12px] font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="flex-1 py-2 rounded-xl bg-amber-500 text-[12px] font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? "Criando…" : "Criar convite"}
        </button>
      </div>
    </form>
  );
}

// ── New invite link ────────────────────────────────────────────────────────────

function NewInviteLink({ email, url, onClose }: { email: string; url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function copyLink() {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
    inputRef.current?.select();
  }

  return (
    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 space-y-3">
      <div>
        <p className="text-[12px] font-semibold text-emerald-700">
          Convite criado para {email}
        </p>
        <p className="text-[11px] text-emerald-600 mt-0.5">
          Copie o link e envie ao agente. Válido por 7 dias.
        </p>
      </div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          readOnly
          value={url}
          className="flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-[11px] text-zinc-600 font-mono truncate focus:outline-none"
          onClick={() => inputRef.current?.select()}
        />
        <button
          type="button"
          onClick={copyLink}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
        >
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="text-[11px] text-emerald-600 hover:text-emerald-800 underline cursor-pointer"
      >
        Fechar
      </button>
    </div>
  );
}

// ── Pending invite row ─────────────────────────────────────────────────────────

function PendingInviteRow({
  invite,
  origin,
  onCancel,
}: {
  invite: PremiumAgentInvite;
  origin: string;
  onCancel: (id: string) => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const url = `${origin}/premium/invite/${invite.token}`;

  function copyLink() {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  async function cancel() {
    setCancelling(true);
    await onCancel(invite.id);
    setCancelling(false);
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-zinc-50 last:border-0">
      <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-zinc-500 uppercase">
        {invite.invitedEmail[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-zinc-800 truncate">{invite.invitedEmail}</p>
        <p className="text-[11px] text-zinc-400">
          Expira {fmtDate(invite.expiresAt)}
          {invite.spendingLimit != null && ` · Limite ${brl(invite.spendingLimit)}`}
        </p>
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={copyLink}
          title="Copiar link"
          className="px-2.5 py-1.5 rounded-lg border border-zinc-200 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors cursor-pointer"
        >
          {copied ? "Copiado!" : "Copiar link"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={cancelling}
          title="Cancelar convite"
          className="px-2.5 py-1.5 rounded-lg border border-red-100 text-[11px] font-semibold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 cursor-pointer"
        >
          {cancelling ? "…" : "Cancelar"}
        </button>
      </div>
    </div>
  );
}

// ── Active agent row ───────────────────────────────────────────────────────────

function AgentRow({
  member,
  onRemove,
  onUpdateLimit,
}: {
  member: WorkspaceMemberDetail;
  onRemove: (id: string) => Promise<void>;
  onUpdateLimit: (id: string, limit: number | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [limitValue, setLimitValue] = useState(
    member.spendingLimit != null ? String(member.spendingLimit) : ""
  );
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function saveLimit() {
    setSaving(true);
    const parsed = limitValue.trim() ? Number(limitValue) : null;
    await onUpdateLimit(member.id, parsed);
    setSaving(false);
    setEditing(false);
  }

  async function remove() {
    if (!confirm(`Remover ${member.displayName || member.email} do workspace?`)) return;
    setRemoving(true);
    await onRemove(member.id);
    setRemoving(false);
  }

  const initials = (member.displayName || member.email || "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const isSuspended = member.status === "suspended";

  return (
    <div className={`flex items-start gap-3 py-3 border-b border-zinc-50 last:border-0 ${isSuspended ? "opacity-60" : ""}`}>
      <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-indigo-500">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-medium text-zinc-800 truncate">
            {member.displayName || member.email || member.userId}
          </p>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">
            Agente
          </span>
          {isSuspended && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-500 border border-zinc-200">
              Suspenso
            </span>
          )}
        </div>
        {member.email && (
          <p className="text-[11px] text-zinc-400">{member.email}</p>
        )}
        <p className="text-[11px] text-zinc-400 mt-0.5">
          Desde {fmtDate(member.createdAt)}
          {" · "}
          {editing ? (
            <span className="inline-flex items-center gap-1">
              <input
                type="number"
                min={0}
                step={0.01}
                value={limitValue}
                onChange={(e) => setLimitValue(e.target.value)}
                placeholder="Ilimitado"
                className="w-24 rounded border border-zinc-200 px-1.5 py-0.5 text-[11px] text-zinc-700 focus:outline-none focus:ring-1 focus:ring-amber-300"
                autoFocus
              />
              <button
                type="button"
                onClick={saveLimit}
                disabled={saving}
                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 cursor-pointer"
              >
                {saving ? "…" : "Salvar"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-[11px] text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                Cancelar
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-[11px] text-zinc-500 hover:text-zinc-700 underline cursor-pointer"
            >
              Limite:{" "}
              {member.spendingLimit != null ? brl(member.spendingLimit) : "Ilimitado"}
            </button>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={remove}
        disabled={removing}
        title="Remover agente"
        className="flex-shrink-0 px-2.5 py-1.5 rounded-lg border border-red-100 text-[11px] font-semibold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 cursor-pointer mt-0.5"
      >
        {removing ? "…" : "Remover"}
      </button>
    </div>
  );
}

// ── Owner row ──────────────────────────────────────────────────────────────────

function OwnerRow({ member }: { member: WorkspaceMemberDetail }) {
  const initials = (member.displayName || member.email || "P")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="flex items-center gap-3 py-3 border-b border-zinc-50">
      <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-amber-600">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-medium text-zinc-800 truncate">
            {member.displayName || member.email || "Proprietário"}
          </p>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-100">
            Proprietário
          </span>
        </div>
        {member.email && (
          <p className="text-[11px] text-zinc-400">{member.email}</p>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function WorkspaceAgentManager({
  workspace,
  membership,
  initialSeatUsage,
  initialMembers,
  initialInvites,
}: Props) {
  const [members, setMembers] = useState<WorkspaceMemberDetail[]>(initialMembers);
  const [invites, setInvites] = useState<PremiumAgentInvite[]>(initialInvites);
  const [seatUsage, setSeatUsage] = useState<WorkspaceSeatUsage>(initialSeatUsage);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [newLink, setNewLink] = useState<{ email: string; url: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  function handleInviteSuccess(
    email: string,
    url: string,
    invite: PremiumAgentInvite,
    usage: WorkspaceSeatUsage
  ) {
    setInvites((prev) => [invite, ...prev]);
    if (usage) setSeatUsage(usage);
    setNewLink({ email, url });
    setShowInviteForm(false);
  }

  async function cancelInvite(id: string) {
    const res = await fetch(`/api/agency/workspace/agents/invites/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    if (res.ok) {
      setInvites((prev) => prev.filter((inv) => inv.id !== id));
      setSeatUsage((prev) => ({
        ...prev,
        pendingInviteCount: Math.max(0, prev.pendingInviteCount - 1),
        usedSeats: Math.max(0, prev.usedSeats - 1),
        remaining: prev.remaining + 1,
      }));
      showToast("Convite cancelado.", true);
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      showToast(data.error ?? "Erro ao cancelar convite.", false);
    }
  }

  async function removeMember(id: string) {
    const res = await fetch(`/api/agency/workspace/agents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "removed" }),
    });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== id));
      setSeatUsage((prev) => ({
        ...prev,
        activeAgentCount: Math.max(0, prev.activeAgentCount - 1),
        usedSeats: Math.max(0, prev.usedSeats - 1),
        remaining: prev.remaining + 1,
      }));
      showToast("Agente removido do workspace.", true);
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      showToast(data.error ?? "Erro ao remover agente.", false);
    }
  }

  async function updateLimit(id: string, limit: number | null) {
    const res = await fetch(`/api/agency/workspace/agents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spendingLimit: limit }),
    });
    if (res.ok) {
      setMembers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, spendingLimit: limit } : m))
      );
      showToast("Limite atualizado.", true);
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      showToast(data.error ?? "Erro ao atualizar limite.", false);
    }
  }

  const isOwner = membership.role === "owner";
  const ownerMember = members.find((m) => m.role === "owner");
  const agentMembers = members.filter((m) => m.role === "agent");
  const canInvite = seatUsage.remaining > 0;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // ── Agent view ──────────────────────────────────────────────────────────────
  if (!isOwner) {
    const selfMember = members.find((m) => m.userId === membership.userId) ?? null;
    return (
      <div className="space-y-3 py-2">
        <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-4 py-3 space-y-1">
          <p className="text-[12px] font-semibold text-zinc-500 uppercase tracking-wide">
            Sua participação
          </p>
          <p className="text-[13px] text-zinc-700">
            Função: <strong>Agente</strong>
          </p>
          {selfMember && (
            <p className="text-[13px] text-zinc-700">
              Limite de gastos:{" "}
              <strong>
                {selfMember.spendingLimit != null
                  ? brl(selfMember.spendingLimit)
                  : "Ilimitado"}
              </strong>
            </p>
          )}
        </div>
        <p className="text-[12px] text-zinc-400">
          Somente o proprietário pode gerenciar agentes.
        </p>
      </div>
    );
  }

  // ── Owner view ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Seat usage */}
      <SeatBar usage={seatUsage} />

      {/* Toast */}
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {/* New invite link banner */}
      {newLink && (
        <NewInviteLink
          email={newLink.email}
          url={newLink.url}
          onClose={() => setNewLink(null)}
        />
      )}

      {/* Invite button / form */}
      {!showInviteForm && !newLink && (
        <button
          type="button"
          onClick={() => setShowInviteForm(true)}
          disabled={!canInvite}
          title={
            canInvite
              ? "Convidar novo agente"
              : `Seu plano Premium inclui ${seatUsage.includedSeats} agente${seatUsage.includedSeats !== 1 ? "s" : ""}. Assentos extras em breve.`
          }
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-200 bg-amber-50 text-[12px] font-semibold text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Convidar agente
        </button>
      )}

      {showInviteForm && (
        <InviteForm
          onSuccess={(email, url, invite) => {
            // Recalculate usage after invite creation
            setSeatUsage((prev) => ({
              ...prev,
              pendingInviteCount: prev.pendingInviteCount + 1,
              usedSeats: prev.usedSeats + 1,
              remaining: Math.max(0, prev.remaining - 1),
            }));
            handleInviteSuccess(email, url, invite, seatUsage);
          }}
          onError={(msg) => showToast(msg, false)}
          onCancel={() => setShowInviteForm(false)}
        />
      )}

      {/* Member list */}
      <div className="border-t border-zinc-50 pt-4 space-y-0">
        {/* Owner */}
        {ownerMember && <OwnerRow member={ownerMember} />}

        {/* Active agents */}
        {agentMembers.map((m) => (
          <AgentRow
            key={m.id}
            member={m}
            onRemove={removeMember}
            onUpdateLimit={updateLimit}
          />
        ))}

        {agentMembers.length === 0 && invites.length === 0 && (
          <p className="text-[13px] text-zinc-400 py-4">Nenhum agente adicionado ainda.</p>
        )}
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="border-t border-zinc-50 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-2">
            Convites pendentes
          </p>
          {invites.map((inv) => (
            <PendingInviteRow
              key={inv.id}
              invite={inv}
              origin={origin}
              onCancel={cancelInvite}
            />
          ))}
        </div>
      )}
    </div>
  );
}
