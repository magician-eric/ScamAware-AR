// Runs validateDialogueTree() against every scenario04 dialogue tree and
// prints a report; exits non-zero if any tree has issues. See
// src/features/shopping/validateDialogueTree.js for what's checked.
import { validateDialogueTree, formatValidationReport } from '../src/features/shopping/validateDialogueTree.js';
import { buildHealthDialogueTree } from '../src/data/dialogueTrees/health';
import { buildLuckyBagDialogueTree } from '../src/data/dialogueTrees/luckyBag';
import { buildDelayTree } from '../src/data/dialogueTrees/delay';
import { buildReturnAckTree } from '../src/data/dialogueTrees/returnAck';
import { buildPlatformSupportTree } from '../src/data/dialogueTrees/platformSupport';

// Validated for all three languages - 'en'/'jp' exercise every t() lookup
// path too, so a tree with a broken/missing English or Japanese string would
// fail validation the same way a broken node id would.
const trees = [];
for (const lang of ['zh', 'en', 'jp']) {
  trees.push(
    [`health (presale+dispute) [${lang}]`, buildHealthDialogueTree(lang)],
    [`luckyBag (presale+dispute) [${lang}]`, buildLuckyBagDialogueTree(lang)],
    [`delay:health [${lang}]`, buildDelayTree('health', lang)],
    [`delay:luckyBag [${lang}]`, buildDelayTree('luckyBag', lang)],
    [`returnAck:health [${lang}]`, buildReturnAckTree('health', lang)],
    [`returnAck:luckyBag [${lang}]`, buildReturnAckTree('luckyBag', lang)],
    [`platformSupport [${lang}]`, buildPlatformSupportTree(lang)],
  );
}

let allOk = true;
for (const [label, tree] of trees) {
  const report = validateDialogueTree(tree, label);
  console.log(formatValidationReport(report));
  if (!report.ok) allOk = false;
}

console.log(allOk ? '\nAll dialogue trees passed validation.' : '\nValidation FAILED - see issues above.');
process.exit(allOk ? 0 : 1);
