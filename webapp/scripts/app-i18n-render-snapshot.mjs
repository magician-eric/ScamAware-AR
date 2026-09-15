// Renders every App surface AD-14 touched, in all three languages, and
// reports the text a player would read. Not a test on its own: it is the
// instrument both the regression test and the before/after comparison use, so
// the same screens are rendered the same way for both.
//
// Print the snapshot with:
//   node --import=./scripts/register-jsx-loader.mjs scripts/app-i18n-render-snapshot.mjs
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// lib/lang.js reads the player's choice out of localStorage on every call, so
// flipping this between renders is exactly what the /language screen does.
//
// The cast key deliberately throws. Scenario 02 draws its dating cast at
// random and remembers it; getScenario02Cast() falls back to a fixed draw
// (rng: () => 0) when storage is unavailable, which is what makes the
// scammer's name - and so her referral code - the same on every run of this
// snapshot. What is being compared is the copy, not the draw.
const CAST_KEY = 'cibar-scenario02-character-cast';
let LANGUAGE = 'zh';
globalThis.localStorage = {
  getItem(key) {
    if (key === CAST_KEY) throw new Error('storage unavailable');
    return key === 'language' ? LANGUAGE : null;
  },
  setItem() {},
  removeItem() {},
};
globalThis.performance ??= { now: () => 0 };

// MyDonDon's phone desktop paints the wall clock, and BlackPi's order detail
// stamps its tracking rows from the payment time. Both would make a snapshot
// depend on when it was taken rather than on what the screens say, so "now"
// is pinned. Only the argument-less form is redirected; every other use of
// Date is left alone.
const FROZEN_NOW = 1767225600000; // 2026-01-01T00:00:00Z
const RealDate = globalThis.Date;
class FrozenDate extends RealDate {
  constructor(...args) {
    super(...(args.length ? args : [FROZEN_NOW]));
  }

  static now() {
    return FROZEN_NOW;
  }
}
globalThis.Date = FrozenDate;

const REACT_INTERNALS = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

// Renders one component with its state hooks pinned at their initial value.
// These screens hold no state worth simulating here - what is being captured
// is the copy they paint, not what they repaint after a tap.
function renderText(Component, props) {
  const previous = REACT_INTERNALS.H;
  REACT_INTERNALS.H = {
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useRef: (initial) => ({ current: initial }),
    useEffect: () => {},
    useLayoutEffect: () => {},
    useMemo: (factory) => factory(),
    useCallback: (fn) => fn,
    useContext: () => null,
    useId: () => 'id',
    useReducer: (reducer, initial) => [initial, () => {}],
  };
  try {
    return visibleText(renderToStaticMarkup(React.createElement(Component, props)));
  } finally {
    REACT_INTERNALS.H = previous;
  }
}

