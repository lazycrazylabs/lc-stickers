"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/tenant";

export type CreateStaffResult =
  | { success: true }
  | { success: false; error: string };

const ROLES = ["admin", "cook"] as const;

export async function createStaff(
  formData: FormData,
): Promise<CreateStaffResult> {
  const name = formData.get("name");
  const roleRaw = formData.get("role");

  if (typeof name !== "string" || !name) {
    return { success: false, error: "Please enter a name." };
  }

  if (
    typeof roleRaw !== "string" ||
    !ROLES.includes(roleRaw as (typeof ROLES)[number])
  ) {
    return { success: false, error: "Please choose a role." };
  }
  const role = roleRaw;

  try {
    const supabase = await createClient();
    const tenantId = await getTenantId(supabase);

    const { error } = await supabase.from("staff").insert({
      tenant_id: tenantId,
      name,
      role,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/staff");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to add cook.",
    };
  }
}

export type DeleteStaffResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteStaff(id: string): Promise<DeleteStaffResult> {
  try {
    const supabase = await createClient();

    // App-level safety checks, not RLS-enforced (a direct API call could
    // still bypass these) -- just guarding against an admin accidentally
    // locking themselves, or every admin, out via the UI.
    const { data: claims } = await supabase.auth.getClaims();
    const currentUserId = claims?.claims?.sub;

    const { data: target } = await supabase
      .from("staff")
      .select("role, auth_user_id")
      .eq("id", id)
      .single();

    if (target?.auth_user_id && target.auth_user_id === currentUserId) {
      return {
        success: false,
        error: "You can't delete your own staff record.",
      };
    }

    if (target?.role === "admin") {
      const { count: adminCount } = await supabase
        .from("staff")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");

      if ((adminCount ?? 0) <= 1) {
        return { success: false, error: "Can't delete the last admin." };
      }
    }

    // RLS only allows this for admins; a denied delete affects zero rows
    // rather than throwing, so that's how we detect "not allowed" here.
    const { error, count } = await supabase
      .from("staff")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) {
      // Postgres foreign_key_violation: batches.staff_id still references
      // this row (they've made stickers before) -- deleting them would
      // orphan that traceability record, so the database correctly
      // refuses. Give a clear reason instead of the raw constraint error.
      if (error.code === "23503") {
        return {
          success: false,
          error:
            "Can't delete this staff member — they're on record as making one or more stickers.",
        };
      }
      return { success: false, error: error.message };
    }
    if (!count) {
      return {
        success: false,
        error: "Only admins can delete staff.",
      };
    }

    revalidatePath("/staff");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete staff.",
    };
  }
}
