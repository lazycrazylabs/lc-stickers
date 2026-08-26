"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FilterOption = {
  id: string;
  label: string;
  count: number;
};

export function ProductFilters({
  storageMethods,
  productTypes,
}: {
  storageMethods: FilterOption[];
  productTypes: FilterOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const storageMethodId = searchParams.get("storageMethodId") ?? "all";
  const productTypeId = searchParams.get("productTypeId") ?? "all";
  const hasActiveFilter = storageMethodId !== "all" || productTypeId !== "all";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={storageMethodId}
        onValueChange={(value) => updateParam("storageMethodId", value)}
      >
        <SelectTrigger className="h-10 w-auto min-w-40">
          <SelectValue placeholder="Storage method" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All storage methods</SelectItem>
          {storageMethods.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label} ({option.count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={productTypeId}
        onValueChange={(value) => updateParam("productTypeId", value)}
      >
        <SelectTrigger className="h-10 w-auto min-w-40">
          <SelectValue placeholder="Product type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All product types</SelectItem>
          {productTypes.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label} ({option.count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilter && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.replace(pathname, { scroll: false })}
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}
