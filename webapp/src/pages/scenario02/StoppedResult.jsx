import { ScenarioOutcome } from '../../components/outcome/ScenarioOutcome';
import { useSaveScenario02Progress } from '../../lib/scenario02Store';
import { useT } from './i18n';

// Scenario 02 成功反詐 - reached from the top-up stop-point when the player
// chooses 停止付款. The NT$10,000 already paid at DepositPage is never
// described as recovered or safe: stopping here only prevents the NEXT
// payment, and the copy has to say so.
//
// Reachability: TopupWarning, this page's only entrance, is now wired into the
// story (spec §13 AD-23, resolved) - PrivateChat's s22-choice sends
// 我還是覺得不對勁 to it instead of falling through to the verification payment,
// so 成功反詐 is a branch the player can actually reach.
export function StoppedResult() {
  useSaveScenario02Progress('/scenario02-romance/stopped-result');
  const t = useT();

  return (
    <ScenarioOutcome
      scenarioId="romance"
      state="stopped"
      title={t('成功停手')}
      outcome={t('你停止了付款，也停止讓感情左右判斷。')}
      amounts={[
        { label: t('先前已入金'), value: 'NT$10,000' },
        { label: t('本次避免追加'), value: 'NT$30,000', emphasis: true },
        { label: t('先前資金狀態'), value: t('仍處於高風險，未必能取回') },
      ]}
      explanation={t('停止付款讓損失停在這裡，但先前已投入平台的資金仍可能無法取回，並不會因為停手就自動變安全。請立即保存入金紀錄與所有對話，撥打 165 反詐騙專線查證，並拒絕任何以驗證金、保證金或稅金為名的追加付款要求。')}
      takeaway={t('停手不是代表前面的錢已經安全，而是避免損失繼續擴大。')}
      analysisTo="/scenario02-romance/risk-analysis"
    />
  );
}
