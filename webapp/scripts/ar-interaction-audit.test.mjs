import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanSource, scenarioFor } from './ar-interaction-audit-lib.mjs';
import { KNOWN_EXCEPTIONS, findKnownException } from './ar-interaction-known-exceptions.mjs';
import { evaluateRegressionRule, runRegressionGuard } from './ar-interaction-regression-rules.mjs';

test('finds controls and ignores ordinary div/span elements', () => {
  const findings = scanSource(`export function Fixture() { return <><div /><span /><button onClick={go}>Go</button></>; }`);
  assert.deepEqual(findings.map((item) => item.interactionType), ['button', 'onClick']);
  assert.equal(findings[0].context, 'Fixture');
});

test('recognises inputs, role buttons, focusability, and submit handlers', () => {
  const types = scanSource(`<form onSubmit={save}><input /><select /><textarea /><div role="button" tabIndex={0} /></form>`)
    .map((item) => item.interactionType);
  assert.deepEqual(types, ['onSubmit', 'input', 'input', 'input', 'role=button', 'tabIndex={0}']);
});

test('recognises anchors, Link, and NavLink without confusing icon imports', () => {
  const types = scanSource(`import { Link } from 'icons'; const x = <><a href="/"/><Link to="/a"/><NavLink to="/b"/></>`)
    .map((item) => item.interactionType);
  assert.deepEqual(types, ['link', 'Link', 'NavLink']);
});

// Takes its own allowlist rather than the live KNOWN_EXCEPTIONS, which is
// empty now that the BlackPi search input it used to hold has been fixed. What
// is worth testing is the matcher - that an exception is keyed on file AND
// interaction type AND context together, so one can never quietly cover a
// second finding somewhere else.
test('central allowlist marks a precise known exception', () => {
  const allowlist = [{
    id: 'fixture-exception',
    file: 'src/apps/blackpi/screens/Search.jsx',
    interactionType: 'input',
    context: 'Search',
    reason: 'fixture',
  }];
  const [finding] = scanSource(`export function Search() { return <input />; }`, 'src/apps/blackpi/screens/Search.jsx');
  assert.equal(findKnownException(finding, allowlist)?.id, 'fixture-exception');
  assert.equal(findKnownException({ ...finding, file: 'src/other.jsx' }, allowlist), undefined);
  assert.equal(findKnownException({ ...finding, interactionType: 'button' }, allowlist), undefined);
  assert.equal(findKnownException({ ...finding, context: 'SearchResults' }, allowlist), undefined);
});

test('no exception is currently outstanding', () => {
  assert.deepEqual(KNOWN_EXCEPTIONS, [], 'an exception is a temporary REPORT, not a permanent waiver');
});

test('shared LINE definitions have their own non-duplicated report group', () => {
  assert.equal(scenarioFor('src/apps/line/components/Line.jsx'), 'Shared / LINE');
  assert.equal(scenarioFor('src/pages/scenario03/Call.jsx'), 'Scenario 03');
});

test('regression rules detect JSX controls and navigation callbacks', () => {
  const rule = {
    file: 'fixture.jsx',
    types: ['button', 'onClick'],
    patterns: [/\bsetTab\s*\(/],
  };
  assert.deepEqual(
    evaluateRegressionRule('const x = <button onClick={go}>tab</button>; setTab("home");', rule),
    ['button@1', 'onClick@1', 'source pattern /\\bsetTab\\s*\\(/'],
  );
});

test('current production tree satisfies every focused regression rule', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  assert.doesNotThrow(() => runRegressionGuard(path.resolve(here, '..')));
});
