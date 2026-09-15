import { ScenarioFinalDecision } from '../../components/ui/ScenarioFinalDecision';
import { useT } from './i18n';

// Single final-decision question for scenario01 (Money Trap / fake
// investment scam), rendered through the shared ScenarioFinalDecision
// component - see components/ui/ScenarioFinalDecision.jsx.
export function Quiz() {
  const t = useT();
  return (
    <ScenarioFinalDecision
      t={t}
      question={t('你已經看到帳面獲利，但平台要求先繳保證金才能出金。你會怎麼做？')}
      options={[
        t('停止付款，查詢 165 或向警方求證。'),
        t('先支付保證金，趕快把獲利領出來。'),
      ]}
      correctIndex={0}
      explanation={t('出金前要求付款，是假投資詐騙常見警訊。一旦支付保證金，對方通常會再要求稅金、手續費或帳戶解凍金，你可能永遠無法提領本金與獲利。遇到疑似詐騙，請保留對話與交易紀錄，立即撥打 165 或就近向警方求證。')}
    />
  );
}
