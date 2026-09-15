import { useEffect, useRef } from 'react';
import { ProfileAvatar } from './ProfileAvatar';
import { MeetULogo } from './MeetULogo';

// MeetU's in-app chat presentation: branded header, message list, typing
// indicator and a footer slot. It renders whatever messages it is handed and
// nothing else - the script, the choices and what happens after the
// conversation all belong to whoever mounts it.
//
// Each message is `{ from: 'me' | 'them' | 'system', text, time }`; `time` is
// an already-formatted string and is simply omitted where the caller does not
// want a timestamp.
export function MeetUChatSurface({ peer, statusLabel, messages, typing = false, footer, className = '' }) {
  const scrollRef = useRef(null);

  // Pin to the newest message after every render - the conversation grows by
  // one bubble at a time and the view should follow it, exactly as it did
  // when each chat screen ran its own scroll effect.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  });

  return (
    <div className={`meetu-app${className ? ' ' + className : ''}`}>
      <header className="meetu-chat-header">
        <ProfileAvatar name={peer.name} src={peer.photo} size={peer.avatarSize ?? 38} status={peer.status} />
        <div className="meetu-chat-header-info">
          <div className="meetu-chat-header-name">{peer.name}</div>
          {statusLabel && <div className="meetu-chat-header-status">{statusLabel}</div>}
        </div>
        <MeetULogo size={18} variant="compact" />
      </header>
      <div className="meetu-chat-scroll" ref={scrollRef}>
        {messages.map((message, i) => {
          if (message.from === 'system') {
            return <div key={i} className="meetu-msg system">{message.text}</div>;
          }
          const mine = message.from === 'me';
          return (
            <div key={i} className={`meetu-msg-row${mine ? ' mine' : ''}`}>
              <div className={`meetu-msg ${mine ? 'me' : 'them'}`}>{message.text}</div>
              {message.time && <span className="meetu-msg-time">{message.time}</span>}
            </div>
          );
        })}
        {typing && <div className="meetu-typing"><i /><i /><i /></div>}
      </div>
      {footer}
    </div>
  );
}
