"use client";
import type { Price } from "@/lib/types";
import { fmtPrice, BASIS_LABELS, PRODUCT_COLORS } from "@/lib/format";

export default function Ticker({ prices }: { prices: Price[] }) {
  const items = prices.filter((p) => p.basis !== "platts");
  if (items.length === 0) return null;
  const row = [...items, ...items]; // duplicate for seamless loop

  return (
    <div className="ticker-wrap relative overflow-hidden border-y border-line bg-base-2/60 h-9 flex items-center">
      <div className="ticker-track">
        {row.map((p, i) => (
          <span key={i} className="inline-flex items-center gap-2 px-5 text-[12px]">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: PRODUCT_COLORS[p.product] }}
            />
            <span className="text-ink-dim">{p.product}</span>
            <span className="text-ink-mute text-[10px] uppercase tracking-wider">
              {BASIS_LABELS[p.basis]}
            </span>
            <span className="text-ink-mute">{p.location}</span>
            <span className="num text-ink font-medium">{fmtPrice(p.price, p.currency)}</span>
            <span className="text-ink-mute text-[10px]">/{p.unit.split("/")[1]}</span>
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-base-2 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-base-2 to-transparent" />
    </div>
  );
}
