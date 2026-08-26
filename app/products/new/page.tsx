import Link from "next/link";

import { ProductForm } from "@/components/product-form";
import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/tenant";

// This route reads live product data with no static shell, so it can't
// satisfy Cache Components' prerender requirement — opt out of that
// validation. (The per-request behavior itself comes from reading
// cookies/fresh data with no `"use cache"`, not from this export.)
export const instant = false;

export default async function NewProductPage() {
  const supabase = await createClient();

  let tenantId: string;
  try {
    tenantId = await getTenantId(supabase);
  } catch {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <p className="text-center text-sm text-muted-foreground">
          No staff configured yet — add a staff member before managing
          products.
        </p>
      </main>
    );
  }

  const tenantOrGlobal = `tenant_id.eq.${tenantId},tenant_id.is.null`;

  const [
    { data: storageMethods },
    { data: productTypes },
    { data: storageTempRanges },
  ] = await Promise.all([
    supabase
      .from("storage_methods")
      .select("id, name")
      .or(tenantOrGlobal)
      .order("name"),
    supabase
      .from("product_types")
      .select("id, name")
      .or(tenantOrGlobal)
      .order("name"),
    supabase
      .from("storage_temp_ranges")
      .select("id, label")
      .or(tenantOrGlobal)
      .order("label"),
  ]);

  return (
    <main className="min-h-screen flex justify-center p-4 bg-background">
      <div className="w-full max-w-sm mt-4 mb-8 flex flex-col gap-6">
        <div>
          <Link
            href="/products"
            className="text-sm text-muted-foreground hover:underline"
          >
            &larr; Back
          </Link>
          <h1 className="text-2xl mt-2">Add product</h1>
        </div>

        <ProductForm
          storageMethods={storageMethods ?? []}
          productTypes={productTypes ?? []}
          storageTempRanges={storageTempRanges ?? []}
        />
      </div>
    </main>
  );
}
