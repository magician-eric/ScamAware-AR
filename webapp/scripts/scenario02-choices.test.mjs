// Scenario 02's player replies are all two-option LEFT / RIGHT prompts:
// choice[0] is the guarded/safer answer, choice[1] the more invested one the
// scam relies on. This guards that shape against a three-option reply
// creeping back into any of the three scripts, and pins the one branch
// removal that shape change required (t-choice's old B persuasion detour).
import assert from 'node:assert/strict';
import test from 'node:test';
import { MINI_ARCS } from '../src/pages/scenario02/DatingBrowse.jsx';
import { buildNodes as buildDatingChatNodes } from '../src/pages/scenario02/DatingChat.jsx';
import { buildNodes as buildPrivateChatNodes } from '../src/pages/scenario02/PrivateChat.jsx';

// Every language builds its own copy of the script, so a reply list that only
// went to two options in the zh source would still be caught here.
const LANGS = ['zh', 'en', 'jp'];

function choiceNodes(nodes) {
  return nodes.filter((node) => node.choice);
}

function findNode(nodes, id) {
  return nodes.find((node) => node.id === id);
}

test('DatingBrowse mini-arc replies are two-option', () => {
  const arcs = Object.entries(MINI_ARCS);
  assert.ok(arcs.length > 0, 'DatingBrowse must still offer mini-arc replies');
  for (const [id, arc] of arcs) {
    assert.equal(arc.choices.length, 2, `${id} must offer exactly two replies`);
  }
});

for (const lang of LANGS) {
  test(`DatingChat player replies are two-option [${lang}]`, () => {
    const nodes = choiceNodes(buildDatingChatNodes(lang));
    assert.ok(nodes.length > 0, 'DatingChat must still ask the player something');
    for (const node of nodes) {
      assert.equal(node.options.length, 2, `${node.id} must offer exactly two replies`);
    }
  });

  test(`PrivateChat player replies are two-option [${lang}]`, () => {
    const nodes = choiceNodes(buildPrivateChatNodes(lang));
    assert.ok(nodes.length > 0, 'PrivateChat must still ask the player something');
    for (const node of nodes) {
      assert.equal(node.options.length, 2, `${node.id} must offer exactly two replies`);
    }
  });
}

test('no scenario02 player reply offers three or more options', () => {
  const offenders = [];
  for (const lang of LANGS) {
    for (const [label, nodes] of [
      ['DatingChat', buildDatingChatNodes(lang)],
      ['PrivateChat', buildPrivateChatNodes(lang)],
    ]) {
      for (const node of choiceNodes(nodes)) {
        if (node.options.length >= 3) offenders.push(`${label}/${node.id} [${lang}]`);
      }
    }
  }
  for (const [id, arc] of Object.entries(MINI_ARCS)) {
    if (arc.choices.length >= 3) offenders.push(`DatingBrowse/${id}`);
  }
  assert.deepEqual(offenders, [], 'scenario02 must have no three-choice player replies left');
});

test('t-choice is the two-option LINE invite, guarded reply first', () => {
  const tChoice = findNode(buildDatingChatNodes('zh'), 't-choice');
  assert.ok(tChoice, 't-choice must still exist');
  assert.deepEqual(
    tChoice.options.map((option) => option.label),
    ['我在這邊聊就好啦', '好啊，可以加'],
  );
  // LEFT keeps the player on MeetU first and runs the anti-fraud detour that
  // praises their caution before talking them round; RIGHT joins straight away.
  assert.equal(tChoice.options[0].next, 'c-lead1');
  assert.equal(tChoice.options[1].next, 'join-prompt');
});

test('the old t-choice B persuasion branch is gone, and the C branch is not', () => {
  const nodes = buildDatingChatNodes('zh');
  const ids = new Set(nodes.map((node) => node.id));
  for (const removed of ['b-lead1', 'b-lead2', 'b-choice2', 'b-lead3']) {
    assert.ok(!ids.has(removed), `${removed} belonged to the removed B branch`);
  }
  for (const kept of ['c-lead1', 'c-lead2', 'c-lead3', 'c-choice2', 'c-lead4', 'c-lead5']) {
    assert.ok(ids.has(kept), `${kept} carries the anti-fraud persuasion beat and must stay`);
  }
});

for (const lang of LANGS) {
  test(`DatingChat has no dangling next and no unreachable node [${lang}]`, () => {
    const nodes = buildDatingChatNodes(lang);
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const reached = new Set();

    function visit(id) {
      if (reached.has(id)) return;
      const node = byId.get(id);
      assert.ok(node, `dangling next -> ${id}`);
      reached.add(id);
      for (const option of node.options ?? []) visit(option.next);
      if (node.next) visit(node.next);
    }

    // Both openings: the default one and the alternate used when the player
    // first passed on {datingLead} and later reconsidered.
    visit('dating-time');
    visit('dating-time-initiated');

    const unreachable = nodes.map((node) => node.id).filter((id) => !reached.has(id));
    assert.deepEqual(unreachable, [], 'every DatingChat node must still be reachable');
  });
}
