import { SupabaseClient } from "@supabase/supabase-js";

export type StaffRole = "admin" | "cook";

/**
 * The logged-in user's role, read via their linked `staff` row
 * (`staff.auth_user_id`, added in the role-based-access-control
 * migration). Returns null if there's no session, or no matching
 * `staff` row (e.g. an account created before that link existed).
 *
 * This is a UX nicety for showing/hiding admin-only actions -- the real
 * enforcement is the `is_admin()`-gated RLS policies, not this check.
 */
export async function getCurrentUserRole(
  supabase: SupabaseClient,
): Promise<StaffRole | null> {
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: staff } = await supabase
    .from("staff")
    .select("role")
    .eq("auth_user_id", userId)
    .single();

  return (staff?.role as StaffRole | undefined) ?? null;
}
