-- Rename `categories` to `products`, rename `batches.category_id` to
-- `batches.product_id`, and introduce two lookup tables --
-- `storage_methods` and `product_types` -- following the same tenant_id
-- pattern as `products` (tenant_id IS NULL = global/shared, tenant_id set
-- = restaurant-specific). `products` links to them via
-- `storage_method_id` / `product_type_id` foreign keys instead of a
-- hardcoded CHECK constraint, so new methods/types can be added later
-- with a plain INSERT and no schema change.
--
-- Run this once against the dev project's SQL Editor, verify the app
-- still works end to end, then run the identical script against prod.
--
-- Table/column renames preserve existing rows, RLS policies, indexes, and
-- foreign keys automatically (Postgres renames the object, not its OID).

begin;

-- 1. Lookup tables, same tenant_id pattern as `products`.
create table storage_methods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  name text not null,
  created_at timestamptz not null default now()
);

create table product_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  name text not null,
  created_at timestamptz not null default now()
);

alter table storage_methods enable row level security;
alter table product_types enable row level security;

create policy "authenticated_full_access" on storage_methods
  for all to authenticated using (true) with check (true);

create policy "authenticated_full_access" on product_types
  for all to authenticated using (true) with check (true);

-- 2. Rename categories -> products, category_id -> product_id.
alter table categories rename to products;
alter table batches rename column category_id to product_id;

-- 3. Link products -> lookup tables (nullable first, backfilled below).
alter table products
  add column storage_method_id uuid references storage_methods(id),
  add column product_type_id uuid references product_types(id);

-- 4. Seed the two global rows each lookup table needs right now.
insert into storage_methods (tenant_id, name) values
  (null, 'Chilled'),
  (null, 'Frozen');

insert into product_types (tenant_id, name) values
  (null, 'Semi-finished'),
  (null, 'Raw');

-- 5. Backfill the existing seed row before enforcing NOT NULL below.
update products
  set storage_method_id = (
        select id from storage_methods
        where name = 'Chilled' and tenant_id is null
      ),
      product_type_id = (
        select id from product_types
        where name = 'Semi-finished' and tenant_id is null
      )
  where name = 'Napa Cabbage Kimchi, Fermented'
    and (storage_method_id is null or product_type_id is null);

-- 6. If this project already has other product rows without these
-- values (e.g. prod may differ from dev), the NOT NULL constraints below
-- will fail loudly rather than silently leaving rows without a value --
-- backfill those rows first, then re-run from here.
alter table products
  alter column storage_method_id set not null,
  alter column product_type_id set not null;

-- Make sure PostgREST picks up the new tables/columns immediately
-- instead of waiting for its next schema cache refresh.
notify pgrst, 'reload schema';

commit;
