import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. " +
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
}

/**
 * Browser client — safe to use in Client Components.
 * Uses the anon key; all access is governed by Supabase Row Level Security (RLS).
 *
 * Singleton pattern: reuses the same instance across the module graph.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Server client factory — use in Server Components, Route Handlers, and Server Actions.
 *
 * By default uses the anon key (same RLS rules as the browser client).
 * Pass `{ useServiceRole: true }` only for trusted server-side admin operations
 * that must bypass RLS — never call this from client-side code.
 */
export function createServerClient(options?: { useServiceRole?: boolean }) {
  if (options?.useServiceRole) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local"
      );
    }
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
}
