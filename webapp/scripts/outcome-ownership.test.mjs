// The Outcome System, rendered.
//
// scripts/validate-outcome-ownership.mjs reads the source and enforces
// ownership; this file renders all ten outcomes and all five 詐騙疑點分析
// screens and asserts what a player actually sees. Between them they pin the
// whole contract, so an ordinary Scenario change cannot quietly take the
// 結局 back:
//
//   * one dark CIBAR shell, the same on every scenario and both tones
//   * the right 刑事熊 artwork, resolved by the system and not by the page
//   * 詐騙成立 on every failure, 成功反詐 on every success
//   * exactly one CTA per screen, and it is the next step of the fixed flow
//     Outcome -> 詐騙疑點分析 -> 反詐小測驗
//   * no simulated app, phone, browser or police frame anywhere on them
//   * no 返回情境選單, no restart, no "play the other product"
//   * both of every scenario's outcomes are reachable from its own final
//     decision - see the s22-choice test at the bottom for Scenario 02's,
//     the one that used to have no safe branch (spec §13 AD-23)
//
// Run with scripts/jsx-test-loader.mjs, which compiles the JSX and stubs the
// Vite-only import.meta features the sources use (see that file).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const WEBAPP = new URL('../', import.meta.url).pathname;
const read = (path) => readFile(join(WEBAPP, path), 'utf8');

// Every scenario reads its run state out of storage on first render, and the
// language selector reads the player's choice out of the same place.
const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
};
globalThis.sessionStorage = globalThis.localStorage;
globalThis.performance ??= { now: () => 0 };
const speakLanguage = (language) => { memory.set('language', language); };

const page = async (path, name) => (await import(`../src/${path}`))[name];

// One screen, mounted at its real route so useParams() resolves exactly as it
// does in the app.
// React emits a <link rel="preload"> for an image it is about to render;
// that hint is not part of the screen, so it is dropped before anything here
// looks at the markup.
function renderAt(Component, routePath, url) {
  return stripPreloads(renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: [url] },
      React.createElement(Routes, null, React.createElement(Route, { path: routePath, element: React.createElement(Component) })),
    ),
  ));
}

const stripPreloads = (html) => html.replace(/<link\b[^>]*>/g, '');

