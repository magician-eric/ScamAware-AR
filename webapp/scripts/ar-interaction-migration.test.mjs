// Phase 2 coverage suite: is every story surface in the five Scenarios
// actually wired to the AR Interaction Contract?
//
// This is deliberately a different job from the other three AR tools, and it
// does not duplicate any of them:
//
//   audit:ar-interactions          - what interaction risk exists in source
//   test:ar-interactions           - the audit's own regression guard
//   test:gesture-contract          - the contract engine's correctness
//   test:ar-interaction-migration  - THIS: are the five Scenarios fully wired
//
// It does not test DOM buttons, and it must not: the whole point of the
// contract is that geometry is declared semantically, not counted off the
// markup. What it checks is that every surface in the migration inventory
// really declares a contract in its own source, that the inventory and
// docs/ar-interaction-phase2-migration.md agree, that no migrated surface
// declares more than two actions, and - by mounting a representative handful
// of real screens - that the declarations resolve to the geometry the
// inventory claims.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { mountSurface } from './ar-surface-harness.mjs';

import {
  AR_MIGRATION_INVENTORY,
  AR_MIGRATION_EXCLUSIONS,
  AR_MIGRATION_BLOCKERS,
  AR_MIGRATION_GEOMETRY_EXEMPTIONS,
  AR_MIGRATION_MODES,
} from './ar-interaction-migration-inventory.mjs';

const repo = (path) => new URL(`../${path}`, import.meta.url);
const read = (path) => readFile(repo(path), 'utf8');

// Every file that declares a contract, found by walking src/ rather than kept
// in a list beside it: a list would go stale the moment a screen is migrated
// without anyone remembering to add it, which is exactly the failure this
// suite exists to catch.
const SRC_ROOT = fileURLToPath(new URL('../src/', import.meta.url));
async function contractSourceFiles() {
  const found = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, dir);
      if (entry.isDirectory()) { await walk(path); continue; }
      if (!/\.[jt]sx?$/.test(entry.name)) continue;
      const rel = `src/${relative(SRC_ROOT, fileURLToPath(path)).replaceAll('\\', '/')}`;
      if (rel.startsWith('src/lib/arInteraction/')) continue;
      if ((await readFile(path, 'utf8')).includes('useARInteraction')) found.push(rel);
    }
  }
  await walk(new URL('../src/', import.meta.url));
  return found.sort();
}

// Same storage/window shims the gesture-contract suite installs, for the same
// reason: lib/lang.js and the scenario stores read localStorage at import time.
const storage = () => {
  let data = {};
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
    clear: () => { data = {}; },
    get length() { return Object.keys(data).length; },
    key: (i) => Object.keys(data)[i] ?? null,
  };
};
globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
globalThis.window = globalThis.window ?? globalThis;

const {
  AR_GESTURES,
  getCurrentARInteraction,
  performARInteraction,
  resetARInteractionContract,
} = await import('../src/lib/arInteraction/index.js');
const { LEFT, RIGHT } = AR_GESTURES;

const SCENARIOS = ['scenario01', 'scenario02', 'scenario03', 'scenario04', 'scenario05'];


test.beforeEach(() => {
  resetARInteractionContract();
  globalThis.localStorage.clear();
  globalThis.sessionStorage.clear();
});

// ---------------------------------------------------------------------------
// G / H. The inventory itself is legal
// ---------------------------------------------------------------------------
test('G. no migrated surface declares more than two actions', () => {
  const illegal = AR_MIGRATION_INVENTORY.filter((row) => !AR_MIGRATION_MODES.includes(row.mode));
  assert.deepEqual(illegal.map((row) => `${row.surfaceId}: ${row.mode}`), [],
    'the contract has exactly three geometries; "triple" is not one of them');
});

