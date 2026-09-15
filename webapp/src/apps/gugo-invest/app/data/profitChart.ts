// Procedurally builds the AI quant-contract candlestick chart so it always
// visually matches whatever random today/two-week/month return percentages
// were generated alongside it (see Profit.jsx) - rather than a chart with
// its own independent, hand-placed shape that could show "up" while the
// numbers below say "down". The 10 candles read left-to-right as "the
// month", where the last 4 candles (index 6-9) are "the two weeks" and the
// very last candle (index 9) alone is "today" - so summing the right slice
// of candle changes always reproduces exactly the tier percentage it
// corresponds to.
const VIEWBOX_WIDTH = 360;
const VIEWBOX_HEIGHT = 130;
const CENTER_X = [24, 58, 92, 126, 160, 194, 228, 262, 296, 330];
const RECT_X = [18, 52, 86, 120, 154, 188, 222, 256, 290, 324];
const RECT_WIDTH = 12;
const Y_TOP = 18;
const Y_BOTTOM = 112;
const MIN_BODY_HEIGHT = 5;

// Random per-candle deltas that sum EXACTLY to `total` - gives each segment
// its own zig-zag texture (some candles up, some down) instead of a flat
// straight ramp, even when the segment's net total is 0 or negative.
function splitRandomly(total: number, count: number): number[] {
  if (count === 1) return [total];
  const noise = Array.from({ length: count }, () => Math.random() - 0.5);
  const noiseMean = noise.reduce((a, b) => a + b, 0) / count;
  const amplitude = Math.max(Math.abs(total) * 0.7, 2.5);
  const base = total / count;
  return noise.map((n) => base + (n - noiseMean) * amplitude);
}

export interface ProfitCandle {
  i: number;
  down: boolean;
  /** [x1, y1, x2, y2] of the wick. */
  line: [number, number, number, number];
  /** [x, y, width, height] of the body. */
  rect: [number, number, number, number];
}

export interface ProfitChart {
  candles: ProfitCandle[];
  trendPoints: string;
}

export function generateProfitChart({
  todayPct,
  twoWeekPct,
  monthPct,
}: {
  todayPct: number;
  twoWeekPct: number;
  monthPct: number;
}): ProfitChart {
  // Candle 9 alone = today. Candles 6-8 (plus candle 9) = the two weeks.
  // Candles 0-5 (plus 6-9) = the full month.
  const segmentMonth = splitRandomly(monthPct - twoWeekPct, 6); // candles 0-5
  const segmentTwoWeek = splitRandomly(twoWeekPct - todayPct, 3); // candles 6-8
  const changes = [...segmentMonth, ...segmentTwoWeek, todayPct]; // 10 values

  const cumulative = [0];
  for (const change of changes) cumulative.push(cumulative[cumulative.length - 1] + change);

  const min = Math.min(...cumulative);
  const max = Math.max(...cumulative);
  const range = max - min || 1;
  const toY = (v: number) => Y_BOTTOM - ((v - min) / range) * (Y_BOTTOM - Y_TOP);

  const candles: ProfitCandle[] = changes.map((change, i) => {
    const openY = toY(cumulative[i]);
    const closeY = toY(cumulative[i + 1]);
    const down = change < 0;
    const top = Math.min(openY, closeY);
    const height = Math.max(Math.abs(closeY - openY), MIN_BODY_HEIGHT);
    const wickTop = Math.max(Y_TOP - 4, top - (3 + Math.random() * 6));
    const wickBottom = Math.min(Y_BOTTOM + 4, top + height + (3 + Math.random() * 6));
    return {
      i,
      down,
      line: [CENTER_X[i], wickTop, CENTER_X[i], wickBottom],
      rect: [RECT_X[i], top, RECT_WIDTH, height],
    };
  });

  const trendPoints = cumulative
    .slice(1)
    .map((v, i) => `${CENTER_X[i]},${toY(v).toFixed(1)}`)
    .join(' ');

  return { candles, trendPoints };
}

export { VIEWBOX_WIDTH, VIEWBOX_HEIGHT };
