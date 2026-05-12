"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  ReconciliationData,
  ReconciliationAlert,
  DepositRow,
  WithdrawalRow,
  PlanChargeRow,
  WebhookRow,
  ReconStatus,
  AlertSeverity,
  AlertType,
} from "@/lib/readModels/reconciliation";
import { useT } from "@/lib/LanguageContext";

// ── Helpers ──────────────────────────────────────────────────────────────────

function brl(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDT(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

const STATUS_APP_LABELS: Record<string, string> = {
  pending:    "Pendente",
  paid:       "Pago",
  failed:     "Falha",
  cancelled:  "Cancelado",
  processing: "Processando",
  blocked:    "Bloqueado",
};

// ── Recon status badge ────────────────────────────────────────────────────────

function ReconBadge({ status }: { status: ReconStatus | WebhookRow["status"] }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    ok:         { cls: "bg-emerald-50 text-emerald-700",          label: "Conciliado" },
    attention:  { cls: "bg-amber-50 text-amber-700",              label: "Atenção" },
    divergent:  { cls: "bg-rose-50 text-rose-700",                label: "Divergente" },
    processed:  { cls: "bg-emerald-50 text-emerald-700",          label: "Processado" },
    pending:    { cls: "bg-amber-50 text-amber-700",              label: "Pendente" },
    error:      { cls: "bg-rose-50 text-rose-700",                label: "Erro" },
  };
  const { cls, label } = cfg[status] ?? { cls: "bg-zinc-100 text-zinc-600", label: status };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const cfg: Record<AlertSeverity, { cls: string; label: string }> = {
    critical: { cls: "bg-rose-50 text-rose-700",   label: "Crítico" },
    warning:  { cls: "bg-amber-50 text-amber-700", label: "Atenção" },
    info:     { cls: "bg-zinc-100 text-zinc-600",  label: "Info" },
  };
  const { cls, label } = cfg[severity];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function TypeBadge({ type }: { type: AlertType }) {
  const cfg: Record<AlertType, { cls: string; label: string }> = {
    deposit:    { cls: "bg-blue-50 text-blue-700",    label: "Depósito" },
    withdrawal: { cls: "bg-violet-50 text-violet-700", label: "Saque" },
    plan:       { cls: "bg-teal-50 text-teal-700",    label: "Plano" },
    webhook:    { cls: "bg-zinc-100 text-zinc-600",   label: "Webhook" },
  };
  const { cls, label } = cfg[type];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

function AppStatusBadge({ status }: { status: string }) {
  const good = status === "paid";
  const bad  = status === "failed" || status === "cancelled" || status === "blocked";
  const cls  = good ? "text-emerald-700" : bad ? "text-rose-600" : "text-amber-700";
  return <span className={`text-[12px] font-medium ${cls}`}>{STATUS_APP_LABELS[status] ?? status}</span>;
}

// ── Summary cards ────────────────────────────────────────────────────────────

function SummaryCard({
  label, ok, alert, alertLabel = "alertas",
}: { label: string; ok?: number; alert?: number; alertLabel?: string }) {
  return (
    <div className="card p-5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#647B7B] mb-2">{label}</p>
      {ok !== undefined && (
        <p className="text-[1.5rem] font-semibold text-[#1F2D2E] leading-none">{ok}</p>
      )}
      {alert !== undefined && alert > 0 && (
        <p className="mt-1 text-[12px] font-semibold text-rose-600">{alert} {alertLabel}</p>
      )}
      {alert !== undefined && alert === 0 && ok !== undefined && (
        <p className="mt-1 text-[11px] text-emerald-600">Sem pendências</p>
      )}
    </div>
  );
}

// ── Period filter ─────────────────────────────────────────────────────────────

type Period = "today" | "7d" | "30d" | "all";
const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "7d",    label: "7 dias" },
  { value: "30d",   label: "30 dias" },
  { value: "all",   label: "Tudo" },
];

function periodFilter(createdAt: string, period: Period) {
  if (period === "all") return true;
  const ts = new Date(createdAt).getTime();
  const now = Date.now();
  if (period === "today") {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return ts >= start.getTime();
  }
  if (period === "7d")  return ts >= now - 7  * 86400_000;
  if (period === "30d") return ts >= now - 30 * 86400_000;
  return true;
}

function PeriodButtons({ value, onChange }: { value: Period; onChange: (v: Period) => void }) {
  return (
    <div className="flex gap-1">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
            value === p.value
              ? "bg-[#1F2D2E] text-white"
              : "bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative flex-1 min-w-[200px]">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Buscar..."}
        className="w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-4 py-2 text-[13px] text-zinc-700 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none"
      />
    </div>
  );
}

function EmptyRow({ cols = 7 }: { cols?: number }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center text-[13px] text-zinc-400">
        Nenhum registro encontrado.
      </td>
    </tr>
  );
}

