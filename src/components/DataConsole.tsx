"use client";
import { useState } from "react";
import type { Facility, Port } from "@/lib/types";
import { useAuth, type Role } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PRODUCT_LABELS } from "@/lib/format";
import { FX_PER_USD, fmtUsdCents } from "@/lib/market";

const PRODUCTS = ["PMS", "AGO", "DPK", "ATK", "LPG", "CRUDE"] as const;

// Posting a price in a foreign market auto-derives its country + unit.
const CURRENCY_META: Record<string, { country: string; location: string }> = {
  NGN: { country: "NG", location: "Apapa Average" },
  GHS: { country: "GH", location: "Tema" },
  XOF: { country: "CI", location: "Abidjan" },
  USD: { country: "NG", location: "Lagos" },
};
const unitFor = (currency: string, product: string) => `${currency}/${product === "LPG" ? "kg" : "litre"}`;

function useToast() {
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const show = (t: string, ok = true) => { setMsg({ t, ok }); setTimeout(() => setMsg(null), 3500); };
  return { msg, show };
}

const label = "eyebrow block mb-1.5";
const field =
  "w-full bg-base border border-line rounded-sm px-2.5 py-2 text-[12.5px] num focus:border-amber/60 focus:outline-none transition-colors";

function Card({ title, sub, can, children }: { title: string; sub: string; can: boolean; children: React.ReactNode }) {
  return (
    <div className={`panel p-4 flex flex-col ${can ? "" : "opacity-45 pointer-events-none"}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="eyebrow">{sub}</div>
          <h3 className="font-bold text-[14px] tracking-tight mt-0.5">{title}</h3>
        </div>
        {!can && <span className="num text-[9px] uppercase tracking-wider text-ink-mute px-1.5 py-0.5 rounded-sm bg-panel-2">no access</span>}
      </div>
      {/* fill the (grid-stretched) card height so the submit button pins to the bottom */}
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}

export default function DataConsole({
  facilities, ports,
}: { facilities: Facility[]; ports: Port[] }) {
  const { profile } = useAuth();
  const role: Role | undefined = profile?.role;
  const { msg, show } = useToast();

  const canReading = role === "ops" || role === "admin";
  const canPrice = role === "trader" || role === "finance" || role === "admin";
  const canAlert = role === "ops" || role === "trader" || role === "admin";
  const canBerth = role === "ops" || role === "admin";

  const storage = facilities.filter((f) => f.kind !== "terminal");

  // ---- form state ----
  const [rd, setRd] = useState({ facility: "", product: "PMS", volume: "", throughput: "" });
  const [pr, setPr] = useState({ product: "PMS", basis: "ex_depot", price: "", location: "Apapa Average", currency: "NGN" });
  const [al, setAl] = useState({ severity: "warning", category: "supply", title: "", body: "", product: "" });
  const [bt, setBt] = useState({ port: "", vessel: "", product: "PMS", volume: "", status: "expected", eta: "" });

  const submitReading = async () => {
    if (!rd.facility || !rd.volume) return show("Pick a facility and enter a volume", false);
    const { error } = await supabase.rpc("record_reading", {
      p_facility: rd.facility, p_product: rd.product,
      p_volume: Number(rd.volume),
      p_throughput: rd.throughput ? Number(rd.throughput) : null,
    });
    error ? show(error.message, false) : (show("Reading posted — dashboard updating live"), setRd({ ...rd, volume: "", throughput: "" }));
  };
  const submitPrice = async () => {
    if (!pr.price) return show("Enter a price", false);
    const meta = CURRENCY_META[pr.currency];
    const { error } = await supabase.rpc("record_price", {
      p_product: pr.product, p_basis: pr.basis, p_price: Number(pr.price),
      p_country: meta.country, p_location: pr.location, p_currency: pr.currency,
      p_unit: unitFor(pr.currency, pr.product),
    });
    error ? show(error.message, false) : (show("Price posted — ticker & market updating live"), setPr({ ...pr, price: "" }));
  };
  const submitAlert = async () => {
    if (!al.title) return show("Enter an alert title", false);
    const { error } = await supabase.rpc("post_alert", {
      p_severity: al.severity, p_category: al.category, p_title: al.title,
      p_body: al.body || null, p_product: al.product || null,
    });
    error ? show(error.message, false) : (show("Alert posted — feed updating live"), setAl({ ...al, title: "", body: "" }));
  };
  const submitBerth = async () => {
    if (!bt.port || !bt.vessel) return show("Pick a port and enter a vessel", false);
    const { error } = await supabase.rpc("upsert_berth", {
      p_port: bt.port, p_vessel_name: bt.vessel, p_product: bt.product,
      p_volume_mt: bt.volume ? Number(bt.volume) : null, p_status: bt.status,
      p_eta: bt.eta ? new Date(bt.eta).toISOString() : null,
    });
    error ? show(error.message, false) : (show("Berth entry saved — schedule updating live"), setBt({ ...bt, vessel: "", volume: "", eta: "" }));
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="eyebrow">Operations · Data Entry</div>
          <h2 className="text-[17px] font-bold tracking-tight">Live Data Console</h2>
          <p className="text-ink-mute text-[11.5px] mt-0.5">
            Signed in as <span className="text-ink-dim">{profile?.full_name}</span>
            <span className="num"> · {role}</span>. Entries below write to the live feed instantly — every open dashboard updates in real time.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Reading */}
        <Card title="Update Tank / Refinery Stock" sub="Storage reading" can={canReading}>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <label className={label}>Facility</label>
              <select className={field} value={rd.facility} onChange={(e) => setRd({ ...rd, facility: e.target.value })}>
                <option value="">Select facility…</option>
                {storage.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Product</label>
              <select className={field} value={rd.product} onChange={(e) => setRd({ ...rd, product: e.target.value })}>
                {PRODUCTS.map((p) => <option key={p} value={p}>{PRODUCT_LABELS[p].split(" (")[0]}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Volume (m³)</label>
              <input className={field} type="number" value={rd.volume} onChange={(e) => setRd({ ...rd, volume: e.target.value })} placeholder="e.g. 42000" />
            </div>
            <div className="col-span-2">
              <label className={label}>Throughput / truck-out (m³/day) — optional</label>
              <input className={field} type="number" value={rd.throughput} onChange={(e) => setRd({ ...rd, throughput: e.target.value })} placeholder="carries forward if blank" />
            </div>
          </div>
          <div className="mt-auto pt-3">
            <button onClick={submitReading} className="w-full bg-teal/90 text-base font-bold text-[12px] rounded-sm py-2 tracking-wide hover:bg-teal transition-colors">POST READING</button>
          </div>
        </Card>

        {/* Price */}
        <Card title="Post Market Price" sub="Pricing desk" can={canPrice}>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={label}>Product</label>
              <select className={field} value={pr.product} onChange={(e) => setPr({ ...pr, product: e.target.value })}>
                {PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Basis</label>
              <select className={field} value={pr.basis} onChange={(e) => setPr({ ...pr, basis: e.target.value })}>
                <option value="ex_depot">Ex-Depot</option>
                <option value="ex_refinery">Ex-Refinery</option>
                <option value="import_parity">Import Parity</option>
              </select>
            </div>
            <div>
              <label className={label}>Currency / Market</label>
              <select className={field} value={pr.currency}
                onChange={(e) => setPr({ ...pr, currency: e.target.value, location: CURRENCY_META[e.target.value].location })}>
                <option value="NGN">NGN · Nigeria</option>
                <option value="GHS">GHS · Ghana</option>
                <option value="XOF">XOF · Côte d&apos;Ivoire</option>
                <option value="USD">USD · benchmark</option>
              </select>
            </div>
            <div>
              <label className={label}>Location</label>
              <input className={field} value={pr.location} onChange={(e) => setPr({ ...pr, location: e.target.value })} placeholder="Apapa Average" />
            </div>
            <div className="col-span-2">
              <label className={label}>Price ({unitFor(pr.currency, pr.product)})</label>
              <input className={field} type="number" value={pr.price} onChange={(e) => setPr({ ...pr, price: e.target.value })} placeholder="e.g. 915" />
            </div>
          </div>
          {pr.price && Number(pr.price) > 0 && (
            <div className="mt-2 flex items-center justify-between text-[10.5px] num bg-base-2/50 border border-line rounded-sm px-2.5 py-1.5">
              <span className="text-ink-mute">USD-normalised</span>
              <span className="text-ink-dim">
                {fmtUsdCents((Number(pr.price) / (FX_PER_USD[pr.currency] ?? 1)) * 100)}/L
                <span className="text-ink-mute"> @ {pr.currency} {FX_PER_USD[pr.currency]}/$</span>
              </span>
            </div>
          )}
          <div className="mt-auto pt-3">
            <button onClick={submitPrice} className="w-full bg-amber text-base font-bold text-[12px] rounded-sm py-2 tracking-wide hover:bg-amber/90 transition-colors">POST PRICE</button>
          </div>
        </Card>

        {/* Alert */}
        <Card title="Broadcast Alert" sub="Intelligence feed" can={canAlert}>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={label}>Severity</label>
              <select className={field} value={al.severity} onChange={(e) => setAl({ ...al, severity: e.target.value })}>
                <option value="info">Info</option><option value="warning">Warning</option><option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className={label}>Category</label>
              <select className={field} value={al.category} onChange={(e) => setAl({ ...al, category: e.target.value })}>
                <option value="supply">Supply</option><option value="price">Price</option><option value="demurrage">Demurrage</option>
                <option value="vessel">Vessel</option><option value="disruption">Disruption</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={label}>Title</label>
              <input className={field} value={al.title} onChange={(e) => setAl({ ...al, title: e.target.value })} placeholder="e.g. Apapa berth window opening" />
            </div>
            <div className="col-span-2">
              <label className={label}>Detail — optional</label>
              <input className={field} value={al.body} onChange={(e) => setAl({ ...al, body: e.target.value })} placeholder="context / recommendation" />
            </div>
          </div>
          <div className="mt-auto pt-3">
            <button onClick={submitAlert} className="w-full bg-blue/90 text-base font-bold text-[12px] rounded-sm py-2 tracking-wide hover:bg-blue transition-colors">BROADCAST ALERT</button>
          </div>
        </Card>

        {/* Berth */}
        <Card title="Add / Update Berthing" sub="Port schedule" can={canBerth}>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <label className={label}>Port</label>
              <select className={field} value={bt.port} onChange={(e) => setBt({ ...bt, port: e.target.value })}>
                <option value="">Select port…</option>
                {ports.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Vessel name</label>
              <input className={field} value={bt.vessel} onChange={(e) => setBt({ ...bt, vessel: e.target.value })} placeholder="MT …" />
            </div>
            <div>
              <label className={label}>Product</label>
              <select className={field} value={bt.product} onChange={(e) => setBt({ ...bt, product: e.target.value })}>
                {PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Cargo (MT)</label>
              <input className={field} type="number" value={bt.volume} onChange={(e) => setBt({ ...bt, volume: e.target.value })} placeholder="e.g. 30000" />
            </div>
            <div>
              <label className={label}>Status</label>
              <select className={field} value={bt.status} onChange={(e) => setBt({ ...bt, status: e.target.value })}>
                <option value="expected">Expected</option><option value="anchored">Anchored</option>
                <option value="berthed">Berthed</option><option value="discharging">Discharging</option><option value="departed">Departed</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={label}>ETA — optional</label>
              <input className={field} type="datetime-local" value={bt.eta} onChange={(e) => setBt({ ...bt, eta: e.target.value })} />
            </div>
          </div>
          <div className="mt-auto pt-3">
            <button onClick={submitBerth} className="w-full bg-ink text-base font-bold text-[12px] rounded-sm py-2 tracking-wide hover:bg-ink/90 transition-colors">SAVE BERTH ENTRY</button>
          </div>
        </Card>
      </div>

      {msg && (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-sm border num text-[12px] rise
          ${msg.ok ? "bg-teal/15 border-teal/40 text-teal" : "bg-red/15 border-red/40 text-red"}`}>
          {msg.ok ? "✓ " : "✕ "}{msg.t}
        </div>
      )}
    </div>
  );
}