// The ten outcomes: five scenarios, each with its 詐騙成立 and its 成功反詐.
//
// `route`/`url` are the real registered route and a real URL into it, so a
// scenario whose two結局 share one page (03 and 04 carry the outcome in the
// URL) is exercised through that page twice, once per branch.
const OUTCOMES = [
  {
    id: 'S01 詐騙成立', file: 'pages/scenario01/ScammedResult.jsx', name: 'ScammedResult',
    route: '/scenario01-investment/scammed-result', url: '/scenario01-investment/scammed-result',
    scenario: 'investment', state: 'scammed', tone: 'failure',
    mascot: 'scenario-01/images/results/cib-bear-scammed.webp',
    analysis: '/scenario01-investment/analysis',
  },
  {
    id: 'S01 成功反詐', file: 'pages/scenario01/StoppedResult.jsx', name: 'StoppedResult',
    route: '/scenario01-investment/stopped-result', url: '/scenario01-investment/stopped-result',
    scenario: 'investment', state: 'stopped', tone: 'success',
    mascot: 'scenario-01/images/results/cib-bear-stopped.webp',
    analysis: '/scenario01-investment/analysis',
  },
  {
    id: 'S02 詐騙成立', file: 'pages/scenario02/ScammedResult.jsx', name: 'ScammedResult',
    route: '/scenario02-romance/scammed-result', url: '/scenario02-romance/scammed-result',
    scenario: 'romance', state: 'scammed', tone: 'failure',
    mascot: 'scenario-02/images/results/cib-bear-romance-scammed.webp',
    analysis: '/scenario02-romance/risk-analysis',
  },
  {
    id: 'S02 成功反詐', file: 'pages/scenario02/StoppedResult.jsx', name: 'StoppedResult',
    route: '/scenario02-romance/stopped-result', url: '/scenario02-romance/stopped-result',
    scenario: 'romance', state: 'stopped', tone: 'success',
    mascot: 'scenario-02/images/results/cib-bear-romance-stopped.webp',
    analysis: '/scenario02-romance/risk-analysis',
  },
  {
    id: 'S03 詐騙成立', file: 'pages/scenario03/Ending.jsx', name: 'Ending',
    route: '/scenario03-police/ending/:outcome', url: '/scenario03-police/ending/failure',
    scenario: 'authority', state: 'scammed', tone: 'failure',
    mascot: 'scenario-03/images/results/cib-bear-authority-scammed.webp',
    analysis: '/scenario03-police/analysis',
  },
  {
    id: 'S03 成功反詐', file: 'pages/scenario03/Ending.jsx', name: 'Ending',
    route: '/scenario03-police/ending/:outcome', url: '/scenario03-police/ending/success',
    scenario: 'authority', state: 'verified', tone: 'success',
    mascot: 'scenario-03/images/results/cib-bear-authority-verified.webp',
    analysis: '/scenario03-police/analysis',
  },
  {
    id: 'S04 詐騙成立', file: 'pages/scenario04/OutcomeResult.jsx', name: 'OutcomeResult',
    route: '/scenario04-shopping/result/:route/:outcome', url: '/scenario04-shopping/result/health/fail',
    scenario: 'package', state: 'scammed', tone: 'failure',
    mascot: 'scenario-04/images/results/cib-bear-package-scammed.webp',
    analysis: '/scenario04-shopping/ending/health',
  },
  {
    id: 'S04 成功反詐', file: 'pages/scenario04/OutcomeResult.jsx', name: 'OutcomeResult',
    route: '/scenario04-shopping/result/:route/:outcome', url: '/scenario04-shopping/result/health/success',
    scenario: 'package', state: 'stopped', tone: 'success',
    mascot: 'scenario-04/images/results/cib-bear-package-stopped.webp',
    analysis: '/scenario04-shopping/ending/health',
  },
  {
    id: 'S05 詐騙成立', file: 'pages/scenario05/EndingScammed.jsx', name: 'EndingScammed',
    route: '/scenario05-atm/ending-scammed', url: '/scenario05-atm/ending-scammed',
    scenario: 'order', state: 'scammed', tone: 'failure',
    mascot: 'scenario-05/images/results/cib-bear-order-scammed.webp',
    analysis: '/scenario05-atm/reveal',
  },
  {
    id: 'S05 成功反詐', file: 'pages/scenario05/EndingCaught.jsx', name: 'EndingCaught',
    route: '/scenario05-atm/ending-caught', url: '/scenario05-atm/ending-caught',
    scenario: 'order', state: 'blocked', tone: 'success',
    mascot: 'scenario-05/images/results/cib-bear-order-blocked.webp',
    analysis: '/scenario05-atm/reveal',
  },
];

const ANALYSES = [
  { id: 'S01', file: 'pages/scenario01/Analysis.jsx', name: 'Analysis', scenario: 'investment', route: '/scenario01-investment/analysis', url: '/scenario01-investment/analysis', quiz: '/scenario01-investment/quiz' },
  { id: 'S02', file: 'pages/scenario02/RiskAnalysis.jsx', name: 'RiskAnalysis', scenario: 'romance', route: '/scenario02-romance/risk-analysis', url: '/scenario02-romance/risk-analysis', quiz: '/scenario02-romance/quiz' },
  { id: 'S03', file: 'pages/scenario03/Analysis.jsx', name: 'Analysis', scenario: 'authority', route: '/scenario03-police/analysis', url: '/scenario03-police/analysis', quiz: '/scenario03-police/quiz' },
  { id: 'S04', file: 'pages/scenario04/Ending.jsx', name: 'Ending', scenario: 'package', route: '/scenario04-shopping/ending/:route', url: '/scenario04-shopping/ending/health', quiz: '/scenario04-shopping/quiz' },
  { id: 'S05', file: 'pages/scenario05/Reveal.jsx', name: 'Reveal', scenario: 'order', route: '/scenario05-atm/reveal', url: '/scenario05-atm/reveal', quiz: '/scenario05-atm/quiz' },
];

// Class prefixes that belong to a simulated world. None may appear on a screen
// shown after the simulation has ended.
const SIMULATION_CLASSES = [
  'line-', 'pol-', 'bp-', 'blackpi-', 'go-', 'cib-', 'md-', 'sq-', 'wb-', 'bk-',
  'bition-', 'gugo-', 'hpe-', 'meetu-', 'phone-shell',
];

