# Project: Sticker / Batch Traceability SaaS

Kitchen prep-batch labeling system. Staff create a record for a batch
(e.g. a tub of kimchi), print a sticker with a QR code, and scanning the
QR opens a public page with the batch details (who made it, when, best
before). Long-term goal: multi-tenant SaaS for restaurants ($10-50/mo
subscriptions). Currently in Phase 1 — single-tenant MVP.

## Stack

- Next.js (App Router), scaffolded from the official `with-supabase` template
- Supabase: Postgres + Auth (separate dev and prod projects)
- Vercel for hosting/deploy (auto-deploy from `main`, PR previews)
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_SECRET_KEY` (note: current Supabase naming is "publishable key"
  and "secret key" — not "anon key" / "service_role key". The secret key is
  server-only, never `NEXT_PUBLIC_`, and bypasses RLS like the legacy
  service_role key did)

## Current phase: Phase 1 MVP

Single restaurant only — no billing, no multi-tenant UI, no print agent yet.
Do NOT build Stripe billing, tenant switching, or a print-agent app right
now unless explicitly asked — that's Phase 2/3.

## Database schema (already created in Supabase, both dev and prod)

- `tenants` — one row so far: "Lazy Crazy". `tenant_id` is already on every
  table on purpose, so Phase 2 (multiple restaurants) won't need a schema
  migration.
- `categories` — batch categories (e.g. "Napa Cabbage Kimchi, Fermented").
  `tenant_id = null` means a global template shared across restaurants;
  populated means restaurant-specific. Columns: `name`,
  `default_shelf_life_days` (used to auto-calculate a batch's `expires_at`
  from its `made_at`), `storage_temp` (e.g. "Chilled" — shown on the
  printed sticker and public batch page), `fields_schema` (jsonb, reserved
  for future custom per-category fields).
- `staff` — cooks who create batches. Columns: `name`, `role`.
- `batches` — the actual records printed on stickers. Has `qr_slug`
  (unique, used in the public URL `/b/{qr_slug}`, defaulted by the DB —
  don't generate it in application code), `made_at`, `expires_at`,
  `weight_kg`, `notes`, `custom_fields` (jsonb).

## RLS conventions

- RLS is enabled on every table.
- Policy so far: `authenticated` role has full access (single tenant, so no
  tenant filtering yet — add tenant_id checks when Phase 2 starts).
  **Known gap (found 2026-08-21, not yet fixed):** `tenants` has no SELECT
  policy for `authenticated` — it returns zero rows for a logged-in user,
  unlike `categories`/`staff`/`batches` which work as documented. Until
  this is fixed, app code should avoid querying `tenants` directly as the
  logged-in user; e.g. `lib/tenant.ts` reads `tenant_id` off `staff`
  instead. Fix by adding an `authenticated`-full-access SELECT policy on
  `tenants` to match the other tables, then that workaround can be removed.
- No `anon` policies exist on purpose. The public batch page must NOT query
  Supabase directly with the publishable key from the client. Instead, read
  data server-side (Server Component or Route Handler) using the
  `SUPABASE_SECRET_KEY`, which never reaches the browser. This prevents the
  public API from being used to enumerate every batch.

## Conventions

- All code, comments, commit messages, and any text/data placed in the
  database must be in English — no Russian, even in examples or test data.
- Keep the codebase simple and readable; this is an early-stage MVP being
  tested in a real kitchen, not a polished product yet.

## Built so far

- Batch creation form at `/batches/new` (`app/batches/new/page.tsx`,
  `components/batch-form.tsx`, `app/batches/new/actions.ts`) — category and
  staff pickers, `made_at`/`expires_at` (auto-calculated from the
  category's `default_shelf_life_days`, editable), weight, notes. On
  submit, inserts into `batches` and shows a confirmation screen with the
  QR code (`qrcode` npm package) for printing. Requires login (gated by
  `proxy.ts`/`lib/supabase/proxy.ts`).
- Public batch page at `/b/[slug]` (`app/b/[slug]/page.tsx`) — Server
  Component only, reads via `lib/supabase/admin.ts` (`SUPABASE_SECRET_KEY`,
  never the publishable key). No login required (excluded from the auth
  redirect in `lib/supabase/proxy.ts`). Shows a simple "not found" message
  for an unknown slug instead of crashing.

## Next up (not yet built)

- Fix the `tenants` RLS gap noted above.

## Working conventions

- If a requirement is ambiguous (UI behavior, edge cases, data
  validation rules), ask a clarifying question before implementing —
  don't silently guess and move on.
- After any code change, actually run `npm run dev` and manually
  exercise the affected flow (submit the form, open the resulting
  page) before considering the task done. Don't just read the code
  and assume it's correct.
- Run `npm run lint` and `npm run build` before committing — fix
  any errors they surface.
- After any code change, invoke the `code-reviewer` subagent
  (`.claude/agents/code-reviewer.md`) before considering the task
  done, and report back what it found.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
