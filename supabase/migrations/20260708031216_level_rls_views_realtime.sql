grant usage on schema level to anon, authenticated;
grant select on all tables in schema level to anon, authenticated;
alter default privileges in schema level grant select on tables to anon, authenticated;

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'level' loop
    execute format('alter table level.%I enable row level security', t);
    execute format($p$ create policy "read_all_%1$s" on level.%1$I for select to anon, authenticated using (true) $p$, t);
  end loop;
end $$;

create or replace view public.lvl_countries      with (security_invoker=on) as select * from level.countries;
create or replace view public.lvl_ports          with (security_invoker=on) as select * from level.ports;
create or replace view public.lvl_facilities      with (security_invoker=on) as select * from level.facilities;
create or replace view public.lvl_facility_readings with (security_invoker=on) as select * from level.facility_readings;
create or replace view public.lvl_vessels         with (security_invoker=on) as select * from level.vessels;
create or replace view public.lvl_vessel_latest   with (security_invoker=on) as select * from level.vessel_latest;
create or replace view public.lvl_berth_schedule  with (security_invoker=on) as select * from level.berth_schedule;
create or replace view public.lvl_alerts          with (security_invoker=on) as select * from level.alerts;

create or replace view public.lvl_facility_latest with (security_invoker=on) as
select distinct on (facility_id, product)
  facility_id, product, volume_m3, capacity_m3, throughput_m3_day, source, recorded_at
from level.facility_readings order by facility_id, product, recorded_at desc;

create or replace view public.lvl_prices_latest with (security_invoker=on) as
select distinct on (product, basis, coalesce(location,''))
  product, basis, country_code, location, price, currency, unit, recorded_at
from level.prices order by product, basis, coalesce(location,''), recorded_at desc;

create or replace view public.lvl_prices with (security_invoker=on) as
  select product, basis, country_code, location, price, currency, unit, recorded_at from level.prices;

grant select on all tables in schema public to anon, authenticated;

do $$
declare t text;
begin
  for t in select unnest(array['facility_readings','vessel_latest','prices','alerts','berth_schedule','facilities']) loop
    begin execute format('alter publication supabase_realtime add table level.%I', t);
    exception when duplicate_object then null; end;
  end loop;
end $$;

create or replace function public.ingest_ais(rows jsonb)
returns int language plpgsql security definer set search_path = level, public as $$
declare r jsonb; n int := 0;
begin
  for r in select * from jsonb_array_elements(rows) loop
    insert into level.vessels (mmsi, name, imo, call_sign, ship_type, flag, updated_at)
    values ((r->>'mmsi')::bigint, nullif(r->>'name',''), nullif(r->>'imo','')::bigint,
            nullif(r->>'call_sign',''), nullif(r->>'ship_type','')::int, nullif(r->>'flag',''), now())
    on conflict (mmsi) do update set
      name = coalesce(nullif(excluded.name,''), level.vessels.name),
      ship_type = coalesce(excluded.ship_type, level.vessels.ship_type), updated_at = now();
    insert into level.vessel_latest (mmsi, lat, lng, sog, cog, heading, nav_status, recorded_at)
    values ((r->>'mmsi')::bigint, (r->>'lat')::float8, (r->>'lng')::float8,
            nullif(r->>'sog','')::float8, nullif(r->>'cog','')::float8,
            nullif(r->>'heading','')::float8, nullif(r->>'nav_status','')::int, now())
    on conflict (mmsi) do update set
      lat=excluded.lat, lng=excluded.lng, sog=excluded.sog, cog=excluded.cog,
      heading=excluded.heading, nav_status=excluded.nav_status, recorded_at=now();
    insert into level.vessel_positions (mmsi, lat, lng, sog, cog, heading, nav_status, recorded_at)
    values ((r->>'mmsi')::bigint, (r->>'lat')::float8, (r->>'lng')::float8,
            nullif(r->>'sog','')::float8, nullif(r->>'cog','')::float8,
            nullif(r->>'heading','')::float8, nullif(r->>'nav_status','')::int, now());
    n := n + 1;
  end loop;
  return n;
end $$;
grant execute on function public.ingest_ais(jsonb) to anon, authenticated, service_role;
