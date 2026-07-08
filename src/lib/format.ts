import type { Product } from "./types";

// Volume in m³ → compact human string (e.g. 870,860 → "871k m³")
export function fmtVolume(m3: number | null | undefined): string {
  if (m3 == null) return "—";
  if (m3 >= 1_000_000) return `${(m3 / 1_000_000).toFixed(2)}M`;
  if (m3 >= 1_000) return `${Math.round(m3 / 1_000)}k`;
  return `${Math.round(m3)}`;
}

export function fmtNum(n: number | null | undefined, dp = 0): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

export function fmtPrice(p: number, currency: string): string {
  const sym = currency === "NGN" ? "₦" : currency === "GHS" ? "GH₵" : currency === "XOF" ? "CFA " : "";
  return `${sym}${p.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function pct(part: number, whole: number | null | undefined): number {
  if (!whole || whole <= 0) return 0;
  return Math.min(100, Math.max(0, (part / whole) * 100));
}

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export const PRODUCT_COLORS: Record<Product, string> = {
  PMS: "#F5A623", // petrol — amber
  AGO: "#2FD4A7", // diesel — teal
  DPK: "#8B7CF0", // kerosene — violet
  ATK: "#46B1FF", // jet — blue
  LPG: "#FF7A9C", // gas — pink
  CRUDE: "#C77B45", // crude — burnt sienna
  LNG: "#5FD0E0",
};

export const PRODUCT_LABELS: Record<Product, string> = {
  PMS: "Petrol (PMS)",
  AGO: "Diesel (AGO)",
  DPK: "Kerosene (DPK)",
  ATK: "Jet A1 (ATK)",
  LPG: "Cooking Gas (LPG)",
  CRUDE: "Crude Oil",
  LNG: "LNG",
};

export const BASIS_LABELS: Record<string, string> = {
  ex_depot: "Ex-Depot",
  ex_refinery: "Ex-Refinery",
  import_parity: "Import Parity",
  platts: "Platts",
};