function decode(text) {
  return text
    .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

// Everything a player can read: element text plus the aria-labels and alt
// text a screen reader would announce, which is where a good many of the
// moved strings live.
function visibleText(markup) {
  const announced = [...markup.matchAll(/(?:aria-label|alt|title)="([^"]*)"/g)].map((match) => decode(match[1]));
  const body = decode(markup.replace(/<[^>]*>/g, '')).split('');
  return [...body, ...announced].map((part) => part.trim()).filter(Boolean).join(' | ');
}

const bp = await import('../src/apps/blackpi/index.js');
const cw = await import('../src/apps/coin-winner/index.js');
// The return bar is internal to Coin Winner's screens - no host mounts it -
// so it is imported by path rather than widening the App's public index.
const { ReturnBar: CoinWinnerReturnBar } = await import('../src/apps/coin-winner/ReturnBar.jsx');
const md = await import('../src/apps/mydondon/index.js');
const mu = await import('../src/apps/meetu/index.js');
const hpe = await import('../src/apps/hpe-logistics/index.js');
const { getAsset } = await import('../src/apps/blackpi/data/assetMap.js');
const { getProduct } = await import('../src/apps/mydondon/data/catalog.js');
// Scenario 02 owns the dating profiles and hands MeetU a card in the
// player's language (see pages/scenario02/DatingBrowse.jsx). The snapshot
// models the host rather than inventing one, so what MeetU is asked to draw
// here is what a real run gives it.
const scenario02 = await import('../src/shared/i18n/scenario02.js');
// Scenario 04 builds its dialogue trees per language (data/dialogueTrees/*
// call t(zh, lang) as they build), so a choice reaching BlackPi's chat is
// already in the player's language. Same for the referral code on Coin
// Winner's sign-up form, and for the labels Scenario 04 used to inject into
// HPE - all modelled here so the snapshot renders what a real run renders.
const scenario04 = await import('../src/shared/i18n/scenario04.js');

// A fixed payment timestamp, because OrderDetail stamps its tracking rows
// from it: the snapshot has to depend on the copy, not on when it was taken.
const ORDER = { id: 'BP20260101001', status: 'delivered', createdAt: FROZEN_NOW, disputeStatus: null };
const ORDER_SUMMARY = { productRoute: 'health', status: 'delivered' };
const choices = (language) => [{ id: 'c1', label: scenario04.t('好，我要直接購買。', language) }];
const engine = (language) => ({ timeline: [], isTyping: true, pendingChoices: choices(language), choose() {} });
const PORTFOLIO = { balance: 10000, profit: 1234.5, total: 11234.5 };
const RAW_PERSON = {
  id: 'p1', name: 'Emily', age: 25, distance: '3 公里', job: '行政企劃',
  bio: '喜歡旅行、咖啡和看電影。假日常常到處走走拍照。', tags: ['咖啡', '旅行', '攝影'], photo: '',
};
const person = (language) => ({
  ...RAW_PERSON,
  distance: scenario02.t(RAW_PERSON.distance, language),
  job: scenario02.t(RAW_PERSON.job, language),
  bio: scenario02.t(RAW_PERSON.bio, language),
  tags: RAW_PERSON.tags.map((tag) => scenario02.t(tag, language)),
});
const listing = (language) => getProduct('tablet', language);

// Every surface whose copy this change moved. The props are the smallest
// thing that makes a screen paint; they are not what is being compared.
export const SURFACES = [
  ['blackpi/Splash', bp.Splash, {}],
  ['blackpi/Home', bp.Home, {}],
  ['blackpi/Category', bp.Category, {}],
  ['blackpi/Search', bp.Search, {}],
  ['blackpi/SearchResults(health)', bp.SearchResults, { query: 'health' }],
  ['blackpi/SearchResults(luckyBag)', bp.SearchResults, { query: 'luckyBag' }],
  ['blackpi/ProductDetail(health)', bp.ProductDetail, { productRoute: 'health' }],
  ['blackpi/ProductDetail(luckyBag)', bp.ProductDetail, { productRoute: 'luckyBag' }],
  ['blackpi/Checkout', bp.Checkout, { productRoute: 'health' }],
  ['blackpi/PaymentSuccess', bp.PaymentSuccess, {}],
  ['blackpi/Orders(empty)', bp.Orders, { order: null }],
  ['blackpi/Orders', bp.Orders, { order: ORDER_SUMMARY }],
  ['blackpi/OrderDetail', bp.OrderDetail, { productRoute: 'health', order: ORDER }],
  ['blackpi/Messages', bp.Messages, { activeProductRoute: 'health' }],
  ['blackpi/Messages(unreachable)', bp.Messages, { activeProductRoute: 'health', sellerUnreachable: true }],
  ['blackpi/Me', bp.Me, { activeProductRoute: 'health' }],
  ['blackpi/BottomNav', bp.BottomNav, { active: 'home' }],
  ['blackpi/ChatScreen', bp.ChatScreen, (language) => ({ engine: engine(language), headerTitle: 'X', shopClosed: true })],
  ['blackpi/DialogueChoiceGrid', bp.DialogueChoiceGrid, (language) => ({ choices: choices(language), onChoose() {} })],
  ['blackpi/Placeholder', bp.Placeholder, { label: getAsset('filler-generic').label }],
  ['blackpi/AssetImage', bp.AssetImage, { assetKey: 'robot-vacuum-lifestyle' }],

  ['coin-winner/PlatformLanding', cw.PlatformLanding, {}],
  ['coin-winner/PlatformRegister', cw.PlatformRegister, (language) => ({
    referralCode: scenario02.getDatingLeadReferralCode(language),
  })],
  ['coin-winner/PlatformHome', cw.PlatformHome, { portfolio: PORTFOLIO, strategyRunning: true }],
  ['coin-winner/DepositPage', cw.DepositPage, {}],
  ['coin-winner/TradingPage', cw.TradingPage, {}],
  ['coin-winner/WithdrawalPage', cw.WithdrawalPage, { portfolio: PORTFOLIO }],
  ['coin-winner/ReturnBar', CoinWinnerReturnBar, { onReturn() {} }],

  ['mydondon/PhoneHome', md.PhoneHome, {}],
  ['mydondon/Home', md.Home, {}],
  ['mydondon/ProductSelect', md.ProductSelect, (language) => ({ products: [listing(language)] })],
  ['mydondon/Listing', md.Listing, (language) => ({
    listing: listing(language),
    incomingMessage: { sender: { name: 'A', initial: 'A' }, preview: 'hi', time: '19:43' },
  })],
  ['mydondon/MyDonDonOrders', md.MyDonDonOrders, { orders: [] }],
  ['mydondon/MyDonDonHeader', md.MyDonDonHeader, {}],
  ['mydondon/MyDonDonBottomNav', md.MyDonDonBottomNav, { active: 'home' }],
  ['mydondon/ChatScreen', md.ChatScreen, {
    engine: { timeline: [], isTyping: true, pendingChoices: [{ id: 'a', label: 'A' }], choose() {} },
    name: 'A',
    status: 'x',
  }],
  ['mydondon/Placeholder', md.Placeholder, (language) => ({ label: listing(language).assetLabel })],

  ['meetu/MeetULandingScreen', mu.MeetULandingScreen, { teaserPhotos: [] }],
  ['meetu/MeetUSwipeActions', mu.MeetUSwipeActions, {}],
  ['meetu/SuggestedReplies', mu.SuggestedReplies, { options: [] }],
  ['meetu/MatchOverlay', mu.MatchOverlay, (language) => ({ person: person(language), subtitle: 'sub' })],
  ['meetu/ProfileCard', mu.ProfileCard, (language) => ({ person: person(language) })],

  // `translate` is what Scenario 04 used to inject; HPE ignores it now that it
  // owns these labels. Passing it keeps the two sides of a before/after
  // comparison rendering the same screen.
  ['hpe/HpeTrackingScreen', hpe.HpeTrackingScreen, (language) => ({
    status: 'inTransit', shipmentNumber: 'HPE123', actionLabel: 'x',
    translate: (zh) => scenario04.t(zh, language),
  })],
  ['hpe/HpeTrackingTimeline', hpe.HpeTrackingTimeline, (language) => ({
    status: 'inTransit', translate: (zh) => scenario04.t(zh, language),
  })],
];

export const LANGUAGES = ['zh', 'en', 'jp'];

// `props` may be a function of the language: some hosts resolve what they
// hand the App per language (MyDonDon's catalog, Scenario 02's dating cards).
export function renderSurface(language, Component, props) {
  LANGUAGE = language;
  return renderText(Component, typeof props === 'function' ? props(language) : props);
}

export function snapshot() {
  const lines = [];
  for (const language of LANGUAGES) {
    for (const [name, Component, props] of SURFACES) {
      let text;
      try {
        text = renderSurface(language, Component, props);
      } catch (error) {
        text = `RENDER ERROR: ${error.message}`;
      }
      lines.push(`${language}\t${name}\t${text}`);
    }
  }
  return lines;
}

if (process.argv[1]?.endsWith('app-i18n-render-snapshot.mjs')) {
  console.log(snapshot().join('\n'));
}
