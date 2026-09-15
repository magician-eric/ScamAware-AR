import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { CHARACTER_LANGUAGES, NAME_POOLS, resolveFormalMaleName } from './names.js';
import { resolveCast, validateCharacterSystem, validateResolvedCast } from './casting.js';
import { VISUALS, getVisual, getVisualVideo, getVisualVideos, getVisualAssetUrl, collectVisualAssetPaths, CHARACTER_MEDIA_LANGUAGES } from './visuals.js';
import { ROLES } from './roles.js';
import { getScenario01Cast } from '../../lib/scenario01Characters.js';

const sequence = (...values) => {
  let index = 0;
  return () => values[index++ % values.length];
};

test('registry validates and uses only zh/en/jp', () => {
  assert.equal(validateCharacterSystem(), true);
  assert.deepEqual(CHARACTER_LANGUAGES, ['zh', 'en', 'jp']);
  assert.equal(Object.hasOwn(NAME_POOLS.female.casual, 'ja'), false);
});

test('scenario01 has exactly three fixed, scoped, non-random identities', () => {
  const fixed = Object.entries(ROLES).filter(([, role]) => role.fixed && role.scenarioScope?.includes('scenario01'));
  assert.deepEqual(fixed.map(([id]) => id), ['scenario01.coachChen', 'scenario01.stockRookie', 'scenario01.wealthFreedom']);
  for (const [, role] of fixed) {
    assert.deepEqual(role.scenarioScope, ['scenario01']);
    assert.equal(role.randomEligible, false);
    // scenario01's fixed identities each own a visual exclusively - never
    // shared with a random pool, unlike scenario05's fixed buyer personas
    // below, which deliberately reuse the existing shared casual avatars.
    assert.equal(getVisual(role.visualId).randomEligible, false);
  }
});

test('every character asset is centralized under the shared character root', () => {
  const folders = new Set(VISUALS.map(({ id }) => id));
  for (const visual of VISUALS) {
    const paths = collectVisualAssetPaths(visual.assets);
    assert.ok(paths.length > 0, `${visual.id} has no assets`);
    for (const path of paths) {
      // No character file may sit in a scenario folder: visuals are cast
      // across scenarios, so that would make one scenario read out of
      // another's assets. See docs/asset-architecture.md.
      const [, , , folder] = path.split('/');
      assert.equal(path.startsWith('assets/shared/characters/'), true, `${visual.id}: ${path}`);
      assert.equal(folders.has(folder), true, `${visual.id}: ${path} is not in any visual's folder`);
      assert.equal(existsSync(`public/${path}`), true, `${visual.id}: ${path} is missing on disk`);
    }
  }
});

test('a fixed bundle is stored entirely in its own folder', () => {
  for (const visual of VISUALS.filter(({ tags }) => tags?.includes('fixed-bundle'))) {
    for (const path of collectVisualAssetPaths(visual.assets)) {
      assert.equal(path.startsWith(`assets/shared/characters/${visual.id}/`), true, `${visual.id}: ${path}`);
    }
  }
});

