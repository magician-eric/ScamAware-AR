import { ScenarioEntryBriefing } from '../../components/ui/ScenarioEntryBriefing';
import { useT } from './i18n';
import { useScenarioRunStart } from '../../lib/enterScenario';
import { resetScenario02 } from '../../lib/scenario02Store';

// Always a fresh, no-choices start screen - no "繼續上次進度"/"重新開始"
// card, because reaching this page IS starting from scratch. Every entrance
// into a scenario02 run passes through here (menu, AR scan, "重新體驗" on the
// quiz result and ending pages, a direct link), so the reset lives here
// rather than in each of those callers - including the 幣勝客 platform's
// registration flags, which is what makes the sign-up flow play again on the
// next run without a page reload.
//
// The screen is the shared ScenarioEntryBriefing (scenario01's layout). The
// briefing line is the one this page already showed, kept verbatim.
export function Briefing() {
  useScenarioRunStart(resetScenario02);
  const t = useT();
  return (
    <ScenarioEntryBriefing
      entryId="romance"
      scenarioId="scenario-02"
      startRoute="/scenario02-romance/phone-desktop"
      description={t('你將體驗一段從配對、培養感情，到被引導進入假投資平台的過程。')}
    />
  );
}
