import { createClient } from "@supabase/supabase-js";
import { createBrowserClient, createServerClient as createSSRClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

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
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

/**
 * Server client factory — use in Server Components and Route Handlers.
 * Pass `{ useServiceRole: true }` only for trusted server-side admin operations.
 */
export function createServerClient(options?: { useServiceRole?: boolean }) {
  if (options?.useServiceRole) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local");
    }
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
}

/**
 * Middleware client — reads/writes cookies so the session is available in
 * Next.js middleware and SSR pages. Pass the request/response pair from
 * your middleware function.
 */
export function createMiddlewareClient(req: NextRequest, res: NextResponse) {
  return createSSRClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options)
        );
      },
    },
  });
}
