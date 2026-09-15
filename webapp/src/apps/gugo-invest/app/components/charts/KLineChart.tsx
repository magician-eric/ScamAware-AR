import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { KlinePoint } from "../../types/stock";
import { ChartAttribution } from "./ChartAttribution";

interface KLineChartProps {
  data: KlinePoint[];
  height?: number;
  showMA?: boolean;
}

function rollingAverage(data: KlinePoint[], window: number) {
  const out: { time: UTCTimestamp; value: number }[] = [];
  for (let i = window - 1; i < data.length; i += 1) {
    let sum = 0;
    for (let j = i - window + 1; j <= i; j += 1) sum += data[j].close;
    out.push({ time: data[i].time as UTCTimestamp, value: Math.round((sum / window) * 100) / 100 });
  }
  return out;
}

export function KLineChart({ data, height = 260, showMA = true }: KLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8A94A6",
        fontFamily: "Inter, 'Noto Sans TC', sans-serif",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(138,148,166,0.08)" },
        horzLines: { color: "rgba(138,148,166,0.08)" },
      },
      rightPriceScale: { borderColor: "rgba(138,148,166,0.15)" },
      timeScale: { borderColor: "rgba(138,148,166,0.15)", timeVisible: true, secondsVisible: false },
      crosshair: { mode: CrosshairMode.Hidden },
      handleScroll: false,
      handleScale: false,
      width: container.clientWidth,
      height,
    });
    chartRef.current = chart;

    // Taiwan convention: red candles = up, green candles = down.
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#EF4D4D",
      downColor: "#00B37E",
      borderUpColor: "#EF4D4D",
      borderDownColor: "#00B37E",
      wickUpColor: "#EF4D4D",
      wickDownColor: "#00B37E",
      priceScaleId: "right",
    });
    candleSeries.priceScale().applyOptions({ scaleMargins: { top: 0.06, bottom: 0.28 } });
    candleSeries.setData(
      data.map((p) => ({ time: p.time as UTCTimestamp, open: p.open, high: p.high, low: p.low, close: p.close })),
    );

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    volumeSeries.setData(
      data.map((p) => ({
        time: p.time as UTCTimestamp,
        value: p.volume,
        color: p.close >= p.open ? "rgba(239,77,77,0.55)" : "rgba(0,179,126,0.55)",
      })),
    );

    if (showMA) {
      const maConfigs: { window: number; color: string }[] = [
        { window: 5, color: "#D4AF37" },
        { window: 20, color: "#5B8DEF" },
        { window: 60, color: "#B266FF" },
      ];
      for (const { window, color } of maConfigs) {
        if (data.length <= window) continue;
        const maSeries = chart.addSeries(LineSeries, {
          color,
          lineWidth: 1,
          priceScaleId: "right",
          lastValueVisible: false,
          priceLineVisible: false,
        });
        maSeries.setData(rollingAverage(data, window));
      }
    }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, height, showMA]);

  return <div className="relative" style={{ width: "100%", height }}>
    <div ref={containerRef} style={{ width: "100%", height }} />
    <ChartAttribution />
  </div>;
}
