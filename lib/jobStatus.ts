export type JobStatus = "open" | "closed" | "draft" | "inactive";

type StatusLang = "pt-BR" | "en";

const JOB_STATUS_LABEL: Record<StatusLang, Record<string, string>> = {
  "pt-BR": {
    open: "Aberta",
    closed: "Fechada",
    draft: "Rascunho",
    inactive: "Inativa",
  },
  en: {
    open: "Open",
    closed: "Closed",
    draft: "Draft",
    inactive: "Inactive",
  },
};

const JOB_STATUS_TONE: Record<string, string> = {
  open:     "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100",
  closed:   "bg-zinc-100   text-zinc-500   ring-1 ring-zinc-200",
  draft:    "bg-amber-50   text-amber-600  ring-1 ring-amber-100",
  inactive: "bg-zinc-100   text-zinc-400   ring-1 ring-zinc-200",
};

export function jobStatusLabel(status: string, lang: StatusLang = "pt-BR"): string {
  return JOB_STATUS_LABEL[lang][status] ?? status;
}

export function jobStatusTone(status: string): string {
  return JOB_STATUS_TONE[status] ?? "bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200";
}
