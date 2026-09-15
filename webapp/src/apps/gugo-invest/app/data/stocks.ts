import type { Stock } from "../types/stock";
import { generateKlineSet, mulberry32, SESSION_SEED } from "./klineGenerator";

interface StockSeed {
  code: string;
  nameZh: string;
  nameEn: string;
  nameJp: string;
  market: Stock["market"];
  sector: Stock["sector"];
  basePrice: number;
  marketCap: number;
}

// Base info + a plausible current price/market-cap for each stock. Everything
// else (change, OHLC, volume, MAs, K-line candles) is derived below so all
// the numbers stay internally consistent with each other. Deliberately spans
// a wide range of sectors (not just semiconductor/tech/financial) - biotech,
// defense, drone, traditional industry, consumer, ETFs - so the AI quant
// allocation (see buildRandomAllocation in AppStoreContext.tsx) and Markets'
// full listing both read as genuinely diversified rather than a pile of
// similar tech names.
const STOCK_SEEDS: StockSeed[] = [
  { code: "2330", nameZh: "台積電", nameEn: "TSMC", nameJp: "TSMC（台湾積体電路製造）", market: "TSE", sector: "semiconductor", basePrice: 812.0, marketCap: 21_050_000_000_000 },
  { code: "2317", nameZh: "鴻海", nameEn: "Hon Hai (Foxconn)", nameJp: "鴻海精密工業（フォックスコン）", market: "TSE", sector: "tech", basePrice: 178.5, marketCap: 1_920_000_000_000 },
  { code: "2454", nameZh: "聯發科", nameEn: "MediaTek", nameJp: "MediaTek", market: "TSE", sector: "semiconductor", basePrice: 1245.0, marketCap: 1_980_000_000_000 },
  { code: "2308", nameZh: "台達電", nameEn: "Delta Electronics", nameJp: "デルタ電子", market: "TSE", sector: "tech", basePrice: 398.0, marketCap: 1_030_000_000_000 },
  { code: "2412", nameZh: "中華電", nameEn: "Chunghwa Telecom", nameJp: "中華電信", market: "TSE", sector: "telecom", basePrice: 128.5, marketCap: 995_000_000_000 },
  { code: "2881", nameZh: "富邦金", nameEn: "Fubon Financial", nameJp: "富邦金融控股", market: "TSE", sector: "financial", basePrice: 92.3, marketCap: 812_000_000_000 },
  { code: "2882", nameZh: "國泰金", nameEn: "Cathay Financial", nameJp: "国泰金融控股", market: "TSE", sector: "financial", basePrice: 68.4, marketCap: 731_000_000_000 },
  { code: "2891", nameZh: "中信金", nameEn: "CTBC Financial", nameJp: "中国信託金融控股", market: "TSE", sector: "financial", basePrice: 41.2, marketCap: 512_000_000_000 },
  { code: "2603", nameZh: "長榮", nameEn: "Evergreen Marine", nameJp: "エバーグリーン海運", market: "TSE", sector: "shipping", basePrice: 189.0, marketCap: 456_000_000_000 },
  { code: "1301", nameZh: "台塑", nameEn: "Formosa Plastics", nameJp: "台湾プラスチック", market: "TSE", sector: "traditional", basePrice: 72.3, marketCap: 398_000_000_000 },
  { code: "2002", nameZh: "中鋼", nameEn: "China Steel", nameJp: "中国鋼鉄", market: "TSE", sector: "traditional", basePrice: 28.4, marketCap: 452_000_000_000 },
  { code: "2886", nameZh: "兆豐金", nameEn: "Mega Financial", nameJp: "メガ金融控股", market: "TSE", sector: "financial", basePrice: 45.15, marketCap: 702_000_000_000 },
  { code: "2884", nameZh: "玉山金", nameEn: "E.Sun Financial", nameJp: "玉山金融控股", market: "TSE", sector: "financial", basePrice: 30.1, marketCap: 447_000_000_000 },
  { code: "3008", nameZh: "大立光", nameEn: "Largan Precision", nameJp: "大立光電", market: "TSE", sector: "semiconductor", basePrice: 2305.0, marketCap: 301_000_000_000 },
  { code: "3711", nameZh: "日月光投控", nameEn: "ASE Technology", nameJp: "日月光投資控股", market: "TSE", sector: "semiconductor", basePrice: 146.5, marketCap: 951_000_000_000 },
  { code: "2379", nameZh: "瑞昱", nameEn: "Realtek", nameJp: "リアルテック", market: "TSE", sector: "semiconductor", basePrice: 521.0, marketCap: 332_000_000_000 },
  { code: "2382", nameZh: "廣達", nameEn: "Quanta Computer", nameJp: "クアンタ・コンピュータ", market: "TSE", sector: "tech", basePrice: 286.5, marketCap: 883_000_000_000 },
  { code: "2357", nameZh: "華碩", nameEn: "ASUS", nameJp: "ASUS（華碩電腦）", market: "TSE", sector: "tech", basePrice: 617.0, marketCap: 801_000_000_000 },
  { code: "1216", nameZh: "統一", nameEn: "Uni-President", nameJp: "統一企業", market: "TSE", sector: "consumer", basePrice: 78.3, marketCap: 1_022_000_000_000 },
  { code: "2207", nameZh: "和泰車", nameEn: "Hotai Motor", nameJp: "和泰汽車", market: "TSE", sector: "auto", basePrice: 681.0, marketCap: 328_000_000_000 },
  { code: "6547", nameZh: "高端疫苗", nameEn: "Medigen Vaccine", nameJp: "ハイエンドワクチン", market: "OTC", sector: "biotech", basePrice: 85.0, marketCap: 21_000_000_000 },
  { code: "1795", nameZh: "美時", nameEn: "Lotus Pharmaceutical", nameJp: "ロータス製薬", market: "TSE", sector: "biotech", basePrice: 342.0, marketCap: 47_000_000_000 },
  { code: "2634", nameZh: "漢翔", nameEn: "AIDC (Aerospace Industrial)", nameJp: "漢翔航空工業", market: "TSE", sector: "defense", basePrice: 55.6, marketCap: 74_000_000_000 },
  { code: "8033", nameZh: "雷虎", nameEn: "Thunder Tiger", nameJp: "サンダータイガー", market: "OTC", sector: "drone", basePrice: 138.0, marketCap: 8_500_000_000 },
  { code: "8495", nameZh: "經緯航太", nameEn: "Geosat Aerospace", nameJp: "ジオサット・エアロスペース", market: "OTC", sector: "drone", basePrice: 218.0, marketCap: 6_200_000_000 },
  { code: "1101", nameZh: "台泥", nameEn: "Taiwan Cement", nameJp: "台湾セメント", market: "TSE", sector: "traditional", basePrice: 32.4, marketCap: 213_000_000_000 },
  { code: "2912", nameZh: "統一超", nameEn: "President Chain Store", nameJp: "統一超商（セブンイレブン）", market: "TSE", sector: "consumer", basePrice: 268.0, marketCap: 259_000_000_000 },
  { code: "0050", nameZh: "元大台灣50", nameEn: "Yuanta Taiwan 50 ETF", nameJp: "元大台湾50 ETF", market: "ETF", sector: "etf", basePrice: 186.0, marketCap: 900_000_000_000 },
  { code: "0056", nameZh: "元大高股息", nameEn: "Yuanta High Dividend ETF", nameJp: "元大高配当ETF", market: "ETF", sector: "etf", basePrice: 37.2, marketCap: 400_000_000_000 },
  { code: "00878", nameZh: "國泰永續高股息", nameEn: "Cathay Sustainable Dividend ETF", nameJp: "国泰サステナブル高配当ETF", market: "ETF", sector: "etf", basePrice: 23.1, marketCap: 350_000_000_000 },
];

