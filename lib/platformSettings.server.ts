import { createServerClient } from "@/lib/supabase";

export type PlatformSettingValue = string | number | boolean | null;

export async function getPlatformSetting<T extends PlatformSettingValue>(
  key: string,
  fallback: T,
): Promise<T> {
  try {
    const supabase = createServerClient({ useServiceRole: true });
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", key)
      .single();
    if (data == null) return fallback;
    return data.value as T;
  } catch {
    return fallback;
  }
}

export async function getPlatformSettings(keys: string[]): Promise<Record<string, PlatformSettingValue>> {
  try {
    const supabase = createServerClient({ useServiceRole: true });
    const { data } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", keys);
    const result: Record<string, PlatformSettingValue> = {};
    for (const row of data ?? []) {
      result[row.key as string] = row.value as PlatformSettingValue;
    }
    return result;
  } catch {
    return {};
  }
}

export async function getAllPlatformSettings(): Promise<Record<string, PlatformSettingValue>> {
  try {
    const supabase = createServerClient({ useServiceRole: true });
    const { data } = await supabase
      .from("platform_settings")
      .select("key, value")
      .order("key");
    const result: Record<string, PlatformSettingValue> = {};
    for (const row of data ?? []) {
      result[row.key as string] = row.value as PlatformSettingValue;
    }
    return result;
  } catch {
    return {};
  }
}
