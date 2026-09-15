// The lightweight-charts attribution credit. The wording is kept exactly as it
// was - the library's licence asks for the credit, so this is not something to
// delete - but AUD-05: it is no longer a link.
//
// It used to be <a href="https://www.tradingview.com/" target="_blank">, which
// made a real, tappable exit out of CIBAR sitting on top of a fake investment
// platform: a tap opened tradingview.com in a second tab, and on the kiosk /
// AR build there is no tab UI to come back from. It was also the only external
// link in any of the five scenarios.
//
// Inert on purpose: no href, no target, no role, no click handler, and
// `pointer-events: none` so it cannot even take a tap that lands on it. It is
// display-only text and is deliberately not declared to the AR Interaction
// Contract.
export function ChartAttribution() {
  return (
    <span
      title="Charts by TradingView"
      className="pointer-events-none absolute right-1 top-0 z-[3] text-[8px] leading-none text-brand-gray/70 no-underline"
    >
      TradingView
    </span>
  );
}
