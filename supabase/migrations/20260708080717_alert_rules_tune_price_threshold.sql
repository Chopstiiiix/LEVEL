-- RULE 3 originally fired at >= 1.2% / >= 3%, but the real 24h moves in the
-- seeded series top out around 1.07% — so the price feed was always empty.
-- Retuned to >= 0.85% (info) / >= 2.5% (warning), still capped at the top 4 movers.
create or replace function level.evaluate_alerts() returns void
language plpgsql security definer set search_path to level, public as $$
begin
  delete from level.alerts where rule_key is not null;

  -- RULE 1 — berth congestion.
  insert into level.alerts (severity, category, title, body, port_id, rule_key, created_at)
  select
    (case when w.waiting >= 4 then 'critical' else 'warning' end)::level.alert_severity,
    'demurrage',
    'Berth congestion at ' || split_part(w.name,' (',1),
    w.waiting || ' vessel' || (case when w.waiting = 1 then '' else 's' end)
      || ' waiting to berth — demurrage exposure building.',
    w.port_id, 'congestion:' || w.port_id, now()
  from (
    select p.id as port_id, p.name,
           count(*) filter (where b.status in ('anchored','expected')) as waiting
    from level.ports p join level.berth_schedule b on b.port_id = p.id
    group by p.id, p.name
  ) w
  where w.waiting >= 2;

  -- RULE 2 — storage overfill.
  insert into level.alerts (severity, category, title, body, facility_id, rule_key, created_at)
  select
    (case when u.util >= 95 then 'critical' else 'warning' end)::level.alert_severity,
    'disruption',
    u.name || ' near capacity',
    'Storage at ' || round(u.util) || '% of capacity — overfill risk, schedule outflow.',
    u.facility_id, 'overfill:' || u.facility_id, now()
  from (
    select f.id as facility_id, f.name,
           (sum(fl.volume_m3) / nullif(f.capacity_m3,0)) * 100 as util
    from level.facilities f
    join lateral (
      select distinct on (product) product, volume_m3
      from level.facility_readings r where r.facility_id = f.id
      order by product, recorded_at desc
    ) fl on true
    where f.capacity_m3 is not null
    group by f.id, f.name, f.capacity_m3
  ) u
  where u.util >= 88;

  -- RULE 3 — 24h price moves (>= 0.85%, top 4 movers).
  insert into level.alerts (severity, category, title, body, product, rule_key, created_at)
  select
    (case when abs(m.move_pct) >= 2.5 then 'warning' else 'info' end)::level.alert_severity,
    'price',
    (m.product::text) || ' ' ||
      (case m.basis::text when 'ex_depot' then 'ex-depot' when 'ex_refinery' then 'ex-refinery' else 'import parity' end)
      || ' ' || (case when m.move_pct >= 0 then 'up ' else 'down ' end) || to_char(abs(m.move_pct),'FM990.0') || '%',
    coalesce(m.location,'') || ' ' || (m.product::text) || ' moved '
      || round(m.prev) || ' → ' || round(m.price) || ' ' || m.currency || ' over 24h.',
    m.product, 'pricemove:' || (m.product::text) || ':' || (m.basis::text) || ':' || coalesce(m.location,''), now()
  from (
    select l.product, l.basis, l.location, l.currency, l.price, pr.prev,
           ((l.price - pr.prev) / nullif(pr.prev,0)) * 100 as move_pct
    from (
      select distinct on (product, basis, coalesce(location,''))
        product, basis, location, currency, price, recorded_at
      from level.prices order by product, basis, coalesce(location,''), recorded_at desc
    ) l
    cross join lateral (
      select p.price as prev from level.prices p
      where p.product = l.product and p.basis = l.basis
        and coalesce(p.location,'') = coalesce(l.location,'')
        and p.recorded_at <= l.recorded_at - interval '24 hours'
      order by p.recorded_at desc limit 1
    ) pr
  ) m
  where abs(m.move_pct) >= 0.85
  order by abs(m.move_pct) desc
  limit 4;
end $$;
