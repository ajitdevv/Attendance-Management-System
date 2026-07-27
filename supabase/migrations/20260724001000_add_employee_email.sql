-- Add admin-provided employee email to existing AMS databases.

alter table public.employees
add column if not exists email text;

update public.employees
set email = lower(employee_id || '@employees.ams.local')
where email is null;

alter table public.employees
alter column email set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employees_email_format'
      and conrelid = 'public.employees'::regclass
  ) then
    alter table public.employees
    add constraint employees_email_format check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$') not valid;

    alter table public.employees validate constraint employees_email_format;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where contype = 'u'
      and conrelid = 'public.employees'::regclass
      and pg_get_constraintdef(oid) like '%email%'
  ) then
    alter table public.employees
    add constraint employees_email_unique unique (email);
  end if;
end;
$$;

create index if not exists employees_email_idx on public.employees(email);

create or replace function public.employee_login_email(input_username text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select e.email
  from public.users u
  join public.employees e on e.user_id = u.id
  where u.username = input_username::citext
    and u.role = 'employee'
    and e.status = 'active'
  limit 1;
$$;

revoke all on function public.employee_login_email(text) from public, anon, authenticated;
grant execute on function public.employee_login_email(text) to anon, authenticated;

-- Permissions required for frontend admin-managed employee creation.
grant usage on schema public to authenticated, anon;

grant select (id, username, role, created_at) on public.users to authenticated;
grant insert, update, delete on public.users to authenticated;
grant select, insert, update, delete on public.employees to authenticated;
grant select, insert, update, delete on public.attendance to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'Admins can view all user profiles'
  ) then
    create policy "Admins can view all user profiles"
    on public.users for select
    to authenticated
    using (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'Employees can view their own basic user profile'
  ) then
    create policy "Employees can view their own basic user profile"
    on public.users for select
    to authenticated
    using (id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'Admins can manage user profiles'
  ) then
    create policy "Admins can manage user profiles"
    on public.users for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'employees'
      and policyname = 'Admins can manage employees'
  ) then
    create policy "Admins can manage employees"
    on public.employees for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());
  end if;
end;
$$;
