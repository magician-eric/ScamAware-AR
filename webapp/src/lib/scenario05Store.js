import { useState } from 'react';
import { resolveCast } from '../experience/characters/casting';
import { SCENARIO05_VERIFICATION_AMOUNT } from '../data/scenario05Verification';

// Scenario05 (幽靈訂單 / 假買家騙賣家) state store. Same recipe as
// scenario04's shoppingStore: one JSON blob in localStorage so a refresh or
// closed tab still resumes, plus a sessionStorage-scoped dialogue checkpoint
// per chat screen so leaving to a sub-app page (the fake trading site,
// MyDonDon's own order list, real 黑皮通 shipping) and coming back resumes
// the same conversation instead of replaying it.
const STATE_KEY = 'cibar-scenario05-state';
const KEY_PREFIX = 'cibar-scenario05-';

export const DEFAULT_STATE = {
  selectedProduct: null, // null | 'tablet' | 'stroller'
  // Which buyer was drawn for this run (see data/scenario05Characters.js).
  // Persisted so a refresh or a trip out to another in-world app comes back
  // to the same person - only starting the scenario again redraws.
  buyerId: null,
  characterCast: null,
  // Which safe choice the player made, so the E1 identify-ending page can
  // name the exact moment they caught on (spec section 13's "察覺環節").
  awarenessKey: null,
  scenarioStartedAt: null,
  // Real 黑皮通 shipping status for HpeShip.jsx's montage - 'idle' until the
  // player confirms shipment, then 'shipped' -> 'inTransit' -> 'delivered'.
  // Persisted so a refresh mid-montage or a trip back to it resumes rather
  // than replaying (see apps/hpe-logistics' own HPE_TRACKING_STEPS for the
  // equivalent pattern in scenario04).
  shipStatus: 'idle',
  // The fake shipment code shown on HpeShip.jsx - a random digit string, so
  // it has to be persisted the first time it's generated or it would reroll
  // on every re-render.
  shipmentCodeSuffix: null,
  // --- the fake SafeDeal verification detour -----------------------------
  //
  // Recorded as two independent facts, never as one "was the player scammed"
  // boolean: a run can end having transferred the deposit and still saved the
  // item, which is a different ending from both of the other two and has to
  // be able to say so.
  //
  // verificationPaid  - flipped to true by exactly one action in the whole
  //                     scenario: confirming the simulated transfer on
  //                     pages/scenario05/SafeDealTransfer.jsx. Nothing else
  //                     writes it, and it is never flipped back mid-run.
  // verificationLoss  - 0, or the one centrally-defined amount. Derived from
  //                     verificationPaid on every read (see normalize()), so
  //                     it is an assignment rather than a running total: a
  //                     double tap, a refresh or a replayed navigation cannot
  //                     charge the player twice.
  // verificationStatus- where the fake "金流驗證" got to:
  //                     'notStarted' -> 'requested' (the agent has asked)
  //                     -> 'completed' (the one simulated transfer happened)
  //                     or -> 'refused' (the player said no and stopped).
  // shipmentDecision  - the separate, later decision: null until the player
  //                     answers the buyer's push to ship, then 'stopped' or
  //                     'shipped'.
  verificationPaid: false,
  verificationLoss: 0,
  verificationStatus: 'notStarted',
  shipmentDecision: null,
};

// The only values the four fields above may ever hold. Anything else - a save
// written before this flow existed, a hand-edited blob, a half-finished write
// - is read back as the default rather than rendered, so an old checkpoint
// resumes into a plain screen instead of an impossible one.
const VERIFICATION_STATUSES = ['notStarted', 'requested', 'completed', 'refused'];
const SHIPMENT_DECISIONS = [null, 'stopped', 'shipped'];