// Copy the Outcome System does not offer, whatever a scenario used to call it.
const FORBIDDEN_COPY = [
  '返回情境選單', '回首頁', '再玩一次', '重新開始', '體驗另一', '完整分析',
  '五項評估', '個人化分析', '核心教育重點', '進行關鍵判斷',
  '看看剛才的陷阱', '看看哪裡出了問題', '看看你做對了什麼', '看看你在哪一步掉進陷阱',
];

const links = (html) => [...html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)]
  .map(([, href, text]) => ({ href, text: text.replace(/<[^>]*>/g, '') }));

function assertNoSimulationShell(html, id) {
  for (const prefix of SIMULATION_CLASSES) {
    assert.ok(!new RegExp(`class="[^"]*\\b${prefix}`).test(html), `${id}: renders a "${prefix}*" class - the simulation must not follow the player past the結局`);
  }
  for (const copy of FORBIDDEN_COPY) {
    assert.ok(!html.includes(copy), `${id}: still says "${copy}"`);
  }
  // A fake app header/footer would be the other way this creeps back.
  assert.ok(!/<header\b/.test(html), `${id}: renders a header`);
  assert.ok(!/<footer\b/.test(html), `${id}: renders a footer`);
}

test('all ten outcomes render the one shared CIBAR shell, in the right state', async (t) => {
  speakLanguage('zh');
  for (const outcome of OUTCOMES) {
    await t.test(outcome.id, async () => {
      const html = renderAt(await page(outcome.file, outcome.name), outcome.route, outcome.url);
      assert.match(html, /^<main class="cibar-outcome cibar-outcome-(failure|success)"/, `${outcome.id}: the shared outcome shell is not this screen's root`);
      assert.match(html, new RegExp(`class="cibar-outcome cibar-outcome-${outcome.tone}"`), `${outcome.id}: wrong tone`);
      assert.match(html, new RegExp(`data-outcome-scenario="${outcome.scenario}"`));
      assert.match(html, new RegExp(`data-outcome-state="${outcome.state}"`));
      assertNoSimulationShell(html, outcome.id);
    });
  }
});

test('each outcome shows its own 刑事熊 artwork, uncropped and unfiltered', async (t) => {
  speakLanguage('zh');
  const css = await read('src/components/outcome/ScenarioOutcome.css');
  assert.match(css, /\.cibar-outcome-mascot img\{[^}]*object-fit:contain/, 'the artwork must be contained, never cropped');
  assert.doesNotMatch(css, /\.cibar-outcome-mascot[^}]*filter:/, 'the artwork must never be filtered');
  for (const outcome of OUTCOMES) {
    await t.test(outcome.id, async () => {
      const html = renderAt(await page(outcome.file, outcome.name), outcome.route, outcome.url);
      const images = [...html.matchAll(/<img[^>]*src="([^"]*)"/g)].map((match) => match[1]);
      assert.equal(images.length, 1, `${outcome.id}: an outcome screen shows exactly one image`);
      assert.equal(images[0], `/assets/scenarios/${outcome.mascot}`);
    });
  }
});

test('failure says 詐騙成立, success says 成功反詐 - and nothing else does', async (t) => {
  speakLanguage('zh');
  for (const outcome of OUTCOMES) {
    await t.test(outcome.id, async () => {
      const html = renderAt(await page(outcome.file, outcome.name), outcome.route, outcome.url);
      const [expected, forbidden] = outcome.tone === 'failure' ? ['詐騙成立', '成功反詐'] : ['成功反詐', '詐騙成立'];
      assert.match(html, new RegExp(`<p class="cibar-outcome-status">${expected}</p>`), `${outcome.id}: missing the ${expected} status`);
      assert.ok(!html.includes(forbidden), `${outcome.id}: also says ${forbidden}`);
    });
  }
});

