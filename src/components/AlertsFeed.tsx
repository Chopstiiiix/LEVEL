"use client";
import type { Alert } from "@/lib/types";
import { timeAgo } from "@/lib/format";

const SEV: Record<string, { c: string; label: string }> = {
  critical: { c: "var(--color-red)", label: "CRIT" },
  warning: { c: "var(--color-amber)", label: "WARN" },
  info: { c: "var(--color-blue)", label: "INFO" },
};

export default function AlertsFeed({ alerts }: { alerts: Alert[] }) {
  return (
    <div className="panel rise flex flex-col min-h-0 h-full w-full" style={{ animationDelay: "180ms" }}>
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-line">
        <div>
          <div className="eyebrow">Intelligence Feed</div>
          <h3 className="font-bold text-[14px] tracking-tight mt-0.5">Live Alerts</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="livedot" />
          <span className="eyebrow">Streaming</span>
        </div>
      </div>
      <div className="overflow-y-auto flex-1 divide-y divide-line/60">
        {alerts.map((a) => {
          const s = SEV[a.severity] ?? SEV.info;
          return (
            <div key={a.id} className="px-4 py-2.5 hover:bg-panel-2 transition-colors relative">
              <span className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: s.c }} />
              <div className="flex items-center gap-2 mb-1">
                <span className="num text-[9px] px-1 py-[1px] rounded-sm font-medium"
                  style={{ color: s.c, background: `${s.c}1a` }}>{s.label}</span>
                <span className="eyebrow !tracking-[0.15em]">{a.category}</span>
                {a.product && <span className="text-[10px] text-ink-mute num">· {a.product}</span>}
                <span className="ml-auto num text-[10px] text-ink-mute">{timeAgo(a.created_at)}</span>
              </div>
              <div className="text-[12.5px] text-ink leading-snug">{a.title}</div>
              {a.body && <div className="text-[11px] text-ink-mute mt-0.5 leading-snug">{a.body}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
