import { Search, SlidersHorizontal } from 'lucide-react';
import { useT } from '../i18n';
import { MyDonDonBottomNav } from '../components/MyDonDonBottomNav';
import { MyDonDonHeader } from '../components/MyDonDonHeader';
import { PhoneShell } from '../components/PhoneShell';

// MyDonDon's feed as the player first sees it: search bar, the 刊登 entry
// point, and nothing else.
//
// There is deliberately no "為你推薦" product rail here. The only two products
// in this scenario are the ones the player is about to choose between on the
// next screen, so showing them as someone else's listings first would read as
// if the marketplace were already selling the player's own item.
//
// The whole 把閒置變現金 banner is the tap target (one CTA, one screen). The
// hint on its bottom-right is text, not a second button inside the banner -
// a white pill there competed with the banner it sits in.
//
// Presentation only: every tap leaves through a marketplace callback
// (`onSellItem`, plus the tab bar's `nav`). Whichever story step those
// callbacks lead to is decided by the scenario that mounts this screen.
export function Home({ onSellItem, nav }) {
  const t = useT();
  return (
    <PhoneShell context="mydondon">
      <MyDonDonHeader />
      <main className="go-scroll md-home-feed">
        <div className="md-home-search"><Search size={18} /><span>{t('搜尋二手好物')}</span><SlidersHorizontal size={17} /></div>
        <button type="button" className="md-home-sell" onClick={onSellItem}>
          <strong>{t('把閒置變現金')}</strong>
          <span className="md-home-sell-sub">{t('簡單刊登，讓好物找到新主人')}</span>
          <span className="md-home-sell-action">{t('我要賣・刊登商品 →')}</span>
        </button>
        <div className="go-spacer" />
      </main>
      <MyDonDonBottomNav active="home" nav={nav} />
    </PhoneShell>
  );
}