test('every outcome has exactly one CTA, and it goes to its 詐騙疑點分析', async (t) => {
  speakLanguage('zh');
  for (const outcome of OUTCOMES) {
    await t.test(outcome.id, async () => {
      const html = renderAt(await page(outcome.file, outcome.name), outcome.route, outcome.url);
      const found = links(html);
      assert.equal(found.length, 1, `${outcome.id}: expected one CTA, found ${found.length} (${found.map((l) => l.text).join(' / ')})`);
      assert.equal(found[0].text, '查看詐騙疑點分析');
      assert.equal(found[0].href, outcome.analysis);
      assert.equal((html.match(/<button\b/g) || []).length, 0, `${outcome.id}: an outcome screen has no buttons besides its one CTA link`);
    });
  }
});

test('every 詐騙疑點分析 is the shared analysis screen, and continues into the 反詐小測驗', async (t) => {
  speakLanguage('zh');
  for (const analysis of ANALYSES) {
    await t.test(analysis.id, async () => {
      const html = renderAt(await page(analysis.file, analysis.name), analysis.route, analysis.url);
      assert.match(html, /^<main class="cibar-analysis"/, `${analysis.id}: the shared analysis shell is not this screen's root`);
      assert.match(html, new RegExp(`data-analysis-scenario="${analysis.scenario}"`));
      assert.match(html, /<h1 class="cibar-analysis-title">詐騙疑點分析<\/h1>/);
      const clues = (html.match(/<li class="cibar-analysis-clue">/g) || []).length;
      assert.ok(clues >= 4, `${analysis.id}: only ${clues} clues`);
      const found = links(html);
      assert.equal(found.length, 1, `${analysis.id}: expected one CTA, found ${found.length}`);
      assert.equal(found[0].text, '進行反詐小測驗');
      assert.equal(found[0].href, analysis.quiz);
      assertNoSimulationShell(html, analysis.id);
    });
  }
});

test('the whole system translates: EN and JP change the copy, never the contract', async (t) => {
  const EXPECTED = {
    en: { failure: 'Scam Completed', success: 'Scam Prevented', outcomeCta: 'See the Scam Warning Signs', analysisTitle: 'Scam Warning Signs', quizCta: 'Start the Anti-Fraud Quiz' },
    jp: { failure: '詐欺成立', success: '詐欺阻止', outcomeCta: '詐欺の危険サインを見る', analysisTitle: '詐欺の危険サイン', quizCta: '詐欺対策クイズへ' },
  };
  for (const [language, expected] of Object.entries(EXPECTED)) {
    await t.test(language, async () => {
      speakLanguage(language);
      for (const outcome of OUTCOMES) {
        const html = renderAt(await page(outcome.file, outcome.name), outcome.route, outcome.url);
        assert.match(html, new RegExp(`<p class="cibar-outcome-status">${expected[outcome.tone]}</p>`), `${outcome.id} (${language})`);
        assert.equal(links(html)[0].text, expected.outcomeCta, `${outcome.id} (${language})`);
      }
      for (const analysis of ANALYSES) {
        const html = renderAt(await page(analysis.file, analysis.name), analysis.route, analysis.url);
        assert.ok(html.includes(`<h1 class="cibar-analysis-title">${expected.analysisTitle}</h1>`), `${analysis.id} (${language})`);
        assert.equal(links(html)[0].text, expected.quizCta, `${analysis.id} (${language})`);
      }
    });
  }
  speakLanguage('zh');
});

test('the shell is CIBAR dark navy in both tones - only the accent differs', async () => {
  const css = await read('src/components/outcome/ScenarioOutcome.css');
  assert.match(css, /\.cibar-outcome\{[^}]*#06162d/, 'the outcome shell must be CIBAR dark navy');
  const analysisCss = await read('src/components/outcome/FraudClueAnalysis.css');
  assert.match(analysisCss, /\.cibar-analysis\{[^}]*#06162d/, 'the analysis shell must be CIBAR dark navy');
  // The success tone re-tints the accent tokens and nothing else: no second
  // background, no light surface, no per-scenario theme.
  const successBlock = css.match(/\.cibar-outcome-success\{([^}]*)\}/)[1];
  for (const property of successBlock.split(';').map((value) => value.trim()).filter(Boolean)) {
    assert.match(property, /^--cibar-outcome-accent/, `the success tone may only re-tint accents, not set ${property}`);
  }
  // Rules only - the header comment explains the themes that were removed.
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ''), /-theme-/, 'per-scenario outcome themes are gone');
});

