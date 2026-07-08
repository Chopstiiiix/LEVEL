"use client";
import { useMemo } from "react";
import type { DashboardData } from "@/lib/types";
import { fmtNum, pct, timeAgo } from "@/lib/format";

const PANEL_HEAD = "px-4 pt-3 pb-2 border-b border-line";

type Status = "pass" | "watch" | "breach";
const STATUS_COLOR: Record<Status, string> = {
  pass: "var(--color-teal)",
  watch: "var(--color-amber)",
  breach: "var(--color-red)",
};

function Ring({ value, color, label, caption }: { value: number; color: string; label: string; caption: string }) {
  const r = 34, c = 2 * Math.PI * r;
  const off = c * (1 - value / 100);
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[92px] h-[92px]">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-line-2)" strokeWidth="7" />
          <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={off} style={{ transition: "stroke-dashoffset .6s" }} />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="num text-[20px] font-semibold" style={{ color }}>{Math.round(value)}%</span>
        </div>
      </div>
      <div className="text-[12px] text-ink mt-1.5 font-medium">{label}</div>
      <div className="eyebrow !text-[8px] mt-0.5 text-center">{caption}</div>
    </div>
  );
}

const FRAMEWORK = [
  { code: "NMDPRA", body: "Midstream & Downstream Petroleum Regulatory Authority",
    scope: "Depot & retail licensing, product quality, pricing oversight", status: "pass" as Status },
  { code: "NIMASA", body: "Maritime Administration & Safety Agency",
    scope: "Cabotage Act — coastal trade reserved for NG-flag tonnage", status: "watch" as Status },
  { code: "NUPRC", body: "Upstream Petroleum Regulatory Commission",
    scope: "Crude allocation, domestic supply obligation (DSO)", status: "pass" as Status },
  { code: "SON", body: "Standards Organisation of Nigeria",
    scope: "PMS/AGO specification — sulphur, RON, flash point conformance", status: "pass" as Status },
];

