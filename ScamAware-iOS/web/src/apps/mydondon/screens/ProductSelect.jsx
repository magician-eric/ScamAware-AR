import { useEffect, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { PhoneShell } from '../components/PhoneShell';
import { ProductPhoto } from '../components/ProductPhoto';
import { useT } from '../i18n';
import { useARInteraction } from '../../../lib/arInteraction';

// Screen S01 - MyDonDon 買東東・選擇要出售的商品.
//
// The player reached this screen by tapping the 刊登 banner inside MyDonDon,
// so it stays inside MyDonDon: the app's light surface, its blue, its rounded
// cards, its back-header. It used to wear the dark CIBAR setup chrome
// (互動情境 05 / 幽靈訂單), which dropped the player out of the app one tap
// after they entered it. The scenario's own title belongs to the experience
// shell around the phone, never to a screen inside an in-world app.
//
// Picking an item is a single tap - the old "選擇 → 確認刊登" double step is
// gone (spec section 6). The tap paints the selected state, holds it just long
// enough to read (spec section 7), then hands over.
//
// The screen owns the picker and its feedback beat only. `products` comes in
// from the caller, `onProductSelected` reports the choice the moment it is
// made, and `onListingPublished` fires once the feedback has been read - the
// mounting scenario decides what either one means for its story.
const SELECT_FEEDBACK_MS = 220;
// Two gestures, so a picker that is a real AR decision has to be a pair.
const AR_PICK_PAIR = 2;

export function ProductSelect({ products = [], onProductSelected, onListingPublished, onBack }) {
  const t = useT();
  const [selected, setSelected] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  function pick(id) {
    if (selected) return;
    setSelected(id);
    onProductSelected?.(id);
    timerRef.current = setTimeout(() => onListingPublished?.(id), SELECT_FEEDBACK_MS);
  }

  // AR Interaction Contract (lib/arInteraction): which item the player lists is
  // a genuine two-way story decision, and the picker draws the pair in list
  // order, so LEFT is products[0]. This is the App-layer exception the contract
  // allows - the screen IS the decision, and both sides run the same `pick`
  // the buttons run, including its anti-double-tap guard, which is why
  // `disabled` follows the same `selected` flag the buttons do.
  useARInteraction(products.length === AR_PICK_PAIR
    ? {
      mode: 'dual',
      surfaceId: 'mydondon/product-select',
      left: () => pick(products[0].id),
      right: () => pick(products[1].id),
      disabled: Boolean(selected),
    }
    : { mode: 'display', surfaceId: 'mydondon/product-select' });

  return (
    <PhoneShell context="mydondon">
      <header className="md-subheader">
        <button
          type="button"
          className="md-icon-btn"
          aria-label={t('返回')}
          onClick={onBack}
        >
          <ChevronLeft size={22} />
        </button>
        <span className="md-subheader-title">{t('刊登商品')}</span>
      </header>
      <div className="go-scroll md-pick-page">
        <h1 className="md-pick-h1">{t('選擇要出售的商品')}</h1>
        <p className="md-pick-sub">{t('選擇一件商品開始刊登')}</p>
        <div className="md-pick-list">
          {products.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`md-pick${selected === p.id ? ' selected' : ''}`}
              onClick={() => pick(p.id)}
              aria-pressed={selected === p.id}
              disabled={Boolean(selected) && selected !== p.id}
            >
              <ProductPhoto product={p} className="md-pick-img" />
              <span className="md-pick-body">
                <span className="md-pick-name">{p.name}</span>
                <span className="md-pick-desc">{p.desc}</span>
                <span className="md-pick-price">{p.price}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="go-spacer" />
      </div>
    </PhoneShell>
  );
}