test('the flow is registered end to end, and the failure/success entrances still exist', async () => {
  const routes = await read('src/routes.jsx');
  for (const outcome of [...new Set(OUTCOMES.map((entry) => entry.route))]) {
    assert.ok(routes.includes(`path: '${outcome.replace(/^\//, '')}'`), `routes.jsx does not register ${outcome}`);
  }
  for (const analysis of ANALYSES) {
    assert.ok(routes.includes(`path: '${analysis.route.replace(/^\//, '')}'`), `routes.jsx does not register ${analysis.route}`);
    assert.ok(routes.includes(`path: '${analysis.quiz.replace(/^\//, '')}'`), `routes.jsx does not register ${analysis.quiz}`);
  }
  // Every quiz ends the run the same way: back to the AR scan.
  const quiz = await read('src/components/ui/ScenarioFinalDecision.jsx');
  assert.match(quiz, /backTo = '\/ar-scan'/);

  // Route reachability of each branch, from the screen that decides it. All
  // ten are reachable from the story since spec §13 AD-23 was resolved - S02's
  // 成功反詐 used to be the one branch nothing navigated into, and the
  // s22-choice routing that now reaches it is pinned in its own test below.
  const entrances = [
    ['src/pages/scenario01/WithdrawFail.jsx', '/scenario01-investment/scammed-result'],
    ['src/pages/scenario01/WithdrawFail.jsx', '/scenario01-investment/stopped-result'],
    ['src/pages/scenario02/GuaranteePage.jsx', '/scenario02-romance/scammed-result'],
    ['src/pages/scenario02/TopupWarning.jsx', '/scenario02-romance/stopped-result'],
    ['src/pages/scenario02/PrivateChat.jsx', '/scenario02-romance/topup-warning'],
    // Scenario 03's 受騙 branch reaches its ending through the post-transfer
    // aftermath (scene 11a2), not straight off the decision: the decision
    // routes to /aftermath and the aftermath routes to /ending/failure. Both
    // hops are listed so a shortcut past the aftermath fails here too.
    // The 反詐 branch is the opposite shape: 撥打 165 IS the successful
    // judgement, so the decision itself reaches /ending/success with no
    // simulated hotline call in between.
    ['src/pages/scenario03/FinalDecision.jsx', '/scenario03-police/aftermath'],
    ['src/pages/scenario03/Aftermath.jsx', '/scenario03-police/ending/failure'],
    ['src/pages/scenario03/FinalDecision.jsx', '/scenario03-police/ending/success'],
    ['src/pages/scenario04/PlatformSupportChat.jsx', '/scenario04-shopping/result/${route}/fail'],
    ['src/pages/scenario04/PlatformSupportChat.jsx', '/scenario04-shopping/result/${route}/success'],
    ['src/data/scenario05Dialogues.js', '/scenario05-atm/ending-caught'],
    ['src/pages/scenario05/OrderGone.jsx', '/scenario05-atm/ending-scammed'],
  ];
  for (const [file, target] of entrances) {
    assert.ok((await read(file)).includes(target), `${file} no longer leads to ${target}`);
  }
});

