// Scenario 03's "no silent phone call" rule.
//
// Every line the player hears on a CALL surface - a screen with the phone-call
// chrome (.pol-incall / .pol-call) and a live "通話中" indicator, where the
// subtitle plate (DialogueLayer) is the phone talking - must be backed by a
// real recording. Text with no recording is not a phone line: it is a LINE
// message, and it belongs in the LINE conversation surface instead.
//
// The one exception is the player's own voice. A 2-choice moment splices the
// option the player picked back in as a `speaker: 'player'` beat, and there is
// no recording of the player - by construction, since these are the player's
// words and they differ per branch.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

globalThis.localStorage = { getItem: () => null };
const { SCENARIO03_DIALOGUES, SCENARIO03_SCRIPTS } = await import('../src/data/scenario03Dialogues.js');

// Script keys whose beats are rendered through DialogueLayer on a call
// screen, i.e. read as spoken audio.
const SPOKEN_SCRIPTS = [
  'callStage1',
  'prosecutorCall',
  'policeCallback',
  'lineCustodyAccount',
  'bankGuide',
];

function dialogueIdsIn(scriptKey) {
  return (SCENARIO03_SCRIPTS[scriptKey] ?? []).filter((step) => typeof step === 'string');
}

test('every dialogue id played on a call surface has a recording', () => {
  for (const scriptKey of SPOKEN_SCRIPTS) {
    const ids = dialogueIdsIn(scriptKey);
    assert.ok(ids.length > 0, `${scriptKey} has no dialogue ids`);
    for (const id of ids) {
      const entry = SCENARIO03_DIALOGUES[id];
      assert.ok(entry, `${scriptKey}: unknown dialogue id ${id}`);
      assert.ok(
        entry.audioKey,
        `${scriptKey}: ${id} would play on a call screen with no audio - move it to a LINE surface or give it a recording`,
      );
    }
  }
});

test('the prosecutor call is voiced end to end, branches included', () => {
  const prosecutorIds = [
    ...dialogueIdsIn('prosecutorCall'),
    // the two branch replies spliced in by the account_relationship choice
    'prosecutor_account_answer_a',
    'prosecutor_account_answer_b',
  ];
  for (const id of prosecutorIds) {
    assert.ok(SCENARIO03_DIALOGUES[id]?.audioKey, `prosecutor line ${id} has no recording`);
  }
  // ...and the call is over as soon as its last recorded line is: nothing is
  // appended after prosecutor_pressure, so the prosecutor never keeps
  // "talking" past the audio the run actually has.
  assert.equal(SCENARIO03_SCRIPTS.prosecutorCall.at(-1), 'prosecutor_pressure');
  // prosecutor_end stays registered as data but is never played: its
  // recording tells the player not to hang up, and the very next thing that
  // happens is the prosecutor hanging up and the officer ringing back.
  assert.ok(SCENARIO03_DIALOGUES.prosecutor_end?.audioKey, 'prosecutor_end must stay registered');
  assert.ok(
    !SCENARIO03_SCRIPTS.prosecutorCall.includes('prosecutor_end'),
    'prosecutor_end must not be played - its recording contradicts the hangup + callback flow',
  );
});

test('unrecorded officer text is carried by LINE, not by the call subtitle plate', async () => {
  // custody_task is the officer's typed task order: no recording, so it must
  // stay a LINE script, and LineCustody must render it through the LINE
  // conversation while only the recorded block reaches DialogueLayer.
  assert.equal(SCENARIO03_DIALOGUES.custody_task.audioKey, null);
  assert.deepEqual(SCENARIO03_SCRIPTS.lineCustody, ['custody_task']);

  const custody = await read('src/pages/scenario03/LineCustody.jsx');
  assert.match(custody, /taskScript = useMemo\(\(\) => buildScenario03Script\('lineCustody', session\)/);
  assert.match(custody, /player=\{taskPlayer\}/);
  assert.match(custody, /<DialogueLayer player=\{voicePlayer\} \/>/);
  assert.doesNotMatch(custody, /<DialogueLayer player=\{taskPlayer\}/);
});

test('there is no 165 hotline call left to voice', () => {
  // Scene 11b (the scripted 165 simulation) is gone: 撥打 165 on
  // FinalDecision decides the run on the spot. Its dialogue block and script
  // key went with it, so no unvoiced call remains in the chain and no
  // exemption has to be carried for one.
  assert.equal(SCENARIO03_DIALOGUES.hotline_165, undefined);
  assert.equal(SCENARIO03_SCRIPTS.hotline165, undefined);
});

test('the prosecutor voice stops when the prosecutor does', () => {
  // Role ownership across the handoff. prosecutorCall is the only script
  // that may speak with the prosecutor's voice; from the officer's callback
  // onward - the callback itself, the LINE custody-account card, the bank
  // walkthrough - every line is the investigating officer's. This is what
  // stops a prosecutor MP3 from playing over a police screen after he has
  // already hung up.
  for (const scriptKey of ['policeCallback', 'lineCustodyAccount', 'bankGuide']) {
    const ids = dialogueIdsIn(scriptKey);
    assert.ok(ids.length > 0, `${scriptKey} has no dialogue ids`);
    for (const id of ids) {
      const entry = SCENARIO03_DIALOGUES[id];
      assert.equal(entry?.speaker, 'officer', `${scriptKey}: ${id} must be the officer, not ${entry?.speaker}`);
      assert.ok(
        !String(entry?.audioKey ?? '').toLowerCase().startsWith('prosecutor'),
        `${scriptKey}: ${id} plays prosecutor audio on a police screen`,
      );
    }
  }
  for (const id of dialogueIdsIn('prosecutorCall')) {
    assert.equal(SCENARIO03_DIALOGUES[id]?.speaker, 'prosecutor', `prosecutorCall: ${id} is not the prosecutor`);
  }
});
