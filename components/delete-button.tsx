"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type DeleteResult = { success: true } | { success: false; error: string };

export function DeleteButton({
  onDelete,
  confirmMessage,
  label,
}: {
  onDelete: () => Promise<DeleteResult>;
  confirmMessage: string;
  label: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleClick() {
    if (!window.confirm(confirmMessage)) return;
    setIsDeleting(true);
    const res = await onDelete();
    setIsDeleting(false);
    if (res.success) {
      router.refresh();
    } else {
      window.alert(res.error);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-9 w-9 text-muted-foreground hover:text-critical hover:bg-critical/10"
      onClick={handleClick}
      disabled={isDeleting}
      aria-label={label}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
