import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { StockRow } from "../components/ui/StockRow";
import { PriceChange } from "../components/ui/PriceChange";
import { STOCKS, OTC_INDEX, TSE_INDEX } from "../data/stocks";
import { directionColorClass, formatNumber } from "../utils/format";
const TABS = [
  { key: "all", labelKey: "markets.tabAll" },
  { key: "ETF", labelKey: "markets.tabEtf" },
];

export function Markets() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader />

      <div className="flex-none px-4 pt-3">
        <div className="flex items-center gap-2 rounded-xl border border-brand-gold/15 bg-brand-navy/40 px-3 py-2">
          <Search size={16} className="text-brand-gray" />
          <span className="w-full text-sm text-brand-gray">{t("common.search")}</span>
        </div>
      </div>

      <div className="no-scrollbar flex-none overflow-x-auto px-4 pt-3">
        <div className="flex gap-2">
          {TABS.map(({ key, labelKey }) => (
            <span
              key={key}
              className={`flex-none rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                key === "all" ? "bg-brand-gold text-brand-bg" : "bg-brand-navy/50 text-brand-gray"
              }`}
            >
              {t(labelKey)}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-4 px-4 py-4">
        <Card className="p-3">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs text-brand-gray">{t("home.tseIndexName")}</span>
            <div className="text-right">
              <span className={`mr-2 text-sm font-bold ${directionColorClass(TSE_INDEX.change)}`}>{formatNumber(TSE_INDEX.value)}</span>
              <PriceChange change={TSE_INDEX.change} changePercent={TSE_INDEX.changePercent} align="right" />
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-white/5 py-1.5">
            <span className="text-xs text-brand-gray">{t("home.otcIndexName")}</span>
            <div className="text-right">
              <span className={`mr-2 text-sm font-bold ${directionColorClass(OTC_INDEX.change)}`}>{formatNumber(OTC_INDEX.value)}</span>
              <PriceChange change={OTC_INDEX.change} changePercent={OTC_INDEX.changePercent} align="right" />
            </div>
          </div>
        </Card>

        <Card className="p-3">
          {STOCKS.map((stock) => <StockRow key={stock.code} stock={stock} />)}
        </Card>
      </div>
    </div>
  );
}
