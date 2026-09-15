// LINE is a cross-scenario shared UI module, so its visual surface has one
// owner: apps/line/styles/line.css. validate-shared-ui-ownership.mjs enforces
// that; these tests drive the real validator with real files on disk, the same
// approach as scripts/coin-winner-style-boundary.test.mjs.
//
// The first three groups pin the three completeness gaps a review found in
// that validator, each of which let a real regression through silently:
//
//   P2-1  It only ever checked that a LINE class did not escape *outwards*.
//         Deleting `.line-header` from line.css while Line.jsx still rendered
//         `line-header` passed every rule.
//   P2-2  The class surface came from a regex over `className=...`, which
//         stopped at the first `}` of a template literal - so the three
//         modifiers that only exist inside a conditional interpolation
//         (`line-app-full`, `line-quick-replies-picked`,
//         `line-quick-pill-active`) were invisible to every rule.
//   P2-3  The selector scan expected a selector to follow `}`, `;` or the
//         start of the file, so the first rule inside `@media (...) {` was
//         dropped - a scenario could restyle LINE chrome by nesting it.
//
// The last group pins the exceptions that must keep passing, so a future
// tightening cannot "fix" them into failures.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

const run = promisify(execFile);
const WEBAPP = new URL('../', import.meta.url).pathname;
const read = (path) => readFile(join(WEBAPP, path), 'utf8');

