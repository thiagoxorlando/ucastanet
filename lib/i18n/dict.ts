import { en } from "@/lib/i18n/en";
import { pt } from "@/lib/translations/pt";
import type { Lang } from "@/lib/i18n";

const ptDict = pt as Record<string, string>;
const enDict: Record<string, string> = { ...ptDict, ...en };

export function getDict(lang: Lang): Record<string, string> {
  return lang === "en" ? enDict : ptDict;
}

export function getText(lang: Lang, key: keyof typeof pt | string): string {
  const dict = getDict(lang);
  return dict[key] ?? ptDict[key] ?? String(key);
}
