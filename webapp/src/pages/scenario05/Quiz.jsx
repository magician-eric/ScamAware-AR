import { ScenarioFinalDecision } from '../../components/ui/ScenarioFinalDecision';
import { useT } from './i18n';

// Single final-decision question for scenario05 (Ghost Order / fake buyer
// scam), rendered through the shared ScenarioFinalDecision component - see
// components/ui/ScenarioFinalDecision.jsx. Rendered unwrapped (no mydondon
// PhoneShell/CibarResultBar chrome) so this step looks identical across
// all five scenarios, not reskinned per scenario.
//
// The question is the run's own turning point: being asked to send money in
// order to receive money. The safe answer is first, as in every scenario.
export function Quiz() {
  const t = useT();
  return (
    <ScenarioFinalDecision
      t={t}
      question={t('二手交易時，買家聲稱已付款，但外部網站客服要求你先匯一筆「完成後會退還」的驗證金，才能收到貨款。你應該怎麼做？')}
      options={[
        t('拒絕轉帳，停止交易，透過可信管道確認付款。'),
        t('先匯驗證金，等客服退還後再寄件。'),
      ]}
      correctIndex={0}
      explanation={t('收到貨款不應以先匯款給陌生人作為條件。不要只相信買家的付款截圖、外部網站畫面或自稱客服的說法，應透過可信管道確認實際入帳。')}
    />
  );
}
