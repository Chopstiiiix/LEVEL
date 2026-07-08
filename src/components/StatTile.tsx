"use client";
import { useEffect, useRef, useState } from "react";

export interface Kpi {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  tone?: "amber" | "teal" | "red" | "blue" | "neutral";
  spark?: number[];
}

const TONE: Record<string, string> = {
  amber: "var(--color-amber)",
  teal: "var(--color-teal)",
  red: "var(--color-red)",
  blue: "var(--color-blue)",
  neutral: "var(--color-ink)",
};

function Spark({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const w = 72, h = 22;
  const min = Math.min(...data), max = Math.max(...data);
  const rng = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / rng) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

export default function StatTile({ kpi, delay = 0 }: { kpi: Kpi; delay?: number }) {
  const color = TONE[kpi.tone ?? "neutral"];
  const [flash, setFlash] = useState<"" | "flash-up">("");
  const prev = useRef(kpi.value);
  useEffect(() => {
    if (prev.current !== kpi.value) {
      setFlash("flash-up");
      prev.current = kpi.value;
      const t = setTimeout(() => setFlash(""), 1100);
      return () => clearTimeout(t);
    }
  }, [kpi.value]);

  return (
    <div className="panel rise px-4 py-3 flex flex-col justify-between min-h-[92px]"
      style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between">
        <span className="eyebrow">{kpi.label}</span>
        {kpi.spark && <Spark data={kpi.spark} color={color} />}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className={`num text-[26px] leading-none font-semibold ${flash}`} style={{ color }}>
          {kpi.value}
        </span>
        {kpi.unit && <span className="text-ink-mute text-[11px] num">{kpi.unit}</span>}
      </div>
      {kpi.sub && <div className="mt-1.5 text-[11px] text-ink-dim">{kpi.sub}</div>}
    </div>
  );
}
