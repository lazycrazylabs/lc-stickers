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
- `products` — the items a batch can be made of (e.g. "Napa Cabbage
  Kimchi, Fermented"). Renamed from `categories` on 2026-08-26 (migration
  in `supabase/migrations/`, existing rows preserved). `tenant_id = null`
  means a global template shared across restaurants; populated means
  restaurant-specific. Columns: `name`, `default_shelf_life_value`
  (integer, nullable) + `default_shelf_life_unit` (`'minutes'` |
  `'hours'` | `'days'`, CHECK constrained; both null or both set
  together, enforced by a CHECK — used to auto-calculate a batch's
  `expires_at` from its `made_at`), `fields_schema` (jsonb, reserved for
  future custom per-product fields), `storage_method_id` (not null, FK to
  `storage_methods`), `product_type_id` (not null, FK to `product_types`),
  `storage_temp_range_id` (not null, FK to `storage_temp_ranges`).
- `storage_methods` / `product_types` / `storage_temp_ranges` — lookup
  tables (added 2026-08-26), same `tenant_id` pattern as `products`
  (`tenant_id = null` = global, populated = restaurant-specific).
  Columns: `name` (`label` on `storage_temp_ranges`), `created_at`.
  Deliberately not CHECK-constrained enums, so adding a new
  method/type/range is a plain `INSERT`, not a schema migration.
  `storage_methods` seeded globally with 'Chilled'/'Frozen';
  `product_types` with 'Semi-finished'/'Raw'; `storage_temp_ranges` with
  '0°C to 4°C', '4°C to 8°C', '-12°C to -18°C', '-18°C and below', and
  'Room temperature (ambient)'. No management UI yet (`/products`'s form
  just reads these tables for its dropdowns) — don't build one unless
  explicitly asked.
- `staff` — cooks who create batches. Columns: `name`, `role`.
- `batches` — the actual records printed on stickers. Has `qr_slug`
  (unique, used in the public URL `/b/{qr_slug}`, defaulted by the DB —
  don't generate it in application code), `product_id` (FK to `products`,
  renamed from `category_id` on 2026-08-26), `made_at`, `expires_at`,
  `weight_kg`, `notes`, `custom_fields` (jsonb).

## RLS conventions

- RLS is enabled on every table.
- Policy so far: `authenticated` role has full access (single tenant, so no
  tenant filtering yet — add tenant_id checks when Phase 2 starts).
  **Known gap (found 2026-08-21, not yet fixed):** `tenants` has no SELECT
  policy for `authenticated` — it returns zero rows for a logged-in user,
  unlike `products`/`staff`/`batches` which work as documented. Until
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

- All code, comments, and commit messages must be in English. This does
  NOT apply to data — real or test data in the database (batch notes,
  category names, etc.) can be in any language.
- Keep the codebase simple and readable; this is an early-stage MVP being
  tested in a real kitchen, not a polished product yet.

### Visual direction

Dark, kitchen/ticket-inspired: warm charcoal background, steel-teal
primary accent, day-dot color system (amber/red/green) for urgency —
never invent new colors for status without checking this palette
first. Headings/numbers in a condensed grotesque (label-printer feel),
body in Inter, batch IDs/timestamps in a monospace (receipt feel).
Signature element: small colored dots next to list items, not badges.

### Naming: batch vs sticker

"Batch" is the correct term in code, schema, and routes (batches,
qr_slug, /batches/new) — it's the production event: one act of
making a prep item, regardless of quantity (works for both a 60kg
tub of kimchi and a single jar of sauce).

"Sticker" is user-facing only — it's the printed artifact a batch
produces, not the entity itself. A batch can be reprinted as multiple
stickers over time (e.g. if one is lost or damaged), which is why
they aren't the same thing. Use "sticker" in all UI copy the cook
sees; never rename the underlying code.

## Built so far

- Batch creation form at `/batches/new` (`app/batches/new/page.tsx`,
  `components/batch-form.tsx`, `app/batches/new/actions.ts`) — product and
  staff pickers, `made_at`/`expires_at` (auto-calculated from the
  product's `default_shelf_life_value`/`default_shelf_life_unit`,
  editable), weight, notes. On submit, inserts into `batches` and shows a
  confirmation screen (via the shared `components/sticker-result.tsx`,
  see below) with the QR code (`qrcode` npm package) for printing.
  Requires login (gated by `proxy.ts`/`lib/supabase/proxy.ts`).
