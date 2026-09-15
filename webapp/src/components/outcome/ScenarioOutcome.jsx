import { Link, useNavigate } from 'react-router-dom';
import { useARInteraction } from '../../lib/arInteraction';
import { resolveScenarioOutcome } from './outcomeContract';
import { outcomeStrings } from './outcomeStrings';
import './ScenarioOutcome.css';

// The one結局畫面 every Scenario ends on - CIBAR's own educational UI, not a
// screen any Scenario is allowed to dress.
//
// The moment a player reaches 詐騙成立 or 成功反詐 the simulation is over, so
// this screen carries none of it: no LINE, no GuGo Invest, no MeetU, no Coin
// Winner, no BlackPi, no MyDonDon, no HPE, no browser chrome, no PhoneShell
// and no PoliceFrame. It renders its own full-height dark CIBAR shell, and it
// is mounted directly by the route - never inside a Scenario's frame.
//
// The reading order is fixed and identical on all ten outcomes:
//
//   1. 刑事熊 artwork for this scenario+state (resolved here from
//      RESULT_MASCOTS - a Scenario cannot name an artwork path)
//   2. Outcome status - 詐騙成立 or 成功反詐, this system's own vocabulary
//   3. Result title
//   4. What actually happened: the consequence line and the amount rows
//   5. Short explanation, with the scenario's 請記住 takeaway
//   6. Exactly one CTA - 查看詐騙疑點分析
//
// There is no `theme`, no `classPrefix`, no `embedded`, no `children` and no
// `actions` prop. Success and failure never change the shell: only the
// artwork, the accent colour and the status text differ. A Scenario supplies
// facts (see outcomeContract.js); the shell is not negotiable.
//
// AR Interaction Contract (lib/arInteraction): because the shell is shared,
// the contract is declared here once and never in the ten per-scenario
// outcome pages - all ten結局 are the same geometry, `single`, whose one
// story action is 查看詐騙疑點分析. The gesture pushes the same route through
// the same router the <Link> below already uses; the link itself is
// untouched, and nothing here reads the DOM.
export function ScenarioOutcome({
  scenarioId,
  state,
  title,
  outcome,
  amounts = [],
  explanation,
  takeaway,
  analysisTo,
}) {
  const { mascot, tone } = resolveScenarioOutcome(scenarioId, state);
  const strings = outcomeStrings();
  const navigate = useNavigate();

  useARInteraction({
    mode: 'single',
    surfaceId: 'shared/outcome',
    action: () => navigate(analysisTo),
  });

  return (
    <main
      className={`cibar-outcome cibar-outcome-${tone}`}
      data-outcome-scenario={scenarioId}
      data-outcome-state={state}
    >
      <div className="cibar-outcome-scroll">
        <section className="cibar-outcome-card">
          {/* No aspect-ratio, no cover, no filter: the ten mascot images have
              different natural proportions, so the well is sized off height
              and the artwork is always contained inside it. */}
          <div className="cibar-outcome-mascot">
            <img src={mascot} alt="" />
          </div>
          <p className="cibar-outcome-status">
            {tone === 'failure' ? strings.statusFailure : strings.statusSuccess}
          </p>
          <h1 className="cibar-outcome-title">{title}</h1>
          {outcome && <p className="cibar-outcome-consequence">{outcome}</p>}
          {amounts.length > 0 && (
            <dl className="cibar-outcome-amounts">
              {amounts.map(({ label, value, emphasis }) => (
                <div key={label} className={emphasis ? 'is-emphasis' : ''}>
                  <dt>{label}</dt><dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {explanation && <p className="cibar-outcome-explanation">{explanation}</p>}
          {takeaway && (
            <aside className="cibar-outcome-takeaway">
              <strong>{strings.takeawayLabel}</strong><span>{takeaway}</span>
            </aside>
          )}
        </section>
      </div>
      {/* The single CTA is a sibling of the scroll region, never a child of
          the card, so it is on screen from the first frame - gesture input on
          the AR glasses cannot be asked to scroll to reach it. */}
      <div className="cibar-outcome-cta-bar">
        <Link className="cibar-outcome-cta" to={analysisTo}>{strings.analysisCta}</Link>
      </div>
    </main>
  );
}
