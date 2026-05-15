"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { brl } from "@/lib/brl";
import type {
  WorkspaceMemberDetail,
  AgentLedgerBalance,
  OwnerAllocationSummary,
} from "@/lib/premiumWorkspace.server";

interface Props {
  agents: WorkspaceMemberDetail[];
  initialLedgerBalances: AgentLedgerBalance[];
  initialOwnerSummary: OwnerAllocationSummary;
}

type AllocationFormMode = "allocation" | "allocation_reversal" | null;

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <p className={`text-[12px] font-medium ${ok ? "text-emerald-600" : "text-rose-500"}`}>
      {msg}
    </p>
  );
}

function AgentAllocRow({
  member,
  ledger,
  ownerUnallocated,
  onAllocate,
}: {
  member: WorkspaceMemberDetail;
  ledger: AgentLedgerBalance | null;
  ownerUnallocated: number;
  onAllocate: (memberId: string, type: "allocation" | "allocation_reversal", amount: number, note: string) => Promise<void>;
}) {
  const [allocMode, setAllocMode] = useState<AllocationFormMode>(null);
  const [allocAmount, setAllocAmount] = useState("");
  const [allocNote, setAllocNote] = useState("");
  const [saving, setSaving] = useState(false);

  const initials = (member.displayName || member.email || "?")
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  const isSuspended = member.status === "suspended";
  const availableAmount = ledger?.availableAmount ?? 0;
  const committedAmount = ledger?.committedAmount ?? 0;
  const canReclaim = !isSuspended && availableAmount > 0;

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

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border border-zinc-100 bg-white px-4 py-4 ${isSuspended ? "opacity-70" : ""}`}>
      <div className="flex items-center gap-3">
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
          {member.email ? <p className="mt-0.5 text-[11px] text-zinc-500">{member.email}</p> : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Saldo alocado</p>
          <p className="mt-1 text-[13px] font-semibold text-zinc-800">{brl(ledger?.allocatedAmount ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Comprometido</p>
          <p className="mt-1 text-[13px] font-semibold text-amber-700">{brl(committedAmount)}</p>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Pago/Gasto</p>
          <p className="mt-1 text-[13px] font-semibold text-rose-600">{brl(ledger?.spentAmount ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Disponivel</p>
          <p className={`mt-1 text-[13px] font-semibold ${availableAmount === 0 ? "text-rose-600" : "text-emerald-700"}`}>
            {brl(availableAmount)}
          </p>
        </div>
      </div>

      {allocMode ? (
        <form onSubmit={submitAlloc} className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-[12px] font-semibold text-zinc-700">
            {allocMode === "allocation" ? "Adicionar saldo ao agente" : "Puxar saldo"}
          </p>
          {allocMode === "allocation" && (
            <p className="text-[11px] text-zinc-500">
              Seu saldo disponivel para alocar: <strong className="text-zinc-700">{brl(ownerUnallocated)}</strong>
            </p>
          )}
          {allocMode === "allocation_reversal" && (
            <p className="text-[11px] text-zinc-500">
              Saldo disponivel do agente: <strong className="text-zinc-700">{brl(availableAmount)}</strong>
            </p>
          )}
          <input
            type="number"
            min={0.01}
            step={0.01}
            required
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
            <button
              type="button"
              onClick={() => {
                setAllocMode(null);
                setAllocAmount("");
                setAllocNote("");
              }}
              className="flex-1 rounded-lg border border-zinc-200 bg-white py-2 text-[11px] font-semibold text-zinc-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !allocAmount}
              className={`flex-1 rounded-lg py-2 text-[11px] font-semibold text-white disabled:opacity-40 ${allocMode === "allocation" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"}`}
            >
              {saving ? "Salvando..." : allocMode === "allocation" ? "Adicionar saldo" : "Puxar saldo"}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAllocMode("allocation")}
              disabled={isSuspended}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-40"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Adicionar saldo
            </button>
            <button
              type="button"
              onClick={() => {
                if (!canReclaim) return;
                setAllocMode("allocation_reversal");
              }}
              disabled={!canReclaim}
              className={[
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                canReclaim
                  ? "border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100"
                  : "border-zinc-200 bg-zinc-100 text-zinc-400",
              ].join(" ")}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
              Puxar saldo
            </button>
          </div>
          {!canReclaim ? (
            <p className="text-[11px] text-zinc-500">
              Sem saldo disponivel para puxar. Este agente tem {brl(committedAmount)} comprometido em vagas.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function WorkspaceWalletAllocator({ agents, initialLedgerBalances, initialOwnerSummary }: Props) {
  const router = useRouter();
  const [ledgerMap, setLedgerMap] = useState<Map<string, AgentLedgerBalance>>(
    new Map(initialLedgerBalances.map((balance) => [balance.agentUserId, balance])),
  );
  const [ownerSummary, setOwnerSummary] = useState<OwnerAllocationSummary>(initialOwnerSummary);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
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
        setLedgerMap((prev) => {
          const next = new Map(prev);
          next.set(data.agentBalance!.agentUserId, data.agentBalance!);
          return next;
        });
      }
      if (data.ownerSummary) setOwnerSummary(data.ownerSummary);
      showToast(type === "allocation" ? "Saldo adicionado ao agente." : "Saldo puxado de volta para o proprietario.", true);
      router.refresh();
    } else {
      showToast(data.error ?? "Erro ao processar alocacao.", false);
    }
  }

  if (agents.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-5 py-6 text-center">
        <p className="text-[14px] text-zinc-500">Nenhum agente ativo. Convide agentes na pagina de Agentes.</p>
      </div>
    );
  }

  const totalCommitted = Array.from(ledgerMap.values()).reduce((sum, ledger) => sum + ledger.committedAmount, 0);

  return (
    <div className="space-y-3">
      {toast ? <Toast msg={toast.msg} ok={toast.ok} /> : null}
      {agents.map((agent) => (
        <AgentAllocRow
          key={agent.id}
          member={agent}
          ledger={ledgerMap.get(agent.userId) ?? null}
          ownerUnallocated={ownerSummary.ownerUnallocatedAvailable}
          onAllocate={handleAllocate}
        />
      ))}
      <p className="text-[12px] text-zinc-400">
        Total comprometido em vagas ativas: <strong className="text-zinc-600">{brl(totalCommitted)}</strong>
      </p>
    </div>
  );
}
