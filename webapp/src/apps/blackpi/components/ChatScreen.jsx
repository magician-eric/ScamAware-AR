import { useEffect, useRef } from 'react';
import { ChevronLeft, ShieldAlert } from 'lucide-react';
import { AssetImage } from './AssetImage';
import { DialogueChoiceGrid } from './DialogueChoiceGrid';
import { getAsset } from '../data/assetMap';
import { useT } from '../i18n';

const SPEAKER_LABEL = { seller: '賣家', platform: '黑皮客服', system: '', buyer: '我' };

function Bubble({ item }) {
  const t = useT();
  const mine = item.speaker === 'buyer';
  if (item.type === 'notice') {
    return (
      <div className="bp-app-notice" role="note">
        <ShieldAlert size={16} />
        <div>
          <div className="bp-app-notice-title">{t(item.data?.title) || t('提醒')}</div>
          <div className="bp-app-notice-body">{t(item.text)}</div>
        </div>
      </div>
    );
  }
  // The platform's own status card for a shop that has gone dark (退款拖延's
  // 賣家失聯 beat). Centred and attributed to nobody: no avatar, no read
  // receipt, and neither a seller nor a buyer bubble, because the storefront
  // is reporting the shop's state, not either side speaking. Checked before
  // the generic system-row branch below, which would otherwise flatten it
  // into the grey pill: this message is authored with speaker 'system' too.
  if (item.type === 'shop-status') {
    return (
      <div className="bp-shop-status" role="status">
        <div className="bp-shop-status-title">{t(item.data?.title)}</div>
        <div className="bp-shop-status-body">{t(item.text)}</div>
      </div>
    );
  }
  if (item.type === 'system' || item.speaker === 'system') {
    return <div className="bp-system-row">{t(item.text)}</div>;
  }
  if (item.type === 'checklist') {
    return null;
  }
  if (item.type === 'product-card') {
    const asset = getAsset(item.assetKey);
    return (
      <div className="bp-msg-row theirs">
        <div className="bp-product-msg-card">
          <AssetImage assetKey={item.assetKey} label={asset.label} size="" iconSize={16} />
          <div className="bp-product-msg-info">
            <div className="bp-product-msg-name">{t(asset.label)}</div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={`bp-msg-row ${mine ? 'mine' : 'theirs'}`}>
      {mine && item.status && (
        <span className="bp-msg-status">{item.status === 'read' ? t('已讀') : item.status === 'delivered' ? t('已送達') : ''}</span>
      )}
      <div className={`bp-bubble ${mine ? 'mine' : 'theirs'}`}>{t(item.text)}</div>
    </div>
  );
}

// Chat surface shared by every scenario04 conversation. Choices always
// render as a fixed two-up row (spec: every in-character exchange is a
// 2-choice beat, never a free-text box pretending the player can type
// anything) - a two-column grid on normal widths, stacking to one column
// only under ~360px so both buttons stay comfortably tappable.
export function ChatScreen({
  headerTitle,
  headerRole = null,
  headerSub,
  // No default: the fallback is `t('賣')` at the render site below, so a host
  // that leaves the avatar initial out gets it in the player's language
  // instead of the Chinese character this used to default to.
  avatarLabel,
  avatarVariant = 'primary',
  headerClassName = '',
  engine,
  onBack,
  shopClosed = false,
  extraHeaderContent = null,
}) {
  const { timeline, isTyping, pendingChoices, choose } = engine;
  const choices = pendingChoices ?? [];
  const scrollRef = useRef(null);
  const t = useT();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [timeline, isTyping, pendingChoices]);

  return (
    <>
      <header className={`bp-chat-header ${headerClassName}`}>
        <button type="button" className="bp-icon-btn" aria-label={t('返回')} onClick={onBack}>
          <ChevronLeft size={24} />
        </button>
        {/* `avatarLabel` may be an initial or a node - e.g. the 黑皮購物 mark
            for the platform's own bot, which should show the brand rather
            than a stand-in character. */}
        <div className={`bp-chat-avatar${avatarVariant === 'primary' ? '' : ` ${avatarVariant}`}`} aria-hidden="true">{avatarLabel ?? t('賣')}</div>
        <div className="bp-chat-titles">
          <div className="bp-chat-name">{headerTitle}</div>
          {/* Optional middle line for a named person's job title, so the
              header can read as name / role / status without the name having
              to share a line with it. */}
          {headerRole && <div className="bp-chat-role">{headerRole}</div>}
          {headerSub && <div className="bp-chat-sub">{headerSub}</div>}
        </div>
        {extraHeaderContent}
      </header>
      {shopClosed && <div className="bp-shop-closed-banner" role="status">{t('店家暫停營業')}</div>}
      <div className="bp-chat-scroll" ref={scrollRef} aria-live="polite">
        {timeline.map((item) => (
          <Bubble key={item.key} item={item} />
        ))}
        {isTyping && (
          <div className="bp-typing" aria-label={`${t(SPEAKER_LABEL[timeline[timeline.length - 1]?.speaker]) || t('對方')}${t('輸入中')}`}>
            <i /><i /><i />
          </div>
        )}
      </div>
      <DialogueChoiceGrid choices={choices} onChoose={choose} disabled={isTyping} />
    </>
  );
}
