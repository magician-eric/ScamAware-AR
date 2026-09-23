import { ScenarioEntryBriefing } from '../../components/ui/ScenarioEntryBriefing';
import { useT } from './i18n';

// Entry screen for scenario05 - previously there wasn't one; a run landed
// straight on the simulated phone desktop (now at /scenario05-atm/phone-home,
// unchanged past this point). This is the shared ScenarioEntryBriefing
// (scenario01's layout); the briefing line is scenario05's own, added to
// shared/i18n/scenario05En.js and scenario05Jp.js alongside its other
// strings.
//
// No reset happens here: entering scenario05 already resets on every
// entrance through `prepareScenarioEntry` (lib/enterScenario.js), which this
// screen does not touch.
export function Briefing() {
  const t = useT();
  return (
    <ScenarioEntryBriefing
      entryId="buyer-scam"
      scenarioId="scenario-05"
      startRoute="/scenario05-atm/phone-home"
      description={t('你將以賣家身分刊登商品，買家會要求你到陌生外部網站建立專屬賣場並顯示已付款，誘導你在沒有官方訂單與入帳的情況下把商品寄出。')}
    />
  );
}
