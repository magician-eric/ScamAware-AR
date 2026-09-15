import { ScenarioEntryBriefing } from '../../components/ui/ScenarioEntryBriefing';
import { useT } from './i18n';
import { useScenarioRunStart } from '../../lib/enterScenario';
import { resetScenario01 } from '../../lib/scenario01Store';

// First page of a scenario01 run, and the only one - reached from the
// scenario menu, from the AR scan, from the 165 page's "再看一次", and from a
// direct link to /scenario01-investment. So this is where a run starts over:
// the cast, LineTeacher's clock and, crucially, the embedded GuGo Invest
// platform's saved account all go back to nothing here, which is what makes
// the registration step play again on the second run without a page reload.
//
// The screen itself is the shared ScenarioEntryBriefing, which is this
// layout - all five scenarios render it now. Only the briefing line below
// is scenario01's own.
export function Briefing() {
  useScenarioRunStart(resetScenario01);
  const t = useT();
  return (
    <ScenarioEntryBriefing
      entryId="investment"
      scenarioId="scenario-01"
      startRoute="/scenario01-investment/feed"
      description={t('疑似假投資詐騙。你將看到社群廣告、投資老師影片、LINE 群組、假平台與出金保證金的完整流程。')}
    />
  );
}