test('dating roles keep all three original asset bundles while names resolve independently', () => {
  const cast = resolveCast('scenario02', [
    { roleId: 'scenario02.datingCandidate01' },
    { roleId: 'scenario02.datingCandidate02' },
    { roleId: 'scenario02.datingLead' },
  ], { rng: sequence(0, 0.25, 0.5, 0.75) });
  assert.equal(cast.roles['scenario02.datingCandidate01'].visualId, 'dating_visual_01');
  assert.equal(cast.roles['scenario02.datingCandidate02'].visualId, 'dating_visual_02');
  assert.equal(cast.roles['scenario02.datingLead'].visualId, 'dating_visual_03');
  assert.equal(getVisual('dating_visual_01').assets.avatar, 'assets/shared/characters/dating_visual_01/avatar.webp');
  assert.equal(getVisual('dating_visual_02').assets.avatar, 'assets/shared/characters/dating_visual_02/avatar.webp');
  assert.equal(getVisual('dating_visual_03').assets.avatar, 'assets/shared/characters/dating_visual_03/avatar.webp');
  assert.deepEqual(getVisual('dating_visual_03').assets.videos.zh.map((path) => path.match(/\d+\.mp4$/)[0]), ['010.mp4', '020.mp4', '030.mp4']);
  for (const visualId of ['dating_visual_01', 'dating_visual_02', 'dating_visual_03']) {
    const assets = getVisual(visualId).assets;
    const recorded = CHARACTER_MEDIA_LANGUAGES.flatMap((lang) => [...assets.videos[lang], ...assets.mediaPreviews[lang]]);
    // Resolved against public/, the source of truth these URLs are served
    // from - never the published copy at the repo root, which is build output.
    for (const path of [assets.avatar, assets.profilePhoto, ...assets.largePhotos, ...assets.photos, ...recorded]) assert.equal(existsSync(`public/${path}`), true, path);
    // Every file of a fixed bundle is stored with its own character, never
    // inside a scenario folder (see docs/asset-architecture.md).
    for (const path of [assets.avatar, assets.profilePhoto, ...assets.largePhotos, ...assets.photos, ...recorded]) assert.equal(path.startsWith(`assets/shared/characters/${visualId}/`), true, path);
  }
  for (const role of Object.values(cast.roles)) assert.deepEqual(Object.keys(role.resolvedNames), ['zh', 'en', 'jp']);
});


test('scenario02 fixed bundles remain scoped to their eligible roles', () => {
  for (const [visualId, roleId] of [
    ['dating_visual_01', 'scenario02.datingCandidate01'],
    ['dating_visual_02', 'scenario02.datingCandidate02'],
    ['dating_visual_03', 'scenario02.datingLead'],
  ]) {
    const visual = getVisual(visualId);
    if (visualId === 'dating_visual_03') {
      assert.deepEqual(visual.scenarioScope, ['scenario01', 'scenario02']);
      assert.deepEqual(visual.eligibleRoles, ['scenario01.investmentAssistant', roleId]);
    } else {
      assert.deepEqual(visual.scenarioScope, ['scenario02']);
      assert.deepEqual(visual.eligibleRoles, [roleId]);
    }
    assert.equal(visual.randomEligible, false);
  }
  assert.equal(resolveCast('scenario01', [{ roleId: 'scenario01.investmentAssistant' }]).roles['scenario01.investmentAssistant'].visualId, 'dating_visual_03');
});

test('a scenario cast has unique visual and display names', () => {
  const cast = resolveCast('scenario01', [
    { roleId: 'scenario01.vipMember', slotId: 'female1', gender: 'female' },
    { roleId: 'scenario01.vipMember', slotId: 'female2', gender: 'female' },
    { roleId: 'scenario01.vipMember', slotId: 'male1', gender: 'male' },
    { roleId: 'scenario01.vipMember', slotId: 'male2', gender: 'male' },
  ], { rng: sequence(0, 0.4, 0.8) });
  const roles = Object.values(cast.roles);
  assert.equal(new Set(roles.map(({ visualId }) => visualId)).size, roles.length);
  for (const lang of CHARACTER_LANGUAGES) assert.equal(new Set(roles.map(({ resolvedNames }) => resolvedNames[lang])).size, roles.length);
  assert.equal(validateResolvedCast(cast), true);
});

