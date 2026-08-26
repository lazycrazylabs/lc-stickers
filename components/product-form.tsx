"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createProduct } from "@/app/products/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = {
  id: string;
  name: string;
};

type LabeledOption = {
  id: string;
  label: string;
};

type ShelfLifeUnit = "minutes" | "hours" | "days";

export function ProductForm({
  storageMethods,
  productTypes,
  storageTempRanges,
}: {
  storageMethods: Option[];
  productTypes: Option[];
  storageTempRanges: LabeledOption[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [storageMethodId, setStorageMethodId] = useState(
    storageMethods[0]?.id ?? "",
  );
  const [productTypeId, setProductTypeId] = useState(productTypes[0]?.id ?? "");
  const [storageTempRangeId, setStorageTempRangeId] = useState(
    storageTempRanges[0]?.id ?? "",
  );
  const [defaultShelfLifeUnit, setDefaultShelfLifeUnit] =
    useState<ShelfLifeUnit>("days");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const res = await createProduct(formData);
    setIsSubmitting(false);
    if (res.success) {
      router.push("/products");
    } else {
      setError(res.error);
    }
  }

  const canSubmit =
    storageMethods.length > 0 &&
    productTypes.length > 0 &&
    storageTempRanges.length > 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required className="h-11" />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="storageMethodId">Storage method</Label>
        <Select
          name="storageMethodId"
          value={storageMethodId}
          onValueChange={setStorageMethodId}
          disabled={storageMethods.length === 0}
        >
          <SelectTrigger id="storageMethodId" className="h-11 w-full">
            <SelectValue placeholder="No storage methods available" />
          </SelectTrigger>
          <SelectContent>
            {storageMethods.map((method) => (
              <SelectItem key={method.id} value={method.id}>
                {method.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="productTypeId">Product type</Label>
        <Select
          name="productTypeId"
          value={productTypeId}
          onValueChange={setProductTypeId}
          disabled={productTypes.length === 0}
        >
          <SelectTrigger id="productTypeId" className="h-11 w-full">
            <SelectValue placeholder="No product types available" />
          </SelectTrigger>
          <SelectContent>
            {productTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="storageTempRangeId">Storage temperature</Label>
        <Select
          name="storageTempRangeId"
          value={storageTempRangeId}
          onValueChange={setStorageTempRangeId}
          disabled={storageTempRanges.length === 0}
        >
          <SelectTrigger id="storageTempRangeId" className="h-11 w-full">
            <SelectValue placeholder="No storage temperatures available" />
          </SelectTrigger>
          <SelectContent>
            {storageTempRanges.map((range) => (
              <SelectItem key={range.id} value={range.id}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="defaultShelfLifeValue">Default shelf life</Label>
        <div className="flex gap-2">
          <Input
            id="defaultShelfLifeValue"
            name="defaultShelfLifeValue"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            className="h-11"
            placeholder="Optional"
          />
          <Select
            name="defaultShelfLifeUnit"
            value={defaultShelfLifeUnit}
            onValueChange={(value) =>
              setDefaultShelfLifeUnit(value as ShelfLifeUnit)
            }
          >
            <SelectTrigger className="h-11 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minutes">minutes</SelectItem>
              <SelectItem value="hours">hours</SelectItem>
              <SelectItem value="days">days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <p className="text-sm text-critical">{error}</p>}

      <Button type="submit" className="w-full h-11" disabled={!canSubmit || isSubmitting}>
        {isSubmitting ? "Adding product..." : "Add product"}
      </Button>
    </form>
  );
}