// The patch the simulated transfer applies, and the only place verificationPaid
// becomes true. Exported as a value so the screen that owns that one action
// cannot accidentally be written to add a second, different charge.
export const VERIFICATION_DEPOSIT_PAID = Object.freeze({
  verificationPaid: true,
  verificationLoss: SCENARIO05_VERIFICATION_AMOUNT,
  verificationStatus: 'completed',
});

function normalize(state) {
  const verificationPaid = state.verificationPaid === true;
  return {
    ...state,
    verificationPaid,
    // Never accumulated, always derived: "the player transferred the deposit"
    // is the fact, and the amount follows from it. A player who never
    // transferred can therefore never be shown a deposit loss, and a player
    // who did can never be shown two.
    verificationLoss: verificationPaid ? SCENARIO05_VERIFICATION_AMOUNT : 0,
    verificationStatus: VERIFICATION_STATUSES.includes(state.verificationStatus)
      ? state.verificationStatus
      : 'notStarted',
    shipmentDecision: SHIPMENT_DECISIONS.includes(state.shipmentDecision)
      ? state.shipmentDecision
      : null,
  };
}

export function getScenario05State() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return normalize(raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : { ...DEFAULT_STATE });
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveScenario05State(patch) {
  const next = { ...getScenario05State(), ...patch };
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private mode / quota) - state just won't persist.
  }
  return next;
}

// The fake agent has now actually asked for the deposit. Only ever moves the
// status forward off its starting value: a refresh that lands back on the
// same node, or a resume after the transfer, must not walk it backwards.
export function markVerificationRequested() {
  const state = getScenario05State();
  if (state.verificationStatus !== 'notStarted') return state;
  return saveScenario05State({ verificationStatus: 'requested' });
}

// The one simulated transfer in the whole scenario. Guarded here as well as
// in the screen so that a second call - a double tap, a gesture landing on
// top of a tap, a remount - is a no-op rather than a second charge. There is
// no second deposit, no unfreeze fee, no top-up and no re-verification fee
// anywhere in this scenario: this function is the only writer, and it writes
// once.
export function payVerificationDeposit() {
  const state = getScenario05State();
  if (state.verificationPaid) return state;
  return saveScenario05State(VERIFICATION_DEPOSIT_PAID);
}

// The buyer for this run. Normally assigned by getBuyerCast() the first time
// it's read after a product is chosen; persisted so two screens (and a
// refresh) can never disagree.
export function getBuyerId() {
  return getBuyerCast();
}

// The player's own seller identity draws a name only (no visual), gender
// picked fresh per run so both male and female names occur - see
// experience/characters/roles.js. This is product-independent, so it's
// resolved once at reset, before the player has picked what to sell.
function sellerSenderCastRequest() {
  const sellerGender = Math.random() < 0.5 ? 'male' : 'female';
  return { roleId: 'scenario05.sellerSender', slotId: 'sellerSender', gender: sellerGender };
}

// Which fixed marketplace-buyer persona(s) are eligible for each product
// line (see experience/characters/roles.js) - the stroller line has two
// (a coin flip between parents), the tablet line has exactly one.
const BUYER_ROLES_BY_PRODUCT = {
  stroller: ['scenario05.buyerStrollerMom', 'scenario05.buyerStrollerDad'],
  tablet: ['scenario05.buyerTablet'],
};

