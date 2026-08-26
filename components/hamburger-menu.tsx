"use client";

import { Menu } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogoutButton } from "@/components/logout-button";

export function HamburgerMenu({ userEmail }: { userEmail?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 shrink-0"
          aria-label="Menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem asChild className="min-h-12 text-base">
          <Link href="/products">Products</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="min-h-12 text-base">
          <Link href="/staff">Staff</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="min-h-12 text-base p-0">
          <LogoutButton
            variant="ghost"
            className="w-full h-full min-w-0 justify-start px-2 font-normal truncate"
          >
            {userEmail ? `Logout (${userEmail})` : "Logout"}
          </LogoutButton>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
