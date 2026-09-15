import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppState, Holding, QuantContract } from "../types/trade";
import { getStockByCode, STOCKS } from "../data/stocks";
import { GUGO_STORAGE_KEYS } from "../../index.js";

// Not a literal: the same key is half of the module's run-reset contract
// (see ../../index.js), and scenario01's Briefing ends a run by calling
// resetGuGoState(), which sweeps exactly the keys listed there. Reading it
// from that one declaration is what keeps "the app persists here" and "a new
// run clears here" from drifting apart.
const STORAGE_KEY = GUGO_STORAGE_KEYS.state;

// Starts genuinely empty - the player hasn't registered yet at the point
// this app is first shown (scenario01's platform-register step), so there
// must be no pre-existing cash, holdings, or watchlist to explain. The
// onboarding gate (see OnboardingGate.tsx) walks register -> invest in the
// AI quant contract -> success before the normal routed app becomes
// reachable at all.
const INITIAL_STATE: AppState = {
  registered: false,
  phone: "",
  cash: 0,
  holdings: {},
  watchlist: [],
  quantContract: null,
  totalDeposited: 0,
};

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw) as AppState;
    if (
      !parsed ||
      typeof parsed.cash !== "number" ||
      !parsed.holdings ||
      !Array.isArray(parsed.watchlist) ||
      typeof parsed.registered !== "boolean" ||
      typeof parsed.totalDeposited !== "number"
    ) {
      return INITIAL_STATE;
    }
    return parsed;
  } catch {
    return INITIAL_STATE;
  }
}

// The AI quant contract doesn't sit as one opaque locked blob - it reads as
// more real (and leaves the player able to actually use the Portfolio page
// afterwards) if confirming it immediately deploys most of the deposit
// across a genuinely diversified basket - one random pick per industry
// sector (semiconductor, biotech, defense, drone, traditional, consumer,
// financial, an ETF, ...) rather than a handful of names that could all
// happen to be the same sector - at whatever whole share count each
// allocation affords (naturally a mix of odd-lot and full-board-lot sizes),
// with fairly even weights so no single holding dominates (reads as a
// measured, professional spread, not a few large bets), leaving a modest
// reserve as spendable cash rather than deploying 100%. Randomized fresh
// each time, so which specific company represents each sector varies
// session to session.
function buildRandomAllocation(): { code: string; weight: number }[] {
  const bySector = new Map<string, typeof STOCKS>();
  for (const s of STOCKS) {
    const list = bySector.get(s.sector) ?? [];
    list.push(s);
    bySector.set(s.sector, list);
  }
  const picked = [...bySector.values()].map((candidates) => candidates[Math.floor(Math.random() * candidates.length)]);
  const rawWeights = picked.map(() => 0.75 + Math.random() * 0.5); // narrow spread -> even allocation
  const totalWeight = rawWeights.reduce((a, b) => a + b, 0);
  return picked.map((s, i) => ({ code: s.code, weight: rawWeights[i] / totalWeight }));
}
const QUANT_RESERVE_RATIO = 0.08;

interface AppStoreValue {
  registered: boolean;
  phone: string;
  cash: number;
  holdings: Record<string, Holding>;
  watchlist: string[];
  quantContract: QuantContract | null;
  totalDeposited: number;
  register: (phone: string) => void;
  investInQuantContract: (amount: number, expectedReturnPct: number) => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const register = useCallback((phone: string) => {
    setState((prev) => ({ ...prev, registered: true, phone }));
  }, []);

  const investInQuantContract = useCallback((amount: number, expectedReturnPct: number) => {
    setState((prev) => {
      const investable = amount * (1 - QUANT_RESERVE_RATIO);
      const nextHoldings = { ...prev.holdings };
      let spent = 0;
      for (const { code, weight } of buildRandomAllocation()) {
        const stock = getStockByCode(code);
        if (!stock) continue;
        const shares = Math.floor((investable * weight) / stock.currentPrice);
        if (shares <= 0) continue;
        const cost = shares * stock.currentPrice;
        spent += cost;
        const existing = nextHoldings[code];
        const newQuantity = (existing?.quantity ?? 0) + shares;
        const newCostBasis = (existing ? existing.avgCost * existing.quantity : 0) + cost;
        nextHoldings[code] = { code, quantity: newQuantity, avgCost: Math.round((newCostBasis / newQuantity) * 100) / 100 };
      }
      const leftoverCash = Math.round((amount - spent) * 100) / 100;
      return {
        ...prev,
        cash: Math.round((prev.cash + leftoverCash) * 100) / 100,
        holdings: nextHoldings,
        quantContract: { invested: amount, expectedReturnPct },
        totalDeposited: prev.totalDeposited + amount,
      };
    });
  }, []);

  const value = useMemo<AppStoreValue>(
    () => ({
      registered: state.registered,
      phone: state.phone,
      cash: state.cash,
      holdings: state.holdings,
      watchlist: state.watchlist,
      quantContract: state.quantContract,
      totalDeposited: state.totalDeposited,
      register,
      investInQuantContract,
    }),
    [state, register, investInQuantContract],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}

/** Derived portfolio totals — recomputed from current mock stock prices. */
export function usePortfolioSummary() {
  const { cash, holdings, quantContract, totalDeposited } = useAppStore();

  return useMemo(() => {
    let holdingsValue = 0;
    let todayPnl = 0;
    let costBasisTotal = 0;
    const rows = Object.values(holdings)
      .map((h) => {
        const stock = getStockByCode(h.code);
        if (!stock) return null;
        const marketValue = stock.currentPrice * h.quantity;
        const pnl = (stock.currentPrice - h.avgCost) * h.quantity;
        holdingsValue += marketValue;
        todayPnl += stock.change * h.quantity;
        costBasisTotal += h.avgCost * h.quantity;
        return { holding: h, stock, marketValue, pnl };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.marketValue - a.marketValue);

    // The quant-contract deposit is fully reflected in cash+holdings the
    // moment it's confirmed (see investInQuantContract), so totalAssets is
    // just their sum - no separate contract-value bucket to add on top.
    // PnL is measured against totalDeposited (every dollar ever put in),
    // not cost-basis-of-current-holdings, so cash sitting unallocated never
    // gets miscounted as profit.
    const quantContractValue = quantContract?.invested ?? 0;
    const totalAssets = cash + holdingsValue;
    const totalPrincipal = totalDeposited;
    const cumulativePnl = totalAssets - totalPrincipal;

    return { rows, cash, holdingsValue, quantContractValue, totalAssets, todayPnl, cumulativePnl, costBasisTotal };
  }, [cash, holdings, quantContract, totalDeposited]);
}
