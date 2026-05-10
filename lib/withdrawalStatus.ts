const WITHDRAWAL_LABEL: Record<string, string> = {
  pending:    "Pendente",
  processing: "Processando",
  blocked:    "Bloqueado",
  paid:       "Pago",
  cancelled:  "Cancelado",
  rejected:   "Cancelado",
  failed:     "Falhou",
};

const WITHDRAWAL_TONE: Record<string, string> = {
  pending:    "bg-amber-50   text-amber-700   ring-1 ring-amber-100",
  processing: "bg-sky-50     text-sky-700     ring-1 ring-sky-100",
  blocked:    "bg-red-50     text-red-700     ring-1 ring-red-100",
  paid:       "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  cancelled:  "bg-zinc-100   text-zinc-500    ring-1 ring-zinc-200",
  rejected:   "bg-zinc-100   text-zinc-500    ring-1 ring-zinc-200",
  failed:     "bg-red-50     text-red-700     ring-1 ring-red-100",
};

export function withdrawalStatusLabel(status: string | null | undefined): string {
  return WITHDRAWAL_LABEL[status ?? ""] ?? (status ?? "—");
}

export function withdrawalStatusTone(status: string | null | undefined): string {
  return WITHDRAWAL_TONE[status ?? ""] ?? "bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200";
}
