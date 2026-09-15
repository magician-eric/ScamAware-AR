import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditTree, scenarioFor } from './ar-interaction-audit-lib.mjs';
import { REGRESSION_RULES, runRegressionGuard } from './ar-interaction-regression-rules.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const webappRoot = path.resolve(here, '..');
const sourceRoot = path.join(webappRoot, 'src');
const findings = auditTree(sourceRoot);

console.log('AR Interaction Audit — SOURCE INTERACTION DEFINITIONS\n');
for (let number = 1; number <= 5; number += 1) {
  const scenario = `Scenario 0${number}`;
  const scoped = findings.filter((finding) => scenarioFor(finding.file) === scenario);
  console.log(`${scenario}\nsource interaction definitions: ${scoped.length}`);
  const grouped = scoped.reduce((result, finding) => {
    (result[finding.classification] ||= []).push(finding);
    return result;
  }, {});
  const counts = Object.entries(grouped)
    .map(([name, entries]) => `${name}: ${entries.length}`).join(' | ');
  console.log(counts || 'none');
}
for (const group of ['Shared / LINE', 'Shared / entry']) {
  console.log(`\n${group}\nsource interaction definitions: ${findings.filter((finding) => scenarioFor(finding.file) === group).length}`);
}
console.log('\nFile | Component / approximate context | Interaction type | Line | Classification | Reason');
for (const item of findings) {
  const exception = item.exception ? ` KNOWN EXCEPTION (${item.exception.id}): ${item.exception.reason}` : '';
  console.log(`${item.file} | ${item.context} | ${item.interactionType} | ${item.line} | ${item.classification} | ${item.reason}${exception}`);
}

runRegressionGuard(webappRoot);
// The BlackPi search bar used to be a live <input>, carried here as the one
// standing known exception while its workstream was open. That workstream has
// landed - the bar is appearance only now - so the guard is the other way
// round: the AR build's storefront must contain no editable control at all,
// and a new one must fail this run rather than be excepted into it.
const blackPiEditable = findings.filter(
  (finding) => finding.file.startsWith('src/apps/blackpi/') && finding.interactionType === 'input',
);
if (blackPiEditable.length) {
  const where = blackPiEditable.map((finding) => `${finding.file}:${finding.line}`).join(', ');
  throw new Error(`BlackPi must have no editable control - the AR search bar is appearance only. Found: ${where}`);
}
console.log(`\nRegression guard: PASS (${REGRESSION_RULES.length} source-level rules plus structural assertions; no editable control in BlackPi)`);
