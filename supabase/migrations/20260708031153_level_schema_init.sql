create schema if not exists level;

do $$ begin
  create type level.product as enum ('PMS','AGO','ATK','DPK','LPG','CRUDE','LNG');
exception when duplicate_object then null; end $$;
do $$ begin
  create type level.facility_kind as enum ('refinery','tank_farm','depot','terminal');
exception when duplicate_object then null; end $$;
do $$ begin
  create type level.price_basis as enum ('ex_depot','ex_refinery','import_parity','platts');
exception when duplicate_object then null; end $$;
do $$ begin
  create type level.alert_severity as enum ('info','warning','critical');
exception when duplicate_object then null; end $$;
do $$ begin
  create type level.berth_status as enum ('expected','anchored','berthed','discharging','departed');
exception when duplicate_object then null; end $$;

create table if not exists level.countries (
  code text primary key, name text not null, currency text,
  created_at timestamptz not null default now()
);
create table if not exists level.ports (
  id uuid primary key default gen_random_uuid(),
  name text not null, country_code text not null references level.countries(code),
  lat double precision not null, lng double precision not null, unlocode text,
  created_at timestamptz not null default now()
);
create table if not exists level.facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null, kind level.facility_kind not null, operator text,
  country_code text not null references level.countries(code),
  port_id uuid references level.ports(id),
  lat double precision, lng double precision, capacity_m3 numeric,
  is_flagship boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists level.facility_readings (
  id bigint generated always as identity primary key,
  facility_id uuid not null references level.facilities(id) on delete cascade,
  product level.product not null, volume_m3 numeric not null, capacity_m3 numeric,
  throughput_m3_day numeric, source text default 'manual',
  recorded_at timestamptz not null default now()
);
create index if not exists idx_readings_facility_time on level.facility_readings (facility_id, product, recorded_at desc);
create table if not exists level.vessels (
  mmsi bigint primary key, imo bigint, name text, call_sign text,
  ship_type int, product level.product, dwt numeric, flag text,
  updated_at timestamptz not null default now()
);
create table if not exists level.vessel_positions (
  id bigint generated always as identity primary key,
  mmsi bigint not null references level.vessels(mmsi) on delete cascade,
  lat double precision not null, lng double precision not null,
  sog double precision, cog double precision, heading double precision, nav_status int,
  recorded_at timestamptz not null default now()
);
create index if not exists idx_positions_mmsi_time on level.vessel_positions (mmsi, recorded_at desc);
create table if not exists level.vessel_latest (
  mmsi bigint primary key references level.vessels(mmsi) on delete cascade,
  lat double precision not null, lng double precision not null,
  sog double precision, cog double precision, heading double precision, nav_status int,
  recorded_at timestamptz not null default now()
);
create table if not exists level.berth_schedule (
  id uuid primary key default gen_random_uuid(),
  port_id uuid not null references level.ports(id),
  vessel_mmsi bigint references level.vessels(mmsi), vessel_name text,
  product level.product, volume_mt numeric,
  status level.berth_status not null default 'expected',
  eta timestamptz, laycan_start date, laycan_end date,
  updated_at timestamptz not null default now()
);
create table if not exists level.prices (
  id bigint generated always as identity primary key,
  product level.product not null, basis level.price_basis not null,
  country_code text references level.countries(code), location text,
  price numeric not null, currency text not null default 'NGN',
  unit text not null default 'NGN/litre', recorded_at timestamptz not null default now()
);
create index if not exists idx_prices_product_time on level.prices (product, basis, recorded_at desc);
create table if not exists level.alerts (
  id uuid primary key default gen_random_uuid(),
  severity level.alert_severity not null default 'info', category text not null,
  title text not null, body text, facility_id uuid references level.facilities(id),
  port_id uuid references level.ports(id), product level.product,
  created_at timestamptz not null default now()
);
create index if not exists idx_alerts_time on level.alerts (created_at desc);
