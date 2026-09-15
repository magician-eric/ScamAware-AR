import { useEffect, useMemo, useRef, useState } from 'react';
import {
  applyEffects,
  markChoiceAsked,
  getAskedChoiceIds,
  saveShoppingState,
  saveDialogueCheckpoint,
  loadDialogueCheckpoint,
  getShoppingState,
} from '../../lib/shoppingStore';

// ---------------------------------------------------------------------------
// Scenario04 dialogue data shapes (plain JS + JSDoc - this project is a plain
// Vite+React JS app, not a TS one, so these are documentation, not compiled
// types; see webapp/README.md).
//
// @typedef {'seller'|'buyer'|'platform'|'system'} Speaker
//
// @typedef {Object} DialogueEffect
// @property {number} [trust] @property {number} [suspicion] @property {number} [evidence]
// @property {number} [urgency] @property {number} [assertiveness] @property {number} [sellerPressure]
// @property {boolean} [platformCaseCreated]
// @property {string[]} [evidenceSaved] @property {string[]} [warningFlags]
//
// @typedef {Object} DialogueChoice
// @property {string} id @property {string} label @property {string} [playerMessage]
// @property {string} nextNodeId @property {DialogueEffect} [effects]
// @property {boolean} [skipRead] - this reply only ever shows "已送達", never "已讀"
// @property {(state: object) => boolean} [visibleWhen]
// @property {(state: object) => boolean} [disabledWhen]
//
// @typedef {Object} DialogueMessage
// @property {string} id @property {Speaker} speaker @property {string} text
// @property {number} [delay] @property {'text'|'product-card'|'image'|'system'|'checklist'} [type]
// @property {string} [assetKey] @property {any} [data]
//
// @typedef {Object} DialogueNode
// @property {string} id @property {'health'|'luckyBag'|'shared'} route
// @property {string} phase
// @property {DialogueMessage[]} messages
// @property {DialogueChoice[] | ((state: object, asked: string[]) => DialogueChoice[])} [choices]
// @property {boolean} [hub] - choices come from an evolving "ask another question" menu; asked ids persist
// @property {string} [autoNextNodeId]
// @property {DialogueEffect} [onEnterEffects]
// @property {boolean} [terminal]
// @property {boolean} [noReadReceipt]
// ---------------------------------------------------------------------------

const DEFAULT_WAITS = {
  seller: [1200, 1500],
  sellerDelay: [1800, 2400],
  platform: [1400, 1400],
  buyer: [0, 0],
  system: [600, 600],
};

function randomWait([min, max]) {
  return min + Math.random() * Math.max(0, max - min);
}

/**
 * Generic branching-chat engine for every scenario04 conversation (seller
 * pre-sale, seller dispute/delay, BlackPi platform support, 165 hotline).
 * `screenKey` identifies the CONVERSATION, not the screen: screens that talk
 * to the same person share one key so the history is continuous (see the
 * `resumable` note below). A mid-chat refresh resumes instead of replaying.
 */
