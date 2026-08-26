import type { UrgencyStatus } from "@/lib/format";
import { cn } from "@/lib/utils";

const statusClass: Record<UrgencyStatus, string> = {
  critical: "bg-critical",
  soon: "bg-soon",
  fresh: "bg-fresh",
  neutral: "bg-muted-foreground/40",
};

const statusLabel: Record<UrgencyStatus, string> = {
  critical: "Expiring very soon",
  soon: "Expiring soon",
  fresh: "Freshly made",
  neutral: "",
};

/**
 * The signature "day dot" — an 8px circle referencing the physical
 * color-coded food rotation labels cooks already use. Deliberately a dot,
 * not a badge or pill.
 */
export function DayDot({
  status,
  className,
}: {
  status: UrgencyStatus;
  className?: string;
}) {
  const label = statusLabel[status];
  return (
    <span
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        statusClass[status],
        className,
      )}
    />
  );
}