function average(values: number[]): number {
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

function buildStock(seed: StockSeed): Stock {
  const klineData = generateKlineSet(seed.code, seed.basePrice);
  const dayCandles = klineData.day;
  const monthCloses = klineData.month.map((p) => p.close);
  const yearCloses = klineData.year.map((p) => p.close);

  const currentPrice = seed.basePrice;
  const previousClose = klineData.week[klineData.week.length - 2]?.close ?? currentPrice;
  const change = Math.round((currentPrice - previousClose) * 100) / 100;
  const changePercent = Math.round((change / previousClose) * 10000) / 100;

  const open = dayCandles[0]?.open ?? currentPrice;
  const high = Math.max(...dayCandles.map((p) => p.high));
  const low = Math.min(...dayCandles.map((p) => p.low));
  const volume = dayCandles.reduce((sum, p) => sum + p.volume, 0);

  return {
    code: seed.code,
    nameZh: seed.nameZh,
    nameEn: seed.nameEn,
    nameJp: seed.nameJp,
    market: seed.market,
    sector: seed.sector,
    currentPrice,
    change,
    changePercent,
    volume,
    open,
    high,
    low,
    previousClose,
    marketCap: seed.marketCap,
    ma5: average(monthCloses.slice(-5)),
    ma20: average(monthCloses),
    ma60: average(yearCloses),
    klineData,
  };
}

export const STOCKS: Stock[] = STOCK_SEEDS.map(buildStock);

export function getStockByCode(code: string): Stock | undefined {
  return STOCKS.find((s) => s.code === code);
}

export function getStockName(stock: Stock, lang: string): string {
  if (lang === "en") return stock.nameEn;
  if (lang === "jp") return stock.nameJp;
  return stock.nameZh;
}

// Two synthetic broad-market indices for the Home/Markets pages, jittered a
// little off the reference CIS baseline (加權指數 21,804.87 / OTC 252.40)
// each session using the same session seed as the stock candles, so these
// never look frozen at the exact same numbers on every demo run either.
const indexRand = mulberry32(SESSION_SEED ^ 0x9e3779b9);
function jitterIndex(baseValue: number, baseChangePercent: number) {
  const changePercent = Math.round((baseChangePercent + (indexRand() - 0.5) * 2) * 100) / 100;
  const value = Math.round((baseValue * (1 + (changePercent - baseChangePercent) / 100)) * 100) / 100;
  const change = Math.round((value * changePercent) / (100 + changePercent) * 100) / 100;
  return { value, change, changePercent };
}

export const TSE_INDEX = jitterIndex(21804.87, 1.19);
export const OTC_INDEX = jitterIndex(252.4, 2.1);

// Reuses the same generator to give the Home page's "market trend" chart a
// coherent intraday index line rather than borrowing one stock's candles.
export const TSE_INDEX_DAY_TREND = generateKlineSet("TSEINDEX", TSE_INDEX.value).day;

// One highest-volume stock per sector first (guarantees every industry
// shows up, not just whichever happens to roll the highest random volume),
// then fills any remaining slots by overall volume.
export function getHotStocks(count = 5): Stock[] {
  const bySector = new Map<string, Stock[]>();
  for (const s of STOCKS) {
    const list = bySector.get(s.sector) ?? [];
    list.push(s);
    bySector.set(s.sector, list);
  }
  const picked: Stock[] = [];
  const pickedCodes = new Set<string>();
  for (const list of bySector.values()) {
    const top = [...list].sort((a, b) => b.volume - a.volume)[0];
    picked.push(top);
    pickedCodes.add(top.code);
  }
  const rest = [...STOCKS].filter((s) => !pickedCodes.has(s.code)).sort((a, b) => b.volume - a.volume);
  return [...picked, ...rest].slice(0, count);
}
