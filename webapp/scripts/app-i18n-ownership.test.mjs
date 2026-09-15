// AD-14: an App module owns its own UI copy.
//
// BlackPi, Coin Winner, MyDonDon, MeetU and HPE used to read their tabs,
// buttons, empty states and product labels out of a dictionary named after a
// Scenario - so a story module owned another module's words, and an App could
// not be mounted anywhere else without dragging that story's dictionary along.
// Each App now has apps/<app>/i18n/, built on the one shared lookup mechanism
// in shared/i18n/createTranslator.js.
//
// Nothing on screen changed. These tests render the real components in all
// three languages and pin the words a player actually reads, so a future edit
// that "just moves a key" cannot quietly change a label:
//
//   1. the boundary - no App imports a Scenario dictionary, and the build
//      gate that says so actually fires
//   2. three-language coverage - every App's EN and JP tables agree, key for
//      key, and the validator fails when one loses an entry
//   3. rendered copy - the labels that moved still render, in zh / en / jp
//   4. fallback - an untranslated string renders its Chinese source, and an
//      unknown language reads as Chinese
//
// Run with scripts/register-jsx-loader.mjs, which compiles the JSX and stubs
// the two Vite-only import.meta features the source uses (see that file).
import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { LANGUAGES, SURFACES, renderSurface } from './app-i18n-render-snapshot.mjs';

const run = promisify(execFile);
const WEBAPP = new URL('../', import.meta.url).pathname;
const read = (path) => readFile(join(WEBAPP, path), 'utf8');

const APPS = ['blackpi', 'coin-winner', 'mydondon', 'meetu', 'hpe-logistics'];

// One rendered surface, by name, in one language.
function surface(name, language) {
  const found = SURFACES.find(([id]) => id === name);
  assert.ok(found, `no surface named ${name}`);
  return renderSurface(language, found[1], found[2]);
}

