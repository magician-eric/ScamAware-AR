import { Home, Grid2x2, MessageCircle, Package, User } from 'lucide-react';
import { useT } from '../i18n';

// The App's own five destinations - 首頁/分類/訊息/訂單/我的 - drawn as
// scenery and nothing else.
//
// A storefront that has no tab bar does not read as a storefront, so the bar
// stays on screen, keeps its icons, its labels and the highlight on whichever
// tab the current screen belongs to. What it does not keep is any way to be
// used: each tab is a plain div rather than a control element, so there is
// nothing to click, nothing to tap, nothing in the tab order to focus and no
// handler for the AR gesture bridge to reach. `active` is a paint instruction,
// not a selection.
//
// Same rule, and the same shape, as the other fake App footers in this
// codebase - MyDonDonBottomNav, MeetUBottomNav and GuGo's BottomNav - and it
// is pinned from three sides: scripts/ar-interaction-regression-rules.mjs
// (no control semantics in this file), scripts/blackpi-inert-chrome.test.mjs
// (the rendered bar, under pointer and under gesture) and
// scripts/blackpi-navigation-boundary.test.mjs (no screen wearing the bar
// emits anything when its chrome is pressed).
const TABS = [
  { id: 'home', label: '首頁', icon: Home },
  { id: 'category', label: '分類', icon: Grid2x2 },
  { id: 'messages', label: '訊息', icon: MessageCircle },
  { id: 'orders', label: '訂單', icon: Package },
  { id: 'me', label: '我的', icon: User },
];

export function BottomNav({ active }) {
  const t = useT();
  return (
    <nav className="bp-bottom-nav" aria-label={t('主要導覽')}>
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === active;
        return (
          <div
            key={tab.id}
            className={`bp-nav-btn${isActive ? ' active' : ''}`}
            aria-hidden="true"
          >
            <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
            {t(tab.label)}
          </div>
        );
      })}
    </nav>
  );
}
