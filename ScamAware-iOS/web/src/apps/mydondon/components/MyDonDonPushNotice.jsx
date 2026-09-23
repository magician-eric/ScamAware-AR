import { BuyerAvatar } from './Avatar';
import { useT } from '../i18n';

// The first message, delivered the way a phone actually delivers one:
// an OS notification that slides down over whatever is on screen.
//
// It used to be a card in the listing feed, which read as "the marketplace put
// an item at the top of your page" rather than "your phone just buzzed". The
// beat the scenario needs is 剛刊登完 → 馬上有人聯絡, so it has to arrive on
// top of the listing the player is still looking at, not become part of it.
//
// Everything shown here is handed in by the caller - whoever wrote (`sender`,
// with a name and an avatar) and the preview line to show. Nothing about the
// conversation is decided here; the notice only reports it and offers a
// shortcut into the chat the caller was going to open anyway.
export function MyDonDonPushNotice({ sender, preview, time, onOpen }) {
  const t = useT();
  return (
    <button
      type="button"
      className="md-push"
      onClick={onOpen}
      aria-label={t('{name} 傳來新訊息', { name: sender.name })}
    >
      <BuyerAvatar buyer={sender} size={38} className="md-push-avatar" />
      <span className="md-push-main">
        <span className="md-push-meta"><b>{t('買東東')}</b><span>{time}</span></span>
        <span className="md-push-name">{sender.name}</span>
        <span className="md-push-preview">{preview}</span>
      </span>
    </button>
  );
}
