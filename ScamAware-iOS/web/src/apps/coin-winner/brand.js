import LINK_PREVIEW_IMAGE from './assets/link-preview.svg';

export const COIN_WINNER_BRAND = Object.freeze({ id: 'coin-winner', name: '幣勝客', internationalName: 'Coin Winner' });

// What the platform looks like when it is shared as a *link* rather than
// mounted as an app - the address bar text and the preview image a chat app
// would fetch from the page's own metadata. It is brand material, so it
// belongs to the App module that is that brand (docs/asset-architecture.md
// §5), not to whichever Scenario happens to paste the link; scenario02's LINE
// conversation is only its first consumer.
//
// The domain is wholly fictional and is never translated, exactly like
// scenario05's SafeDeal address: it must never be a real financial service,
// and it stays identical in zh/en/jp. The preview image carries no Chinese
// either - the Latin wordmark is the brand mark in every locale, the same
// rule "BITION" already follows on screen.
export const COIN_WINNER_LINK_PREVIEW = Object.freeze({
  domain: 'bition-invest.tw',
  url: 'https://bition-invest.tw',
  image: LINK_PREVIEW_IMAGE,
});
