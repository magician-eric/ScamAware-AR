import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { TEACHER_VIDEO_SRC } from '../src/pages/scenario01/teacherVideo.js';

const source = await readFile(new URL('../src/pages/scenario01/VideoTeacher.jsx', import.meta.url), 'utf8');

test('Scenario01 teacher video autoplays on mount with no tap required', () => {
  assert.match(source, /\bautoPlay\b/);
  assert.match(source, /\bmuted\b/);
  assert.match(source, /preload="auto"/);
  assert.match(source, /playsInline/);
  assert.match(source, /useEffect\(\(\) => \{[\s\S]*?requestPlayback\(\);[\s\S]*?\}, \[videoSrc\]\);/);
  assert.match(source, /video\.muted = true;[\s\S]*video\.play\(\)/);
  assert.match(source, /onPlaying=\{handlePlaying\}[\s\S]*event\.currentTarget\.muted = false;|handlePlaying = \(event\) => \{[\s\S]*event\.currentTarget\.muted = false;/);
});

test('Scenario01 teacher video never shows native controls', () => {
  assert.match(source, /controls=\{false\}/);
  assert.doesNotMatch(source, /\bcontrols\b(?!List|=\{false\})/);
});

test('Scenario01 teacher video only shows the fallback play button after a rejected/paused play, not by default', () => {
  assert.match(source, /useState\('loading'\)/);
  assert.match(source, /showPlayControl = playbackState === 'retry' \|\| playbackState === 'paused'/);
  assert.match(source, /setPlaybackState\('retry'\)/);
  assert.match(source, /playbackState === 'paused' \? t\('繼續播放'\) : t\('重新播放'\)/);
  assert.match(source, /onWaiting=\{handlePlaybackDelay\}/);
  assert.match(source, /onStalled=\{handlePlaybackDelay\}/);
});

test('Scenario01 teacher video cleans up playback when leaving the page', () => {
  assert.match(source, /return \(\) => \{\s*clearStallTimer\(\);\s*if \(video\) video\.pause\(\);\s*\};/);
});

// The table moved to its own data module (see teacherVideo.js), so this
// asserts the mapping it actually produces rather than the text that used to
// spell it out - a stronger check, since it also proves each language's file
// is really on disk and that no two languages share one recording.
test('Scenario01 keeps the localized videos, warning progress hook, and independent CTA', () => {
  assert.deepEqual(Object.keys(TEACHER_VIDEO_SRC), ['zh', 'en', 'jp']);
  assert.equal(TEACHER_VIDEO_SRC.zh, '/assets/scenarios/scenario-01/videos/chen-teacher-pitch.mp4');
  assert.equal(TEACHER_VIDEO_SRC.en, '/assets/scenarios/scenario-01/videos/teacher-en-f_SC6owoUR.mp4');
  assert.equal(TEACHER_VIDEO_SRC.jp, '/assets/scenarios/scenario-01/videos/teacher-jp-f_ftgjUw1g.mp4');
  assert.equal(new Set(Object.values(TEACHER_VIDEO_SRC)).size, 3);
  for (const [lang, src] of Object.entries(TEACHER_VIDEO_SRC)) {
    assert.equal(existsSync(`public${src}`), true, `${lang}: ${src}`);
  }
  assert.equal(Object.hasOwn(TEACHER_VIDEO_SRC, 'ja'), false);
  assert.match(source, /TEACHER_VIDEO_SRC\[lang\]/);
  assert.match(source, /useVideoProgress\(videoRef\)/);
  assert.match(source, /navigate\('\/scenario01-investment\/line-teacher'\)/);
});
