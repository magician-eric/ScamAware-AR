import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('signing the consent form ends the first call and rings the prosecutor with no preview overlay', async () => {
  const [dialogues, site, prosecutor, store, i18n] = await Promise.all([
    read('src/data/scenario03Dialogues.js'),
    read('src/pages/scenario03/CaseSite.jsx'),
    read('src/pages/scenario03/ProsecutorCall.jsx'),
    read('src/lib/scenario03Store.js'),
    read('src/pages/scenario03/i18n.js'),
  ]);

  // The centre-screen "○○地方檢察署檢察官來電確認" overlay is gone, along with
  // everything that drove it: it covered the case site to announce a call
  // that the prosecutor's own ring screen was about to announce anyway.
  // Nothing may bring back a pulsing phone icon, a connecting plate, or an
  // extra tap between the consent form and the ring screen.
  assert.doesNotMatch(i18n, /connectingTitle|connectingSub/);
  assert.doesNotMatch(site, /pol-pulse-ring|handoffActive|DialogueLayer|useScriptPlayer/);
  assert.doesNotMatch(dialogues, /policeHandoff:/);
  assert.doesNotMatch(site, /startFirstPoliceCallHandoff/);
  assert.doesNotMatch(store, /startFirstPoliceCallHandoff|firstPoliceCallStatus: 'handoff'/);

  // submitConsent itself ends the first call and routes to the ring screen.
  const consent = site.match(/function submitConsent\(\) \{([\s\S]*?)\n  }/)?.[1] ?? '';
  const end = consent.indexOf('endFirstPoliceCall()');
  const go = consent.indexOf("navigate('/scenario03-police/prosecutor-call')");
  assert.ok(end >= 0 && end < go, 'submitConsent must end the first call, then route to the prosecutor ring screen');

  assert.match(prosecutor, /firstPoliceCallStatus !== 'ended'/);
  // The ring stage is reached only through the mount guard, never derived on
  // the spot from firstPoliceCallStatus - that status stays 'ended' for the
  // rest of the run, so deriving it re-rang a finished call on every later
  // arrival. See scripts/audit-s03-remaining.test.mjs.
  assert.match(prosecutor, /useState\('blocked'\)/);
  assert.doesNotMatch(prosecutor, /firstPoliceCallStatus === 'ended' \? 'ringing'/);
  assert.match(store, /firstPoliceCallStatus: 'idle'/);
  assert.match(store, /firstPoliceCallStatus: 'ended'/);
});

test('prosecutor script and subtitles remain disabled while the call is ringing', async () => {
  const call = await read('src/pages/scenario03/ProsecutorCall.jsx');

  assert.match(call, /useScriptPlayer\(script, pace, stage === 'incall'\)/);
  assert.match(call, /if \(stage === 'ringing'\)[\s\S]*return \([\s\S]*pol-call-btn-answer/);
  assert.doesNotMatch(
    call.match(/if \(stage === 'ringing'\)[\s\S]*?\n  }/)?.[0] ?? '',
    /DialogueLayer/,
  );
});

test('answer stops ringing before connecting and entering the call', async () => {
  const call = await read('src/pages/scenario03/ProsecutorCall.jsx');
  const answer = call.match(/function answer\(\) \{([\s\S]*?)\n  }/)?.[1] ?? '';

  const stop = answer.indexOf('stopRingtoneRef.current()');
  const connected = answer.indexOf("playSound('callConnected')");
  const incall = answer.indexOf("setStage('incall')");
  assert.ok(stop >= 0 && stop < connected && connected < incall);
});

test('timer is scoped to incall and the prosecutor genuinely hangs up when his last line ends', async () => {
  const call = await read('src/pages/scenario03/ProsecutorCall.jsx');

  assert.match(call, /if \(stage !== 'incall'\) return undefined;[\s\S]*setInterval[\s\S]*clearInterval/);
  const completed = call.match(/if \(stage !== 'incall' \|\| !scriptDone\) return;([\s\S]*?)\n  },/)?.[1] ?? '';
  // Once the prosecutor's last recorded line (prosecutor_pressure) has
  // played, the call is over: stop the script, play the hangup tone, and
  // clear the single activeCall source of truth so nothing downstream can
  // keep the player "on the phone with the prosecutor". The officer is NOT
  // dragged onto this same call - PoliceCallback rings separately.
  const stop = completed.indexOf('stopScript()');
  const hangup = completed.indexOf("playSound('hangup')");
  const cleared = completed.indexOf('clearActiveCall()');
  const ended = completed.indexOf("setStage('ended')");
  assert.ok(stop >= 0 && stop < hangup && hangup < cleared && cleared < ended);
  assert.doesNotMatch(completed, /setActiveCall\('investigator'\)/);
  assert.doesNotMatch(call, /setActiveCall\('investigator'\)/);
});

test('a short beat separates the prosecutor hangup from the officer callback', async () => {
  const call = await read('src/pages/scenario03/ProsecutorCall.jsx');

  // 0.8s-1.5s: long enough to read as a hangup, short enough that the player
  // never sits on a dead screen waiting for the next call.
  const gap = Number(call.match(/const HANGUP_GAP_MS = (\d+);/)?.[1]);
  assert.ok(gap >= 800 && gap <= 1500, `HANGUP_GAP_MS must be 800-1500ms, got ${gap}`);

  const beat = call.match(/if \(stage !== 'ended'\) return undefined;([\s\S]*?)\n  },/)?.[1] ?? '';
  assert.match(beat, /setTimeout/);
  assert.match(beat, /navigate\('\/scenario03-police\/police-callback', \{ replace: true \}\)/);
  assert.match(beat, /clearTimeout/);
});

test('disabled and unmounted script players stop audio and scheduled playback', async () => {
  const player = await read('src/pages/scenario03/useScriptPlayer.js');

  assert.match(player, /if \(!enabled\) \{[\s\S]*setCurrent\(null\);[\s\S]*stop\(\)/);
  assert.match(player, /if \(!enabled \|\| !current\) return undefined;[\s\S]*clearTimeout\(timer\)/);
  assert.match(player, /return \{ current, choice, log, done, choose, skip: advance, stop }/);
});

test('zh, en, and jp prosecutor scripts share the same acceptance gate', async () => {
  const [call, dialogues] = await Promise.all([
    read('src/pages/scenario03/ProsecutorCall.jsx'),
    read('src/data/scenario03Dialogues.js'),
  ]);

  assert.equal(call.match(/useScriptPlayer\(/g)?.length, 1);
  assert.match(call, /buildScenario03Script\('prosecutorCall', session\)/);
  for (const audio of [
    'prosecutor_intro.mp3',
    'prosecutor_intro_en.mp3',
    'prosecutor_intro_jp.mp3',
  ]) assert.ok(dialogues.includes(audio), `missing localized prosecutor audio mapping: ${audio}`);
});
