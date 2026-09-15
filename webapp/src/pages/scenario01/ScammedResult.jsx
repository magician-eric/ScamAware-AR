import { ScenarioOutcome } from '../../components/outcome/ScenarioOutcome';
import { useT } from './i18n';

// Scenario 01 詐騙成立 - reached from WithdrawFail's 確認支付 branch.
//
// This page owns facts, not UI: the shared Outcome System (components/outcome)
// owns the shell, the artwork lookup, the 詐騙成立 status and the single CTA
// into 詐騙疑點分析.
export function ScammedResult() {
  const t = useT();
  return (
    <ScenarioOutcome
      scenarioId="investment"
      state="scammed"
      title={t('累計損失 NT$330,000')}
      amounts={[
        { label: t('前期投入'), value: 'NT$300,000' },
        { label: t('追加保證金'), value: 'NT$30,000' },
        { label: t('累計損失'), value: 'NT$330,000', emphasis: true },
      ]}
      explanation={t('先前投入的資金已無法正常提領。平台再以保證金、稅金、手續費、解凍費或驗證金要求付款，通常是要讓損失繼續擴大。')}
      takeaway={t('要求你再付一筆錢，才能拿回原本投入的資金，是重大詐騙警訊。')}
      analysisTo="/scenario01-investment/analysis"
    />
  );
}
