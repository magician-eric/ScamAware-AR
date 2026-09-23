import { useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useT } from '../i18n';

// The message surface for SafeDeal's fake support desk. It belongs to the
// fake trading site and wears only that site's clothes: purple sq- chrome
// inside the browser, never MyDonDon's blue bubbles, its chat header, its app
// mark or its quick-reply pills (the two worlds have to stay unmistakable -
// see apps/mydondon/styles/index.css's header). It is a separate surface from
// MyDonDon's ChatScreen for that reason, not a reskin of it.
//
// It renders four kinds of row:
//   agent           the "support agent" speaking
//   me              the player
//   progress        the simulated identity check, still running
//   progress-done   the same check, finished
//
// The progress rows are the whole of the fake 身分驗證: no form, no field, no
// real personal data is ever asked of the player anywhere in this scenario.
function Row({ item }) {
  if (item.type === 'progress') {
    return (
      <div className="sq-chat-progress">
        <span className="sq-chat-progress-track" aria-hidden="true"><i /></span>
        <span>{item.text}</span>
      </div>
    );
  }
  if (item.type === 'progress-done') {
    return (
      <div className="sq-chat-progress is-done">
        <CheckCircle2 size={16} aria-hidden="true" />
        <span>{item.text}</span>
      </div>
    );
  }
  if (item.speaker === 'system') {
    return <div className="sq-chat-note">{item.text}</div>;
  }
  const mine = item.speaker === 'me';
  return (
    <div className={`sq-msg-row ${mine ? 'mine' : 'theirs'}`}>
      <div className={`sq-bubble ${mine ? 'mine' : 'theirs'}`}>{item.text}</div>
    </div>
  );
}

// The site's own reply row. Same anti-double-tap shape as MyDonDon's
// ChoiceList (immediate disable, a short fade before the pick fires) so a
// second tap - or a gesture landing on top of a tap - cannot answer twice;
// the skin is SafeDeal's.
function SupportChoiceList({ choices, onChoose, disabled, prompt }) {
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
    <div className={`go-choices go-choices-safedeal ${leavingId ? 'go-choices-leaving' : ''}`}>
      <p className="go-choices-prompt">{prompt}</p>
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

export function SafeDealSupportSurface({ engine, choicePrompt }) {
  const t = useT();
  const { timeline, isTyping, pendingChoices, choose } = engine;
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [timeline, isTyping, pendingChoices]);

  return (
    <>
      <div className="sq-chat-scroll" ref={scrollRef} aria-live="polite">
        {timeline.map((item) => (
          <Row key={item.key} item={item} />
        ))}
        {isTyping && (
          <div className="sq-typing" aria-label={t('對方輸入中')}>
            <i /><i /><i />
          </div>
        )}
      </div>
      <SupportChoiceList choices={pendingChoices} onChoose={choose} disabled={isTyping} prompt={choicePrompt} />
    </>
  );
}
