import { useEffect, useState } from 'react';

// Scenario03 (假檢警) run state: which of the 11 steps have been reached,
// which branch the player took at each 2-choice moment, and the warning
// flags both endings read back. sessionStorage (not localStorage like
// scenario04) because this is a 4-6 minute kiosk run - a new visitor at the
// machine should always start clean, never resume a stranger's case.
const STATE_KEY = 'cibar-scenario03-state';

// Section 0.5's pacing toggle: fast mode plays every timed beat at 0.55x
// duration so staff can demo the whole flow quickly without cutting content.
export const FAST_PACE_MULTIPLIER = 0.55;

export const DEFAULT_STATE = {
  stepIndex: 0,
  reachedSteps: ['phone-home'],
  choices: {},
  warningFlags: [],
  pace: 'normal', // 'normal' | 'fast'
  documentsRead: [],
  consentSigned: false,
  prosecutorCallCompleted: false,
  firstPoliceCallStatus: 'idle', // idle | active | ended
  firstPoliceCallStartedAt: null,
  policeCallbackStatus: 'idle', // idle | active | completed
  // Which page of the 好匯銀行 site the run is on. 'login' is where the
  // officer's LINE link lands - there is no desktop-and-app-icon step in
  // front of it any more, so there is no 'home' stage either.
  bankStage: 'login',
  bankAmount: null,
  // Single source of truth for "who the player is currently on the phone
  // with", from the prosecutor call onward: 'prosecutor' | 'investigator' |
  // null. Never two roles at once, and never a role while no call is up: the
  // prosecutor's call is cleared to null when he hangs up, and the officer's
  // callback sets it again only once the player has answered.
  activeCall: null,
  callStartedAt: null,
  transferAmount: null,
  // Set by Aftermath.jsx once the post-transfer LINE beat has actually been
  // played. Only the 完成轉帳 branch ever writes it: the 撥打 165 branch goes
  // straight from FinalDecision to the hotline and its 成功 ending, and must
  // never pass through the aftermath (pinned by
  // scripts/scenario03-aftermath.test.mjs).
  aftermathSeen: false,
  ending: null, // null | 'failure' | 'success'
};

export function startFirstPoliceCall() {
  const current = read();
  if (current.firstPoliceCallStatus === 'ended') return;
  write({
    ...current,
    firstPoliceCallStatus: 'active',
    firstPoliceCallStartedAt: current.firstPoliceCallStartedAt ?? Date.now(),
  });
}

export function endFirstPoliceCall() {
  updateScenario03State({ firstPoliceCallStatus: 'ended', firstPoliceCallStartedAt: null });
}

// Sets who the player is currently on the phone with. Each role change is a
// new call - the prosecutor and the investigating officer ring separately -
// so the elapsed timer restarts whenever the role changes, and only a repeat
// set of the SAME role (a remount, a re-render) keeps the running clock.
export function setActiveCall(role) {
  const current = read();
  write({
    ...current,
    activeCall: role,
    callStartedAt: current.activeCall === role && current.callStartedAt ? current.callStartedAt : Date.now(),
  });
}

export function clearActiveCall() {
  updateScenario03State({ activeCall: null, callStartedAt: null });
}

const listeners = new Set();
let cached = null;

function read() {
  if (cached) return cached;
  try {
    const raw = sessionStorage.getItem(STATE_KEY);
    cached = raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : { ...DEFAULT_STATE };
  } catch {
    cached = { ...DEFAULT_STATE };
  }
  return cached;
}

function write(next) {
  cached = next;
  try {
    sessionStorage.setItem(STATE_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable - state still lives in `cached` for this session.
  }
  listeners.forEach((fn) => fn(next));
}

export function getScenario03State() {
  return read();
}

export function updateScenario03State(patch) {
  const current = read();
  write({ ...current, ...(typeof patch === 'function' ? patch(current) : patch) });
}

export function resetScenario03() {
  write({ ...DEFAULT_STATE });
}

export function addWarningFlags(...flags) {
  const current = read();
  const next = [...current.warningFlags];
  flags.filter(Boolean).forEach((f) => {
    if (!next.includes(f)) next.push(f);
  });
  write({ ...current, warningFlags: next });
}

export function recordChoice(momentKey, choiceId, flags = []) {
  const current = read();
  const warningFlags = [...current.warningFlags];
  flags.filter(Boolean).forEach((f) => {
    if (!warningFlags.includes(f)) warningFlags.push(f);
  });
  write({ ...current, choices: { ...current.choices, [momentKey]: choiceId }, warningFlags });
}

export function markStepReached(stepKey, stepIndex) {
  const current = read();
  const reachedSteps = current.reachedSteps.includes(stepKey)
    ? current.reachedSteps
    : [...current.reachedSteps, stepKey];
  write({ ...current, reachedSteps, stepIndex: Math.max(current.stepIndex, stepIndex) });
}

export function setPace(pace) {
  updateScenario03State({ pace });
}

export function useScenario03State() {
  const [state, setState] = useState(read);
  useEffect(() => {
    const fn = (next) => setState(next);
    listeners.add(fn);
    setState(read());
    return () => listeners.delete(fn);
  }, []);
  return state;
}

export function usePaceMultiplier() {
  const state = useScenario03State();
  return state.pace === 'fast' ? FAST_PACE_MULTIPLIER : 1;
}
