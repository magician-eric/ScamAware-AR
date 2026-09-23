export interface Holding {
  code: string;
  /** Shares held (1 lot = 1,000 shares). */
  quantity: number;
  /** Average cost per share. */
  avgCost: number;
}

export interface QuantContract {
  invested: number;
  expectedReturnPct: number;
}

export interface AppState {
  registered: boolean;
  phone: string;
  cash: number;
  holdings: Record<string, Holding>;
  watchlist: string[];
  quantContract: QuantContract | null;
  /** Total ever deposited (currently only via the AI quant-contract flow) -
   * the fixed baseline PnL is measured against, unaffected by later buy/sell
   * trades moving money between cash and holdings. */
  totalDeposited: number;
}
