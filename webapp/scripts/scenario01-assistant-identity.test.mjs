// Scenario 01's investment assistant is ONE character, and every surface that
// shows her has to say so.
//
// Two things were wrong. She was introduced as "陳老師投資助理 <name>" - a
// title that names her as an appendage of 陳老師 rather than as herself, and
// long enough that the LINE header had to squeeze it. And the VIP group
// labelled her with her bare cast name, so walking from the 1:1 chat into the
// group looked like meeting somebody else: the title vanished at the door.
//
// She is now "投資小助理 <name>" in both places, off one resolver
// (getScenario01SenderName) reading one cast snapshot. These tests pin that,
// in all three languages, plus the two failure modes a future edit could
// reintroduce: a second character invented for the label, and a component
// spelling a language itself.
//
// Run with scripts/register-jsx-loader.mjs - the sources use Vite's
// import.meta.env, which that loader stubs (see jsx-test-loader.mjs).
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const WEBAPP = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, WEBAPP), 'utf8');

// webapp's two Web Storage areas, which the language selection and the cast
// snapshot live in. Node has neither.
function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    clear: () => map.clear(),
    get length() { return map.size; },
    key: (i) => [...map.keys()][i] ?? null,
  };
}
globalThis.localStorage ??= memoryStorage();
globalThis.sessionStorage ??= memoryStorage();

const { getScenario01SenderName, getInvestmentAssistantName, t } = await import('../src/pages/scenario01/i18n.js');
const { resetScenario01Cast } = await import('../src/lib/scenario01Characters.js');

const LANGUAGES = ['zh', 'en', 'jp'];
// The fixed title in each language, as the dictionaries spell it.
const TITLES = { zh: '投資小助理', en: 'Investment Assistant', jp: '投資アシスタント' };

function freshRun() {
  globalThis.sessionStorage.clear();
  resetScenario01Cast();
}

test('the assistant is "投資小助理 + her name" in every language', () => {
  freshRun();
  for (const lang of LANGUAGES) {
    const name = getInvestmentAssistantName(lang);
    assert.ok(name, `${lang}: the run must have drawn her a name`);
    const label = getScenario01SenderName('investmentAssistant', lang);
    assert.equal(label, `${TITLES[lang]} ${name}`, `${lang}: title + the name this run drew`);
    // Not the title on its own, and not a name on its own.
    assert.notEqual(label, TITLES[lang]);
    assert.notEqual(label, name);
  }
});

test('陳老師 no longer owns her title anywhere', async () => {
  freshRun();
  for (const lang of LANGUAGES) {
    assert.doesNotMatch(getScenario01SenderName('investmentAssistant', lang), /陳老師|Coach Chen|チェン先生/);
  }
  for (const file of ['src/pages/scenario01/i18n.js', 'src/pages/scenario01/i18nEn.js', 'src/pages/scenario01/i18nJp.js',
    'src/pages/scenario01/LineTeacher.jsx', 'src/pages/scenario01/VipGroup.jsx']) {
    const code = (await read(file)).replaceAll(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    assert.doesNotMatch(code, /陳老師投資助理/, `${file} still carries the old title`);
  }
});

test('the 1:1 chat and the VIP group show the same person', async () => {
  freshRun();
  // Both surfaces resolve their label through the one call, with the slot as
  // the only argument that varies - so they cannot drift apart without one of
  // them being rewritten to stop asking.
  const chat = (await read('src/pages/scenario01/LineTeacher.jsx')).replaceAll(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
  assert.match(chat, /getScenario01SenderName\('investmentAssistant'\)/);
  assert.match(chat, /displayName: investmentAssistantName/);

  const group = (await read('src/pages/scenario01/VipGroup.jsx')).replaceAll(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
  assert.match(group, /getScenario01SenderName\(m\.senderSlot, lang\)/);
  assert.doesNotMatch(group, /sender: random\?\.name/, 'the group must not label a cast member by bare name');

  // And the value itself is stable across however many times either surface
  // asks, because both read the same persisted cast rather than re-drawing.
  for (const lang of LANGUAGES) {
    const first = getScenario01SenderName('investmentAssistant', lang);
    assert.equal(getScenario01SenderName('investmentAssistant', lang), first);
    assert.equal(t('投資小助理 {investmentAssistant}', lang), first, `${lang}: same string the dictionary builds`);
  }
});

test('the group still labels everyone else by name alone', () => {
  freshRun();
  for (const slot of ['vipFemale01', 'vipMale01']) {
    for (const lang of LANGUAGES) {
      assert.doesNotMatch(getScenario01SenderName(slot, lang), new RegExp(TITLES[lang]));
    }
  }
});

test('the title is dictionary copy, not three languages in a component', async () => {
  for (const file of ['src/pages/scenario01/LineTeacher.jsx', 'src/pages/scenario01/VipGroup.jsx']) {
    const code = (await read(file)).replaceAll(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    assert.doesNotMatch(code, /Investment Assistant|投資アシスタント/, `${file} must not spell a translation`);
  }
  // One zh key, one EN entry, one JP entry - the ordinary scenario01 shape.
  const en = await read('src/pages/scenario01/i18nEn.js');
  const jp = await read('src/pages/scenario01/i18nJp.js');
  assert.match(en, /'投資小助理 \{investmentAssistant\}':/);
  assert.match(jp, /'投資小助理 \{investmentAssistant\}':/);

  // The name is still cast data - no second character was invented to carry
  // the label. ROLES holds exactly one scenario01 assistant, and it has no
  // name of its own to hard-code.
  const roles = await read('src/experience/characters/roles.js');
  assert.equal((roles.match(/'scenario01\.investmentAssistant'/g) ?? []).length, 1);
  const declaration = roles.match(/'scenario01\.investmentAssistant': \{[^}]*\}/)[0];
  assert.match(declaration, /nameStrategy: 'random'/);
  assert.doesNotMatch(declaration, /resolvedNames/, 'her name is drawn per run, never fixed here');
});
