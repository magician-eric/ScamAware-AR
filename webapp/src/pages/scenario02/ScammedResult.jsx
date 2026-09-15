import { ScenarioOutcome } from '../../components/outcome/ScenarioOutcome';
import { useSaveScenario02Progress } from '../../lib/scenario02Store';
import { useT } from './i18n';

// Scenario 02 詐騙成立 - reached only after the player pushed past the top-up
// stop-point AND completed the "資金安全驗證" payment on GuaranteePage.
//
// Amounts are exactly the two the story actually charges the player, and
// nothing else: NT$10,000 at DepositPage and NT$30,000 at GuaranteePage. The
// 38,640 CIBDT "帳面資產" is a number the fake platform displays, not money
// the player ever paid, so it is deliberately never summed into the loss.
//
// No `useStageClassName('bition-stage')` any more: the simulation is over at
// this point, so the Coin Winner platform's stage must not follow the player
// into the結局 (spec §4.3).
export function ScammedResult() {
  useSaveScenario02Progress('/scenario02-romance/scammed-result');
  const t = useT();

  return (
    <ScenarioOutcome
      scenarioId="romance"
      state="scammed"
      title={t('感情是假的，損失是真的')}
      amounts={[
        { label: t('入金金額'), value: 'NT$10,000' },
        { label: t('資金安全驗證金'), value: 'NT$30,000' },
        { label: t('累計實際支出'), value: 'NT$40,000', emphasis: true },
        { label: t('帳戶狀態'), value: t('已遭凍結，無法提領') },
      ]}
      explanation={t('詐騙者先利用交友、關心、親密對話與共同未來建立信任，再把感情轉化成投資與付款壓力。當投資平台開始要求支付驗證金、保證金、稅金或其他追加款項才能出金時，損失往往會繼續擴大。')}
      takeaway={t('真正的感情，不需要用入金或轉帳證明。')}
      analysisTo="/scenario02-romance/risk-analysis"
    />
  );
}
