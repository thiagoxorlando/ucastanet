"use client";

import { useState } from "react";
import { brl } from "@/lib/brl";
import type { Plan } from "@/lib/plans";

export type AdminPlansCharge = {
  id: string;
  createdAt: string;
  planName: string;
  amount: number;
  status: string;
  provider: string;
  paymentId: string | null;
  processedAt: string | null;
  invoiceUrl: string | null;
  description: string | null;
};

export type AdminPlansAgency = {
  id: string;
  agencyName: string;
  contactName: string | null;
  currentPlan: Plan;
  currentPlanLabel: string;
  planStatus: string;
  nextChargeDate: string | null;
  asaasCustomerId: string | null;
  asaasSubscriptionId: string | null;
  totalPaid: number;
  paidChargeCount: number;
  paidCharges: AdminPlansCharge[];
  pendingCharges: AdminPlansCharge[];
  failedCharges: AdminPlansCharge[];
};

type AdminPlansProps = {
  agencies: AdminPlansAgency[];
  summary: {
    freeCount: number;
    proCount: number;
    premiumCount: number;
    totalRevenuePaid: number;
    pendingChargeCount: number;
    pendingChargeAmount: number;
  };
};

const PLAN_OPTIONS: Array<{ value: "all" | Plan; label: string }> = [
  { value: "all", label: "Todos os planos" },
  { value: "free", label: "Free" },
  { value: "pro", label: "Pro" },
  { value: "premium", label: "Premium" },
];

const STATUS_OPTIONS = [
  "all",
  "active",
  "inactive",
  "pending",
  "cancelled",
  "canceled",
  "past_due",
  "overdue",
  "trialing",
] as const;

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function planStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "Ativo";
    case "inactive":
      return "Inativo";
    case "pending":
      return "Pendente";
    case "cancelled":
    case "canceled":
      return "Cancelado";
    case "past_due":
    case "overdue":
      return "Em atraso";
    case "trialing":
      return "Em teste";
    default:
      return status ? status.replaceAll("_", " ") : "—";
  }
}

function chargeStatusLabel(status: string) {
  switch (status) {
    case "paid":
      return "Pago";
    case "pending":
      return "Pendente";
    case "processing":
      return "Processando";
    case "awaiting_payment":
    case "pending_payment":
      return "Aguardando pagamento";
    case "failed":
      return "Falha";
    case "cancelled":
    case "canceled":
      return "Cancelado";
    case "past_due":
    case "overdue":
      return "Em atraso";
    default:
      return status ? status.replaceAll("_", " ") : "—";
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "active":
    case "paid":
      return "badge-success";
    case "pending":
    case "processing":
    case "awaiting_payment":
    case "pending_payment":
    case "trialing":
      return "badge-pending";
    case "cancelled":
    case "canceled":
    case "failed":
    case "past_due":
    case "overdue":
      return "badge-error";
    default:
      return "badge-info";
  }
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#647B7B] mb-1">{label}</p>
      <p className="text-[1.5rem] font-semibold tracking-tight text-[#1F2D2E] leading-none">{value}</p>
      {sub ? <p className="text-[12px] text-[#647B7B] mt-1.5">{sub}</p> : null}
    </div>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-[#DDE6E6] bg-white px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#647B7B] mb-1">{label}</p>
      <p className={`text-[13px] text-[#1F2D2E] ${mono ? "font-mono break-all" : "font-medium"}`}>{value || "—"}</p>
    </div>
  );
}

