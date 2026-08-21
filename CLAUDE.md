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
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  (note: current Supabase naming is "publishable key", not "anon key")

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
  populated means restaurant-specific.
- `staff` — cooks who create batches.
- `batches` — the actual records printed on stickers. Has `qr_slug`
  (unique, used in the public URL `/b/{qr_slug}`), `made_at`, `expires_at`,
  `weight_kg`, `custom_fields` (jsonb).

## RLS conventions

- RLS is enabled on every table.
- Policy so far: `authenticated` role has full access (single tenant, so no
  tenant filtering yet — add tenant_id checks when Phase 2 starts).
- No `anon` policies exist on purpose. The public batch page must NOT query
  Supabase directly with the publishable key from the client. Instead, read
  data server-side (Server Component or Route Handler) using the
  `SUPABASE_SERVICE_ROLE_KEY`, which never reaches the browser. This
  prevents the public API from being used to enumerate every batch.

## Conventions

- All code, comments, commit messages, and any text/data placed in the
  database must be in English — no Russian, even in examples or test data.
- Keep the codebase simple and readable; this is an early-stage MVP being
  tested in a real kitchen, not a polished product yet.

## Next up (not yet built)

1. Batch creation form (category picker, weight, notes) writing to `batches`
2. Public batch page at `/b/[slug]`, server-rendered, using the service role key
3. QR code generation on batch creation (`qrcode` npm package), linking to
   the public batch page
