import { ChevronLeft, MapPin, Wallet } from 'lucide-react';
import { useStageClassName } from '../../../shell/StageClassContext';
import { getProductByRoute } from '../data/catalog';
import { DEMO_PHONE_NUMBER } from '../../../lib/constants';
import { feedback } from '../../../lib/feedback';
import { getLang, useT } from '../i18n';
import { useARInteraction } from '../../../lib/arInteraction';
import { readCachedSync } from '../../../lib/location/LocationProfileStore';
import { localizeRegion } from '../../../lib/location/localizedLocationName';

// Screen 07 - 結帳確認.
export function Checkout({ productRoute: route = null, onConfirmPayment, onBack }) {
  useStageClassName('blackpi-stage');
  const t = useT();
  const product = getProductByRoute(route);
  // The shopper's own address, masked. The region comes from the device's
  // locked location profile, which stores it in Chinese, so it is localized
  // before it goes into the address rather than being concatenated raw - an
  // English checkout used to ship to 臺北市信義區○○路＊＊號.
  const region = localizeRegion(readCachedSync().region, getLang());

  function confirm() {
    // The App reports the purchase; minting the order id, recording the order
    // and deciding what the shopper sees next all belong to Scenario 04 (see
    // pages/scenario04/blackpi/hosts.jsx), which is also why nothing here can
    // regenerate an id on a revisit. The payment chime is App feedback and
    // stays here.
    if (!product) return;
    onConfirmPayment?.(product);
    feedback('paymentSuccess');
  }

  // AR Interaction Contract: one story action - 確認付款. The address card and
  // the amount rows are display only, and the back arrow is chrome. Declared
  // above the empty-route guard so the hook order never depends on whether a
  // product resolved.
  useARInteraction(product
    ? { mode: 'single', surfaceId: 'blackpi/checkout', action: confirm }
    : { mode: 'display', surfaceId: 'blackpi/checkout-empty' });

  if (!product) return null;

  return (
    <div className="blackpi-app">
      <header className="bp-header">
        <button type="button" className="bp-icon-btn" aria-label={t('返回')} onClick={() => onBack?.()}>
          <ChevronLeft size={24} />
        </button>
        <div className="bp-header-title">{t('結帳確認')}</div>
        <span style={{ width: 44 }} />
      </header>
      <div className="bp-scroll bp-page">
        <div className="bp-card bp-section" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <MapPin size={18} color="var(--bp-primary-dark)" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 'var(--fs-body)' }}>{t('{region}○○路＊＊號', { region })}</div>
            <div className="bp-muted">{DEMO_PHONE_NUMBER}</div>
          </div>
        </div>

        <div className="bp-card bp-section">
          <h2 className="bp-h2">{t(product.shop)}</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-body)' }}>
            <span>{t(product.name)}</span>
            <span style={{ flex: 'none', marginLeft: 10 }}>NT${product.price.toLocaleString()}</span>
          </div>
        </div>

        <div className="bp-card bp-section">
          <div className="bp-score-row"><span className="bp-score-label">{t('商品金額')}</span><span>NT${product.price.toLocaleString()}</span></div>
          {/* A free-shipping product says so, rather than pricing the shipping
              at NT$0 - the same way components/ProductCard.jsx labels it. */}
          <div className="bp-score-row"><span className="bp-score-label">{t('運費')}</span><span>{product.shipping === 0 ? t('免運') : `NT$${product.shipping}`}</span></div>
          <div className="bp-score-row"><span className="bp-score-label" style={{ fontSize: 'var(--fs-title-sm)' }}>{t('應付金額')}</span><strong style={{ fontSize: 18, color: 'var(--bp-error)' }}>NT${product.total.toLocaleString()}</strong></div>
        </div>

        <div className="bp-card bp-section" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Wallet size={18} color="var(--bp-primary-dark)" />
          <span>{t('黑皮支付')}</span>
        </div>

        <div className="bp-btn-stack">
          <button type="button" className="bp-btn bp-btn-block" onClick={confirm}>{t('確認付款 NT$')}{product.total.toLocaleString()}</button>
        </div>
      </div>
    </div>
  );
}
