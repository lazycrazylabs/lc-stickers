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

export function BatchFilters({
  statuses,
  products,
}: {
  statuses: FilterOption[];
  products: FilterOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? "all";
  const productId = searchParams.get("productId") ?? "all";
  const hasActiveFilter = status !== "all" || productId !== "all";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={status} onValueChange={(value) => updateParam("status", value)}>
        <SelectTrigger className="h-10 w-auto min-w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {statuses.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label} ({option.count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={productId}
        onValueChange={(value) => updateParam("productId", value)}
      >
        <SelectTrigger className="h-10 w-auto min-w-40">
          <SelectValue placeholder="Product" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All products</SelectItem>
          {products.map((option) => (
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
