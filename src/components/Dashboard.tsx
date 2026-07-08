"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { DashboardData } from "@/lib/types";
import { fetchDashboard } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { fmtVolume, fmtNum, fmtPrice, pct } from "@/lib/format";
import { useAuth, CAN_EDIT } from "@/lib/auth";
import StatTile, { type Kpi } from "./StatTile";
import Ticker from "./Ticker";
import DangotePanel from "./DangotePanel";
import TankFarmLevels from "./TankFarmLevels";
import AlertsFeed from "./AlertsFeed";
import BerthSchedule from "./BerthSchedule";
import DataConsole from "./DataConsole";
import DemurrageCalculator from "./DemurrageCalculator";
import LogisticsTab from "./LogisticsTab";
import MarketTab from "./MarketTab";
import ComplianceTab from "./ComplianceTab";
import TeamManagement from "./TeamManagement";
import ChangePasswordModal from "./ChangePasswordModal";

type View = "overview" | "console" | "planning" | "logistics" | "market" | "compliance" | "team";

const VesselMap = dynamic(() => import("./VesselMap"), {
  ssr: false,
  loading: () => (
    <div className="panel flex-1 min-h-[360px] flex items-center justify-center text-ink-mute text-[12px] num">
      initialising map…
    </div>
  ),
});

