import { useEffect, useState } from 'react';
import { resolveCast } from '../experience/characters/casting';

// Tracks which page the player last reached, purely for the reset checklist
// below (resetScenario02() clears it along with everything else) - nothing
// reads it back to offer a "resume" UI. A mid-scenario browser refresh
// already lands back on the right page for free, since the route itself
// lives in the URL (HashRouter), not in this value.
const KEY = 'cibar-scenario02-progress';

export function saveScenario02Progress(route) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ route, updatedAt: Date.now() }));
  } catch {
    // localStorage unavailable (private mode, quota) - progress just won't persist.
  }
}

// Call from every scenario02 page (except Briefing).
export function useSaveScenario02Progress(route) {
  useEffect(() => {
    saveScenario02Progress(route);
  }, [route]);
}

// Which of datingCandidate01/datingCandidate02's mini-arcs the player has already resolved (matched
// -> chatted -> she ended it), so returning to /dating-browse resumes at
// the next unresolved card instead of restarting from datingCandidate01.
const RESOLVED_KEY = 'cibar-scenario02-dating-resolved';

export function getResolvedDatingCards() {
  try {
    const raw = localStorage.getItem(RESOLVED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markDatingCardResolved(id) {
  try {
    const current = getResolvedDatingCards();
    if (!current.includes(id)) {
      localStorage.setItem(RESOLVED_KEY, JSON.stringify([...current, id]));
    }
  } catch {
    // localStorage unavailable - progress just won't persist.
  }
}

// How the player ended up talking to datingLead - null (not reached yet),
// 'liked' (swiped her directly), 'reconsidered' (skipped her, then looked
// at her "someone liked you" notice and opened the chat anyway), or
// 'simulation' (skipped her and explicitly declined, entering the
// educational case-study path instead). DatingChat reads this to pick its
// opening line/banner. Stored rather than passed only via router location
// state, since location state doesn't survive a hard refresh.
const EMILY_DECISION_KEY = 'cibar-scenario02-emily-decision';
const DATING_LEAD_DECISION_KEY = 'cibar-scenario02-dating-lead-decision';

export function saveDatingLeadDecision(decision) {
  try {
    localStorage.setItem(DATING_LEAD_DECISION_KEY, decision);
  } catch {
    // ignore
  }
}

export function getDatingLeadDecision() {
  try {
    return localStorage.getItem(DATING_LEAD_DECISION_KEY) ?? localStorage.getItem(EMILY_DECISION_KEY);
  } catch {
    return null;
  }
}

const CAST_KEY = 'cibar-scenario02-character-cast';
const DATING_ROLES = [
  { roleId: 'scenario02.datingCandidate01' },
  { roleId: 'scenario02.datingCandidate02' },
  { roleId: 'scenario02.datingLead' },
];

export function getScenario02Cast() {
  try {
    const saved = localStorage.getItem(CAST_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.roles?.['scenario02.datingLead']) return parsed;
      // Version-1 migration: discard only the obsolete cast snapshot. Story
      // progress and dialogue checkpoints remain untouched.
      localStorage.removeItem(CAST_KEY);
    }
    const cast = resolveCast('scenario02', DATING_ROLES);
    localStorage.setItem(CAST_KEY, JSON.stringify(cast));
    return cast;
  } catch {
    return resolveCast('scenario02', DATING_ROLES, { rng: () => 0 });
  }
}

// Snapshot of PrivateChat's dialogue right before the player taps the
// investment-link card and leaves for the platform pages - React state alone
// wouldn't survive that unmount, so the chat history and where to resume have
// to be persisted for the round trip back. Cleared once PrivateChat consumes
// it on the way back in, so a later, unrelated visit doesn't restore stale
// history.
const CHECKPOINT_KEY = 'cibar-scenario02-privatechat-checkpoint';

export function savePrivateChatCheckpoint(timeline, resumeId, watchedVideoIds) {
  try {
    sessionStorage.setItem(
      CHECKPOINT_KEY,
      JSON.stringify({ timeline, resumeId, watchedVideoIds: [...watchedVideoIds] }),
    );
  } catch {
    // ignore
  }
}

export function takePrivateChatCheckpoint() {
  try {
    const raw = sessionStorage.getItem(CHECKPOINT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(CHECKPOINT_KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Investment-platform progress, shared across every 幣勝客 BITION page and
// restored on every LINE<->platform switch instead of living in page-local
// state - matches the state shape the scenario requires to survive a full
// unmount (route changes, not just this one component tree). sessionStorage
// (not localStorage) so it resets with the rest of a scenario02 run.
const PLATFORM_STATE_KEY = 'cibar-scenario02-platform-state';

export const DEFAULT_PLATFORM_STATE = {
  route: '/scenario02-romance/platform-home',
  page: 'home',
  scrollPosition: 0,
  registrationCompleted: false,
  termsAccepted: false,
  accountCreated: false,
  depositCompleted: false,
  selectedStrategy: null,
  platformStep: 'idle',
  balance: 0,
  profit: 0,
  withdrawalStep: null,
};

export function getPlatformState() {
  try {
    const raw = sessionStorage.getItem(PLATFORM_STATE_KEY);
    return raw ? { ...DEFAULT_PLATFORM_STATE, ...JSON.parse(raw) } : { ...DEFAULT_PLATFORM_STATE };
  } catch {
    return { ...DEFAULT_PLATFORM_STATE };
  }
}

export function savePlatformState(patch) {
  try {
    const next = { ...getPlatformState(), ...patch };
    sessionStorage.setItem(PLATFORM_STATE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return { ...DEFAULT_PLATFORM_STATE, ...patch };
  }
}

// Read once per mount, kept as local state so a page can render immediately
// and re-render as it patches fields - every patch is written straight
// through to sessionStorage so a refresh or an unrelated remount never loses
// progress.
export function usePlatformState() {
  const [state, setState] = useState(() => getPlatformState());
  function update(patch) {
    setState(() => savePlatformState(patch));
  }
  return [state, update];
}

// The one call every platform page makes to hand control back to datingLead's
// LINE chat: persist whatever platform progress needs to survive the trip,
// then leave. PrivateChat itself decides where in the script to resume from
// (see its own saved checkpoint) - this helper never needs to know that.
export function switchToLine(navigate, patch = {}) {
  savePlatformState(patch);
  navigate('/scenario02-romance/private-chat');
}

// Every persisted scenario02 key shares this prefix (KEY/RESOLVED_KEY/
// scenario state keys above), so sweeping by prefix - rather than naming each
// key here individually - also catches anything added later without this
// function needing an update. Everything else the scenario touches (quiz
// answers, deposit/profit/withdrawal amounts, platform registration, watched
// videos, dialogue timelines...) only ever lives in per-page React state,
// which already resets on its own the moment that page unmounts; there is no
// second, page-local storage mechanism for any of it to fall out of sync
// with.
const SCENARIO02_KEY_PREFIX = 'cibar-scenario02-';

// The single reset entry point for "start scenario02 over from nothing",
// called from exactly one place: the Briefing's useScenarioRunStart, which
// every entrance into a run goes through (menu, AR scan, "重新體驗",
// direct link). Clears every persisted key - the platform's
// registrationCompleted/accountCreated flags included - so the next mount of
// DatingBrowse/Briefing/etc. recomputes its initial state (index 0, no
// resolved cards, no datingLead decision, no saved route) instead of resuming.
export function resetScenario02() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(SCENARIO02_KEY_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // localStorage unavailable - nothing to clear.
  }
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(SCENARIO02_KEY_PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // sessionStorage unavailable - nothing to clear.
  }
  const cast = resolveCast('scenario02', DATING_ROLES);
  try {
    localStorage.setItem(CAST_KEY, JSON.stringify(cast));
  } catch {
    // Storage unavailable; deep-link fallback remains deterministic.
  }
  return cast;
}
