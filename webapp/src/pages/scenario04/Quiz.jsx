import { ScenarioFinalDecision } from '../../components/ui/ScenarioFinalDecision';
import { useT } from './i18n';

// Screen 27 - 反詐小測驗. Reached after Ending.jsx's full three-act 情境結算
// (that education content stays completely intact - OutcomeResult.jsx's own
// scoring/branching and Ending.jsx's evidence/choice/analysis accordions are
// unchanged). This is the shared single-question final-decision step every
// scenario now ends on - see components/ui/ScenarioFinalDecision.jsx.
// Rendered unwrapped (no blackpi app chrome/stage, which defaults to a
// light theme the quiz's own fixed-dark styling was never designed
// against) so this step looks identical across all five scenarios, then
// routes back to /ar-scan.
export function Quiz() {
  const t = useT();
  return (
    <ScenarioFinalDecision
      t={t}
      question={t('收到的商品跟頁面上宣稱的完全不一樣，最安全的處理方式是什麼？')}
      options={[
        t('保存商品頁、開箱照片與對話紀錄，透過平台正式申請退貨退款。'),
        t('先確認收貨，之後再私下跟賣家協調退款。'),
      ]}
      correctIndex={0}
      explanation={t('商品圖片、規格、評價都可能被刻意包裝。收到貨不對版時，先保存商品頁、開箱與對話紀錄，再透過平台正式機制申請退貨退款，才能讓爭議處理有紀錄可循；賣家同意退貨不代表退款已完成，若賣家拖延或失聯，應立即聯絡平台，疑似詐騙可撥打 165 諮詢，切勿私下協調或依對方指示直接取消訂單、寄回商品。')}
    />
  );
}
