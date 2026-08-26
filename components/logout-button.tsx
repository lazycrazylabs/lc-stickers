"use client";

import { createClient } from "@/lib/supabase/client";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton({ onClick, children, ...props }: ButtonProps) {
  const router = useRouter();

  // When rendered via `<DropdownMenuItem asChild>` (see hamburger-menu.tsx),
  // Radix injects its own `onClick` (for menu-close/selection) into `props`
  // — call it first so that behavior still runs, then sign out.
  const logout = async (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <Button onClick={logout} {...props}>
      {children ?? "Logout"}
    </Button>
  );
}
