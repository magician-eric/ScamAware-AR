export function formatNumber(value: number, digits = 2): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatInt(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

export function formatSigned(value: number, digits = 2): string {
  const sign = value > 0 ? "+" : value < 0 ? "" : "";
  return `${sign}${formatNumber(value, digits)}`;
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "" : "";
  return `${sign}${formatNumber(value, 2)}%`;
}

/**
 * Taiwan market convention (kept in every language per product spec):
 * red = up, green = down — the opposite of the US/EU convention, so this
 * must never be swapped based on locale.
 */
export function priceDirection(change: number): "up" | "down" | "flat" {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "flat";
}

export function directionColorClass(change: number): string {
  const dir = priceDirection(change);
  if (dir === "up") return "text-brand-red";
  if (dir === "down") return "text-brand-green";
  return "text-brand-gray";
}

export function directionBgClass(change: number): string {
  const dir = priceDirection(change);
  if (dir === "up") return "bg-brand-red/15 text-brand-red";
  if (dir === "down") return "bg-brand-green/15 text-brand-green";
  return "bg-brand-gray/15 text-brand-gray";
}

/** Market cap formatted the way each locale reads big numbers. */
export function formatMarketCap(value: number, lang: string): string {
  if (lang === "en") {
    if (value >= 1_000_000_000_000) return `${formatNumber(value / 1_000_000_000_000, 2)}T`;
    if (value >= 1_000_000_000) return `${formatNumber(value / 1_000_000_000, 2)}B`;
    return `${formatNumber(value / 1_000_000, 2)}M`;
  }
  // zh-TW / jp both use 億 (100M) / 兆 (trillion) style grouping.
  const yi = value / 100_000_000;
  if (yi >= 10000) return `${formatNumber(yi / 10000, 2)}兆`;
  return `${formatNumber(yi, 0)}億`;
}
