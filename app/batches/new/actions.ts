"use server";

import { headers } from "next/headers";
import QRCode from "qrcode";

import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/tenant";

export type CreateBatchResult =
  | {
      success: true;
      publicUrl: string;
      qrCodeDataUrl: string;
      categoryName: string;
    }
  | { success: false; error: string };

export async function createBatch(
  formData: FormData,
): Promise<CreateBatchResult> {
  const categoryId = formData.get("categoryId");
  const staffId = formData.get("staffId");
  const madeAt = formData.get("madeAt");
  const expiresAt = formData.get("expiresAt");
  const weightKgRaw = formData.get("weightKg");
  const notesRaw = formData.get("notes");

  if (
    typeof categoryId !== "string" ||
    !categoryId ||
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
        category_id: categoryId,
        staff_id: staffId,
        made_at: madeAtDate.toISOString(),
        expires_at: expiresAtDate.toISOString(),
        weight_kg: weightKg,
        notes,
      })
      .select("qr_slug, categories(name)")
      .single();

    if (error || !batch) {
      return {
        success: false,
        error: error?.message ?? "Failed to create batch.",
      };
    }

    const category = Array.isArray(batch.categories)
      ? batch.categories[0]
      : batch.categories;

    const headersList = await headers();
    const host = headersList.get("host");
    const protocol =
      headersList.get("x-forwarded-proto") ??
      (process.env.NODE_ENV === "development" ? "http" : "https");
    const publicUrl = `${protocol}://${host}/b/${batch.qr_slug}`;

    const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 320,
      margin: 1,
    });

    return {
      success: true,
      publicUrl,
      qrCodeDataUrl,
      categoryName: category?.name ?? "",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create batch.",
    };
  }
}
