// The Ending System fence only closes over what its resolver can find.
//
// scripts/validate-outcome-ownership.mjs walks the import graph out of the
// three shared Ending components and forbids a stage class anywhere inside it
// (rule L). That walk is only as complete as resolveImport(): an extensionless
// specifier it cannot resolve is not reported, it is simply not an edge, and
// everything behind it drops out of the closure. The fence then passes by not
// looking.
//
// collect() has read TypeScript for a while - `[jt]sx?` - but the resolver's
// candidate list stopped at .js/.jsx, so `import './helper'` next to a
// helper.ts resolved to nothing. A forbidden dependency one .ts hop away from
// a shared component was a silent PASS.
//
// Everything below drives the real validator through fixture files rather than
// a copy of its regex, so the two cannot drift apart. Each case is the same
// shape: give ScenarioOutcome.jsx one extensionless import, put the module it
// names on disk under a spelling the resolver has to handle, and check the
// violation actually comes out naming that module.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

const run = promisify(execFile);
const WEBAPP = new URL('../', import.meta.url).pathname;

// The shared component the closure starts from. Rule L walks out of this file,
// so an import added here is the shortest way to hand the resolver a specifier.
const ENTRY = 'src/components/outcome/ScenarioOutcome.jsx';

// Outside components/outcome/ on purpose: the fixture is a module the Ending
// System reaches, not a part of the Outcome System, so none of the other rules
// (which are scoped to that directory, to pages/, or to .css) have an opinion
// about it and a PASS case stays a clean PASS.
const FIXTURE_DIR = 'src/lib/__outcome-resolver-fixture__';
const FIXTURE_IMPORT = '../../lib/__outcome-resolver-fixture__';

async function runValidator() {
  try {
    const { stdout } = await run('node', ['scripts/validate-outcome-ownership.mjs'], { cwd: WEBAPP });
    return { code: 0, output: stdout };
  } catch (error) {
    return { code: error.code ?? 1, output: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
}

// One extensionless import into ScenarioOutcome.jsx plus a set of fixture
// modules, run against the real validator, and every edit undone afterwards
// whatever the assertions do.
async function withFixture(specifier, files, assertions) {
  const entry = join(WEBAPP, ENTRY);
  const before = await readFile(entry, 'utf8');
  try {
    await writeFile(entry, `import '${FIXTURE_IMPORT}/${specifier}';\n${before}`, 'utf8');
    for (const [name, body] of Object.entries(files)) {
      const path = join(WEBAPP, FIXTURE_DIR, name);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, body, 'utf8');
    }
    await assertions(await runValidator());
  } finally {
    await writeFile(entry, before, 'utf8');
    await rm(join(WEBAPP, FIXTURE_DIR), { recursive: true, force: true });
  }
}

// A module that reaches for the stage class - the thing rule L exists to stop.
const offender = (identifier) => `export const stage = ${
  identifier === 'ar-stage' ? "'ar-stage'" : identifier
};\n`;

// The same module with nothing forbidden in it, for the PASS controls.
const innocent = 'export const value = 1;\n';

test('the committed tree passes, so every failure below is the fixture\'s', async () => {
  const { code, output } = await runValidator();
  assert.equal(code, 0, output);
});

// --- the four spellings the resolver used to miss ----------------------------

const TS_SPELLINGS = [
  ['helper', { 'helper.ts': offender('useStageClassName') }, 'helper.ts'],
  ['helper', { 'helper.tsx': offender('StageClassProvider') }, 'helper.tsx'],
  ['folder', { 'folder/index.ts': offender('StageClassContext') }, 'folder/index.ts'],
  ['folder', { 'folder/index.tsx': offender('ar-stage') }, 'folder/index.tsx'],
];

test('an extensionless import of a TypeScript module is inside the fence', async (t) => {
  for (const [specifier, files, resolved] of TS_SPELLINGS) {
    await t.test(`./${specifier} -> ${resolved}`, async () => {
      await withFixture(specifier, files, ({ code, output }) => {
        assert.equal(code, 1, `a forbidden dependency behind ./${specifier} must fail the build`);
        assert.ok(
          output.includes(`${FIXTURE_DIR.replace('src/', '')}/${resolved}:`),
          `the violation must name ${resolved}, got:\n${output}`,
        );
      });
    });
  }
});

// The case from the report: the module the extensionless import names is
// itself clean, and what it goes on to import is not. Nothing is caught unless
// the first hop resolves, so this is what "transitive closure" actually costs
// when the resolver comes up short.
test('the closure keeps walking through a TypeScript hop', async () => {
  await withFixture('helper', {
    'helper.ts': "import './deep';\nexport const value = 1;\n",
    'deep.tsx': offender('useStageClassName'),
  }, ({ code, output }) => {
    assert.equal(code, 1, 'a stage class two TypeScript hops out must still fail the build');
    assert.ok(output.includes('__outcome-resolver-fixture__/deep.tsx:'), output);
  });
});

// --- and the spellings that already worked still do --------------------------

const JS_SPELLINGS = [
  ['helper', { 'helper.js': offender('useStageClassName') }, 'helper.js'],
  ['helper', { 'helper.jsx': offender('StageClassProvider') }, 'helper.jsx'],
  ['folder', { 'folder/index.js': offender('StageClassContext') }, 'folder/index.js'],
  ['folder', { 'folder/index.jsx': offender('ar-stage') }, 'folder/index.jsx'],
];

test('extensionless JavaScript resolution is unchanged', async (t) => {
  for (const [specifier, files, resolved] of JS_SPELLINGS) {
    await t.test(`./${specifier} -> ${resolved}`, async () => {
      await withFixture(specifier, files, ({ code, output }) => {
        assert.equal(code, 1, `a forbidden dependency behind ./${specifier} must fail the build`);
        assert.ok(
          output.includes(`${FIXTURE_DIR.replace('src/', '')}/${resolved}:`),
          `the violation must name ${resolved}, got:\n${output}`,
        );
      });
    });
  }
});

// A file beats a directory, the way Vite resolves it and the way the resolver
// did before TypeScript joined the candidate list.
test('a file still wins over a directory of the same name', async () => {
  await withFixture('helper', {
    'helper.ts': offender('useStageClassName'),
    'helper/index.ts': innocent,
  }, ({ code, output }) => {
    assert.equal(code, 1, output);
    assert.ok(output.includes('__outcome-resolver-fixture__/helper.ts:'), output);
    assert.ok(!output.includes('helper/index.ts:'), `helper.ts shadows helper/index.ts, got:\n${output}`);
  });
});

// The fence widened, not the verdict: resolving a TypeScript module is not by
// itself a violation, or every case above would fail for the wrong reason.
test('a clean TypeScript module inside the fence passes', async (t) => {
  for (const [specifier, name] of [['helper', 'helper.ts'], ['folder', 'folder/index.tsx']]) {
    await t.test(name, async () => {
      await withFixture(specifier, { [name]: innocent }, ({ code, output }) => {
        assert.equal(code, 0, `a module with nothing forbidden in it must pass:\n${output}`);
      });
    });
  }
});
