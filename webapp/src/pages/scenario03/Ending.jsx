import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { getOrCreateScenarioSession } from '../../lib/session/ScenarioSessionFactory';
import { BALANCE_TOTAL, formatNT } from '../../data/scenario03Config';
import { getScenario03Strings } from './i18n';
import { ScenarioOutcome } from '../../components/outcome/ScenarioOutcome';

// Scene 11c - 詐騙成立／成功反詐. Both branches of FinalDecision land here:
// 確認轉帳 through Aftermath (failure), 撥打 165 directly (success - choosing
// to call 165 before the money moves IS the successful anti-fraud
// judgement, so there is no simulated hotline call in between). Which one
// is carried in the URL.
//
// This screen is no longer part of the 假檢警 simulation: PoliceFrame is gone,
// and with it the light 刑事警察局 document surface the結局 used to inherit
// and the 返回情境選單 button that let the player leave the flow sideways. The
// simulation ends here, so CIBAR's own Outcome System owns the screen and the
// only way on is 查看詐騙疑點分析.
//
// The 詐騙手法 tag list this page used to carry moved to that analysis screen,
// which is where 疑點 belong.
export function Ending() {
  const { outcome } = useParams();
  useState(() => getOrCreateScenarioSession());
  const failure = outcome !== 'success';
  const resultCopy = getScenario03Strings().ending.result;
  const outcomeCopy = failure ? resultCopy.failure : resultCopy.success;

  return (
    <ScenarioOutcome
      scenarioId="authority"
      state={failure ? 'scammed' : 'verified'}
      title={outcomeCopy.title}
      amounts={[{ label: outcomeCopy.amountLabel, value: formatNT(BALANCE_TOTAL), emphasis: true }]}
      explanation={outcomeCopy.explanation}
      takeaway={outcomeCopy.memoryPoint}
      analysisTo="/scenario03-police/analysis"
    />
  );
}
