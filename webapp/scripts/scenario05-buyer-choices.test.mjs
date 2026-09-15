import assert from 'node:assert/strict';
import test from 'node:test';
import { buildBuyerTree } from '../src/data/scenario05Dialogues.js';

const PRODUCTS = [
  { id: 'tablet', name: '10.9 吋二手平板' },
  { id: 'stroller', name: '輕量型嬰兒手推車' },
];

function followEveryChoice(tree) {
  const nodes = Object.fromEntries(tree.map((node) => [node.id, node]));
  const seen = new Set();

  function visit(nodeId) {
    if (seen.has(nodeId)) return;
    seen.add(nodeId);
    const node = nodes[nodeId];
    assert.ok(node, `missing dialogue node ${nodeId}`);
    for (const choice of node.choices ?? []) {
      assert.ok(choice.nextNodeId, `${nodeId}/${choice.id} has no next node`);
      visit(choice.nextNodeId);
    }
    if (node.autoNextNodeId) visit(node.autoNextNodeId);
    // Redirect targets deliberately leave the in-chat tree.
  }

  visit('buyer.s03.open');
  return { nodes, seen };
}

for (const product of PRODUCTS) {
  test(`${product.id} buyer chat exposes choices and every reply advances`, () => {
    const tree = buildBuyerTree(product, 'zh');
    const { nodes, seen } = followEveryChoice(tree);

    assert.ok(nodes['buyer.s03.open'].choices.length > 0);
    for (const personaNode of tree.filter((node) => node.id.startsWith('buyer.s03.persona'))) {
      assert.equal(personaNode.choices.length, 2, `${personaNode.id} must use shared two-reply UI`);
      assert.ok(personaNode.choices.every((choice) => nodes[choice.nextNodeId]));
    }
    assert.ok(seen.has('buyer.s03.tradePref'), 'both persona branches must merge into the trade-site storyline');
    assert.equal(nodes['buyer.s04.open'].choices.length, 2);
  });
}

test('stroller no longer inherits the tablet-only persona3 refresh checkpoint', async () => {
  const storage = new Map();
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  globalThis.sessionStorage = globalThis.localStorage;

  const { clearDialogueCheckpoint, loadDialogueCheckpoint, saveDialogueCheckpoint } =
    await import('../src/lib/scenario05Store.js');
  saveDialogueCheckpoint('buyer', {
    currentNodeId: 'buyer.s03.persona3',
    pendingChoicesNodeId: 'buyer.s03.persona3',
    timeline: [],
  });
  assert.equal(loadDialogueCheckpoint('buyer').pendingChoicesNodeId, 'buyer.s03.persona3');

  clearDialogueCheckpoint('buyer');
  assert.equal(loadDialogueCheckpoint('buyer'), null);
  const strollerOpen = buildBuyerTree(PRODUCTS[1], 'zh').find((node) => node.id === 'buyer.s03.open');
  assert.ok(strollerOpen.choices.length > 0, 'a refreshed stroller thread restarts with quick replies');
});
