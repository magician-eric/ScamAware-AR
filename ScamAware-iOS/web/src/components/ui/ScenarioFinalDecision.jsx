import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useARInteraction } from '../../lib/arInteraction';
import { Button } from './Button';
import './ScenarioFinalDecision.css';

// AntiFraudQuiz (反詐小測驗): the one shared final-decision step every
// scenario run ends on - exactly one question, exactly two options, an
// immediate lock-in with a correct/incorrect state and explanation, and a
// single primary action that sends the player back to the AR scan. This
// replaces each scenario's own bespoke multi-question quiz + score/result
// screens, and is dropped into every scenario's Quiz.jsx unwrapped (no
// scenario-specific chrome around it) so the five scenarios render this
// step identically instead of five reskinned variants.
//
// All copy is passed in already translated (each scenario keeps its own
// per-scenario i18n dictionary - see pages/scenarioNN/i18n.js) so this
// component has no i18n dependency of its own beyond the `t` function used
// to resolve its three fixed labels (title, feedback banner, back button).
//
// The two options are a fixed [ LEFT | RIGHT ] pair, in that order and
// never restacked: every scenario passes the safe/correct answer first
// (correctIndex is always 0) and the risky one second, so the player reads
// the same left-is-safe / right-is-risky geometry in all five scenarios.
// The side-by-side pair is held by .antifraud-quiz-choices, which stays a
// two-equal-column grid at every width this app runs at (320px-430px
// portrait included) - see ScenarioFinalDecision.css.
//
// Colors below are hardcoded rather than pulled from the shared --card/
// --text/--muted variables: those get redefined per scenario (several
// scenario "worlds" - blackpi, the phone-shell police frame - switch them
// to a light theme for their own in-story screens), and this quiz must
// stay legible and pixel-identical regardless of which world it follows.
//
// That fixed two-option geometry is also what makes this the reference
// `dual` surface of the AR Interaction Contract (lib/arInteraction): LEFT is
// option[0] (the safe answer), RIGHT is option[1] (the risky one), which is
// the same left-is-safe reading the player already gets visually.
//
// Answering does not end the screen's interaction, it changes its geometry.
// The two options lock, but the 返回掃描 button below them is still a real
// story action - so the contract becomes `single` (RIGHT goes to `backTo`),
// not `display`. Both counts follow the same rule: however many story
// actions the screen has, that is its geometry.
//
// The contract only *names* actions the screen already has for a future
// Gesture Bridge - taps still go through the buttons' own onClick/Link
// exactly as before, and nothing here touches a camera, an SDK or the DOM.
export function ScenarioFinalDecision({
  t,
  question,
  options,
  correctIndex,
  explanation,
  backTo = '/ar-scan',
  onAnswer,
}) {
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  function choose(index) {
    if (selected !== null) return;
    setSelected(index);
    onAnswer?.(index === correctIndex, index);
  }

  // Two story actions while the question is open, one once it is answered.
  // The answered state must not leave the two options reachable - the
  // buttons are disabled, and a gesture must not get a second answer past
  // them - so the whole declaration is replaced rather than disabled: LEFT
  // stops existing, and RIGHT moves to the one action that is still on
  // screen. `navigate(backTo)` is the same push the 返回掃描 <Link> performs,
  // through the same router; that button's own behaviour is untouched.
  const answered = selected !== null;
  useARInteraction(answered
    ? {
      mode: 'single',
      surfaceId: 'shared/anti-fraud-quiz-answered',
      action: () => navigate(backTo),
    }
    : {
      mode: 'dual',
      surfaceId: 'shared/anti-fraud-quiz',
      left: () => choose(0),
      right: () => choose(1),
    });

  return (
    // Two flex items stacked vertically: a scroll region (the card, which
    // can grow taller than the viewport once feedback/explanation appears)
    // and the back button below/outside it. The button is a sibling, not a
    // card child, so it can never end up overlapping the card's own
    // content - it just always occupies its own row underneath, and the
    // scroll region shrinks around it instead of being covered by it.
    <div className="antifraud-quiz-shell">
      <div className="antifraud-quiz-scroll">
        <div className="antifraud-quiz-card">
          <h2>{t('反詐小測驗')}</h2>
          <p>{question}</p>
          <div className="btns antifraud-quiz-choices">
            {options.map((option, index) => {
              let cls = 'btn secondary quiz-option';
              if (selected !== null) {
                if (index === correctIndex) cls += ' correct';
                else if (index === selected) cls += ' wrong';
              }
              return (
                <button
                  key={index}
                  type="button"
                  className={cls}
                  disabled={selected !== null}
                  onClick={() => choose(index)}
                >
                  {option}
                </button>
              );
            })}
          </div>
          {selected !== null && (
            <div className="quiz-explain">
              <p>{selected === correctIndex ? t('✅ 判斷正確') : t('❌ 判斷錯誤')}</p>
              <p>{explanation}</p>
            </div>
          )}
        </div>
      </div>
      <Button to={backTo} className="antifraud-quiz-back">{t('返回掃描')}</Button>
    </div>
  );
}