async function runScript(script) {
  try {
    const { stdout, stderr } = await run('node', [script], { cwd: WEBAPP });
    return { code: 0, output: `${stdout}${stderr}` };
  } catch (error) {
    return { code: error.code ?? 1, output: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
}

// --- 1. the boundary ---------------------------------------------------------

test('no App module imports a Scenario-owned dictionary', async () => {
  for (const app of APPS) {
    const files = await run('grep', ['-rl', 'i18n/scenario', `src/apps/${app}`], { cwd: WEBAPP })
      .then(({ stdout }) => stdout.trim().split('\n').filter(Boolean))
      .catch(() => []);
    assert.deepEqual(files, [], `${app} still reaches for a Scenario dictionary`);
  }
});

test('every App has its own dictionary, built on the shared mechanism', async () => {
  for (const app of APPS) {
    const index = await read(`src/apps/${app}/i18n/index.js`);
    assert.match(index, /createTranslator/, `${app} should use the shared lookup mechanism`);
    assert.match(index, /export const \{ getLang, useLang, t, useT \}/, `${app} should expose the same API`);
  }
  // The mechanism itself holds no copy - only Apps do.
  const mechanism = await read('src/shared/i18n/createTranslator.js');
  assert.doesNotMatch(mechanism, /[㐀-鿿]{2,}\s*'?\s*:/, 'createTranslator must not carry translations');
});

test('validate:boundaries fails an App that imports a Scenario dictionary', async () => {
  const probe = join(WEBAPP, 'src/apps/blackpi/__i18n_probe__.js');
  try {
    await writeFile(probe, "import { useT } from '../../shared/i18n/scenario04';\nexport { useT };\n", 'utf8');
    const { code, output } = await runScript('scripts/validate-app-boundaries.mjs');
    assert.equal(code, 1, 'the boundary rule must reject a Scenario dictionary import');
    assert.match(output, /app imports scenario-owned localization/);

    // The extensionless and the .js spelling resolve to the same module, so
    // one must not walk past a rule the other fails.
    await writeFile(probe, "import { EN } from '../../shared/i18n/scenario04En.js';\nexport { EN };\n", 'utf8');
    assert.equal((await runScript('scripts/validate-app-boundaries.mjs')).code, 1);

    // An App's own dictionary is exactly what the rule is there to encourage.
    await writeFile(probe, "import { useT } from './i18n';\nexport { useT };\n", 'utf8');
    assert.equal((await runScript('scripts/validate-app-boundaries.mjs')).code, 0);
  } finally {
    await rm(probe, { force: true });
  }
});

// --- 2. three-language coverage ---------------------------------------------

test('each App translates the same key set into English and Japanese', async () => {
  for (const app of APPS) {
    const { EN } = await import(`../src/apps/${app}/i18n/en.js`);
    const { JP } = await import(`../src/apps/${app}/i18n/jp.js`);
    assert.deepEqual(Object.keys(EN).sort(), Object.keys(JP).sort(), `${app} EN/JP key sets differ`);
    assert.ok(Object.keys(EN).length > 0, `${app} has an empty dictionary`);
    for (const [key, value] of Object.entries(JP)) {
      assert.equal(typeof value, 'string', `${app} JP ${key} is not a string`);
    }
  }
});

test('validate:i18n fails when an App loses a translation', async () => {
  assert.equal((await runScript('scripts/validate-i18n.mjs')).code, 0, 'the tree should start clean');

  const path = join(WEBAPP, 'src/apps/mydondon/i18n/jp.js');
  const original = await readFile(path, 'utf8');
  try {
    // Drop one key from Japanese only: the App still reaches for it, and the
    // two tables no longer agree.
    await writeFile(path, original.replace(/^\s*'我的訂單':.*$/m, ''), 'utf8');
    const { code, output } = await runScript('scripts/validate-i18n.mjs');
    assert.equal(code, 1, 'a missing App translation must fail the build');
    assert.match(output, /App: mydondon/);
    assert.match(output, /我的訂單/);
  } finally {
    await writeFile(path, original, 'utf8');
  }
});

test('validate:i18n fails on a duplicate key inside an App dictionary', async () => {
  const path = join(WEBAPP, 'src/apps/meetu/i18n/en.js');
  const original = await readFile(path, 'utf8');
  try {
    await writeFile(path, original.replace(/\n};\n$/, "\n  '喜歡': 'Nope',\n};\n"), 'utf8');
    const { code, output } = await runScript('scripts/validate-i18n.mjs');
    assert.equal(code, 1, 'a duplicate key must fail the build');
    assert.match(output, /defines "喜歡" twice/);
  } finally {
    await writeFile(path, original, 'utf8');
  }
});

// --- 3. rendered copy --------------------------------------------------------

// Every language renders every surface, and none of them falls back to Chinese
// where a translation exists: the whole point of the move was that the words
// stayed put.
test('every App surface still renders in all three languages', () => {
  for (const language of LANGUAGES) {
    for (const [name, Component, props] of SURFACES) {
      const text = renderSurface(language, Component, props);
      assert.ok(text.length > 0, `${name} rendered nothing in ${language}`);
    }
  }
});

test('BlackPi renders its own tabs, chrome and catalog in three languages', () => {
  for (const [language, expected] of Object.entries({
    zh: ['首頁', '分類', '訊息', '訂單', '我的', '主要導覽'],
    en: ['Home', 'Categories', 'Messages', 'Orders', 'Me', 'Main Navigation'],
    jp: ['ホーム', 'カテゴリー', 'メッセージ', '注文', 'マイページ', 'メインナビゲーション'],
  })) {
    const nav = surface('blackpi/BottomNav', language);
    for (const label of expected) assert.ok(nav.includes(label), `BottomNav ${language} missing ${label}`);
  }

  // A product page: catalog copy, spec labels, the shop name and the two CTAs.
  assert.ok(surface('blackpi/ProductDetail(health)', 'en').includes('Smart Robot Vacuum & Mop'));
  assert.ok(surface('blackpi/ProductDetail(health)', 'jp').includes('スマート吸引・水拭きロボット掃除機'));
  assert.ok(surface('blackpi/ProductDetail(health)', 'zh').includes('智慧掃拖機器人'));

  // data/assetMap.js photo captions are read only by BlackPi, so BlackPi
  // translates them - they arrive as <img alt> here.
  assert.ok(surface('blackpi/AssetImage', 'en').includes('Automatic Home Cleaning Lifestyle Photo'));
  assert.ok(surface('blackpi/AssetImage', 'jp').includes('自動でお掃除する暮らしのイメージ写真'));
  assert.ok(surface('blackpi/AssetImage', 'zh').includes('居家自動清掃情境照'));

  // Chat chrome the App owns, next to a dialogue line the Scenario owns and
  // hands over already translated.
  assert.ok(surface('blackpi/ChatScreen', 'en').includes('Store Temporarily Closed'));
  assert.ok(surface('blackpi/ChatScreen', 'jp').includes('店舗休業中'));
});

test('Coin Winner renders its own platform copy in three languages', () => {
  assert.ok(surface('coin-winner/PlatformLanding', 'en').includes('AI-Powered Digital Asset Trading'));
  assert.ok(surface('coin-winner/PlatformLanding', 'jp').includes('AIによるデジタル資産取引'));
  assert.ok(surface('coin-winner/PlatformLanding', 'zh').includes('AI 智慧數位資產交易'));

  assert.ok(surface('coin-winner/WithdrawalPage', 'en').includes('Request a Withdrawal'));
  assert.ok(surface('coin-winner/WithdrawalPage', 'jp').includes('出金申請'));
  assert.ok(surface('coin-winner/WithdrawalPage', 'zh').includes('申請提領'));

  // The referral code is the scammer's, so it arrives as a prop from the
  // scenario rather than being read out of scenario02's casting.
  assert.ok(surface('coin-winner/PlatformRegister', 'en').includes('Referral Code'));

  // The one control that ends a visit to the platform. It names another App's
  // world, and it is still Coin Winner's own copy: Coin Winner is what draws
  // the button, so Coin Winner is what has to be able to say it (§3.6 -
  // ownership follows the UI, not the spelling). Where the press leads stays
  // the hosting scenario's decision.
  for (const [language, label] of Object.entries({
    zh: '返回 LINE 對話',
    en: 'Back to LINE Chat',
    jp: 'LINEのトークに戻る',
  })) {
    assert.ok(surface('coin-winner/ReturnBar', language).includes(label),
      `the return bar must read "${label}" in ${language}`);
  }
});

test('MyDonDon renders its own marketplace copy in three languages', () => {
  assert.ok(surface('mydondon/Home', 'en').includes('Turn unused items into cash'));
  assert.ok(surface('mydondon/Home', 'jp').includes('使わない物を現金に'));
  assert.ok(surface('mydondon/Home', 'zh').includes('把閒置變現金'));

  assert.ok(surface('mydondon/MyDonDonOrders', 'en').includes('No New Orders Right Now'));
  assert.ok(surface('mydondon/MyDonDonOrders', 'jp').includes('現在、新しい注文はありません'));

  // {label} interpolation survived the move to the App's own translator.
  assert.ok(surface('mydondon/Placeholder', 'en').includes('Image placeholder: Product photo: used tablet'));
  assert.ok(surface('mydondon/Placeholder', 'jp').includes('画像プレースホルダー：商品写真：中古タブレット'));
});

test('MeetU owns its chrome while the scenario owns the people on the cards', async () => {
  assert.ok(surface('meetu/MeetUSwipeActions', 'en').includes('Pass'));

  // A profile is Scenario 02's cast, handed over already in the player's
  // language - MeetU prints it verbatim and translates none of it.
  assert.ok(
    surface('meetu/ProfileCard', 'en').includes('Admin & Planning'),
    'the host should hand MeetU a profile in the player\'s language',
  );
  const card = await read('src/apps/meetu/components/ProfileCard.jsx');
  assert.doesNotMatch(card, /t\(person\./, 'MeetU must not translate the scenario\'s cast');
  assert.doesNotMatch(card, /t\(tag\)/, 'MeetU must not translate the scenario\'s cast');
  const host = await read('src/pages/scenario02/DatingBrowse.jsx');
  assert.match(host, /job: t\(rawCard\.job, lang\)/, 'the scenario should translate its own cast');
});

test('HPE owns its tracking vocabulary instead of being handed it', async () => {
  assert.ok(surface('hpe/HpeTrackingTimeline', 'en').includes('Picked Up by Courier'));
  assert.ok(surface('hpe/HpeTrackingTimeline', 'jp').includes('集荷済み'));
  assert.ok(surface('hpe/HpeTrackingTimeline', 'zh').includes('物流已收件'));

  // The screen no longer needs a translate() from whoever mounts it, and the
  // scenario no longer supplies one.
  const screen = await read('src/apps/hpe-logistics/screens/HpeTrackingScreen.jsx');
  assert.doesNotMatch(screen, /translate/, 'HPE should not take a translate prop');
  const host = await read('src/pages/scenario04/ReturnLogistics.jsx');
  assert.doesNotMatch(host, /translate=\{/, 'the scenario should not wire HPE\'s copy in');
});

// --- 4. fallback -------------------------------------------------------------

test('an untranslated string falls back to its Chinese source, in every language', async () => {
  const { t } = await import('../src/apps/blackpi/i18n/index.js');
  for (const language of [...LANGUAGES, 'de', undefined, null, '']) {
    assert.equal(t('這個字串不在任何字典裡', language ?? 'zh'), '這個字串不在任何字典裡');
  }
  // A language nobody supports reads as Chinese rather than as a blank screen.
  assert.equal(t('返回', 'de'), '返回');
  assert.equal(t('返回', 'zh'), '返回');
  assert.equal(t('返回', 'en'), 'Back');
  assert.equal(t('返回', 'jp'), '戻る');
});

test("Japanese is 'jp' everywhere, never 'ja'", async () => {
  // Comments say the word 'ja' precisely to forbid it, so only code counts.
  const code = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const app of APPS) {
    const index = code(await read(`src/apps/${app}/i18n/index.js`));
    assert.doesNotMatch(index, /['"]ja['"]/, `${app} must not introduce a 'ja' locale code`);
  }
  const mechanism = code(await read('src/shared/i18n/createTranslator.js'));
  assert.doesNotMatch(mechanism, /['"]ja['"]/);
  assert.match(mechanism, /'jp'/);

  // And the mechanism really does answer to 'jp' and to nothing else.
  const { toDictionaryLanguage } = await import('../src/shared/i18n/createTranslator.js');
  assert.equal(toDictionaryLanguage('jp'), 'jp');
  assert.equal(toDictionaryLanguage('ja'), 'zh');
});
