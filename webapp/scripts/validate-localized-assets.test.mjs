// Regression tests for the localized-asset rules.
//
// The gate they guard (scripts/validate-localized-assets.mjs) can only ever be
// run against the assets this repo happens to contain today, and those are all
// in one of two states: correct, or a declared gap. The states that matter -
// two languages quietly sharing one file - cannot be produced without breaking
// the app, so they were never exercised, and one of them was not caught.
//
// That gap was real. The original pass 2 computed `shared` against the Chinese
// set only, so it compared en/zh and jp/zh and never en/jp. Two non-Chinese
// languages pointing at one non-Chinese recording - a mislabelled English clip
// dropped into the Japanese slot, say - was reported as PASS on both. Case D
// below is that exact shape, and it fails against the old rule.
//
//   node --test scripts/validate-localized-assets.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { LANGUAGES, checkLocaleTable } from './localized-asset-rules.mjs';

const check = (byLang, options = {}) => checkLocaleTable({ id: 'test/family', byLang, ...options });
const failed = (result) => result.errors.length > 0;

// --- Case A: three languages, three files -----------------------------------

test('Case A: zh / en / jp each have their own file - PASS', () => {
  const result = check({ zh: ['/a/zh.mp4'], en: ['/a/en.mp4'], jp: ['/a/jp.mp4'] });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.status, { zh: 'PASS', en: 'PASS', jp: 'PASS' });
});

test('Case A holds for a family of several files per language', () => {
  const result = check({
    zh: ['/a/zh-1.mp3', '/a/zh-2.mp3', '/a/zh-3.mp3'],
    en: ['/a/en-1.mp3', '/a/en-2.mp3', '/a/en-3.mp3'],
    jp: ['/a/jp-1.mp3', '/a/jp-2.mp3', '/a/jp-3.mp3'],
  });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.status, { zh: 'PASS', en: 'PASS', jp: 'PASS' });
});

// --- Case B / C: a non-Chinese language borrowing the Chinese file ----------

test('Case B: zh and en name the same localized asset - FAIL', () => {
  const result = check({ zh: ['/a/zh.mp4'], en: ['/a/zh.mp4'], jp: ['/a/jp.mp4'] });
  assert.ok(failed(result), 'en borrowing the Chinese recording must fail');
  assert.match(result.errors[0], /zh and en share 1 file/);
  assert.equal(result.status.en, 'FAIL');
  assert.equal(result.status.jp, 'PASS', 'the language that is fine must not be dragged down');
});

test('Case C: zh and jp name the same localized asset - FAIL', () => {
  const result = check({ zh: ['/a/zh.mp4'], en: ['/a/en.mp4'], jp: ['/a/zh.mp4'] });
  assert.ok(failed(result), 'jp borrowing the Chinese recording must fail');
  assert.match(result.errors[0], /zh and jp share 1 file/);
  assert.equal(result.status.jp, 'FAIL');
  assert.equal(result.status.en, 'PASS');
});

// --- Case D: the hole ------------------------------------------------------

test('Case D: en and jp name the same non-Chinese asset - FAIL', () => {
  // Nothing here touches zh. Comparing each language against zh alone - what
  // the rule used to do - sees two languages that each have a file of their
  // own, neither of them the Chinese one, and reports PASS on both.
  const result = check({ zh: ['/a/zh.mp4'], en: ['/a/shared.mp4'], jp: ['/a/shared.mp4'] });
  assert.ok(failed(result), 'en and jp sharing one recording must fail');
  assert.match(result.errors[0], /en and jp share 1 file/);
  assert.equal(result.status.en, 'FAIL');
  assert.equal(result.status.jp, 'FAIL');
});

test('Case D: the old zh-only comparison would have passed this', () => {
  // The rule that shipped, reconstructed, so the regression is pinned by what
  // it actually did rather than by a description of it.
  const oldRuleSaysCovered = (byLang) => {
    const zh = new Set(byLang.zh);
    return ['en', 'jp'].every((lang) => byLang[lang].length > 0
      && byLang[lang].filter((url) => zh.has(url)).length === 0
      && byLang[lang].length === byLang.zh.length);
  };
  const table = { zh: ['/a/zh.mp4'], en: ['/a/shared.mp4'], jp: ['/a/shared.mp4'] };
  assert.equal(oldRuleSaysCovered(table), true, 'this is the shape the old rule let through');
  assert.ok(failed(check(table)), 'and the shape the current rule must reject');
});

