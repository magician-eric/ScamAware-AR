// The five-Scenario gesture audit, as a report.
//
// One question, asked of every story surface in the five Scenarios: how many
// actions can the player take on it, and does LEFT/RIGHT do the right thing
// with that number?
//
//   ZERO_ACTION  LEFT -> ignore        RIGHT -> ignore
//   ONE_ACTION   LEFT -> ignore        RIGHT -> the one action
//   TWO_ACTION   LEFT -> left action   RIGHT -> right action
//
// The report reads the migration inventory (the machine-readable twin of
// docs/ar-interaction-phase2-migration.md, kept honest against the source
// tree by scripts/ar-interaction-migration.test.mjs) and the dual visual-order
// manifest, so it never invents a number of its own. It exits non-zero if any
// surface breaks the rules, which is what makes it usable as a gate as well as
// a read-out.
//
// Related tools, none of which this duplicates:
//   audit:ar-interactions      what interaction risk exists in source
//   test:gesture-contract      the contract engine's correctness
//   test:gesture-bridge        one gesture -> at most one action
//   test:ar-interaction-migration  are the five Scenarios fully wired
//   test:ar-dual-visual-order  does LEFT mean the left-hand button
import { fileURLToPath } from 'node:url';

import { AR_MIGRATION_INVENTORY } from './ar-interaction-migration-inventory.mjs';
import { AR_DUAL_VISUAL_ORDER, auditVisualOrder } from './ar-dual-visual-order.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

export const ACTION_CLASSES = Object.freeze({
  display: 'ZERO_ACTION',
  single: 'ONE_ACTION',
  dual: 'TWO_ACTION',
});

// The action count each geometry is allowed to carry. This is the AR ceiling
// (two gestures, so at most two actions) expressed per class.
const ACTION_COUNT = { display: 0, single: 1, dual: 2 };

export function classify(inventory = AR_MIGRATION_INVENTORY) {
  return inventory.map((row) => ({
    ...row,
    actionClass: ACTION_CLASSES[row.mode] ?? 'UNKNOWN',
    actionCount: ACTION_COUNT[row.mode] ?? Number.NaN,
  }));
}

// Every way a surface can break the全站 rule, as data.
export function violationsIn(classified) {
  const problems = [];
  for (const row of classified) {
    if (row.actionClass === 'UNKNOWN') {
      problems.push(`${row.surfaceId}: unknown geometry '${row.mode}' - only display/single/dual exist`);
      continue;
    }
    if (!(row.actionCount <= 2)) {
      problems.push(`${row.surfaceId}: ${row.actionCount} actions - a screen has at most two (LEFT and RIGHT)`);
    }
    // ONE_ACTION is only ever RIGHT. A `single` row that names a LEFT would be
    // the "either wave works" model this build deliberately does not have.
    if (row.actionClass === 'ONE_ACTION') {
      if (row.left !== null) problems.push(`${row.surfaceId}: ONE_ACTION must not bind LEFT (found: ${row.left})`);
      if (row.right === null) problems.push(`${row.surfaceId}: ONE_ACTION binds nothing to RIGHT`);
    }
    // ZERO_ACTION binds neither side.
    if (row.actionClass === 'ZERO_ACTION' && (row.left !== null || row.right !== null)) {
      problems.push(`${row.surfaceId}: ZERO_ACTION must bind neither side`);
    }
    // TWO_ACTION names both.
    if (row.actionClass === 'TWO_ACTION' && (row.left === null || row.right === null)) {
      problems.push(`${row.surfaceId}: TWO_ACTION must name both sides`);
    }
  }
  return problems;
}

const SCENARIOS = ['shared', 'scenario01', 'scenario02', 'scenario03', 'scenario04', 'scenario05'];
const LABEL = {
  shared: 'Shared（五情境共用）',
  scenario01: 'Scenario 01',
  scenario02: 'Scenario 02',
  scenario03: 'Scenario 03',
  scenario04: 'Scenario 04',
  scenario05: 'Scenario 05',
};

export function report(classified) {
  const lines = [];
  const total = { ZERO_ACTION: 0, ONE_ACTION: 0, TWO_ACTION: 0 };
  lines.push('AR GESTURE ACTION AUDIT — LEFT / RIGHT across the five Scenarios\n');
  lines.push('scenario          ZERO_ACTION  ONE_ACTION  TWO_ACTION  total');
  for (const scenario of SCENARIOS) {
    const scoped = classified.filter((row) => row.scenario === scenario);
    const counts = {
      ZERO_ACTION: scoped.filter((row) => row.actionClass === 'ZERO_ACTION').length,
      ONE_ACTION: scoped.filter((row) => row.actionClass === 'ONE_ACTION').length,
      TWO_ACTION: scoped.filter((row) => row.actionClass === 'TWO_ACTION').length,
    };
    for (const key of Object.keys(total)) total[key] += counts[key];
    lines.push(
      `${LABEL[scenario].padEnd(18)}${String(counts.ZERO_ACTION).padStart(11)}`
      + `${String(counts.ONE_ACTION).padStart(12)}${String(counts.TWO_ACTION).padStart(12)}`
      + `${String(scoped.length).padStart(7)}`,
    );
  }
  lines.push(
    `${'TOTAL'.padEnd(18)}${String(total.ZERO_ACTION).padStart(11)}`
    + `${String(total.ONE_ACTION).padStart(12)}${String(total.TWO_ACTION).padStart(12)}`
    + `${String(classified.length).padStart(7)}`,
  );
  lines.push('');
  lines.push('ZERO_ACTION  LEFT -> ignore        RIGHT -> ignore');
  lines.push('ONE_ACTION   LEFT -> ignore        RIGHT -> the one action');
  lines.push('TWO_ACTION   LEFT -> left action   RIGHT -> right action');
  return { lines, total };
}

function main() {
  const classified = classify();
  const { lines, total } = report(classified);
  console.log(lines.join('\n'));

  const problems = violationsIn(classified);
  console.log('\nSurfaces with more than two actions:', problems.length === 0 ? 'none' : problems.length);

  const visual = auditVisualOrder(ROOT);
  const inverted = visual.filter((row) => !row.ok);
  console.log('\nDUAL VISUAL ORDER — is LEFT the button on the left?');
  console.log(`audited: ${visual.length} dual surfaces `
    + `(${visual.filter((row) => row.axis === 'row').length} drawn two-across, `
    + `${visual.filter((row) => row.axis === 'stack').length} vertical with a written reason)`);
  console.log(`visual position disagreeing with the contract: ${inverted.length === 0 ? 'none' : inverted.length}`);
  for (const row of inverted) console.log(`  ${row.surfaceId}: ${row.problems.join('; ')}`);
  for (const row of AR_DUAL_VISUAL_ORDER.filter((entry) => entry.axis === 'stack')) {
    console.log(`  NOTE ${row.surfaceId} — vertical, LEFT is the row on top. ${row.reason}`);
  }

  if (problems.length > 0 || inverted.length > 0) {
    for (const problem of problems) console.error(`  ${problem}`);
    console.error('\nAUDIT: FAIL');
    process.exitCode = 1;
    return;
  }
  console.log(`\nAUDIT: PASS — ${classified.length} interaction surfaces, `
    + `${total.ZERO_ACTION} ZERO_ACTION / ${total.ONE_ACTION} ONE_ACTION / ${total.TWO_ACTION} TWO_ACTION, `
    + 'none above two actions, none visually inverted.');
}

if (import.meta.url === `file://${process.argv[1]}`) main();
