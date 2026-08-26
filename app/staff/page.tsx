import Link from "next/link";

import { deleteStaff } from "@/app/staff/actions";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";
import { SortLink } from "@/components/sort-link";
import { StaffFilters } from "@/components/staff-filters";
import { buildQueryString, readFilterParam } from "@/lib/url";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/role";
import { getTenantId } from "@/lib/tenant";

// This route reads live staff data with no static shell, so it can't
// satisfy Cache Components' prerender requirement — opt out of that
// validation. (The per-request behavior itself comes from reading
// cookies/fresh data with no `"use cache"`, not from this export.)
export const instant = false;

function countBy<T>(items: T[], key: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const roleFilter = readFilterParam(params.role);
  const sortDir = params.dir === "desc" ? "desc" : "asc";

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

  const [{ data: staff, error }, role] = await Promise.all([
    supabase.from("staff").select("id, name, role").eq("tenant_id", tenantId),
    getCurrentUserRole(supabase),
  ]);
  const isAdmin = role === "admin";

  if (error) {
    console.error("Failed to load staff:", error);
  }

  const allStaff = staff ?? [];

  // Facet counts reflect the full unfiltered set.
  const roleCounts = countBy(allStaff, (s) => s.role);

  const filtered = allStaff.filter((s) => !roleFilter || s.role === roleFilter);
  const sorted = [...filtered].sort(
    (a, b) => a.name.localeCompare(b.name) * (sortDir === "desc" ? -1 : 1),
  );

  const currentParams: Record<string, string | undefined> = {
    role: roleFilter,
    dir: params.dir === "desc" ? "desc" : undefined,
  };
  const nameSortHref = buildQueryString(currentParams, {
    dir: sortDir === "asc" ? "desc" : "asc",
  });

  return (
    <main className="min-h-screen flex justify-center p-4 bg-background">
      <div className="w-full max-w-3xl mt-4 mb-8 flex flex-col gap-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href="/protected"
              className="text-sm text-muted-foreground hover:underline"
            >
              &larr; Back
            </Link>
            <h1 className="text-2xl mt-2">Staff</h1>
          </div>
          <Button asChild className="h-11 shrink-0">
            <Link href="/staff/new">Add cook</Link>
          </Button>
        </div>

        <StaffFilters
          roles={Array.from(roleCounts.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([role, count]) => ({ id: role, label: role, count }))}
        />

        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {allStaff.length === 0
              ? "No staff yet."
              : "No staff match the current filters."}
          </p>
        ) : (
          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="text-left px-3 py-2 whitespace-nowrap">
                    <SortLink href={nameSortHref} dir={sortDir}>
                      Name
                    </SortLink>
                  </th>
                  <th scope="col" className="text-left px-3 py-2 whitespace-nowrap">
                    Role
                  </th>
                  {isAdmin && (
                    <th scope="col" className="px-3 py-2 whitespace-nowrap">
                      <span className="sr-only">Delete</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sorted.map((person) => (
                  <tr
                    key={person.id}
                    className="border-b last:border-b-0 hover:bg-accent"
                  >
                    <td className="px-3 py-2 font-medium">{person.name}</td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {person.role}
                    </td>
                    {isAdmin && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        <DeleteButton
                          label={`Delete ${person.name}`}
                          confirmMessage={`Delete "${person.name}"? This can't be undone.`}
                          onDelete={deleteStaff.bind(null, person.id)}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
