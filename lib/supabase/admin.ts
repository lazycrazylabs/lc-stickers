import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only client using the secret key. Never import this from a
 * Client Component — the key must not reach the browser. Used to read
 * data for public pages (e.g. /b/[slug]) without exposing tables to the
 * `anon` role, per the RLS conventions in CLAUDE.md.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
