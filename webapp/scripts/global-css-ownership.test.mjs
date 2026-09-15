// styles/global.css is the app's global foundation, and AD-06 is the debt of
// it having been everything else too. validate-shared-ui-ownership.mjs now
// enforces the foundation rule; these tests drive that real validator with
// real files on disk, the same approach as scripts/line-style-ownership.test.mjs
// and scripts/coin-winner-style-boundary.test.mjs.
//
// What the rule must get right, and what each group below pins:
//
//   1  A rule only one owner renders is rejected - derived from *who renders
//      the class*, never from what the class is called. The fixtures use names
//      with no scenario/app prefix at all, so a check that matched on names
//      could not pass them.
//   2  A rule two owners render is accepted, or the file could not keep the
//      primitives (.btn, .hero, .warning, .mini) that belong in it.
//   3  A rule nothing renders is rejected, so dead CSS cannot accumulate here
//      again.
//   4  A class built at runtime out of a prop counts as rendered. Without this
//      a runtime-composed family reads as dead and the rule would demand
//      deleting live CSS. (The Outcome System's own shell composes
//      `cibar-outcome-${tone}` this way.)
//   5  The class surface is read through `.trim()` and through local variables,
//      the two gaps the ownership audit found hiding live classes.
//   6  The committed tree's global.css really is only the foundation.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

const run = promisify(execFile);
const WEBAPP = new URL('../', import.meta.url).pathname;
const read = (path) => readFile(join(WEBAPP, path), 'utf8');

const GLOBAL_CSS = 'src/styles/global.css';
const SCENARIO01_CSS = 'src/styles/scenario01.css';
const FEED = 'src/pages/scenario01/Feed.jsx';
const STAFF_SCREEN = 'src/pages/staff/StaffSetupScreen.jsx';
const QUIZ_COMPONENT = 'src/components/ui/ScenarioFinalDecision.jsx';
const OUTCOME_COMPONENT = 'src/components/outcome/ScenarioOutcome.jsx';
const ENTRY_HERO = 'src/components/ui/ScenarioEntryHero.jsx';
// AD-07 moved the shell out of the shared layer and into its one consumer's
// scenario; the AD-06 shape it is checked for here (own sheet, self-imported)
// is unchanged, only the directory is.
const PHONE_SHELL_CSS = 'src/pages/scenario03/components/PhoneShell.css';
const OUTCOME_CSS = 'src/components/outcome/ScenarioOutcome.css';
const ANALYSIS_COMPONENT = 'src/components/outcome/FraudClueAnalysis.jsx';
const ANALYSIS_CSS = 'src/components/outcome/FraudClueAnalysis.css';
const QUIZ_CSS = 'src/components/ui/ScenarioFinalDecision.css';
const ENTRY_BRIEFING_CSS = 'src/components/ui/ScenarioEntryBriefing.css';
const ENTRY_SCREENS_CSS = 'src/pages/entryScreens.css';
const STAFF_CSS = 'src/pages/staff/staff.css';

