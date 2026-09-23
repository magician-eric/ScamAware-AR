import { useLayoutEffect, useMemo, useRef } from "react";
import { Banknote, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PlatformHeader } from "../components/layout/PlatformHeader";
import { generateProfitChart } from "../data/profitChart";
import { useMoneyCounter, usePercentCounter } from "../utils/profitAnimation";
import { useGuGoLanguage } from "../i18n/useGuGoLanguage";
import { useARInteraction } from "../../../../lib/arInteraction";
import "../styles/platform.css";

// The chart's own trend-line draw animation runs for exactly this long -
// the top return-rate badge/balance counter are timed to match it.
const CHART_ANIMATION_MS = 5000;
// The three return-tier numbers count up much faster than the chart draws -
// they're small, punchy reveals rather than a slow build.
const TIER_ANIMATION_MS = 900;
const PRINCIPAL = 300000;

function randomRange(min: number, max: number) {
  return Math.round((min + Math.random() * (max - min)) * 10) / 10;
}

function formatMonthDay(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// Randomized once per page load rather than a fixed script - a live AI
// strategy realistically has some down days/weeks, so today and two-week can
// each land on either side of zero independently. The chart
// (generateProfitChart) is derived FROM these same three numbers afterward, so
// it always visually matches whatever combination came up instead of being a
// hand-placed shape that could contradict them.
//
// AUD-04: the month tier is the exception, and is now bounded strictly
// positive. It is the number the headline balance is computed from
// (`finalValue` below), so a negative draw put the player on a screen whose
// whole job is "look how much you have made" showing less than the NT$300,000
// they put in - and then walked them into WithdrawFail, which asks for a
// NT$30,000 deposit to release 「本金與獲利」 that does not exist. Today and
// two-week keep their full range; the platform is not "every number always up",
// only "the headline the scam is built on cannot contradict the scam".
const MONTH_RETURN_MIN_PCT = 3;
const MONTH_RETURN_MAX_PCT = 60;

// AUD-03: the two multi-day tiers report *realised* returns, so their ranges
// have to end today and start in the past. They used to be built with
// setDate(+13) / setDate(+30), which dated 兩週收益 / 本月收益 into the future -
// on 8/22 the platform claimed a month of earnings for 8/22-9/21. Date
// arithmetic stays on setDate(), which normalises month and year rollover on
// its own (Mar 3 - 30 days lands in February, Jan 5 - 30 days lands in the
// previous December), and nothing here is hardcoded: every value is derived
// from `today`.
const TWO_WEEK_SPAN_DAYS = 13;
const ONE_MONTH_SPAN_DAYS = 30;

function daysBefore(date: Date, days: number) {
  const out = new Date(date);
  out.setDate(out.getDate() - days);
  return out;
}

function useProfitScenario() {
  return useMemo(() => {
    const today = new Date();
    const todayPct = randomRange(-5, 7);
    const twoWeekPct = randomRange(-10, 22);
    const monthPct = randomRange(MONTH_RETURN_MIN_PCT, MONTH_RETURN_MAX_PCT);

    const twoWeekStart = daysBefore(today, TWO_WEEK_SPAN_DAYS);
    const monthStart = daysBefore(today, ONE_MONTH_SPAN_DAYS);

    const tiers = [
      { key: "today", labelKey: "profit.today", percent: todayPct, dateRange: formatMonthDay(today) },
      { key: "twoWeeks", labelKey: "profit.twoWeeks", percent: twoWeekPct, dateRange: `${formatMonthDay(twoWeekStart)}–${formatMonthDay(today)}` },
      { key: "oneMonth", labelKey: "profit.oneMonth", percent: monthPct, dateRange: `${formatMonthDay(monthStart)}–${formatMonthDay(today)}` },
    ];

    return { tiers, monthPct, ...generateProfitChart({ todayPct, twoWeekPct, monthPct }) };
  }, []);
}

// Draws the trend polyline with a JS-driven stroke-dashoffset transition
// instead of a fixed CSS keyframe, since the path's total length changes
// every time the random data regenerates it (a hardcoded stroke-dasharray
// would either cut the line off early or hold at full length too long).
function useDrawTrendLine(trendPoints: string) {
  const ref = useRef<SVGPolylineElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const length = el.getTotalLength();
    el.style.transition = "none";
    el.style.strokeDasharray = String(length);
    el.style.strokeDashoffset = String(length);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = `stroke-dashoffset ${CHART_ANIMATION_MS}ms cubic-bezier(0.11,0,0.5,0)`;
        el.style.strokeDashoffset = "0";
      });
    });
  }, [trendPoints]);
  return ref;
}

function TierRow({ tier }: { tier: { labelKey: string; percent: number; dateRange: string } }) {
  const { t } = useTranslation();
  const animatedPercent = usePercentCounter(tier.percent, TIER_ANIMATION_MS);
  const amount = Math.round((PRINCIPAL * animatedPercent) / 100);
  const isLoss = tier.percent < 0;
  return (
    <div className="profit-return-row">
      <div>
        <div className="profit-return-label">{t(tier.labelKey)}</div>
        <div className="profit-return-date">{tier.dateRange}</div>
      </div>
      <div className={`profit-return-value${isLoss ? " is-loss" : ""}`}>
        <strong>{amount < 0 ? "-" : "+"}NT${Math.abs(amount).toLocaleString()}</strong>
        <span>{animatedPercent < 0 ? "-" : "+"}{Math.abs(animatedPercent).toFixed(1)}%</span>
      </div>
    </div>
  );
}

