-- Attendance Management System MVP
-- Fresh Supabase schema for this project only.

create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.app_role as enum ('admin', 'employee');
create type public.employee_status as enum ('active', 'inactive');
create type public.attendance_status as enum ('present', 'absent');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext not null unique,
  password_hash text not null,
  role public.app_role not null default 'employee',
  created_at timestamptz not null default now(),
  constraint users_username_format check (username ~* '^[a-z0-9._-]{3,64}$')
);

create unique index users_single_admin_idx
on public.users ((role))
where role = 'admin';

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  employee_id text not null unique,
  full_name text not null,
  email text not null unique,
  phone text,
  department text not null,
  joining_date date not null,
  status public.employee_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employees_employee_id_format check (employee_id ~ '^EMP[0-9]{3,}$'),
  constraint employees_email_format check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  constraint employees_full_name_not_blank check (length(trim(full_name)) >= 2),
  constraint employees_department_not_blank check (length(trim(department)) >= 2)
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  attendance_date date not null default current_date,
  check_in_time timestamptz not null default now(),
  check_out_time timestamptz,
  status public.attendance_status not null default 'present',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_one_record_per_employee_day unique (employee_id, attendance_date),
  constraint attendance_checkout_after_checkin check (check_out_time is null or check_out_time >= check_in_time)
);

create index employees_user_id_idx on public.employees(user_id);
create index employees_email_idx on public.employees(email);
create index employees_status_idx on public.employees(status);
create index employees_department_idx on public.employees(department);
create index attendance_employee_id_idx on public.attendance(employee_id);
create index attendance_date_idx on public.attendance(attendance_date desc);
create index attendance_employee_date_idx on public.attendance(employee_id, attendance_date desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger employees_set_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

create trigger attendance_set_updated_at
before update on public.attendance
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
  );
$$;

create or replace function public.current_employee_uuid()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.id
  from public.employees e
  where e.user_id = auth.uid()
    and e.status = 'active'
  limit 1;
$$;

create or replace function public.hash_employee_password(plain_password text)
returns text
language sql
volatile
security definer
set search_path = public
as $$
  select extensions.crypt(plain_password, extensions.gen_salt('bf'::text, 10));
$$;

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

create or replace function public.verify_employee_login(input_username text, plain_password text)
returns table (
  user_id uuid,
  username text,
  role public.app_role,
  employee_status public.employee_status
)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.username::text, u.role, e.status
  from public.users u
  join public.employees e on e.user_id = u.id
  where u.username = input_username::citext
    and u.role = 'employee'
    and u.password_hash = extensions.crypt(plain_password, u.password_hash)
  limit 1;
$$;

create or replace function public.next_employee_code()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select 'EMP' || lpad(
    (
      coalesce(
        max(nullif(regexp_replace(employee_id, '\\D', '', 'g'), '')::int),
        0
      ) + 1
    )::text,
    3,
    '0'
  )
  from public.employees;
$$;

create or replace function public.check_in_today()
returns public.attendance
language plpgsql
security definer
set search_path = public
as $$
declare
  employee_uuid uuid;
  created_record public.attendance;
begin
  select public.current_employee_uuid() into employee_uuid;

  if employee_uuid is null then
    raise exception 'No active employee profile found for this user.' using errcode = 'P0001';
  end if;

  insert into public.attendance (employee_id, attendance_date, check_in_time, status)
  values (employee_uuid, current_date, now(), 'present')
  returning * into created_record;

  return created_record;
exception
  when unique_violation then
    raise exception 'Attendance has already been checked in for today.' using errcode = '23505';
end;
$$;

create or replace function public.check_out_today()
returns public.attendance
language plpgsql
security definer
set search_path = public
as $$
declare
  employee_uuid uuid;
  updated_record public.attendance;
begin
  select public.current_employee_uuid() into employee_uuid;

  if employee_uuid is null then
    raise exception 'No active employee profile found for this user.' using errcode = 'P0001';
  end if;

  update public.attendance
  set check_out_time = now(),
      status = 'present'
  where employee_id = employee_uuid
    and attendance_date = current_date
    and check_out_time is null
  returning * into updated_record;

  if updated_record.id is null then
    if not exists (
      select 1 from public.attendance
      where employee_id = employee_uuid
        and attendance_date = current_date
    ) then
      raise exception 'Check-in is required before check-out.' using errcode = 'P0001';
    end if;

    raise exception 'Attendance has already been checked out for today.' using errcode = 'P0001';
  end if;

  return updated_record;
end;
$$;

create or replace function public.employee_attendance_summary(target_date date default current_date)
returns table (
  total_employees bigint,
  today_attendance bigint,
  present_employees bigint,
  absent_employees bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.employees where status = 'active') as total_employees,
    (select count(*) from public.attendance where attendance_date = target_date) as today_attendance,
    (select count(*) from public.attendance where attendance_date = target_date and status = 'present') as present_employees,
    (
      (select count(*) from public.employees where status = 'active') -
      (select count(*) from public.attendance where attendance_date = target_date and status = 'present')
    ) as absent_employees
  where public.is_admin();
$$;

alter table public.users enable row level security;
alter table public.employees enable row level security;
alter table public.attendance enable row level security;

create policy "Admins can view all user profiles"
on public.users for select
to authenticated
using (public.is_admin());

create policy "Employees can view their own basic user profile"
on public.users for select
to authenticated
using (id = auth.uid());

create policy "Admins can manage user profiles"
on public.users for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage employees"
on public.employees for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Employees can view their own employee profile"
on public.employees for select
to authenticated
using (user_id = auth.uid());

create policy "Admins can manage attendance"
on public.attendance for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Employees can view their own attendance"
on public.attendance for select
to authenticated
using (
  exists (
    select 1
    from public.employees e
    where e.id = attendance.employee_id
      and e.user_id = auth.uid()
  )
);

create policy "Employees can create their own attendance"
on public.attendance for insert
to authenticated
with check (
  employee_id = public.current_employee_uuid()
);

create policy "Employees can update their own open checkout"
on public.attendance for update
to authenticated
using (
  check_out_time is null
  and employee_id = public.current_employee_uuid()
)
with check (
  employee_id = public.current_employee_uuid()
);

grant usage on schema public to authenticated, service_role;

revoke all on public.users from anon, authenticated;
revoke all on public.employees from service_role;
revoke all on public.attendance from service_role;
revoke all on public.users from service_role;
revoke all on public.employees from anon;
revoke all on public.attendance from anon;

grant select (id, username, role, created_at) on public.users to authenticated;
grant insert, update, delete on public.users to authenticated;
grant select, insert, update, delete on public.employees to authenticated;
grant select, insert, update, delete on public.attendance to authenticated;
grant select, insert, update, delete on public.users to service_role;
grant select, insert, update, delete on public.employees to service_role;
grant select, insert, update, delete on public.attendance to service_role;

revoke all on function public.hash_employee_password(text) from public, anon, authenticated;
revoke all on function public.employee_login_email(text) from public, anon, authenticated;
revoke all on function public.verify_employee_login(text, text) from public, anon, authenticated;
revoke all on function public.next_employee_code() from public, anon, authenticated;
grant execute on function public.hash_employee_password(text) to service_role;
grant execute on function public.employee_login_email(text) to anon, authenticated;
grant execute on function public.verify_employee_login(text, text) to service_role;
grant execute on function public.next_employee_code() to service_role;
grant execute on function public.check_in_today() to authenticated;
grant execute on function public.check_out_today() to authenticated;
grant execute on function public.employee_attendance_summary(date) to authenticated;
