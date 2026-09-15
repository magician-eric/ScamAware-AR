import { useTranslation } from "react-i18next";
import { Wallet } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { DonutChart } from "../components/charts/DonutChart";
import { getStockName } from "../data/stocks";
import { directionColorClass, formatInt, formatNumber, formatSigned } from "../utils/format";
import { usePortfolioSummary } from "../store/AppStoreContext";

const ALLOCATION_COLORS = ["#D4AF37", "#5B8DEF", "#B266FF", "#4FD1C5", "#F2A65A", "#8A94A6"];

export function Portfolio() {
  const { t, i18n } = useTranslation();
  const { rows, cash, totalAssets, todayPnl, cumulativePnl } = usePortfolioSummary();

  const slices = [
    { label: t("portfolio.cashLabel"), value: cash, color: ALLOCATION_COLORS[0] },
    ...rows.map((r, i) => ({
      label: getStockName(r.stock, i18n.language),
      value: r.marketValue,
      color: ALLOCATION_COLORS[(i + 1) % ALLOCATION_COLORS.length],
    })),
  ];

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader />

      <div className="flex-1 space-y-4 px-4 py-4">
        <Card className="p-4">
          <div className="text-[11px] text-brand-gray">{t("portfolio.totalAssets")}</div>
          <div className="mt-1 text-2xl font-bold text-brand-white">
            {formatInt(totalAssets)} <span className="text-sm font-medium text-brand-gray">{t("common.twd")}</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/5 pt-3 text-center">
            <div>
              <div className="text-[10px] text-brand-gray">{t("portfolio.availableCash")}</div>
              <div className="mt-0.5 text-sm font-semibold text-brand-white">{formatInt(cash)}</div>
            </div>
            <div>
              <div className="text-[10px] text-brand-gray">{t("portfolio.todayPnl")}</div>
              <div className={`mt-0.5 text-sm font-semibold ${directionColorClass(todayPnl)}`}>{formatSigned(todayPnl, 0)}</div>
            </div>
            <div>
              <div className="text-[10px] text-brand-gray">{t("portfolio.cumulativePnl")}</div>
              <div className={`mt-0.5 text-sm font-semibold ${directionColorClass(cumulativePnl)}`}>{formatSigned(cumulativePnl, 0)}</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-3 text-[11px] font-semibold text-brand-gray">{t("portfolio.allocation")}</div>
          <div className="flex items-center gap-4">
            <DonutChart slices={slices} />
            <div className="min-w-0 flex-1 space-y-1.5">
              {slices.map((s) => (
                <div key={s.label} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-1.5 text-brand-gray">
                    <span className="h-2 w-2 flex-none rounded-full" style={{ background: s.color }} />
                    <span className="truncate">{s.label}</span>
                  </span>
                  <span className="flex-none font-semibold text-brand-white">
                    {totalAssets > 0 ? Math.round((s.value / totalAssets) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-3">
          <div className="mb-1 text-[11px] font-semibold text-brand-gray">{t("portfolio.holdings")}</div>
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Wallet size={32} className="text-brand-gray" />
              <p className="text-sm text-brand-gray">{t("portfolio.noHoldings")}</p>
              <span className="text-sm font-semibold text-brand-gold">
                {t("portfolio.noHoldingsAction")}
              </span>
            </div>
          ) : (
            rows.map(({ holding, stock, marketValue, pnl }) => (
              <div
                key={holding.code}
                className="flex w-full items-center justify-between border-b border-white/5 py-3 text-left last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-brand-white">{getStockName(stock, i18n.language)}</div>
                  <div className="text-[11px] text-brand-gray">
                    {formatInt(holding.quantity)} {t("portfolio.qty")} · {t("portfolio.avgCost")} {formatNumber(holding.avgCost)}
                  </div>
                </div>
                <div className="flex-none text-right">
                  <div className="text-sm font-bold text-brand-white">{formatInt(marketValue)}</div>
                  <div className={`text-xs font-semibold ${directionColorClass(pnl)}`}>{formatSigned(pnl, 0)}</div>
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}
