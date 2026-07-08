-- ---------- Roles ----------
do $$ begin
  create type level.user_role as enum ('admin','ops','trader','finance','exec','regulator');
exception when duplicate_object then null; end $$;

create table if not exists level.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  org        text,
  role       level.user_role not null default 'trader',
  created_at timestamptz not null default now()
);
alter table level.profiles enable row level security;

-- a user sees their own profile; admins see all
-- NOTE: the profiles_admin policy below is recursive (it queries level.profiles
-- from within a policy on level.profiles). It is replaced in
-- 20260708034500_fix_profiles_rls_recursion.sql — kept here for history.
drop policy if exists profiles_self on level.profiles;
create policy profiles_self on level.profiles for select to authenticated
  using (id = auth.uid());
drop policy if exists profiles_admin on level.profiles;
create policy profiles_admin on level.profiles for select to authenticated
  using (exists (select 1 from level.profiles p where p.id = auth.uid() and p.role = 'admin'));

grant usage on schema level to authenticated;
grant select on level.profiles to authenticated;

-- current caller's role (used by write RPCs)
create or replace function level.current_role()
returns level.user_role language sql stable security definer set search_path = level as $$
  select role from level.profiles where id = auth.uid();
$$;

-- auto-create a profile whenever an auth user is created
create or replace function level.handle_new_user()
returns trigger language plpgsql security definer set search_path = level as $$
begin
  insert into level.profiles (id, email, full_name, org, role)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'org',
    coalesce((new.raw_user_meta_data->>'role')::level.user_role, 'trader')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function level.handle_new_user();

-- expose current profile to the app
create or replace view public.lvl_my_profile with (security_invoker=on) as
  select id, email, full_name, org, role, created_at from level.profiles where id = auth.uid();
grant select on public.lvl_my_profile to authenticated, anon;

-- ---------- Role-gated write RPCs (data-entry console) ----------
create or replace function public.record_reading(
  p_facility uuid, p_product text, p_volume numeric,
  p_capacity numeric default null, p_throughput numeric default null)
returns bigint language plpgsql security definer set search_path = level, public as $$
declare r level.user_role := level.current_role(); rid bigint;
begin
  if r is null or r not in ('ops','admin') then
    raise exception 'not authorized: role % cannot record readings', coalesce(r::text,'anonymous');
  end if;
  insert into level.facility_readings (facility_id, product, volume_m3, capacity_m3, throughput_m3_day, source)
  values (p_facility, p_product::level.product, p_volume, p_capacity, p_throughput, 'manual')
  returning id into rid;
  return rid;
end $$;

create or replace function public.record_price(
  p_product text, p_basis text, p_price numeric, p_country text default 'NG',
  p_location text default null, p_currency text default 'NGN', p_unit text default 'NGN/litre')
returns bigint language plpgsql security definer set search_path = level, public as $$
declare r level.user_role := level.current_role(); rid bigint;
begin
  if r is null or r not in ('trader','finance','admin') then
    raise exception 'not authorized: role % cannot record prices', coalesce(r::text,'anonymous');
  end if;
  insert into level.prices (product, basis, country_code, location, price, currency, unit)
  values (p_product::level.product, p_basis::level.price_basis, p_country, p_location, p_price, p_currency, p_unit)
  returning id into rid;
  return rid;
end $$;

create or replace function public.post_alert(
  p_severity text, p_category text, p_title text, p_body text default null, p_product text default null)
returns uuid language plpgsql security definer set search_path = level, public as $$
declare r level.user_role := level.current_role(); aid uuid;
begin
  if r is null or r not in ('ops','trader','admin') then
    raise exception 'not authorized: role % cannot post alerts', coalesce(r::text,'anonymous');
  end if;
  insert into level.alerts (severity, category, title, body, product)
  values (p_severity::level.alert_severity, p_category, p_title, p_body,
          nullif(p_product,'')::level.product)
  returning id into aid;
  return aid;
end $$;

create or replace function public.upsert_berth(
  p_port uuid, p_vessel_name text, p_product text, p_volume_mt numeric,
  p_status text, p_eta timestamptz, p_id uuid default null)
returns uuid language plpgsql security definer set search_path = level, public as $$
declare r level.user_role := level.current_role(); bid uuid;
begin
  if r is null or r not in ('ops','admin') then
    raise exception 'not authorized: role % cannot edit berths', coalesce(r::text,'anonymous');
  end if;
  if p_id is null then
    insert into level.berth_schedule (port_id, vessel_name, product, volume_mt, status, eta)
    values (p_port, p_vessel_name, nullif(p_product,'')::level.product, p_volume_mt, p_status::level.berth_status, p_eta)
    returning id into bid;
  else
    update level.berth_schedule set
      port_id=p_port, vessel_name=p_vessel_name, product=nullif(p_product,'')::level.product,
      volume_mt=p_volume_mt, status=p_status::level.berth_status, eta=p_eta, updated_at=now()
    where id=p_id returning id into bid;
  end if;
  return bid;
end $$;

grant execute on function public.record_reading(uuid,text,numeric,numeric,numeric) to authenticated;
grant execute on function public.record_price(text,text,numeric,text,text,text,text) to authenticated;
grant execute on function public.post_alert(text,text,text,text,text) to authenticated;
grant execute on function public.upsert_berth(uuid,text,text,numeric,text,timestamptz,uuid) to authenticated;
