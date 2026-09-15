// Coin Winner owns the 幣勝客 platform's screens; it now also owns their CSS.
//
// The 127 `bition-*` rules used to sit in webapp/src/styles/global.css, so the
// App module rendered UI it did not style and global.css carried a whole App's
// design system. They moved to apps/coin-winner/styles/index.css, imported by
// the module itself; Scenario 02's own story chrome (the forced red warning
// and the closing risk disclosure) moved to styles/scenario02.css instead,
// because it dresses the scenario's interventions rather than the platform.
//
// These tests pin that split. The interesting half is the last group: the
// rule in validate-shared-ui-ownership.mjs is derived from who *uses* a class,
// not from its name, so a Coin Winner-only rule put back into global.css fails
// the build whatever it is called - while a class two modules share is left
// alone. Fixtures drive the real validator with real files on disk, the same
// approach as scripts/coin-winner-store-boundary.test.mjs.
import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

const run = promisify(execFile);
const WEBAPP = new URL('../', import.meta.url).pathname;
const read = (path) => readFile(join(WEBAPP, path), 'utf8');

const APP_STYLESHEET = 'src/apps/coin-winner/styles/index.css';
const SCENARIO_STYLESHEET = 'src/styles/scenario02.css';
const GLOBAL_STYLESHEET = 'src/styles/global.css';

