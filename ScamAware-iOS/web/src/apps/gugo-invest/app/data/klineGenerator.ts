import type { KlinePoint, KlinePeriod } from "../types/stock";

// Deterministic PRNG (mulberry32), seeded per stock code so the candles stay
// internally consistent while a single session is open (switching chart
// periods, revisiting a stock, etc. never reshuffles what's already shown).
export function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// This app never has a real market-data feed - it's a fully offline demo by
// design - so "live" here means "different every fresh session" rather than
// actually real-time. Mixed into every stock's seed below so all the mock
// candles/changes/index numbers vary from one demo run to the next instead
// of being frozen at the exact same hardcoded numbers forever, while still
// staying internally consistent (same values every re-render) for the
// lifetime of one page load.
export const SESSION_SEED = Math.floor(Math.random() * 0xffffffff);

function seedFromCode(code: string): number {
  let h = SESSION_SEED;
  for (let i = 0; i < code.length; i += 1) {
    h = (h * 31 + code.charCodeAt(i)) | 0;
  }
  return h;
}

function generateSeries(
  rand: () => number,
  count: number,
  endPrice: number,
  volatility: number,
  labelFor: (indexFromEnd: number) => number,
): KlinePoint[] {
  // Walk backwards from the known current/end price so the series always
  // lands exactly on today's real currentPrice.
  const closes: number[] = new Array(count);
  closes[count - 1] = endPrice;
  for (let i = count - 2; i >= 0; i -= 1) {
    const drift = (rand() - 0.5) * 2 * volatility;
    const next = closes[i + 1] / (1 + drift);
    closes[i] = Math.max(next, endPrice * 0.4);
  }

  const points: KlinePoint[] = [];
  let prevClose = closes[0] * (1 + (rand() - 0.5) * volatility);
  for (let i = 0; i < count; i += 1) {
    const close = closes[i];
    const open = prevClose;
    const high = Math.max(open, close) * (1 + rand() * volatility * 0.6);
    const low = Math.min(open, close) * (1 - rand() * volatility * 0.6);
    const volume = Math.round(3_000_000 + rand() * 25_000_000);
    points.push({
      time: labelFor(count - 1 - i),
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    });
    prevClose = close;
  }
  return points;
}

export function generateKlineSet(code: string, currentPrice: number) {
  const rand = mulberry32(seedFromCode(code));
  const now = new Date();

  // lightweight-charts formats UTCTimestamp axis labels in UTC with no
  // timezone conversion, so every date/hour below is built with the UTC
  // setters (not the local ones) - otherwise the exact same data renders
  // different-looking axis labels depending on the viewing device's own
  // timezone (e.g. a 13:30 local close in UTC+8 renders as "05:30" here).
  const day = generateSeries(rand, 60, currentPrice, 0.006, (fromEnd) => {
    // 09:00-13:30 TW session, 5-minute candles counting back from now.
    const minutesFromClose = fromEnd * 5;
    const close = new Date(now);
    close.setUTCHours(13, 30, 0, 0);
    const t = new Date(close.getTime() - minutesFromClose * 60_000);
    return Math.floor(t.getTime() / 1000);
  });

  const week = generateSeries(rand, 7, currentPrice, 0.02, (fromEnd) => {
    const d = new Date(now);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - fromEnd);
    return Math.floor(d.getTime() / 1000);
  });

  const month = generateSeries(rand, 22, currentPrice, 0.018, (fromEnd) => {
    const d = new Date(now);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - fromEnd);
    return Math.floor(d.getTime() / 1000);
  });

  const year = generateSeries(rand, 52, currentPrice, 0.035, (fromEnd) => {
    const d = new Date(now);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - fromEnd * 7);
    return Math.floor(d.getTime() / 1000);
  });

  return { day, week, month, year };
}

export const KLINE_PERIODS: KlinePeriod[] = ["day", "week", "month", "year"];