async function runValidator() {
  try {
    const { stdout, stderr } = await run('node', ['scripts/validate-shared-ui-ownership.mjs'], { cwd: WEBAPP });
    return { code: 0, output: `${stdout}${stderr}` };
  } catch (error) {
    return { code: error.code ?? 1, output: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
}

// Applies one regression to the tree, runs the real validator, then puts every
// touched file back exactly as it was - whatever the assertions do.
//
//   edits    path -> (previous contents) => next contents
//   creates  path -> contents for a file that did not exist
async function withRegression(edits, assertions, creates = {}) {
  const originals = new Map();
  const created = [];
  try {
    for (const [path, rewrite] of Object.entries(edits)) {
      const before = await read(path);
      originals.set(path, before);
      await writeFile(join(WEBAPP, path), rewrite(before), 'utf8');
    }
    for (const [path, contents] of Object.entries(creates)) {
      await writeFile(join(WEBAPP, path), contents, 'utf8');
      created.push(path);
    }
    await assertions(await runValidator());
  } finally {
    for (const [path, before] of originals) await writeFile(join(WEBAPP, path), before, 'utf8');
    for (const path of created) await rm(join(WEBAPP, path), { force: true });
  }
}

// Puts a class on the first element a file already renders, so the fixture is
// a real consumer rather than a string that merely appears in the source.
function renderingAlso(name) {
  return (source) => {
    const at = source.indexOf('className="');
    assert.ok(at > -1, 'expected a plain className to extend');
    const insert = at + 'className="'.length;
    return `${source.slice(0, insert)}${name} ${source.slice(insert)}`;
  };
}

const declaring = (rule) => (css) => `${css}\n${rule}\n`;

test('0. the tree passes as committed', async () => {
  const { code, output } = await runValidator();
  assert.equal(code, 0, output);
  assert.match(output, /Shared UI ownership OK/);
});

// --- 1: one owner means one owner's stylesheet -------------------------------
//
// Every fixture class below is deliberately named like a generic app-wide
// utility. Nothing about the name says "scenario 01" or "staff"; only the
// consumer does.

test('1a. a rule only Scenario 01 renders is rejected from global.css', async () => {
  await withRegression(
    {
      [GLOBAL_CSS]: declaring('.surface-panel-tight{color:#fff}'),
      [FEED]: renderingAlso('surface-panel-tight'),
    },
    ({ code, output }) => {
      assert.equal(code, 1, 'a scenario-only rule in global.css must fail the build');
      assert.match(output, /`\.surface-panel-tight` is rendered only by Scenario 01/);
      assert.match(output, /styles\/scenario01\.css/, 'the message must name where it belongs');
    },
  );
});

test('1b. a rule only the staff screens render is rejected from global.css', async () => {
  await withRegression(
    {
      [GLOBAL_CSS]: declaring('.surface-panel-tight{color:#fff}'),
      [STAFF_SCREEN]: renderingAlso('surface-panel-tight'),
    },
    ({ code, output }) => {
      assert.equal(code, 1);
      assert.match(output, /rendered only by the staff screens/);
      assert.match(output, /pages\/staff\/staff\.css/);
    },
  );
});

test('1c. a rule only one shared component renders is rejected from global.css', async () => {
  // "Shared" is not the same as "global": a component every scenario uses
  // still owns its own styling, the way FraudWarningBanner.css already did.
  await withRegression(
    {
      [GLOBAL_CSS]: declaring('.surface-panel-tight{color:#fff}'),
      [QUIZ_COMPONENT]: renderingAlso('surface-panel-tight'),
    },
    ({ code, output }) => {
      assert.equal(code, 1);
      assert.match(output, /rendered only by the shared ScenarioFinalDecision component/);
      assert.match(output, /components\/ui\/ScenarioFinalDecision\.css/);
    },
  );
});

test('1d. the rule reads nesting, so hiding the same thing in an @media fails too', async () => {
  await withRegression(
    {
      [GLOBAL_CSS]: declaring('@media (max-width:500px){.surface-panel-tight{color:#fff}}'),
      [FEED]: renderingAlso('surface-panel-tight'),
    },
    ({ code, output }) => {
      assert.equal(code, 1);
      assert.match(output, /@media \(max-width:500px\) \{ \.surface-panel-tight/);
    },
  );
});

// --- 2: genuinely shared rules must keep passing -----------------------------

test('2a. the same rule is accepted once a second owner renders it', async () => {
  await withRegression(
    {
      [GLOBAL_CSS]: declaring('.surface-panel-tight{color:#fff}'),
      [FEED]: renderingAlso('surface-panel-tight'),
      [STAFF_SCREEN]: renderingAlso('surface-panel-tight'),
    },
    ({ code, output }) => assert.equal(code, 0, output),
  );
});

test('2b. a rule the shared layer itself renders is accepted', async () => {
  // shell/, lib/ and the un-owned components ARE the shared layer: a class
  // only they render has no home narrower than global.css. This is what keeps
  // .ar-stage, .app, .topbar and .card there.
  await withRegression(
    {
      [GLOBAL_CSS]: declaring('.surface-panel-tight{color:#fff}'),
      'src/shell/TopBar.jsx': renderingAlso('surface-panel-tight'),
    },
    ({ code, output }) => assert.equal(code, 0, output),
  );
});

test('2c. a variant compounded onto a shared primitive stays with the primitive', async () => {
  // `.btn.danger` has one caller today (the staff screens) but styles `.btn`,
  // which several modules render. Splitting the variant out of the primitive
  // would be worse architecture, not better, so the rule must not demand it.
  const global = await read(GLOBAL_CSS);
  assert.match(global, /\.btn\.danger\{/, 'the fixture assumes .btn.danger is still a global variant');
  const { code, output } = await runValidator();
  assert.equal(code, 0, output);
});

// --- 3: no dead CSS may accumulate in global.css again ------------------------

test('3a. a rule nothing renders is rejected from global.css', async () => {
  await withRegression(
    { [GLOBAL_CSS]: declaring('.surface-panel-tight{color:#fff}') },
    ({ code, output }) => {
      assert.equal(code, 1, 'an unrendered rule in global.css must fail the build');
      assert.match(output, /which nothing in the tree renders/);
    },
  );
});

// --- 4: runtime-built class names count as rendered ---------------------------

test('4a. a class built from a prop is owned, never reported dead', async () => {
  // ScenarioOutcome emits `cibar-outcome-${tone}`, so searching the tree for
  // `cibar-outcome-failure` finds nothing. If the rule could not see that, it
  // would order live CSS deleted.
  await withRegression(
    { [GLOBAL_CSS]: declaring('.cibar-outcome-fixture{color:#fff}') },
    ({ code, output }) => {
      assert.equal(code, 1);
      assert.doesNotMatch(output, /\.cibar-outcome-fixture[^\n]*nothing in the tree renders/);
      assert.match(output, /`\.cibar-outcome-fixture` is rendered only by the shared Outcome System/);
    },
  );
});

test('4b. the pattern is bounded - it does not swallow unrelated names', async () => {
  // `cibar-outcome-<unknown>` must not make every class look rendered.
  await withRegression(
    { [GLOBAL_CSS]: declaring('.totally-unrelated-fixture{color:#fff}') },
    ({ code, output }) => {
      assert.equal(code, 1);
      assert.match(output, /`\.totally-unrelated-fixture`[^\n]*nothing in the tree renders/);
    },
  );
});

// --- 5: the class surface must be read through the two audit gaps -------------

test('5a. a class only reachable through .trim() counts as rendered', async () => {
  // ScenarioEntryHero renders `` `scenario-entry-hero ${className}`.trim() ``.
  // Before the extractor read through the call, that whole template collapsed
  // to "unknown" and the class looked dead.
  const hero = await read(ENTRY_HERO);
  assert.match(hero, /`scenario-entry-hero \$\{className\}`\.trim\(\)/, 'the fixture assumes the .trim() form is still there');
  await withRegression(
    { [GLOBAL_CSS]: declaring('.scenario-entry-hero{color:#fff}') },
    ({ code, output }) => {
      assert.equal(code, 1);
      assert.doesNotMatch(output, /nothing in the tree renders/);
      assert.match(output, /rendered only by the shared scenario entry screen/);
    },
  );
});

test('5b. a class only reachable through a local variable counts as rendered', async () => {
  // ScenarioFinalDecision builds its option class as
  // `let cls = 'btn secondary quiz-option'; cls += ' correct';` - the tokens
  // never appear in a className position at all.
  const quiz = await read(QUIZ_COMPONENT);
  assert.match(quiz, /let cls = 'btn secondary quiz-option'/, 'the fixture assumes the accumulator is still there');
  await withRegression(
    { [GLOBAL_CSS]: declaring('.quiz-option{color:#fff}') },
    ({ code, output }) => {
      assert.equal(code, 1);
      assert.doesNotMatch(output, /nothing in the tree renders/);
      assert.match(output, /rendered only by the shared ScenarioFinalDecision component/);
    },
  );
});

// --- 6: the committed global.css is the foundation and nothing else ----------

test('6a. global.css declares no scenario-, app- or staff-namespaced rule', async () => {
  const css = (await read(GLOBAL_CSS)).replace(/\/\*[\s\S]*?\*\//g, '');
  for (const prefix of ['fb-', 'video-fullscreen', 'gugo-embed', 'feed-', 'dating-', 'match-',
    'safety-alert', 'meetu-warning', 'risk-', 'link-card', 'staff-', 'scenario-selection',
    'scenario-button', 'ar-scan-', 'phone-shell', 'cibar-outcome', 'cibar-analysis', 'antifraud-quiz',
    'quiz-', 'scenario-entry', 'bition-', 'line-', 'platform-nav', 'step-status', 'consent-']) {
    assert.doesNotMatch(css, new RegExp(`\\.${prefix}`), `global.css still declares a .${prefix}* rule`);
  }
});

test('6b. every rule global.css keeps has a stated reason in its header', async () => {
  const header = (await read(GLOBAL_CSS)).slice(0, 2000);
  for (const item of ['.ar-stage', '.app', '.topbar', '.hero', '.btn', '.warning', '.mini',
    'chartSweep', 'bitionBlink', 'lineVideoSpin', '--phone-shell-home-indicator-height']) {
    assert.ok(header.includes(item), `global.css's header does not account for ${item}`);
  }
});

test('6c. each moved stylesheet exists and is imported by the module that renders it', async () => {
  const cases = [
    [PHONE_SHELL_CSS, 'src/pages/scenario03/components/PhoneShell.jsx', "import './PhoneShell.css'"],
    [OUTCOME_CSS, OUTCOME_COMPONENT, "import './ScenarioOutcome.css'"],
    [ANALYSIS_CSS, ANALYSIS_COMPONENT, "import './FraudClueAnalysis.css'"],
    [QUIZ_CSS, QUIZ_COMPONENT, "import './ScenarioFinalDecision.css'"],
    [ENTRY_BRIEFING_CSS, 'src/components/ui/ScenarioEntryBriefing.jsx', "import './ScenarioEntryBriefing.css'"],
    [ENTRY_SCREENS_CSS, 'src/pages/ScenarioMenu.jsx', "import './entryScreens.css'"],
    [ENTRY_SCREENS_CSS, 'src/pages/LanguageSelect.jsx', "import './entryScreens.css'"],
    [ENTRY_SCREENS_CSS, 'src/pages/arScan/ArScanHome.jsx', "import '../entryScreens.css'"],
    [STAFF_CSS, STAFF_SCREEN, "import './staff.css'"],
    [STAFF_CSS, 'src/pages/staff/StaffHandoffConfirm.jsx', "import './staff.css'"],
    [STAFF_CSS, 'src/pages/staff/StaffLocationSummary.jsx', "import './staff.css'"],
  ];
  for (const [stylesheet, importer, statement] of cases) {
    assert.ok((await read(stylesheet)).length > 0, `${stylesheet} is missing`);
    assert.ok((await read(importer)).includes(statement), `${importer} does not import its own stylesheet`);
  }
  // The two scenario sheets keep the repo's existing entry-point convention.
  const main = await read('src/main.jsx');
  assert.ok(main.includes("import './styles/scenario01.css'"), 'main.jsx does not load the Scenario 01 stylesheet');
  const globalAt = main.indexOf("import './styles/global.css'");
  const scenario01At = main.indexOf("import './styles/scenario01.css'");
  assert.ok(globalAt > -1 && scenario01At > globalAt,
    'the Scenario 01 stylesheet must load after global.css, or its stage rules stop overriding .app');
});

test('6d. no rule was duplicated on the way out - each moved class has one home', async () => {
  const sheets = [GLOBAL_CSS, SCENARIO01_CSS, 'src/styles/scenario02.css', 'src/pages/scenario02/PrivateChat.css',
    PHONE_SHELL_CSS, OUTCOME_CSS, ANALYSIS_CSS, QUIZ_CSS, ENTRY_BRIEFING_CSS, ENTRY_SCREENS_CSS, STAFF_CSS];
  const declaredBy = new Map();
  for (const sheet of sheets) {
    const css = (await read(sheet)).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const [, name] of css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
      if (!declaredBy.has(name)) declaredBy.set(name, new Set());
      declaredBy.get(name).add(sheet);
    }
  }
  // Global primitives that moved rules legitimately qualify
  // (`.staff-btn-row .btn`, `.scenario-entry-page>.topbar`), plus the bare
  // modifiers that only ever appear compounded onto a base class
  // (`.btn.secondary` here, `.line-video-error-btn.secondary` there). Those
  // are expected in more than one file; nothing else may be.
  const shared = new Set(['btn', 'btns', 'topbar', 'hero', 'card', 'ar-stage', 'is-emphasis', 'secondary', 'danger']);
  for (const [name, files] of declaredBy) {
    if (shared.has(name) || files.size < 2) continue;
    assert.fail(`.${name} is declared in ${[...files].join(' and ')} - a moved rule was copied, not moved`);
  }
});

// --- 7: `.map()` is a transformation, not a passthrough ----------------------
//
// The extractor used to wave `.map()` through as if it returned its own
// elements. For `states.map(s => `probe-state-${s}`)` that produced exactly the
// wrong answer twice over: the classes the callback builds were missing, and
// the raw element strings (`success`, `danger`) were attributed to the file as
// classes it renders. Either half is enough to move a rule to the wrong owner
// or to declare a live rule dead - and this branch deletes dead rules.
//
// Every fixture below drives the real validator through a real file on disk.

const MAP_FIXTURE = 'src/pages/scenario01/__MapProbe__.jsx';

// A Scenario 01 component whose only job is to render `expression`. Scenario 01
// is an owner, so a class it alone renders must be reported as belonging to
// styles/scenario01.css - which is how these tests tell "the class was read"
// apart from "the class was not read".
const probeRendering = (body) => `export function MapProbe({ items, makeClass }) {
  void items; void makeClass;
${body}
}
`;

test('7a. a class built by a map callback is read, and the raw elements are not', async () => {
  await withRegression(
    {
      // `.probe-state-*` are what the callback actually builds; `.success` is
      // one of the array's own elements, which nothing renders.
      [GLOBAL_CSS]: declaring('.probe-state-success{color:#fff}\n.probe-state-danger{color:#fff}\n.success{color:#fff}'),
    },
    ({ code, output }) => {
      assert.equal(code, 1);
      for (const built of ['probe-state-success', 'probe-state-danger']) {
        assert.match(output, new RegExp(`\`\\.${built}\` is rendered only by Scenario 01`),
          `.${built} must be read out of the map callback`);
        assert.doesNotMatch(output, new RegExp(`\`\\.${built}\`[^\\n]*nothing in the tree renders`),
          `.${built} must not be reported dead`);
      }
      assert.match(output, /`\.success`[^\n]*nothing in the tree renders/,
        'the array element `success` is not a class anyone renders and must not be attributed');
    },
    {
      [MAP_FIXTURE]: probeRendering(`  const states = ['success', 'danger'];
  const cls = states
    .map(s => \`probe-state-\${s}\`)
    .join(' ');
  return <div className={cls} />;`),
    },
  );
});

test('7b. the array may be an inline literal', async () => {
  await withRegression(
    { [GLOBAL_CSS]: declaring('.probe-prefix-a{color:#fff}\n.probe-prefix-b{color:#fff}') },
    ({ code, output }) => {
      assert.equal(code, 1);
      for (const built of ['probe-prefix-a', 'probe-prefix-b']) {
        assert.match(output, new RegExp(`\`\\.${built}\` is rendered only by Scenario 01`));
      }
    },
    {
      [MAP_FIXTURE]: probeRendering(`  return <div className={['a', 'b'].map(x => \`probe-prefix-\${x}\`).join(' ')} />;`),
    },
  );
});

test('7c. a callback that branches on an unreadable value still yields both classes', async () => {
  // `x.active` cannot be read, but the ternary's two results can - and they are
  // the only two class names this can ever produce.
  await withRegression(
    { [GLOBAL_CSS]: declaring('.probe-active{color:#fff}\n.probe-inactive{color:#fff}') },
    ({ code, output }) => {
      assert.equal(code, 1);
      for (const built of ['probe-active', 'probe-inactive']) {
        assert.match(output, new RegExp(`\`\\.${built}\` is rendered only by Scenario 01`));
      }
    },
    {
      [MAP_FIXTURE]: probeRendering(`  return <div className={items.map(x => x.active ? 'probe-active' : 'probe-inactive').join(' ')} />;`),
    },
  );
});

test('7d. an unreadable callback yields nothing rather than a guess', async () => {
  await withRegression(
    { [GLOBAL_CSS]: declaring('.probe-unreadable{color:#fff}') },
    ({ code, output }) => {
      assert.equal(code, 1);
      // The conservative path: the validator reports it as unrendered, which a
      // human then has to look at. What it must never do is invent a consumer.
      assert.match(output, /`\.probe-unreadable`[^\n]*nothing in the tree renders/);
      assert.doesNotMatch(output, /`\.probe-unreadable` is rendered only by/);
    },
    {
      [MAP_FIXTURE]: probeRendering(`  return <div className={items.map(x => makeClass(x)).join(' ')} />;`),
    },
  );
});

test('7e. join only passes through for a whitespace separator', async () => {
  // `['alpha','beta'].join('-')` is the single class `alpha-beta`; reading it
  // as two classes would attribute `.alpha` and `.beta` to a file that renders
  // neither.
  for (const [label, expression] of [
    ['join("-")', `['alpha', 'beta'].join('-')`],
    ['join() (defaults to a comma)', `['alpha', 'beta'].join()`],
    ['array toString()', `['alpha', 'beta'].toString()`],
  ]) {
    await withRegression(
      { [GLOBAL_CSS]: declaring('.alpha{color:#fff}\n.beta{color:#fff}') },
      ({ code, output }) => {
        assert.equal(code, 1, label);
        for (const name of ['alpha', 'beta']) {
          assert.match(output, new RegExp(`\`\\.${name}\`[^\\n]*nothing in the tree renders`),
            `${label} must not attribute .${name}`);
        }
      },
      { [MAP_FIXTURE]: probeRendering(`  return <div className={${expression}} />;`) },
    );
  }
});

test('7f. string and array shapes each resolve the way that method actually behaves', async () => {
  // The first and third already worked and must keep working - a fix for `map`
  // that broke them would trade one wrong answer for another. The second did
  // NOT: array concat was being cross-multiplied like string concat, so
  // `['probe-btn'].concat(['probe-extra'])` yielded the single fabricated name
  // `probe-btnprobe-extra` and neither real class.
  for (const [label, expression] of [
    ['filter(Boolean).join(" ") (Button.jsx)', `['probe-btn', variantName, extra].filter(Boolean).join(' ')`],
    ['array concat unions', `['probe-btn'].concat(['probe-extra']).join(' ')`],
    ['string concat multiplies', `'probe-'.concat('btn')`],
  ]) {
    await withRegression(
      { [GLOBAL_CSS]: declaring('.probe-btn{color:#fff}') },
      ({ code, output }) => {
        assert.equal(code, 1, label);
        assert.match(output, /`\.probe-btn` is rendered only by Scenario 01/, label);
      },
      {
        [MAP_FIXTURE]: `export function MapProbe({ variantName, extra }) {
  void variantName; void extra;
  return <div className={${expression}} />;
}
`,
      },
    );
  }
});

test('7g. the real Button.jsx expression is still what attributes .btn', async () => {
  // Not a fixture: the committed file. If this shape ever stops being read,
  // `.btn` loses its consumer and global.css looks like it is holding a dead
  // rule - so the assertion is pinned to the source, not just to the outcome.
  const button = await read('src/components/ui/Button.jsx');
  assert.match(button, /\['btn', variant, className\]\s*\.filter\(Boolean\)\s*\.join\(' '\)/,
    'Button.jsx no longer builds its class list the way this rule is tuned for');
  const { code, output } = await runValidator();
  assert.equal(code, 0, output);
});
