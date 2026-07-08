// Throwaway diagnostic — does NOT write to the database.
// Subscribes to a guaranteed-busy area (English Channel / Rotterdam) to confirm
// the aisstream connection + subscription work. If messages flow here but not off
// West Africa, the issue is regional AIS coverage, not the pipeline.
//
// Run:  node --env-file=.env.local worker/ais-probe.mjs   (auto-exits after 25s)

const API_KEY = process.env.AISSTREAM_API_KEY;
if (!API_KEY) { console.error("AISSTREAM_API_KEY missing in .env.local"); process.exit(1); }

// [[SW lat, SW lon], [NE lat, NE lon]] — Dover / Rotterdam / Antwerp approaches
const BUSY = [[[49.5, -1.0], [53.5, 5.5]]];

let received = 0, positions = 0;
const samples = [];

const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");

ws.addEventListener("open", () => {
  console.log("→ connected. Subscribing to English Channel / Rotterdam (known-busy)…\n");
  ws.send(JSON.stringify({ APIKey: API_KEY, BoundingBoxes: BUSY }));
});

ws.addEventListener("message", (ev) => {
  let msg; try { msg = JSON.parse(ev.data.toString()); } catch { return; }
  received++;
  if (msg.error || msg.Error) { console.error("aisstream error:", msg.error || msg.Error); return; }
  if (msg.MessageType === "PositionReport") {
    positions++;
    if (samples.length < 5) {
      const m = msg.MetaData || {};
      samples.push(`${(m.ShipName || "?").trim()}  @ ${(+m.latitude).toFixed(2)}, ${(+m.longitude).toFixed(2)}`);
    }
  }
  process.stdout.write(`\r⟳ received ${received} msgs · ${positions} positions   `);
});

ws.addEventListener("error", (e) => console.error("\nws error:", e.message || e));
ws.addEventListener("close", (e) =>
  console.error(`\n✖ connection CLOSED by server — code ${e.code}, reason: "${e.reason || "(none given)"}"`));

setTimeout(() => {
  console.log(`\n\n─── RESULT ───`);
  console.log(`total messages: ${received}`);
  console.log(`position reports: ${positions}`);
  if (samples.length) { console.log("sample vessels:"); samples.forEach((s) => console.log("  • " + s)); }
  console.log(
    received > 0
      ? "\n✅ Pipeline + credentials work. The West Africa box was empty purely due to free-AIS coverage."
      : "\n⚠️  Still zero — likely an account/subscription limit on the aisstream key. Let's check the key."
  );
  ws.close();
  process.exit(0);
}, 15000);
