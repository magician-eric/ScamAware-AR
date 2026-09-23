import { useEffect, useState } from 'react';
import { Eye, Heart, MessageSquare } from 'lucide-react';
import { PhoneShell } from '../components/PhoneShell';
import { MyDonDonHeader } from '../components/MyDonDonHeader';
import { MyDonDonBottomNav } from '../components/MyDonDonBottomNav';
import { ProductPhoto } from '../components/ProductPhoto';
import { MyDonDonPushNotice } from '../components/MyDonDonPushNotice';
import { useT } from '../i18n';

// Screen S02 - MyDonDon 買東東・刊登成功貼文＋訊息通知.
//
// This is where the player actually enters the app: MyDonDon's white header
// with the brand logo on top, its tab bar underneath, the listing they just
// posted in between.
//
// The first message arrives as a phone notification over this screen
// (MyDonDonPushNotice), not as a card in the feed - the beat is "I just posted
// something and my phone buzzed", which a row of page content cannot play. The
// notice holds for five seconds and then the conversation opens itself, so the
// player never has to hunt for the message; tapping it early just skips the
// wait. The 訊息 tab still carries the unread badge as a second, redundant
// hint (spec section 15).
//
// Who wrote, what they wrote and where the conversation goes are all the
// caller's: `listing` is the posted item, `incomingMessage` is the notice to
// present ({ sender, preview, time }), and `onOpenConversation` is the single
// way out of this screen. This screen only presents them.
const NOTICE_DELAY_MS = 1200;   // beat between "posted" and the phone buzzing
const NOTICE_SLIDE_MS = 420;    // matches the .md-push slide-in
const NOTICE_HOLD_MS = 5000;    // time to read it before the chat takes over

export function Listing({ listing, seller, incomingMessage, onOpenConversation, nav }) {
  const t = useT();
  const [showNotif, setShowNotif] = useState(false);
  const sellerName = seller?.name ?? t('我的帳號');
  const sellerInitial = seller?.initial ?? t('我');
  const postedAt = listing?.postedAtLabel ?? t('19:42 發布 ・ 二手拍賣');

  useEffect(() => {
    if (!listing || !incomingMessage) return undefined;
    const timer = setTimeout(() => setShowNotif(true), NOTICE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [listing, incomingMessage]);

  // Once it has finished sliding in, the notice reads for NOTICE_HOLD_MS and
  // then hands over on its own.
  useEffect(() => {
    if (!showNotif) return undefined;
    const timer = setTimeout(() => onOpenConversation?.(), NOTICE_SLIDE_MS + NOTICE_HOLD_MS);
    return () => clearTimeout(timer);
  }, [showNotif, onOpenConversation]);

  if (!listing) return null;

  return (
    <PhoneShell context="mydondon">
      <MyDonDonHeader unread={showNotif ? 1 : 0} />
      <div className="go-scroll md-feed">
        <div className="md-post">
          <div className="md-post-head">
            <span className="md-post-avatar" aria-hidden="true">{sellerInitial}</span>
            <div>
              <div className="md-post-author">{sellerName}</div>
              <div className="md-post-meta">{postedAt}</div>
            </div>
          </div>
          <div className="md-post-hero">
            <ProductPhoto product={listing} />
          </div>
          <div className="md-post-body">
            <div className="md-post-name">{listing.name}</div>
            <div className="md-post-desc">{listing.desc}</div>
            <div className="md-post-price">{listing.price}</div>
            <div className="md-post-stats">
              <span><Eye size={13} aria-hidden="true" />{t('瀏覽 36')}</span>
              <span><Heart size={13} aria-hidden="true" />{t('收藏 2')}</span>
              <span><MessageSquare size={13} aria-hidden="true" />{t('留言 1')}</span>
            </div>
          </div>
        </div>
      </div>
      <MyDonDonBottomNav active="home" messageBadge={showNotif ? 1 : 0} nav={nav} />
      {showNotif && incomingMessage && (
        <MyDonDonPushNotice
          sender={incomingMessage.sender}
          preview={incomingMessage.preview}
          time={incomingMessage.time}
          onOpen={() => onOpenConversation?.()}
        />
      )}
    </PhoneShell>
  );
}
