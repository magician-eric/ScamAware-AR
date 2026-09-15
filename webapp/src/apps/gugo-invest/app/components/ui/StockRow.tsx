import { useTranslation } from "react-i18next";
import type { Stock } from "../../types/stock";
import { getStockName } from "../../data/stocks";
import { directionColorClass, formatNumber } from "../../utils/format";
import { PriceChange } from "./PriceChange";
import { Sparkline } from "../charts/Sparkline";

interface StockRowProps {
  stock: Stock;
  showSparkline?: boolean;
}

export function StockRow({ stock, showSparkline = false }: StockRowProps) {
  const { i18n } = useTranslation();

  return (
    <div
      className="flex w-full items-center gap-3 border-b border-white/5 py-3 text-left last:border-b-0"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-brand-white">{getStockName(stock, i18n.language)}</div>
        <div className="text-[11px] text-brand-gray">{stock.code}</div>
      </div>

      {showSparkline && (
        <div className="w-14 flex-none">
          <Sparkline data={stock.klineData.month.map((p) => p.close)} change={stock.change} />
        </div>
      )}

      <div className="flex-none text-right">
        <div className={`text-sm font-bold ${directionColorClass(stock.change)}`}>{formatNumber(stock.currentPrice)}</div>
        <PriceChange change={stock.change} changePercent={stock.changePercent} align="right" />
      </div>
    </div>
  );
}
