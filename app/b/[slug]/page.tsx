import { formatDateTime } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

// This route reads live data with no static shell, so it can't satisfy
// Cache Components' prerender requirement — opt out of that validation.
// (The per-request behavior itself comes from reading fresh data with no
// `"use cache"`, not from this export — see instant.md in the Next.js docs.)
export const instant = false;

export default async function PublicBatchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = createAdminClient();
  const { data: batch } = await supabase
    .from("batches")
    .select(
      "made_at, expires_at, weight_kg, notes, products(name, storage_temp_ranges(label)), staff(name), tenants(name)",
    )
    .eq("qr_slug", slug)
    .single();

  if (!batch) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <p className="text-center text-muted-foreground">
          Sticker not found. This QR code may be invalid or the sticker was
          removed.
        </p>
      </main>
    );
  }

  const product = Array.isArray(batch.products)
    ? batch.products[0]
    : batch.products;
  const storageTempRange = Array.isArray(product?.storage_temp_ranges)
    ? product.storage_temp_ranges[0]
    : product?.storage_temp_ranges;
  const staff = Array.isArray(batch.staff) ? batch.staff[0] : batch.staff;
  const tenant = Array.isArray(batch.tenants)
    ? batch.tenants[0]
    : batch.tenants;

  return (
    <main className="min-h-screen flex items-start justify-center p-4 bg-background">
      <div className="w-full max-w-sm mt-8 rounded-xl border bg-card text-card-foreground shadow p-6 flex flex-col gap-5">
        <div>
          <p className="font-heading text-sm font-semibold uppercase tracking-wide text-primary">
            {tenant?.name}
          </p>
          <h1 className="text-2xl leading-tight">
            {product?.name ?? "Unnamed sticker"}
          </h1>
        </div>

        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Made</dt>
            <dd className="text-right font-mono font-medium">
              {formatDateTime(batch.made_at)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Best before</dt>
            <dd className="text-right font-mono font-medium">
              {formatDateTime(batch.expires_at)}
            </dd>
          </div>
          {storageTempRange?.label && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Storage</dt>
              <dd className="text-right font-medium">
                {storageTempRange.label}
              </dd>
            </div>
          )}
          {batch.weight_kg != null && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Weight</dt>
              <dd className="text-right font-mono font-medium">
                {batch.weight_kg} kg
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Made by</dt>
            <dd className="text-right font-medium">
              {staff?.name ?? "—"}
            </dd>
          </div>
        </dl>

        {batch.notes && (
          <div className="text-sm border-t pt-4">
            <p className="text-muted-foreground mb-1">Notes</p>
            <p>{batch.notes}</p>
          </div>
        )}
      </div>
    </main>
  );
}
