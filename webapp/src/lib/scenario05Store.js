import { useState } from 'react';
import { resolveCast } from '../experience/characters/casting';

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
};

export function getScenario05State() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : { ...DEFAULT_STATE };
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
