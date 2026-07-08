// LEVEL — live AIS ingestion worker
// Connects to aisstream.io, filters the Gulf of Guinea / West Africa bounding box,
// and streams vessel positions into Supabase via the public.ingest_ais() RPC.
//
// Run:  npm run ais       (needs AISSTREAM_API_KEY in .env.local)
//
// Uses Node's built-in global WebSocket (Node 22+). No extra dependencies.
import { createClient } from "@supabase/supabase-js";

const API_KEY = process.env.AISSTREAM_API_KEY;
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!API_KEY) {
  console.error("\n✗ AISSTREAM_API_KEY missing. Get a free key at https://aisstream.io and add it to .env.local\n");
  process.exit(1);
}

const supabase = createClient(SB_URL, SB_KEY);

// West Africa: [[SW lat, SW lon], [NE lat, NE lon]]
const BBOX = [[[3.0, -18.5], [16.0, 10.0]]];

const buffer = new Map(); // mmsi -> latest record (dedupe within a flush window)
const nameCache = new Map();
let sent = 0;
let received = 0;   // any message from the stream
let positions = 0;  // PositionReport messages seen

// Heartbeat so a quiet region still shows the worker is alive.
setInterval(() => {
  if (positions === 0) {
    process.stdout.write(`\r… listening — ${received} msgs from stream, 0 positions yet (Gulf of Guinea coverage is sparse)   `);
  }
}, 10000);

async function flush() {
  if (buffer.size === 0) return;
  const rows = [...buffer.values()];
  buffer.clear();
  const { data, error } = await supabase.rpc("ingest_ais", { rows });
  if (error) console.error("ingest error:", error.message);
  else { sent += rows.length; process.stdout.write(`\r⟳ streamed ${sent} positions (last batch ${data})   `); }
}
setInterval(flush, 3000);

function connect() {
  const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");

  ws.addEventListener("open", () => {
    console.log("→ connected to aisstream.io — subscribing to West Africa bbox");
    ws.send(JSON.stringify({
      APIKey: API_KEY,
      BoundingBoxes: BBOX,
      FilterMessageTypes: ["PositionReport", "ShipStaticData"],
    }));
  });

  ws.addEventListener("message", (ev) => {
    let msg;
    try { msg = JSON.parse(typeof ev.data === "string" ? ev.data : ev.data.toString()); }
    catch { return; }
    received++;
    if (msg.error || msg.Error) { console.error("\naisstream error:", msg.error || msg.Error); return; }
    if (msg.MessageType === "PositionReport") positions++;
    const meta = msg.MetaData || {};
    const mmsi = meta.MMSI || meta.UserID;
    if (!mmsi) return;

    if (msg.MessageType === "ShipStaticData") {
      const name = (meta.ShipName || msg.Message?.ShipStaticData?.Name || "").trim();
      if (name) nameCache.set(mmsi, name);
      return;
    }

    if (msg.MessageType === "PositionReport") {
      const pr = msg.Message?.PositionReport || {};
      const lat = meta.latitude ?? pr.Latitude;
      const lng = meta.longitude ?? pr.Longitude;
      if (lat == null || lng == null) return;
      buffer.set(mmsi, {
        mmsi,
        name: (meta.ShipName || nameCache.get(mmsi) || "").trim(),
        lat, lng,
        sog: pr.Sog ?? null,
        cog: pr.Cog ?? null,
        heading: pr.TrueHeading != null && pr.TrueHeading !== 511 ? pr.TrueHeading : null,
        nav_status: pr.NavigationalStatus ?? null,
      });
    }
  });

  ws.addEventListener("close", () => {
    console.log("\n… connection closed, reconnecting in 5s");
    setTimeout(connect, 5000);
  });
  ws.addEventListener("error", (e) => {
    console.error("\nws error:", e.message || e);
    try { ws.close(); } catch {}
  });
}

console.log("LEVEL AIS worker starting…");
connect();
