interface SparklineProps {
  data: number[];
  change: number;
  width?: number;
  height?: number;
}

/** Tiny inline trend line for list rows — a lightweight SVG polyline rather
 * than a full chart-library instance per row. */
export function Sparkline({ data, change, width = 56, height = 28 }: SparklineProps) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const color = change > 0 ? "#EF4D4D" : change < 0 ? "#00B37E" : "#8A94A6";

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