test('scenario01 assistant has a fixed visual outside the female VIP pool', () => {
  const assistantRole = ROLES['scenario01.investmentAssistant'];
  assert.equal(assistantRole.visualStrategy, 'fixed');
  assert.equal(assistantRole.nameStrategy, 'random');
  assert.equal(assistantRole.visualId, 'dating_visual_03');
  const assistantVisual = getVisual(assistantRole.visualId);
  assert.equal(assistantVisual.randomEligible, false);
  assert.deepEqual(assistantVisual.eligibleRoles, ['scenario01.investmentAssistant', 'scenario02.datingLead']);

  const cast = resolveCast('scenario01', [
    { roleId: 'scenario01.investmentAssistant' },
    { roleId: 'scenario01.vipMember', slotId: 'vipFemale01', gender: 'female' },
    { roleId: 'scenario01.vipMember', slotId: 'vipFemale02', gender: 'female' },
  ], { rng: sequence(0, 0.5) });
  const visualIds = Object.values(cast.roles).map(({ visualId }) => visualId);
  assert.deepEqual(new Set(visualIds), new Set(['dating_visual_03', 'female_visual_01', 'female_visual_02']));
  assert.equal(validateResolvedCast(cast), true);
});

test('getScenario01Cast creates the complete assistant and VIP group cast', () => {
  const values = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const cast = getScenario01Cast();
  const visualIds = Object.values(cast.roles).map(({ visualId }) => visualId);
  assert.equal(Object.keys(cast.roles).length, 6);
  assert.equal(new Set(visualIds).size, 6);
  assert.equal(cast.roles.investmentAssistant.visualId, 'dating_visual_03');
  assert.deepEqual(new Set([
    cast.roles.vipFemale01.visualId,
    cast.roles.vipFemale02.visualId,
  ]), new Set(['female_visual_01', 'female_visual_02']));
  assert.equal(validateResolvedCast(cast), true);
  delete globalThis.sessionStorage;
});

test('formal male pool preserves paired zh/en and independent jp names', () => {
  const name = resolveFormalMaleName('officer', () => 0);
  assert.deepEqual(name, { zh: '陳志明', en: 'Chen Chih-Ming', jp: '佐藤大輔' });
});

test('scenario03 police is cast once from the existing male visual pool', () => {
  const cast = resolveCast('scenario03', [{ roleId: 'scenario03.fakePolice', slotId: 'fakePolice' }], { rng: () => 0 });
  const officer = cast.roles.fakePolice;
  assert.equal(officer.visualId, 'male_visual_01');
  assert.equal(getVisual(officer.visualId).assets.avatar, 'assets/shared/characters/male_visual_01/avatar.webp');
  assert.deepEqual(getVisual(officer.visualId).eligibleRoles, ['scenario01.vipMember', 'scenario03.fakePolice', 'scenario03.fakeProsecutor']);
  assert.deepEqual(Object.keys(officer.resolvedNames), ['zh', 'en', 'jp']);
});

// The fake prosecutor is a person on screen now (ring screen, in-call screen,
// LINE account in the post-transfer aftermath), so he is cast for a face as
// well as a name - and never the officer's face. Both come out of ONE
// resolveCast call, which is what makes that impossible rather than unlikely:
// with an rng that always picks the first eligible entry, the officer takes
// male_visual_01 and the prosecutor is handed the next one instead of the same
// one again.
test('scenario03 casts the fake prosecutor with his own face, never the officer\'s', () => {
  const cast = resolveCast('scenario03', [
    { roleId: 'scenario03.fakePolice', slotId: 'fakePolice' },
    { roleId: 'scenario03.fakeProsecutor', slotId: 'fakeProsecutor' },
  ], { rng: () => 0 });
  const officer = cast.roles.fakePolice;
  const prosecutor = cast.roles.fakeProsecutor;
  assert.equal(officer.visualId, 'male_visual_01');
  assert.equal(prosecutor.visualId, 'male_visual_02');
  assert.notEqual(prosecutor.visualId, officer.visualId);
  assert.ok(getVisual(prosecutor.visualId).eligibleRoles.includes('scenario03.fakeProsecutor'));
  assert.deepEqual(Object.keys(prosecutor.resolvedNames), ['zh', 'en', 'jp']);
  // Drawn from the prosecutor half of the formal pool, not the officer half,
  // so the two are never the same name either.
  assert.notEqual(prosecutor.resolvedNames.zh, officer.resolvedNames.zh);
  assert.equal(validateResolvedCast(cast), true);
});