export function useDialogueEngine(nodesById, startNodeId, { screenKey, waits, autoStart = true } = {}) {
  const waitTable = { ...DEFAULT_WAITS, ...(waits || {}) };
  const checkpoint = useMemo(() => (screenKey ? loadDialogueCheckpoint(screenKey) : null), [screenKey]);

  // One conversation can span several screens: the seller thread runs from
  // pre-sale through the dispute, the return acknowledgement and the refund
  // delay, and all of those are the same shop. They share a screenKey so the
  // history stays continuous, which means the saved checkpoint may point at a
  // node belonging to an earlier screen's tree.
  //
  // "Resumable" therefore means the saved position is a node THIS screen
  // knows: only then is this a mid-chat refresh to be restored. Otherwise the
  // player has walked into the next stage of the same conversation, so the
  // timeline is kept and this stage's opening plays onto the end of it -
  // never a fresh, empty room with the same name at the top.
  const resumable = Boolean(checkpoint?.currentNodeId && nodesById[checkpoint.currentNodeId]);

  const [timeline, setTimeline] = useState(() => checkpoint?.timeline ?? []);
  const [currentNodeId, setCurrentNodeId] = useState(() => (resumable ? checkpoint.currentNodeId : null));
  const [pendingChoices, setPendingChoices] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  // A finished earlier stage must not count as this stage being finished, or
  // the screen would navigate straight back out without playing its messages.
  const [done, setDone] = useState(() => (resumable ? checkpoint.done ?? false : false));
  const [scoreSnapshot, setScoreSnapshot] = useState(() => getShoppingState());
  const startedRef = useRef(false);
  const timeoutsRef = useRef([]);

  function schedule(fn, ms) {
    const t = setTimeout(fn, ms);
    timeoutsRef.current.push(t);
    return t;
  }

  function push(item) {
    setTimeline((prev) => [...prev, { ...item, key: `${prev.length}-${item.kind}` }]);
  }

  function refreshScores() {
    setScoreSnapshot(getShoppingState());
  }

  function evaluateVisibility(list) {
    const state = getShoppingState();
    return (list || []).filter((c) => (c.visibleWhen ? c.visibleWhen(state) : true));
  }

  function resolveChoices(node) {
    const state = getShoppingState();
    const asked = node.hub ? getAskedChoiceIds(node.id) : [];
    const raw = typeof node.choices === 'function' ? node.choices(state, asked) : node.choices;
    return evaluateVisibility(raw).map((c) => ({
      ...c,
      disabled: c.disabledWhen ? c.disabledWhen(state) : false,
    }));
  }

  function resolveMessages(node) {
    return typeof node.messages === 'function' ? node.messages(getShoppingState()) : node.messages || [];
  }

  function renderMessages(node, messages, i, onFinished) {
    if (i >= messages.length) {
      onFinished();
      return;
    }
    const m = messages[i];
    if (m.speaker === 'buyer' || m.speaker === 'system') {
      push({ kind: 'msg', speaker: m.speaker, text: m.text, type: m.type, assetKey: m.assetKey, data: m.data });
      schedule(() => renderMessages(node, messages, i + 1, onFinished), m.delay ?? 500);
      return;
    }
    setIsTyping(true);
    const typingKey = node.phase === 'delay' ? 'sellerDelay' : m.speaker;
    const wait = randomWait(waitTable[typingKey] || waitTable.seller);
    schedule(() => {
      setIsTyping(false);
      push({ kind: 'msg', speaker: m.speaker, text: m.text, type: m.type, assetKey: m.assetKey, data: m.data });
      schedule(() => renderMessages(node, messages, i + 1, onFinished), m.delay ?? 700);
    }, wait);
  }

  function advance(nodeId) {
    setCurrentNodeId(nodeId);
    const node = nodesById[nodeId];
    if (!node) {
      setDone(true);
      return;
    }
    if (node.onEnterEffects) applyEffects(node.onEnterEffects);
    refreshScores();
    renderMessages(node, resolveMessages(node), 0, () => {
      if (node.choices) {
        setPendingChoices(resolveChoices(node));
        return;
      }
      if (node.autoNextNodeId) {
        schedule(() => advance(node.autoNextNodeId), 900);
        return;
      }
      if (node.terminal) {
        setDone(true);
      }
    });
  }

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    if (!autoStart) return undefined;
    if (startedRef.current) return undefined;
    startedRef.current = true;
    if (!resumable) {
      // New stage of this conversation (or a brand new one): append onto
      // whatever history the checkpoint already holds.
      schedule(() => advance(startNodeId), 400);
    } else if (checkpoint.pendingChoicesNodeId && nodesById[checkpoint.pendingChoicesNodeId]) {
      setPendingChoices(resolveChoices(nodesById[checkpoint.pendingChoicesNodeId]));
      setCurrentNodeId(checkpoint.pendingChoicesNodeId);
    } else if (!checkpoint.done) {
      schedule(() => advance(checkpoint.currentNodeId), 400);
    }
    // StrictMode dev double-invokes this effect (mount -> cleanup -> mount);
    // the cleanup below cancels whatever was just scheduled, so startedRef
    // must reset too, or the second mount's guard silently skips
    // rescheduling and the whole conversation never starts.
    return () => {
      timeouts.forEach(clearTimeout);
      startedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist a resumable checkpoint on every timeline change.
  useEffect(() => {
    if (!screenKey) return;
    saveDialogueCheckpoint(screenKey, {
      timeline,
      currentNodeId,
      done,
      pendingChoicesNodeId: pendingChoices ? currentNodeId : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, currentNodeId, done, pendingChoices]);

  function choose(choice) {
    if (!pendingChoices || choice.disabled) return;
    const node = nodesById[currentNodeId];
    setPendingChoices(null);
    if (node?.hub) markChoiceAsked(node.id, choice.id);

    const text = choice.playerMessage || choice.label;
    push({ kind: 'msg', speaker: 'buyer', text, status: 'sending', skipRead: choice.skipRead || node?.noReadReceipt });
    const idx = timeline.length; // index this new message will land at
    schedule(() => {
      setTimeline((prev) => prev.map((it, i) => (i === idx ? { ...it, status: 'delivered' } : it)));
    }, 300);
    if (!(choice.skipRead || node?.noReadReceipt)) {
      schedule(() => {
        setTimeline((prev) => prev.map((it, i) => (i === idx ? { ...it, status: 'read' } : it)));
      }, 300 + 500 + Math.random() * 400);
    }

    if (choice.effects) applyEffects(choice.effects);
    saveShoppingState({
      dialogueHistory: [...getShoppingState().dialogueHistory, { nodeId: currentNodeId, choiceId: choice.id, at: Date.now() }],
    });
    refreshScores();

    schedule(() => advance(choice.nextNodeId), 700);
  }

  function jumpTo(nodeId) {
    setPendingChoices(null);
    schedule(() => advance(nodeId), 200);
  }

  return {
    timeline,
    currentNodeId,
    pendingChoices,
    choose,
    jumpTo,
    isTyping,
    done,
    scoreSnapshot,
  };
}
