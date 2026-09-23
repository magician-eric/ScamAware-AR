import { useTranslation } from "react-i18next";
import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { StockRow } from "../components/ui/StockRow";
import { PriceChange } from "../components/ui/PriceChange";
import { AreaTrendChart } from "../components/charts/AreaTrendChart";
import { getHotStocks, OTC_INDEX, TSE_INDEX, TSE_INDEX_DAY_TREND } from "../data/stocks";
import { directionColorClass, formatInt, formatNumber } from "../utils/format";
import { usePortfolioSummary } from "../store/AppStoreContext";

export function Home() {
  const { t } = useTranslation();
  const { totalAssets, todayPnl } = usePortfolioSummary();
  const hotStocks = getHotStocks(18);

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader />

      <div className="flex-1 space-y-4 px-4 py-4">
        {/* 大盤指數 Market Index */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3">
            <div className="text-[14px] text-brand-gray">{t("home.tseIndexName")}</div>
            <div className={`mt-1 text-xl font-bold ${directionColorClass(TSE_INDEX.change)}`}>{formatNumber(TSE_INDEX.value)}</div>
            <PriceChange change={TSE_INDEX.change} changePercent={TSE_INDEX.changePercent} />
          </Card>
          <Card className="p-3">
            <div className="text-[14px] text-brand-gray">{t("home.otcIndexName")}</div>
            <div className={`mt-1 text-xl font-bold ${directionColorClass(OTC_INDEX.change)}`}>{formatNumber(OTC_INDEX.value)}</div>
            <PriceChange change={OTC_INDEX.change} changePercent={OTC_INDEX.changePercent} />
          </Card>
        </div>

        {/* 今日損益 / 總資產 */}
        <Card
          className="grid grid-cols-2 gap-3 p-4"
        >
          <div>
            <div className="text-[14px] text-brand-gray">{t("home.totalAssets")}</div>
            <div className="mt-1 text-lg font-bold text-brand-white">{formatInt(totalAssets)}</div>
            <div className="text-[14px] text-brand-gray">{t("common.twd")}</div>
          </div>
          <div className="text-right">
            <div className="text-[14px] text-brand-gray">{t("home.todayPnl")}</div>
            <div className={`mt-1 text-lg font-bold ${directionColorClass(todayPnl)}`}>{formatInt(todayPnl)}</div>
            <div className="text-[14px] text-brand-gray">{t("common.twd")}</div>
          </div>
        </Card>

        {/* 市場趨勢圖 */}
        <Card className="p-3">
          <div className="mb-1 text-[14px] font-semibold text-brand-gray">{t("home.marketTrend")}</div>
          <AreaTrendChart data={TSE_INDEX_DAY_TREND} positive={TSE_INDEX.change >= 0} height={130} />
        </Card>

        {/* 熱門股票 - fixed-height card whose list auto-scrolls upward like a
            ticker tape (no manual swipe) instead of pushing the rest of the
            page down as the list grows (the bottom nav below already covers
            Markets/Watchlist/Trade/Portfolio, so a separate quick-actions
            grid duplicating those same destinations was removed). The track
            renders the stock list twice back to back and the CSS animation
            loops at -50% so it reads as an endless scroll with no seam. */}
        <Card className="p-3">
          <div className="mb-1 flex items-center justify-between">
            <div className="text-[14px] font-semibold text-brand-gray">{t("home.hotStocks")}</div>
            <span className="text-[14px] font-medium text-brand-gold">
              {t("common.viewAll")}
            </span>
          </div>
          <div className="marquee-viewport h-[260px] overflow-hidden">
            <div className="marquee-track">
              {[...hotStocks, ...hotStocks].map((stock, i) => (
                <StockRow key={`${stock.code}-${i}`} stock={stock} showSparkline />
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
