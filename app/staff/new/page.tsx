import Link from "next/link";

import { StaffForm } from "@/components/staff-form";

export default function NewStaffPage() {
  return (
    <main className="min-h-screen flex justify-center p-4 bg-background">
      <div className="w-full max-w-sm mt-4 mb-8 flex flex-col gap-6">
        <div>
          <Link
            href="/staff"
            className="text-sm text-muted-foreground hover:underline"
          >
            &larr; Back
          </Link>
          <h1 className="text-2xl mt-2">Add cook</h1>
        </div>

        <StaffForm />
      </div>
    </main>
  );
}
