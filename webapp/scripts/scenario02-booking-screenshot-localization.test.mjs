// Scenario02's guesthouse booking screenshot must follow the player's language.
//
// The screenshot has the whole order page drawn into it (訂單已確認 / 付款成功 /
// 總金額 TWD 10,800) and the chat opens it full-size by itself for 6 seconds,
// so an English or Japanese run that is handed the Chinese file reads a
// Chinese page it cannot skip. validate-localized-assets.mjs checks the table
// in guesthousePhotos.js; this checks that the chat script actually reads it.
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildNodes } from '../src/pages/scenario02/PrivateChat.jsx';
import { GUESTHOUSE_BOOKING_IMG_BY_LANG, GUESTHOUSE_ROOM_IMG } from '../src/pages/scenario02/guesthousePhotos.js';

const LANGS = ['zh', 'en', 'jp'];

const imageOf = (lang, id) => buildNodes(lang).find((node) => node.id === id)?.image;

for (const lang of LANGS) {
  test(`Scenario02 booking screenshot is the ${lang} file`, () => {
    const image = imageOf(lang, 's20-image');
    assert.ok(image, 's20-image must still show the booking screenshot');
    assert.equal(image.src, GUESTHOUSE_BOOKING_IMG_BY_LANG[lang]);
    assert.equal(image.displayDuration, 6000);
  });
}

test('Scenario02 booking screenshot is a different file in every language', () => {
  const sources = LANGS.map((lang) => imageOf(lang, 's20-image').src);
  assert.equal(new Set(sources).size, LANGS.length);
  assert.match(sources[1], /photo-villa-booking-paid-en\.webp$/);
  assert.match(sources[2], /photo-villa-booking-paid-jp\.webp$/);
});

test('Scenario02 room photo has no text, so every language shares it', () => {
  for (const lang of LANGS) {
    assert.equal(imageOf(lang, 'day6-image').src, GUESTHOUSE_ROOM_IMG, lang);
  }
});
