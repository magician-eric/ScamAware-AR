// Single source of truth for the five scenario-entry cards shown on
// ScenarioMenu. `title` is the player-facing task name (shown first, in the
// larger/bolder type); `subtitle` is the actual fraud type it teaches (shown
// second, smaller). Route/id values are intentionally left untouched from
// the original build so no navigation or scenario-ID wiring changes.
//
// title/subtitle are per-language objects rather than plain strings so
// ScenarioMenu can localize without touching routing - the English and
// Japanese strings below are used verbatim as provided, not re-translated.
// Internal locale code for Japanese is always 'jp' - never 'ja'.
export const SCENARIO_ENTRIES = [
  {
    id: 'investment',
    route: '/scenario01-investment',
    title: { zh: '財富陷阱', en: 'Money Trap', jp: 'マネートラップ' },
    subtitle: { zh: '假投資詐騙', en: 'Fake Investment Scam', jp: '投資詐欺' },
  },
  {
    id: 'romance',
    route: '/scenario02-romance',
    title: { zh: '戀愛劇本', en: 'Love Script', jp: '恋愛シナリオ' },
    subtitle: { zh: '假交友詐騙', en: 'Romance Scam', jp: 'ロマンス詐欺' },
  },
  {
    id: 'authority',
    route: '/scenario03-police',
    title: { zh: '權威陷阱', en: 'Authority Trap', jp: '権威の罠' },
    subtitle: { zh: '假檢警詐騙', en: 'Fake Police Scam', jp: 'ニセ警察・検察詐欺' },
  },
  {
    id: 'seller-scam',
    route: '/scenario04-shopping',
    title: { zh: '黑箱包裹', en: 'Black Parcel', jp: 'ブラックパーセル' },
    subtitle: { zh: '假賣家騙買家', en: 'Fake Seller Scam', jp: '偽販売者詐欺' },
  },
  {
    id: 'buyer-scam',
    route: '/scenario05-atm',
    title: { zh: '幽靈訂單', en: 'Ghost Order', jp: 'ゴースト注文' },
    subtitle: { zh: '假買家騙賣家', en: 'Fake Buyer Scam', jp: '偽購入者詐欺' },
  },
];

export function getScenarioEntries(lang = 'zh') {
  return SCENARIO_ENTRIES.map((entry) => ({
    id: entry.id,
    route: entry.route,
    title: entry.title[lang] ?? entry.title.zh,
    subtitle: entry.subtitle[lang] ?? entry.subtitle.zh,
  }));
}
