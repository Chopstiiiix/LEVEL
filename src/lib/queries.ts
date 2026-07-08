import { supabase } from "./supabase";
import type {
  DashboardData, Facility, FacilityLatest, Port, Vessel, VesselLatest, Berth, Price, Alert,
} from "./types";

// All reads go through the public `lvl_*` views (the base tables live in the `level` schema).
export async function fetchDashboard(): Promise<DashboardData> {
  const [facilities, facilityLatest, ports, vesselsBase, vesselPos, berths, prices, alerts] =
    await Promise.all([
      supabase.from("lvl_facilities").select("*").order("is_flagship", { ascending: false }),
      supabase.from("lvl_facility_latest").select("*"),
      supabase.from("lvl_ports").select("*"),
      supabase.from("lvl_vessels").select("*"),
      supabase.from("lvl_vessel_latest").select("*"),
      supabase.from("lvl_berth_schedule").select("*").order("eta", { ascending: true }),
      supabase.from("lvl_prices_latest").select("*"),
      supabase.from("lvl_alerts").select("*").order("created_at", { ascending: false }).limit(30),
    ]);

  const vesselMap = new Map<number, Vessel>();
  (vesselsBase.data ?? []).forEach((v: Vessel) => vesselMap.set(v.mmsi, v));
  const vessels = (vesselPos.data ?? []).map((p: VesselLatest) => ({
    ...(vesselMap.get(p.mmsi) ?? { mmsi: p.mmsi, imo: null, name: null, ship_type: null, product: null, dwt: null, flag: null }),
    ...p,
  }));

  const facilityRows = (facilities.data ?? []) as Facility[];
  const flagship = facilityRows.find((f) => f.is_flagship);

  // Sparklines (best-effort; empty if unavailable)
  const [crudeHist, pmsHist] = await Promise.all([
    flagship
      ? supabase.from("lvl_facility_readings").select("volume_m3,recorded_at")
          .eq("facility_id", flagship.id).eq("product", "CRUDE")
          .order("recorded_at", { ascending: true }).limit(40)
      : Promise.resolve({ data: [] }),
    supabase.from("lvl_prices").select("price,recorded_at")
      .eq("product", "PMS").eq("basis", "ex_depot").eq("location", "Apapa Average")
      .order("recorded_at", { ascending: true }).limit(40),
  ]);

  return {
    facilities: facilityRows,
    facilityLatest: (facilityLatest.data ?? []) as FacilityLatest[],
    ports: (ports.data ?? []) as Port[],
    vessels,
    berths: (berths.data ?? []) as Berth[],
    prices: (prices.data ?? []) as Price[],
    alerts: (alerts.data ?? []) as Alert[],
    crudeSpark: (crudeHist.data ?? []).map((r: { volume_m3: number }) => Number(r.volume_m3)),
    pmsSpark: (pmsHist.data ?? []).map((r: { price: number }) => Number(r.price)),
  };
}
