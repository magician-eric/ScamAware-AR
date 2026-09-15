import { Layers, MessageCircle, UserRound } from 'lucide-react';

// lucide-react has no icon literally named "Cards" - Layers (a card-stack
// glyph) is the closest real icon for the explore/swipe tab.
const TABS = [
  { key: 'cards', Icon: Layers, label: '探索' },
  { key: 'messages', Icon: MessageCircle, label: '訊息' },
  { key: 'profile', Icon: UserRound, label: '個人檔案' },
];

export function MeetUBottomNav({ active = 'cards' }) {
  return (
    <nav className="meetu-bottom-nav">
      {TABS.map(({ key, Icon }) => (
        <div
          key={key}
          className="meetu-bottom-nav-btn"
          aria-hidden="true"
          style={{ color: active === key ? '#FF4668' : '#A6A6AF' }}
        >
          <Icon size={24} strokeWidth={active === key ? 2.4 : 2} />
        </div>
      ))}
    </nav>
  );
}
