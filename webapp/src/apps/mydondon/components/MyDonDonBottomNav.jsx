import { CirclePlus, Compass, Home, MessageCircle, User } from 'lucide-react';
import { useT } from '../i18n';

// MyDonDon's tab bar. Deliberately mounted by the feed screen only: a
// one-to-one chat is a pushed screen in every consumer app, so BuyerChat does
// NOT render it (spec section 17), and no other in-world context - 黑皮通, the
// fake support site, the bank, the CIBAR result screens - may render it at
// all (spec sections 15 / 38).
//
// All tabs are inert scenery in the AR scenario. The unread badge on 訊息 is the second, redundant
// signal that marketplaceBuyer has written (spec section 15) - the message
// card in the feed is the primary one.
const TABS = [
  { id: 'home', label: '首頁', icon: Home },
  { id: 'explore', label: '探索', icon: Compass },
  { id: 'sell', label: '刊登', icon: CirclePlus },
  { id: 'messages', label: '訊息', icon: MessageCircle },
  { id: 'me', label: '我的', icon: User },
];

export function MyDonDonBottomNav({ active, messageBadge = 0 }) {
  const t = useT();
  return (
    <nav className="md-bottom-nav" aria-label={t('MyDonDon 主要導覽')}>
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === active;
        const badge = tab.id === 'messages' ? messageBadge : 0;
        return (
          <div
            key={tab.id}
            className={`md-nav-btn${isActive ? ' active' : ''}`}
            aria-hidden="true"
          >
            <span className="md-nav-icon">
              <Icon size={21} strokeWidth={isActive ? 2.4 : 1.8} />
              {badge > 0 && <span className="md-nav-badge">{badge}</span>}
            </span>
            {t(tab.label)}
          </div>
        );
      })}
    </nav>
  );
}
