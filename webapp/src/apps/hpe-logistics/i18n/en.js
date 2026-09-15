// English dictionary for the HPE (黑皮通) App module.
//
// The App owns its UI, so it owns its UI copy: every string here is rendered
// by a screen or component under apps/hpe-logistics/ and by nothing else.
// These strings used to be injected one prop at a time through a `translate`
// function, which kept HPE's own vocabulary in Scenario 04's dictionary and
// made a story module the owner of another module's chrome (§13 AD-14). The
// values are the ones that were already on screen, moved across unchanged -
// this was an ownership move, not a re-translation.
//
// Keyed off the Chinese source string exactly as it appears in the JSX, the
// same convention every dictionary in this repo uses; see
// shared/i18n/createTranslator.js for how a key is looked up and what happens
// when one is missing. Grouped by the file that renders each string.
//
// A label another App also renders (返回, 首頁, 訊息) is deliberately repeated
// in that App's own table rather than shared: ownership follows the UI, not
// the spelling (spec section 3.6).
export const EN = {
  // apps/hpe-logistics/components/HpeShell.jsx
  '返回': 'Back',

  // apps/hpe-logistics/components/HpeTrackingTimeline.jsx
  '物流進度': 'Shipping Progress',

  // apps/hpe-logistics/screens/HpeTrackingScreen.jsx
  '退貨物流': 'Return Shipping',
  '寄件編號': 'Shipment Number',
  '目前狀態': 'Current Status',

  // apps/hpe-logistics/state/index.js
  '取得寄件編號': 'Get Shipping Label',
  '物流已收件': 'Picked Up by Courier',
  '配送中': 'In Transit',
  '賣家已簽收': 'Received by Seller',
};
