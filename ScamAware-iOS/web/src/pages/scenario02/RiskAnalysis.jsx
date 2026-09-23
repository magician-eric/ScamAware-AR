import { FraudClueAnalysis } from '../../components/outcome/FraudClueAnalysis';
import { useSaveScenario02Progress } from '../../lib/scenario02Store';
import { useT } from './i18n';

// Scenario 02 詐騙疑點分析. The five disclosures are unchanged - this page
// used to render them inside the Coin Winner platform's own app shell
// (`bition-app`, `bition-home-scroll`, the platform's fixed 165 bar), which
// carried the simulation past the結局; they now render through the shared
// FraudClueAnalysis, which is CIBAR's own UI.
// The same five disclosures, and the same title-only presentation the page
// has rendered since the disclosure list was simplified: five short lines a
// player can take in at a glance on a phone, not five paragraphs to read top
// to bottom.
const CLUES = [
  '揭露一：入金後，感情立刻升級',
  '揭露二：投資被包裝成兩人的未來',
  '揭露三：未說出口的想像最容易讓人失去判斷',
  '揭露四：已經投入越多，越難停下來',
  '揭露五：拒絕付款，被包裝成拒絕感情',
];

export function RiskAnalysis() {
  useSaveScenario02Progress('/scenario02-romance/risk-analysis');
  const t = useT();
  return (
    <FraudClueAnalysis
      scenarioId="romance"
      lede={[
        t('你不是因為貪心才按下去'),
        t('你相信的不是平台。是 {datingLead} 所描繪的見面、旅行、親密關係，以及兩個人的未來。'),
      ]}
      clues={CLUES.map((title) => ({ title: t(title) }))}
      summary={t('任何把感情、見面或共同未來與投資入金綁在一起的關係，都應立即提高警覺。真正想見你的人，不會要求你先用金錢證明感情。')}
      quizTo="/scenario02-romance/quiz"
    />
  );
}
