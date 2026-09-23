// Dev-time structural check for scenario04 dialogue trees (spec section 26).
// Pure and framework-free so it can run both from a Node script (see
// scripts/validate-dialogue.mjs) and, if ever needed, from the browser
// console against the live trees.
//
// Only nodes with a static `choices` array are fully checked; a node whose
// `choices` is a function (state-conditional wording, e.g. tone-based) is
// still checked for known-safe shapes but can't be exhaustively validated
// without a concrete state, so it's called once with a neutral default
// state and flagged separately if that call throws.
export function validateDialogueTree(tree, label = 'tree') {
  const nodesById = Object.fromEntries(tree.map((n) => [n.id, n]));
  const multiChoiceNodes = [];
  const missingNextNodeId = [];
  const deadEndNodes = [];
  const duplicateChoiceIds = [];
  const selfLoops = [];
  const unresolvableChoiceFns = [];

  const neutralState = {
    trustScore: 50, suspicionScore: 0, evidenceScore: 0, urgencyScore: 0,
    assertivenessScore: 0, sellerPressureScore: 0, warningFlags: [], evidenceSaved: [],
    dialogueHistory: [], askedChoiceIds: {},
  };

  for (const node of tree) {
    let choices = node.choices;
    if (typeof choices === 'function') {
      try {
        choices = choices(neutralState, []);
      } catch {
        unresolvableChoiceFns.push(node.id);
        choices = null;
      }
    }

    if (Array.isArray(choices)) {
      // Every scenario04 beat is a 2-choice exchange, with exactly one
      // deliberate exception: "跟平台爭執什麼" (platformSupport.js's
      // agent.argue.pick) is a real 3-way pick, since the player is choosing
      // which specific angle to press the platform on. Anything past 3 is
      // still flagged.
      if (choices.length > 3) multiChoiceNodes.push({ id: node.id, count: choices.length });
      const seen = new Set();
      for (const c of choices) {
        if (seen.has(c.id)) duplicateChoiceIds.push({ nodeId: node.id, choiceId: c.id });
        seen.add(c.id);
        if (!c.nextNodeId) {
          missingNextNodeId.push({ nodeId: node.id, choiceId: c.id, reason: 'no nextNodeId' });
        } else if (!nodesById[c.nextNodeId]) {
          missingNextNodeId.push({ nodeId: node.id, choiceId: c.id, target: c.nextNodeId, reason: 'target node not found' });
        }
        if (c.nextNodeId === node.id) selfLoops.push({ nodeId: node.id, choiceId: c.id });
      }
    }

    const hasExit = Boolean(choices?.length) || Boolean(node.autoNextNodeId) || node.terminal === true;
    if (!hasExit) deadEndNodes.push(node.id);

    if (node.autoNextNodeId && !nodesById[node.autoNextNodeId]) {
      missingNextNodeId.push({ nodeId: node.id, target: node.autoNextNodeId, reason: 'autoNextNodeId target not found' });
    }
  }

  const ok = multiChoiceNodes.length === 0
    && missingNextNodeId.length === 0
    && deadEndNodes.length === 0
    && duplicateChoiceIds.length === 0
    && unresolvableChoiceFns.length === 0;

  return {
    label,
    nodeCount: tree.length,
    ok,
    multiChoiceNodes,
    missingNextNodeId,
    deadEndNodes,
    duplicateChoiceIds,
    selfLoops,
    unresolvableChoiceFns,
  };
}

export function formatValidationReport(report) {
  const lines = [`[${report.label}] ${report.nodeCount} nodes - ${report.ok ? 'OK' : 'ISSUES FOUND'}`];
  if (report.multiChoiceNodes.length) lines.push(`  choices > 2: ${JSON.stringify(report.multiChoiceNodes)}`);
  if (report.missingNextNodeId.length) lines.push(`  missing/invalid nextNodeId: ${JSON.stringify(report.missingNextNodeId)}`);
  if (report.deadEndNodes.length) lines.push(`  dead-end nodes (no choices/autoNext/terminal): ${JSON.stringify(report.deadEndNodes)}`);
  if (report.duplicateChoiceIds.length) lines.push(`  duplicate choiceId: ${JSON.stringify(report.duplicateChoiceIds)}`);
  if (report.unresolvableChoiceFns.length) lines.push(`  choices() threw on neutral state: ${JSON.stringify(report.unresolvableChoiceFns)}`);
  if (report.selfLoops.length) lines.push(`  self-loop choices (info only, not necessarily an error): ${JSON.stringify(report.selfLoops)}`);
  return lines.join('\n');
}
