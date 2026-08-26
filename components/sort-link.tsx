import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";

/** Column header for a table that's always sorted (by this column, in
 * `dir`), toggling direction on click. */
export function SortLink({
  href,
  dir,
  children,
}: {
  href: string;
  dir: "asc" | "desc";
  children: React.ReactNode;
}) {
  const Icon = dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 hover:text-foreground"
    >
      {children}
      <Icon className="h-3.5 w-3.5 shrink-0" />
    </Link>
  );
}