test('G. a dual surface names both sides and a single names only RIGHT', () => {
  for (const row of AR_MIGRATION_INVENTORY) {
    if (row.mode === 'dual') {
      assert.ok(row.left, `${row.surfaceId} is dual but names no LEFT action`);
      assert.ok(row.right, `${row.surfaceId} is dual but names no RIGHT action`);
    }
    if (row.mode === 'single') {
      assert.ok(row.right, `${row.surfaceId} is single but names no RIGHT action`);
      assert.equal(row.left, null, `${row.surfaceId} is single, so it has no LEFT at all`);
    }
    if (row.mode === 'display') {
      assert.equal(row.left, null, `${row.surfaceId} is display and must expose nothing`);
      assert.equal(row.right, null, `${row.surfaceId} is display and must expose nothing`);
    }
  }
});

test('H. every migrated surface has a stable, non-generated surfaceId', () => {
  for (const row of AR_MIGRATION_INVENTORY) {
    assert.ok(typeof row.surfaceId === 'string' && row.surfaceId.length > 0,
      `${row.file} has a migrated surface with no surfaceId`);
    assert.doesNotMatch(row.surfaceId, /\d{10,}|Math\.random|::r\d/,
      `${row.surfaceId} looks generated; surfaceIds must be stable debug ids`);
    assert.ok(row.file.startsWith('src/'), `${row.surfaceId} must name the file that declares it`);
  }
});

// ---------------------------------------------------------------------------
// A. Every migrated area exercises the geometries it should
// ---------------------------------------------------------------------------
test('A. all five scenarios declare display, single and dual', () => {
  const exempt = new Set(AR_MIGRATION_GEOMETRY_EXEMPTIONS.map((e) => `${e.scenario}/${e.mode}`));
  for (const scenario of SCENARIOS) {
    const modes = new Set(AR_MIGRATION_INVENTORY.filter((r) => r.scenario === scenario).map((r) => r.mode));
    for (const mode of AR_MIGRATION_MODES) {
      if (exempt.has(`${scenario}/${mode}`)) continue;
      assert.ok(modes.has(mode), `${scenario} has no '${mode}' surface and no documented reason`);
    }
  }
});

test('A. a missing geometry is only allowed with a written reason', () => {
  for (const exemption of AR_MIGRATION_GEOMETRY_EXEMPTIONS) {
    assert.ok(AR_MIGRATION_MODES.includes(exemption.mode));
    assert.ok(exemption.reason && exemption.reason.length > 20,
      `${exemption.scenario}/${exemption.mode} needs a real reason, not a placeholder`);
  }
});

// ---------------------------------------------------------------------------
// B / C / D. The shared surfaces are declared once, in the shared component
// ---------------------------------------------------------------------------
const sharedRow = (surfaceId) => AR_MIGRATION_INVENTORY.find((r) => r.surfaceId === surfaceId);

test('B. the shared Outcome declares single, in the shared component only', async () => {
  const row = sharedRow('shared/outcome');
  assert.equal(row.mode, 'single');
  assert.equal(row.file, 'src/components/outcome/ScenarioOutcome.jsx');
  // No Scenario repeats it: no outcome page of its own declares a contract.
  for (const page of [
    'src/pages/scenario01/ScammedResult.jsx', 'src/pages/scenario01/StoppedResult.jsx',
    'src/pages/scenario02/ScammedResult.jsx', 'src/pages/scenario02/StoppedResult.jsx',
    'src/pages/scenario03/Ending.jsx', 'src/pages/scenario04/OutcomeResult.jsx',
    'src/pages/scenario05/EndingCaught.jsx', 'src/pages/scenario05/EndingScammed.jsx',
  ]) {
    assert.ok(!(await read(page)).includes('useARInteraction'),
      `${page} must not declare its own contract - the shared Outcome owns it`);
  }
});

