/**
 * Read a single-value search param as a filter, treating both "unset" and
 * the "all" sentinel (see `buildQueryString` below) as "no filter" — so a
 * hand-edited/bookmarked `?storageMethodId=all` URL behaves the same as no
 * param at all, rather than matching zero rows.
 */
export function readFilterParam(value: string | string[] | undefined) {
  return typeof value === "string" && value !== "all" ? value : undefined;
}

/**
 * Merge `overrides` into `current` and serialize to a query string, e.g. for
 * building a sortable-column-header link. A value of `undefined` or `"all"`
 * (the "no filter selected" sentinel used by our Select-based filters, since
 * Radix Select forbids an empty-string item value) removes that key.
 */
export function buildQueryString(
  current: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...overrides })) {
    if (value && value !== "all") params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
