import { EnvVarWarning } from "@/components/env-var-warning";
import { HamburgerMenu } from "@/components/hamburger-menu";
import { createClient } from "@/lib/supabase/server";
import { getTenantId, getTenantName } from "@/lib/tenant";
import { hasEnvVars } from "@/lib/utils";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userEmail = data?.claims?.email as string | undefined;

  let tenantName: string | null = null;
  try {
    const tenantId = await getTenantId(supabase);
    tenantName = await getTenantName(tenantId);
  } catch {
    tenantName = null;
  }

  return (
    <main className="min-h-screen flex flex-col bg-background">
      <header className="w-full border-b bg-card sticky top-0 z-10">
        <div className="max-w-md mx-auto w-full flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="font-heading text-lg font-semibold tracking-wide leading-tight truncate text-primary">
              {tenantName ?? "Sticker"}
            </p>
            {userEmail && (
              <p className="text-sm text-muted-foreground truncate">
                {userEmail}
              </p>
            )}
          </div>
          {!hasEnvVars ? (
            <EnvVarWarning />
          ) : (
            <HamburgerMenu userEmail={userEmail} />
          )}
        </div>
      </header>

      <div className="flex-1 w-full px-4 py-4">{children}</div>
    </main>
  );
}
