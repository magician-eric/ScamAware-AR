import { FraudClueAnalysis } from '../../components/outcome/FraudClueAnalysis';
import { getEndingTactics } from '../../data/scenario03Config';
import { getScenario03Strings } from './i18n';

// Scene 11c2 - 詐騙疑點分析. The eight manipulation tactics used to sit at the
// bottom of the結局 page as chips inside PoliceFrame; they are 疑點, so they
// belong on this screen, and they are the same eight whichever branch the
// player took (data/scenario03Config.js is still their only owner).
//
// The closing line is what a real prosecutor or police officer never asks
// for - the same sentence the 受騙 outcome carries as its 請記住 takeaway.
export function Analysis() {
  const t = getScenario03Strings();
  return (
    <FraudClueAnalysis
      scenarioId="authority"
      clues={getEndingTactics().map((title) => ({ title }))}
      summary={t.ending.result.failure.memoryPoint}
      quizTo="/scenario03-police/quiz"
    />
  );
}
