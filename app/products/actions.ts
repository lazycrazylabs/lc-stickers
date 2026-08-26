"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/tenant";

export type CreateProductResult =
  | { success: true }
  | { success: false; error: string };

const SHELF_LIFE_UNITS = ["minutes", "hours", "days"] as const;

export async function createProduct(
  formData: FormData,
): Promise<CreateProductResult> {
  const name = formData.get("name");
  const storageMethodId = formData.get("storageMethodId");
  const productTypeId = formData.get("productTypeId");
  const storageTempRangeId = formData.get("storageTempRangeId");
  const shelfLifeValueRaw = formData.get("defaultShelfLifeValue");
  const shelfLifeUnitRaw = formData.get("defaultShelfLifeUnit");

  if (
    typeof name !== "string" ||
    !name ||
    typeof storageMethodId !== "string" ||
    !storageMethodId ||
    typeof productTypeId !== "string" ||
    !productTypeId ||
    typeof storageTempRangeId !== "string" ||
    !storageTempRangeId
  ) {
    return { success: false, error: "Please fill in all required fields." };
  }

  const hasShelfLifeValue =
    typeof shelfLifeValueRaw === "string" && shelfLifeValueRaw !== "";

  if (
    hasShelfLifeValue &&
    (typeof shelfLifeUnitRaw !== "string" ||
      !SHELF_LIFE_UNITS.includes(
        shelfLifeUnitRaw as (typeof SHELF_LIFE_UNITS)[number],
      ))
  ) {
    return { success: false, error: "Please choose a shelf life unit." };
  }

  const defaultShelfLifeValue = hasShelfLifeValue
    ? Number(shelfLifeValueRaw)
    : null;
  const defaultShelfLifeUnit = hasShelfLifeValue ? shelfLifeUnitRaw : null;

  try {
    const supabase = await createClient();
    const tenantId = await getTenantId(supabase);

    const { error } = await supabase.from("products").insert({
      tenant_id: tenantId,
      name,
      storage_method_id: storageMethodId,
      product_type_id: productTypeId,
      storage_temp_range_id: storageTempRangeId,
      default_shelf_life_value: defaultShelfLifeValue,
      default_shelf_life_unit: defaultShelfLifeUnit,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/products");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create product.",
    };
  }
}

export type DeleteProductResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteProduct(id: string): Promise<DeleteProductResult> {
  try {
    const supabase = await createClient();
    // RLS only allows this for admins; a denied delete affects zero rows
    // rather than throwing, so that's how we detect "not allowed" here.
    const { error, count } = await supabase
      .from("products")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) {
      // Postgres foreign_key_violation: batches.product_id still
      // references this row (it's been used for one or more stickers) --
      // deleting it would orphan that traceability record, so the
      // database correctly refuses. Give a clear reason instead of the
      // raw constraint error.
      if (error.code === "23503") {
        return {
          success: false,
          error:
            "Can't delete this product — it's on record as used for one or more stickers.",
        };
      }
      return { success: false, error: error.message };
    }
    if (!count) {
      return {
        success: false,
        error: "Only admins can delete products.",
      };
    }

    revalidatePath("/products");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete product.",
    };
  }
}
