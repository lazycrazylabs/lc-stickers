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

export function StaffFilters({ roles }: { roles: FilterOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const role = searchParams.get("role") ?? "all";
  const hasActiveFilter = role !== "all";

  function updateParam(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("role");
    else params.set("role", value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={role} onValueChange={updateParam}>
        <SelectTrigger className="h-10 w-auto min-w-40">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All roles</SelectItem>
          {roles.map((option) => (
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
