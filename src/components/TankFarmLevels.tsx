"use client";
import { useMemo, useState } from "react";
import type { Facility, FacilityLatest } from "@/lib/types";
import { fmtVolume, pct } from "@/lib/format";

interface Row {
  facility: Facility;
  total: number;
  capacity: number;
  fill: number;
}

const KIND_LABEL: Record<string, string> = { tank_farm: "Tank Farm", depot: "Depot", refinery: "Refinery", terminal: "Terminal" };

export default function TankFarmLevels({
  facilities, readings,
}: { facilities: Facility[]; readings: FacilityLatest[] }) {
  const [filter, setFilter] = useState<"all" | "tank_farm" | "depot">("all");

  const rows = useMemo<Row[]>(() => {
    const byFac = new Map<string, { total: number; cap: number }>();
    for (const r of readings) {
      const cur = byFac.get(r.facility_id) ?? { total: 0, cap: 0 };
      cur.total += Number(r.volume_m3) || 0;
      cur.cap += Number(r.capacity_m3) || 0;
      byFac.set(r.facility_id, cur);
    }
    return facilities
      .filter((f) => f.kind === "tank_farm" || f.kind === "depot")
      .filter((f) => filter === "all" || f.kind === filter)
      .map((f) => {
        const agg = byFac.get(f.id) ?? { total: 0, cap: f.capacity_m3 ?? 0 };
        const cap = agg.cap || f.capacity_m3 || 0;
        return { facility: f, total: agg.total, capacity: cap, fill: pct(agg.total, cap) };
      })
      .sort((a, b) => b.fill - a.fill);
  }, [facilities, readings, filter]);

  const barColor = (fill: number) =>
    fill > 90 ? "var(--color-red)" : fill < 18 ? "var(--color-amber)" : "var(--color-teal)";

  return (
    <div className="panel rise flex flex-col min-h-[300px] sm:min-h-0 h-full" style={{ animationDelay: "120ms" }}>
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-line">
        <div>
          <div className="eyebrow">Storage · Nigeria & Region</div>
          <h3 className="font-bold text-[14px] tracking-tight mt-0.5">Tank Farm & Depot Levels</h3>
        </div>
        <div className="flex gap-1 text-[10px] font-mono">
          {(["all", "tank_farm", "depot"] as const).map((k) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-2 py-1 rounded-sm uppercase tracking-wider transition-colors ${
                filter === k ? "bg-amber/15 text-amber" : "text-ink-mute hover:text-ink-dim"
              }`}>
              {k === "all" ? "All" : KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-y-auto px-2 py-1.5 flex-1">
        {rows.map((r, i) => (
          <div key={r.facility.id}
            className="group flex items-center gap-3 px-2 py-1.5 rounded-sm hover:bg-panel-2 transition-colors">
            <span className="num text-[10px] text-ink-mute w-5 text-right">{String(i + 1).padStart(2, "0")}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] text-ink truncate">{r.facility.name}</span>
                <span className="num text-[12px] text-ink-dim shrink-0">
                  {fmtVolume(r.total)}<span className="text-ink-mute"> / {fmtVolume(r.capacity)} m³</span>
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-1.5 flex-1 rounded-full bg-line-2 overflow-hidden">
                  <div className="h-full rounded-full"
                    style={{ width: `${r.fill}%`, background: barColor(r.fill), transition: "width 0.7s" }} />
                </div>
                <span className="num text-[11px] w-9 text-right shrink-0"
                  style={{ color: barColor(r.fill) }}>{Math.round(r.fill)}%</span>
              </div>
            </div>
            <span className="text-[9px] font-mono uppercase tracking-wider text-ink-mute w-16 text-right shrink-0">
              {KIND_LABEL[r.facility.kind]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
