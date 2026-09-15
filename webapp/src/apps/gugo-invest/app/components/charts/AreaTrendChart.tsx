import { useEffect, useRef } from "react";
import { createChart, AreaSeries, ColorType, CrosshairMode, type IChartApi, type UTCTimestamp } from "lightweight-charts";
import type { KlinePoint } from "../../types/stock";
import { ChartAttribution } from "./ChartAttribution";

interface AreaTrendChartProps {
  data: KlinePoint[];
  positive: boolean;
  height?: number;
}

export function AreaTrendChart({ data, positive, height = 140 }: AreaTrendChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const color = positive ? "#EF4D4D" : "#00B37E";
    const chart = createChart(container, {
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#8A94A6", attributionLogo: false },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      timeScale: { visible: true, borderVisible: false, timeVisible: true, secondsVisible: false },
      crosshair: { mode: CrosshairMode.Hidden },
      handleScroll: false,
      handleScale: false,
      width: container.clientWidth,
      height,
    });
    chartRef.current = chart;

    const series = chart.addSeries(AreaSeries, {
      lineColor: color,
      topColor: `${color}55`,
      bottomColor: `${color}05`,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    series.setData(data.map((p) => ({ time: p.time as UTCTimestamp, value: p.close })));
    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(() => {
      if (container) chart.applyOptions({ width: container.clientWidth });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [data, positive, height]);

  return <div className="relative" style={{ width: "100%", height }}>
    <div ref={containerRef} style={{ width: "100%", height }} />
    <ChartAttribution />
  </div>;
}
