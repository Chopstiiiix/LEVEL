// LEVEL — demurrage & congestion risk model.
// Model assumptions (port ops params) are separated from live data (the berth queue)
// so the logic is transparent and tunable. These are planning estimates, not contracts.

import type { Berth, Port } from "./types";

export interface PortOps {
  berths: number;            // discharge berths available for product/crude tankers
  serviceDays: number;       // avg berth occupation per vessel (turnaround)
  dischargeMTday: number;    // avg discharge rate
  dayRateUsd: number;        // typical demurrage day rate for the port's vessel mix
}

// Keyed by port name (matches level.ports.name). West-Africa-plausible planning defaults.
export const PORT_OPS: Record<string, PortOps> = {
  "Apapa (Lagos)":          { berths: 4, serviceDays: 2.6, dischargeMTday: 16000, dayRateUsd: 28000 },
  "Tin Can Island (Lagos)": { berths: 3, serviceDays: 2.5, dischargeMTday: 15000, dayRateUsd: 26000 },
  "Lekki Deep Sea Port":    { berths: 4, serviceDays: 2.0, dischargeMTday: 30000, dayRateUsd: 32000 },
  "Onne (Port Harcourt)":   { berths: 3, serviceDays: 2.2, dischargeMTday: 18000, dayRateUsd: 24000 },
  "Warri":                  { berths: 2, serviceDays: 2.5, dischargeMTday: 14000, dayRateUsd: 22000 },
  "Calabar":                { berths: 2, serviceDays: 2.8, dischargeMTday: 12000, dayRateUsd: 20000 },
  "Tema":                   { berths: 4, serviceDays: 2.0, dischargeMTday: 22000, dayRateUsd: 25000 },
  "Takoradi":               { berths: 2, serviceDays: 2.5, dischargeMTday: 14000, dayRateUsd: 22000 },
  "Abidjan":                { berths: 3, serviceDays: 2.2, dischargeMTday: 18000, dayRateUsd: 24000 },
  "Lome":                   { berths: 2, serviceDays: 2.5, dischargeMTday: 14000, dayRateUsd: 22000 },
  "Cotonou":                { berths: 2, serviceDays: 2.6, dischargeMTday: 13000, dayRateUsd: 21000 },
  "Dakar":                  { berths: 2, serviceDays: 2.4, dischargeMTday: 14000, dayRateUsd: 22000 },
};

export const DEFAULT_OPS: PortOps = { berths: 2, serviceDays: 2.5, dischargeMTday: 15000, dayRateUsd: 24000 };
export const opsFor = (portName: string): PortOps => PORT_OPS[portName] ?? DEFAULT_OPS;

// --- live congestion at a port, from the berth queue ---
export interface Congestion {
  waiting: number;    // vessels anchored / expected (queue)
  onBerth: number;    // berthed / discharging
  berths: number;
  estWaitDays: number;
}

export function congestion(portId: string, portName: string, berths: Berth[]): Congestion {
  const at = berths.filter((b) => b.port_id === portId);
  const waiting = at.filter((b) => b.status === "anchored" || b.status === "expected").length;
  const onBerth = at.filter((b) => b.status === "berthed" || b.status === "discharging").length;
  const ops = opsFor(portName);
  // a new arrival queues behind current waiters; wait ≈ (queue / berths) × turnaround
  const estWaitDays = round1((waiting / ops.berths) * ops.serviceDays);
  return { waiting, onBerth, berths: ops.berths, estWaitDays };
}

export interface Scenario {
  cargoMT: number;
  laytimeDays: number;   // allowed laytime per charter party
  dayRateUsd: number;
}

export interface Result {
  waitDays: number;
  dischargeDays: number;
  portTimeDays: number;
  demurrageDays: number;
  costUsd: number;
  risk: "low" | "moderate" | "high" | "critical";
}

export function calcDemurrage(portName: string, waitDays: number, s: Scenario): Result {
  const ops = opsFor(portName);
  const dischargeDays = round1(s.cargoMT / ops.dischargeMTday);
  const portTimeDays = round1(waitDays + dischargeDays);
  const demurrageDays = round1(Math.max(0, portTimeDays - s.laytimeDays));
  const costUsd = Math.round(demurrageDays * s.dayRateUsd);
  return { waitDays, dischargeDays, portTimeDays, demurrageDays, costUsd, risk: riskLevel(demurrageDays) };
}

export function riskLevel(demurrageDays: number): Result["risk"] {
  if (demurrageDays <= 0.5) return "low";
  if (demurrageDays <= 2) return "moderate";
  if (demurrageDays <= 4) return "high";
  return "critical";
}

export const RISK_COLOR: Record<Result["risk"], string> = {
  low: "var(--color-teal)",
  moderate: "var(--color-amber)",
  high: "#ff8a3d",
  critical: "var(--color-red)",
};

export function round1(n: number): number { return Math.round(n * 10) / 10; }

export function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

// Rank every port for this cargo, cheapest exposure first (routing suggestions).
export function rankAlternatives(
  ports: Port[], berths: Berth[], s: Scenario,
): { port: Port; cong: Congestion; result: Result }[] {
  return ports
    .map((p) => {
      const cong = congestion(p.id, p.name, berths);
      const result = calcDemurrage(p.name, cong.estWaitDays, s);
      return { port: p, cong, result };
    })
    .sort((a, b) => a.result.costUsd - b.result.costUsd);
}
