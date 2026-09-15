import { ScenarioOutcome } from '../../components/outcome/ScenarioOutcome';
import { useT } from './i18n';

// Scenario 01 成功反詐 - reached from WithdrawFail's 稍後處理 branch. The
// NT$300,000 already paid is never described as recovered: stopping here only
// prevents the next payment, and the copy has to say so.
export function StoppedResult() {
  const t = useT();
  return (
    <ScenarioOutcome
      scenarioId="investment"
      state="stopped"
      title={t('成功停手')}
      outcome={t('避免損失再擴大')}
      amounts={[
        { label: t('前期已投入'), value: 'NT$300,000' },
        { label: t('本次避免追加'), value: 'NT$30,000', emphasis: true },
        { label: t('結果'), value: t('成功避免損失繼續增加') },
      ]}
      explanation={t('當平台要求再支付一筆錢才能出金時，停止付款是正確的第一步。接下來應保存交易與對話紀錄，向 165 或警方查證，並拒絕任何追加付款理由。')}
      takeaway={t('停手不是代表前面的錢已經安全，而是避免損失繼續擴大。')}
      analysisTo="/scenario01-investment/analysis"
    />
  );
}