const LINE_CSS = 'src/apps/line/styles/line.css';
const LINE_COMPONENT = 'src/apps/line/components/Line.jsx';
const GLOBAL_CSS = 'src/styles/global.css';
const SCENARIO01_CSS = 'src/styles/scenario01.css';
const SCENARIO03_CSS = 'src/styles/scenario03.css';
const PRIVATE_CHAT_CSS = 'src/pages/scenario02/PrivateChat.css';
const FIXTURE_CSS = 'src/styles/__line-ownership-fixture__.css';

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
async function withRegression({ edits = {}, creates = {} }, assertions) {
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

// Cuts every rule that dresses one class out of a stylesheet, so the class
// really does become unstyled - removing only `.line-header{...}` would leave
// `.line-app-full .line-header{...}` behind and the module would still be
// styling it. Matches `selector{declarations}` pairs with no nested braces, so
// @keyframes bodies (whose steps hold no class selectors) are left alone.
function withoutClass(name) {
  return (css) => {
    const token = new RegExp(`\\.${name}(?![\\w-])`);
    let removed = 0;
    const out = css.replace(/([^{}]+)\{([^{}]*)\}/g, (rule, selector) => (token.test(selector) ? (removed += 1, '') : rule));
    assert.ok(removed > 0, `expected .${name} to be declared before removing it`);
    return out;
  };
}

test('0. the tree passes as committed', async () => {
  const { code, output } = await runValidator();
  assert.equal(code, 0, output);
  assert.match(output, /Shared UI ownership OK/);
});

// --- P2-1: what the component renders, the module must style -----------------

test('1a. every class the shared LINE component renders is declared by the LINE stylesheet', async () => {
  // The positive form of the invariant, asserted directly rather than only
  // through a failure: no allowlist, no exceptions.
  const { code, output } = await runValidator();
  assert.equal(code, 0, output);
  assert.doesNotMatch(output, /must style what it renders/);
});

for (const selector of ['.line-header', '.line-msg', '.line-chat-scroll']) {
  test(`1b. deleting ${selector} from the LINE stylesheet fails, because Line.jsx still renders it`, async () => {
    await withRegression({ edits: { [LINE_CSS]: withoutClass(selector.slice(1)) } }, ({ code, output }) => {
      assert.equal(code, 1, `expected a failure, got:\n${output}`);
      assert.match(output, new RegExp(`renders \\${selector},[^\\n]*must style what it renders`));
    });
  });
}

// --- P2-2: conditional template-literal classNames ---------------------------
//
// These three are the ones the old regex could not see. Each is rendered only
// from inside a `${cond ? ' x' : ''}` interpolation, so if the extraction ever
// regresses to a first-`}` scan they stop being part of the LINE surface and
// both assertions below go quiet.

const INTERPOLATED_MODIFIERS = ['.line-app-full', '.line-quick-replies-picked', '.line-quick-pill-active'];

for (const selector of INTERPOLATED_MODIFIERS) {
  test(`2a. ${selector} counts as rendered even though it only exists inside a template interpolation`, async () => {
    await withRegression({ edits: { [LINE_CSS]: withoutClass(selector.slice(1)) } }, ({ code, output }) => {
      assert.equal(code, 1, `expected a failure, got:\n${output}`);
      assert.match(output, new RegExp(`renders \\${selector},[^\\n]*must style what it renders`));
    });
  });

  test(`2b. moving ${selector} out to a Scenario stylesheet fails`, async () => {
    await withRegression({
      edits: { [LINE_CSS]: withoutClass(selector.slice(1)) },
      creates: { [FIXTURE_CSS]: `${selector}{opacity:.5}\n` },
    }, ({ code, output }) => {
      assert.equal(code, 1, `expected a failure, got:\n${output}`);
      assert.match(output, new RegExp(`__line-ownership-fixture__\\.css[^\\n]*\\${selector}`));
      assert.match(output, new RegExp(`renders \\${selector},[^\\n]*must style what it renders`));
    });
  });
}

test('2c. the component surface is reported as unreadable if the extraction stops matching', async () => {
  // A blunt canary: if a future refactor breaks className extraction outright,
  // every rule above would pass vacuously. This makes that a failure instead.
  await withRegression({
    edits: { [LINE_COMPONENT]: (source) => source.replaceAll(/className=/g, 'data-classname=') },
  }, ({ code, output }) => {
    assert.equal(code, 1, `expected a failure, got:\n${output}`);
    assert.match(output, /classes were read out of the component/);
  });
});

// --- P2-3: nested at-rules ---------------------------------------------------

const NESTED_CASES = [
  ['@media', '@media (max-width: 500px){.line-header{color:red}}'],
  ['@supports', '@supports (display: grid){.line-header{display:grid}}'],
  ['@container', '@container (min-width: 200px){.line-header{gap:4px}}'],
  ['@media inside @supports', '@supports (display: grid){@media (max-width: 500px){.line-header{color:red}}}'],
  ['@media inside @media', '@media screen{@media (max-width: 500px){.line-header{color:red}}}'],
];

for (const [label, css] of NESTED_CASES) {
  test(`3a. a Scenario stylesheet restyling LINE chrome inside ${label} fails`, async () => {
    await withRegression({ creates: { [FIXTURE_CSS]: `${css}\n` } }, ({ code, output }) => {
      assert.equal(code, 1, `expected a failure, got:\n${output}`);
      assert.match(output, /__line-ownership-fixture__\.css[^\n]*\.line-header/);
      // The message carries the at-rule context, which is only possible if the
      // rule was found *inside* it rather than at the top level.
      assert.match(output, /__line-ownership-fixture__\.css: "@[^\n]*\{ \.line-header"/);
    });
  });
}

test('3b. a LINE-namespaced rule nested in an at-rule in global.css fails', async () => {
  await withRegression({
    edits: { [GLOBAL_CSS]: (css) => `${css}\n@media (max-width: 500px){.line-returning-tip{color:#fff}}\n` },
  }, ({ code, output }) => {
    assert.equal(code, 1, `expected a failure, got:\n${output}`);
    assert.match(output, /global\.css[^\n]*\.line-returning-tip[^\n]*not a LINE style owner/);
  });
});

test('3c. a rule following a nested at-rule is still found', async () => {
  // The old scan lost the *first* rule after `{`; this pins that the one after
  // the closing `}` of a nested block is not lost either.
  await withRegression({
    creates: { [FIXTURE_CSS]: '@media screen{.unrelated{color:red}}\n.line-msg{color:red}\n' },
  }, ({ code, output }) => {
    assert.equal(code, 1, `expected a failure, got:\n${output}`);
    assert.match(output, /__line-ownership-fixture__\.css[^\n]*\.line-msg/);
  });
});

// --- the rest of the LINE ownership rules ------------------------------------

test('4a. a second LINE stylesheet fails', async () => {
  await withRegression({
    creates: { 'src/pages/scenario01/scenario01-line.css': '.line-header{height:80px}\n' },
  }, ({ code, output }) => {
    assert.equal(code, 1, `expected a failure, got:\n${output}`);
    assert.match(output, /scenario01-line\.css: a second LINE stylesheet/);
  });
});

test('4b. the LINE module may not claim an unprefixed global selector', async () => {
  await withRegression({
    edits: { [LINE_CSS]: (css) => `${css}\n.chat-row{gap:2px}\n` },
  }, ({ code, output }) => {
    assert.equal(code, 1, `expected a failure, got:\n${output}`);
    assert.match(output, /unprefixed global selector/);
  });
});

test('4c. the LINE stylesheet may not borrow another module\'s keyframe or token', async () => {
  await withRegression({
    edits: { [LINE_CSS]: (css) => css.replace('animation:lineTypingDot', 'animation:typingDot') },
  }, ({ code, output }) => {
    assert.equal(code, 1, `expected a failure, got:\n${output}`);
    assert.match(output, /animation "typingDot" is not declared by the LINE module/);
  });
  await withRegression({
    edits: { [LINE_CSS]: (css) => css.replace('color:var(--line-text)', 'color:var(--meetu-text)') },
  }, ({ code, output }) => {
    assert.equal(code, 1, `expected a failure, got:\n${output}`);
    assert.match(output, /custom property "--meetu-text" is not declared by the LINE module/);
  });
});

test('4d. the LINE module owns its own stylesheet import', async () => {
  await withRegression({
    edits: { 'src/apps/line/index.js': (source) => source.replace("import './styles/line.css';\n", '') },
  }, ({ code, output }) => {
    assert.equal(code, 1, `expected a failure, got:\n${output}`);
    assert.match(output, /no longer imports the LINE stylesheet/);
  });
  await withRegression({
    edits: { 'src/pages/scenario01/VipGroup.jsx': (source) => `import '../../apps/line/styles/line.css';\n${source}` },
  }, ({ code, output }) => {
    assert.equal(code, 1, `expected a failure, got:\n${output}`);
    assert.match(output, /VipGroup\.jsx: imports the LINE stylesheet directly/);
  });
});

// --- the exceptions that must keep passing -----------------------------------

test('5a. .ar-stage.line-stage is the shell\'s stage variant, owned by the scenario that selects it', async () => {
  // It used to be global.css's one allowlisted `line-`named rule. Both of its
  // consumers are Scenario 01 screens, so the AD-06 ownership rule moved it
  // into that scenario's stylesheet and global.css now keeps no `line-` rule
  // at all - the check below is what makes that absolute rather than a
  // convention.
  const scenario01 = await read(SCENARIO01_CSS);
  assert.match(scenario01, /\.ar-stage\.line-stage\{/, 'the stage variant must be declared by the scenario that selects it');
  const global = await read(GLOBAL_CSS);
  assert.doesNotMatch(global, /line-stage/, 'global.css must no longer declare the stage variant');
  const component = await read(LINE_COMPONENT);
  assert.doesNotMatch(component, /line-stage/, 'apps/line must never render the stage class itself');
  const { code } = await runValidator();
  assert.equal(code, 0);
});

test('5a-ii. putting the stage variant back into global.css is rejected', async () => {
  // The former allowlist entry is gone, so this is a failure now rather than
  // the one permitted exception.
  await withRegression(
    { edits: { [GLOBAL_CSS]: (css) => `${css}\n.ar-stage.line-stage{padding:0}\n` } },
    ({ code, output }) => {
      assert.equal(code, 1, 'a line-namespaced rule in global.css must fail');
      assert.match(output, /global\.css is not a LINE style owner/);
    },
  );
});

test('5b. Scenario 02 keeps its legacy line-named story media in its own stylesheet', async () => {
  // These carry a `line-` prefix but the shared component never renders them:
  // they are PrivateChat's own photo/video message surfaces. They must stay
  // legal where they are, or the rules above would be pushing one scenario's
  // story assets into the shared module.
  const css = await read(PRIVATE_CHAT_CSS);
  for (const selector of ['.line-image-thumb', '.line-video-thumb', '.line-photo-img', '.line-returning-tip']) {
    assert.ok(css.includes(`${selector}{`), `${selector} belongs to PrivateChat.css`);
  }
  const component = await read(LINE_COMPONENT);
  for (const name of ['line-image', 'line-video', 'line-photo', 'line-returning']) {
    assert.doesNotMatch(component, new RegExp(name), `the shared LINE component must not render ${name}-*`);
  }
  const { code } = await runValidator();
  assert.equal(code, 0);
});

test('5c. Scenario 03 keeps its own pol-line-* story cards', async () => {
  const css = await read(SCENARIO03_CSS);
  for (const selector of ['.pol-line-card-slot', '.pol-line-custody', '.pol-line-heads-up']) {
    assert.ok(css.includes(selector), `${selector} belongs to scenario03.css`);
  }
  const { code } = await runValidator();
  assert.equal(code, 0);
});

test('5d. @keyframes lineVideoSpin may stay global - its two consumers are in two modules', async () => {
  const global = await read(GLOBAL_CSS);
  assert.match(global, /@keyframes lineVideoSpin\{/, 'the shared rotation keyframe stays in the global layer');
  assert.ok((await read(PRIVATE_CHAT_CSS)).includes('animation:lineVideoSpin'), 'scenario02 runs it');
  assert.ok((await read('src/apps/coin-winner/styles/index.css')).includes('animation:lineVideoSpin'), 'Coin Winner runs it');
  const { code } = await runValidator();
  assert.equal(code, 0);
});

test('5e. .line-avatar is usable outside a LINE conversation', async () => {
  // Scenario 03 renders LineAvatar on its own in LineAdd - the full-bleed
  // add-friend card, which is not a conversation - so the rule that scopes
  // the generic row classes under .line-app must not be extended to the
  // avatar. LineCustody used to be a second such case; it delegates to
  // LineConversation now, which is the preferred shape. What this test
  // guards is the standalone-avatar capability, not how many screens use it.
  const css = await read(LINE_CSS);
  assert.match(css, /^\.line-avatar\{/m, '.line-avatar must stay unscoped');
  assert.doesNotMatch(css, /\.line-app \.line-avatar\{/, '.line-avatar must not be scoped under .line-app');
  for (const page of ['src/pages/scenario03/LineAdd.jsx']) {
    assert.match(await read(page), /LineAvatar/, `${page} renders LineAvatar outside a LineConversation`);
  }
});
