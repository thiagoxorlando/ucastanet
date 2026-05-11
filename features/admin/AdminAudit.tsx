"use client";

import { useState } from "react";

export type AuditLogEntry = {
  id: string;
  admin_id: string;
  adminName: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type AuditSummary = {
  todayCount: number;
  sevenDayCount: number;
  financialCount: number;
  userCount: number;
};

const ACTION_LABELS: Record<string, string> = {
  plan_settings_changed:        "Plano alterado",
  user_deleted:                 "Usuário movido para lixeira",
  user_restored:                "Usuário restaurado",
  user_frozen:                  "Usuário congelado",
  balance_adjusted:             "Saldo ajustado",
  notification_broadcast_sent:  "Notificação enviada",
  support_status_changed:       "Suporte: status alterado",
  support_archived:             "Suporte arquivado",
  support_restored:             "Suporte restaurado",
  contract_deleted:             "Contrato excluído",
  contract_exported:            "Contrato exportado",
  withdrawal_cancelled:         "Saque cancelado",
  job_status_changed:           "Status da vaga alterado",
  platform_settings_updated:    "Configurações da plataforma alteradas",
};

const FINANCIAL_ACTIONS = new Set(["balance_adjusted", "withdrawal_cancelled", "plan_settings_changed"]);
const USER_ACTIONS = new Set(["user_deleted", "user_restored", "user_frozen"]);

const ENTITY_LABELS: Record<string, string> = {
  user:              "Usuário",
  plan_settings:     "Plano",
  wallet:            "Carteira",
  notification:      "Notificação",
  support:           "Suporte",
  contract:          "Contrato",
  withdrawal:        "Saque",
  job:               "Vaga",
  platform_settings: "Config. plataforma",
};

const PERIOD_OPTIONS = [
  { value: "today",   label: "Hoje" },
  { value: "7d",      label: "7 dias" },
  { value: "30d",     label: "30 dias" },
  { value: "all",     label: "Tudo" },
];

function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action.replaceAll("_", " ");
}

function entityLabel(type: string) {
  return ENTITY_LABELS[type] ?? type.replaceAll("_", " ");
}

function formatDateTime(value: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#647B7B] mb-1">{label}</p>
      <p className="text-[1.75rem] font-semibold tracking-tight text-[#1F2D2E]">{value}</p>
    </div>
  );
}

function DiffView({ before, after }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  if (keys.size === 0) return <span className="text-[12px] text-zinc-400">—</span>;

  return (
    <div className="space-y-0.5">
      {[...keys].map((key) => {
        const prev = before?.[key];
        const next = after?.[key];
        const changed = JSON.stringify(prev) !== JSON.stringify(next);
        if (!changed) return null;
        return (
          <div key={key} className="text-[11px] leading-tight">
            <span className="text-zinc-500">{key}: </span>
            {prev !== undefined && (
              <span className="line-through text-rose-400 mr-1">{JSON.stringify(prev)}</span>
            )}
            {next !== undefined && (
              <span className="text-emerald-600">{JSON.stringify(next)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminAudit({
  logs: initialLogs,
  summary,
}: {
  logs: AuditLogEntry[];
  summary: AuditSummary;
}) {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [period, setPeriod] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const uniqueActions = [...new Set(initialLogs.map((l) => l.action))].sort();
  const uniqueEntities = [...new Set(initialLogs.map((l) => l.entity_type))].sort();

  const now = Date.now();
  const filtered = initialLogs.filter((log) => {
    if (actionFilter !== "all" && log.action !== actionFilter) return false;
    if (entityFilter !== "all" && log.entity_type !== entityFilter) return false;
    if (period !== "all") {
      const ts = new Date(log.created_at).getTime();
      if (period === "today") {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        if (ts < start.getTime()) return false;
      } else if (period === "7d" && ts < now - 7 * 86400_000) return false;
      else if (period === "30d" && ts < now - 30 * 86400_000) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return (
        log.adminName.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.entity_type.toLowerCase().includes(q) ||
        (log.entity_id ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Ações hoje" value={summary.todayCount} />
        <SummaryCard label="Últimos 7 dias" value={summary.sevenDayCount} />
        <SummaryCard label="Alterações financeiras" value={summary.financialCount} />
        <SummaryCard label="Alterações de usuários" value={summary.userCount} />
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar admin, ação, entidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-4 py-2 text-[13px] text-zinc-700 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-700 focus:border-zinc-400 focus:outline-none"
          >
            <option value="all">Todas as ações</option>
            {uniqueActions.map((a) => (
              <option key={a} value={a}>{actionLabel(a)}</option>
            ))}
          </select>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-700 focus:border-zinc-400 focus:outline-none"
          >
            <option value="all">Todos os tipos</option>
            {uniqueEntities.map((e) => (
              <option key={e} value={e}>{entityLabel(e)}</option>
            ))}
          </select>

          <div className="flex gap-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPeriod(opt.value)}
                className={`rounded-lg px-3 py-2 text-[12px] font-medium transition-colors ${
                  period === opt.value
                    ? "bg-[#1F2D2E] text-white"
                    : "bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-[14px] text-zinc-400">
            Nenhuma ação registrada ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Data/hora</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Admin</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Ação</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Entidade</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filtered.map((log) => {
                  const isExpanded = expandedId === log.id;
                  const isFinancial = FINANCIAL_ACTIONS.has(log.action);
                  const isUser = USER_ACTIONS.has(log.action);
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-zinc-50 cursor-pointer transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    >
                      <td className="px-4 py-3 text-[12px] text-zinc-500 whitespace-nowrap">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-zinc-700 max-w-[140px] truncate">
                        {log.adminName}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          isFinancial
                            ? "bg-amber-50 text-amber-700"
                            : isUser
                              ? "bg-blue-50 text-blue-700"
                              : "bg-zinc-100 text-zinc-600"
                        }`}>
                          {actionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-zinc-500">
                        <div>{entityLabel(log.entity_type)}</div>
                        {log.entity_id && (
                          <div className="text-[10px] font-mono text-zinc-400 truncate max-w-[120px]">{log.entity_id}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[280px]">
                        {isExpanded ? (
                          <DiffView before={log.before} after={log.after} />
                        ) : (
                          <span className="text-[11px] text-zinc-400">Clique para expandir</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-zinc-400 text-right">
        {filtered.length} de {initialLogs.length} registro(s)
      </p>
    </div>
  );
}
