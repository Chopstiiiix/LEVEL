"use client";
import { useMemo, useState } from "react";
import type { DashboardData, Product } from "@/lib/types";
import { fmtPrice, PRODUCT_COLORS, BASIS_LABELS } from "@/lib/format";
import {
  buildSpreads, crossBorder, toUsdCentsPerL, fmtUsdCents, COUNTRY_LABELS,
  productLabelShort, FX_PER_USD,
} from "@/lib/market";

const PANEL_HEAD = "px-4 pt-3 pb-2 border-b border-line";

function TrendChart({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2)
    return <div className="h-[120px] grid place-items-center text-ink-mute text-[11px] num">insufficient history</div>;
  const w = 520, h = 120, pad = 6;
  const min = Math.min(...data), max = Math.max(...data);
  const rng = max - min || 1;
  const x = (i: number) => pad + (i / (data.length - 1)) * (w - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / rng) * (h - pad * 2);
  const line = data.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `${x(0)},${h - pad} ${line} ${x(data.length - 1)},${h - pad}`;
  const up = data[data.length - 1] >= data[0];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 120 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="mkt-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#mkt-fill)" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r="3" fill={up ? "var(--color-teal)" : "var(--color-red)"} />
    </svg>
  );
}

export default function MarketTab({ data }: { data: DashboardData }) {
  const { prices, pmsSpark } = data;
  const spreads = useMemo(() => buildSpreads(prices), [prices]);
  const products = useMemo<Product[]>(() => {
    const set = new Set<Product>(prices.map((p) => p.product));
    return (["PMS", "AGO", "DPK", "ATK", "LPG"] as Product[]).filter((p) => set.has(p));
  }, [prices]);
  const bases = ["ex_refinery", "ex_depot", "import_parity"] as const;

  const [borderProduct, setBorderProduct] = useState<Product>("PMS");
  const border = useMemo(() => crossBorder(prices, borderProduct), [prices, borderProduct]);
  const borderMax = Math.max(1, ...border.map((b) => b.usdCents));

  const pms = spreads.find((s) => s.product === "PMS");
  const cheapest = border[0];
  const dearest = border[border.length - 1];
  const arbSpread = cheapest && dearest ? dearest.usdCents - cheapest.usdCents : 0;

  const matrix = (product: Product, basis: string) =>
    prices.find((p) => p.product === product && p.basis === basis && p.country_code === "NG") ??
    prices.find((p) => p.product === product && p.basis === basis) ?? null;

  const kpis = [
    {
      label: "PMS Refining Dividend",
      value: pms?.dividendLocal != null ? `₦${pms.dividendLocal.toFixed(0)}` : "—",
      unit: "/L vs import",
      sub: pms?.dividendPct != null ? `${pms.dividendPct.toFixed(1)}% below import parity` : "—",
      tone: "teal" as const,
    },
    {
      label: "Cheapest PMS · Region",
      value: cheapest ? fmtUsdCents(cheapest.usdCents) : "—",
      unit: "/L",
      sub: cheapest ? `${cheapest.location} · ${COUNTRY_LABELS[cheapest.country_code] ?? cheapest.country_code}` : "—",
      tone: "amber" as const,
    },
    {
      label: "Cross-Border PMS Spread",
      value: fmtUsdCents(arbSpread),
      unit: "/L",
      sub: cheapest && dearest ? `${cheapest.country_code} → ${dearest.country_code} arbitrage` : "—",
      tone: "blue" as const,
    },
    {
      label: "Depot Margin · PMS",
      value: pms?.depotMargin != null ? `₦${pms.depotMargin.toFixed(0)}` : "—",
      unit: "/L",
      sub: "ex-depot over ex-refinery",
      tone: "neutral" as const,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="eyebrow">Pricing &amp; Arbitrage · Downstream</div>
        <h2 className="text-[17px] font-bold tracking-tight">Market Intelligence</h2>
        <p className="text-ink-mute text-[11.5px] mt-0.5 max-w-[720px]">
          Multi-currency ex-refinery, ex-depot and import-parity prices normalised to a common USD/litre basis —
          exposing the local refining dividend and cross-border arbitrage across the West-African corridor.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
          <div key={k.label} className="panel rise px-4 py-3 flex flex-col justify-between min-h-[92px]"
            style={{ animationDelay: `${i * 60}ms` }}>
            <span className="eyebrow">{k.label}</span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="num text-[26px] leading-none font-semibold"
                style={{ color: `var(--color-${k.tone === "neutral" ? "ink" : k.tone})` }}>{k.value}</span>
              <span className="text-ink-mute text-[11px] num">{k.unit}</span>
            </div>
            <div className="mt-1.5 text-[11px] text-ink-dim">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Price matrix */}
        <div className="lg:col-span-7 panel rise" style={{ animationDelay: "80ms" }}>
          <div className={PANEL_HEAD}>
            <div className="eyebrow">Live · Product × Basis</div>
            <h3 className="font-bold text-[14px] tracking-tight mt-0.5">Price Matrix</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-[12px]">
              <thead>
                <tr className="eyebrow text-ink-mute">
                  <th className="text-left font-normal px-4 py-2">Product</th>
                  {bases.map((b) => (
                    <th key={b} className="text-right font-normal py-2 px-3">{BASIS_LABELS[b]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product} className="border-t border-line/60 hover:bg-panel-2 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-sm" style={{ background: PRODUCT_COLORS[product] }} />
                        <span className="text-ink">{productLabelShort(product)}</span>
                      </span>
                    </td>
                    {bases.map((basis) => {
                      const p = matrix(product, basis);
                      return (
                        <td key={basis} className="text-right px-3 py-2.5">
                          {p ? (
                            <>
                              <div className="num text-ink">{fmtPrice(p.price, p.currency)}</div>
                              <div className="num text-[9.5px] text-ink-mute">{fmtUsdCents(toUsdCentsPerL(p))}/L</div>
                            </>
                          ) : <span className="text-ink-mute/50">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-line text-[10px] text-ink-mute num">
            USD conversion @ indicative FX · ₦{FX_PER_USD.NGN}/$ · GH₵{FX_PER_USD.GHS}/$ · CFA {FX_PER_USD.XOF}/$
          </div>
        </div>

        {/* Refining dividend */}
        <div className="lg:col-span-5 panel rise" style={{ animationDelay: "120ms" }}>
          <div className={PANEL_HEAD}>
            <div className="eyebrow">Local Refining vs Import Parity</div>
            <h3 className="font-bold text-[14px] tracking-tight mt-0.5">Refining Dividend</h3>
          </div>
          <div className="p-3 space-y-3">
            {spreads.filter((s) => s.dividendLocal != null).map((s) => {
              const positive = (s.dividendLocal ?? 0) >= 0;
              const color = positive ? "var(--color-teal)" : "var(--color-red)";
              const w = Math.min(100, Math.abs(s.dividendPct ?? 0) * 5);
              return (
                <div key={s.product}>
                  <div className="flex items-center justify-between text-[11.5px]">
                    <span className="flex items-center gap-1.5 text-ink">
                      <span className="w-2 h-2 rounded-sm" style={{ background: PRODUCT_COLORS[s.product] }} />
                      {productLabelShort(s.product)}
                    </span>
                    <span className="num" style={{ color }}>
                      {positive ? "−" : "+"}₦{Math.abs(s.dividendLocal ?? 0).toFixed(0)}/L
                      <span className="text-ink-mute"> ({(s.dividendPct ?? 0).toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-line-2 mt-1.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${w}%`, background: color }} />
                  </div>
                  <div className="flex justify-between text-[9.5px] num text-ink-mute mt-1">
                    <span>refinery {s.exRefinery ? fmtPrice(s.exRefinery.price, s.exRefinery.currency) : "—"}</span>
                    <span>import {s.importParity ? fmtPrice(s.importParity.price, s.importParity.currency) : "—"}</span>
                  </div>
                </div>
              );
            })}
            <p className="text-[10.5px] text-ink-mute leading-relaxed pt-1 border-t border-line">
              Positive dividend = domestic refining lands product below the cost of importing it — the margin
              available to local refiners and the buffer against FX-driven import shocks.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Cross-border */}
        <div className="lg:col-span-7 panel rise" style={{ animationDelay: "140ms" }}>
          <div className={`${PANEL_HEAD} flex items-center justify-between`}>
            <div>
              <div className="eyebrow">Same Fuel · USD-Normalised</div>
              <h3 className="font-bold text-[14px] tracking-tight mt-0.5">Cross-Border Price Comparison</h3>
            </div>
            <div className="flex gap-1">
              {products.filter((p) => crossBorder(prices, p).length > 1).map((p) => (
                <button key={p} onClick={() => setBorderProduct(p)}
                  className={`num text-[10px] px-2 py-1 rounded-sm transition-colors ${
                    borderProduct === p ? "bg-panel-2 text-ink" : "text-ink-mute hover:text-ink-dim"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3 space-y-2.5">
            {border.length < 1 && <div className="text-ink-mute text-[11px] num py-6 text-center">no ex-depot quotes for {borderProduct}</div>}
            {border.map((r, i) => (
              <div key={r.location} className="flex items-center gap-3">
                <div className="w-[130px] shrink-0">
                  <div className="text-[12px] text-ink truncate">{r.location}</div>
                  <div className="text-[9.5px] num text-ink-mute">{COUNTRY_LABELS[r.country_code] ?? r.country_code}</div>
                </div>
                <div className="flex-1 h-6 bg-line-2/40 rounded-sm overflow-hidden relative">
                  <div className="h-full rounded-sm flex items-center justify-end pr-2"
                    style={{ width: `${(r.usdCents / borderMax) * 100}%`,
                      background: i === 0 ? "var(--color-teal)" : i === border.length - 1 ? "var(--color-red)" : "var(--color-amber)",
                      opacity: 0.85, transition: "width .5s" }}>
                    <span className="num text-[10.5px] text-base font-semibold">{fmtUsdCents(r.usdCents)}</span>
                  </div>
                </div>
                <div className="w-[92px] shrink-0 text-right num text-[11px] text-ink-dim">
                  {fmtPrice(r.price.price, r.price.currency)}
                </div>
              </div>
            ))}
            <p className="text-[10.5px] text-ink-mute pt-1">
              Cheapest and dearest markets flagged — the spread is the theoretical cross-border arbitrage before
              transport, duty and cabotage friction.
            </p>
          </div>
        </div>

        {/* PMS trend */}
        <div className="lg:col-span-5 panel rise" style={{ animationDelay: "160ms" }}>
          <div className={PANEL_HEAD}>
            <div className="flex items-center justify-between">
              <div>
                <div className="eyebrow">PMS · Apapa Average</div>
                <h3 className="font-bold text-[14px] tracking-tight mt-0.5">Ex-Depot Trend</h3>
              </div>
              {pmsSpark.length > 1 && (
                <div className="text-right">
                  <div className="num text-[18px] font-semibold text-ink">₦{pmsSpark[pmsSpark.length - 1].toFixed(0)}</div>
                  <div className={`num text-[10.5px] ${pmsSpark[pmsSpark.length - 1] >= pmsSpark[0] ? "text-teal" : "text-red"}`}>
                    {pmsSpark[pmsSpark.length - 1] >= pmsSpark[0] ? "▲" : "▼"} ₦{Math.abs(pmsSpark[pmsSpark.length - 1] - pmsSpark[0]).toFixed(0)}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="p-3">
            <TrendChart data={pmsSpark} color="var(--color-amber)" />
            <div className="grid grid-cols-3 gap-2 mt-2 text-center">
              {[
                { k: "Open", v: pmsSpark.length ? `₦${pmsSpark[0].toFixed(0)}` : "—" },
                { k: "High", v: pmsSpark.length ? `₦${Math.max(...pmsSpark).toFixed(0)}` : "—" },
                { k: "Low", v: pmsSpark.length ? `₦${Math.min(...pmsSpark).toFixed(0)}` : "—" },
              ].map((s) => (
                <div key={s.k} className="bg-base-2/50 border border-line rounded-sm py-2">
                  <div className="num text-[15px] text-ink font-semibold">{s.v}</div>
                  <div className="eyebrow !text-[8px] mt-0.5">{s.k}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
