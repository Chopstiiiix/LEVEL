import { createClient } from "@supabase/supabase-js";

// Publishable (public) values — safe to inline as build-time fallbacks so deploys
// work without extra env config. Override via .env.local / Vercel env if desired.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://amxkbtjibfgvykexvkus.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_m9sO51n0diCubkahEou0TQ_-srhD-ET";

// Single shared client. The publishable key is safe in the browser (RLS enforced).
// Reads hit the public `lvl_*` views; realtime subscribes to the base `level.*` tables.
export const supabase = createClient(url, key, {
  realtime: { params: { eventsPerSecond: 5 } },
});
