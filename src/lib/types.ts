export type Product = "PMS" | "AGO" | "ATK" | "DPK" | "LPG" | "CRUDE" | "LNG";
export type FacilityKind = "refinery" | "tank_farm" | "depot" | "terminal";
export type PriceBasis = "ex_depot" | "ex_refinery" | "import_parity" | "platts";
export type AlertSeverity = "info" | "warning" | "critical";
export type BerthStatus = "expected" | "anchored" | "berthed" | "discharging" | "departed";

export interface Facility {
  id: string;
  name: string;
  kind: FacilityKind;
  operator: string | null;
  country_code: string;
  port_id: string | null;
  lat: number | null;
  lng: number | null;
  capacity_m3: number | null;
  is_flagship: boolean;
}

export interface FacilityLatest {
  facility_id: string;
  product: Product;
  volume_m3: number;
  capacity_m3: number | null;
  throughput_m3_day: number | null;
  source: string | null;
  recorded_at: string;
}

export interface Port {
  id: string;
  name: string;
  country_code: string;
  lat: number;
  lng: number;
  unlocode: string | null;
}

export interface VesselLatest {
  mmsi: number;
  lat: number;
  lng: number;
  sog: number | null;
  cog: number | null;
  heading: number | null;
  nav_status: number | null;
  recorded_at: string;
}

export interface Vessel {
  mmsi: number;
  imo: number | null;
  name: string | null;
  ship_type: number | null;
  product: Product | null;
  dwt: number | null;
  flag: string | null;
}

export interface Berth {
  id: string;
  port_id: string;
  vessel_mmsi: number | null;
  vessel_name: string | null;
  product: Product | null;
  volume_mt: number | null;
  status: BerthStatus;
  eta: string | null;
  laycan_start: string | null;
  laycan_end: string | null;
}

export interface Price {
  product: Product;
  basis: PriceBasis;
  country_code: string | null;
  location: string | null;
  price: number;
  currency: string;
  unit: string;
  recorded_at: string;
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  category: string;
  title: string;
  body: string | null;
  facility_id: string | null;
  port_id: string | null;
  product: Product | null;
  created_at: string;
}

export interface DashboardData {
  facilities: Facility[];
  facilityLatest: FacilityLatest[];
  ports: Port[];
  vessels: (Vessel & VesselLatest)[];
  berths: Berth[];
  prices: Price[];
  alerts: Alert[];
  crudeSpark: number[];
  pmsSpark: number[];
}
