import { ChevronLeft, Menu, Phone, Search } from 'lucide-react';
import { getLanguage } from '../../../lib/lang';

export function LineAvatar({ name, src, size = 34 }) {
  const style = { width: size, height: size };
  return src
    ? <img className="line-avatar" style={style} src={src} alt={name || ''} />
    : <span className="line-avatar line-avatar-fallback" style={style} aria-label={name}>{name?.slice(0, 1) || 'L'}</span>;
}

export function LineHeader({ mode = 'direct', identity, onBack: _onBack, labels = {}, actions = true, showBack = Boolean(_onBack) }) {
  const name = identity?.displayName || identity?.name || '';
  const subtitle = mode === 'group' ? identity?.memberCount : identity?.status;
  const actionHandlers = typeof actions === 'object' ? actions : {};
  return <header className="line-header">
    {showBack && <span className="line-icon-btn" aria-hidden="true"><ChevronLeft size={26} /></span>}
    <LineAvatar name={name} src={identity?.avatar} size={34} />
    <div className="line-header-title"><div className="line-header-name">{name}</div>{subtitle && <div className="line-header-sub">{subtitle}</div>}</div>
    {actions && <div className="line-header-icons">
      {actionHandlers.search ? <button type="button" className="line-icon-btn" aria-label={labels.search || 'Search'} onClick={actionHandlers.search}><Search size={20} /></button> : <span className="line-icon-btn" aria-hidden="true"><Search size={20} /></span>}
      {actionHandlers.call ? <button type="button" className="line-icon-btn" aria-label={labels.call || 'Call'} onClick={actionHandlers.call}><Phone size={20} /></button> : <span className="line-icon-btn" aria-hidden="true"><Phone size={20} /></span>}
      {actionHandlers.menu ? <button type="button" className="line-icon-btn" aria-label={labels.menu || 'Menu'} onClick={actionHandlers.menu}><Menu size={20} /></button> : <span className="line-icon-btn" aria-hidden="true"><Menu size={20} /></span>}
    </div>}
  </header>;
}

export function LineIncomingBubble({ children, time, avatar, sender }) {
  return <div className={sender ? 'line-group-row' : 'chat-row chat-row-in'}>
    {sender && <LineAvatar name={sender} src={avatar} size={28} />}
    {sender ? <div className="line-group-content"><div className="line-group-sender">{sender}</div><div className="line-msg them">{children}</div></div> : <><div className="line-msg them">{children}</div>{time && <span className="chat-time">{time}</span>}</>}
  </div>;
}

export function LineIncomingMessage({ children, time }) { return <div className="chat-row chat-row-in">{children}{time && <span className="chat-time">{time}</span>}</div>; }

export function LineOutgoingBubble({ children, time, read = true, readLabel }) {
  const lang = getLanguage();
  const localizedRead = readLabel || (lang === 'en' ? 'Read' : lang === 'jp' ? '既読' : '已讀');
  return <div className="chat-row chat-row-out"><div className="chat-meta">{read && <span className="chat-read">{localizedRead}</span>}{time && <span className="chat-time">{time}</span>}</div><div className="line-msg me">{children}</div></div>;
}

export function LineSystemMessage({ children }) { return <div className="line-date-divider"><span>{children}</span></div>; }
export function LineTypingIndicator() { return <div className="line-typing" aria-label="typing"><i /><i /><i /></div>; }
export function LineChatScroll({ children, scrollRef, ...props }) { return <div className="line-chat-scroll" ref={scrollRef} {...props}>{children}</div>; }
// `label` has a language-aware default for the same reason `readLabel` above
// does: this is the shared LINE surface every scenario mounts, so a caller
// that leaves the label out must not be given a Chinese one. It used to
// default to the bare string '選擇一個回覆'.
export function LineQuickReplies({ options, onChoose, label, pickedIndex = null }) {
  const picked = pickedIndex !== null;
  const lang = getLanguage();
  const localizedLabel = label
    || (lang === 'en' ? 'Pick a reply' : lang === 'jp' ? '返信を選んでください' : '選擇一個回覆');
  return (
    <div className={`line-quick-replies${picked ? ' line-quick-replies-picked' : ''}`}>
      <div className="line-quick-label">{localizedLabel}</div>
      <div className="line-quick-pills">
        {options.map((option, index) => (
          <button
            key={option.id || option.label || index}
            type="button"
            className={`line-quick-pill${index === pickedIndex ? ' line-quick-pill-active' : ''}`}
            disabled={picked}
            onClick={() => onChoose(index, option)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
export function LineMediaMessage({ children, time }) { return <LineIncomingMessage time={time}><div className="line-media-shell">{children}</div></LineIncomingMessage>; }
export function LineConversation({
  mode = 'direct', identity, labels, onBack, children, messages,
  renderMessageExtra, footer, quickReplies, scrollRef, typing, actions,
  scrollProps, bodyBefore, bodyClassName, after, showBack, fullBleed = false,
}) {
  const transcript = children ?? messages?.map((message, index) => {
    const key = message.id ?? index;
    if (message.type === 'system') return <LineSystemMessage key={key}>{message.text}</LineSystemMessage>;
    const extra = renderMessageExtra?.(message, index);
    const content = <>{message.text}{extra}</>;
    return message.outgoing
      ? <LineOutgoingBubble key={key} time={message.time} read={message.read} readLabel={message.readLabel}>{content}</LineOutgoingBubble>
      : <LineIncomingBubble key={key} time={message.time} sender={message.sender} avatar={message.avatar}>{content}</LineIncomingBubble>;
  });
  return <div className={`line-app${fullBleed ? ' line-app-full' : ''}`}>
    <LineHeader mode={mode} identity={identity} labels={labels} onBack={onBack} actions={actions} showBack={showBack} />
    {bodyClassName ? <div className={bodyClassName}>{bodyBefore}<LineChatScroll scrollRef={scrollRef} {...scrollProps}>{transcript}{typing && <LineTypingIndicator />}</LineChatScroll></div> : <>{bodyBefore}<LineChatScroll scrollRef={scrollRef} {...scrollProps}>{transcript}{typing && <LineTypingIndicator />}</LineChatScroll></>}
    {(quickReplies || footer) && <footer className="line-chat-footer">{quickReplies}{footer && <div className="line-footer-content">{footer}</div>}</footer>}
    {after}
  </div>;
}
