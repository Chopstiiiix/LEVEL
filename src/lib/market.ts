// LEVEL — downstream pricing & arbitrage model.
// Normalises multi-currency West-African fuel prices to a common USD/litre basis
// so cross-border spreads, the refinery-vs-import dividend, and margin stacks
// are comparable. FX is indicative (planning), not a live feed.

import type { Price, Product } from "./types";
import { PRODUCT_LABELS } from "./format";

// Indicative mid-2026 FX — units of local currency per 1 USD.
export const FX_PER_USD: Record<string, number> = {
  USD: 1,
  NGN: 1600,
  GHS: 15.2,
  XOF: 605,
};

export const COUNTRY_LABELS: Record<string, string> = {
  NG: "Nigeria",
  GH: "Ghana",
  CI: "Côte d'Ivoire",
  SN: "Senegal",
  TG: "Togo",
  BJ: "Benin",
};

// Convert a price (local currency per litre or kg) to US cents per litre.
export function toUsdCentsPerL(p: Pick<Price, "price" | "currency">): number {
  const fx = FX_PER_USD[p.currency] ?? 1;
  return (p.price / fx) * 100;
}

export function fmtUsdCents(c: number): string {
  return `${c.toFixed(1)}¢`;
}

// The refining dividend: how much cheaper local ex-refinery product is than the
// import-parity cost of landing the same barrel. Positive = local refining wins.
export interface Spread {
  product: Product;
  exRefinery: Price | null;
  importParity: Price | null;
  exDepot: Price | null;
  dividendLocal: number | null;   // import_parity − ex_refinery, in local ccy/L
  dividendPct: number | null;
  depotMargin: number | null;     // ex_depot − ex_refinery
}

export function buildSpreads(prices: Price[]): Spread[] {
  const products: Product[] = ["PMS", "AGO", "DPK", "ATK"];
  const pick = (product: Product, basis: string) =>
    prices.find((p) => p.product === product && p.basis === basis && p.country_code === "NG") ??
    prices.find((p) => p.product === product && p.basis === basis) ?? null;

  return products
    .map((product) => {
      const exRefinery = pick(product, "ex_refinery");
      const importParity = pick(product, "import_parity");
      const exDepot = pick(product, "ex_depot");
      const dividendLocal =
        exRefinery && importParity ? importParity.price - exRefinery.price : null;
      const dividendPct =
        dividendLocal != null && importParity ? (dividendLocal / importParity.price) * 100 : null;
      const depotMargin = exRefinery && exDepot ? exDepot.price - exRefinery.price : null;
      return { product, exRefinery, importParity, exDepot, dividendLocal, dividendPct, depotMargin };
    })
    .filter((s) => s.exRefinery || s.exDepot || s.importParity);
}

// Cross-border comparison for a single product: same fuel, priced in each market,
// normalised to USD¢/L and ranked cheapest-first.
export interface BorderRow {
  location: string;
  country_code: string;
  price: Price;
  usdCents: number;
}

export function crossBorder(prices: Price[], product: Product): BorderRow[] {
  return prices
    .filter((p) => p.product === product && p.basis === "ex_depot")
    .map((price) => ({
      location: price.location ?? "—",
      country_code: price.country_code ?? "—",
      price,
      usdCents: toUsdCentsPerL(price),
    }))
    .sort((a, b) => a.usdCents - b.usdCents);
}

export const productLabelShort = (p: Product) => PRODUCT_LABELS[p].split(" (")[0];

// Deterministic intraday micro-trend derived from a seed price (for sparklines
// where the DB has only one history point). Stable across renders — no randomness.
export function seededTrend(seed: number, points = 24, ampPct = 1.6): number[] {
  const out: number[] = [];
  for (let i = 0; i < points; i++) {
    const wave = Math.sin(i * 0.7 + (seed % 7)) + Math.sin(i * 0.31 + (seed % 13)) * 0.6;
    out.push(seed * (1 + (wave / 2) * (ampPct / 100)));
  }
  return out;
}
