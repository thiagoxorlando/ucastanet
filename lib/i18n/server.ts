import { cookies } from "next/headers";
import { pt } from "@/lib/translations/pt";
import { en } from "@/lib/i18n/en";
import { resolveLang, LANG_COOKIE, type Lang } from "@/lib/i18n/index";

const ptDict = pt as Record<string, string>;
const enDict: Record<string, string> = { ...ptDict, ...en };

function buildDict(lang: Lang): Record<string, string> {
  return lang === "en" ? enDict : ptDict;
}

/** Read the current language from the request cookie — safe in Server Components. */
export async function getServerLang(): Promise<Lang> {
  const cookieStore = await cookies();
  return resolveLang(cookieStore.get(LANG_COOKIE)?.value);
}

/**
 * Server-side translate helper. Reads lang from the request cookie.
 * Returns a `t(key)` function bound to the resolved language.
 */
export async function getServerT(): Promise<(key: string) => string> {
  const lang = await getServerLang();
  const dict = buildDict(lang);
  return (key: string) => dict[key] ?? ptDict[key] ?? key;
}