export interface ProfitOverviewProps {
  /** Host language, in CIBAR's codes ('zh' | 'en' | 'jp'). */
  language?: string;
  /**
   * Called when the player taps "request withdrawal". The button is this
   * app's - what happens next is not: the withdrawal is where scenario01's
   * story turns, so the host owns where it goes. This screen never routes
   * anywhere on its own.
   */
  onRequestWithdrawal: () => void;
}

/**
 * The platform's profit / asset-overview screen: the balance counting up off
 * the AI quant contract, the candlestick chart drawn from those same numbers,
 * the three return tiers, and the quick-actions bar.
 *
 * This was scenario01's Profit.jsx, which had grown a whole second GuGo
 * surface - its own brand header, its own asset card, its own chart - beside
 * the real app. It is one screen now, owned here; scenario01 keeps only the
 * decision to show it and where its withdrawal button leads.
 *
 * Rendered as a fragment, straight into the host page's flex column, which is
 * how it has always laid out.
 */
export function ProfitOverview({ language, onRequestWithdrawal }: ProfitOverviewProps) {
  useGuGoLanguage(language);
  const { t } = useTranslation();
  const { tiers, monthPct, candles, trendPoints } = useProfitScenario();
  const finalValue = Math.round(PRINCIPAL * (1 + monthPct / 100));
  const { money, withdrawVisible } = useMoneyCounter(PRINCIPAL, finalValue);
  const returnRate = usePercentCounter(monthPct, CHART_ANIMATION_MS);
  const trendRef = useDrawTrendLine(trendPoints);
  const badgeIsLoss = returnRate < 0;

  // AR Interaction Contract: the balance counts itself up, and the withdrawal
  // button is genuinely absent until it lands - so this screen is `display`
  // while the number is still running and `single` once 申請提領 is really on
  // screen. The chart, the return tiers and the quick-actions bar are
  // presentation, and are never declared.
  useARInteraction(withdrawVisible
    ? { mode: "single", surfaceId: "gugo-invest/profit-overview", action: onRequestWithdrawal }
    : { mode: "display", surfaceId: "gugo-invest/profit-overview-counting" });

  return (
    <>
      <PlatformHeader subtitle={t("profit.title")} />

      <div className="profit-card profit-asset-card">
        <div className="profit-asset-label">{t("profit.principal")}</div>
        <div className="profit-asset-value">{money}</div>
        <div className={`profit-badge${badgeIsLoss ? " is-loss" : ""}`}>
          {badgeIsLoss ? "-" : "+"}{Math.abs(returnRate).toFixed(1)}%
        </div>
        <button type="button" className="btn withdraw-btn" onClick={onRequestWithdrawal} hidden={!withdrawVisible}>
          {t("profit.requestWithdrawal")}
        </button>
      </div>

      <div className="profit-card profit-chart-card">
        <div className="chart-top">
          <span><i className="profit-live-dot" />{t("profit.contract")}</span>
          <strong>LIVE</strong>
        </div>
        <svg className="gugo-candlestick-chart" viewBox="0 0 360 130" role="img" aria-label={t("profit.chartAlt")}>
          <defs>
            <linearGradient id="chartGlow" x1="0" x2="1" y1="1" y2="0">
              <stop offset="0%" stopColor="#ef4d4d" />
              <stop offset="100%" stopColor="#d4af37" />
            </linearGradient>
          </defs>
          <g className="gugo-chart-grid">
            <path d="M0 25H360M0 54H360M0 83H360M0 112H360" />
            <path d="M45 0V130M115 0V130M185 0V130M255 0V130M325 0V130" />
          </g>
          <polyline ref={trendRef} className="trend-line" points={trendPoints} />
          <g className="candles">
            {candles.map((c) => (
              <g key={c.i} className={`candle${c.down ? " candle-down" : ""}`} style={{ "--i": c.i } as React.CSSProperties}>
                <line x1={c.line[0]} y1={c.line[1]} x2={c.line[2]} y2={c.line[3]} />
                <rect x={c.rect[0]} y={c.rect[1]} width={c.rect[2]} height={c.rect[3]} />
              </g>
            ))}
          </g>
        </svg>
        <div className="profit-return-breakdown">
          {tiers.map((tier) => (
            <TierRow key={tier.key} tier={tier} />
          ))}
        </div>
      </div>

      <footer className="profit-quick-actions-footer">
        {[
          { key: "withdraw", labelKey: "profit.quickWithdraw", Icon: Banknote },
          { key: "invest", labelKey: "profit.quickInvest", Icon: TrendingUp },
        ].map(({ key, labelKey, Icon }) => (
          <div key={key} className="profit-quick-action" aria-disabled="true">
            <Icon size={20} />
            <span>{t(labelKey)}</span>
          </div>
        ))}
      </footer>
    </>
  );
}
