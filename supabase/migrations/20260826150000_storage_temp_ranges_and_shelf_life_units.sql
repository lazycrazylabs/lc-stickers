-- Builds on 20260826130000_rename_categories_to_products.sql (already
-- applied to dev). Adds:
--
--   1. `storage_temp_ranges`, a lookup table replacing the free-text
--      `products.storage_temp` column, same tenant_id pattern as
--      `storage_methods`/`product_types` (tenant_id IS NULL = global).
--   2. Shelf life as value + unit: `products.default_shelf_life_days`
--      (always days) is replaced by `default_shelf_life_value` (integer)
--      + `default_shelf_life_unit` (text, CHECK IN
--      ('minutes','hours','days')).
--
-- Run this once against the dev project's SQL Editor, verify the app
-- still works end to end, then run the identical script against prod.
--
-- NOTE: dev currently has a second product row ("Fish A", a test row
-- created while trying out the /products form) with a free-text
-- storage_temp that doesn't map cleanly to one of the 5 seeded ranges.
-- Per instruction, this migration deletes that test row outright rather
-- than guessing a mapping for it — remove or adjust step 0 below if
-- prod (or a later dev state) shouldn't have that row deleted the same
-- way.

begin;

-- 0. Remove the "Fish A" test product so the NOT NULL step below doesn't
-- fail on a row with no sensible storage_temp_range_id mapping. No
-- batches reference it (checked before writing this migration).
delete from products where name = 'Fish A';

-- 1. Lookup table, same tenant_id pattern as storage_methods/product_types.
create table storage_temp_ranges (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  label text not null,
  created_at timestamptz not null default now()
);

alter table storage_temp_ranges enable row level security;

create policy "authenticated_full_access" on storage_temp_ranges
  for all to authenticated using (true) with check (true);

insert into storage_temp_ranges (tenant_id, label) values
  (null, '0°C to 4°C'),
  (null, '4°C to 8°C'),
  (null, '-12°C to -18°C'),
  (null, '-18°C and below'),
  (null, 'Room temperature (ambient)');

-- 2. Link products -> storage_temp_ranges (nullable first, backfilled
-- below), then drop the old free-text column it replaces.
alter table products
  add column storage_temp_range_id uuid references storage_temp_ranges(id);

update products
  set storage_temp_range_id = (
    select id from storage_temp_ranges
    where label = '0°C to 4°C' and tenant_id is null
  )
  where name = 'Napa Cabbage Kimchi, Fermented'
    and storage_temp_range_id is null;

-- If other product rows exist without a mapping by this point, this
-- fails loudly rather than silently leaving a row without a value --
-- backfill those rows first, then re-run from here.
alter table products
  alter column storage_temp_range_id set not null;

alter table products drop column storage_temp;

-- 3. Shelf life as value + unit instead of a fixed "days" integer.
alter table products
  add column default_shelf_life_value integer,
  add column default_shelf_life_unit text;

update products
  set default_shelf_life_value = default_shelf_life_days,
      default_shelf_life_unit = 'days'
  where default_shelf_life_days is not null;

alter table products
  add constraint products_default_shelf_life_unit_check
    check (default_shelf_life_unit in ('minutes', 'hours', 'days')),
  add constraint products_shelf_life_value_unit_together
    check (
      (default_shelf_life_value is null) = (default_shelf_life_unit is null)
    );

alter table products drop column default_shelf_life_days;

-- Make sure PostgREST picks up the schema changes immediately instead of
-- waiting for its next schema cache refresh.
notify pgrst, 'reload schema';

commit;
