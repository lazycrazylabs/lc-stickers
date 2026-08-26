"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createStaff } from "@/app/staff/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Role = "admin" | "cook";

export function StaffForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("cook");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const res = await createStaff(formData);
    setIsSubmitting(false);
    if (res.success) {
      router.push("/staff");
    } else {
      setError(res.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required className="h-11" />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="role">Role</Label>
        <Select
          name="role"
          value={role}
          onValueChange={(value) => setRole(value as Role)}
        >
          <SelectTrigger id="role" className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cook">Cook</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-critical">{error}</p>}

      <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
        {isSubmitting ? "Adding cook..." : "Add cook"}
      </Button>
    </form>
  );
}
