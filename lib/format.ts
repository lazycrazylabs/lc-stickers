export function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Human-readable time remaining until `expiresAt` (e.g. "in 2 hours", "tomorrow"). */
export function formatTimeRemaining(expiresAt: string) {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return "any moment";

  const diffMinutes = Math.round(diffMs / 60_000);
  if (diffMinutes < 60) return `in ${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `in ${diffHours} hour${diffHours === 1 ? "" : "s"}`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "tomorrow";
  return `in ${diffDays} days`;
}

export type UrgencyStatus = "critical" | "soon" | "fresh" | "neutral";

/**
 * Status behind the color-coded "day dot" shown next to a batch, mirroring
 * the physical day-dot food rotation labels cooks already use: red once a
 * batch is about to (or already) expire, amber approaching that, green
 * just after it's made, and a quiet neutral dot otherwise.
 */
export function getUrgencyStatus(
  madeAt: string,
  expiresAt: string,
  now: Date = new Date(),
): UrgencyStatus {
  const hoursToExpiry =
    (new Date(expiresAt).getTime() - now.getTime()) / 3_600_000;
  if (hoursToExpiry < 6) return "critical";
  if (hoursToExpiry < 48) return "soon";

  const hoursSinceMade =
    (now.getTime() - new Date(madeAt).getTime()) / 3_600_000;
  if (hoursSinceMade < 6) return "fresh";

  return "neutral";
}

export const BATCH_LIST_STATUSES = ["expired", "expiring_soon", "fresh"] as const;
export type BatchListStatus = (typeof BATCH_LIST_STATUSES)[number];

/**
 * Status bucket for the /batches list's Status filter (All/Expiring
 * soon/Expired/Fresh) -- distinct from `getUrgencyStatus` above, which
 * drives the day-dot's "about to expire vs. just made" coloring, not a
 * three-way bucketed listing that includes an explicit "already expired"
 * state.
 */
export function getBatchListStatus(
  expiresAt: string,
  now: Date = new Date(),
): BatchListStatus {
  const hoursToExpiry =
    (new Date(expiresAt).getTime() - now.getTime()) / 3_600_000;
  if (hoursToExpiry < 0) return "expired";
  if (hoursToExpiry <= 48) return "expiring_soon";
  return "fresh";
}
