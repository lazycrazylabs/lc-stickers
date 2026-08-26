import Link from "next/link";
import { Printer } from "lucide-react";

import { BatchFilters } from "@/components/batch-filters";
import { DayDot } from "@/components/day-dot";
import {
  BATCH_LIST_STATUSES,
  type BatchListStatus,
  type UrgencyStatus,
  formatDateTime,
  getBatchListStatus,
} from "@/lib/format";
import { readFilterParam } from "@/lib/url";
import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/tenant";

// This route reads live batch data with no static shell, so it can't
// satisfy Cache Components' prerender requirement — opt out of that
// validation. (The per-request behavior itself comes from reading
// cookies/fresh data with no `"use cache"`, not from this export.)
export const instant = false;

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

const STATUS_LABEL: Record<BatchListStatus, string> = {
  expired: "Expired",
  expiring_soon: "Expiring soon",
  fresh: "Fresh",
};

// Reuses the day-dot's existing urgency colors rather than inventing new
// ones — expired maps to the same red as "about to expire" (critical).
const DOT_BY_STATUS: Record<BatchListStatus, UrgencyStatus> = {
  expired: "critical",
  expiring_soon: "soon",
  fresh: "fresh",
};

export default async function BatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const rawStatus = readFilterParam(params.status);
  const statusFilter = BATCH_LIST_STATUSES.includes(
    rawStatus as BatchListStatus,
  )
    ? (rawStatus as BatchListStatus)
    : undefined;
  const productFilter = readFilterParam(params.productId);

  const supabase = await createClient();

  let tenantId: string;
  try {
    tenantId = await getTenantId(supabase);
  } catch {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <p className="text-center text-sm text-muted-foreground">
          No staff configured yet — add a staff member before creating
          stickers.
        </p>
      </main>
    );
  }

  const [{ data: batches, error }, { data: products }] = await Promise.all([
    supabase
      .from("batches")
      .select(
        "qr_slug, made_at, expires_at, weight_kg, product_id, products(name), staff(name)",
      )
      .eq("tenant_id", tenantId)
      .order("made_at", { ascending: false }),
    supabase
      .from("products")
      .select("id, name")
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .order("name"),
  ]);

  if (error) {
    console.error("Failed to load batches:", error);
  }

  const now = new Date();
  const allBatches = batches ?? [];

  // Facet counts reflect the full unfiltered set, so switching one filter
  // doesn't change what the *other* filter's counts mean.
  const statusCounts = countBy(allBatches, (b) =>
    getBatchListStatus(b.expires_at, now),
  );
  const productCounts = countBy(allBatches, (b) => b.product_id);

  const filtered = allBatches.filter(
    (b) =>
      (!statusFilter ||
        getBatchListStatus(b.expires_at, now) === statusFilter) &&
      (!productFilter || b.product_id === productFilter),
  );

  return (
    <main className="min-h-screen flex justify-center p-4 bg-background">
      <div className="w-full max-w-3xl mt-4 mb-8 flex flex-col gap-6">
        <div>
          <Link
            href="/protected"
            className="text-sm text-muted-foreground hover:underline"
          >
            &larr; Back
          </Link>
          <h1 className="text-2xl mt-2">Stickers</h1>
        </div>

        <BatchFilters
          statuses={BATCH_LIST_STATUSES.map((status) => ({
            id: status,
            label: STATUS_LABEL[status],
            count: statusCounts.get(status) ?? 0,
          }))}
          products={(products ?? []).map((product) => ({
            id: product.id,
            label: product.name,
            count: productCounts.get(product.id) ?? 0,
          }))}
        />

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {allBatches.length === 0
              ? "No stickers yet."
              : "No stickers match the current filters."}
          </p>
        ) : (
          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="text-left px-3 py-2 whitespace-nowrap">
                    Product
                  </th>
                  <th scope="col" className="text-left px-3 py-2 whitespace-nowrap">
                    Made
                  </th>
                  <th scope="col" className="text-left px-3 py-2 whitespace-nowrap">
                    Best before
                  </th>
                  <th scope="col" className="text-left px-3 py-2 whitespace-nowrap">
                    Staff
                  </th>
                  <th scope="col" className="text-left px-3 py-2 whitespace-nowrap">
                    Weight
                  </th>
                  <th scope="col" className="px-3 py-2 whitespace-nowrap">
                    <span className="sr-only">Reprint</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((batch) => {
                  const product = unwrap(batch.products);
                  const staffMember = unwrap(batch.staff);
                  const status = getBatchListStatus(batch.expires_at, now);

                  return (
                    <tr
                      key={batch.qr_slug}
                      className="border-b last:border-b-0 hover:bg-accent"
                    >
                      <td className="px-3 py-2 font-medium">
                        <Link
                          href={`/b/${batch.qr_slug}`}
                          className="flex items-center gap-2 hover:underline"
                        >
                          <DayDot status={DOT_BY_STATUS[status]} />
                          {product?.name ?? "Unnamed sticker"}
                        </Link>
                      </td>
                      <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">
                        {formatDateTime(batch.made_at)}
                      </td>
                      <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">
                        {formatDateTime(batch.expires_at)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        {staffMember?.name ?? "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">
                        {batch.weight_kg != null
                          ? `${batch.weight_kg} kg`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Link
                          href={`/batches/${batch.qr_slug}`}
                          aria-label="Reprint sticker"
                          className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent hover:text-primary"
                        >
                          <Printer className="h-4 w-4" />
                        </Link>
                      </td>
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
