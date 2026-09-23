export type Market = "TSE" | "OTC" | "ETF";

export type Sector =
  | "semiconductor"
  | "tech"
  | "financial"
  | "telecom"
  | "shipping"
  | "traditional"
  | "biotech"
  | "defense"
  | "drone"
  | "consumer"
  | "auto"
  | "etf";

export interface KlinePoint {
  /** UTC seconds — the native "time" format lightweight-charts expects. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface KlineSet {
  day: KlinePoint[];
  week: KlinePoint[];
  month: KlinePoint[];
  year: KlinePoint[];
}

export type KlinePeriod = keyof KlineSet;

export interface Stock {
  code: string;
  nameZh: string;
  nameEn: string;
  nameJp: string;
  market: Market;
  sector: Sector;
  currentPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  marketCap: number;
  ma5: number;
  ma20: number;
  ma60: number;
  klineData: KlineSet;
}