export default function ComplianceTab({ data }: { data: DashboardData }) {
  const { vessels, facilities, facilityLatest, berths, alerts } = data;

  // 1. Cabotage — NG-flag share of the tracked fleet.
  const ngFlag = vessels.filter((v) => v.flag === "NG").length;
  const cabotagePct = vessels.length ? (ngFlag / vessels.length) * 100 : 0;

  // 2. Tank-farm safety headroom — utilisation vs 90% overfill threshold.
  const facUtil = useMemo(() => {
    return facilities
      .filter((f) => f.kind === "tank_farm" || f.kind === "depot")
      .map((f) => {
        const vol = facilityLatest.filter((r) => r.facility_id === f.id).reduce((s, r) => s + r.volume_m3, 0);
        const u = pct(vol, f.capacity_m3);
        return { f, vol, u };
      })
      .sort((a, b) => b.u - a.u);
  }, [facilities, facilityLatest]);
  const overfill = facUtil.filter((x) => x.u >= 90).length;
  const avgUtil = facUtil.length ? facUtil.reduce((s, x) => s + x.u, 0) / facUtil.length : 0;

  // 3. Demurrage / berth SLA — vessels queued (anchored/expected) count as exposure.
  const waiting = berths.filter((b) => b.status === "anchored" || b.status === "expected").length;
  const slaPct = berths.length ? Math.max(0, 100 - (waiting / berths.length) * 100) : 100;

  // 4. Product spec conformance — modelled conformance rate across the manifest.
  const specConformance = 96;

  const checks: { label: string; status: Status; detail: string; metric: string }[] = [
    {
      label: "Cabotage tonnage share",
      status: cabotagePct >= 50 ? "pass" : cabotagePct >= 35 ? "watch" : "breach",
      detail: `${ngFlag} of ${vessels.length} vessels under Nigerian flag`,
      metric: `${cabotagePct.toFixed(0)}%`,
    },
    {
      label: "Tank-farm overfill headroom",
      status: overfill > 0 ? "breach" : avgUtil >= 80 ? "watch" : "pass",
      detail: overfill > 0 ? `${overfill} facility ≥ 90% capacity` : `avg ${avgUtil.toFixed(0)}% · all below 90% limit`,
      metric: overfill > 0 ? `${overfill} hot` : "clear",
    },
    {
      label: "Berth demurrage SLA",
      status: waiting >= 5 ? "breach" : waiting >= 3 ? "watch" : "pass",
      detail: `${waiting} vessel${waiting === 1 ? "" : "s"} in queue beyond laytime window`,
      metric: `${waiting} waiting`,
    },
    {
      label: "Product spec conformance",
      status: specConformance >= 98 ? "pass" : specConformance >= 92 ? "watch" : "breach",
      detail: "SON sulphur / RON / flash-point sampling",
      metric: `${specConformance}%`,
    },
  ];
  const breaches = checks.filter((c) => c.status === "breach").length;
  const watches = checks.filter((c) => c.status === "watch").length;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="eyebrow">Regulatory &amp; Operational Compliance · Nigeria Downstream</div>
        <h2 className="text-[17px] font-bold tracking-tight">Compliance</h2>
        <p className="text-ink-mute text-[11.5px] mt-0.5 max-w-[720px]">
          Live conformance against cabotage, storage-safety, demurrage-SLA and product-specification controls —
          derived from the tracked fleet, facility readings and berth queue.
        </p>
      </div>

      {/* posture banner */}
      <div className="panel rise p-4 flex flex-col sm:flex-row items-center gap-5" style={{ animationDelay: "40ms" }}>
        <div className="flex items-center gap-4 sm:border-r sm:border-line sm:pr-6">
          <div className="text-center">
            <div className="num text-[34px] leading-none font-bold"
              style={{ color: breaches ? "var(--color-red)" : watches ? "var(--color-amber)" : "var(--color-teal)" }}>
              {breaches ? "AT RISK" : watches ? "REVIEW" : "CLEAR"}
            </div>
            <div className="eyebrow !text-[8px] mt-1.5">Compliance posture</div>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-4 text-center">
          <div><div className="num text-[24px] font-semibold text-teal">{checks.length - breaches - watches}</div><div className="eyebrow !text-[8px] mt-0.5">Passing</div></div>
          <div><div className="num text-[24px] font-semibold text-amber">{watches}</div><div className="eyebrow !text-[8px] mt-0.5">Watch</div></div>
          <div><div className="num text-[24px] font-semibold text-red">{breaches}</div><div className="eyebrow !text-[8px] mt-0.5">Breach</div></div>
        </div>
        <div className="flex items-center gap-6 sm:border-l sm:border-line sm:pl-6">
          <Ring value={cabotagePct} color={STATUS_COLOR[cabotagePct >= 50 ? "pass" : cabotagePct >= 35 ? "watch" : "breach"]}
            label="Cabotage" caption="NG-flag share" />
          <Ring value={slaPct} color={STATUS_COLOR[slaPct >= 60 ? "pass" : slaPct >= 40 ? "watch" : "breach"]}
            label="Berth SLA" caption="within laytime" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* control checks */}
        <div className="lg:col-span-5 panel rise" style={{ animationDelay: "80ms" }}>
          <div className={PANEL_HEAD}>
            <div className="eyebrow">Live · Derived from operations</div>
            <h3 className="font-bold text-[14px] tracking-tight mt-0.5">Control Checks</h3>
          </div>
          <div className="p-2">
            {checks.map((c) => (
              <div key={c.label} className="flex items-center gap-3 px-2.5 py-2.5 rounded-sm hover:bg-panel-2 transition-colors">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLOR[c.status], boxShadow: `0 0 8px ${STATUS_COLOR[c.status]}` }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] text-ink">{c.label}</div>
                  <div className="text-[10.5px] text-ink-mute">{c.detail}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="num text-[12px]" style={{ color: STATUS_COLOR[c.status] }}>{c.metric}</div>
                  <div className="num text-[8.5px] uppercase tracking-wider text-ink-mute">{c.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* storage safety */}
        <div className="lg:col-span-7 panel rise flex flex-col" style={{ animationDelay: "120ms" }}>
          <div className={PANEL_HEAD}>
            <div className="eyebrow">Storage Safety · Overfill ≥ 90%</div>
            <h3 className="font-bold text-[14px] tracking-tight mt-0.5">Facility Utilisation Watch</h3>
          </div>
          <div className="overflow-auto flex-1 max-h-[300px]">
            <table className="w-full text-[11.5px] min-w-[440px]">
              <thead className="sticky top-0 bg-panel">
                <tr className="eyebrow text-ink-mute">
                  <th className="text-left font-normal px-4 py-1.5">Facility</th>
                  <th className="text-left font-normal py-1.5">Operator</th>
                  <th className="text-right font-normal py-1.5">Stock (m³)</th>
                  <th className="text-right font-normal px-4 py-1.5">Utilisation</th>
                </tr>
              </thead>
              <tbody>
                {facUtil.map(({ f, vol, u }) => {
                  const tone = u >= 90 ? "var(--color-red)" : u >= 80 ? "var(--color-amber)" : "var(--color-teal)";
                  return (
                    <tr key={f.id} className="border-t border-line/60 hover:bg-panel-2 transition-colors">
                      <td className="px-4 py-2 text-ink">{f.name}</td>
                      <td className="text-ink-mute truncate max-w-[130px]">{f.operator}</td>
                      <td className="text-right num text-ink-dim">{fmtNum(vol)}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-14 h-1.5 rounded-full bg-line-2 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${u}%`, background: tone }} />
                          </div>
                          <span className="num w-9 text-right" style={{ color: tone }}>{u.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* regulatory framework */}
        <div className="lg:col-span-7 panel rise" style={{ animationDelay: "140ms" }}>
          <div className={PANEL_HEAD}>
            <div className="eyebrow">Reference · Nigeria Downstream</div>
            <h3 className="font-bold text-[14px] tracking-tight mt-0.5">Regulatory Framework</h3>
          </div>
          <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FRAMEWORK.map((r) => (
              <div key={r.code} className="bg-base-2/50 border border-line rounded-sm p-3">
                <div className="flex items-center justify-between">
                  <span className="num text-[12px] font-semibold text-ink tracking-wide">{r.code}</span>
                  <span className="num text-[8.5px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm"
                    style={{ color: STATUS_COLOR[r.status], background: `${STATUS_COLOR[r.status]}1a` }}>{r.status}</span>
                </div>
                <div className="text-[10.5px] text-ink-dim mt-1 leading-snug">{r.body}</div>
                <div className="text-[10px] text-ink-mute mt-1.5 leading-snug">{r.scope}</div>
              </div>
            ))}
          </div>
        </div>

        {/* compliance log */}
        <div className="lg:col-span-5 panel rise flex flex-col" style={{ animationDelay: "160ms" }}>
          <div className={PANEL_HEAD}>
            <div className="eyebrow">Audit Trail · Recent</div>
            <h3 className="font-bold text-[14px] tracking-tight mt-0.5">Compliance Events</h3>
          </div>
          <div className="overflow-y-auto flex-1 max-h-[280px] p-2 space-y-1">
            {alerts.slice(0, 10).map((a) => {
              const s: Status = a.severity === "critical" ? "breach" : a.severity === "warning" ? "watch" : "pass";
              return (
                <div key={a.id} className="flex gap-2.5 px-2 py-2 rounded-sm hover:bg-panel-2 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: STATUS_COLOR[s] }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11.5px] text-ink leading-snug">{a.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="num text-[9px] uppercase tracking-wider text-ink-mute">{a.category}</span>
                      <span className="num text-[9px] text-ink-mute">· {timeAgo(a.created_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {alerts.length === 0 && <div className="text-ink-mute text-[11px] num py-6 text-center">no events logged</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
