import { useEffect, useState } from 'react';
import { useT } from '../i18n';

// The one choice-row UI for every scenario04 dialogue surface: the chat
// screens (賣家/客服/165) and the 165 call captions.
//
// It lives in apps/blackpi rather than pages/scenario04 so ChatScreen can
// actually use it - apps/ may not import pages/scenario04 (see scripts/
// validate-app-boundaries.mjs), which is why ChatScreen previously carried
// its own copy of this markup. That copy rendered bare <button>s under a
// .bp-dialogue-choice-grid class that no stylesheet ever defined, so every
// chat choice fell back to the browser's default button chrome.
//
// Both surfaces also get the same anti-double-tap protection: immediate
// disable on click, the whole choice row fades out, and the actual
// engine.choose() only fires after a short delay - a fast double-tap can't
// fire twice, and a tap can't land while the other party is still
// "speaking" (disabled prop, e.g. isTyping).
export function DialogueChoiceGrid({
  choices,
  onChoose,
  disabled = false,
  prompt = '選擇你的回應',
  choiceButtonClassName = '',
  wrapperClassName = '',
}) {
  const t = useT();
  const [leavingId, setLeavingId] = useState(null);

  useEffect(() => {
    setLeavingId(null);
  }, [choices]);

  if (!choices || choices.length === 0) return null;

  function pick(choice) {
    if (leavingId || disabled || choice.disabled) return;
    setLeavingId(choice.id);
    window.setTimeout(() => onChoose(choice), 160);
  }

  return (
    <div className={`bp-chat-choices ${leavingId ? 'bp-chat-choices-leaving' : ''} ${wrapperClassName}`}>
      <p className="bp-chat-choices-prompt">{t(prompt)}</p>
      <div className={`bp-choice-grid${choices.length === 1 ? ' bp-choice-grid-single' : choices.length >= 3 ? ' bp-choice-grid-stack' : ''}`}>
        {choices.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`bp-choice-btn bp-choice-btn-2up ${choiceButtonClassName}`}
            disabled={c.disabled || disabled || Boolean(leavingId)}
            aria-label={t(c.label)}
            onClick={() => pick(c)}
          >
            {t(c.label)}
          </button>
        ))}
      </div>
    </div>
  );
}
