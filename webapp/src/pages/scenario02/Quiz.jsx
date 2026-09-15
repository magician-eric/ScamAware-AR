import { ScenarioFinalDecision } from '../../components/ui/ScenarioFinalDecision';
import { useSaveScenario02Progress } from '../../lib/scenario02Store';
import { useT } from './i18n';

// Single final-decision question for scenario02 (Love Script / romance
// scam), rendered through the shared ScenarioFinalDecision component - see
// components/ui/ScenarioFinalDecision.jsx. Rendered unwrapped (no bition
// app chrome/stage) so this step looks identical across all five
// scenarios, not reskinned per scenario.
export function Quiz() {
  useSaveScenario02Progress('/scenario02-romance/quiz');
  const t = useT();
  return (
    <ScenarioFinalDecision
      t={t}
      question={t('平台要求支付 NT$30,000 資金安全驗證金，並宣稱完成後即可一起提領。你應該怎麼做？')}
      options={[
        t('停止付款、保留紀錄並查詢 165。'),
        t('支付保證金，完成最後一步。'),
      ]}
      correctIndex={0}
      explanation={t('合法平台不會要求先付款才能領回自己的資金；停止付款並撥打 165 查證才是正確做法。')}
    />
  );
}
