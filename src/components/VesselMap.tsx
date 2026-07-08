"use client";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Port, Vessel, VesselLatest } from "@/lib/types";
import { PRODUCT_COLORS, PRODUCT_LABELS, fmtNum } from "@/lib/format";

type MapVessel = Vessel & VesselLatest;

// West Africa view bounds: [[south, west], [north, east]]
const BOUNDS: L.LatLngBoundsExpression = [[3.5, -18.5], [15.5, 9.5]];

function vesselHtml(v: MapVessel): string {
  const color = v.product ? PRODUCT_COLORS[v.product] : "#46b1ff";
  const moving = (v.sog ?? 0) > 0.5;
  const rot = v.heading ?? v.cog ?? 0;
  return `
    <div style="position:relative;width:20px;height:20px;transform:rotate(${rot}deg)">
      ${moving ? `<div style="position:absolute;left:50%;top:50%;width:2px;height:15px;background:linear-gradient(${color},transparent);transform:translate(-50%,0);opacity:.5"></div>` : ""}
      <svg width="20" height="20" viewBox="0 0 20 20" style="position:absolute;left:0;top:0;filter:drop-shadow(0 0 4px ${color}88)">
        <path d="M10 1 L16 18 L10 14 L4 18 Z" fill="${color}" stroke="#080b0f" stroke-width="1"/>
      </svg>
    </div>`;
}

function portHtml(p: Port): string {
  const hub = p.country_code === "NG";
  return `
    <div style="display:flex;align-items:center;gap:5px;white-space:nowrap">
      <div style="width:8px;height:8px;border:1.5px solid ${hub ? "#f5a623" : "#7b8b99"};background:#080b0f;transform:rotate(45deg)"></div>
      <span style="font:500 10px var(--font-mono),monospace;color:${hub ? "#f5a623" : "#9fb0bf"};letter-spacing:.03em;text-shadow:0 1px 3px #000">${p.name.split(" (")[0]}</span>
    </div>`;
}

function popupHtml(v: MapVessel): string {
  return `
    <div style="min-width:180px;font-family:var(--font-chivo),sans-serif">
      <div style="font:600 13px var(--font-chivo);color:#e8eef4">${v.name ?? "Unknown vessel"}</div>
      <div style="font:400 10px monospace;color:#61717f;letter-spacing:.05em;margin-top:2px">MMSI ${v.mmsi} · ${v.flag ?? "—"}</div>
      <div style="height:1px;background:#26343f;margin:8px 0"></div>
      <div style="display:grid;grid-template-columns:auto auto;gap:4px 14px;font:400 11px monospace;color:#9fb0bf">
        <span style="color:#61717f">Cargo</span><span style="color:${v.product ? PRODUCT_COLORS[v.product] : "#9fb0bf"};text-align:right">${v.product ? PRODUCT_LABELS[v.product].split(" (")[0] : "—"}</span>
        <span style="color:#61717f">DWT</span><span style="text-align:right">${fmtNum(v.dwt)} t</span>
        <span style="color:#61717f">Speed</span><span style="text-align:right">${(v.sog ?? 0).toFixed(1)} kn</span>
        <span style="color:#61717f">Course</span><span style="text-align:right">${Math.round(v.cog ?? 0)}°</span>
      </div>
    </div>`;
}

export default function VesselMap({
  ports, vessels,
}: { ports: Port[]; vessels: MapVessel[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const [ready, setReady] = useState(false);

  // init map once
  useEffect(() => {
    if (!ref.current || map.current) return;
    const m = L.map(ref.current, {
      zoomControl: true,
      attributionControl: true,
      dragging: true,
      scrollWheelZoom: false,
      minZoom: 3,
      maxZoom: 12,
    }).fitBounds(BOUNDS);

    // Esri World Dark Gray Base — keyless, no origin restriction (Carto's
    // basemaps CDN silently hangs when requested from the deployed domain).
    // Note: Esri tiles use {z}/{y}/{x} order (y before x).
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Esri · HERE · Garmin · © OpenStreetMap contributors",
        maxZoom: 16,
      },
    ).addTo(m);

    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    // container may start at 0 size; settle it once painted
    requestAnimationFrame(() => m.invalidateSize());
    setTimeout(() => { m.invalidateSize(); m.fitBounds(BOUNDS); }, 150);
    setReady(true);

    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(ref.current);

    return () => { ro.disconnect(); m.remove(); map.current = null; layer.current = null; setReady(false); };
  }, []);

  // draw markers on data change
  useEffect(() => {
    const lg = layer.current;
    if (!lg || !ready) return;
    lg.clearLayers();

    ports.forEach((p) => {
      L.marker([p.lat, p.lng], {
        icon: L.divIcon({ html: portHtml(p), className: "lvl-icon", iconSize: [120, 12], iconAnchor: [4, 6] }),
        interactive: false,
      }).addTo(lg);
    });

    vessels.forEach((v) => {
      L.marker([v.lat, v.lng], {
        icon: L.divIcon({ html: vesselHtml(v), className: "lvl-icon", iconSize: [20, 20], iconAnchor: [10, 10] }),
      }).bindPopup(popupHtml(v)).addTo(lg);
    });
  }, [ready, ports, vessels]);

  return (
    <div className="panel rise relative overflow-hidden flex-1 min-h-[360px]" style={{ animationDelay: "40ms" }}>
      <div ref={ref} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "#080b0f" }} />
      <div className="absolute top-2.5 left-14 right-3 z-[500] pointer-events-none">
        <div className="eyebrow">Live Tracking · Gulf of Guinea</div>
        <h3 className="font-bold text-[14px] sm:text-[15px] tracking-tight mt-0.5 flex items-center gap-2">
          West Africa Vessel Map
          <span className="livedot" />
        </h3>
      </div>
      <div className="absolute top-3 right-3 z-[500] flex items-center gap-2 bg-base/70 backdrop-blur px-2.5 py-1.5 rounded-sm border border-line">
        <span className="num text-[18px] font-semibold text-blue leading-none">{vessels.length}</span>
        <span className="eyebrow leading-tight">Vessels<br/>Tracked</span>
      </div>
      <div className="absolute bottom-3 left-3 z-[500] flex flex-wrap gap-x-3 gap-y-1 bg-base/70 backdrop-blur px-2.5 py-1.5 rounded-sm border border-line max-w-[70%]">
        {(["PMS", "AGO", "DPK", "ATK", "LPG", "CRUDE"] as const).map((p) => (
          <span key={p} className="flex items-center gap-1 text-[10px] num text-ink-dim">
            <span className="w-2 h-2" style={{ background: PRODUCT_COLORS[p], clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }} />
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}
