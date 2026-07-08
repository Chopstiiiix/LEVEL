"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { DashboardData, Product } from "@/lib/types";
import { fmtNum, PRODUCT_COLORS, PRODUCT_LABELS } from "@/lib/format";
import { congestion } from "@/lib/demurrage";
import BerthSchedule from "./BerthSchedule";

const VesselMap = dynamic(() => import("./VesselMap"), {
  ssr: false,
  loading: () => (
    <div className="panel flex-1 min-h-[420px] flex items-center justify-center text-ink-mute text-[12px] num">
      initialising map…
    </div>
  ),
});

const PANEL_HEAD = "px-4 pt-3 pb-2 border-b border-line";

function navPhase(sog: number | null): { label: string; color: string } {
  const s = sog ?? 0;
  if (s < 0.3) return { label: "moored", color: "var(--color-teal)" };
  if (s < 3) return { label: "manoeuvring", color: "var(--color-amber)" };
  return { label: "underway", color: "var(--color-blue)" };
}

function flagLabel(code: string | null): { name: string; cabotage: boolean } {
  const map: Record<string, string> = {
    NG: "Nigeria", LR: "Liberia", MH: "Marshall Is.", PA: "Panama", VC: "St Vincent",
    BS: "Bahamas", MT: "Malta", GR: "Greece",
  };
  return { name: map[code ?? ""] ?? code ?? "—", cabotage: code === "NG" };
}

