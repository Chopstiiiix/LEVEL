create or replace function public.record_reading(
  p_facility uuid, p_product text, p_volume numeric,
  p_capacity numeric default null, p_throughput numeric default null)
returns bigint language plpgsql security definer set search_path = level, public as $$
declare r level.user_role := level.current_role(); rid bigint; cap numeric := p_capacity; thr numeric := p_throughput;
begin
  if r is null or r not in ('ops','admin') then
    raise exception 'not authorized: role % cannot record readings', coalesce(r::text,'anonymous');
  end if;
  -- carry forward last known capacity / throughput when omitted
  if cap is null or thr is null then
    select coalesce(cap, capacity_m3), coalesce(thr, throughput_m3_day)
      into cap, thr
    from level.facility_readings
    where facility_id = p_facility and product = p_product::level.product
    order by recorded_at desc limit 1;
  end if;
  insert into level.facility_readings (facility_id, product, volume_m3, capacity_m3, throughput_m3_day, source)
  values (p_facility, p_product::level.product, p_volume, cap, thr, 'manual')
  returning id into rid;
  return rid;
end $$;
grant execute on function public.record_reading(uuid,text,numeric,numeric,numeric) to authenticated;