async function runValidator() {
  try {
    const { stdout, stderr } = await run('node', ['scripts/validate-shared-ui-ownership.mjs'], { cwd: WEBAPP });
    return { code: 0, output: `${stdout}${stderr}` };
  } catch (error) {
    return { code: error.code ?? 1, output: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
}

// A probe class, its stylesheet and the components that wear it, written into
// the tree and removed again whatever the assertions do. `css` goes to a
// stylesheet outside the App module; every entry of `consumers` is a component
// path relative to src/.
async function withStyleFixture({ css, consumers }, assertions) {
  const written = [];
  try {
    if (css) {
      const path = join(WEBAPP, 'src/styles/__style-fixture__.css');
      await writeFile(path, css, 'utf8');
      written.push(path);
    }
    for (const [relative, className] of Object.entries(consumers)) {
      const path = join(WEBAPP, 'src', relative);
      await mkdir(path.slice(0, path.lastIndexOf('/')), { recursive: true });
      await writeFile(path, `export function Probe() {\n  return <div className="${className}" />;\n}\n`, 'utf8');
      written.push(path);
    }
    await assertions(await runValidator());
  } finally {
    await rm(join(WEBAPP, 'src/apps/coin-winner/__style-fixture__'), { recursive: true, force: true });
    await rm(join(WEBAPP, 'src/pages/scenario02/__style-fixture__'), { recursive: true, force: true });
    for (const path of written) await rm(path, { force: true });
  }
}

// --- 1. the App module owns its stylesheet and its import --------------------

test('1a. the App module has a stylesheet of its own and imports it itself', async () => {
  const stylesheet = await read(APP_STYLESHEET);
  assert.ok(stylesheet.length > 0, `${APP_STYLESHEET} must exist and carry the App's rules`);
  const entry = await read('src/apps/coin-winner/index.js');
  assert.match(entry, /import '\.\/styles\/index\.css';/, 'apps/coin-winner/index.js must import its own stylesheet');
});

test('1b. nothing outside the App module imports the App stylesheet', async () => {
  const { stdout } = await run('git', ['grep', '-l', 'coin-winner/styles', '--', 'webapp/src'], { cwd: join(WEBAPP, '..') })
    .catch((error) => ({ stdout: error.stdout ?? '' }));
  const importers = stdout.split('\n').filter(Boolean).filter((path) => !path.endsWith('.css'));
  assert.deepEqual(importers, [], 'the Coin Winner stylesheet is the App module\'s to import, not a page\'s');
});

// --- 2. the rules actually moved, and moved once -----------------------------

test('2a. global.css no longer defines a single Coin Winner class rule', async () => {
  const global = (await read(GLOBAL_STYLESHEET)).replaceAll(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(global, /\.bition-/, 'global.css must not style the Coin Winner platform');
  // The one `bition` identifier left is a keyframe GuGo Invest also runs, so
  // it is shared rather than Coin Winner-only - see .profit-live-dot.
  assert.match(global, /@keyframes bitionBlink/, 'the keyframe GuGo Invest shares must stay in the shared layer');
});

test('2b. the platform shell, its screens and its animations live in the App module', async () => {
  const stylesheet = await read(APP_STYLESHEET);
  const expected = [
    '.ar-stage.bition-stage', '.bition-app', '.bition-home-header', '.bition-card', '.bition-btn-primary',
    '.bition-asset-card', '.bition-strategy-grid', '.bition-display-field', '.bition-landing-orbit',
    '.bition-withdraw-failed', '.bition-ticker', '.bition-bottom-nav', '.candlestick-chart',
    '@keyframes bitionOrbitSpin', '@keyframes bitionParticleFloat', '@keyframes bitionPulse',
    '@keyframes bitionBreathe', '@keyframes bitionTickerScroll', '@keyframes bitionFadeIn', '@keyframes drawTrend',
  ];
  for (const selector of expected) assert.ok(stylesheet.includes(selector), `${selector} belongs to the App module`);
});

test('2c. Scenario 02 keeps the story chrome it stamps over the platform', async () => {
  const stylesheet = await read(SCENARIO_STYLESHEET);
  for (const selector of ['.bition-warning', '.bition-warn-btn']) {
    assert.ok(stylesheet.includes(selector), `${selector} dresses a Scenario 02 intervention, not the platform`);
  }
  // The closing risk disclosure used to be listed here too
  // (.bition-disclosure-hero / .bition-165-fixed-bar). It is 詐騙疑點分析 now
  // and renders through the shared Outcome System outside the platform shell
  // entirely, so Scenario 02 styles neither it nor its 165 bar any more.
  for (const gone of ['.bition-disclosure-', '.bition-165-fixed-bar', '.risk-disclosure-list']) {
    assert.ok(!stylesheet.includes(gone), `${gone} dresses a screen Scenario 02 no longer renders`);
  }
  // The 165 overlay is mounted inside the red warning, so `.bition-warning p`
  // and `.hotline165-card p` land on the same element at the same specificity.
  // They have to stay in one file, in this order, or the overlay's body copy
  // silently takes the warning's colour.
  const warning = stylesheet.indexOf('.bition-warning p');
  const overlay = stylesheet.indexOf('.hotline165-card p');
  assert.ok(overlay > warning && warning !== -1, 'the 165 overlay must stay after the red warning that mounts it');
  const global = await read(GLOBAL_STYLESHEET);
  assert.ok(!global.includes('.hotline165-'), 'global.css must not hold half of that pair');
});

test('2d. every moved rule has exactly one home - no rule was copied', async () => {
  const files = await Promise.all([APP_STYLESHEET, SCENARIO_STYLESHEET, GLOBAL_STYLESHEET].map(read));
  const selectors = files.map((source) => new Set(
    [...source.replaceAll(/\/\*[\s\S]*?\*\//g, '').matchAll(/(^|\})\s*([^{}]*\.bition-[^{}]*)\{/g)]
      .map(([, , selector]) => selector.trim()),
  ));
  for (const selector of selectors[0]) assert.ok(!selectors[1].has(selector), `${selector} is defined twice`);
  for (const selector of selectors[1]) assert.ok(!selectors[2].has(selector), `${selector} is defined twice`);
  assert.ok(selectors[0].size >= 100, `the App module should hold the bulk of the platform rules (has ${selectors[0].size})`);
  assert.equal(selectors[2].size, 0, 'global.css must hold none of them');
});

// --- 3. the rule that stops it coming back -----------------------------------

test('3a. a Coin Winner-only rule put back into a shared stylesheet fails the build', async () => {
  // Deliberately not `bition-` prefixed: ownership is derived from the class's
  // consumers, so a rule that nobody would spot by name is caught all the same.
  await withStyleFixture(
    {
      css: '.quiet-platform-widget{color:#fff}\n',
      consumers: { 'apps/coin-winner/__style-fixture__/Probe.jsx': 'quiet-platform-widget' },
    },
    ({ code, output }) => {
      assert.equal(code, 1, `a Coin Winner-only rule outside the module must be rejected:\n${output}`);
      assert.match(output, /__style-fixture__\.css: .*\.quiet-platform-widget, used only by apps\/coin-winner\//);
    },
  );
});

test('3b. a class two modules share is left where it is', async () => {
  await withStyleFixture(
    {
      css: '.genuinely-shared-widget{color:#fff}\n',
      consumers: {
        'apps/coin-winner/__style-fixture__/Probe.jsx': 'genuinely-shared-widget',
        'pages/scenario02/__style-fixture__/Probe.jsx': 'genuinely-shared-widget',
      },
    },
    ({ output }) => {
      const mine = output.split('\n').filter((line) => line.includes('__style-fixture__.css'));
      assert.deepEqual(mine, [], `a shared class must not be forced into one module:\n${output}`);
    },
  );
});

test('3c. a page importing the App stylesheet fails the build', async () => {
  const path = join(WEBAPP, 'src/pages/scenario02/__style-fixture__/Importer.jsx');
  try {
    await mkdir(path.slice(0, path.lastIndexOf('/')), { recursive: true });
    await writeFile(path, "import '../../../apps/coin-winner/styles/index.css';\n\nexport const probe = 1;\n", 'utf8');
    const { code, output } = await runValidator();
    assert.equal(code, 1, `a page may not import the App module's stylesheet:\n${output}`);
    assert.match(output, /__style-fixture__\/Importer\.jsx: imports apps\/coin-winner\/styles\/index\.css/);
  } finally {
    await rm(join(WEBAPP, 'src/pages/scenario02/__style-fixture__'), { recursive: true, force: true });
  }
});

test('3d. the ownership list may only ever grow', async () => {
  const validator = await read('scripts/validate-shared-ui-ownership.mjs');
  assert.match(validator, /const STYLE_OWNING_APPS = \[[^\]]*'apps\/coin-winner\/'/, 'Coin Winner must stay on the list');
});