export default function LogisticsTab({ data }: { data: DashboardData }) {
  const { vessels, ports, berths } = data;
  const [productFilter, setProductFilter] = useState<Product | "ALL">("ALL");

  const ranked = useMemo(
    () => [...ports]
      .map((p) => ({ port: p, c: congestion(p.id, p.name, berths) }))
      .sort((a, b) => b.c.waiting - a.c.waiting),
    [ports, berths]);

  const fleet = useMemo(() => {
    const rows = productFilter === "ALL" ? vessels : vessels.filter((v) => v.product === productFilter);
    return [...rows].sort((a, b) => (b.dwt ?? 0) - (a.dwt ?? 0));
  }, [vessels, productFilter]);

  // Inbound cargo tonnage by product (from the berth queue: expected/anchored/berthed).
  const inbound = useMemo(() => {
    const acc = new Map<Product, { mt: number; count: number }>();
    berths.filter((b) => b.status !== "departed" && b.product && b.volume_mt).forEach((b) => {
      const cur = acc.get(b.product!) ?? { mt: 0, count: 0 };
      cur.mt += b.volume_mt ?? 0; cur.count += 1;
      acc.set(b.product!, cur);
    });
    return [...acc.entries()].sort((a, b) => b[1].mt - a[1].mt);
  }, [berths]);
  const inboundTotal = inbound.reduce((s, [, v]) => s + v.mt, 0);

  const products = useMemo<Product[]>(() => {
    const set = new Set<Product>(vessels.map((v) => v.product).filter(Boolean) as Product[]);
    return [...set];
  }, [vessels]);

  const totalDwt = fleet.reduce((s, v) => s + (v.dwt ?? 0), 0);
  const ngFlag = vessels.filter((v) => v.flag === "NG").length;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="eyebrow">Fleet &amp; Berth Operations · Live</div>
        <h2 className="text-[17px] font-bold tracking-tight">Logistics</h2>
        <p className="text-ink-mute text-[11.5px] mt-0.5 max-w-[720px]">
          Real-time vessel positions, fleet manifest, inbound cargo and berth congestion across the
          Gulf-of-Guinea discharge corridor.
        </p>
      </div>

      {/* map + right rail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-8 h-[340px] lg:h-[460px] flex">
          <VesselMap ports={ports} vessels={vessels} />
        </div>
        <div className="lg:col-span-4 flex flex-col gap-3">
          {/* fleet summary */}
          <div className="panel rise p-4 grid grid-cols-3 gap-2 text-center" style={{ animationDelay: "40ms" }}>
            <div>
              <div className="num text-[22px] font-semibold text-blue">{vessels.length}</div>
              <div className="eyebrow !text-[8px] mt-0.5">Tracked</div>
            </div>
            <div>
              <div className="num text-[22px] font-semibold text-ink">{(totalDwt / 1_000_000).toFixed(2)}M</div>
              <div className="eyebrow !text-[8px] mt-0.5">DWT total</div>
            </div>
            <div>
              <div className="num text-[22px] font-semibold text-amber">{ngFlag}</div>
              <div className="eyebrow !text-[8px] mt-0.5">NG-flag</div>
            </div>
          </div>

          {/* inbound cargo */}
          <div className="panel rise flex-1 min-h-0 flex flex-col" style={{ animationDelay: "80ms" }}>
            <div className={PANEL_HEAD}>
              <div className="eyebrow">Berth Queue · Not yet cleared</div>
              <h3 className="font-bold text-[14px] tracking-tight mt-0.5">Inbound Cargo</h3>
            </div>
            <div className="p-3 flex-1 flex flex-col justify-center gap-2.5">
              {inbound.map(([product, v]) => (
                <div key={product}>
                  <div className="flex items-center justify-between text-[11.5px]">
                    <span className="flex items-center gap-1.5 text-ink">
                      <span className="w-2 h-2 rounded-sm" style={{ background: PRODUCT_COLORS[product] }} />
                      {PRODUCT_LABELS[product].split(" (")[0]}
                    </span>
                    <span className="num text-ink-dim">{fmtNum(v.mt)} MT <span className="text-ink-mute">· {v.count}</span></span>
                  </div>
                  <div className="h-1.5 rounded-full bg-line-2 mt-1.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(v.mt / inboundTotal) * 100}%`, background: PRODUCT_COLORS[product] }} />
                  </div>
                </div>
              ))}
              <div className="pt-2 mt-1 border-t border-line flex items-center justify-between text-[11px]">
                <span className="eyebrow">Total inbound</span>
                <span className="num text-ink font-semibold">{fmtNum(inboundTotal)} MT</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* fleet manifest + congestion */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-8 panel rise flex flex-col" style={{ animationDelay: "120ms" }}>
          <div className={`${PANEL_HEAD} flex items-center justify-between`}>
            <div>
              <div className="eyebrow">Live · AIS Positions</div>
              <h3 className="font-bold text-[14px] tracking-tight mt-0.5">Fleet Manifest</h3>
            </div>
            <div className="flex gap-1 flex-wrap justify-end">
              <button onClick={() => setProductFilter("ALL")}
                className={`num text-[10px] px-2 py-1 rounded-sm transition-colors ${productFilter === "ALL" ? "bg-panel-2 text-ink" : "text-ink-mute hover:text-ink-dim"}`}>ALL</button>
              {products.map((p) => (
                <button key={p} onClick={() => setProductFilter(p)}
                  className={`num text-[10px] px-2 py-1 rounded-sm transition-colors ${productFilter === p ? "bg-panel-2 text-ink" : "text-ink-mute hover:text-ink-dim"}`}>{p}</button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[11.5px]">
              <thead>
                <tr className="eyebrow text-ink-mute">
                  <th className="text-left font-normal px-4 py-2">Vessel</th>
                  <th className="text-left font-normal py-2">Flag</th>
                  <th className="text-left font-normal py-2">Cargo</th>
                  <th className="text-right font-normal py-2">DWT</th>
                  <th className="text-right font-normal py-2">Speed</th>
                  <th className="text-left font-normal px-4 py-2">Phase</th>
                </tr>
              </thead>
              <tbody>
                {fleet.map((v) => {
                  const phase = navPhase(v.sog);
                  const flag = flagLabel(v.flag);
                  return (
                    <tr key={v.mmsi} className="border-t border-line/60 hover:bg-panel-2 transition-colors">
                      <td className="px-4 py-2">
                        <div className="text-ink">{v.name ?? "—"}</div>
                        <div className="num text-[9.5px] text-ink-mute">MMSI {v.mmsi}</div>
                      </td>
                      <td>
                        <span className="text-ink-dim">{flag.name}</span>
                        {flag.cabotage && <span className="ml-1.5 num text-[8.5px] uppercase px-1 py-0.5 rounded-sm bg-amber/12 text-amber">cabotage</span>}
                      </td>
                      <td>
                        {v.product ? (
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-sm" style={{ background: PRODUCT_COLORS[v.product] }} />
                            <span className="text-ink-dim">{v.product}</span>
                          </span>
                        ) : <span className="text-ink-mute">—</span>}
                      </td>
                      <td className="text-right num text-ink-dim">{fmtNum(v.dwt)}</td>
                      <td className="text-right num text-ink-dim">{(v.sog ?? 0).toFixed(1)} kn</td>
                      <td className="px-4">
                        <span className="num text-[10px] uppercase tracking-wider" style={{ color: phase.color }}>{phase.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-4 panel rise flex flex-col" style={{ animationDelay: "160ms" }}>
          <div className={`${PANEL_HEAD} flex items-center justify-between`}>
            <div>
              <div className="eyebrow">Live · Queue Depth</div>
              <h3 className="font-bold text-[14px] tracking-tight mt-0.5">Port Congestion</h3>
            </div>
            <span className="flex items-center gap-1.5"><span className="livedot" /><span className="eyebrow">Live</span></span>
          </div>
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-[11.5px]">
              <thead className="sticky top-0 bg-panel">
                <tr className="eyebrow text-ink-mute">
                  <th className="text-left font-normal px-4 py-1.5">Port</th>
                  <th className="text-right font-normal py-1.5">Wait</th>
                  <th className="text-right font-normal py-1.5">Berths</th>
                  <th className="text-right font-normal px-4 py-1.5">Est.</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map(({ port, c }) => {
                  const r = c.waiting / c.berths;
                  const tone = r >= 1.5 ? "var(--color-red)" : r >= 0.75 ? "var(--color-amber)" : "var(--color-teal)";
                  return (
                    <tr key={port.id} className="border-t border-line/60 hover:bg-panel-2 transition-colors">
                      <td className="px-4 py-2 text-ink-dim">{port.name.split(" (")[0]}</td>
                      <td className="text-right num" style={{ color: c.waiting ? tone : "var(--color-ink-mute)" }}>{c.waiting}</td>
                      <td className="text-right num text-ink-mute">{c.onBerth}/{c.berths}</td>
                      <td className="text-right px-4 num" style={{ color: tone }}>{c.estWaitDays}d</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* full berth schedule */}
      <div className="h-[320px] flex">
        <BerthSchedule berths={berths} ports={ports} />
      </div>
    </div>
  );
}
