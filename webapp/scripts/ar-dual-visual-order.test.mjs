// Does LEFT really mean the button on the left?
//
// scripts/ar-dual-visual-order.mjs explains why this cannot be answered by the
// contract itself. This suite runs that audit against the real tree, proves
// the audit covers every `dual` surface the migration inventory knows about,
// and - the part that matters most for a source-scanning check - proves each
// of its three checks actually fails when the thing it guards is broken. A
// green audit is worth nothing if the checks cannot go red.
import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  AR_DUAL_VISUAL_ORDER,
  auditVisualOrder,
  cssRuleFor,
  horizontalityOf,
  reversalIn,
  occurrences,
} from './ar-dual-visual-order.mjs';
import { AR_MIGRATION_INVENTORY } from './ar-interaction-migration-inventory.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

const properties = (declarations) => new Map(Object.entries(declarations));

// --------------------------------------------------------------- the audit

test('every dual surface binds LEFT to the control the player sees first', () => {
  const failures = auditVisualOrder(ROOT).filter((row) => !row.ok);
  assert.deepEqual(
    failures.map((row) => `${row.surfaceId}: ${row.problems.join('; ')}`),
    [],
  );
});

test('the audit covers exactly the dual surfaces the migration inventory declares', () => {
  const inventory = AR_MIGRATION_INVENTORY.filter((row) => row.mode === 'dual').map((row) => row.surfaceId);
  const audited = AR_DUAL_VISUAL_ORDER.map((row) => row.surfaceId);
  assert.deepEqual(
    [...audited].sort(),
    [...inventory].sort(),
    'a dual surface with no visual-order row is a screen where LEFT could silently be the right-hand button',
  );
  assert.equal(new Set(audited).size, audited.length, 'a surfaceId is audited twice');
});

test('a stack is only allowed with a written reason, and a row never carries one', () => {
  for (const row of AR_DUAL_VISUAL_ORDER) {
    if (row.axis === 'stack') {
      assert.ok(row.reason.length > 80, `${row.surfaceId}: a stack needs a real explanation, not a note`);
    } else {
      assert.equal(row.axis, 'row', `${row.surfaceId}: unknown axis`);
      assert.equal(row.reason, '', `${row.surfaceId}: a two-across row needs no exception reason`);
    }
  }
});

// The count the audit report quotes, pinned so it cannot drift silently: a new
// dual surface has to be added to the manifest deliberately.
test('the five Scenarios plus shared carry 27 dual surfaces, 24 of them two-across', () => {
  assert.equal(AR_DUAL_VISUAL_ORDER.length, 27);
  assert.equal(AR_DUAL_VISUAL_ORDER.filter((row) => row.axis === 'row').length, 24);
  assert.deepEqual(
    AR_DUAL_VISUAL_ORDER.filter((row) => row.axis === 'stack').map((row) => row.surfaceId).sort(),
    ['scenario02/deposit-warning', 'scenario04/me', 'scenario04/messages'],
  );
});

// ------------------------------------------------- the checks can go red

test('LAYOUT: a container that stacks its children is not a row', () => {
  assert.equal(horizontalityOf(properties({ display: 'grid', 'grid-template-columns': '1fr 1fr' })).horizontal, true);
  assert.equal(horizontalityOf(properties({ display: 'grid', 'grid-template-columns': 'repeat(2,minmax(0,1fr))' })).horizontal, true);
  assert.equal(horizontalityOf(properties({ display: 'flex' })).horizontal, true);

  // Each of these is a way for a declared pair to end up one above the other.
  assert.equal(horizontalityOf(properties({ display: 'grid', gap: '8px' })).horizontal, false);
  assert.equal(horizontalityOf(properties({ display: 'grid', 'grid-template-columns': 'minmax(0,1fr)' })).horizontal, false);
  assert.equal(horizontalityOf(properties({ display: 'flex', 'flex-direction': 'column' })).horizontal, false);
  assert.equal(horizontalityOf(properties({ display: 'flex', 'flex-wrap': 'wrap' })).horizontal, false);
  assert.equal(horizontalityOf(properties({ display: 'block' })).horizontal, false);
});

