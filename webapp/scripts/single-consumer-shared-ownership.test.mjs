// AD-07 regression: a component with a single Scenario consumer belongs to
// that Scenario, and moving it there changes nothing a player can see.
//
// Two AD-07 items were re-homed: PhoneShell (only ever rendered through
// Scenario 03's PoliceFrame) and the Ghost Order site/browser chrome
// (BrowserChrome / SuqubianSiteHeader, only ever rendered by Scenario 05
// pages). CibarResultBar was a third one; the shared Outcome System now owns
// Scenario 05's whole post-simulation shell, so that component has no consumer
// left and is gone from both the shared layer and its owner - which is why it
// appears below only as a path that must not come back. This file holds three
// kinds of check:
//
//   1. Ownership - the shared paths are vacated and stay vacated, the
//      components live with their owners, and nothing imports the old paths.
//   2. Behaviour/DOM - relocated components keep their established markup,
//      except where a later intentional interaction cleanup established a new
//      display-only contract. Those expectations pin that current contract.
//   3. The guard - the AD-07 rules in validate-shared-ui-ownership.mjs are
//      driven with real regressions and have to reject each one, so a guard
//      that quietly stopped checking fails here instead of passing.
//
// Run with scripts/jsx-test-loader.mjs, which compiles the JSX and stubs the
// Vite-only import.meta features the sources use (see that file).
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, writeFile, rm, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

const run = promisify(execFile);
const WEBAPP = new URL('../', import.meta.url).pathname;
const read = (path) => readFile(join(WEBAPP, path), 'utf8');
const exists = async (path) => { try { await access(join(WEBAPP, path)); return true; } catch { return false; } };

// Both scenarios read run state out of localStorage on first render.
const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
};
globalThis.sessionStorage = globalThis.localStorage;

const PHONE_SHELL = 'src/pages/scenario03/components/PhoneShell.jsx';
const PHONE_SHELL_CSS = 'src/pages/scenario03/components/PhoneShell.css';
const GHOST_ORDER_UI = [
  'src/pages/scenario05/components/BrowserChrome.jsx',
  'src/pages/scenario05/components/SuqubianSiteHeader.jsx',
];
// Every path AD-07 vacated - including the two index files a "keep the old
// import working" re-export would be spelled as.
const VACATED = [
  'src/components/ui/PhoneShell.jsx',
  'src/components/ui/PhoneShell.css',
  'src/components/ghostorder/BrowserChrome.jsx',
  'src/components/ghostorder/CibarResultBar.jsx',
  'src/components/ghostorder/SuqubianSiteHeader.jsx',
  'src/components/ghostorder/index.js',
  'src/components/ghostorder/index.jsx',
  // Deleted outright rather than re-homed: the Outcome System renders the
  // whole結局/分析 screen now, so Scenario 05 has no post-simulation strip of
  // its own to place on top of it.
  'src/pages/scenario05/components/CibarResultBar.jsx',
];

const { PhoneShell } = await import('../src/pages/scenario03/components/PhoneShell.jsx');
const { PoliceFrame } = await import('../src/pages/scenario03/components/PoliceFrame.jsx');
const { BrowserChrome } = await import('../src/pages/scenario05/components/BrowserChrome.jsx');
const { SuqubianSiteHeader } = await import('../src/pages/scenario05/components/SuqubianSiteHeader.jsx');

// The status bar prints the current wall-clock time; that one span is the only
// thing in any of this markup that is not a pure function of the props.
const normalise = (html) => html.replace(/<span>\d{1,2}:\d{2}<\/span>/g, '<span>TIME</span>');
const render = (element) => normalise(renderToStaticMarkup(element));
const screen = (Component) => render(React.createElement(MemoryRouter, null, React.createElement(Component)));

// --- 1. ownership -----------------------------------------------------------

test('1a. the shared layer no longer holds either single-consumer component', async () => {
  for (const path of VACATED) {
    assert.equal(await exists(path), false, `${path} is back in the shared layer`);
  }
  assert.equal(await exists('src/components/ghostorder'), false, 'components/ghostorder should be gone, not an empty folder');
});

