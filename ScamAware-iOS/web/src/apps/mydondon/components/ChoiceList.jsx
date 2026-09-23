import { useEffect, useState } from 'react';
import { useT } from '../i18n';

// The scenario's two-choice quick-reply row - always stacked full-width
// (spec section 18: "建議上下排列，方便閱讀完整句子", explicitly not a pair
// of narrow side-by-side buttons like scenario04's 2-up grid), since these
// sentences run longer than a typical yes/no chip. Same anti-double-tap
// pattern as scenario04's DialogueChoiceGrid: immediate disable, a short
// fade before the pick actually fires. `prompt` is always supplied
// pre-translated by BuyerChat; the default here only matters if this is
// ever mounted without one, so it's still run through t() to stay correct
// in that case too.
export function ChoiceList({ choices, onChoose, disabled = false, prompt }) {
  const t = useT();
  const resolvedPrompt = prompt ?? t('選擇你的回覆');
  const [leavingId, setLeavingId] = useState(null);

  useEffect(() => {
    setLeavingId(null);
  }, [choices]);

  if (!choices || choices.length === 0) return null;

  function pick(choice) {
    if (leavingId || disabled) return;
    setLeavingId(choice.id);
    window.setTimeout(() => onChoose(choice), 160);
  }

  return (
    <div className={`go-choices go-choices-mydondon ${leavingId ? 'go-choices-leaving' : ''}`}>
      <p className="go-choices-prompt">{resolvedPrompt}</p>
      <div className="go-choice-list">
        {choices.map((c) => (
          <button
            key={c.id}
            type="button"
            className="go-choice-btn"
            disabled={disabled || Boolean(leavingId)}
            onClick={() => pick(c)}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
