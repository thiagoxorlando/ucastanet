"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { brl } from "@/lib/brl";
import type {
  PremiumMembership,
  WorkspaceSeatUsage,
  PremiumAgentInvite,
  WorkspaceMemberDetail,
  AgentLedgerBalance,
  OwnerAllocationSummary,
} from "@/lib/premiumWorkspace.server";

interface Props {
  membership: PremiumMembership;
  initialSeatUsage: WorkspaceSeatUsage;
  initialMembers: WorkspaceMemberDetail[];
  initialInvites: PremiumAgentInvite[];
  initialLedgerBalances?: AgentLedgerBalance[];
  initialOwnerSummary?: OwnerAllocationSummary;
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
      {msg}
    </p>
  );
}

function EmptyBlock({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-5 py-6 text-center">
      <p className="text-[14px] font-semibold text-zinc-800">{title}</p>
      <p className="mt-2 text-[12px] leading-6 text-zinc-500">{description}</p>
    </div>
  );
}

function SeatBar({ usage }: { usage: WorkspaceSeatUsage }) {
  const pct = usage.totalAllowed === 0 ? 0 : Math.min(100, (usage.usedSeats / usage.totalAllowed) * 100);
  const full = usage.remaining === 0;

  return (
    <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[12px] font-semibold text-zinc-800">
            Assentos: {usage.usedSeats} / {usage.totalAllowed}
          </p>
          <p className="text-[11px] text-zinc-500">
            {usage.activeAgentCount} agente{usage.activeAgentCount === 1 ? "" : "s"} ativo{usage.activeAgentCount === 1 ? "" : "s"}
            {usage.pendingInviteCount > 0 ? ` • ${usage.pendingInviteCount} convite${usage.pendingInviteCount === 1 ? "" : "s"} pendente${usage.pendingInviteCount === 1 ? "" : "s"}` : ""}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${full ? "bg-amber-100 text-amber-700" : "bg-white text-zinc-600"}`}>
          {usage.remaining} disponível{usage.remaining === 1 ? "" : "eis"}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div
          className={`h-full rounded-full transition-all ${full ? "bg-amber-400" : "bg-[#1ABC9C]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {full ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
          <p className="text-[12px] font-semibold text-amber-800">Você atingiu o limite de agentes do Premium.</p>
          <p className="mt-1 text-[12px] text-amber-700">Precisa de mais agentes? Solicite assentos extras.</p>
        </div>
      ) : null}
    </div>
  );
}

interface InviteFormProps {
  onSuccess: (email: string, url: string, invite: PremiumAgentInvite, usage: WorkspaceSeatUsage) => void;
  onError: (msg: string) => void;
  onCancel: () => void;
}