test('1b. each component lives with its owner, stylesheet included', async () => {
  for (const path of [PHONE_SHELL, PHONE_SHELL_CSS, ...GHOST_ORDER_UI]) {
    assert.ok((await read(path)).length > 0, `${path} is missing`);
  }
  assert.match(await read(PHONE_SHELL), /import '\.\/PhoneShell\.css'/);
});

// Every module specifier in a source file - the string an `import`/`export`
// names, and nothing else.
//
// This walks the source instead of running a regex over its raw text, because
// the two are not the same thing here. A regex for `from '...'` also matches
// the INSIDE of a string literal, and the fixtures further down this very file
// contain import statements as data - 3d rewrites a real import into a vacated
// one by passing both spellings as strings, and 3e prepends an import through
// a template literal. Scanned as raw text those fixtures read as imports that
// this repo performs, and 1c reported its own test data as a production
// violation.
//
// So a quote here consumes the whole literal as one token and its contents are
// never scanned as code again. A string only counts as a specifier when the
// last thing emitted as code before it was the `import` or `from` keyword,
// which is exactly where a real specifier sits - `import x from 'p'`,
// `import 'p'`, `export { x } from 'p'`, `await import('p')` - and is never
// where a quoted fixture sits. Comments are skipped for the same reason: prose
// naming a vacated path is prose.
//
// A template literal is reported by its raw text, interpolation included. One
// cannot spell a static import, but `await import(`...${x}`)` is real, and a
// vacated path in its literal half should still be caught rather than waved
// through as unresolvable.
function importSpecifiers(source) {
  const specifiers = [];
  let index = 0;
  let previousWord = '';

  while (index < source.length) {
    const character = source[index];
    const pair = source.slice(index, index + 2);

    if (pair === '//') {
      const end = source.indexOf('\n', index);
      index = end === -1 ? source.length : end;
      continue;
    }
    if (pair === '/*') {
      const end = source.indexOf('*/', index + 2);
      index = end === -1 ? source.length : end + 2;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      const quote = character;
      let cursor = index + 1;
      let raw = '';
      while (cursor < source.length) {
        if (source[cursor] === '\\') { raw += source.slice(cursor, cursor + 2); cursor += 2; continue; }
        if (source[cursor] === quote) break;
        raw += source[cursor];
        cursor += 1;
      }
      if (previousWord === 'from' || previousWord === 'import') specifiers.push(raw);
      previousWord = '';
      index = cursor + 1;
      continue;
    }
    if (/[A-Za-z_$]/.test(character)) {
      let cursor = index;
      while (cursor < source.length && /[\w$]/.test(source[cursor])) cursor += 1;
      previousWord = source.slice(index, cursor);
      index = cursor;
      continue;
    }
    // Whitespace and `(` sit between `import` and its specifier; anything else
    // ends the keyword's reach, so `x.from = 'p'` is not read as an import.
    if (!/[\s(]/.test(character)) previousWord = '';
    index += 1;
  }

  return specifiers;
}

test('1c. no production source imports a vacated path, and no re-export stands in for one', async () => {
  // `git ls-files` lists what is tracked, which includes a file deleted in the
  // working tree but not yet staged; read from disk and skip what is gone.
  const { stdout } = await run('git', ['ls-files', 'src', 'scripts'], { cwd: WEBAPP });
  const tracked = stdout.split('\n').filter((path) => /\.[cm]?[jt]sx?$/.test(path));
  const files = [];
  for (const path of tracked) if (await exists(path)) files.push(path);
  assert.ok(files.length > 100, 'expected the repo listing to find the source tree');
  for (const path of files) {
    for (const specifier of importSpecifiers(await read(path))) {
      assert.doesNotMatch(specifier, /components\/ghostorder\//, `${path} still imports ${specifier}`);
      assert.doesNotMatch(specifier, /components\/ui\/PhoneShell/, `${path} still imports ${specifier}`);
    }
  }
});

// 1c is only worth anything if it still sees a real import, and only safe if it
// stops seeing fixtures. Both directions are pinned here rather than trusted,
// because the failure that prompted this - a scanner reading its own test data
// as production code - looks identical to a scanner that has gone blind.
test('1c-scanner. import statements are found; quoted fixtures and prose are not', () => {
  const real = [
    ["import { CibarResultBar } from '../../components/ghostorder/CibarResultBar';", '../../components/ghostorder/CibarResultBar'],
    ['import "../../components/ghostorder/CibarResultBar";', '../../components/ghostorder/CibarResultBar'],
    ["export { PhoneShell } from '../../components/ui/PhoneShell';", '../../components/ui/PhoneShell'],
    ["const m = await import('../../components/ghostorder/BrowserChrome');", '../../components/ghostorder/BrowserChrome'],
    ['const m = await import(`../../components/ghostorder/${name}`);', '../../components/ghostorder/${name}'],
  ];
  for (const [source, expected] of real) {
    assert.deepEqual(importSpecifiers(source), [expected], `should have found the specifier in: ${source}`);
  }

  const notImports = [
    // 3d's fixture: two import statements passed as data to .replace().
    `source.replace("from './components/CibarResultBar'", "from '../../components/ghostorder/CibarResultBar'")`,
    // 3e's fixture: an import statement built as a template literal.
    'const next = `import { X } from \'../../components/ghostorder/X\';\\n${source}`;',
    // A path named as data, which is what the validator's own tables do.
    "const VACATED = ['src/components/ghostorder/BrowserChrome.jsx'];",
    // Prose.
    "// components/ghostorder/BrowserChrome.jsx moved to pages/scenario05.",
    "/* import { X } from '../../components/ui/PhoneShell'; */",
    // A property that happens to be called `from`.
    "const range = { from: '../../components/ui/PhoneShell' };",
  ];
  for (const source of notImports) {
    const found = importSpecifiers(source).filter((s) => /components\/(ghostorder|ui\/PhoneShell)/.test(s));
    assert.deepEqual(found, [], `should not have read an import out of: ${source}`);
  }
});

test('1d. the consumers import their own copy, by a path inside the owner', async () => {
  assert.match(await read('src/pages/scenario03/components/PoliceFrame.jsx'), /import \{ PhoneShell \} from '\.\/PhoneShell'/);
  for (const [path, imports] of [
    ['src/pages/scenario05/TradeInfo.jsx', ['BrowserChrome', 'SuqubianSiteHeader']],
    ['src/pages/scenario05/ShopCreate.jsx', ['BrowserChrome', 'SuqubianSiteHeader']],
    ['src/pages/scenario05/OrderGone.jsx', ['BrowserChrome']],
  ]) {
    const source = await read(path);
    for (const name of imports) {
      assert.match(source, new RegExp(`import \\{ ${name} \\} from './components/${name}'`), `${path} does not import ${name} from its own components/`);
    }
  }
});

// --- 2. behaviour and DOM contracts -----------------------------------------
//
// Most expectations were captured before the ownership move. BrowserChrome is
// intentionally pinned to the later AR interaction cleanup: its decorative
// back/menu chrome must not become keyboard, pointer, or navigation controls.

test('2a. PhoneShell renders exactly what it rendered in the shared layer', () => {
  assert.equal(
    render(React.createElement(
      PhoneShell,
      { statusTitle: '狀態', className: 'x-extra', overlay: React.createElement('i', null, 'ov') },
      React.createElement('p', null, 'body'),
    )),
    "<div class=\"phone-shell x-extra\"><div class=\"phone-shell-statusbar\"><span>TIME</span><span class=\"phone-shell-statusbar-title\">狀態</span><span class=\"phone-shell-statusbar-icons\">5G ▮▮▯ 86%</span></div><div class=\"phone-shell-body\"><p>body</p></div><div class=\"phone-shell-home-indicator\"></div><i>ov</i></div>",
  );
  assert.equal(
    render(React.createElement(
      PhoneShell,
      { dark: true, systemChrome: false, homeIndicator: false },
      React.createElement('p', null, 'body'),
    )),
    "<div class=\"phone-shell phone-shell-dark\"><div class=\"phone-shell-body\"><p>body</p></div></div>",
  );
});

test('2b. Scenario 03 still renders PhoneShell through PoliceFrame, unchanged', () => {
  assert.equal(
    render(React.createElement(
      PoliceFrame,
      { stepKey: 'briefing', dark: true, className: 'pol-x' },
      React.createElement('p', null, 'inner'),
    )),
    "<div class=\"phone-shell phone-shell-dark pol-x\"><div class=\"phone-shell-body\"><p>inner</p></div></div>",
  );
});

test('2c. the Ghost Order browser chrome is display-only', () => {
  const chrome = BrowserChrome({ domain: 'suqubian.tw', onBack: () => assert.fail('display chrome navigated') });
  const [back, omnibox, menu] = React.Children.toArray(chrome.props.children);
  for (const item of [back, menu]) {
    assert.equal(item.type, 'span');
    assert.equal(item.props['aria-hidden'], 'true');
    assert.equal(item.props.onClick, undefined);
    assert.equal(item.props.tabIndex, undefined);
    assert.equal(item.props.href, undefined);
    assert.equal(item.props.role, undefined);
  }
  assert.equal(omnibox.type, 'span');
  assert.equal(render(React.createElement(BrowserChrome, { domain: 'suqubian.tw', onBack: () => {} })), "<div class=\"wb-chrome\"><span class=\"wb-icon-btn wb-icon-display\" aria-hidden=\"true\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"21\" height=\"21\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-chevron-left\" aria-hidden=\"true\"><path d=\"m15 18-6-6 6-6\"></path></svg></span><span class=\"wb-omnibox\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"11\" height=\"11\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-lock\" aria-hidden=\"true\"><rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\"></rect><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"></path></svg><span class=\"wb-domain\">suqubian.tw</span></span><span class=\"wb-icon-btn wb-icon-display\" aria-hidden=\"true\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"19\" height=\"19\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-ellipsis-vertical\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"1\"></circle><circle cx=\"12\" cy=\"5\" r=\"1\"></circle><circle cx=\"12\" cy=\"19\" r=\"1\"></circle></svg></span></div>");
  assert.equal(
    render(React.createElement(SuqubianSiteHeader, { section: '建立專屬交易', brand: 'SafeDeal', tag: '安全交易・安心收付' })),
    "<div class=\"sq-masthead\"><div class=\"sq-brand\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"21\" height=\"21\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-shield-check sq-brand-icon\" aria-hidden=\"true\"><path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"></path><path d=\"m9 12 2 2 4-4\"></path></svg><span class=\"sq-wordmark\">SafeDeal</span></div><div class=\"sq-brand-tag\">安全交易・安心收付</div><div class=\"sq-section\">建立專屬交易</div></div>",
  );
});

test('2d. PoliceFrame still passes the props it always passed', async () => {
  const source = await read('src/pages/scenario03/components/PoliceFrame.jsx');
  // systemChrome became a pass-through with a `false` default when Scenario
  // 03's opening scene turned into a lock screen: a locked phone shows a
  // status row, and the whole point of AD-07 is that it gets that row from
  // the shell instead of drawing a second one. Every other screen still
  // resolves to false, so nothing else changed.
  for (const prop of [
    'dark={dark}',
    'statusTitle={statusTitle}',
    'systemChrome = false',
    'systemChrome={systemChrome}',
    'homeIndicator={false}',
    'className={frameClassName}',
  ]) {
    assert.ok(source.includes(prop), `PoliceFrame no longer passes ${prop}`);
  }
});

test('2e. the real Scenario 03 screen that mounts the shell renders unchanged', async () => {
  const { BankSite } = await import('../src/pages/scenario03/BankSite.jsx');
  // 好匯銀行 is a website opened from a LINE link now, so its sign-in page
  // renders inside this scenario's own browser chrome - still through the one
  // shared PhoneShell, which is what this suite is about.
  const bankLogin = screen(BankSite);
  assert.ok(bankLogin.startsWith("<div class=\"phone-shell phone-shell-dark\"><div class=\"phone-shell-body\"><div class=\"pol-web pol-web-dark\">"),
    'the site still mounts inside the shared shell, with no second device chrome of its own');
  assert.ok(bankLogin.includes('<span class="pol-web-domain">secure.haowei-bank.tw</span>'), 'the address bar names the site');
  assert.ok(bankLogin.includes('好匯銀行'), 'and the page is branded 好匯銀行');
  assert.ok(!bankLogin.includes('phone-shell-statusbar'), 'the bank site does not turn the shell OS chrome on');
});

test('2f. real Scenario 05 screens keep display-only chrome and a live primary CTA', async () => {
  const { TradeInfo } = await import('../src/pages/scenario05/TradeInfo.jsx');
  const { OrderGone } = await import('../src/pages/scenario05/OrderGone.jsx');
  assert.equal(screen(TradeInfo), "<div class=\"go-app go-ctx-hpefake\"><div class=\"wb-chrome\"><span class=\"wb-icon-btn wb-icon-display\" aria-hidden=\"true\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"21\" height=\"21\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-chevron-left\" aria-hidden=\"true\"><path d=\"m15 18-6-6 6-6\"></path></svg></span><span class=\"wb-omnibox\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"11\" height=\"11\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-lock\" aria-hidden=\"true\"><rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\"></rect><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"></path></svg><span class=\"wb-domain\">safe-deal.tw</span></span><span class=\"wb-icon-btn wb-icon-display\" aria-hidden=\"true\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"19\" height=\"19\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-ellipsis-vertical\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"1\"></circle><circle cx=\"12\" cy=\"5\" r=\"1\"></circle><circle cx=\"12\" cy=\"19\" r=\"1\"></circle></svg></span></div><div class=\"sq-masthead\"><div class=\"sq-brand\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"21\" height=\"21\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-shield-check sq-brand-icon\" aria-hidden=\"true\"><path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"></path><path d=\"m9 12 2 2 4-4\"></path></svg><span class=\"sq-wordmark\">SafeDeal</span></div><div class=\"sq-brand-tag\">安全交易・安心收付</div><div class=\"sq-section\">交易安全提醒</div></div><div class=\"go-scroll sq-page\"><div class=\"sq-card sq-safety-notice\"><div class=\"sq-card-title\">交易安全提醒</div><p>建立賣場與查看交易資訊，請以本站頁面顯示的內容為準。</p><p>客服聯絡方式請以官方網站「客服中心」所列資訊為準。</p><p>平台不會要求賣家透過非官方管道設定收款功能。</p></div><div class=\"go-spacer\"></div><button type=\"button\" class=\"sq-btn sq-btn-outline\">返回聊天</button></div></div>");
  assert.equal(screen(OrderGone), "<div class=\"go-app go-ctx-bank\"><div class=\"bk-processing\"><span class=\"bk-spinner\"></span><p>款項處理中</p></div></div>");
  // Reveal used to be pinned here too. It is now 詐騙疑點分析 and renders
  // through the shared Outcome System with no Scenario 05 chrome at all, so
  // its markup is pinned by scripts/outcome-ownership.test.mjs instead.
});

test('2g. the Scenario 05 dialogue engine is untouched by the move', async () => {
  const engine = await read('src/features/ghostorder/dialogueEngine.js');
  assert.doesNotMatch(engine, /components\//, 'the dialogue engine should not reference any UI directory');
  assert.match(await read('src/pages/scenario05/BuyerChat.jsx'), /from '\.\.\/\.\.\/features\/ghostorder\/dialogueEngine'/);
});

// --- 3. the guard actually guards -------------------------------------------

async function runValidator() {
  try {
    const { stdout, stderr } = await run('node', ['scripts/validate-shared-ui-ownership.mjs'], { cwd: WEBAPP });
    return { code: 0, output: `${stdout}${stderr}` };
  } catch (error) {
    return { code: error.code ?? 1, output: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
}

// Applies one regression to the tree, runs the real validator, then restores
// every file it touched - whatever the assertions do.
async function withRegression({ creates = {}, edits = {} }, assertions) {
  const originals = new Map();
  const created = [];
  try {
    for (const [path, contents] of Object.entries(creates)) {
      await mkdir(join(WEBAPP, path, '..'), { recursive: true });
      await writeFile(join(WEBAPP, path), contents, 'utf8');
      created.push(path);
    }
    for (const [path, rewrite] of Object.entries(edits)) {
      const before = await read(path);
      originals.set(path, before);
      await writeFile(join(WEBAPP, path), rewrite(before), 'utf8');
    }
    await assertions(await runValidator());
  } finally {
    for (const [path, before] of originals) await writeFile(join(WEBAPP, path), before, 'utf8');
    for (const path of created) await rm(join(WEBAPP, path), { force: true });
    await rm(join(WEBAPP, 'src/components/ghostorder'), { recursive: true, force: true });
  }
}

test('3a. the tree passes as committed', async () => {
  const { code, output } = await runValidator();
  assert.equal(code, 0, output);
});

test('3b. putting PhoneShell back under components/ui is rejected', async () => {
  await withRegression(
    { creates: { 'src/components/ui/PhoneShell.jsx': 'export function PhoneShell() { return null; }\n' } },
    ({ code, output }) => {
      assert.equal(code, 1, output);
      assert.match(output, /components\/ui\/PhoneShell\.jsx/);
    },
  );
});

test('3c. re-creating components/ghostorder is rejected', async () => {
  await withRegression(
    { creates: { 'src/components/ghostorder/BrowserChrome.jsx': 'export function BrowserChrome() { return null; }\n' } },
    ({ code, output }) => {
      assert.equal(code, 1, output);
      assert.match(output, /components\/ghostorder\/BrowserChrome\.jsx/);
    },
  );
});

test('3d. a consumer importing a vacated path is rejected', async () => {
  await withRegression(
    { edits: { 'src/pages/scenario05/OrderGone.jsx': (source) => source.replace("from './components/BrowserChrome'", "from '../../components/ghostorder/BrowserChrome'") } },
    ({ code, output }) => {
      assert.equal(code, 1, output);
      assert.match(output, /vacated/);
    },
  );
});

test('3e. a NEW single-Scenario component parked in the shared layer is rejected', async () => {
  // Nothing about the fixture's name says "scenario 05"; only its consumer
  // does. The rule is derived from who imports it, not from a name list.
  await withRegression(
    {
      creates: { 'src/components/ui/GenericPanel.jsx': 'export function GenericPanel() { return null; }\n' },
      edits: { 'src/pages/scenario05/Reveal.jsx': (source) => `import { GenericPanel } from '../../components/ui/GenericPanel';\n${source}` },
    },
    ({ code, output }) => {
      assert.equal(code, 1, output);
      assert.match(output, /GenericPanel/);
      assert.match(output, /AD-07/);
    },
  );
});

test('3f. the same component shared by two Scenarios is accepted', async () => {
  await withRegression(
    {
      creates: { 'src/components/ui/GenericPanel.jsx': 'export function GenericPanel() { return null; }\n' },
      edits: {
        'src/pages/scenario05/Reveal.jsx': (source) => `import { GenericPanel } from '../../components/ui/GenericPanel';\n${source}`,
        'src/pages/scenario01/Quiz.jsx': (source) => `import { GenericPanel } from '../../components/ui/GenericPanel';\n${source}`,
      },
    },
    ({ code, output }) => assert.equal(code, 0, output),
  );
});

test('3g. a second Scenario importing a re-homed component is rejected', async () => {
  await withRegression(
    { edits: { 'src/pages/scenario01/Quiz.jsx': (source) => `import { BrowserChrome } from '../scenario05/components/BrowserChrome';\n${source}` } },
    ({ code, output }) => {
      assert.equal(code, 1, output);
      assert.match(output, /pages\/scenario05\/components\/BrowserChrome\.jsx/);
    },
  );
});
