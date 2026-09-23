import { useEffect, useRef, useState } from 'react';
import { LineConversation, LineQuickReplies } from '../../../apps/line';
import { playSound } from '../../../lib/scenario03Feedback';
import { messageTimeLabel } from '../../../data/scenario03Config';
import { getScenario03Strings } from '../i18n';
import { StressText } from './StressText';

// Scenario-owned scripted-player adapter. LINE owns every visual surface;
// this adapter only translates story beats, choices, and card slots into the
// neutral LineConversation message contract.
export function ScriptedLineConversation({ title, subtitle, avatar, role, player, renderCard, footer, baseTime, bodyBefore }) {
  const scrollRef = useRef(null);
  const lastCountRef = useRef(0);
  const [pickedId, setPickedId] = useState(null);

  // Reset the picked state whenever a new choice moment appears so the
  // quick-reply pills re-enable for the next 2-choice beat.
  useEffect(() => {
    setPickedId(null);
  }, [player.choice?.id]);

  useEffect(() => {
    if (player.log.length > lastCountRef.current) {
      lastCountRef.current = player.log.length;
      const last = player.log[player.log.length - 1];
      if (last && last.speaker !== 'player') playSound('lineNotify');
    }
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [player.log]);

  function pickQuickReply(index, option) {
    if (pickedId) return;
    setPickedId(option.id);
    playSound('click');
    window.setTimeout(() => player.choose(option), 170);
  }

  // `*詞*` stress markers are authored into the dialogue text itself, so a
  // bubble has to run the same parser the subtitle plate does - otherwise
  // the asterisks show up verbatim in the chat.
  const messages = player.log.map((beat, index) => {
    const time = messageTimeLabel(baseTime ?? new Date(), index);
    const next = player.log[index + 1];
    const showMeta = !next || next.speaker !== beat.speaker || messageTimeLabel(baseTime ?? new Date(), index + 1) !== time;
    return {
      ...beat,
      text: <StressText text={beat.text} stressClassName="pol-line-stress" />,
      outgoing: beat.speaker === 'player',
      time: showMeta ? time : null,
      read: showMeta,
    };
  });

  return (
    <LineConversation
      fullBleed
      identity={{ displayName: title, avatar, status: subtitle, role }}
      showBack
      bodyBefore={bodyBefore}
      messages={messages}
      renderMessageExtra={(beat) => beat.card && renderCard ? <div className="pol-line-card-slot">{renderCard(beat)}</div> : null}
      scrollRef={scrollRef}
      typing={!player.done && !player.choice && !player.current}
      quickReplies={player.choice ? (
        <LineQuickReplies
          key={player.choice.id}
          options={player.choice.options}
          label={player.choice.question ?? getScenario03Strings().components.choicePanelDefault}
          pickedIndex={pickedId ? player.choice.options.findIndex((option) => option.id === pickedId) : null}
          onChoose={pickQuickReply}
        />
      ) : null}
      footer={player.done ? footer : null}
    />
  );
}
