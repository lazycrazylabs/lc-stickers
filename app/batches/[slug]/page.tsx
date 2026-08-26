import Link from "next/link";
import QRCode from "qrcode";

import { Button } from "@/components/ui/button";
import { StickerResult } from "@/components/sticker-result";
import { createClient } from "@/lib/supabase/server";
import { getTenantId, getTenantName } from "@/lib/tenant";

// This route reads live batch data with no static shell, so it can't
// satisfy Cache Components' prerender requirement — opt out of that
// validation. (The per-request behavior itself comes from reading
// cookies/fresh data with no `"use cache"`, not from this export.)
export const instant = false;

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export default async function ReprintBatchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  let tenantId: string;
  try {
    tenantId = await getTenantId(supabase);
  } catch {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <p className="text-center text-sm text-muted-foreground">
          No staff configured yet.
        </p>
      </main>
    );
  }

  const { data: batch } = await supabase
    .from("batches")
    .select(
      "qr_slug, made_at, expires_at, weight_kg, products(name, storage_temp_ranges(label)), staff(name)",
    )
    .eq("qr_slug", slug)
    .eq("tenant_id", tenantId)
    .single();

  if (!batch) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <p className="text-center text-sm text-muted-foreground">
          Sticker not found.
        </p>
      </main>
    );
  }

  const product = unwrap(batch.products);
  const storageTempRange = unwrap(product?.storage_temp_ranges);
  const staff = unwrap(batch.staff);
  const tenantName = await getTenantName(tenantId);

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ).replace(/\/+$/, "");
  const publicUrl = `${siteUrl}/b/${batch.qr_slug}`;
  const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, {
    width: 320,
    margin: 1,
  });

  return (
    <main className="min-h-screen flex justify-center p-4 bg-background print:min-h-0 print:p-0">
      <div className="w-full max-w-sm mt-4 mb-8 print:m-0 print:max-w-none print:w-auto">
        <StickerResult
          title="Reprint sticker"
          productName={product?.name ?? "Unnamed sticker"}
          storageTempRangeLabel={storageTempRange?.label ?? ""}
          tenantName={tenantName ?? ""}
          madeAt={batch.made_at}
          expiresAt={batch.expires_at}
          weightKg={batch.weight_kg != null ? String(batch.weight_kg) : ""}
          staffName={staff?.name ?? ""}
          qrCodeDataUrl={qrCodeDataUrl}
          publicUrl={publicUrl}
          secondaryAction={
            <Button
              asChild
              variant="outline"
              className="w-full h-12 text-base"
            >
              <Link href="/protected">Back to dashboard</Link>
            </Button>
          }
        />
      </div>
    </main>
  );
}