// Scenario 02's final decision, read out of the dialogue tree itself rather
// than out of the file's text (spec §13 AD-23).
//
// This replaces the assertion that used to pin AD-23 as an accepted gap - it
// required PrivateChat NOT to name topup-warning, which made fixing the gap a
// test failure. What has to be guarded now is the opposite, and the failure
// mode that produced AD-23 in the first place: the two options of s22-choice
// converging again on one node, which silently deletes the safe branch while
// leaving both outcome pages, both routes and every other test green.
test('Scenario 02 s22-choice is a real two-way final decision, in all three languages', async (t) => {
  const { buildNodes } = await import('../src/pages/scenario02/PrivateChat.jsx');
  for (const language of ['zh', 'en', 'jp']) {
    await t.test(language, () => {
      const nodes = buildNodes(language);
      const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));
      const decision = byId['s22-choice'];
      assert.ok(decision, 's22-choice is gone - Scenario 02 has no final decision');
      assert.equal(decision.options.length, 2, 's22-choice must offer exactly two replies');

      const [left, right] = decision.options;
      assert.notEqual(
        left.next, right.next,
        'both s22-choice options lead to the same node again - that is exactly AD-23, and it deletes Scenario 02\'s 成功反詐 branch',
      );

      // LEFT is the safe answer: it must reach the mandatory 驗證金 warning,
      // which is the only entrance to 成功反詐.
      const stop = byId[left.next];
      assert.ok(stop, `s22-choice LEFT points at a node that does not exist (${left.next})`);
      assert.equal(stop.custom?.kind, 'goto-platform');
      assert.equal(stop.custom.route, '/scenario02-romance/topup-warning');

      // RIGHT is the risky answer: unchanged, straight to the verification
      // payment and 詐騙成立.
      const carryOn = byId[right.next];
      assert.ok(carryOn, `s22-choice RIGHT points at a node that does not exist (${right.next})`);
      assert.equal(carryOn.custom?.kind, 'goto-platform');
      assert.equal(carryOn.custom.route, '/scenario02-romance/guarantee');
    });
  }

  // ...and the two screens those branches land on still end where they should.
  const topupWarning = await read('src/pages/scenario02/TopupWarning.jsx');
  assert.ok(topupWarning.includes('/scenario02-romance/stopped-result'), 'TopupWarning no longer leads to 成功反詐');
  assert.ok(topupWarning.includes('/scenario02-romance/guarantee'), 'TopupWarning no longer lets the player continue into the scam');
  const guarantee = await read('src/pages/scenario02/GuaranteePage.jsx');
  assert.ok(guarantee.includes('/scenario02-romance/scammed-result'), 'GuaranteePage no longer leads to 詐騙成立');
});

// styles/global.css resets `h1`, `h2` and `p` as `<tag>:not(.gugo-app *)`.
// `:not()` takes the specificity of its argument, so those resets score
// (0,1,1) - which beats a plain one-class selector like
// `.cibar-outcome-status`. A codex review on #323 caught the consequence: the
// status pill and the consequence line were rendering in the global muted
// blue instead of the failure/success accent, so 詐騙成立 and 成功反詐 looked
// identical - the exact distinction §4.3 says those two screens must carry -
// and the "consequence" line was rendering at body-copy size.
//
// The fix is to scope those rules under the component root. This test is what
// stops it coming back, and it is derived rather than listed: it reads which
// classes the components actually put on a p/h1/h2, then requires every rule
// styling one of them to out-rank the reset. A new `<p className="...">` is
// covered the day it is added.
const GLOBAL_RESET_SPECIFICITY = [0, 1, 1];

// (ids, classes/attributes/pseudo-classes, elements) for one selector.
// `:not(x)` / `:is(x)` contribute their most specific argument, which is what
// makes `p:not(.gugo-app *)` score (0,1,1) rather than (0,0,1).
function specificity(selector) {
  let rest = selector;
  let ids = 0, classes = 0, elements = 0;
  for (const [, fn, args] of selector.matchAll(/:(not|is|has)\(([^)]*)\)/g)) {
    void fn;
    const best = args.split(',').map((part) => specificity(part.trim()))
      .sort((a, b) => b[0] - a[0] || b[1] - a[1] || b[2] - a[2])[0] ?? [0, 0, 0];
    ids += best[0]; classes += best[1]; elements += best[2];
  }
  rest = rest.replace(/:(?:not|is|has)\([^)]*\)/g, ' ');
  ids += (rest.match(/#[\w-]+/g) ?? []).length;
  classes += (rest.match(/\.[\w-]+/g) ?? []).length + (rest.match(/\[[^\]]*\]/g) ?? []).length;
  classes += (rest.match(/:[a-z-]+/g) ?? []).length;
  rest = rest.replace(/[#.][\w-]+/g, ' ').replace(/\[[^\]]*\]/g, ' ').replace(/::?[a-z-]+/g, ' ');
  elements += (rest.match(/(?:^|[\s>+~])([a-z][a-z0-9]*)/g) ?? []).length;
  return [ids, classes, elements];
}

const outranks = (a, b) => (a[0] !== b[0] ? a[0] > b[0] : a[1] !== b[1] ? a[1] > b[1] : a[2] > b[2]);

// Top-level rules of a stylesheet, at-rule bodies included, as {selector} rows.
function rules(css) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const out = [];
  for (const [, prelude] of stripped.matchAll(/([^{}]+)\{[^{}]*\}/g)) {
    const selector = prelude.trim().replace(/\s+/g, ' ');
    if (!selector || selector.startsWith('@')) continue;
    for (const part of selector.split(',')) if (part.trim()) out.push(part.trim());
  }
  return out;
}

const TAG_BACKED = /<(p|h1|h2)\b[^>]*className="([^"{}]+)"/g;