test('C. the shared FraudClueAnalysis declares single, in the shared component only', async () => {
  const row = sharedRow('shared/fraud-clue-analysis');
  assert.equal(row.mode, 'single');
  assert.equal(row.file, 'src/components/outcome/FraudClueAnalysis.jsx');
  for (const page of [
    'src/pages/scenario01/Analysis.jsx', 'src/pages/scenario02/RiskAnalysis.jsx',
    'src/pages/scenario03/Analysis.jsx', 'src/pages/scenario04/Ending.jsx',
    'src/pages/scenario05/Reveal.jsx',
  ]) {
    assert.ok(!(await read(page)).includes('useARInteraction'),
      `${page} must not declare its own contract - the shared analysis owns it`);
  }
});

test('D. the shared quiz is dual before an answer and single after', async () => {
  assert.equal(sharedRow('shared/anti-fraud-quiz').mode, 'dual');
  assert.equal(sharedRow('shared/anti-fraud-quiz-answered').mode, 'single');
  for (const page of [
    'src/pages/scenario01/Quiz.jsx', 'src/pages/scenario02/Quiz.jsx',
    'src/pages/scenario03/Quiz.jsx', 'src/pages/scenario04/Quiz.jsx',
    'src/pages/scenario05/Quiz.jsx',
  ]) {
    assert.ok(!(await read(page)).includes('useARInteraction'),
      `${page} must not re-declare the quiz contract`);
  }
});