// The run's cast, resolved lazily and topped up on read so no screen can
// ever render a missing name.
//
// The buyer persona is fixed per product line and cast once: once a persona
// matching the current product is on record, every later read returns it
// unchanged - the coin flip between the two stroller parents never re-rolls
// mid-run. It stays unresolved until a product exists, so a stray call
// before ProductSelect can't roll a persona early.
//
// The seller identity is independent of the product and normally cast by
// resetScenario05() on entry, but it is healed here too: a player who lands
// mid-scenario without passing through the reset (a direct URL, storage
// cleared behind them) would otherwise reach ShopCreate with an empty
// 寄件人 field.
export function getBuyerCast() {
  const state = getScenario05State();
  const roles = { ...(state.characterCast?.roles ?? {}) };
  let changed = false;

  if (roles.sellerSender?.roleId !== 'scenario05.sellerSender') {
    roles.sellerSender = resolveCast('scenario05', [sellerSenderCastRequest()]).roles.sellerSender;
    changed = true;
  }

  const eligibleRoles = BUYER_ROLES_BY_PRODUCT[state.selectedProduct];
  if (eligibleRoles && !eligibleRoles.includes(roles.marketplaceBuyer?.roleId)) {
    const roleId = eligibleRoles[Math.floor(Math.random() * eligibleRoles.length)];
    roles.marketplaceBuyer = resolveCast('scenario05', [{ roleId, slotId: 'marketplaceBuyer' }]).roles.marketplaceBuyer;
    changed = true;
  }

  if (!changed) return state.characterCast;
  const characterCast = { version: 1, scenarioId: 'scenario05', roles };
  // buyerId remains populated as a compatibility alias for old checkpoints.
  return saveScenario05State({ characterCast, buyerId: roles.marketplaceBuyer?.visualId ?? null }).characterCast;
}

export function useScenario05State() {
  const [state, setState] = useState(() => getScenario05State());
  function update(patch) {
    setState(() => saveScenario05State(patch));
  }
  return [state, update];
}

// The single reset entry point - called both from ScenarioMenu on fresh
// entry and from the quiz result's "再次挑戰" button. Sweeps every key by
// prefix (state + every screen's dialogue checkpoint) without touching any
// other scenario's storage.
export function resetScenario05() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(KEY_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(KEY_PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
  // Only the seller identity is cast here - the buyer persona depends on
  // which product gets picked next (see getBuyerCast() above), which hasn't
  // happened yet at scenario entry.
  const characterCast = resolveCast('scenario05', [sellerSenderCastRequest()]);
  return saveScenario05State({
    scenarioStartedAt: Date.now(),
    characterCast,
    buyerId: null,
    shipStatus: 'idle',
    shipmentCodeSuffix: String(Math.floor(1000 + Math.random() * 9000)),
    // Spelled out rather than left to the sweep above: replaying the scenario
    // has to start from "nothing transferred, nothing shipped" even if a
    // future reset stops clearing the state blob wholesale.
    verificationPaid: false,
    verificationLoss: 0,
    verificationStatus: 'notStarted',
    shipmentDecision: null,
  });
}

// Per-chat-screen resumable checkpoint (see features/ghostorder/dialogueEngine.js).
export function saveDialogueCheckpoint(screenKey, checkpoint) {
  try {
    sessionStorage.setItem(`${KEY_PREFIX}chat-${screenKey}`, JSON.stringify(checkpoint));
  } catch {
    // ignore
  }
}

// A listing starts a new buyer thread. Clear only that conversation when the
// player picks a product so a checkpoint from a different listing cannot be
// interpreted against the new product's (slightly different) persona tree.
export function clearDialogueCheckpoint(screenKey) {
  try {
    sessionStorage.removeItem(`${KEY_PREFIX}chat-${screenKey}`);
  } catch {
    // ignore
  }
}

// Re-points a saved conversation at a different resume node. Used when the
// player backs out of a website instead of finishing what they went there to
// do (e.g. leaving the fake trading site's shop form without creating the
// shop): the chat has to pick up somewhere that matches what actually
// happened, rather than resuming at "賣場建立成功".
export function setDialogueResume(screenKey, nodeId) {
  const checkpoint = loadDialogueCheckpoint(screenKey);
  if (!checkpoint) return;
  saveDialogueCheckpoint(screenKey, { ...checkpoint, resumeNodeId: nodeId, pendingChoicesNodeId: null });
}

export function loadDialogueCheckpoint(screenKey) {
  try {
    const raw = sessionStorage.getItem(`${KEY_PREFIX}chat-${screenKey}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