test('every rule on a p/h1/h2 out-ranks global.css\'s element resets', async (t) => {
  // First: the resets really are what this is defending against. If they are
  // ever relaxed or removed, this assertion says so rather than leaving the
  // scoping below looking like superstition.
  const globalCss = await read('src/styles/global.css');
  for (const tag of ['h1', 'h2', 'p']) {
    const reset = rules(globalCss).find((selector) => selector.startsWith(`${tag}:not(`));
    assert.ok(reset, `global.css no longer resets bare <${tag}> - re-check whether the scoping below is still needed`);
    assert.deepEqual(specificity(reset), GLOBAL_RESET_SPECIFICITY, `global.css's ${tag} reset changed specificity`);
  }

  for (const [component, stylesheet, root] of [
    ['src/components/outcome/ScenarioOutcome.jsx', 'src/components/outcome/ScenarioOutcome.css', 'cibar-outcome'],
    ['src/components/outcome/FraudClueAnalysis.jsx', 'src/components/outcome/FraudClueAnalysis.css', 'cibar-analysis'],
  ]) {
    await t.test(root, async () => {
      const source = await read(component);
      const css = rules(await read(stylesheet));

      // Classes this component puts on a p/h1/h2 - read off the markup, not
      // listed here, so a newly added one is covered automatically.
      const tagBacked = [...source.matchAll(TAG_BACKED)].flatMap(([, , value]) => value.trim().split(/\s+/));
      assert.ok(tagBacked.length >= 3, `${component}: only ${tagBacked.length} tag-backed classes were read out of the markup - the scan stopped matching`);

      for (const name of new Set(tagBacked)) {
        const styling = css.filter((selector) => selector.endsWith(`.${name}`));
        assert.ok(styling.length > 0, `${stylesheet}: nothing styles .${name}`);
        for (const selector of styling) {
          assert.ok(
            outranks(specificity(selector), GLOBAL_RESET_SPECIFICITY),
            `${stylesheet}: \`${selector}\` (${specificity(selector)}) loses to global.css's element reset (${GLOBAL_RESET_SPECIFICITY}) - scope it under .${root}`,
          );
        }
      }

      // The same trap one level down: a rule whose subject is a bare element
      // (`.cibar-analysis-clue h2`) ties with the reset and is decided by
      // stylesheet order, which is not something to rely on.
      for (const selector of css) {
        const subject = selector.split(/\s|>|\+|~/).filter(Boolean).at(-1) ?? '';
        if (!/^(?:p|h1|h2)$/.test(subject)) continue;
        assert.ok(
          outranks(specificity(selector), GLOBAL_RESET_SPECIFICITY),
          `${stylesheet}: \`${selector}\` (${specificity(selector)}) only ties with global.css's element reset - stylesheet order should not decide this`,
        );
      }
    });
  }
});

// The point of the fix, stated as the product rule it protects: failure and
// success must not resolve to the same colour.
test('the failure and success accents are actually different colours', async () => {
  const css = await read('src/components/outcome/ScenarioOutcome.css');
  const base = css.match(/\.cibar-outcome\{([^}]*)\}/)[1];
  const success = css.match(/\.cibar-outcome-success\{([^}]*)\}/)[1];
  const accentOf = (block) => block.match(/--cibar-outcome-accent:\s*([^;]+)/)[1].trim();
  assert.notEqual(accentOf(base), accentOf(success), 'failure and success must not share an accent');
  // ...and the two elements that carry the distinction really do read it.
  for (const name of ['status', 'consequence']) {
    const rule = css.match(new RegExp(`\\.cibar-outcome \\.cibar-outcome-${name}\\{([^}]*)\\}`))[1];
    assert.match(rule, /color:var\(--cibar-outcome-accent\)/, `.cibar-outcome-${name} must paint with the tone accent`);
  }
});