- `components/sticker-result.tsx` — shared client component rendering a
  batch's confirmation/print view (QR code, product/staff/tenant details,
  "Print sticker" button, a caller-supplied secondary action). Used by
  both the just-created confirmation screen (`components/batch-form.tsx`)
  and the reprint view (`/batches/[slug]`, below), so the print layout
  only lives in one place. Renders two things: an on-screen `Card`
  (`print:hidden`) and a print-only two-column block (`hidden
  print:flex`) sized to a real sticker via the `@page` rule in
  `app/globals.css` (`92mm x 45mm`) — product/made/best-before/storage/
  weight/staff/restaurant name on the left, QR code centered on the
  right. The on-screen confirmation view is unaffected by print styles.
- Reprint view at `/batches/[slug]` (`app/batches/[slug]/page.tsx`) —
  authenticated (unlike `/b/[slug]`), looks up an existing batch by
  `qr_slug` scoped to the tenant, regenerates its QR code, and renders
  the same `StickerResult` so a cook can reprint a sticker without
  re-entering data. Linked from the dashboard's "Recent stickers" print
  icon.
- Public batch page at `/b/[slug]` (`app/b/[slug]/page.tsx`) — Server
  Component only, reads via `lib/supabase/admin.ts` (`SUPABASE_SECRET_KEY`,
  never the publishable key). No login required (excluded from the auth
  redirect in `lib/supabase/proxy.ts`). Shows a simple "not found" message
  for an unknown slug instead of crashing.
- Dashboard at `/protected` (`app/protected/page.tsx` +
  `app/protected/layout.tsx`) — the landing page right after login,
  designed kitchen-first for a phone screen (large tap targets, no text
  below 13px, high-contrast urgency colors). Priorities top to bottom:
  (1) one large "New sticker" button (`h-16`, full-width, accent-filled)
  — the unmistakable primary action; (2) "Expiring soon" — batches
  expiring within 48h, soonest first, max 5, with product/human time
  remaining ("in 2 hours", "tomorrow")/weight/staff, color-coded red
  (<6h) or amber (<48h) but always stating the time in words, hidden
  entirely if nothing's expiring; (3) "Recent stickers" — 5 most recent
  batches, each row linking to its public page plus a separate print
  icon button (48x48 min) linking to `/batches/{qr_slug}` to reprint.
  The header (`app/protected/layout.tsx`) shows the restaurant name +
  logged-in user's email, with a hamburger menu (`components/
  hamburger-menu.tsx`) holding the Products/Staff links and logout —
  those are weekly-admin tasks kept out of the main per-shift flow.
  `lib/format.ts` holds the shared `formatDateTime`/`formatTimeRemaining`
  helpers used across the dashboard, sticker views, and public page.
- Products management page at `/products` (`app/products/page.tsx`,
  `components/product-form.tsx`, `app/products/actions.ts`) — lists the
  tenant's products plus global templates (`tenant_id IS NULL`), labeled
  "Your product" vs "Template", and a form to add a product (name,
  `storage_method_id`/`product_type_id`/`storage_temp_range_id` dropdowns
  populated from their respective lookup tables, plus a shelf-life value
  + unit selector). Requires login.
- Staff management page at `/staff` (`app/staff/page.tsx`,
  `components/staff-form.tsx`, `app/staff/actions.ts`) — lists the
  tenant's staff and a simple "Add cook" form (name, role, default
  `'cook'`). New staff show up immediately in the `/batches/new` staff
  picker since that page always reads fresh. Requires login.

## Next up (not yet built)

- Fix the `tenants` RLS gap noted above.

## Future ideas / not yet built

### Reminders / Alerts (not yet scheduled — design captured for later)

- Per-product setting: `reminder_days_before_expiry` (nullable int on
  `products`) — "notify N days before a batch of this product expires".
- Needs a scheduled job (Vercel Cron candidate) checking for batches
  whose `expires_at` falls within the reminder window.
- Delivery: email first (e.g. via Resend), push/SMS considered later.
- Needs dedup tracking (e.g. `reminder_sent_at` on `batches`) so the same
  batch doesn't notify repeatedly.
- Not part of Phase 1 — do not build until explicitly asked.

### HACCP reference database import

- Add ability to import products from a standardized HACCP reference
  database (like CloudChef's "Из базы HACCP" option) — not scheduled
  yet, just noted.

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