// Whatever the run draws, the two are always different men - every rng, not
// just the one above.
test('scenario03 officer and prosecutor never share a visual across the whole pool', () => {
  for (let i = 0; i < 200; i += 1) {
    const cast = resolveCast('scenario03', [
      { roleId: 'scenario03.fakePolice', slotId: 'fakePolice' },
      { roleId: 'scenario03.fakeProsecutor', slotId: 'fakeProsecutor' },
    ]);
    assert.notEqual(cast.roles.fakeProsecutor.visualId, cast.roles.fakePolice.visualId);
    assert.ok(cast.roles.fakeProsecutor.visualId, 'the prosecutor is always given a face');
  }
});

test('scenario05 buyer personas are fixed per product line, never a random pool', () => {
  for (const roleId of ['scenario05.buyerStrollerMom', 'scenario05.buyerStrollerDad', 'scenario05.buyerTablet']) {
    const role = ROLES[roleId];
    assert.equal(role.fixed, true);
    assert.deepEqual(role.scenarioScope, ['scenario05']);
    assert.equal(role.randomEligible, false);
    const cast = resolveCast('scenario05', [{ roleId, slotId: 'marketplaceBuyer' }]);
    const buyer = cast.roles.marketplaceBuyer;
    assert.equal(buyer.visualId, role.visualId);
    assert.equal(getVisual(buyer.visualId).eligibleRoles.includes(roleId), true);
    assert.equal(getVisual(buyer.visualId).tags?.includes('dating-bundle') ?? false, false);
    assert.deepEqual(Object.keys(buyer.resolvedNames), ['zh', 'en', 'jp']);
  }
  // The two stroller personas and the tablet persona never share a visual or
  // a name, so a save file can't accidentally mix up which line cast it.
  const strollerMom = ROLES['scenario05.buyerStrollerMom'];
  const strollerDad = ROLES['scenario05.buyerStrollerDad'];
  const tablet = ROLES['scenario05.buyerTablet'];
  const visualIds = [strollerMom.visualId, strollerDad.visualId, tablet.visualId];
  assert.equal(new Set(visualIds).size, visualIds.length);
  for (const lang of CHARACTER_LANGUAGES) {
    const names = [strollerMom.resolvedNames[lang], strollerDad.resolvedNames[lang], tablet.resolvedNames[lang]];
    assert.equal(new Set(names).size, names.length);
  }
});

// A clip of someone talking is a different recording per language, so the
// registry must be able to answer "which language is this file actually in?".
// The three assertions below are the whole contract Scenario02 depends on:
// zh resolves to zh, a language with no recording says so instead of quietly
// claiming to be localized, and a recording is never reachable as a bare URL.
test('recorded character clips resolve per language and declare what they are', () => {
  const zh = getVisualVideo('dating_visual_03', 0, 'zh');
  assert.equal(zh.path, 'assets/shared/characters/dating_visual_03/video-010.mp4');
  assert.equal(zh.resolvedLang, 'zh');
  assert.equal(zh.localized, true);

  for (const lang of ['en', 'jp']) {
    const clip = getVisualVideo('dating_visual_03', 0, lang);
    // Falling back keeps the conversation playable; `localized: false` is what
    // stops that fallback from passing itself off as the localized asset.
    assert.equal(clip.path, zh.path, lang);
    assert.equal(clip.resolvedLang, 'zh', lang);
    assert.equal(clip.localized, false, lang);
  }

  assert.equal(getVisualVideos('dating_visual_03', 'zh').length, 3);
  assert.equal(getVisualVideos('dating_visual_03', 'en').every((clip) => !clip.localized), true);
  // A recorded kind has no language-free URL, so no caller can reach one by
  // accident and lose the locale on the way.
  assert.equal(getVisualAssetUrl('dating_visual_03', 'videos', 0), '');
  assert.equal(getVisualAssetUrl('dating_visual_03', 'mediaPreviews', 0), '');
});