function TableHead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="border-b border-zinc-100 bg-zinc-50">
        {cols.map((c) => (
          <th key={c} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "alerts" | "deposits" | "withdrawals" | "plans" | "webhooks";

// ── Alerts tab ───────────────────────────────────────────────────────────────

function AlertsTab({ alerts }: { alerts: ReconciliationAlert[] }) {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const filtered = alerts.filter((a) => {
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    if (severityFilter !== "all" && a.severity !== severityFilter) return false;
    if (!periodFilter(a.createdAt, period)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.description.toLowerCase().includes(q) ||
        (a.userName ?? "").toLowerCase().includes(q) ||
        (a.referenceId ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar descrição, usuário, referência..." />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-700 focus:border-zinc-400 focus:outline-none">
          <option value="all">Todos os tipos</option>
          <option value="deposit">Depósito</option>
          <option value="withdrawal">Saque</option>
          <option value="plan">Plano</option>
          <option value="webhook">Webhook</option>
        </select>
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-700 focus:border-zinc-400 focus:outline-none">
          <option value="all">Todas as severidades</option>
          <option value="critical">Crítico</option>
          <option value="warning">Atenção</option>
          <option value="info">Info</option>
        </select>
        <PeriodButtons value={period} onChange={setPeriod} />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <TableHead cols={["Severidade", "Tipo", "Descrição", "Usuário", "Valor", "Referência", "Data", "Ação"]} />
            <tbody className="divide-y divide-zinc-50">
              {filtered.length === 0 ? <EmptyRow cols={8} /> : filtered.map((a) => (
                <tr key={a.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3"><SeverityBadge severity={a.severity} /></td>
                  <td className="px-4 py-3"><TypeBadge type={a.type} /></td>
                  <td className="px-4 py-3 text-[12px] text-zinc-700 max-w-[260px]">{a.description}</td>
                  <td className="px-4 py-3 text-[12px] text-zinc-600">{a.userName ?? "—"}</td>
                  <td className="px-4 py-3 text-[12px] font-mono text-zinc-700">{brl(a.amount)}</td>
                  <td className="px-4 py-3 text-[11px] font-mono text-zinc-400 max-w-[120px] truncate">{a.referenceId ?? "—"}</td>
                  <td className="px-4 py-3 text-[11px] text-zinc-500 whitespace-nowrap">{formatDT(a.createdAt)}</td>
                  <td className="px-4 py-3">
                    {a.adminLink ? (
                      <Link href={a.adminLink} className="text-[11px] text-[#1ABC9C] hover:underline">Ver →</Link>
                    ) : <span className="text-[11px] text-zinc-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-zinc-400 text-right">{filtered.length} de {alerts.length} alerta(s)</p>
    </div>
  );
}

// ── Deposits tab ──────────────────────────────────────────────────────────────

function DepositsTab({ deposits }: { deposits: DepositRow[] }) {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = deposits.filter((d) => {
    if (statusFilter !== "all") {
      if (statusFilter === "ok" && d.reconStatus !== "ok") return false;
      if (statusFilter === "attention" && d.reconStatus === "ok") return false;
      if (statusFilter === "divergent" && d.reconStatus !== "divergent") return false;
    }
    if (!periodFilter(d.createdAt, period)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        d.userName.toLowerCase().includes(q) ||
        (d.asaasPaymentId ?? "").toLowerCase().includes(q) ||
        (d.paymentId ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Usuário, payment_id..." />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-700 focus:border-zinc-400 focus:outline-none">
          <option value="all">Todos os status</option>
          <option value="ok">Conciliado</option>
          <option value="attention">Atenção</option>
          <option value="divergent">Divergente</option>
        </select>
        <PeriodButtons value={period} onChange={setPeriod} />
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <TableHead cols={["Data", "Usuário", "Valor", "Status", "Asaas ID", "Processado em", "Conciliação"]} />
            <tbody className="divide-y divide-zinc-50">
              {filtered.length === 0 ? <EmptyRow /> : filtered.map((d) => (
                <tr key={d.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 text-[12px] text-zinc-500 whitespace-nowrap">{formatDate(d.createdAt)}</td>
                  <td className="px-4 py-3 text-[13px] text-zinc-700">{d.userName}</td>
                  <td className="px-4 py-3 text-[13px] font-mono">{brl(d.amount)}</td>
                  <td className="px-4 py-3"><AppStatusBadge status={d.status} /></td>
                  <td className="px-4 py-3 text-[11px] font-mono text-zinc-400 max-w-[130px] truncate">{d.asaasPaymentId ?? d.paymentId ?? "—"}</td>
                  <td className="px-4 py-3 text-[11px] text-zinc-500">{formatDT(d.processedAt)}</td>
                  <td className="px-4 py-3"><ReconBadge status={d.reconStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-zinc-400 text-right">{filtered.length} de {deposits.length}</p>
    </div>
  );
}

// ── Withdrawals tab ───────────────────────────────────────────────────────────

function WithdrawalsTab({ withdrawals }: { withdrawals: WithdrawalRow[] }) {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = withdrawals.filter((w) => {
    if (statusFilter !== "all") {
      if (statusFilter === "ok" && w.reconStatus !== "ok") return false;
      if (statusFilter === "attention" && w.reconStatus !== "attention") return false;
      if (statusFilter === "divergent" && w.reconStatus !== "divergent") return false;
    }
    if (!periodFilter(w.createdAt, period)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        w.userName.toLowerCase().includes(q) ||
        (w.asaasTransferId ?? "").toLowerCase().includes(q) ||
        (w.providerTransferId ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Usuário, transfer_id..." />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-700 focus:border-zinc-400 focus:outline-none">
          <option value="all">Todos os status</option>
          <option value="ok">Conciliado</option>
          <option value="attention">Atenção</option>
          <option value="divergent">Divergente</option>
        </select>
        <PeriodButtons value={period} onChange={setPeriod} />
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <TableHead cols={["Data", "Usuário", "Valor", "Status", "Transfer ID", "Provedor", "Processado em", "Conciliação"]} />
            <tbody className="divide-y divide-zinc-50">
              {filtered.length === 0 ? <EmptyRow cols={8} /> : filtered.map((w) => (
                <tr key={w.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 text-[12px] text-zinc-500 whitespace-nowrap">{formatDate(w.createdAt)}</td>
                  <td className="px-4 py-3 text-[13px] text-zinc-700">{w.userName}</td>
                  <td className="px-4 py-3 text-[13px] font-mono">{brl(w.amount)}</td>
                  <td className="px-4 py-3"><AppStatusBadge status={w.status} /></td>
                  <td className="px-4 py-3 text-[11px] font-mono text-zinc-400 max-w-[120px] truncate">{w.asaasTransferId ?? w.providerTransferId ?? "—"}</td>
                  <td className="px-4 py-3 text-[12px] text-zinc-500">{w.provider ?? "—"}</td>
                  <td className="px-4 py-3 text-[11px] text-zinc-500">{formatDT(w.processedAt)}</td>
                  <td className="px-4 py-3"><ReconBadge status={w.reconStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-zinc-400 text-right">{filtered.length} de {withdrawals.length}</p>
    </div>
  );
}

// ── Plan charges tab ──────────────────────────────────────────────────────────

function PlanChargesTab({ planCharges }: { planCharges: PlanChargeRow[] }) {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = planCharges.filter((p) => {
    if (statusFilter !== "all") {
      if (statusFilter === "ok" && p.reconStatus !== "ok") return false;
      if (statusFilter !== "ok" && p.reconStatus === "ok") return false;
    }
    if (!periodFilter(p.createdAt, period)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.userName.toLowerCase().includes(q) ||
        (p.paymentId ?? "").toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Agência, payment_id, descrição..." />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-700 focus:border-zinc-400 focus:outline-none">
          <option value="all">Todos</option>
          <option value="ok">Conciliado</option>
          <option value="attention">Com atenção</option>
        </select>
        <PeriodButtons value={period} onChange={setPeriod} />
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <TableHead cols={["Data", "Agência", "Valor", "Status", "Payment ID", "Descrição", "Processado em", "Conciliação"]} />
            <tbody className="divide-y divide-zinc-50">
              {filtered.length === 0 ? <EmptyRow cols={8} /> : filtered.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 text-[12px] text-zinc-500 whitespace-nowrap">{formatDate(p.createdAt)}</td>
                  <td className="px-4 py-3 text-[13px] text-zinc-700">{p.userName}</td>
                  <td className="px-4 py-3 text-[13px] font-mono">{brl(p.amount)}</td>
                  <td className="px-4 py-3"><AppStatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-[11px] font-mono text-zinc-400 max-w-[120px] truncate">{p.paymentId ?? "—"}</td>
                  <td className="px-4 py-3 text-[12px] text-zinc-500 max-w-[180px] truncate">{p.description ?? "—"}</td>
                  <td className="px-4 py-3 text-[11px] text-zinc-500">{formatDT(p.processedAt)}</td>
                  <td className="px-4 py-3"><ReconBadge status={p.reconStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-zinc-400 text-right">{filtered.length} de {planCharges.length}</p>
    </div>
  );
}

// ── Webhooks tab ──────────────────────────────────────────────────────────────

function WebhooksTab({ webhooks }: { webhooks: WebhookRow[] }) {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const uniqueTypes = [...new Set(webhooks.map((w) => w.eventType))].sort();

  const filtered = webhooks.filter((w) => {
    if (statusFilter !== "all" && w.status !== statusFilter) return false;
    if (typeFilter !== "all" && w.eventType !== typeFilter) return false;
    if (!periodFilter(w.createdAt, period)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (w.eventId ?? "").toLowerCase().includes(q) ||
        w.eventType.toLowerCase().includes(q) ||
        (w.relatedId ?? "").toLowerCase().includes(q) ||
        (w.error ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="event_id, tipo, transfer/payment id..." />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-700 focus:border-zinc-400 focus:outline-none">
          <option value="all">Todos os tipos</option>
          {uniqueTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-700 focus:border-zinc-400 focus:outline-none">
          <option value="all">Todos os status</option>
          <option value="processed">Processado</option>
          <option value="pending">Pendente</option>
          <option value="error">Erro</option>
        </select>
        <PeriodButtons value={period} onChange={setPeriod} />
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <TableHead cols={["Recebido", "Tipo", "Event ID", "Ref. ID", "Processado em", "Erro", "Status"]} />
            <tbody className="divide-y divide-zinc-50">
              {filtered.length === 0 ? <EmptyRow /> : filtered.map((w) => (
                <tr key={w.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 text-[12px] text-zinc-500 whitespace-nowrap">{formatDT(w.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className="text-[12px] font-mono text-zinc-700">{w.eventType}</span>
                  </td>
                  <td className="px-4 py-3 text-[11px] font-mono text-zinc-400 max-w-[120px] truncate">{w.eventId ?? "—"}</td>
                  <td className="px-4 py-3 text-[11px] font-mono text-zinc-400 max-w-[120px] truncate">{w.relatedId ?? "—"}</td>
                  <td className="px-4 py-3 text-[11px] text-zinc-500">{formatDT(w.processedAt)}</td>
                  <td className="px-4 py-3 text-[11px] text-rose-500 max-w-[160px] truncate">{w.error ?? "—"}</td>
                  <td className="px-4 py-3"><ReconBadge status={w.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-zinc-400 text-right">{filtered.length} de {webhooks.length}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminReconciliation({ data }: { data: ReconciliationData }) {
  const { t } = useT();
  const [activeTab, setActiveTab] = useState<Tab>("alerts");
  const { summary, alerts, deposits, withdrawals, planCharges, webhooks } = data;

  const tabs: { key: Tab; label: string; count?: number; urgent?: boolean }[] = [
    { key: "alerts",      label: "Alertas",    count: alerts.length,                    urgent: alerts.some((a) => a.severity === "critical") },
    { key: "deposits",    label: "Depósitos",  count: deposits.length },
    { key: "withdrawals", label: "Saques",     count: withdrawals.length },
    { key: "plans",       label: "Planos",     count: planCharges.length },
    { key: "webhooks",    label: "Webhooks",   count: webhooks.length,                  urgent: webhooks.some((w) => w.status !== "processed") },
  ];

  return (
    <div className="space-y-6">
      {/* Read-only notice */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[12px] text-zinc-500">
        Página somente leitura. Ações manuais serão adicionadas em uma próxima etapa.
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard label="Depósitos conciliados" ok={summary.depositsOk} alert={summary.depositsAlert} />
        <SummaryCard label="Depósitos c/ alerta" ok={summary.depositsAlert} alertLabel="pendências" />
        <SummaryCard label="Saques conciliados" ok={summary.withdrawalsOk} alert={summary.withdrawalsAlert} />
        <SummaryCard label="Saques c/ alerta" ok={summary.withdrawalsAlert} alertLabel="pendências" />
        <SummaryCard label="Planos conciliados" ok={summary.planChargesOk} />
        <SummaryCard label="Webhooks pendentes" ok={summary.webhooksPending} alertLabel="webhooks" />
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-3 text-[13px] font-medium border-b-2 transition-colors ${
                activeTab === t.key
                  ? "border-[#1F2D2E] text-[#1F2D2E]"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  t.urgent ? "bg-rose-100 text-rose-700" : "bg-zinc-100 text-zinc-600"
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "alerts"      && <AlertsTab    alerts={alerts} />}
      {activeTab === "deposits"    && <DepositsTab  deposits={deposits} />}
      {activeTab === "withdrawals" && <WithdrawalsTab withdrawals={withdrawals} />}
      {activeTab === "plans"       && <PlanChargesTab planCharges={planCharges} />}
      {activeTab === "webhooks"    && <WebhooksTab  webhooks={webhooks} />}
    </div>
  );
}
