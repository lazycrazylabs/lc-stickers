import { BatchForm } from "@/components/batch-form";
import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/tenant";

// This route reads live session/category/staff data with no static shell,
// so it can't satisfy Cache Components' prerender requirement — opt out
// of that validation. (The per-request behavior itself comes from reading
// cookies/fresh data with no `"use cache"`, not from this export.)
export const instant = false;

export default async function NewBatchPage() {
  const supabase = await createClient();

  let tenantId: string;
  try {
    tenantId = await getTenantId(supabase);
  } catch {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <p className="text-center text-muted-foreground">
          No staff configured yet — add a staff member before creating
          batches.
        </p>
      </main>
    );
  }

  const [{ data: categories }, { data: staff }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, default_shelf_life_days")
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .order("name"),
    supabase
      .from("staff")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .order("name"),
  ]);

  return (
    <main className="min-h-screen flex justify-center p-4 bg-background">
      <div className="w-full max-w-sm mt-4 mb-8">
        <BatchForm categories={categories ?? []} staff={staff ?? []} />
      </div>
    </main>
  );
}
