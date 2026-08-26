"use client";

import { useState } from "react";

import { createBatch, type CreateBatchResult } from "@/app/batches/new/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StickerResult } from "@/components/sticker-result";
import { Textarea } from "@/components/ui/textarea";

type ShelfLifeUnit = "minutes" | "hours" | "days";

type Product = {
  id: string;
  name: string;
  default_shelf_life_value: number | null;
  default_shelf_life_unit: ShelfLifeUnit | null;
};

type Staff = {
  id: string;
  name: string;
};

function toDatetimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function computeExpiresAt(
  madeAtLocal: string,
  value: number | null,
  unit: ShelfLifeUnit | null,
) {
  if (!madeAtLocal || value == null || unit == null) return "";
  const made = new Date(madeAtLocal);
  if (Number.isNaN(made.getTime())) return "";
  if (unit === "minutes") made.setMinutes(made.getMinutes() + value);
  else if (unit === "hours") made.setHours(made.getHours() + value);
  else made.setDate(made.getDate() + value);
  return toDatetimeLocal(made);
}

export function BatchForm({
  products,
  staff,
}: {
  products: Product[];
  staff: Staff[];
}) {
  const firstProduct = products[0];
  const initialMadeAt = toDatetimeLocal(new Date());

  const [productId, setProductId] = useState(firstProduct?.id ?? "");
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const [madeAt, setMadeAt] = useState(initialMadeAt);
  const [expiresAt, setExpiresAt] = useState(
    computeExpiresAt(
      initialMadeAt,
      firstProduct?.default_shelf_life_value ?? null,
      firstProduct?.default_shelf_life_unit ?? null,
    ),
  );
  const [expiresManuallyEdited, setExpiresManuallyEdited] = useState(false);
  const [weightKg, setWeightKg] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<
    Extract<CreateBatchResult, { success: true }> | null
  >(null);

  function handleProductChange(newProductId: string) {
    setProductId(newProductId);
    const product = products.find((p) => p.id === newProductId);
    setExpiresAt(
      computeExpiresAt(
        madeAt,
        product?.default_shelf_life_value ?? null,
        product?.default_shelf_life_unit ?? null,
      ),
    );
    setExpiresManuallyEdited(false);
  }

  function handleMadeAtChange(newMadeAt: string) {
    setMadeAt(newMadeAt);
    if (!expiresManuallyEdited) {
      const product = products.find((p) => p.id === productId);
      setExpiresAt(
        computeExpiresAt(
          newMadeAt,
          product?.default_shelf_life_value ?? null,
          product?.default_shelf_life_unit ?? null,
        ),
      );
    }
  }

  function resetForm() {
    const now = toDatetimeLocal(new Date());
    setProductId(firstProduct?.id ?? "");
    setStaffId(staff[0]?.id ?? "");
    setMadeAt(now);
    setExpiresAt(
      computeExpiresAt(
        now,
        firstProduct?.default_shelf_life_value ?? null,
        firstProduct?.default_shelf_life_unit ?? null,
      ),
    );
    setExpiresManuallyEdited(false);
    setWeightKg("");
    setNotes("");
    setError(null);
    setResult(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const res = await createBatch(formData);
    setIsSubmitting(false);
    if (res.success) {
      setResult(res);
    } else {
      setError(res.error);
    }
  }

  if (result) {
    const selectedStaff = staff.find((s) => s.id === staffId);
    return (
      <StickerResult
        title="Sticker created"
        productName={result.productName}
        storageTempRangeLabel={result.storageTempRangeLabel}
        tenantName={result.tenantName}
        madeAt={madeAt}
        expiresAt={expiresAt}
        weightKg={weightKg}
        staffName={selectedStaff?.name ?? ""}
        qrCodeDataUrl={result.qrCodeDataUrl}
        publicUrl={result.publicUrl}
        secondaryAction={
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 text-base"
            onClick={resetForm}
          >
            Create another sticker
          </Button>
        }
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">New sticker</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid gap-2">
            <Label htmlFor="productId">Product</Label>
            <Select
              name="productId"
              value={productId}
              onValueChange={handleProductChange}
              disabled={products.length === 0}
            >
              <SelectTrigger id="productId" className="h-11 w-full">
                <SelectValue placeholder="No products available" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="staffId">Staff</Label>
            <Select
              name="staffId"
              value={staffId}
              onValueChange={setStaffId}
              disabled={staff.length === 0}
            >
              <SelectTrigger id="staffId" className="h-11 w-full">
                <SelectValue placeholder="No staff available" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="weightKg">Weight (kg)</Label>
            <Input
              id="weightKg"
              name="weightKg"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              className="h-11"
              placeholder="Optional"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Optional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="madeAt">Made at</Label>
            <Input
              id="madeAt"
              name="madeAt"
              type="datetime-local"
              required
              className="h-11"
              value={madeAt}
              onChange={(e) => handleMadeAtChange(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="expiresAt">Best before</Label>
            <Input
              id="expiresAt"
              name="expiresAt"
              type="datetime-local"
              required
              className="h-11"
              value={expiresAt}
              onChange={(e) => {
                setExpiresAt(e.target.value);
                setExpiresManuallyEdited(true);
              }}
            />
          </div>

          {error && <p className="text-sm text-critical">{error}</p>}

          <Button
            type="submit"
            className="w-full h-12 text-base"
            disabled={
              isSubmitting || products.length === 0 || staff.length === 0
            }
          >
            {isSubmitting ? "Creating sticker..." : "Create sticker"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
