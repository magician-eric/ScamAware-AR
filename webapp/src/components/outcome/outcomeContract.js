import { RESULT_MASCOTS } from './resultMascots';

// The Outcome contract: the only thing a Scenario is allowed to say about its
// own ending.
//
// CIBAR owns the結局 UI (ScenarioOutcome.jsx) and this file owns the shape of
// the data that UI accepts. A Scenario supplies facts - which scenario, which
// of its two outcomes, the title, the amounts, the explanation - and nothing
// about how any of it looks. There is deliberately no `theme`, no
// `classPrefix`, no `embedded` and no `children`: those were the escape
// hatches through which five scenarios each grew their own ending shell, and
// removing them is the whole point of this layer.
//
// Every scenario has exactly two outcomes, and each one is either a failure
// (詐騙成立) or a success (成功反詐). The state names are the ones the artwork
// has always been keyed by, so the mascot pair and the outcome pair cannot
// drift apart: RESULT_MASCOTS is the single source of truth for both.

// state -> tone. Only these five state names exist, and each scenario may use
// only the two its artwork is keyed by (see SCENARIO_OUTCOME_STATES below).
export const OUTCOME_TONES = {
  scammed: 'failure',
  stopped: 'success',
  verified: 'success',
  blocked: 'success',
};

// scenarioId -> its two states, derived from the artwork rather than listed a
// second time. A scenario that gains or loses an outcome has to change
// resultMascots.js, which is exactly where that decision belongs.
export const SCENARIO_OUTCOME_STATES = Object.fromEntries(
  Object.entries(RESULT_MASCOTS).map(([scenarioId, states]) => [scenarioId, Object.keys(states)]),
);

// Resolves one outcome to everything the shared UI needs to render it. The
// mascot URL is looked up here, never passed in, so no scenario page can ever
// name an artwork path (and so no scenario can quietly swap the artwork).
export function resolveScenarioOutcome(scenarioId, state) {
  const artwork = RESULT_MASCOTS[scenarioId];
  if (!artwork) throw new Error(`Unknown outcome scenario "${scenarioId}"`);
  const mascot = artwork[state];
  if (!mascot) {
    throw new Error(`Scenario "${scenarioId}" has no "${state}" outcome (it has: ${Object.keys(artwork).join(', ')})`);
  }
  const tone = OUTCOME_TONES[state];
  if (!tone) throw new Error(`Unknown outcome state "${state}"`);
  return { mascot, tone };
}
