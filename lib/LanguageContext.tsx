"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { pt } from "@/lib/translations/pt";
import { en } from "@/lib/i18n/en";
import {
  DEFAULT_LANG,
  LANG_COOKIE,
  LANG_STORAGE_KEY,
  resolveLang,
  type Lang,
} from "@/lib/i18n/index";

// ── Types ──────────────────────────────────────────────────────────────────────

export type { Lang };
type TranslationKey = keyof typeof pt;

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

// ── Dict helpers ───────────────────────────────────────────────────────────────

const ptDict = pt as Record<string, string>;
const enDict: Record<string, string> = { ...ptDict, ...en };

function buildDict(lang: Lang): Record<string, string> {
  return lang === "en" ? enDict : ptDict;
}

function makeTranslate(lang: Lang) {
  const dict = buildDict(lang);
  return (key: TranslationKey): string => dict[key] ?? ptDict[key] ?? key;
}

// ── Read initial lang from localStorage / cookie (client-side) ────────────────

function readStoredLang(): Lang {
  if (typeof window === "undefined") return DEFAULT_LANG;
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored) return resolveLang(stored);
    // Fallback: read cookie
    const match = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`));
    if (match) return resolveLang(decodeURIComponent(match[1]));
  } catch {}
  return DEFAULT_LANG;
}

function persistLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = lang;
  } catch {}
}

// ── Context ────────────────────────────────────────────────────────────────────

const LanguageContext = createContext<LanguageContextValue>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: makeTranslate(DEFAULT_LANG),
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  // Hydrate from localStorage on mount (avoids SSR mismatch)
  useEffect(() => {
    const stored = readStoredLang();
    if (stored !== DEFAULT_LANG) {
      setLangState(stored);
      document.documentElement.lang = stored;
    } else {
      document.documentElement.lang = DEFAULT_LANG;
    }
  }, []);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    persistLang(newLang);
    // Fire-and-forget: sync to profile if logged in
    void fetch("/api/profile/language", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language_preference: newLang }),
    }).catch(() => undefined);
  }, []);

  const t = useCallback(makeTranslate(lang), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useT() {
  return useContext(LanguageContext);
}
