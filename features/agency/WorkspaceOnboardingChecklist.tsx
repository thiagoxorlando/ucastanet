"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ChecklistItem = {
  label: string;
  hint: string;
  href: string;
  done: boolean;
};

type Props = {
  items: ChecklistItem[];
  lang: "pt-BR" | "en";
};

const LABELS = {
  "pt-BR": {
    title: "Configure seu workspace",
    subtitle: "Complete os passos abaixo para aproveitar ao máximo o Espaço Premium.",
    skip: "Pular configuração",
    complete: "Concluir",
    steps_done: (n: number, total: number) => `${n} de ${total} etapas concluídas`,
  },
  en: {
    title: "Set up your workspace",
    subtitle: "Complete the steps below to get the most out of your Premium Space.",
    skip: "Skip setup",
    complete: "Finish",
    steps_done: (n: number, total: number) => `${n} of ${total} steps completed`,
  },
} as const;

export default function WorkspaceOnboardingChecklist({ items, lang }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const t = LABELS[lang] ?? LABELS["pt-BR"];

  if (dismissed) return null;

  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = Math.round((doneCount / total) * 100);
  const allDone = doneCount === total;

  function dismiss() {
    startTransition(async () => {
      await fetch("/api/agency/workspace/onboarding", { method: "PATCH" });
      setDismissed(true);
      router.refresh();
    });
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-violet-200 bg-white shadow-[0_12px_36px_rgba(109,40,217,0.07)]">
      {/* Header bar */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[16px] font-bold tracking-tight">{t.title}</p>
            <p className="mt-1 text-[13px] text-white/75">{t.subtitle}</p>
          </div>
          <button
            onClick={dismiss}
            disabled={pending}
            className="flex-shrink-0 rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-50"
            aria-label="Fechar"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-white/70">{t.steps_done(doneCount, total)}</span>
            <span className="text-[11px] font-semibold text-white/70">{pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="divide-y divide-zinc-100">
        {items.map((item) => (
          <div
            key={item.href}
            className={`flex items-center gap-4 px-6 py-4 transition-colors ${item.done ? "bg-zinc-50" : "hover:bg-violet-50/40"}`}
          >
            {/* Checkbox */}
            <div
              className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                item.done
                  ? "border-emerald-500 bg-emerald-500"
                  : "border-zinc-300 bg-white"
              }`}
            >
              {item.done && (
                <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>

            {/* Label */}
            <div className="min-w-0 flex-1">
              <p className={`text-[14px] font-semibold ${item.done ? "text-zinc-400 line-through" : "text-zinc-800"}`}>
                {item.label}
              </p>
              {!item.done && (
                <p className="mt-0.5 text-[12px] text-zinc-500">{item.hint}</p>
              )}
            </div>

            {/* Action */}
            {!item.done && (
              <Link
                href={item.href}
                className="flex-shrink-0 rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-semibold text-violet-700 transition-colors hover:bg-violet-100"
              >
                Ir
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-4 border-t border-zinc-100 px-6 py-4">
        <button
          onClick={dismiss}
          disabled={pending}
          className="text-[12px] text-zinc-400 underline underline-offset-2 transition-colors hover:text-zinc-600 disabled:opacity-50"
        >
          {t.skip}
        </button>
        {allDone && (
          <button
            onClick={dismiss}
            disabled={pending}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {t.complete}
          </button>
        )}
      </div>
    </div>
  );
}