test('Case D: partial overlap between en and jp still fails', () => {
  const result = check({
    zh: ['/a/zh-1.mp4', '/a/zh-2.mp4'],
    en: ['/a/en-1.mp4', '/a/both-2.mp4'],
    jp: ['/a/jp-1.mp4', '/a/both-2.mp4'],
  });
  assert.ok(failed(result), 'one shared file out of two is still two languages on one asset');
  assert.match(result.errors[0], /en and jp share 1 file/);
});

test('every unordered locale pair is compared, none skipped', () => {
  for (const [a, b] of [['zh', 'en'], ['zh', 'jp'], ['en', 'jp']]) {
    const byLang = Object.fromEntries(LANGUAGES.map((lang) => [lang, [`/a/${lang}.mp4`]]));
    byLang[b] = [...byLang[a]];
    const result = check(byLang);
    assert.ok(failed(result), `${a}/${b} sharing a file must fail`);
    assert.match(result.errors[0], new RegExp(`${a} and ${b} share`));
  }
});

// --- Case E: an asset that is meant to be shared ---------------------------

test('Case E: a language-neutral asset shared by all three - PASS', () => {
  const film = ['/media/intro.mp4'];
  const result = check({ zh: film, en: film, jp: film }, { languageNeutral: true });
  assert.deepEqual(result.errors, [], 'an asset with no language in it is allowed to be one file');
  assert.deepEqual(result.status, { zh: 'SHARED', en: 'SHARED', jp: 'SHARED' });
});

test('Case E: a language-neutral asset that has grown a per-language variant - FAIL', () => {
  const result = check(
    { zh: ['/media/intro.mp4'], en: ['/media/intro-en.mp4'], jp: ['/media/intro.mp4'] },
    { languageNeutral: true },
  );
  assert.ok(failed(result), 'a variant means the asset is not language-neutral any more');
  assert.match(result.errors[0], /en names a different file/);
});

test('Case E: language-neutral and a declared gap are contradictory', () => {
  const film = ['/media/intro.mp4'];
  const result = check({ zh: film, en: film, jp: film }, { languageNeutral: true, gaps: ['en'] });
  assert.ok(failed(result));
  assert.match(result.errors[0], /cannot declare a per-language gap/);
});

// --- declared gaps ---------------------------------------------------------

test('a declared gap is reported, not failed', () => {
  const result = check(
    { zh: ['/a/zh-1.mp4', '/a/zh-2.mp4'], en: [], jp: [] },
    { gaps: ['en', 'jp'] },
  );
  assert.deepEqual(result.errors, [], 'an asset that has not been produced yet is a gap, not a failure');
  assert.deepEqual(result.status, { zh: 'PASS', en: 'MISSING', jp: 'MISSING' });
});

test('an undeclared empty language fails', () => {
  const result = check({ zh: ['/a/zh.mp4'], en: [], jp: ['/a/jp.mp4'] });
  assert.ok(failed(result));
  assert.match(result.errors[0], /en has no files and no declared gap/);
});

test('a gap that has quietly been filled fails, so the declaration gets removed', () => {
  const result = check({ zh: ['/a/zh.mp4'], en: ['/a/en.mp4'], jp: [] }, { gaps: ['en', 'jp'] });
  assert.ok(failed(result));
  assert.match(result.errors[0], /en is declared a gap but has 1 file/);
});

test('a language with the wrong number of files fails', () => {
  const result = check({
    zh: ['/a/zh-1.mp4', '/a/zh-2.mp4', '/a/zh-3.mp4'],
    en: ['/a/en-1.mp4', '/a/en-2.mp4'],
    jp: ['/a/jp-1.mp4', '/a/jp-2.mp4', '/a/jp-3.mp4'],
  });
  assert.ok(failed(result));
  assert.match(result.errors[0], /en has 2 file\(s\) where zh has 3/);
});

test('an empty zh fails - it is what every other language is counted against', () => {
  const result = check({ zh: [], en: ['/a/en.mp4'], jp: ['/a/jp.mp4'] });
  assert.ok(failed(result));
  assert.match(result.errors.join('\n'), /zh names no file/);
});

test('every error names the family it came from', () => {
  const result = check({ zh: ['/a/zh.mp4'], en: ['/a/zh.mp4'], jp: ['/a/jp.mp4'] });
  for (const message of result.errors) assert.match(message, /^test\/family: /);
});
