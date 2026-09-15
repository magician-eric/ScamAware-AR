import { ScenarioEntryBriefing } from '../../components/ui/ScenarioEntryBriefing';
import { getScenario03Lang, getScenario03Strings } from './i18n';

// Entry screen for scenario03 - previously there wasn't one; a run landed
// straight on the simulated phone desktop (now at
// /scenario03-police/phone-home, unchanged past this point). This is the
// shared ScenarioEntryBriefing (scenario01's layout); the briefing line is
// scenario03's own, added alongside its other strings in ./i18n.js.
//
// No reset happens here: entering scenario03 already resets on every
// entrance through `prepareScenarioEntry` (lib/enterScenario.js), which this
// screen does not touch.
export function Briefing() {
  const t = getScenario03Strings(getScenario03Lang());
  return (
    <ScenarioEntryBriefing
      entryId="authority"
      scenarioId="scenario-03"
      startRoute="/scenario03-police/phone-home"
      description={t.briefingDescription}
    />
  );
}
