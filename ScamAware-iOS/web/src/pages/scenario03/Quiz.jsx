import { ScenarioFinalDecision } from '../../components/ui/ScenarioFinalDecision';
import { getScenario03Strings } from './i18n';

// Scene 11d - 反詐小測驗. Reached after Ending.jsx's full case-summary /
// education screen (the real story content stays completely intact -
// FinalDecision.jsx's own transfer-vs-165 judgment and Ending.jsx's case
// file are unchanged). This is the shared single-question final-decision
// step every scenario now ends on - see
// components/ui/ScenarioFinalDecision.jsx. Rendered unwrapped (no
// PoliceFrame/phone-shell chrome, which defaults to a light theme that the
// quiz's own fixed-dark styling was never designed against) so this step
// looks identical across all five scenarios, then routes back to
// /ar-scan. stepKey "decision" is already marked reached earlier in the
// flow (FinalDecision.jsx/Ending.jsx both mark it), so
// dropping PoliceFrame here does not lose any step tracking.
//
// scenario03 has no flat t()/useT() lookup like scenario01/02/04/05 - it
// keys everything off getScenario03Strings() instead - so this local
// `translate` only resolves the four fixed labels ScenarioFinalDecision
// itself calls t() on; question/options/explanation are already the
// resolved per-language strings from i18n.js's own `keyDecision` block.
export function Quiz() {
  const t = getScenario03Strings();
  const k = t.keyDecision;
  const translate = (zh) => {
    if (zh === '反詐小測驗') return k.title;
    if (zh === '返回掃描') return k.backButton;
    if (zh === '✅ 判斷正確') return k.correctBanner;
    if (zh === '❌ 判斷錯誤') return k.wrongBanner;
    return zh;
  };

  return (
    <ScenarioFinalDecision
      t={translate}
      question={k.question}
      options={k.options}
      correctIndex={k.correctIndex}
      explanation={k.explanation}
    />
  );
}