// ---------------------------------------------------------------------------
// Source cross-check: the inventory describes what the code really does
// ---------------------------------------------------------------------------
test('every inventory row is declared in the file it names', async () => {
  const missing = [];
  for (const row of AR_MIGRATION_INVENTORY) {
    const source = await read(row.file);
    if (!source.includes('useARInteraction')) missing.push(`${row.file}: no useARInteraction call`);
    // A surfaceId handed in as a prop lives in the file that mounts the
    // component, not in the one that declares the contract.
    const named = await read(row.namedIn ?? row.file);
    if (!named.includes(row.sourceToken)) {
      missing.push(`${row.namedIn ?? row.file}: does not name ${row.sourceToken}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('every surfaceId in the source tree is in the inventory', async () => {
  const sources = await contractSourceFiles();
  const tokens = new Set(AR_MIGRATION_INVENTORY.map((row) => row.sourceToken));
  AR_MIGRATION_INVENTORY.forEach((row) => { if (row.namedIn) tokens.add(row.surfaceId); });
  const unlisted = [];
  for (const file of sources) {
    const source = await read(file);
    for (const match of source.matchAll(/surfaceId:\s*(`[^`]*`|'[^']*'|"[^"]*")/g)) {
      const token = match[1].slice(1, -1);
      if (!tokens.has(token)) unlisted.push(`${file}: ${token}`);
    }
  }
  assert.deepEqual(unlisted, [],
    'a surface declared in code but absent from the inventory is an un-inventoried migration');
});

test('every file that declares a contract appears in the inventory', async () => {
  const sources = await contractSourceFiles();
  const declared = new Set(AR_MIGRATION_INVENTORY.map((row) => row.file));
  const unlisted = sources.filter((file) => !declared.has(file));
  assert.deepEqual(unlisted, [],
    'a file that declares a contract but is absent from the inventory is an un-inventoried migration');
});

// ---------------------------------------------------------------------------
// E. Every exactly-two player choice is dual
// ---------------------------------------------------------------------------
test('E. scenario02 player replies are all two-option, and all declared dual', async () => {
  const { MINI_ARCS } = await import('../src/pages/scenario02/DatingBrowse.jsx');
  const { buildNodes: datingChatNodes } = await import('../src/pages/scenario02/DatingChat.jsx');
  const { buildNodes: privateChatNodes } = await import('../src/pages/scenario02/PrivateChat.jsx');
  for (const [id, arc] of Object.entries(MINI_ARCS)) {
    assert.equal(arc.choices.length, 2, `${id} is not a two-option reply`);
  }
  for (const node of [...datingChatNodes('zh'), ...privateChatNodes('zh')].filter((n) => n.choice)) {
    assert.equal(node.options.length, 2, `${node.id} is not a two-option reply`);
  }
  for (const surfaceId of [
    'scenario02/dating-chat/choice', 'scenario02/private-chat/choice',
    'scenario02/mini-match/<cardId>/reply',
  ]) {
    assert.equal(AR_MIGRATION_INVENTORY.find((r) => r.surfaceId === surfaceId).mode, 'dual');
  }
});

test('E. scenario03 dialogue moments are two-option, and declared dual', async () => {
  const { getScenario03Choices } = await import('../src/data/scenario03Choices.js');
  const moments = getScenario03Choices();
  const keys = Object.keys(moments);
  assert.ok(keys.length > 0, 'scenario03 must still ask the player something');
  for (const key of keys) {
    assert.equal(moments[key].options.length, 2, `${key} is not a two-option moment`);
  }
  for (const surfaceId of [
    'scenario03/call-stage1/<momentKey>', 'scenario03/line-intro/<momentKey>',
    'scenario03/prosecutor-call/<momentKey>',
  ]) {
    assert.equal(AR_MIGRATION_INVENTORY.find((r) => r.surfaceId === surfaceId).mode, 'dual');
  }
});

test('E. no scenario04 / scenario05 dialogue node exceeds two options except the listed blocker', async () => {
  const { buildHealthDialogueTree } = await import('../src/data/dialogueTrees/health.js');
  const { buildLuckyBagDialogueTree } = await import('../src/data/dialogueTrees/luckyBag.js');
  const { buildDelayTree } = await import('../src/data/dialogueTrees/delay.js');
  const { buildReturnAckTree } = await import('../src/data/dialogueTrees/returnAck.js');
  const { buildPlatformSupportTree } = await import('../src/data/dialogueTrees/platformSupport.js');
  const { buildBuyerTree } = await import('../src/data/scenario05Dialogues.js');

  const trees = [
    buildHealthDialogueTree('zh'), buildLuckyBagDialogueTree('zh'),
    buildDelayTree('health', 'zh'), buildDelayTree('luckyBag', 'zh'),
    buildReturnAckTree('health', 'zh'), buildReturnAckTree('luckyBag', 'zh'),
    buildPlatformSupportTree('zh'),
    buildBuyerTree({ id: 'tablet', name: '平板', price: 'NT$3,000' }, 'zh'),
    buildBuyerTree({ id: 'stroller', name: '推車', price: 'NT$2,000' }, 'zh'),
  ];
  const overflowing = [];
  for (const tree of trees) {
    for (const node of tree) {
      const choices = typeof node.choices === 'function'
        ? node.choices({ dialogueHistory: [], evidenceSaved: [], warningFlags: [] }, [])
        : node.choices;
      if (Array.isArray(choices) && choices.length > 2) {
        overflowing.push(`${node.id}: ${choices.length} options`);
      }
    }
  }
  // No exception list, on purpose: there is no gesture to run a third reply,
  // so a node with one is a prompt the player cannot answer on the glasses.
  assert.deepEqual(overflowing, [], 'a player prompt may never offer more than two replies');
});

test('E. the platform-support argument is a two-way pick that both ways fails', async () => {
  const { buildPlatformSupportTree } = await import('../src/data/dialogueTrees/platformSupport.js');
  for (const lang of ['zh', 'en', 'jp']) {
    const nodes = Object.fromEntries(buildPlatformSupportTree(lang).map((n) => [n.id, n]));
    const pick = nodes['shared.platform.agent.argue.pick'];
    assert.ok(pick, 'the 繼續要求平台負責 branch must still exist');
    assert.equal(pick.choices.length, 2, `argue.pick must offer exactly two replies [${lang}]`);
    assert.deepEqual(pick.choices.map((c) => c.id), ['blamePlatform', 'askDirectRefund']);
    // Both surviving replies keep their own reply node, and both still land on
    // the same failure stub - narrowing the pick changed no branch.
    for (const choice of pick.choices) {
      const reply = nodes[choice.nextNodeId];
      assert.ok(reply, `${choice.id} must still have its own reply node [${lang}]`);
      assert.equal(reply.autoNextNodeId, 'shared.platform.toResultFail');
    }
    assert.ok(!nodes['shared.platform.agent.argue.replyB'], 'the removed reply node must be gone');
  }
});

test('E. there are no AR-readiness blockers left', () => {
  assert.deepEqual(AR_MIGRATION_BLOCKERS, [],
    'a blocker means a flow cannot be finished by gesture; Phase 2 is not complete while one stands');
});

test('E. a chat screen binds two replies to two gestures, and never invents a third', async () => {
  for (const screen of [
    'src/pages/scenario04/SellerChat.jsx', 'src/pages/scenario04/DisputeChat.jsx',
    'src/pages/scenario04/ReturnAckChat.jsx', 'src/pages/scenario04/RefundDelayChat.jsx',
    'src/pages/scenario04/PlatformSupportChat.jsx', 'src/pages/scenario05/BuyerChat.jsx',
  ]) {
    const source = await read(screen);
    assert.match(source, /pendingChoices\?\.length === 2/, `${screen} must declare dual off the engine`);
    assert.ok(!source.includes('pendingChoices[2]'), `${screen}: there is no third gesture`);
  }
});

// ---------------------------------------------------------------------------
// Scenario 03: the prosecutor -> officer callback flow (#326)
// ---------------------------------------------------------------------------
test('S03. the case site has no handoff overlay surface any more', async () => {
  const listed = AR_MIGRATION_INVENTORY.filter((row) => row.surfaceId.includes('case-site/handoff'));
  assert.deepEqual(listed, [], 'the 檢察官來電確認 overlay is gone; its surface must not come back');
  const source = await read('src/pages/scenario03/CaseSite.jsx');
  assert.ok(!source.includes('handoff'), 'CaseSite must not re-introduce a handoff overlay or its contract');
});

test('S03. the officer callback is a second incoming call the player answers', async () => {
  const answer = AR_MIGRATION_INVENTORY.find((row) => row.surfaceId === 'scenario03/police-callback/answer');
  assert.ok(answer, 'the officer callback must declare its own ring screen');
  assert.equal(answer.mode, 'single');
  assert.equal(answer.right, '接聽');
  assert.equal(answer.left, null, 'a ring screen has no LEFT: 接聽 is the only action');

  const inCall = AR_MIGRATION_INVENTORY.find((row) => row.surfaceId === 'scenario03/police-callback');
  assert.equal(inCall.mode, 'display', 'once answered, the officer talks and nothing waits on the player');

  // The old flow is not merely unused - it must not be described anywhere.
  for (const text of [
    await read('src/pages/scenario03/PoliceCallback.jsx'),
    await read('scripts/ar-interaction-migration-inventory.mjs'),
    await read('../docs/ar-interaction-phase2-migration.md'),
  ]) {
    assert.ok(!text.includes('warm transfer'), 'the callback is not a warm transfer any more');
    assert.ok(!text.includes('同一通電話的轉接'), 'the callback is a separate call, not a transfer');
    assert.ok(!text.includes('玩家沒有接聽'), 'the player does answer this call');
  }
});

test('S03. the ring screen offers RIGHT only, and answering turns the screen into display', async () => {
  // scenario03 keeps its run state in sessionStorage; the callback's mount
  // guard only lets the call ring when the prosecutor's call really finished.
  globalThis.sessionStorage.setItem('cibar-scenario03-state', JSON.stringify({
    prosecutorCallCompleted: true,
    policeCallbackStatus: 'idle',
  }));
  const { PoliceCallback } = await import('../src/pages/scenario03/PoliceCallback.jsx');
  const mounted = mountSurface(PoliceCallback);

  const ringing = getCurrentARInteraction();
  assert.equal(ringing.surfaceId, 'scenario03/police-callback/answer');
  assert.equal(ringing.mode, 'single');
  assert.equal(ringing.leftAvailable, false);
  assert.equal(ringing.rightAvailable, true);
  assert.equal(performARInteraction(LEFT), false, 'LEFT must not answer, decline or anything else');

  assert.equal(performARInteraction(RIGHT), true, 'RIGHT answers the call');
  const inCall = getCurrentARInteraction();
  assert.equal(inCall.surfaceId, 'scenario03/police-callback');
  assert.equal(inCall.mode, 'display');
  assert.equal(inCall.rightAvailable, false, 'the call cannot be answered twice');
  mounted.unmount();
});

test('S03. the two narration-only scripts still carry no choice beat', async () => {
  const { SCENARIO03_SCRIPTS } = await import('../src/data/scenario03Dialogues.js');
  // PoliceCallback and LineCustody declare no `dual` geometry because neither
  // script asks the player anything. If that ever changes, this fails here
  // rather than silently leaving a prompt no gesture can answer.
  for (const key of ['policeCallback', 'lineCustody', 'lineCustodyAccount', 'bankGuide']) {
    const steps = SCENARIO03_SCRIPTS[key] ?? [];
    const choices = steps.filter((step) => typeof step !== 'string');
    assert.deepEqual(choices, [], `${key} gained a choice beat - its screen now needs a dual contract`);
  }
});

// ---------------------------------------------------------------------------
// F. Representative single-CTA surfaces, live
// ---------------------------------------------------------------------------
test('F. the shared entry briefing resolves to a single RIGHT action', async () => {
  const { ScenarioEntryBriefing } = await import('../src/components/ui/ScenarioEntryBriefing.jsx');
  const mounted = mountSurface(ScenarioEntryBriefing, {
    entryId: 'investment', scenarioId: 'scenario-01',
    startRoute: '/scenario01-investment/feed', description: 'x',
  });
  const snapshot = getCurrentARInteraction();
  assert.equal(snapshot.mode, 'single');
  assert.equal(snapshot.surfaceId, 'shared/scenario-entry-briefing');
  assert.equal(snapshot.leftAvailable, false);
  assert.equal(snapshot.rightAvailable, true);
  assert.equal(performARInteraction(LEFT), false);
  mounted.unmount();
});

test('F. the shared Outcome and analysis resolve to a single RIGHT action', async () => {
  const { ScenarioOutcome } = await import('../src/components/outcome/ScenarioOutcome.jsx');
  const outcome = mountSurface(ScenarioOutcome, {
    scenarioId: 'romance', state: 'scammed', title: 'x', analysisTo: '/x',
  });
  assert.equal(getCurrentARInteraction().mode, 'single');
  assert.equal(getCurrentARInteraction().surfaceId, 'shared/outcome');
  assert.equal(performARInteraction(LEFT), false);
  assert.equal(performARInteraction(RIGHT), true);
  outcome.unmount();

  const { FraudClueAnalysis } = await import('../src/components/outcome/FraudClueAnalysis.jsx');
  const analysis = mountSurface(FraudClueAnalysis, {
    scenarioId: 'romance', clues: [{ title: 'x' }], quizTo: '/y',
  });
  assert.equal(getCurrentARInteraction().mode, 'single');
  assert.equal(getCurrentARInteraction().surfaceId, 'shared/fraud-clue-analysis');
  assert.equal(performARInteraction(LEFT), false);
  assert.equal(performARInteraction(RIGHT), true);
  analysis.unmount();
});

// The 先傳簡訊查證 off-ramp is gone, so this ring screen carries 接聽 alone -
// `single`, with no LEFT at all, matching the prosecutor's and the officer's
// own ring screens. It used to be the scenario's one dual ring screen.
test('F. scenario03 IncomingCall resolves to its declared single, RIGHT = 接聽', async () => {
  const { IncomingCall } = await import('../src/pages/scenario03/IncomingCall.jsx');
  const mounted = mountSurface(IncomingCall);
  const snapshot = getCurrentARInteraction();
  assert.equal(snapshot.mode, 'single');
  assert.equal(snapshot.surfaceId, 'scenario03/incoming-call');
  assert.equal(snapshot.leftAvailable, false);
  assert.equal(snapshot.rightAvailable, true);
  mounted.unmount();
});

test('F. scenario05 ShopCreate goes inactive while its CTA is disabled', async () => {
  globalThis.localStorage.setItem('cibar-scenario05-state', JSON.stringify({ selectedProduct: 'tablet' }));
  const { ShopCreate } = await import('../src/pages/scenario05/ShopCreate.jsx');
  const mounted = mountSurface(ShopCreate);
  const before = getCurrentARInteraction();
  assert.equal(before.surfaceId, 'scenario05/shop-create');
  assert.equal(before.mode, 'single');
  assert.equal(performARInteraction(RIGHT), true);
  // submit() flips phase away from 'idle', which is exactly when the button
  // becomes disabled - the contract has to go inactive with it.
  const after = getCurrentARInteraction();
  assert.equal(after.mode, 'display');
  assert.equal(after.rightAvailable, false);
  assert.equal(performARInteraction(RIGHT), false);
  mounted.unmount();
});

test('F. leaving a surface leaves nothing behind for a gesture to reach', async () => {
  const { ScenarioOutcome } = await import('../src/components/outcome/ScenarioOutcome.jsx');
  const mounted = mountSurface(ScenarioOutcome, {
    scenarioId: 'romance', state: 'scammed', title: 'x', analysisTo: '/x',
  });
  assert.equal(getCurrentARInteraction().rightAvailable, true);
  mounted.unmount();
  const snapshot = getCurrentARInteraction();
  assert.equal(snapshot.mode, 'display');
  assert.equal(snapshot.surfaceId, null);
  assert.equal(performARInteraction(LEFT), false);
  assert.equal(performARInteraction(RIGHT), false);
});

// ---------------------------------------------------------------------------
// The inventory and the document say the same thing
// ---------------------------------------------------------------------------
test('docs/ar-interaction-phase2-migration.md lists every migrated surface', async () => {
  const doc = await read('../docs/ar-interaction-phase2-migration.md');
  const missing = AR_MIGRATION_INVENTORY
    .filter((row) => !doc.includes(row.surfaceId))
    .map((row) => row.surfaceId);
  assert.deepEqual(missing, [], 'the migration document must list every surface the inventory holds');
});

test('docs/ar-interaction-phase2-migration.md records the exclusions and blockers', async () => {
  const doc = await read('../docs/ar-interaction-phase2-migration.md');
  for (const exclusion of AR_MIGRATION_EXCLUSIONS) {
    assert.ok(doc.includes(exclusion.file), `the document must say why ${exclusion.file} is out of scope`);
  }
  for (const blocker of AR_MIGRATION_BLOCKERS) {
    assert.ok(doc.includes(blocker.node), `the document must name the blocker ${blocker.node}`);
  }
});

// ---------------------------------------------------------------------------
// The contract stays what it is
// ---------------------------------------------------------------------------
test('no migrated surface reaches for the DOM, a camera or a gesture SDK', async () => {
  const sources = await contractSourceFiles();
  const banned = [
    /querySelector/, /getElementById/, /\.click\(\)/, /data-gesture-/,
    /MediaPipe/i, /handTracking/i, /getUserMedia/, /\bwindow\.location\b/,
  ];
  const offences = [];
  for (const file of sources) {
    const source = await read(file);
    for (const pattern of banned) {
      if (pattern.test(source)) offences.push(`${file}: ${pattern}`);
    }
  }
  assert.deepEqual(offences, []);
});
