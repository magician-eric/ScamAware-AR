// Scenario02's clips must follow the player's language, and must keep
// autoplaying while they do.
//
// The bug this pins: VIDEO_SRC was a module-level constant built from
// getVisualAssetUrl('dating_visual_03', 'videos', N) - evaluated once at
// import time, before the player had chosen a language, so all three
// languages got {datingLead}'s Chinese recordings. She talks to camera in
// every clip, so an English run was watching a Chinese video inside an
// otherwise English scenario, and nothing in the code could tell.
//
// Two halves, and both matter: the source has to be chosen per language
// (localization), and choosing it must not have touched how the clip starts
// playing (section 7 of the audit brief - autoplay on Android, iOS and
// desktop is a requirement of this screen, not a nicety).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { getVisualVideo, getVisualVideos } from '../src/experience/characters/visuals.js';

const source = await readFile(new URL('../src/pages/scenario02/PrivateChat.jsx', import.meta.url), 'utf8');

test('Scenario02 resolves {datingLead} clips per language, not once at import', () => {
  // A module-level constant is the bug itself: it cannot see a language that
  // is chosen after import. The table must be a function of `lang`, memoized
  // on `lang`, exactly like buildNodes() beside it.
  assert.doesNotMatch(source, /^const VIDEO_SRC =/m);
  assert.match(source, /function buildVideoSources\(lang\)/);
  assert.match(source, /useMemo\(\(\) => buildVideoSources\(lang\), \[lang\]\)/);

  // Both the thumbnail in the chat and the full-screen overlay have to read
  // that same per-language table - a thumbnail left on the old constant would
  // show a Chinese still frame above an English clip.
  assert.match(source, /<VideoThumb item=\{item\} src=\{videoSources\[item\.videoId\]\?\.url\} \/>/);
  assert.match(source, /const activeSrc = \(openVideoId && videoSources\[openVideoId\]\?\.url\) \|\| null;/);

  // getVisualAssetUrl has no language argument, so reaching a recording
  // through it is how the locale got lost. It may still serve her avatar.
  assert.doesNotMatch(source, /getVisualAssetUrl\([^)]*'videos'/);
  assert.doesNotMatch(source, /getVisualAssetUrl\([^)]*'mediaPreviews'/);
});

test('Scenario02 clip resolution reports the language it actually returned', () => {
  const zh = getVisualVideos('dating_visual_03', 'zh');
  assert.equal(zh.length, 3);
  assert.equal(zh.every((clip) => clip.localized && clip.resolvedLang === 'zh'), true);

  // en/jp have no recordings yet. The fallback keeps the conversation
  // playable, and `localized: false` is what stops it from passing itself off
  // as the localized asset - that flag is what the audit and
  // scripts/validate-localized-assets.mjs both read.
  for (const lang of ['en', 'jp']) {
    const clips = getVisualVideos('dating_visual_03', lang);
    assert.equal(clips.length, 3, lang);
    assert.equal(clips.every((clip) => clip.localized === false), true, lang);
    assert.equal(clips.every((clip) => clip.resolvedLang === 'zh'), true, lang);
  }

  // The moment an en recording lands in the registry, en stops being a
  // fallback with no other change anywhere - that is the wiring being right.
  assert.equal(getVisualVideo('dating_visual_03', 0, 'zh').path.endsWith('video-010.mp4'), true);
});

test('Scenario02 clips still autoplay muted-first, with no tap and no native controls', () => {
  // Unchanged by the localization fix and asserted here so it stays that way:
  // start muted (the one form of autoplay no browser policy blocks, iOS
  // Safari included), ask for sound only once the clip is actually running.
  assert.match(source, /<video[\s\S]*?src=\{src\}[\s\S]*?autoPlay[\s\S]*?playsInline[\s\S]*?preload="auto"[\s\S]*?controls=\{false\}/);
  assert.match(source, /video\.muted = true;\s*const playPromise = video\.play\(\);/);
  assert.match(source, /function handlePlaying\(\) \{[\s\S]*?enableSound\(\);/);
  assert.match(source, /video\.muted = false;/);
  // Re-running the mount effect on a src change is what makes a language
  // switch start the new recording instead of leaving the old one mounted.
  assert.match(source, /\}, \[videoId, src\]\);/);
});

test('every locale-varying asset family passes the coverage validator', () => {
  const output = execFileSync(
    process.execPath,
    ['--experimental-loader', './scripts/extensionless-loader.mjs', 'scripts/validate-localized-assets.mjs'],
    { cwd: new URL('..', import.meta.url), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  assert.match(output, /Localized assets OK/);
  // The two gaps are expected and listed; the check is that they are still
  // being REPORTED rather than having quietly become "covered".
  assert.match(output, /scenario02\/dating-lead-clips {2}en/);
  assert.match(output, /scenario02\/dating-lead-clips {2}jp/);
});
