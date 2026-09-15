import { ScenarioEntryBriefing } from '../../components/ui/ScenarioEntryBriefing';
import { useT } from './i18n';

// Entry screen for scenario04 - previously there wasn't one; a run landed
// straight on the simulated phone desktop (now at
// /scenario04-shopping/phone-home, unchanged past this point). This is the
// shared ScenarioEntryBriefing (scenario01's layout); the briefing line is
// scenario04's own, added to shared/i18n/scenario04En.js and
// scenario04Jp.js alongside its other strings.
//
// No reset happens here: entering scenario04 already resets on every
// entrance through `prepareScenarioEntry` (lib/enterScenario.js), which this
// screen does not touch.
export function Briefing() {
  const t = useT();
  return (
    <ScenarioEntryBriefing
      entryId="seller-scam"
      scenarioId="scenario-04"
      startRoute="/scenario04-shopping/phone-home"
      description={t('你將以買家身分下單一件熱門商品，收到的實物卻與商品頁描述不符，並在申請退貨、退款的過程中，一步步遇上賣家的拖延與話術。')}
    />
  );
}