function useClock() {
  const [t, setT] = useState<string>("");
  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString("en-GB", { hour12: false, timeZone: "Africa/Lagos" }) + " WAT";
    setT(fmt());
    const id = setInterval(() => setT(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

function TopBar({
  live, lastUpdate, view, setView, canEdit,
}: { live: boolean; lastUpdate: number; view: View; setView: (v: View) => void; canEdit: boolean }) {
  const clock = useClock();
  const { profile, signOut } = useAuth();
  const [ago, setAgo] = useState(0);
  const [menu, setMenu] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const isAdmin = profile?.role === "admin";
  useEffect(() => {
    const id = setInterval(() => setAgo(Math.floor((Date.now() - lastUpdate) / 1000)), 1000);
    return () => clearInterval(id);
  }, [lastUpdate]);

  const initials = (profile?.full_name ?? "?")
    .split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const tabs: { label: string; view?: View }[] = [
    { label: "Overview", view: "overview" },
    { label: "Logistics", view: "logistics" }, { label: "Market", view: "market" },
    { label: "Planning", view: "planning" }, { label: "Compliance", view: "compliance" },
  ];

  return (
    <header className="sticky top-0 z-30 bg-base/85 backdrop-blur border-b border-line">
      <div className="flex items-center gap-4 px-5 h-14">
        <button onClick={() => setView("overview")} className="flex items-center gap-2.5">
          <div className="relative w-7 h-7 grid place-items-center">
            <div className="absolute inset-0 rounded-[3px] bg-amber/15 border border-amber/40" />
            <div className="w-2.5 h-2.5 bg-amber rounded-[1px]" />
          </div>
          <div className="leading-none text-left">
            <div className="font-black text-[19px] tracking-[0.14em]">LEVEL</div>
            <div className="eyebrow !text-[8.5px] mt-0.5">Delivery Intelligence</div>
          </div>
        </button>

        <div className="h-6 w-px bg-line mx-1" />
        <nav className="hidden md:flex items-center gap-1 text-[12px]">
          {tabs.map((t) => (
            <button key={t.label} onClick={() => t.view && setView(t.view)}
              className={`px-3 py-1.5 rounded-sm transition-colors ${
                (t.view && view === t.view) ? "text-ink bg-panel-2"
                  : t.view ? "text-ink-mute hover:text-ink-dim" : "text-ink-mute/60 cursor-default"
              }`}>{t.label}</button>
          ))}
          {canEdit && (
            <button onClick={() => setView("console")}
              className={`ml-1 px-3 py-1.5 rounded-sm transition-colors flex items-center gap-1.5 ${
                view === "console" ? "bg-amber/15 text-amber" : "text-amber/80 hover:text-amber hover:bg-amber/10"
              }`}>
              <span className="text-[13px] leading-none">＋</span> Data Console
            </button>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3 sm:gap-4">
          <div className="hidden md:flex items-center gap-2 text-[11px]">
            <span className={live ? "livedot" : "w-[7px] h-[7px] rounded-full bg-red"} />
            <span className="num text-ink-dim">{live ? "LIVE" : "OFFLINE"}</span>
            <span className="hidden lg:inline num text-ink-mute">· sync {ago}s</span>
          </div>
          <div className="num text-[12px] text-ink tabular-nums hidden lg:block">{clock || "—"}</div>

          {/* user menu */}
          <div className="relative">
            <button onClick={() => setMenu((m) => !m)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-sm hover:bg-panel-2 transition-colors">
              <div className="w-7 h-7 rounded-full bg-amber/15 border border-amber/40 grid place-items-center text-[10px] text-amber num font-semibold">
                {initials}
              </div>
              <div className="hidden lg:block leading-tight text-left">
                <div className="text-[11.5px] text-ink-dim">{profile?.full_name ?? "—"}</div>
                <div className="eyebrow !text-[8px]">{profile?.role ?? ""}</div>
              </div>
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
                <div className="absolute right-0 mt-1 w-52 panel z-50 p-1 rise">
                  <div className="px-3 py-2 border-b border-line">
                    <div className="text-[12px] text-ink">{profile?.full_name}</div>
                    <div className="text-[10.5px] text-ink-mute num">{profile?.email}</div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="num text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-amber/12 text-amber">{profile?.role}</span>
                      <span className="text-[10px] text-ink-mute">{profile?.org}</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => { setView("team"); setMenu(false); }}
                      className="w-full text-left px-3 py-2 text-[12px] text-ink-dim hover:bg-panel-2 hover:text-amber rounded-sm transition-colors">
                      Manage team
                    </button>
                  )}
                  <button onClick={() => { setShowPw(true); setMenu(false); }}
                    className="w-full text-left px-3 py-2 text-[12px] text-ink-dim hover:bg-panel-2 hover:text-ink rounded-sm transition-colors">
                    Change password
                  </button>
                  <button onClick={signOut}
                    className="w-full text-left px-3 py-2 text-[12px] text-ink-dim hover:bg-panel-2 hover:text-red rounded-sm transition-colors">
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showPw && <ChangePasswordModal onClose={() => setShowPw(false)} />}

      {/* mobile nav — horizontally scrollable tab strip (desktop uses the row above) */}
      <div className="md:hidden overflow-x-auto no-scrollbar border-t border-line/60">
        <div className="flex items-center gap-1.5 px-3 py-2 w-max">
          {tabs.map((t) => (
            <button key={t.label} onClick={() => t.view && setView(t.view)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12.5px] transition-colors ${
                t.view && view === t.view ? "bg-amber/15 text-amber" : "text-ink-dim bg-panel-2/70"
              }`}>{t.label}</button>
          ))}
          {canEdit && (
            <button onClick={() => setView("console")}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12.5px] flex items-center gap-1 transition-colors ${
                view === "console" ? "bg-amber/15 text-amber" : "text-amber/90 bg-panel-2/70"
              }`}>
              <span className="text-[13px] leading-none">＋</span> Console
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default function Dashboard({ initial }: { initial: DashboardData }) {
  const { profile } = useAuth();
  const canEdit = !!profile && CAN_EDIT.includes(profile.role);
  const [view, setView] = useState<View>("overview");
  const [data, setData] = useState<DashboardData>(initial);
  const [live, setLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // guard: non-editors can never land on the console; non-admins never on team
  useEffect(() => { if (view === "console" && !canEdit) setView("overview"); }, [view, canEdit]);
  useEffect(() => { if (view === "team" && profile?.role !== "admin") setView("overview"); }, [view, profile]);

  const refresh = useCallback(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const next = await fetchDashboard();
        setData(next);
        setLastUpdate(Date.now());
      } catch { /* keep last good */ }
    }, 350);
  }, []);

  useEffect(() => {
    const ch = supabase
      .channel("level-live")
      .on("postgres_changes", { event: "*", schema: "level", table: "facility_readings" }, refresh)
      .on("postgres_changes", { event: "*", schema: "level", table: "vessel_latest" }, refresh)
      .on("postgres_changes", { event: "*", schema: "level", table: "prices" }, refresh)
      .on("postgres_changes", { event: "*", schema: "level", table: "alerts" }, refresh)
      .on("postgres_changes", { event: "*", schema: "level", table: "berth_schedule" }, refresh)
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => { supabase.removeChannel(ch); };
  }, [refresh]);

  const kpis = useMemo<Kpi[]>(() => {
    const flagship = data.facilities.find((f) => f.is_flagship);
    const fl = data.facilityLatest.filter((r) => r.facility_id === flagship?.id);
    const crude = fl.find((r) => r.product === "CRUDE");
    const pms = fl.find((r) => r.product === "PMS");
    const ngPortIds = new Set(data.ports.filter((p) => p.country_code === "NG").map((p) => p.id));
    const atAnchor = data.berths.filter((b) => b.status === "anchored" || b.status === "expected");
    const ngAnchor = atAnchor.filter((b) => ngPortIds.has(b.port_id));
    const discharging = data.vessels.filter((v) => (v.sog ?? 0) < 0.5).length;
    const pmsPrice =
      data.prices.find((p) => p.product === "PMS" && p.basis === "ex_depot" && p.country_code === "NG") ??
      data.prices.find((p) => p.product === "PMS" && p.basis === "ex_depot");
    // price history is ~4h-spaced, so the last 6 points ≈ a true 24h window
    const sp = data.pmsSpark;
    const back = Math.min(6, sp.length - 1);
    const pmsDelta = sp.length > 1 ? sp[sp.length - 1] - sp[sp.length - 1 - back] : 0;

    return [
      {
        label: "Dangote · Crude Stock",
        value: fmtVolume(crude?.volume_m3) + "",
        unit: "m³",
        sub: `${Math.round(pct(crude?.volume_m3 ?? 0, crude?.capacity_m3))}% of tank capacity`,
        tone: "amber",
        spark: data.crudeSpark,
      },
      {
        label: "Dangote · PMS Output",
        value: fmtNum(pms?.throughput_m3_day),
        unit: "m³/d",
        sub: `${fmtVolume(pms?.volume_m3)} m³ in stock`,
        tone: "teal",
      },
      {
        label: "Vessels Tracked",
        value: `${data.vessels.length}`,
        sub: `${discharging} berthed / at anchor`,
        tone: "blue",
      },
      {
        label: "Apapa · Congestion",
        value: `${ngAnchor.length}`,
        unit: "at anchor",
        sub: ngAnchor.length >= 3 ? "demurrage risk elevated" : "within normal range",
        tone: ngAnchor.length >= 3 ? "red" : "neutral",
      },
      {
        label: "PMS · Ex-Depot",
        value: pmsPrice ? fmtPrice(pmsPrice.price, pmsPrice.currency) : "—",
        unit: "/L",
        sub: `${pmsDelta >= 0 ? "▲" : "▼"} ₦${Math.abs(pmsDelta).toFixed(0)} vs 24h`,
        tone: "amber",
        spark: data.pmsSpark,
      },
    ];
  }, [data]);

  const flagship = data.facilities.find((f) => f.is_flagship);
  const flagshipReadings = data.facilityLatest.filter((r) => r.facility_id === flagship?.id);

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      <TopBar live={live} lastUpdate={lastUpdate} view={view} setView={setView} canEdit={canEdit} />
      <Ticker prices={data.prices} />

      <main className="flex-1 px-4 py-4 flex flex-col gap-3 max-w-[1680px] w-full mx-auto">
        {view === "console" && canEdit ? (
          <DataConsole facilities={data.facilities} ports={data.ports} />
        ) : view === "planning" ? (
          <DemurrageCalculator ports={data.ports} berths={data.berths} />
        ) : view === "logistics" ? (
          <LogisticsTab data={data} />
        ) : view === "market" ? (
          <MarketTab data={data} />
        ) : view === "compliance" ? (
          <ComplianceTab data={data} />
        ) : view === "team" && profile?.role === "admin" ? (
          <TeamManagement />
        ) : (
          <>
            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {kpis.map((k, i) => <StatTile key={k.label} kpi={k} delay={i * 60} />)}
            </div>

            {/* Balanced 2-column workspace: left = map + storage/berths, right rail = Dangote + alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              {/* LEFT */}
              <div className="lg:col-span-8 flex flex-col gap-3 lg:h-[672px]">
                <div className="h-[320px] sm:h-[360px] flex">
                  <VesselMap ports={data.ports} vessels={data.vessels} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:h-[300px]">
                  <TankFarmLevels facilities={data.facilities} readings={data.facilityLatest} />
                  <BerthSchedule berths={data.berths} ports={data.ports} />
                </div>
              </div>
              {/* RIGHT RAIL */}
              <div className="lg:col-span-4 flex flex-col gap-3 lg:h-[672px]">
                <DangotePanel facility={flagship} readings={flagshipReadings} />
                <div className="flex-1 min-h-[360px] lg:min-h-0">
                  <AlertsFeed alerts={data.alerts} />
                </div>
              </div>
            </div>
          </>
        )}

        <footer className="flex items-center justify-between text-[10px] text-ink-mute num pt-1 pb-4">
          <span>LEVEL · Real-Time Oil &amp; Gas Delivery Intelligence — Nigeria &amp; West Africa</span>
          <span>Prototype · {data.facilities.length} facilities · {data.ports.length} ports · role-based access</span>
        </footer>
      </main>
    </div>
  );
}
