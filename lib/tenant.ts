import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Phase 1 is single-tenant: there is exactly one row in `tenants`.
 * This will need to change once Phase 2 introduces multiple restaurants
 * and a way to know which tenant the logged-in staff belongs to.
 *
 * This reads `tenant_id` off `staff` rather than querying `tenants`
 * directly: as of 2026-08-21, `tenants` has no RLS SELECT policy for the
 * `authenticated` role (unlike categories/staff/batches), so it returns
 * zero rows for a logged-in user even though CLAUDE.md documents
 * `authenticated` as having full access to every table. `staff` is
 * readable and every row carries `tenant_id`, so it works as a stand-in
 * until that policy is added.
 */
export async function getTenantId(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase
    .from("staff")
    .select("tenant_id")
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error("No tenant found.");
  }

  return data.tenant_id;
}
