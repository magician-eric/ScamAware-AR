// The reachability guard is part of the deployment gate.
//
// scripts/outcome-reachability.test.mjs is what proves both結局 of all five
// scenarios are still walkable (spec §13 AD-23). It existed, it passed, and
// nothing made the site's deployment depend on it: .github/workflows/
// deploy-pages.yml runs one command, `npm run build`, and `build` was
// `vite build` behind a prebuild chain of validators the reachability suite
// was not in. An ending could go unreachable and still ship.
//
// So the suite is now the last step of that prebuild chain, and this file is
// what keeps it there. Not by looking for a string in package.json - a string
// proves a script is *named*, not that the build actually depends on it - but
// by resolving the `npm run` graph the gate is made of, and then by running the
// gate for real with the reachability suite made to fail and checking the build
// stops before vite is ever reached.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

const run = promisify(execFile);
const WEBAPP = new URL('../', import.meta.url).pathname;
const read = (path) => readFile(join(WEBAPP, path), 'utf8');

const GUARD = 'test:outcome-reachability';
const SUITE = 'scripts/outcome-reachability.test.mjs';

const { scripts } = JSON.parse(await read('package.json'));

// Every script an `npm run X` reaches, transitively. This is the whole point:
// the chain may grow another hop or be reordered, and the guard still has to
// come out the other end.
function reachedFrom(name, seen = new Set()) {
  if (seen.has(name)) return seen;
  seen.add(name);
  for (const [, called] of (scripts[name] ?? '').matchAll(/npm run ([\w:@.-]+)/g)) reachedFrom(called, seen);
  return seen;
}

test('the prebuild chain reaches the reachability guard', () => {
  const chain = reachedFrom('prebuild');
  assert.ok(chain.has(GUARD), `prebuild must reach ${GUARD}, it reaches: ${[...chain].join(', ')}`);
});

// The endpoint of that chain has to be the real suite. A guard that resolves to
// a name is worth nothing if the name can be repointed at something that always
// passes.
test('the guard runs the reachability suite itself', () => {
  const command = scripts[GUARD] ?? '';
  assert.ok(command.includes('--test'), `${GUARD} must run node's test runner, got: ${command}`);
  assert.ok(command.includes(SUITE), `${GUARD} must run ${SUITE}, got: ${command}`);
});

// The deployment path is one command in one workflow. If it ever stops being
// `npm run build`, or grows the flag that skips lifecycle scripts, prebuild -
// and with it every validator, not just this guard - is silently out of the
// deployment.
test('the deployment workflow builds through npm run build, with lifecycle scripts on', async () => {
  const workflow = await read('../.github/workflows/deploy-pages.yml');
  const build = workflow.match(/- name: Build\n(?:\s+.*\n)*?\s+run: (.+)/);
  assert.ok(build, 'deploy-pages.yml no longer has a Build step this test can read');
  assert.equal(build[1].trim(), 'npm run build');
  assert.doesNotMatch(workflow, /--ignore-scripts/, 'a workflow that skips lifecycle scripts skips prebuild, and prebuild is the gate');
  assert.doesNotMatch(workflow, /\bnpx vite build\b|\bvite build\b/, 'nothing on the deployment path may build around npm run build');
});

// --- and the relationship, run for real --------------------------------------
//
// Everything above reads configuration. This one breaks the reachability suite
// and asks the actual gate what it does about it: `npm run build` must fail,
// name the guard, and never get as far as vite. Restored afterwards whatever
// the assertions do - and because the build stops in prebuild, dist/ is not
// touched either way.
//
// The build has to be spawned out of this runner's own test context:
// NODE_TEST_CONTEXT is how `node --test` tells a child test process to report
// over its IPC channel instead of through an exit code, and prebuild ends in a
// `node --test`. Inherited, the guard's failure would be posted back to this
// process as a subtest and `npm run build` would exit 0 - the exact blind spot
// this test exists to close, arrived at from the other direction.
const DETACHED_ENV = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => key !== 'NODE_TEST_CONTEXT' && key !== 'NODE_OPTIONS'),
);

test('a failing reachability suite fails npm run build before vite runs', async () => {
  const path = join(WEBAPP, SUITE);
  const before = await readFile(path, 'utf8');
  const marker = 'UNREACHABLE_ENDING_MUTATION';
  try {
    await writeFile(
      path,
      `${before}\ntest('${marker}', () => { assert.fail('${marker}'); });\n`,
      'utf8',
    );
    let result;
    try {
      const { stdout } = await run('npm', ['run', 'build'], { cwd: WEBAPP, env: DETACHED_ENV, maxBuffer: 32 * 1024 * 1024 });
      result = { code: 0, output: stdout };
    } catch (error) {
      result = { code: error.code ?? 1, output: `${error.stdout ?? ''}${error.stderr ?? ''}` };
    }
    assert.notEqual(result.code, 0, 'an unreachable ending must fail the build');
    assert.ok(result.output.includes(marker), `the build must fail on the reachability suite, got:\n${result.output}`);
    assert.ok(!/\bbuilt in\b/.test(result.output), `vite must never run once the guard fails, got:\n${result.output}`);
  } finally {
    await writeFile(path, before, 'utf8');
  }
});
