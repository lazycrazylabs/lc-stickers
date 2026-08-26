import Link from "next/link";

import { deleteProduct } from "@/app/products/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";
import { ProductFilters } from "@/components/product-filters";
import { SortLink } from "@/components/sort-link";
import { buildQueryString, readFilterParam } from "@/lib/url";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/role";
import { getTenantId } from "@/lib/tenant";

// This route reads live product data with no static shell, so it can't
// satisfy Cache Components' prerender requirement — opt out of that
// validation. (The per-request behavior itself comes from reading
// cookies/fresh data with no `"use cache"`, not from this export.)
export const instant = false;

function formatShelfLife(value: number | null, unit: string | null) {
  if (value == null || unit == null) return "—";
  return `${value}${unit === "minutes" ? "min" : unit === "hours" ? "h" : "d"}`;
}

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function countBy<T>(items: T[], key: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const storageMethodFilter = readFilterParam(params.storageMethodId);
  const productTypeFilter = readFilterParam(params.productTypeId);
  const sortDir = params.dir === "desc" ? "desc" : "asc";

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
    { data: products, error: productsError },
    { data: storageMethods },
    { data: productTypes },
    role,
  ] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, tenant_id, default_shelf_life_value, default_shelf_life_unit, storage_method_id, product_type_id, storage_methods(name), product_types(name), storage_temp_ranges(label)",
      )
      .or(tenantOrGlobal),
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
    getCurrentUserRole(supabase),
  ]);
  const isAdmin = role === "admin";

  if (productsError) {
    console.error("Failed to load products:", productsError);
  }

  const allProducts = products ?? [];

  // Facet counts reflect the full unfiltered set, so switching one filter
  // doesn't change what the *other* filter's counts mean.
  const storageMethodCounts = countBy(allProducts, (p) => p.storage_method_id);
  const productTypeCounts = countBy(allProducts, (p) => p.product_type_id);

  const filtered = allProducts.filter(
    (p) =>
      (!storageMethodFilter || p.storage_method_id === storageMethodFilter) &&
      (!productTypeFilter || p.product_type_id === productTypeFilter),
  );
  const sorted = [...filtered].sort(
    (a, b) => a.name.localeCompare(b.name) * (sortDir === "desc" ? -1 : 1),
  );

  const currentParams: Record<string, string | undefined> = {
    storageMethodId: storageMethodFilter,
    productTypeId: productTypeFilter,
    dir: params.dir === "desc" ? "desc" : undefined,
  };
  const nameSortHref = buildQueryString(currentParams, {
    dir: sortDir === "asc" ? "desc" : "asc",
  });

  return (
    <main className="min-h-screen flex justify-center p-4 bg-background">
      <div className="w-full max-w-3xl mt-4 mb-8 flex flex-col gap-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href="/protected"
              className="text-sm text-muted-foreground hover:underline"
            >
              &larr; Back
            </Link>
            <h1 className="text-2xl mt-2">Products</h1>
          </div>
          <Button asChild className="h-11 shrink-0">
            <Link href="/products/new">Add product</Link>
          </Button>
        </div>

        <ProductFilters
          storageMethods={(storageMethods ?? []).map((m) => ({
            id: m.id,
            label: m.name,
            count: storageMethodCounts.get(m.id) ?? 0,
          }))}
          productTypes={(productTypes ?? []).map((t) => ({
            id: t.id,
            label: t.name,
            count: productTypeCounts.get(t.id) ?? 0,
          }))}
        />

        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {allProducts.length === 0
              ? "No products yet."
              : "No products match the current filters."}
          </p>
        ) : (
          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="text-left px-3 py-2 whitespace-nowrap">
                    <SortLink href={nameSortHref} dir={sortDir}>
                      Name
                    </SortLink>
                  </th>
                  <th scope="col" className="text-left px-3 py-2 whitespace-nowrap">
                    Storage method
                  </th>
                  <th scope="col" className="text-left px-3 py-2 whitespace-nowrap">
                    Product type
                  </th>
                  <th scope="col" className="text-left px-3 py-2 whitespace-nowrap">
                    Storage temp
                  </th>
                  <th scope="col" className="text-left px-3 py-2 whitespace-nowrap">
                    Shelf life
                  </th>
                  <th scope="col" className="text-left px-3 py-2 whitespace-nowrap">
                    Scope
                  </th>
                  {isAdmin && (
                    <th scope="col" className="px-3 py-2 whitespace-nowrap">
                      <span className="sr-only">Delete</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sorted.map((product) => {
                  const storageMethod = unwrap(product.storage_methods);
                  const productType = unwrap(product.product_types);
                  const storageTempRange = unwrap(
                    product.storage_temp_ranges,
                  );

                  return (
                    <tr
                      key={product.id}
                      className="border-b last:border-b-0 hover:bg-accent"
                    >
                      <td className="px-3 py-2 font-medium">
                        {product.name}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        {storageMethod?.name ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        {productType?.name ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        {storageTempRange?.label ?? "—"}
                      </td>
                      <td className="px-3 py-2 font-mono whitespace-nowrap">
                        {formatShelfLife(
                          product.default_shelf_life_value,
                          product.default_shelf_life_unit,
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Badge
                          variant={product.tenant_id ? "secondary" : "outline"}
                        >
                          {product.tenant_id ? "Yours" : "Template"}
                        </Badge>
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-2 whitespace-nowrap">
                          <DeleteButton
                            label={`Delete ${product.name}`}
                            confirmMessage={`Delete "${product.name}"? This can't be undone.`}
                            onDelete={deleteProduct.bind(null, product.id)}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
