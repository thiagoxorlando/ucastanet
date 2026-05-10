export type JobStatus = "open" | "closed" | "draft" | "inactive";

const JOB_STATUS_LABEL: Record<string, string> = {
  open:     "Aberta",
  closed:   "Fechada",
  draft:    "Rascunho",
  inactive: "Inativa",
};

const JOB_STATUS_TONE: Record<string, string> = {
  open:     "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100",
  closed:   "bg-zinc-100   text-zinc-500   ring-1 ring-zinc-200",
  draft:    "bg-amber-50   text-amber-600  ring-1 ring-amber-100",
  inactive: "bg-zinc-100   text-zinc-400   ring-1 ring-zinc-200",
};

export function jobStatusLabel(status: string): string {
  return JOB_STATUS_LABEL[status] ?? status;
}

export function jobStatusTone(status: string): string {
  return JOB_STATUS_TONE[status] ?? "bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200";
}
