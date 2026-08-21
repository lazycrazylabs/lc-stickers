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
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Category = {
  id: string;
  name: string;
  default_shelf_life_days: number | null;
};

type Staff = {
  id: string;
  name: string;
};

function toDatetimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function computeExpiresAt(madeAtLocal: string, days: number | null) {
  if (!madeAtLocal || days == null) return "";
  const made = new Date(madeAtLocal);
  if (Number.isNaN(made.getTime())) return "";
  made.setDate(made.getDate() + days);
  return toDatetimeLocal(made);
}

export function BatchForm({
  categories,
  staff,
}: {
  categories: Category[];
  staff: Staff[];
}) {
  const firstCategory = categories[0];
  const initialMadeAt = toDatetimeLocal(new Date());

  const [categoryId, setCategoryId] = useState(firstCategory?.id ?? "");
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const [madeAt, setMadeAt] = useState(initialMadeAt);
  const [expiresAt, setExpiresAt] = useState(
    computeExpiresAt(
      initialMadeAt,
      firstCategory?.default_shelf_life_days ?? null,
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

  function handleCategoryChange(newCategoryId: string) {
    setCategoryId(newCategoryId);
    const category = categories.find((c) => c.id === newCategoryId);
    setExpiresAt(
      computeExpiresAt(madeAt, category?.default_shelf_life_days ?? null),
    );
    setExpiresManuallyEdited(false);
  }

  function handleMadeAtChange(newMadeAt: string) {
    setMadeAt(newMadeAt);
    if (!expiresManuallyEdited) {
      const category = categories.find((c) => c.id === categoryId);
      setExpiresAt(
        computeExpiresAt(newMadeAt, category?.default_shelf_life_days ?? null),
      );
    }
  }

  function resetForm() {
    const now = toDatetimeLocal(new Date());
    setCategoryId(firstCategory?.id ?? "");
    setStaffId(staff[0]?.id ?? "");
    setMadeAt(now);
    setExpiresAt(
      computeExpiresAt(now, firstCategory?.default_shelf_life_days ?? null),
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
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Batch created</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.qrCodeDataUrl}
            alt={`QR code linking to ${result.publicUrl}`}
            className="w-64 h-64"
          />
          <div className="text-center">
            <p className="font-semibold text-lg">{result.categoryName}</p>
            {selectedStaff && (
              <p className="text-sm text-muted-foreground">
                Made by {selectedStaff.name}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3 w-full">
            <Button
              type="button"
              className="w-full h-12 text-base"
              onClick={() => window.print()}
            >
              Print sticker
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 text-base"
              onClick={resetForm}
            >
              Create another batch
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">New batch</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid gap-2">
            <Label htmlFor="categoryId">Category</Label>
            <Select
              id="categoryId"
              name="categoryId"
              required
              value={categoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              {categories.length === 0 && (
                <option value="">No categories available</option>
              )}
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="staffId">Staff</Label>
            <Select
              id="staffId"
              name="staffId"
              required
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
            >
              {staff.length === 0 && (
                <option value="">No staff available</option>
              )}
              {staff.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
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

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button
            type="submit"
            className="w-full h-12 text-base"
            disabled={
              isSubmitting || categories.length === 0 || staff.length === 0
            }
          >
            {isSubmitting ? "Creating batch..." : "Create batch & print sticker"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
