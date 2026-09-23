import { Search, Bell, ShoppingBag, ChevronRight } from 'lucide-react';
import { PhoneShell } from '../components/PhoneShell';
import { ProductCard } from '../components/ProductCard';
import { CompactProductRow } from '../components/CompactProductRow';
import { VEXA_FLEX_X1_PRODUCT, ROBOT_VACUUM_PRODUCT, HOME_DECOR_PRODUCTS } from '../data/catalog';
import { useT } from '../i18n';
import { useARInteraction } from '../../../lib/arInteraction';

// Screen 02 - 黑皮首頁. Both story products sit in a fixed, always-visible
// top row (left = VEXA FLEX X1, right = robot vacuum) so neither one depends on
// the player scrolling to find it; a short compact list of 3-4 decorative items
// below keeps the page feeling like a real storefront without a long scroll.
const HERO_PRODUCTS = [VEXA_FLEX_X1_PRODUCT, ROBOT_VACUUM_PRODUCT];
// The AR contract has exactly two gestures, so the hero row is a LEFT/RIGHT
// pair by construction. If this row ever stopped being a pair, the screen
// would have no legal geometry - so the contract below says so rather than
// silently declaring the first two.
const AR_HERO_PAIR = 2;

export function Home({ onSelectProduct }) {
  const t = useT();

  function openProduct(product) {
    // The App reports which product the shopper opened; what that means for
    // the run - and which screen comes next - is Scenario 04's call, not the
    // storefront's.
    onSelectProduct?.(product);
  }

  // AR Interaction Contract (lib/arInteraction). The storefront's front page
  // carries exactly two story products, in a fixed left/right row, and picking
  // one is the story step - so the geometry is `dual`, LEFT = the left card.
  //
  // Everything else on this screen - the search pill, the notification bell,
  // the tab bar and the decorative compact rows below - is storefront chrome.
  // It is not declared here, and since the inert-chrome pass it is not a
  // control under any input either: each one is a plain, handler-less element
  // (see the pill and the bell below, components/BottomNav.jsx and
  // components/CompactProductRow.jsx), so the two hero cards are the only
  // things on 首頁 a finger, a mouse or a gesture can reach.
  useARInteraction(HERO_PRODUCTS.length === AR_HERO_PAIR
    ? {
      mode: 'dual',
      surfaceId: 'blackpi/home',
      left: () => openProduct(HERO_PRODUCTS[0]),
      right: () => openProduct(HERO_PRODUCTS[1]),
    }
    : { mode: 'display', surfaceId: 'blackpi/home' });

  return (
    <PhoneShell nav="home">
      <header className="bp-header">
        <div className="bp-logo">
          <span className="bp-logo-mark"><ShoppingBag size={14} /></span>
          {t('黑皮購物')}
        </div>
        {/* The bell is storefront furniture: a header without one does not read
            as a shopping App. It used to pop a "no new notifications" toast,
            which is still an interaction on fake chrome - so it is a <span>
            now, with the same glyph in the same place and nothing to press. */}
        <span className="bp-icon-btn is-decorative" aria-hidden="true">
          <Bell size={20} />
        </span>
      </header>
      <div className="bp-scroll bp-page">
        <div className="bp-section">
          {/* Appearance only, exactly like the pills Search and SearchResults
              already render. Never an editable field: a readOnly one still
              takes focus and still raises the phone keyboard, which is why
              BlackPi has none anywhere. And since the inert-chrome pass, not a
              pressable control either - opening 搜尋 is not a story step, and a
              tap that leaves the scripted run is the one thing this screen must
              not offer. `is-decorative` takes the pointer events with it, so
              the pill is inert to touch, to mouse and to the gesture bridge
              alike. */}
          <div className="bp-searchbar is-decorative" style={{ width: '100%' }} aria-hidden="true">
            <Search size={16} />
            <span>{t('點這裡搜尋智慧掃地機器人或摺疊手機')}</span>
            <span className="bp-searchbar-cta">{t('搜尋 ')}<ChevronRight size={14} /></span>
          </div>
        </div>

        <div className="bp-section">
          <h2 className="bp-h2">{t('為你推薦')}</h2>
          <div className="bp-product-grid">
            {HERO_PRODUCTS.map((p) => (
              <ProductCard key={p.id} product={p} onClick={() => openProduct(p)} highlighted />
            ))}
          </div>
        </div>

        <div className="bp-section bp-card" style={{ padding: '4px 12px' }}>
          {HOME_DECOR_PRODUCTS.map((p) => (
            <CompactProductRow key={p.id} product={p} />
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}