function InviteForm({ onSuccess, onError, onCancel }: InviteFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const res = await fetch("/api/agency/workspace/agents/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    setLoading(false);
    if (res.ok) {
      const data = (await res.json()) as { invite: PremiumAgentInvite; inviteUrl: string; usage?: WorkspaceSeatUsage };
      onSuccess(email.trim().toLowerCase(), data.inviteUrl, data.invite, data.usage!);
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      onError(data.error ?? "Não foi possível criar o convite.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
      <div className="space-y-1">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">E-mail do agente</label>
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="agente@empresa.com"
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[13px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 rounded-xl border border-zinc-200 bg-white py-2.5 text-[12px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-50">
          Cancelar
        </button>
        <button type="submit" disabled={loading || !email.trim()}
          className="flex-1 rounded-xl bg-amber-500 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40">
          {loading ? "Criando..." : "Criar convite"}
        </button>
      </div>
    </form>
  );
}

function NewInviteLink({ email, url, onClose }: { email: string; url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function copyLink() {
    void navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
    inputRef.current?.select();
  }

  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
      <p className="text-[13px] font-semibold text-emerald-800">Convite criado para {email}</p>
      <p className="mt-1 text-[12px] text-emerald-700">Copie o link e envie ao agente. Válido por 7 dias.</p>
      <div className="mt-3 flex gap-2">
        <input ref={inputRef} readOnly value={url}
          className="flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-[11px] font-mono text-zinc-600 focus:outline-none"
          onClick={() => inputRef.current?.select()} />
        <button type="button" onClick={copyLink}
          className="rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-700">
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>
      <button type="button" onClick={onClose} className="mt-3 text-[11px] font-medium text-emerald-700 underline">
        Fechar
      </button>
    </div>
  );
}

function PendingInviteRow({ invite, origin, onCancel }: {
  invite: PremiumAgentInvite;
  origin: string;
  onCancel: (id: string) => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const url = `${origin}/premium/invite/${invite.token}`;

  function copyLink() {
    void navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  }

  async function cancel() {
    setCancelling(true);
    await onCancel(invite.id);
    setCancelling(false);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-100 bg-white px-4 py-4 sm:flex-row sm:items-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 text-[12px] font-bold uppercase text-zinc-500">
        {invite.invitedEmail[0]}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-zinc-800">{invite.invitedEmail}</p>
        <p className="mt-1 text-[11px] text-zinc-500">Convite pendente • expira em {fmtDate(invite.expiresAt)}</p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={copyLink}
          className="rounded-xl border border-zinc-200 px-3 py-2 text-[11px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-50">
          {copied ? "Copiado!" : "Copiar link"}
        </button>
        <button type="button" onClick={cancel} disabled={cancelling}
          className="rounded-xl border border-red-100 px-3 py-2 text-[11px] font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-40">
          {cancelling ? "..." : "Cancelar"}
        </button>
      </div>
    </div>
  );
}

type AllocationFormMode = "allocation" | "allocation_reversal" | null;

function AgentRow({
  member,
  ledger,
  ownerUnallocated,
  onRemove,
  onAllocate,
}: {
  member: WorkspaceMemberDetail;
  ledger: AgentLedgerBalance | null;
  ownerUnallocated: number;
  onRemove: (id: string) => Promise<void>;
  onAllocate: (memberId: string, type: "allocation" | "allocation_reversal", amount: number, note: string) => Promise<void>;
}) {
  const [allocMode, setAllocMode] = useState<AllocationFormMode>(null);
  const [allocAmount, setAllocAmount] = useState("");
  const [allocNote, setAllocNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const initials = (member.displayName || member.email || "?")
    .split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  const isSuspended = member.status === "suspended";

  async function submitAlloc(e: React.FormEvent) {
    e.preventDefault();
    if (!allocMode) return;
    const amt = Number(allocAmount);
    if (!amt || amt <= 0) return;
    setSaving(true);
    await onAllocate(member.id, allocMode, amt, allocNote.trim());
    setSaving(false);
    setAllocMode(null);
    setAllocAmount("");
    setAllocNote("");
  }

  async function remove() {
    if (!confirm(`Remover ${member.displayName || member.email} do Espaço Premium?`)) return;
    setRemoving(true);
    await onRemove(member.id);
    setRemoving(false);
  }

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border border-zinc-100 bg-white px-4 py-4 ${isSuspended ? "opacity-70" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-[12px] font-bold text-indigo-600">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[13px] font-semibold text-zinc-800">{member.displayName || member.email || member.userId}</p>
            <span className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">Agente</span>
            {isSuspended ? (
              <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">Suspenso</span>
            ) : null}
          </div>
          {member.email ? <p className="mt-1 text-[11px] text-zinc-500">{member.email}</p> : null}
          <p className="mt-1 text-[11px] text-zinc-400">Desde {fmtDate(member.createdAt)}</p>
        </div>
        <button type="button" onClick={remove} disabled={removing}
          className="rounded-xl border border-red-100 px-3 py-2 text-[11px] font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-40">
          {removing ? "..." : "Remover"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Saldo alocado</p>
          <p className="mt-1 text-[13px] font-semibold text-zinc-800">{brl(ledger?.allocatedAmount ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Saldo comprometido</p>
          <p className="mt-1 text-[13px] font-semibold text-amber-700">{brl(ledger?.committedAmount ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Saldo disponível</p>
          <p className={`mt-1 text-[13px] font-semibold ${(ledger?.availableAmount ?? 0) === 0 ? "text-rose-600" : "text-emerald-700"}`}>
            {brl(ledger?.availableAmount ?? 0)}
          </p>
        </div>
      </div>

      {allocMode ? (
        <form onSubmit={submitAlloc} className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-[12px] font-semibold text-zinc-700">
            {allocMode === "allocation" ? "Adicionar saldo ao agente" : "Recolher saldo do agente"}
          </p>
          {allocMode === "allocation" && (
            <p className="text-[11px] text-zinc-500">
              Seu saldo disponível para alocar: <strong className="text-zinc-700">{brl(ownerUnallocated)}</strong>
            </p>
          )}
          {allocMode === "allocation_reversal" && (
            <p className="text-[11px] text-zinc-500">
              Saldo disponível do agente: <strong className="text-zinc-700">{brl(ledger?.availableAmount ?? 0)}</strong>
            </p>
          )}
          <input
            type="number" min={0.01} step={0.01} required
            value={allocAmount}
            onChange={(e) => setAllocAmount(e.target.value)}
            placeholder="R$ 0,00"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
            autoFocus
          />
          <input
            type="text"
            value={allocNote}
            onChange={(e) => setAllocNote(e.target.value)}
            placeholder="Motivo (opcional)"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[12px] text-zinc-700 focus:outline-none"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => { setAllocMode(null); setAllocAmount(""); setAllocNote(""); }}
              className="flex-1 rounded-lg border border-zinc-200 bg-white py-2 text-[11px] font-semibold text-zinc-600">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !allocAmount}
              className={`flex-1 rounded-lg py-2 text-[11px] font-semibold text-white disabled:opacity-40 ${allocMode === "allocation" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"}`}>
              {saving ? "Salvando..." : allocMode === "allocation" ? "Adicionar saldo" : "Recolher saldo"}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setAllocMode("allocation")} disabled={isSuspended}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-40">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Adicionar saldo
          </button>
          {(ledger?.availableAmount ?? 0) > 0 ? (
            <button type="button" onClick={() => setAllocMode("allocation_reversal")} disabled={isSuspended}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-40">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
              Recolher saldo
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function OwnerRow({ member, summary }: { member: WorkspaceMemberDetail; summary: OwnerAllocationSummary | null }) {
  const initials = (member.displayName || member.email || "P")
    .split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-[12px] font-bold text-amber-600">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[13px] font-semibold text-zinc-800">{member.displayName || member.email || "Proprietário"}</p>
            <span className="inline-flex items-center rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">Proprietário</span>
          </div>
          {member.email ? <p className="mt-1 text-[11px] text-zinc-500">{member.email}</p> : null}
        </div>
      </div>
      {summary ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-100 bg-white px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Saldo total da agência</p>
            <p className="mt-1 text-[13px] font-semibold text-zinc-800">{brl(summary.ownerWalletBalance)}</p>
          </div>
          <div className="rounded-xl border border-zinc-100 bg-white px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Alocado a agentes</p>
            <p className="mt-1 text-[13px] font-semibold text-amber-700">{brl(summary.totalAllocatedToAgents)}</p>
          </div>
          <div className="rounded-xl border border-zinc-100 bg-white px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Disponível para alocar</p>
            <p className="mt-1 text-[13px] font-semibold text-emerald-700">{brl(summary.ownerUnallocatedAvailable)}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function WorkspaceAgentManager({
  membership,
  initialSeatUsage,
  initialMembers,
  initialInvites,
  initialLedgerBalances,
  initialOwnerSummary,
}: Props) {
  const [members, setMembers] = useState<WorkspaceMemberDetail[]>(initialMembers);
  const [invites, setInvites] = useState<PremiumAgentInvite[]>(initialInvites);
  const [seatUsage, setSeatUsage] = useState<WorkspaceSeatUsage>(initialSeatUsage);
  const [ledgerMap, setLedgerMap] = useState<Map<string, AgentLedgerBalance>>(
    new Map((initialLedgerBalances ?? []).map((b) => [b.agentUserId, b]))
  );
  const [ownerSummary, setOwnerSummary] = useState<OwnerAllocationSummary | null>(initialOwnerSummary ?? null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [newLink, setNewLink] = useState<{ email: string; url: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  function handleInviteSuccess(email: string, url: string, invite: PremiumAgentInvite, usage: WorkspaceSeatUsage) {
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
      setSeatUsage((prev) => ({ ...prev, pendingInviteCount: Math.max(0, prev.pendingInviteCount - 1), usedSeats: Math.max(0, prev.usedSeats - 1), remaining: prev.remaining + 1 }));
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
      setSeatUsage((prev) => ({ ...prev, activeAgentCount: Math.max(0, prev.activeAgentCount - 1), usedSeats: Math.max(0, prev.usedSeats - 1), remaining: prev.remaining + 1 }));
      showToast("Agente removido.", true);
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      showToast(data.error ?? "Erro ao remover agente.", false);
    }
  }

  async function handleAllocate(memberId: string, type: "allocation" | "allocation_reversal", amount: number, note: string) {
    const res = await fetch(`/api/agency/workspace/agents/${memberId}/allocate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, amount, note }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      agentBalance?: AgentLedgerBalance;
      ownerSummary?: OwnerAllocationSummary;
    };
    if (res.ok && data.ok) {
      if (data.agentBalance) {
        const agentUserId = data.agentBalance.agentUserId;
        setLedgerMap((prev) => {
          const next = new Map(prev);
          next.set(agentUserId, data.agentBalance!);
          return next;
        });
      }
      if (data.ownerSummary) setOwnerSummary(data.ownerSummary);
      showToast(type === "allocation" ? "Saldo adicionado ao agente." : "Saldo recolhido do agente.", true);
    } else {
      showToast(data.error ?? "Erro ao processar alocação.", false);
    }
  }

  const isOwner = membership.role === "owner";
  const ownerMember = members.find((m) => m.role === "owner");
  const agentMembers = members.filter((m) => m.role === "agent");
  const canInvite = seatUsage.remaining > 0;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  if (!isOwner) {
    const selfLedger = ledgerMap.get(membership.userId) ?? null;
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Saldo alocado</p>
            <p className="mt-2 text-[13px] font-semibold text-zinc-800">{brl(selfLedger?.allocatedAmount ?? 0)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Saldo comprometido</p>
            <p className="mt-2 text-[13px] font-semibold text-amber-700">{brl(selfLedger?.committedAmount ?? 0)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Saldo disponível</p>
            <p className={`mt-2 text-[13px] font-semibold ${(selfLedger?.availableAmount ?? 0) === 0 ? "text-rose-600" : "text-emerald-700"}`}>
              {brl(selfLedger?.availableAmount ?? 0)}
            </p>
          </div>
        </div>
        <p className="text-[12px] text-zinc-500">
          Somente o proprietário pode convidar agentes, remover membros ou gerenciar saldo alocado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SeatBar usage={seatUsage} />
      {toast ? <Toast msg={toast.msg} ok={toast.ok} /> : null}
      {newLink ? <NewInviteLink email={newLink.email} url={newLink.url} onClose={() => setNewLink(null)} /> : null}

      {!showInviteForm && !newLink ? (
        canInvite ? (
          <button type="button" onClick={() => setShowInviteForm(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[12px] font-semibold text-amber-700 transition-colors hover:bg-amber-100">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Convidar agente
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-[12px] font-medium text-amber-700">
              Você atingiu o limite de agentes do Premium.
            </div>
            <Link href="/agency/support" className="inline-flex items-center rounded-xl border border-zinc-200 px-4 py-2 text-[12px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-50">
              Falar com suporte
            </Link>
          </div>
        )
      ) : null}

      {showInviteForm ? (
        <InviteForm onSuccess={handleInviteSuccess} onError={(msg) => showToast(msg, false)} onCancel={() => setShowInviteForm(false)} />
      ) : null}

      <div className="space-y-3">
        {ownerMember ? <OwnerRow member={ownerMember} summary={ownerSummary} /> : null}
        {agentMembers.length > 0 ? (
          agentMembers.map((member) => (
            <AgentRow
              key={member.id}
              member={member}
              ledger={ledgerMap.get(member.userId) ?? null}
              ownerUnallocated={ownerSummary?.ownerUnallocatedAvailable ?? 0}
              onRemove={removeMember}
              onAllocate={handleAllocate}
            />
          ))
        ) : (
          <EmptyBlock
            title="Nenhum agente ainda. Convide sua equipe para começar."
            description="Os agentes convidados aparecem aqui com saldo alocado, comprometido e disponível."
          />
        )}
      </div>

      <div className="space-y-3 border-t border-zinc-100 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Convites pendentes</p>
        {invites.length > 0 ? (
          invites.map((invite) => (
            <PendingInviteRow key={invite.id} invite={invite} origin={origin} onCancel={cancelInvite} />
          ))
        ) : (
          <EmptyBlock title="Nenhum convite pendente." description="Quando você criar um convite, ele aparecerá aqui até ser aceito ou cancelado." />
        )}
      </div>
    </div>
  );
}
