"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
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

// ── Persist helpers (client-only) ─────────────────────────────────────────────

function readStoredLang(): Lang {
  if (typeof window === "undefined") return DEFAULT_LANG;
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored) return resolveLang(stored);
    const match = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`));
    if (match) return resolveLang(decodeURIComponent(match[1]));
  } catch { /* ignore */ }
  return DEFAULT_LANG;
}

function persistLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = lang;
  } catch { /* ignore */ }
}

// ── Context ────────────────────────────────────────────────────────────────────

const LanguageContext = createContext<LanguageContextValue>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: makeTranslate(DEFAULT_LANG),
});

type LanguageProviderProps = {
  children: ReactNode;
  /**
   * Server-resolved initial language from the request cookie.
   * When provided the provider starts with the correct language immediately,
   * avoiding any SSR→client hydration flash.
   */
  initialLang?: Lang;
};

export function LanguageProvider({ children, initialLang }: LanguageProviderProps) {
  const router = useRouter();

  // Start with the server-resolved lang (from cookie) so the first paint is
  // already correct. Falls back to reading localStorage if no server prop.
  const [lang, setLangState] = useState<Lang>(() => initialLang ?? DEFAULT_LANG);

  // On mount: reconcile with localStorage (covers direct browser visits without
  // SSR context, or legacy sessions without the initialLang prop).
  useEffect(() => {
    const stored = readStoredLang();
    const resolved = initialLang ?? stored;
    if (resolved !== lang) setLangState(resolved);
    document.documentElement.lang = resolved;
    // Ensure localStorage and cookie are always in sync.
    persistLang(resolved);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On mount: silently sync from the user's profile preference stored in the DB.
  // This keeps cross-device preference consistent (e.g. changed on mobile, shown
  // correctly on desktop without re-login).
  useEffect(() => {
    fetch("/api/profile/language")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { language_preference?: string } | null) => {
        if (!data?.language_preference) return;
        const profileLang = resolveLang(data.language_preference);
        if (profileLang !== lang) {
          setLangState(profileLang);
          persistLang(profileLang);
          // No router.refresh() here — the profile sync is a silent correction;
          // it takes full effect on the next navigation.
        }
      })
      .catch(() => undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLang = useCallback(
    (newLang: Lang) => {
      setLangState(newLang);
      persistLang(newLang);
      // Re-render Server Components so page content translates immediately.
      // Client components re-render via React state; server components re-fetch
      // from the server which reads the updated lang cookie.
      router.refresh();
      // Fire-and-forget: save to profile for cross-device persistence.
      void fetch("/api/profile/language", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language_preference: newLang }),
      }).catch(() => undefined);
    },
    [router],
  );

  const t = useMemo(() => makeTranslate(lang), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useT() {
  return useContext(LanguageContext);
}
