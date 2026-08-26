import Link from "next/link";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DayDot } from "@/components/day-dot";
import {
  formatDateTime,
  formatTimeRemaining,
  getUrgencyStatus,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/tenant";
import { cn } from "@/lib/utils";

// This route reads live batch data with no static shell, so it can't
// satisfy Cache Components' prerender requirement — opt out of that
// validation. (The per-request behavior itself comes from reading
// cookies/fresh data with no `"use cache"`, not from this export.)
export const instant = false;

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export default async function ProtectedPage() {
  const supabase = await createClient();

  let tenantId: string;
  try {
    tenantId = await getTenantId(supabase);
  } catch {
    return (
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
        <Button asChild className="w-full h-16 text-xl font-bold rounded-xl">
          <Link href="/batches/new">New sticker</Link>
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          No staff configured yet — add a staff member before creating
          stickers.
        </p>
      </div>
    );
  }

  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 3_600_000);

  const [
    { data: expiringSoon, error: expiringError },
    { data: recentBatches, error: recentError },
  ] = await Promise.all([
    supabase
      .from("batches")
      .select(
        "qr_slug, made_at, expires_at, weight_kg, products(name), staff(name)",
      )
      .eq("tenant_id", tenantId)
      .gte("expires_at", now.toISOString())
      .lte("expires_at", in48h.toISOString())
      .order("expires_at", { ascending: true })
      .limit(5),
    supabase
      .from("batches")
      .select("qr_slug, made_at, expires_at, products(name), staff(name)")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (expiringError) {
    console.error("Failed to load expiring batches:", expiringError);
  }
  if (recentError) {
    console.error("Failed to load recent batches:", recentError);
  }

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col gap-6">
      <Button asChild className="w-full h-16 text-xl font-bold rounded-xl">
        <Link href="/batches/new">New sticker</Link>
      </Button>

      {expiringSoon && expiringSoon.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Expiring soon
          </h2>
          <ul className="flex flex-col gap-2">
            {expiringSoon.map((batch) => {
              const product = unwrap(batch.products);
              const staffMember = unwrap(batch.staff);
              const status = getUrgencyStatus(
                batch.made_at,
                batch.expires_at,
                now,
              );
              const isCritical = status === "critical";

              return (
                <li
                  key={batch.qr_slug}
                  className="rounded-lg border bg-card p-3 flex flex-col gap-1"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <DayDot status={status} />
                      <p className="font-medium truncate">
                        {product?.name ?? "Unnamed sticker"}
                      </p>
                    </span>
                    <p
                      className={cn(
                        "font-mono font-medium text-sm shrink-0",
                        isCritical ? "text-critical" : "text-soon",
                      )}
                    >
                      {formatTimeRemaining(batch.expires_at)}
                    </p>
                  </div>
                  <div className="flex justify-between gap-2 text-sm text-muted-foreground">
                    <span className="font-mono">
                      {batch.weight_kg != null
                        ? `${batch.weight_kg} kg`
                        : "—"}
                    </span>
                    <span>{staffMember?.name ?? "—"}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent stickers
          </h2>
          <Link
            href="/batches"
            className="text-sm text-primary hover:underline"
          >
            See all
          </Link>
        </div>

        {!recentBatches || recentBatches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No stickers yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recentBatches.map((batch) => {
              const product = unwrap(batch.products);
              const staffMember = unwrap(batch.staff);
              const status = getUrgencyStatus(
                batch.made_at,
                batch.expires_at,
                now,
              );

              return (
                <li
                  key={batch.qr_slug}
                  className="rounded-lg border bg-card flex items-stretch overflow-hidden"
                >
                  <Link
                    href={`/b/${batch.qr_slug}`}
                    className="flex-1 min-w-0 p-3 hover:bg-accent"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="flex items-center gap-2 min-w-0">
                        <DayDot status={status} />
                        <p className="font-medium truncate">
                          {product?.name ?? "Unnamed sticker"}
                        </p>
                      </span>
                      <p className="text-sm text-muted-foreground shrink-0">
                        {staffMember?.name ?? "—"}
                      </p>
                    </div>
                    <div className="flex justify-between gap-2 text-sm text-muted-foreground font-mono">
                      <span>Made {formatDateTime(batch.made_at)}</span>
                      <span>
                        Best before {formatDateTime(batch.expires_at)}
                      </span>
                    </div>
                  </Link>
                  <Link
                    href={`/batches/${batch.qr_slug}`}
                    aria-label="Reprint sticker"
                    className="flex items-center justify-center w-12 min-h-12 border-l shrink-0 hover:bg-accent hover:text-primary"
                  >
                    <Printer className="h-6 w-6" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
