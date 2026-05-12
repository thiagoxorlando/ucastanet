"use client";

import { useState, useRef, useEffect } from "react";
import { useT } from "@/lib/LanguageContext";
import { LANG_LABELS, LANGS, type Lang } from "@/lib/i18n/index";

type Variant = "dark" | "light";

export default function LanguageSelector({ variant = "dark" }: { variant?: Variant }) {
  const { lang, setLang } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isDark = variant === "dark";

  const btnClass = isDark
    ? "flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[12px] font-semibold text-white/50 hover:bg-white/8 hover:text-white transition-colors cursor-pointer"
    : "flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[12px] font-semibold text-[#647B7B] hover:bg-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer";

  const menuClass = isDark
    ? "absolute right-0 top-full mt-1.5 z-50 min-w-[120px] rounded-2xl border border-white/10 bg-[#0A1A1C] shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden"
    : "absolute right-0 top-full mt-1.5 z-50 min-w-[120px] rounded-2xl border border-zinc-200 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden";

  function itemClass(active: boolean) {
    if (isDark) {
      return `flex items-center gap-2 w-full px-4 py-2.5 text-[13px] font-medium text-left transition-colors cursor-pointer ${active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/8 hover:text-white"}`;
    }
    return `flex items-center gap-2 w-full px-4 py-2.5 text-[13px] font-medium text-left transition-colors cursor-pointer ${active ? "bg-zinc-100 text-zinc-900" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`;
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={btnClass}
        aria-label="Select language"
      >
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
        <span>{lang === "pt-BR" ? "PT" : "EN"}</span>
        <svg className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className={menuClass}>
          {LANGS.map((l: Lang) => (
            <button
              key={l}
              type="button"
              onClick={() => { setLang(l); setOpen(false); }}
              className={itemClass(lang === l)}
            >
              <span className="text-[11px] font-black tracking-wide opacity-70">
                {l === "pt-BR" ? "PT" : "EN"}
              </span>
              <span>{LANG_LABELS[l]}</span>
              {lang === l && (
                <svg className="w-3.5 h-3.5 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