function ChargeSection({ title, charges }: { title: string; charges: AdminPlansCharge[] }) {
  if (charges.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-[#1F2D2E]">{title}</p>
        <p className="text-[11px] text-[#647B7B]">{charges.length} registro{charges.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="space-y-3">
        {charges.map((charge) => (
          <div key={charge.id} className="rounded-2xl border border-[#DDE6E6] bg-[#F8FAFC] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[14px] font-semibold text-[#1F2D2E]">{charge.planName}</p>
                  <span className={statusBadgeClass(charge.status)}>{chargeStatusLabel(charge.status)}</span>
                </div>
                <p className="text-[12px] text-[#647B7B]">{formatDateTime(charge.createdAt)}</p>
                {charge.description ? (
                  <p className="text-[12px] text-[#647B7B]">{charge.description}</p>
                ) : null}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-[15px] font-semibold text-[#0E7C86] tabular-nums">{brl(charge.amount)}</p>
                {charge.invoiceUrl ? (
                  <a
                    href={charge.invoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-xl border border-[#DDE6E6] bg-white px-3 py-2 text-[12px] font-semibold text-[#0E7C86] hover:bg-[#E6F0F0] transition-colors"
                  >
                    Comprovante
                  </a>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <DetailRow label="Data" value={formatDate(charge.createdAt)} />
              <DetailRow label="Hora" value={formatDateTime(charge.createdAt).split(" ").slice(-1)[0] ?? "—"} />
              <DetailRow label="Provedor" value={charge.provider || "ASAAS"} />
              <DetailRow label="Pago / processado em" value={formatDateTime(charge.processedAt)} />
              <DetailRow label="Pagamento Asaas" value={charge.paymentId ?? "—"} mono />
              <DetailRow label="Referencia" value={charge.id} mono />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminPlans({ agencies, summary }: AdminPlansProps) {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<"all" | Plan>("all");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [expandedAgencyId, setExpandedAgencyId] = useState<string | null>(agencies[0]?.id ?? null);

  const filteredAgencies = agencies.filter((agency) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      agency.agencyName.toLowerCase().includes(query) ||
      (agency.contactName ?? "").toLowerCase().includes(query);

    const matchesPlan = planFilter === "all" || agency.currentPlan === planFilter;

    const matchesStatus =
      statusFilter === "all" ||
      agency.planStatus === statusFilter ||
      (statusFilter === "cancelled" && agency.planStatus === "canceled") ||
      (statusFilter === "canceled" && agency.planStatus === "cancelled") ||
      (statusFilter === "past_due" && agency.planStatus === "overdue") ||
      (statusFilter === "overdue" && agency.planStatus === "past_due");

    return matchesSearch && matchesPlan && matchesStatus;
  });

  return (
    <div className="max-w-7xl space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#647B7B] mb-1">Admin da Plataforma</p>
          <h1 className="text-[1.75rem] font-semibold tracking-tight text-[#1F2D2E] leading-tight">Planos</h1>
          <p className="text-[13px] text-[#647B7B] mt-1">Acompanhe planos de agencias e confira o historico real de cobrancas.</p>
        </div>
        <div className="rounded-2xl border border-[#DDE6E6] bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#647B7B]">Agencias visiveis</p>
          <p className="text-[1.25rem] font-semibold text-[#1F2D2E]">{filteredAgencies.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Agencias no Free" value={String(summary.freeCount)} />
        <SummaryCard label="Agencias no Pro" value={String(summary.proCount)} />
        <SummaryCard label="Agencias no Premium" value={String(summary.premiumCount)} />
        <SummaryCard label="Receita paga" value={brl(summary.totalRevenuePaid)} />
        <SummaryCard
          label="Cobrancas pendentes"
          value={String(summary.pendingChargeCount)}
          sub={summary.pendingChargeCount > 0 ? brl(summary.pendingChargeAmount) : "Sem valores pendentes"}
        />
      </div>

      <div className="card p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.5fr)_220px_220px]">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7FA9A8] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por agencia ou contato"
              className="input-base pl-10"
            />
          </div>

          <select
            value={planFilter}
            onChange={(event) => setPlanFilter(event.target.value as "all" | Plan)}
            className="input-base"
          >
            {PLAN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as (typeof STATUS_OPTIONS)[number])}
            className="input-base"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status === "all" ? "Todos os status" : planStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredAgencies.map((agency) => {
          const isExpanded = expandedAgencyId === agency.id;
          const totalHistoryCount = agency.paidCharges.length + agency.pendingCharges.length + agency.failedCharges.length;

          return (
            <div key={agency.id} className="card overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedAgencyId(isExpanded ? null : agency.id)}
                className="w-full px-6 py-5 text-left hover:bg-[#F8FAFC] transition-colors"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-[16px] font-semibold text-[#1F2D2E]">{agency.agencyName}</h2>
                      <span className={statusBadgeClass(agency.planStatus)}>{planStatusLabel(agency.planStatus)}</span>
                      <span className="badge-info">{agency.currentPlanLabel}</span>
                    </div>
                    <p className="text-[13px] text-[#647B7B]">
                      {agency.contactName ? `Responsavel: ${agency.contactName}` : "Responsavel nao informado"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 xl:min-w-[640px]">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#647B7B] mb-1">Proxima cobranca</p>
                      <p className="text-[13px] font-medium text-[#1F2D2E]">{formatDate(agency.nextChargeDate)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#647B7B] mb-1">Total pago</p>
                      <p className="text-[13px] font-semibold text-[#0E7C86] tabular-nums">{brl(agency.totalPaid)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#647B7B] mb-1">Cobrancas pagas</p>
                      <p className="text-[13px] font-medium text-[#1F2D2E]">{agency.paidChargeCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#647B7B] mb-1">Historico</p>
                      <p className="text-[13px] font-medium text-[#1F2D2E]">{totalHistoryCount} registro{totalHistoryCount !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                </div>
              </button>

              {isExpanded ? (
                <div className="border-t border-[#DDE6E6] px-6 py-5 space-y-6 bg-[#FCFDFD]">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <DetailRow label="Asaas customer id" value={agency.asaasCustomerId ?? "—"} mono />
                    <DetailRow label="Asaas subscription id" value={agency.asaasSubscriptionId ?? "—"} mono />
                    <DetailRow label="Plano atual" value={agency.currentPlanLabel} />
                    <DetailRow label="Status do plano" value={planStatusLabel(agency.planStatus)} />
                  </div>

                  {totalHistoryCount > 0 ? (
                    <div className="space-y-6">
                      <ChargeSection title="Pagas" charges={agency.paidCharges} />
                      <ChargeSection title="Pendentes" charges={agency.pendingCharges} />
                      <ChargeSection title="Falhas/Canceladas" charges={agency.failedCharges} />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#DDE6E6] bg-white px-6 py-10 text-center">
                      <p className="text-[14px] font-semibold text-[#647B7B]">Nenhuma cobranca de plano encontrada</p>
                      <p className="text-[12px] text-[#7FA9A8] mt-1">Este painel mostra apenas registros ja existentes em wallet_transactions.</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}

        {filteredAgencies.length === 0 ? (
          <div className="card px-6 py-14 text-center">
            <p className="text-[14px] font-semibold text-[#647B7B]">Nenhuma agencia encontrada</p>
            <p className="text-[12px] text-[#7FA9A8] mt-1">Ajuste a busca ou os filtros para ver outros planos.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
