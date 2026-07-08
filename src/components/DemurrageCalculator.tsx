"use client";
import { useMemo, useState } from "react";
import type { Berth, Port } from "@/lib/types";
import {
  congestion, calcDemurrage, rankAlternatives, opsFor, fmtUsd, RISK_COLOR, type Scenario,
} from "@/lib/demurrage";

const label = "eyebrow block mb-1.5";
const field =
  "w-full bg-base border border-line rounded-sm px-2.5 py-2 text-[13px] num focus:border-amber/60 focus:outline-none transition-colors";

function statusTone(waiting: number, berths: number) {
  const r = waiting / berths;
  if (r >= 1.5) return "var(--color-red)";
  if (r >= 0.75) return "var(--color-amber)";
  return "var(--color-teal)";
}

export default function DemurrageCalculator({
  ports, berths,
}: { ports: Port[]; berths: Berth[] }) {
  // default to the most congested port
  const ranked0 = useMemo(
    () => [...ports].sort((a, b) =>
      congestion(b.id, b.name, berths).waiting - congestion(a.id, a.name, berths).waiting),
    [ports, berths]);
  const [portId, setPortId] = useState(ranked0[0]?.id ?? "");
  const [cargoMT, setCargoMT] = useState(30000);
  const [laytimeDays, setLaytime] = useState(3);
  const [dayRate, setDayRate] = useState(opsFor(ranked0[0]?.name ?? "").dayRateUsd);

  const port = ports.find((p) => p.id === portId) ?? ports[0];
  const scenario: Scenario = { cargoMT, laytimeDays, dayRateUsd: dayRate };

  const cong = port ? congestion(port.id, port.name, berths) : null;
  const result = port && cong ? calcDemurrage(port.name, cong.estWaitDays, scenario) : null;

  const alternatives = useMemo(
    () => rankAlternatives(ports, berths, scenario).filter((a) => a.port.id !== portId).slice(0, 4),
    [ports, berths, scenario, portId]);

  const onPort = (id: string) => {
    setPortId(id);
    const p = ports.find((x) => x.id === id);
    if (p) setDayRate(opsFor(p.name).dayRateUsd);
  };

  const riskColor = result ? RISK_COLOR[result.risk] : "var(--color-ink)";
  const meterPct = result ? Math.min(100, (result.demurrageDays / 6) * 100) : 0;

  return (
    <div>
      <div className="mb-3">
        <div className="eyebrow">Planning &amp; Risk · Logistics</div>
        <h2 className="text-[17px] font-bold tracking-tight">Demurrage Risk Calculator</h2>
        <p className="text-ink-mute text-[11.5px] mt-0.5 max-w-[680px]">
          Live berth congestion drives an estimated wait; combined with cargo size and charter terms it projects
          your demurrage exposure — and where re-routing saves money. Congestion updates in real time as berths change.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* ---- Scenario inputs ---- */}
        <div className="lg:col-span-4 panel p-4">
          <div className="eyebrow mb-3">Scenario</div>
          <div className="space-y-3">
            <div>
              <label className={label}>Discharge port</label>
              <select className={field} value={portId} onChange={(e) => onPort(e.target.value)}>
                {ports.map((p) => {
                  const c = congestion(p.id, p.name, berths);
                  return <option key={p.id} value={p.id}>{p.name} — {c.waiting} waiting</option>;
                })}
              </select>
            </div>
            <div>
              <label className={label}>Cargo size (MT)</label>
              <input className={field} type="number" value={cargoMT}
                onChange={(e) => setCargoMT(Math.max(0, Number(e.target.value)))} />
              <input type="range" min={5000} max={160000} step={1000} value={cargoMT}
                onChange={(e) => setCargoMT(Number(e.target.value))}
                className="w-full mt-2 accent-[color:var(--color-amber)]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Allowed laytime (days)</label>
                <input className={field} type="number" step="0.5" value={laytimeDays}
                  onChange={(e) => setLaytime(Math.max(0, Number(e.target.value)))} />
              </div>
              <div>
                <label className={label}>Demurrage $/day</label>
                <input className={field} type="number" step="1000" value={dayRate}
                  onChange={(e) => setDayRate(Math.max(0, Number(e.target.value)))} />
              </div>
            </div>
            {cong && (
              <div className="pt-2 mt-1 border-t border-line grid grid-cols-3 gap-2 text-center">
                <div><div className="num text-[16px] text-ink font-semibold">{cong.waiting}</div><div className="eyebrow !text-[8px]">Waiting</div></div>
                <div><div className="num text-[16px] text-ink font-semibold">{cong.berths}</div><div className="eyebrow !text-[8px]">Berths</div></div>
                <div><div className="num text-[16px] font-semibold" style={{ color: statusTone(cong.waiting, cong.berths) }}>{cong.estWaitDays}d</div><div className="eyebrow !text-[8px]">Est. wait</div></div>
              </div>
            )}
          </div>
        </div>

        {/* ---- Result ---- */}
        <div className="lg:col-span-8 panel p-5 flex flex-col">
          {result && (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <div className="eyebrow">Projected demurrage exposure · {port?.name}</div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="num text-[42px] leading-none font-bold" style={{ color: riskColor }}>
                      {fmtUsd(result.costUsd)}
                    </span>
                    <span className="text-ink-mute text-[12px] num">on this cargo</span>
                  </div>
                </div>
                <span className="num text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm"
                  style={{ color: riskColor, background: `${riskColor}1a` }}>{result.risk} risk</span>
              </div>

              {/* meter */}
              <div className="mt-4">
                <div className="h-2 rounded-full bg-line-2 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${meterPct}%`, background: riskColor, transition: "width .5s" }} />
                </div>
                <div className="flex justify-between eyebrow !text-[8px] mt-1">
                  <span>0d</span><span>laytime {laytimeDays}d</span><span>6d+ over</span>
                </div>
              </div>

              {/* breakdown */}
              <div className="grid grid-cols-4 gap-2 mt-5">
                {[
                  { k: "Est. wait for berth", v: `${result.waitDays}d` },
                  { k: "Discharge time", v: `${result.dischargeDays}d` },
                  { k: "Total port time", v: `${result.portTimeDays}d` },
                  { k: "Days on demurrage", v: `${result.demurrageDays}d`, hot: true },
                ].map((b) => (
                  <div key={b.k} className="bg-base-2/50 border border-line rounded-sm p-2.5">
                    <div className="num text-[19px] font-semibold" style={{ color: b.hot ? riskColor : "var(--color-ink)" }}>{b.v}</div>
                    <div className="eyebrow !text-[8px] mt-1 leading-tight">{b.k}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-[11.5px] text-ink-dim leading-relaxed bg-base-2/40 border border-line rounded-sm p-3">
                {result.demurrageDays > 0 ? (
                  <>At {port?.name}, a {cargoMT.toLocaleString()} MT cargo is projected to run{" "}
                    <span className="num" style={{ color: riskColor }}>{result.demurrageDays} days</span> past laytime —
                    roughly <span className="num" style={{ color: riskColor }}>{fmtUsd(result.costUsd)}</span> in demurrage.
                    {alternatives[0] && alternatives[0].result.costUsd < result.costUsd && (
                      <> Re-routing to <span className="text-ink">{alternatives[0].port.name}</span> could save{" "}
                        <span className="num text-teal">{fmtUsd(result.costUsd - alternatives[0].result.costUsd)}</span>.</>
                    )}
                  </>
                ) : (
                  <>No demurrage projected — {port?.name} clears this cargo within the {laytimeDays}-day laytime. Good window to fix.</>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ---- Live congestion board + alternatives ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mt-3">
        <div className="lg:col-span-7 panel">
          <div className="px-4 pt-3 pb-2 border-b border-line flex items-center justify-between">
            <div>
              <div className="eyebrow">Live · Regional Berth Congestion</div>
              <h3 className="font-bold text-[14px] tracking-tight mt-0.5">Port Congestion Board</h3>
            </div>
            <span className="flex items-center gap-1.5"><span className="livedot" /><span className="eyebrow">Live</span></span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead><tr className="eyebrow text-ink-mute">
                <th className="text-left font-normal px-4 py-1.5">Port</th>
                <th className="text-right font-normal py-1.5">Waiting</th>
                <th className="text-right font-normal py-1.5">Berths</th>
                <th className="text-right font-normal py-1.5">Est. wait</th>
                <th className="text-right font-normal px-4 py-1.5">Status</th>
              </tr></thead>
              <tbody>
                {ranked0.map((p) => {
                  const c = congestion(p.id, p.name, berths);
                  const tone = statusTone(c.waiting, c.berths);
                  const stat = c.waiting / c.berths >= 1.5 ? "congested" : c.waiting / c.berths >= 0.75 ? "building" : "clear";
                  return (
                    <tr key={p.id} onClick={() => onPort(p.id)}
                      className={`border-t border-line/60 cursor-pointer hover:bg-panel-2 transition-colors ${p.id === portId ? "bg-panel-2" : ""}`}>
                      <td className="px-4 py-2 text-ink">{p.name}</td>
                      <td className="text-right num text-ink-dim">{c.waiting}</td>
                      <td className="text-right num text-ink-mute">{c.berths}</td>
                      <td className="text-right num" style={{ color: tone }}>{c.estWaitDays}d</td>
                      <td className="px-4 text-right">
                        <span className="num text-[10px] uppercase tracking-wider" style={{ color: tone }}>{stat}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-5 panel">
          <div className="px-4 pt-3 pb-2 border-b border-line">
            <div className="eyebrow">Optimisation</div>
            <h3 className="font-bold text-[14px] tracking-tight mt-0.5">Cheaper Routing — Same Cargo</h3>
          </div>
          <div className="p-2">
            {alternatives.map((a) => {
              const save = (result?.costUsd ?? 0) - a.result.costUsd;
              return (
                <button key={a.port.id} onClick={() => onPort(a.port.id)}
                  className="w-full flex items-center gap-3 px-2.5 py-2 rounded-sm hover:bg-panel-2 transition-colors text-left">
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] text-ink truncate">{a.port.name}</div>
                    <div className="text-[10px] text-ink-mute num">{a.cong.waiting} waiting · {a.result.demurrageDays}d demurrage</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="num text-[12px]" style={{ color: RISK_COLOR[a.result.risk] }}>{fmtUsd(a.result.costUsd)}</div>
                    {save > 0 && <div className="num text-[10px] text-teal">save {fmtUsd(save)}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
