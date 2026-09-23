// Scenario05's simulated "verification deposit" (驗證金) - the one amount the
// fake SafeDeal support agent demands before it will "release" the sale, and
// the only place in the tree the figure is written down.
//
// Defined exactly once on purpose. No screen, dialogue node, ending or
// dictionary entry repeats the digits: the copy carries an `{amount}`
// placeholder through scenario05's own i18n interpolation (see
// shared/i18n/scenario05.js) and the endings add the loss up from here, so
// changing the figure changes the whole scenario in a single edit.
//
// PENDING OWNER CONFIRMATION: NT$20,000 is a provisional display figure for
// the exhibit. It is not an approved amount, and nothing downstream may
// hardcode it as if it were.
//
// Nothing in this module - or anywhere the scenario spends it - touches
// money. The "transfer" it labels is a closed educational simulation: no bank
// API, no real transfer, no payment link, no account number, no card details,
// no OTP, nothing asked of the player and no navigation off this app.
// Confirming it only writes local scenario state (lib/scenario05Store.js).
export const SCENARIO05_VERIFICATION_AMOUNT = 20000;

// Thousands separators, written here rather than taken from toLocaleString()
// so all three languages read the same grouping whatever locale data the
// runtime happens to carry.
export function formatAmountDigits(value) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// The whole mark, for the amount rows on the結局 screens. The "NT$" prefix is
// fixed across zh/en/jp exactly as the product prices in MyDonDon's catalog
// are (see apps/mydondon/data/catalog.js).
export function formatNtAmount(value) {
  return `NT$${formatAmountDigits(value)}`;
}

// What the `{amount}` placeholder is filled with - '20,000', never the whole
// 'NT$20,000', because every string that uses it already writes its own NT$.
export const VERIFICATION_AMOUNT_DIGITS = formatAmountDigits(SCENARIO05_VERIFICATION_AMOUNT);
