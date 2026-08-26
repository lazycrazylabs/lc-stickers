"use server";

import QRCode from "qrcode";

import { createClient } from "@/lib/supabase/server";
import { getTenantId, getTenantName } from "@/lib/tenant";

export type CreateBatchResult =
  | {
      success: true;
      publicUrl: string;
      qrCodeDataUrl: string;
      productName: string;
      storageTempRangeLabel: string;
      tenantName: string;
    }
  | { success: false; error: string };

export async function createBatch(
  formData: FormData,
): Promise<CreateBatchResult> {
  const productId = formData.get("productId");
  const staffId = formData.get("staffId");
  const madeAt = formData.get("madeAt");
  const expiresAt = formData.get("expiresAt");
  const weightKgRaw = formData.get("weightKg");
  const notesRaw = formData.get("notes");

  if (
    typeof productId !== "string" ||
    !productId ||
    typeof staffId !== "string" ||
    !staffId ||
    typeof madeAt !== "string" ||
    !madeAt ||
    typeof expiresAt !== "string" ||
    !expiresAt
  ) {
    return { success: false, error: "Please fill in all required fields." };
  }

  const madeAtDate = new Date(madeAt);
  const expiresAtDate = new Date(expiresAt);
  if (Number.isNaN(madeAtDate.getTime()) || Number.isNaN(expiresAtDate.getTime())) {
    return { success: false, error: "Please enter valid dates." };
  }

  const weightKg =
    typeof weightKgRaw === "string" && weightKgRaw !== ""
      ? Number(weightKgRaw)
      : null;
  const notes =
    typeof notesRaw === "string" && notesRaw !== "" ? notesRaw : null;

  try {
    const supabase = await createClient();
    const tenantId = await getTenantId(supabase);

    const { data: batch, error } = await supabase
      .from("batches")
      .insert({
        tenant_id: tenantId,
        product_id: productId,
        staff_id: staffId,
        made_at: madeAtDate.toISOString(),
        expires_at: expiresAtDate.toISOString(),
        weight_kg: weightKg,
        notes,
      })
      .select("qr_slug, products(name, storage_temp_ranges(label))")
      .single();

    if (error || !batch) {
      return {
        success: false,
        error: error?.message ?? "Failed to create sticker.",
      };
    }

    const product = Array.isArray(batch.products)
      ? batch.products[0]
      : batch.products;
    const storageTempRange = Array.isArray(product?.storage_temp_ranges)
      ? product.storage_temp_ranges[0]
      : product?.storage_temp_ranges;

    const tenantName = await getTenantName(tenantId);

    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
    ).replace(/\/+$/, "");
    const publicUrl = `${siteUrl}/b/${batch.qr_slug}`;

    const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 320,
      margin: 1,
    });

    return {
      success: true,
      publicUrl,
      qrCodeDataUrl,
      productName: product?.name ?? "",
      storageTempRangeLabel: storageTempRange?.label ?? "",
      tenantName: tenantName ?? "",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create sticker.",
    };
  }
}
