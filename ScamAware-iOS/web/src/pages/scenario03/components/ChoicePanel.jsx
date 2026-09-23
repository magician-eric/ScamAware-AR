import { useState } from 'react';
import { playSound } from '../../../lib/scenario03Feedback';
import { getScenario03Strings } from '../i18n';

// Section 0.2's two-choice moment: exactly two full-sentence options,
// presented identically - no "correct" styling, no scoring feedback, no
// icons that hint which one the scam wants. Whichever the player picks,
// their own line plays back first and the story merges back to the same
// main line (see useScriptPlayer.choose).
//
// Always two columns. Every screen that mounts this panel declares `dual` to
// the AR Interaction Contract while a choice is pending (CallStage1,
// ProsecutorCall), and `dual` only speaks LEFT and RIGHT: options[0] is LEFT, options[1]
// is RIGHT, and the panel has to draw them in that geometry or a player on
// the glasses is being taught a stack for a contract that has no up/down.
// The split modifier used to be gated on `momentKey === 'call.ownership'`,
// which left the prosecutor's account question (prosecutor.account) stacked
// while its contract still bound LEFT/RIGHT - so the gate is gone rather
// than extended to a second momentKey. .pol-choices-split carries no media
// query (pinned by AUD-06), so the pair stays side by side at 320/390/430.
export function ChoicePanel({ choice, onChoose }) {
  const [picked, setPicked] = useState(null);
  if (!choice) return null;

  function pick(option) {
    if (picked) return;
    setPicked(option.id);
    playSound('click');
    window.setTimeout(() => onChoose(option), 170);
  }

  const t = getScenario03Strings();

  return (
    <div className={`pol-choices pol-choices-split${picked ? ' pol-choices-leaving' : ''}`}>
      <p className="pol-choices-prompt">{choice.question ?? t.components.choicePanelDefault}</p>
      {choice.options.map((option) => (
        <button
          key={option.id}
          type="button"
          className="pol-choice-btn"
          disabled={Boolean(picked)}
          onClick={() => pick(option)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
