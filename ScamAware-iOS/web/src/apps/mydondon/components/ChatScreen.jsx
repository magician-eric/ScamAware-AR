import { useEffect, useRef } from 'react';
import { ChevronLeft, Link2 } from 'lucide-react';
import { ChoiceList } from './ChoiceList';
import { MyDonDonLogo } from './MyDonDonLogo';
import { useT } from '../i18n';

// MyDonDon's one-to-one message screen. This surface belongs to the MyDonDon
// app and nothing else: rounded blue/grey bubbles, the app's chat header, its
// app mark (spec sections 16 / 39).
//
// This component only ever renders scenario05 copy, so it reaches for
// scenario05's useT() directly (same reasoning as ChoiceList/Placeholder).
function Bubble({ item }) {
  const mine = item.speaker === 'me';

  if (item.type === 'timestamp') {
    return <div className="md-chat-timestamp">{item.text}</div>;
  }
  if (item.speaker === 'system') {
    return <div className="md-system-row">{item.text}</div>;
  }
  if (item.type === 'link-card') {
    // A link marketplaceBuyer sent (or the player sent her) to an outside website. It is
    // a preview INSIDE the MyDonDon conversation, so the MyDonDon frame stays;
    // opening it is what actually leaves the app.
    return (
      <div className={`md-msg-row ${mine ? 'mine' : 'theirs'}`}>
        <div className="md-link-card">
          {item.text && <div className="md-link-card-lead">{item.text}</div>}
          <div className="md-link-card-body">
            <span className="md-link-card-icon" aria-hidden="true"><Link2 size={17} /></span>
            <div className="md-link-card-info">
              <div className="md-link-card-title">{item.data.title}</div>
              <div className="md-link-card-url">{item.data.url}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`md-msg-row ${mine ? 'mine' : 'theirs'}`}>
      <div className={`md-bubble ${mine ? 'mine' : 'theirs'}`}>{item.text}</div>
    </div>
  );
}

export function ChatScreen({ engine, choicePrompt, introContent, avatar, name, status }) {
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
      <header className="md-chat-header">
        <span className="md-icon-btn md-icon-display" aria-hidden="true">
          <ChevronLeft size={22} />
        </span>
        {avatar}
        <div className="md-chat-identity">
          <div className="md-chat-name">{name}</div>
          <div className="md-chat-sub"><span className="md-online-dot" aria-hidden="true" />{status}</div>
        </div>
        {/* The one piece of MyDonDon branding a chat screen carries: the app
            mark, so the player can see whose messenger they are in. It stays
            here and nowhere else - the 黑皮通 site, the fake support site, the
            bank and the CIBAR result screens never show it. The old ⋮ button
            went with it; it opened nothing. */}
        <MyDonDonLogo variant="appIcon" height={26} className="md-chat-brand" />
      </header>
      <div className="md-chat-scroll" ref={scrollRef} aria-live="polite">
        {introContent}
        {timeline.map((item) => (
          <Bubble key={item.key} item={item} />
        ))}
        {isTyping && (
          <div className="md-typing" aria-label={t('對方輸入中')}>
            <i /><i /><i />
          </div>
        )}
      </div>
      {/* The screen ends at the quick replies: no tab bar (a one-to-one chat
          is a pushed screen), and no text field either - there is nothing to
          type into in this scenario, and a permanently disabled input is
          furniture pretending to be a control. */}
      <ChoiceList choices={pendingChoices} onChoose={choose} disabled={isTyping} prompt={choicePrompt} />
    </>
  );
}
