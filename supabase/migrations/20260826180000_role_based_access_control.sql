-- Role-based access control: 'admin' and 'cook' roles on `staff`.
-- Cooks can do everything admins can except delete records, enforced at
-- the RLS level (not just hidden in the UI).
--
-- Run this once against the dev project's SQL Editor, verify the app
-- still works end to end, then run the identical script against prod.
--
-- After applying, promote your own account to admin with the manual
-- UPDATE (or INSERT) statement given separately -- this migration does
-- not do that for you, since it doesn't know which existing `staff` row
-- (if any) is you, or your auth.users id.

begin;

-- 1. Repurpose the existing `staff.role` column for RBAC, and add
-- `auth_user_id`.
--
-- `role` already exists as a free-text "job title" (default 'cook',
-- shown in the Add Cook form's Role field and the /staff filter) --
-- there is no second `role` concept here, this constrains that same
-- column to exactly 'admin'/'cook' going forward (the frontend change
-- alongside this migration switches the Add Cook form's Role field
-- from a free-text Input to a Select with just those two choices).
-- Every current row already stores exactly 'cook', so this applies
-- cleanly today -- if prod (or a later dev state) has other free-text
-- values in that column, this fails loudly rather than silently
-- discarding them; normalize those rows to 'admin' or 'cook' first,
-- then re-run from here.
alter table staff
  alter column role set default 'cook',
  alter column role set not null,
  add constraint staff_role_check check (role in ('admin', 'cook'));

-- `auth_user_id` links a `staff` row to the login that IS that
-- person, so a session can be checked against a role. Nullable: not
-- every staff/cook name needs login access, only those who actually
-- log in. It's how a logged-in session maps back to a role at all --
-- today nothing does this (`lib/tenant.ts`'s `getTenantId` just reads
-- the first `staff` row, not the current user's own row, because
-- there was no link to establish "own row").
alter table staff
  add column auth_user_id uuid unique references auth.users(id);

-- 2. Helper function used by the DELETE policies below. `security
-- definer` so it can always see the full `staff` table regardless of
-- RLS (avoids any circularity questions from a helper function used
-- inside `staff`'s own policies), with `search_path` pinned per
-- Postgres's security-definer function guidance.
--
-- `auth.uid() is null` (no session) makes `auth_user_id = auth.uid()`
-- evaluate to NULL, not TRUE, for every row -- `exists (...)` is then
-- false, satisfying "false ... including when auth.uid() is null"
-- without a special case.
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from staff
    where auth_user_id = auth.uid()
      and role = 'admin'
  );
$$;

-- 3. Replace each table's single "authenticated_full_access" policy
-- with granular ones: SELECT/INSERT/UPDATE stay open to any
-- authenticated user (cooks need full read/write for their daily
-- work); DELETE is its own policy, gated by is_admin(). The old
-- policies must be dropped, not just left alongside the new ones --
-- Postgres OR's multiple permissive policies together, so leaving the
-- old "for all" policy in place would still allow every cook to
-- delete anything.
drop policy if exists "authenticated_full_access" on products;
drop policy if exists "authenticated_full_access" on staff;
drop policy if exists "authenticated_full_access" on batches;

create policy "authenticated_select" on products
  for select to authenticated using (true);
create policy "authenticated_insert" on products
  for insert to authenticated with check (true);
create policy "authenticated_update" on products
  for update to authenticated using (true) with check (true);
create policy "admin_delete" on products
  for delete to authenticated using (is_admin());

create policy "authenticated_select" on staff
  for select to authenticated using (true);
-- INSERT/UPDATE on `staff` are otherwise wide open (cooks add roster
-- entries via the Add Cook form, and should be able to fix a typo in
-- anyone's name) -- but "wide open" would include the `role` column
-- itself, which decides who's an admin. Without this check, any cook
-- could write `role = 'admin'` into their own row directly via the API
-- (bypassing the Add Cook form's Select entirely) -- via UPDATE on
-- their own row, or via INSERT of a second row linked to their own
-- auth_user_id (is_admin() just looks for *any* row matching
-- auth.uid() with role = 'admin', so a second row works as well as
-- editing the first). `role != 'admin' or is_admin()` blocks writing
-- 'admin' into any row unless the actor already is one -- self-checks
-- clean here since it reads the *pre-update* value of is_admin(), not
-- the row being written.
create policy "staff_insert" on staff
  for insert to authenticated
  with check (role != 'admin' or is_admin());
create policy "staff_update" on staff
  for update to authenticated
  using (true)
  with check (role != 'admin' or is_admin());
create policy "admin_delete" on staff
  for delete to authenticated using (is_admin());

create policy "authenticated_select" on batches
  for select to authenticated using (true);
create policy "authenticated_insert" on batches
  for insert to authenticated with check (true);
create policy "authenticated_update" on batches
  for update to authenticated using (true) with check (true);
create policy "admin_delete" on batches
  for delete to authenticated using (is_admin());

-- 4. On signup, auto-create the matching `staff` row (role defaults to
-- 'cook') so every login has a role at all -- right now nothing does
-- this. `security definer` because this runs against `auth.users`
-- (Supabase-managed schema) before the new user has an authenticated
-- app session of their own to satisfy `staff`'s `authenticated` INSERT
-- policy. `on conflict do nothing` keeps this from ever blocking
-- account creation if it somehow fires twice for the same user.
--
-- Phase 1 is single-tenant, so the new row's tenant_id is "the one
-- tenant" -- same assumption `lib/tenant.ts` already makes. There's no
-- name collected at signup (email + password only, see
-- components/sign-up-form.tsx), so the email is used as a fallback
-- display name.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into staff (tenant_id, name, role, auth_user_id)
  values (
    (select id from tenants limit 1),
    coalesce(new.raw_user_meta_data ->> 'name', new.email, 'New cook'),
    'cook',
    new.id
  )
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Make sure PostgREST picks up the new columns/policies immediately
-- instead of waiting for its next schema cache refresh.
notify pgrst, 'reload schema';

commit;