test('LAYOUT: anything that renumbers the children is caught as a reversal', () => {
  assert.equal(reversalIn(properties({ display: 'flex' })), null);
  assert.equal(reversalIn(properties({ 'flex-direction': 'row-reverse' })), 'flex-direction: row-reverse');
  assert.equal(reversalIn(properties({ 'flex-direction': 'column-reverse' })), 'flex-direction: column-reverse');
  assert.equal(reversalIn(properties({ direction: 'rtl' })), 'direction: rtl');
  assert.equal(reversalIn(properties({ order: '2' })), 'order: 2');
  assert.equal(reversalIn(properties({ 'grid-auto-flow': 'dense' })), 'grid-auto-flow: dense');
});

test('DRAW: swapping the two controls in the drawing file fails the audit', () => {
  // The real thing, but with WithdrawFail's two buttons written the other way
  // round - the exact refactor that would leave the contract binding LEFT to
  // the button now drawn on the right.
  const rows = auditVisualOrder(ROOT, {
    'src/pages/scenario01/WithdrawFail.jsx': [
      '<Button variant="secondary" to={STOPPED}>',
      '<Button variant="danger" to={SCAMMED}>',
      'left: () => navigate(SCAMMED),',
      'right: () => navigate(STOPPED),',
    ].join('\n'),
  });
  const row = rows.find((entry) => entry.surfaceId === 'scenario01/withdraw-fail/final-decision');
  assert.equal(row.ok, false);
  assert.match(row.problems.join(' '), /is drawn before/);
});

test('BINDING: swapping the contract\'s own two lines fails the audit', () => {
  const rows = auditVisualOrder(ROOT, {
    'src/pages/scenario03/FinalDecision.jsx': [
      'right: call165,',
      'left: confirmTransfer,',
      '<button onClick={confirmTransfer}>',
      '<button onClick={call165}>',
    ].join('\n'),
  });
  const row = rows.find((entry) => entry.surfaceId === 'scenario03/final-decision');
  assert.equal(row.ok, false);
  assert.match(row.problems.join(' '), /no longer declared as one pair/);
});

test('BINDING: an indexed surface that takes index 1 on LEFT fails the audit', () => {
  const rows = auditVisualOrder(ROOT, {
    'src/components/ui/ScenarioFinalDecision.jsx': [
      'left: () => choose(1),',
      'right: () => choose(0),',
    ].join('\n'),
  });
  const row = rows.find((entry) => entry.surfaceId === 'shared/anti-fraud-quiz');
  assert.equal(row.ok, false);
  assert.match(row.problems.join(' '), /no longer contains/);
});

test('LAYOUT: a container the stylesheet stops defining fails rather than passing quietly', () => {
  const rows = auditVisualOrder(ROOT, { 'src/styles/scenario03.css': '.something-else{display:grid}' });
  const row = rows.find((entry) => entry.surfaceId === 'scenario03/final-decision');
  assert.equal(row.ok, false);
  assert.match(row.problems.join(' '), /has no rule for selector/);
});

// ------------------------------------------------------------- the helpers

test('the CSS reader finds a rule by exact selector and ignores comments', () => {
  assert.deepEqual(
    cssRuleFor(ROOT, 'src/styles/scenario03.css', '.pol-choices-split'),
    ['grid-template-columns:minmax(0,1fr) minmax(0,1fr)'],
  );
  // .bp-choice-grid-stack is a different selector and must not answer for it.
  assert.deepEqual(cssRuleFor(ROOT, 'src/styles/scenario03.css', '.pol-choices-nope'), []);
});

test('occurrences finds every position, not just the first', () => {
  assert.deepEqual(occurrences('a-b-a-b', 'a'), [0, 4]);
  assert.deepEqual(occurrences('aaa', 'aa'), [0]);
  assert.deepEqual(occurrences('none', 'x'), []);
});

// The two panels PrivateChat draws (stalled, failed) carry the same pair, and
// both are checked - not only whichever is written first.
test('a pair drawn twice is checked in both places', () => {
  const row = AR_DUAL_VISUAL_ORDER.find((entry) => entry.surfaceId === 'scenario02/private-chat/video-recovery');
  const rows = auditVisualOrder(ROOT, {
    'src/pages/scenario02/PrivateChat.jsx': [
      row.leftBinding,
      row.rightBinding,
      // first panel drawn correctly, second panel swapped
      'onClick={retryVideo}', 'onClick={finishVideo}',
      'onClick={finishVideo}', 'onClick={retryVideo}',
    ].join('\n'),
  });
  const audited = rows.find((entry) => entry.surfaceId === 'scenario02/private-chat/video-recovery');
  assert.equal(audited.ok, false);
  assert.match(audited.problems.join(' '), /occurrence 2/);
});
