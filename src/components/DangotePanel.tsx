"use client";
import type { Facility, FacilityLatest } from "@/lib/types";
import { fmtVolume, fmtNum, pct, PRODUCT_COLORS, PRODUCT_LABELS } from "@/lib/format";

function Gauge({ value }: { value: number }) {
  // semicircular gauge, value 0-100
  const R = 78, cx = 96, cy = 96, sw = 12;
  const a0 = Math.PI, a1 = 0; // 180° -> 0°
  const ang = a0 + (a1 - a0) * (value / 100);
  const pt = (a: number) => [cx + R * Math.cos(a), cy - R * Math.sin(a)];
  const [sx, sy] = pt(a0);
  const [ex, ey] = pt(ang);
  const [fx, fy] = pt(a1);
  // a value arc across a 180° gauge is always ≤ 180°, so never use the large-arc flag
  const large = 0;
  const col = value > 88 ? "var(--color-red)" : value < 20 ? "var(--color-amber)" : "var(--color-teal)";
  return (
    <svg viewBox="0 0 192 116" className="w-full max-w-[220px]">
      <defs>
        <linearGradient id="gg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--color-amber)" />
          <stop offset="1" stopColor={col} />
        </linearGradient>
      </defs>
      {/* track */}
      <path d={`M ${sx} ${sy} A ${R} ${R} 0 1 1 ${fx} ${fy}`} fill="none"
        stroke="var(--color-line-2)" strokeWidth={sw} strokeLinecap="round" />
      {/* value arc */}
      <path d={`M ${sx} ${sy} A ${R} ${R} 0 ${large} 1 ${ex} ${ey}`} fill="none"
        stroke="url(#gg)" strokeWidth={sw} strokeLinecap="round"
        style={{ transition: "all 0.8s cubic-bezier(0.2,0.7,0.2,1)" }} />
      {/* needle tick */}
      <circle cx={ex} cy={ey} r="4.5" fill="var(--color-ink)" />
      <text x="96" y="86" textAnchor="middle" className="num" fontSize="30"
        fontWeight="600" fill="var(--color-ink)">{Math.round(value)}%</text>
      <text x="96" y="104" textAnchor="middle" className="num" fontSize="9"
        letterSpacing="2" fill="var(--color-ink-mute)">CRUDE UTILISATION</text>
    </svg>
  );
}

export default function DangotePanel({
  facility, readings,
}: { facility: Facility | undefined; readings: FacilityLatest[] }) {
  if (!facility) return null;
  const byProd = new Map(readings.map((r) => [r.product, r]));
  const crude = byProd.get("CRUDE");
  const crudeFill = crude ? pct(crude.volume_m3, crude.capacity_m3) : 0;
  const products = (["PMS", "AGO", "DPK", "ATK"] as const)
    .map((p) => byProd.get(p))
    .filter(Boolean) as FacilityLatest[];

  return (
    <div className="panel rise p-4 flex flex-col" style={{ animationDelay: "60ms" }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="eyebrow">Flagship · Refinery</div>
          <h3 className="font-sans font-bold text-[15px] tracking-tight mt-0.5 flex items-center gap-2">
            {facility.name}
            <span className="text-[9px] font-mono font-normal px-1.5 py-0.5 rounded-sm bg-amber/15 text-amber tracking-widest uppercase">
              Live
            </span>
          </h3>
          <div className="text-[11px] text-ink-mute mt-0.5">
            Lekki, Nigeria · {fmtVolume(facility.capacity_m3)} m³ capacity
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center py-2">
        <Gauge value={crudeFill} />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-3 mt-auto border-t border-line">
        {products.map((r) => {
          const fill = pct(r.volume_m3, r.capacity_m3);
          return (
            <div key={r.product}>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="flex items-center gap-1.5 text-ink-dim">
                  <span className="w-2 h-2 rounded-sm" style={{ background: PRODUCT_COLORS[r.product] }} />
                  {PRODUCT_LABELS[r.product].split(" (")[0]}
                </span>
                <span className="num text-ink">{fmtVolume(r.volume_m3)} m³</span>
              </div>
              <div className="h-1.5 rounded-full bg-line-2 overflow-hidden">
                <div className="h-full rounded-full"
                  style={{ width: `${fill}%`, background: PRODUCT_COLORS[r.product], transition: "width 0.8s" }} />
              </div>
              <div className="text-[10px] text-ink-mute num mt-1">
                out {fmtNum(r.throughput_m3_day)} m³/day
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
