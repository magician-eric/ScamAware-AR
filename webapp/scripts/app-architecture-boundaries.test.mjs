import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import test from 'node:test';
import { promisify } from 'node:util';

const run = promisify(execFile);
const WEBAPP = new URL('../', import.meta.url);
const FIXTURE = new URL('src/apps/blackpi/__ad21-mutation__.js', WEBAPP);
const ORDER_DETAIL = new URL('src/apps/blackpi/screens/OrderDetail.jsx', WEBAPP);

async function validate(source) {
  await writeFile(FIXTURE, source);
  try {
    const { stdout } = await run('node', ['scripts/validate-app-boundaries.mjs'], { cwd: WEBAPP.pathname });
    return { ok: true, output: stdout };
  } catch (error) {
    return { ok: false, output: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  } finally {
    await rm(FIXTURE, { force: true });
  }
}

async function mutateOrderDetail(statement) {
  const original = await readFile(ORDER_DETAIL, 'utf8');
  await writeFile(ORDER_DETAIL, `${statement}\n${original}`);
  try {
    return await runValidator();
  } finally {
    await writeFile(ORDER_DETAIL, original);
  }
}

async function runValidator() {
  try {
    const { stdout } = await run('node', ['scripts/validate-app-boundaries.mjs'], { cwd: WEBAPP.pathname });
    return { ok: true, output: stdout };
  } catch (error) {
    return { ok: false, output: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
}

// These tests mutate a real production ownership root. Running the production
// validator (rather than a copied predicate) proves the build gate sees each
// regression and also proves the permitted contracts remain usable.
test('AD-21 mutation matrix A-I', { concurrency: false }, async (t) => {
  await t.test('A — App importing a Scenario page fails', async () => {
    const result = await validate("import '../../pages/scenario05/HpeShip.jsx';\n");
    assert.equal(result.ok, false); assert.match(result.output, /scenario/);
  });
  await t.test('B — App hard-coding a Scenario route fails', async () => {
    const result = await validate("export const go = () => navigate('/scenario05-atm/chat');\n");
    assert.equal(result.ok, false); assert.match(result.output, /names a scenario route/);
  });
  await t.test('C — App importing Scenario i18n fails', async () => {
    const result = await validate("import '../../shared/i18n/scenario04.js';\n");
    assert.equal(result.ok, false); assert.match(result.output, /scenario-owned localization/);
  });
  await t.test('D — App importing Scenario state fails', async () => {
    const result = await validate("import '../../lib/scenario05Store.js';\n");
    assert.equal(result.ok, false); assert.match(result.output, /scenario run state/);
  });
  await t.test('E — semantic callback passes', async () => {
    const result = await validate('export const open = (onOpenConversation) => onOpenConversation();\n');
    assert.equal(result.ok, true, result.output);
  });
  await t.test('F — Scenario wrapper navigation remains legal', async () => {
    const result = await validate('export const app = true;\n');
    assert.equal(result.ok, true, result.output);
    // Existing wrappers contain Scenario routes and the complete validator run
    // above passed, proving the rule is scoped to apps/** rather than all src.
  });
  await t.test('G — legal shared helper dependency passes', async () => {
    const result = await validate("import { feedback } from '../../lib/feedback.js';\nvoid feedback;\n");
    assert.equal(result.ok, true, result.output);
  });
  await t.test('H — App-owned i18n passes', async () => {
    const result = await validate("import { useT } from './i18n/index.js';\nvoid useT;\n");
    assert.equal(result.ok, true, result.output);
  });
  await t.test('I — App-owned asset reference passes', async () => {
    const result = await validate("export const logo = new URL('./assets/blackpi-logo.webp', import.meta.url);\n");
    assert.equal(result.ok, true, result.output);
  });
  await t.test('cross-App implementation import fails', async () => {
    const result = await validate("import { MeetULogo } from '../meetu/index.js';\nvoid MeetULogo;\n");
    assert.equal(result.ok, false); assert.match(result.output, /another App implementation/);
  });
  for (const [name, expression] of [
    ['plain literal', "import('./foo.js')"],
    ['space-padded literal', "import( './foo.js' )"],
    ['multiline literal', "import(\n  './foo.js'\n)"],
    ['no-substitution template literal', 'import(`./foo.js`)'],
  ]) await t.test(`literal dynamic import passes: ${name}`, async () => {
    const result = await validate(`export const load = () => ${expression};\n`);
    assert.equal(result.ok, true, result.output);
  });
  await t.test('interpolated template dynamic import fails closed', async () => {
    const result = await validate('export const load = (scenario) => import(`../../pages/${scenario}/Foo.jsx`);\n');
    assert.equal(result.ok, false); assert.match(result.output, /cannot be verified/);
  });
  await t.test('identifier dynamic import fails closed', async () => {
    const result = await validate('export const load = (path) => import(path);\n');
    assert.equal(result.ok, false); assert.match(result.output, /cannot be verified/);
  });
  await t.test('call-expression dynamic import fails closed', async () => {
    const result = await validate('export const load = () => import(getPath());\n');
    assert.equal(result.ok, false); assert.match(result.output, /cannot be verified/);
  });
  await t.test('audited OrderDetail → HPE public index contract passes', async () => {
    const result = await runValidator();
    assert.equal(result.ok, true, result.output);
  });
  await t.test('OrderDetail → HPE state implementation fails', async () => {
    const result = await mutateOrderDetail("import '../../hpe-logistics/state/index.js';");
    assert.equal(result.ok, false); assert.match(result.output, /another App implementation/);
  });
  await t.test('OrderDetail → HPE internal component fails', async () => {
    const result = await mutateOrderDetail("import '../../hpe-logistics/components/HpeShell.jsx';");
    assert.equal(result.ok, false); assert.match(result.output, /another App implementation/);
  });
  await t.test('another BlackPi file → HPE public index fails', async () => {
    const result = await validate("import { HpeLogo } from '../hpe-logistics/index.js';\nvoid HpeLogo;\n");
    assert.equal(result.ok, false); assert.match(result.output, /another App implementation/);
  });
});
