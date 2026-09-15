import { ScenarioFinalDecision } from '../../components/ui/ScenarioFinalDecision';
import { useT } from './i18n';

// Single final-decision question for scenario05 (Ghost Order / fake buyer
// scam), rendered through the shared ScenarioFinalDecision component - see
// components/ui/ScenarioFinalDecision.jsx. Rendered unwrapped (no mydondon
// PhoneShell/CibarResultBar chrome) so this step looks identical across
// all five scenarios, not reskinned per scenario.
export function Quiz() {
  const t = useT();
  return (
    <ScenarioFinalDecision
      t={t}
      question={t('買家提供的外部網站顯示「付款成功」，但買東東沒有訂單、你的帳戶也沒有入帳。你應該怎麼做？')}
      options={[
        t('停止交易，只依官方平台訂單與實際入帳確認是否出貨。'),
        t('對方已傳付款畫面，先把商品寄出'),
      ]}
      correctIndex={0}
      explanation={t('不要只相信付款截圖或陌生外部網站；不要離開原平台完成陌生的交易流程；賣家寄貨前應確認官方訂單及實際付款狀態；物流成立不代表付款成立。')}
    />
  );
}
