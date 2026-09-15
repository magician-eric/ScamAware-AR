import { useEffect, useMemo, useRef, useState } from 'react';
import { saveDialogueCheckpoint, loadDialogueCheckpoint, saveScenario05State } from '../../lib/scenario05Store';

// ---------------------------------------------------------------------------
// Scenario05 dialogue data shapes (plain JS + JSDoc, same convention as
// scenario04's features/shopping/dialogueEngine.js - this project is a plain
// Vite+React JS app, not TS).
//
// @typedef {'buyer'|'system'|'me'} Speaker
//
// @typedef {Object} DialogueMessage
// @property {Speaker} speaker @property {string} text @property {number} [delay]
// @property {string} [type] - MyDonDon chat: 'timestamp'|'link-card'.
// @property {any} [data]
//
// @typedef {Object} DialogueChoice
// @property {string} id @property {string} label @property {string} [playerMessage]
// @property {string} [nextNodeId] @property {string} [awareness] - key recorded to
//   scenario05Store so the identify-ending page can name the exact moment
//
// @typedef {Object} DialogueNode
// @property {string} id
// @property {DialogueMessage[]} [messages]
// @property {DialogueChoice[]} [choices]
// @property {string} [autoNextNodeId]
// @property {string} [redirectTo] - route to hand off to (e.g. the fake
//   trading site's shop-create form, MyDonDon's own order list, or real
//   黑皮通 shipping) - reaching this node persists the checkpoint and stops
//   advancing without marking the engine "done", so a remount later can
//   resume past it via `resumeNodeId`
// @property {string} [resumeNodeId] - node to resume at once the page the
//   player was sent to comes back and remounts this same screenKey
// @property {boolean} [terminal]
// ---------------------------------------------------------------------------

const TYPING_WAIT = { buyer: [300, 450] };

function randomWait([min, max]) {
  return min + Math.random() * Math.max(0, max - min);
}

/**
 * Branching-chat engine shared by scenario05's buyer chat and fake-CS chat.
 * `screenKey` scopes the sessionStorage checkpoint so a mid-chat refresh
 * resumes instead of replaying, and so a trip out to a sub-app page (see
 * `redirectTo`/`resumeNodeId` on the node shape above) comes back to the
 * right spot in the same conversation.
 */
export function useDialogueEngine(nodesById, startNodeId, { screenKey, onRedirect } = {}) {
  const checkpoint = useMemo(() => (screenKey ? loadDialogueCheckpoint(screenKey) : null), [screenKey]);

  const [timeline, setTimeline] = useState(() => checkpoint?.timeline ?? []);
  const [currentNodeId, setCurrentNodeId] = useState(() => checkpoint?.currentNodeId ?? null);
  const [pendingChoices, setPendingChoices] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const startedRef = useRef(false);
  const timeoutsRef = useRef([]);
  const onRedirectRef = useRef(onRedirect);
  onRedirectRef.current = onRedirect;
  // Mirrors `timeline` synchronously (state updates are async/batched) so the
  // redirect branch below can persist the checkpoint with the just-pushed
  // player bubble included, instead of racing the render/effect cycle.
  const timelineRef = useRef(timeline);

  function schedule(fn, ms) {
    const t = setTimeout(fn, ms);
    timeoutsRef.current.push(t);
    return t;
  }

  function push(item) {
    setTimeline((prev) => {
      const next = [...prev, { ...item, key: `${prev.length}-${item.speaker}` }];
      timelineRef.current = next;
      return next;
    });
  }

  function renderMessages(messages, i, onFinished) {
    if (i >= messages.length) {
      onFinished();
      return;
    }
    const m = messages[i];
    if (m.speaker === 'me' || m.speaker === 'system') {
      push(m);
      schedule(() => renderMessages(messages, i + 1, onFinished), m.delay ?? 550);
      return;
    }
    setIsTyping(true);
    const wait = randomWait(TYPING_WAIT[m.speaker] || TYPING_WAIT.buyer);
    schedule(() => {
      setIsTyping(false);
      push(m);
      schedule(() => renderMessages(messages, i + 1, onFinished), m.delay ?? 400);
    }, wait);
  }

  function advance(nodeId) {
    const node = nodesById[nodeId];
    if (!node) return;

    if (node.redirectTo) {
      // Deliberately skip setCurrentNodeId here: the generic persist effect
      // below reacts to that state and would otherwise overwrite this
      // synchronous save's resumeNodeId with null on the very next commit,
      // racing the navigation this triggers.
      saveDialogueCheckpoint(screenKey, { timeline: timelineRef.current, currentNodeId: nodeId, resumeNodeId: node.resumeNodeId ?? null });
      onRedirectRef.current?.(node.redirectTo);
      return;
    }

    setCurrentNodeId(nodeId);
    renderMessages(node.messages || [], 0, () => {
      if (node.choices) {
        setPendingChoices(node.choices);
        return;
      }
      if (node.autoNextNodeId) {
        schedule(() => advance(node.autoNextNodeId), 500);
      }
      // node.terminal (or a node with neither) simply stops here - the page
      // itself decides what "the conversation is over" means for that screen.
    });
  }

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    if (startedRef.current) return undefined;
    startedRef.current = true;
    if (checkpoint?.pendingChoicesNodeId && nodesById[checkpoint.pendingChoicesNodeId]) {
      const node = nodesById[checkpoint.pendingChoicesNodeId];
      setPendingChoices(node.choices);
      setCurrentNodeId(checkpoint.pendingChoicesNodeId);
    } else if (checkpoint?.resumeNodeId && nodesById[checkpoint.resumeNodeId]) {
      schedule(() => advance(checkpoint.resumeNodeId), 500);
    } else if (!checkpoint || !nodesById[checkpoint.currentNodeId]) {
      schedule(() => advance(startNodeId), 400);
    }
    // StrictMode dev double-invokes this effect (mount -> cleanup -> mount);
    // the cleanup below cancels whatever was just scheduled, so startedRef
    // must reset too, or the second mount's guard silently skips
    // rescheduling and the conversation never starts.
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
      pendingChoicesNodeId: pendingChoices ? currentNodeId : null,
      resumeNodeId: null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, currentNodeId, pendingChoices]);

  function choose(choice) {
    if (!pendingChoices) return;
    setPendingChoices(null);
    if (choice.awareness) saveScenario05State({ awarenessKey: choice.awareness });

    // `playerMessage: ''` marks a choice that is a pure action rather than
    // something the player says - the row is the only tappable control on
    // this screen, so "查看 SafeDeal 款項" has to live there even though
    // nothing is being sent. Sending it as a bubble would be wrong twice
    // over: it is not an utterance, and by that point there is no account
    // left to receive it. Omitting playerMessage still falls back to the
    // label, which is what every ordinary reply does.
    const text = choice.playerMessage ?? choice.label;
    if (text) push({ speaker: 'me', text });

    if (choice.nextNodeId) schedule(() => advance(choice.nextNodeId), 700);
  }

  return { timeline, currentNodeId, pendingChoices, choose, isTyping };
}
