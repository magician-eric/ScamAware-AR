import { FraudClueAnalysis } from '../../components/outcome/FraudClueAnalysis';
import { useT } from './i18n';

// Scenario 01 詐騙疑點分析. Scenario 01 was the one scenario whose結局 went
// straight to the quiz with no analysis step, so this page fills that gap in
// the fixed flow (Outcome → 詐騙疑點分析 → 反詐小測驗).
//
// Every clue names a scene the player actually lived through, in the order
// they met it - the sponsored feed post, the teacher video, the LINE
// assistant, the VIP group, the platform registration, and the withdrawal
// that suddenly needed a deposit first. Nothing here is new teaching
// material: it is this run's own story, read back as the scam it was.
const CLUES = [
  { title: '社群廣告以「老師」名義主打高獲利' },
  { title: '影片與頭銜營造投資專業的權威感' },
  { title: '引導加 LINE，由「投資助理」一對一帶單' },
  { title: 'VIP 群組不斷貼出獲利截圖' },
  { title: '被帶到陌生投資平台註冊並入金' },
  { title: '要出金時才被要求先支付保證金' },
];

export function Analysis() {
  const t = useT();
  return (
    <FraudClueAnalysis
      scenarioId="investment"
      clues={CLUES.map(({ title }) => ({ title: t(title) }))}
      summary={t('出金前要求付款，是假投資詐騙最明顯的警訊。遇到疑似詐騙，請保留對話與交易紀錄，立即撥打 165 或就近向警方求證。')}
      quizTo="/scenario01-investment/quiz"
    />
  );
}
