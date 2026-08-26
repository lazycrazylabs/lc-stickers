import { BatchForm } from "@/components/batch-form";
import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/tenant";

// This route reads live session/product/staff data with no static shell,
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
          stickers.
        </p>
      </main>
    );
  }

  const [{ data: products }, { data: staff }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, default_shelf_life_value, default_shelf_life_unit")
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .order("name"),
    supabase
      .from("staff")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .order("name"),
  ]);

  return (
    <main className="min-h-screen flex justify-center p-4 bg-background print:min-h-0 print:p-0">
      <div className="w-full max-w-sm mt-4 mb-8 print:m-0 print:max-w-none print:w-auto">
        <BatchForm products={products ?? []} staff={staff ?? []} />
      </div>
    </main>
  );
}
