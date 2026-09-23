import { Link, useNavigate } from 'react-router-dom';
import { useARInteraction } from '../../lib/arInteraction';
import { outcomeStrings } from './outcomeStrings';
import './FraudClueAnalysis.css';

// 詐騙疑點分析 - the second half of the Outcome System, and CIBAR's own
// educational UI for exactly the same reason ScenarioOutcome is: the
// simulation is over, so no Scenario App shell, PhoneShell, PoliceFrame or
// fake browser may appear here either.
//
// The page analyses the SCAM, not the player. There is no score, no
// 五項評估, no 個人化分析 and nothing folded behind an accordion: the clue
// list is read at once, and the single CTA continues into 反詐小測驗.
//
// The UI is shared; the content is not. Every Scenario owns its own clue
// list - short titles, an optional one-line note - plus an optional lede and
// closing line, all handed in already translated. The screen's own name and
// its CTA are the Outcome System's (see outcomeStrings.js), so they cannot
// drift per scenario.
//
// AR Interaction Contract (lib/arInteraction): declared here once, exactly
// like ScenarioOutcome above, so no Scenario repeats it. The geometry is
// `single` - 進行反詐小測驗 is the only story action on the page - and the
// gesture runs the same `onContinue` side effect and the same router push the
// <Link> below performs, in that order.
export function FraudClueAnalysis({
  scenarioId,
  lede = [],
  clues,
  summary,
  quizTo,
  onContinue,
}) {
  const strings = outcomeStrings();
  const ledeLines = Array.isArray(lede) ? lede : [lede];
  const navigate = useNavigate();

  useARInteraction({
    mode: 'single',
    surfaceId: 'shared/fraud-clue-analysis',
    action: () => {
      onContinue?.();
      navigate(quizTo);
    },
  });

  return (
    <main className="cibar-analysis" data-analysis-scenario={scenarioId}>
      <div className="cibar-analysis-scroll">
        <h1 className="cibar-analysis-title">{strings.analysisTitle}</h1>
        {ledeLines.filter(Boolean).map((line) => (
          <p key={line} className="cibar-analysis-lede">{line}</p>
        ))}
        <ul className="cibar-analysis-clues">
          {clues.map(({ title, note }) => (
            <li key={title} className="cibar-analysis-clue">
              <h2>{title}</h2>
              {note && <p>{note}</p>}
            </li>
          ))}
        </ul>
        {summary && <p className="cibar-analysis-summary">{summary}</p>}
      </div>
      {/* Same rule as the outcome screen: the CTA is a sibling of the
          scroller, so it is reachable without scrolling first. */}
      <div className="cibar-analysis-cta-bar">
        <Link className="cibar-analysis-cta" to={quizTo} onClick={onContinue}>{strings.quizCta}</Link>
      </div>
    </main>
  );
}
