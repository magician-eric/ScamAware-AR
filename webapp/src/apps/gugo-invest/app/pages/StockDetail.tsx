import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TopBar } from "../components/layout/TopBar";
import { Card } from "../components/ui/Card";
import { PriceChange } from "../components/ui/PriceChange";
import { KLineChart } from "../components/charts/KLineChart";
import { getStockByCode, getStockName } from "../data/stocks";
import { directionColorClass, formatInt, formatMarketCap, formatNumber } from "../utils/format";
import type { KlinePeriod } from "../types/stock";

const PERIODS: { key: KlinePeriod; labelKey: string }[] = [
  { key: "day", labelKey: "stock.periodDay" },
  { key: "week", labelKey: "stock.periodWeek" },
  { key: "month", labelKey: "stock.periodMonth" },
  { key: "year", labelKey: "stock.periodYear" },
];

export function StockDetail() {
  const { code = "" } = useParams();
  const { t, i18n } = useTranslation();

  const stock = getStockByCode(code);
  const period: KlinePeriod = "day";

  if (!stock) {
    return (
      <div className="flex min-h-full flex-col">
        <TopBar showBack />
        <div className="flex flex-1 items-center justify-center text-sm text-brand-gray">{t("markets.noResults")}</div>
      </div>
    );
  }

  const name = getStockName(stock, i18n.language);

  return (
    <div className="flex min-h-full flex-col">
      <TopBar showBack title={`${name} ${stock.code}`} />

      <div className="flex-1 space-y-4 px-4 py-4">
        <div>
          <div className={`text-3xl font-bold ${directionColorClass(stock.change)}`}>{formatNumber(stock.currentPrice)}</div>
          <PriceChange change={stock.change} changePercent={stock.changePercent} size="md" />
        </div>

        <Card className="p-3">
          <div className="mb-2 flex gap-2">
            {PERIODS.map(({ key, labelKey }) => (
              <span
                key={key}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  period === key ? "bg-brand-gold text-brand-bg" : "bg-brand-navy/50 text-brand-gray"
                }`}
              >
                {t(labelKey)}
              </span>
            ))}
          </div>
          <KLineChart data={stock.klineData[period]} height={240} />
          <div className="mt-2 flex flex-wrap gap-3 text-[14px]">
            <span className="flex items-center gap-1 text-brand-gray">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#D4AF37" }} />
              {t("stock.ma5")} {formatNumber(stock.ma5)}
            </span>
            <span className="flex items-center gap-1 text-brand-gray">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#5B8DEF" }} />
              {t("stock.ma20")} {formatNumber(stock.ma20)}
            </span>
            <span className="flex items-center gap-1 text-brand-gray">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#B266FF" }} />
              {t("stock.ma60")} {formatNumber(stock.ma60)}
            </span>
          </div>
        </Card>

        <Card className="p-3">
          <div className="mb-2 text-[14px] font-semibold text-brand-gray">{t("stock.basicQuote")}</div>
          <div className="grid grid-cols-2 gap-y-2.5 text-sm">
            <QuoteField label={t("stock.open")} value={formatNumber(stock.open)} />
            <QuoteField label={t("stock.high")} value={formatNumber(stock.high)} valueClass="text-brand-red" />
            <QuoteField label={t("stock.low")} value={formatNumber(stock.low)} valueClass="text-brand-green" />
            <QuoteField label={t("stock.prevClose")} value={formatNumber(stock.previousClose)} />
            <QuoteField label={t("stock.volume")} value={formatInt(stock.volume)} />
            <QuoteField label={t("stock.marketCap")} value={formatMarketCap(stock.marketCap, i18n.language)} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function QuoteField({ label, value, valueClass = "text-brand-white" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-brand-gray">{label}</span>
      <span className={`font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}
