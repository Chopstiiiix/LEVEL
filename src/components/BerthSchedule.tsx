"use client";
import type { Berth, Port } from "@/lib/types";
import { fmtNum, PRODUCT_COLORS } from "@/lib/format";

const STATUS: Record<string, string> = {
  expected: "var(--color-ink-mute)",
  anchored: "var(--color-amber)",
  berthed: "var(--color-blue)",
  discharging: "var(--color-teal)",
  departed: "var(--color-ink-mute)",
};

function eta(iso: string | null): string {
  if (!iso) return "—";
  const diff = new Date(iso).getTime() - Date.now();
  const h = Math.round(diff / 3_600_000);
  if (h === 0) return "now";
  if (h < 0) return `${Math.abs(h)}h ago`;
  if (h < 48) return `+${h}h`;
  return `+${Math.round(h / 24)}d`;
}

export default function BerthSchedule({ berths, ports }: { berths: Berth[]; ports: Port[] }) {
  const portName = new Map(ports.map((p) => [p.id, p.name]));
  return (
    <div className="panel rise flex flex-col min-h-[300px] sm:min-h-0 h-full" style={{ animationDelay: "220ms" }}>
      <div className="px-4 pt-3 pb-2 border-b border-line">
        <div className="eyebrow">Ports · Berthing & ETA</div>
        <h3 className="font-bold text-[14px] tracking-tight mt-0.5">Vessel Schedule</h3>
      </div>
      <div className="overflow-auto flex-1">
        <table className="w-full min-w-[440px] text-[11.5px]">
          <thead className="sticky top-0 bg-panel">
            <tr className="text-ink-mute eyebrow">
              <th className="text-left font-normal px-4 py-1.5">Vessel</th>
              <th className="text-left font-normal py-1.5">Port</th>
              <th className="text-right font-normal py-1.5">Cargo (MT)</th>
              <th className="text-left font-normal px-3 py-1.5">Status</th>
              <th className="text-right font-normal px-4 py-1.5">ETA</th>
            </tr>
          </thead>
          <tbody>
            {berths.map((b) => (
              <tr key={b.id} className="border-t border-line/60 hover:bg-panel-2 transition-colors">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1.5">
                    {b.product && <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: PRODUCT_COLORS[b.product] }} />}
                    <span className="text-ink truncate max-w-[130px]">{b.vessel_name}</span>
                  </div>
                  <span className="num text-[10px] text-ink-mute">{b.product}</span>
                </td>
                <td className="text-ink-dim">{portName.get(b.port_id)?.split(" (")[0]}</td>
                <td className="text-right num text-ink-dim">{fmtNum(b.volume_mt)}</td>
                <td className="px-3">
                  <span className="num text-[10px] uppercase tracking-wider" style={{ color: STATUS[b.status] }}>
                    {b.status}
                  </span>
                </td>
                <td className="px-4 text-right num text-ink">{eta(b.eta)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
