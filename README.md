# LEVEL — Oil & Gas Delivery & Transaction Intelligence

Real-time delivery, tank-farm, vessel and pricing intelligence for **Nigeria & West Africa**.
A control-room dashboard that aggregates Dangote Refinery output, tank-farm & depot stock,
live vessel tracking, berthing schedules, pricing and market alerts into one live feed.

This is the **Phase-1 working prototype**: a live-updating operations dashboard backed by a
real database, with a real AIS vessel feed.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router, TS), Tailwind v4 |
| Data / realtime / auth | Supabase (Postgres) — isolated `level` schema |
| Map | MapLibre GL + Carto dark basemap |
| Charts | Custom SVG gauges + sparklines |
| Live vessels | aisstream.io → `worker/ais.mjs` → `public.ingest_ais()` |

### How "live" works
- **Reads** hit thin `public.lvl_*` views over the `level.*` base tables.
- **Realtime**: the browser subscribes to `postgres_changes` on the `level.*` tables.
  Any DB write (operator entry, API feed, AIS worker) pushes to every open dashboard instantly.
- **Writes** (seed / AIS) bypass the API via SQL / the `ingest_ais` RPC.

---

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

`.env.local` already holds the Supabase URL + publishable key.

### Live vessel feed (optional)
1. Get a free key at **https://aisstream.io**
2. Put it in `.env.local` → `AISSTREAM_API_KEY=...`
3. In a second terminal:
   ```bash
   npm run ais
   ```
Real Gulf-of-Guinea vessels will stream onto the map, replacing the demo tankers.

---

## Data model (`level` schema)

`countries · ports · facilities · facility_readings · vessels · vessel_latest ·
vessel_positions · berth_schedule · prices · alerts`

Facilities cover refineries (Dangote flagship), tank farms (real Lagos operators) and depots.
`facility_readings` is the time-series stock/throughput table — the "live" human/API-sourced data.

---

## Roadmap (from the proposal)

- **Phase 1 (this):** ops dashboard, Dangote + Lagos tank farms, AIS, pricing, alerts.
- **Phase 2:** admin data-entry console, auth + role-based access (trader/ops/finance/exec),
  predictive ETAs, demurrage calculator, Ghana + Ivory Coast.
- **Phase 3:** transaction verification, enterprise API, regulator integrations, Senegal/Togo/Benin.

> Prototype note: refinery/tank-farm/depot volumes and prices are **seeded demo data** — no
> public API exists for them yet, so Phase 2 adds the operator/partner data-entry layer. AIS is
> a genuine live feed.
