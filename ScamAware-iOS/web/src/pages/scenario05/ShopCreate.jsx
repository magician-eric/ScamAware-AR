import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { PhoneShell } from '../../apps/mydondon';
import { HpeLogo } from '../../apps/hpe-logistics';
import { BrowserChrome } from './components/BrowserChrome';
import { SuqubianSiteHeader } from './components/SuqubianSiteHeader';
import { getProduct } from '../../apps/mydondon';
import { useScenario05State, getBuyerCast } from '../../lib/scenario05Store';
import { getSellerName } from '../../data/scenario05Characters';
import { FAKE_TRADE_SITE_BRAND, FAKE_TRADE_SITE_DOMAIN } from '../../data/scenario05FakeSite';
import { useT, useScenario05Lang } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

// Screen S05 - SafeDeal（假交易網站）・建立賣場.
//
// The player has left MyDonDon: this is an outside website the fake buyer
// linked them to, opened in the phone's browser, so it shows the browser
// chrome and this site's own masthead, and carries none of MyDonDon's
// header, tab bar, logo or blue (spec sections 20-21).
//
// This site is NOT 黑皮通 - HPE is the story's real logistics/delivery
// service and never builds listings, takes payment, or hosts a shop
// (spec section 39 rewrite). SafeDeal is a wholly fictional "buyer
// protection" trading site the scammer controls from the start; the only
// place 黑皮通 legitimately appears on this page is the delivery method
// field, since HPE really does carry the convenience-store handoff.
//
// The form is deliberately minimal and entirely pre-filled with fake,
// scenario-only data - the scenario never asks for a real name, phone,
// address or bank account. The sender name is drawn once per run from the
// shared character name pool (see data/scenario05Characters.js); the phone
// number is a fixed placeholder, not a generated one.
const SENDER_PHONE = '0995-165-165';

export function ShopCreate() {
  const navigate = useNavigate();
  const t = useT();
  const lang = useScenario05Lang();
  const [state] = useScenario05State();
  const product = getProduct(state.selectedProduct, lang);
  const sellerName = getSellerName(getBuyerCast(), lang);
  const [phase, setPhase] = useState('idle'); // idle | loading | success

  useEffect(() => {
    if (!product) navigate('/scenario05-atm', { replace: true });
  }, [product, navigate]);

  function submit() {
    if (phase !== 'idle') return;
    setPhase('loading');
    setTimeout(() => setPhase('success'), 400);
    setTimeout(() => navigate('/scenario05-atm/chat', { replace: true }), 900);
  }

  // AR Interaction Contract: one story action - 建立交易 - and it stops being
  // one the moment it is submitted, exactly as the button stops being enabled.
  useARInteraction({
    mode: 'single',
    surfaceId: 'scenario05/shop-create',
    action: submit,
    disabled: phase !== 'idle' || !product,
  });

  if (!product) return null;

  return (
    <PhoneShell context="hpefake">
      <BrowserChrome domain={FAKE_TRADE_SITE_DOMAIN} />
      <SuqubianSiteHeader section={t('建立專屬交易')} brand={FAKE_TRADE_SITE_BRAND} tag={t('安全交易・安心收付')} />
      <div className="go-scroll sq-page">
        <div className="sq-field">
          <div className="sq-field-label">{t('商品名稱')}</div>
          <div className="sq-field-value">{product.name}</div>
        </div>
        <div className="sq-field">
          <div className="sq-field-label">{t('商品價格')}</div>
          <div className="sq-field-value strong">{product.price}</div>
        </div>
        <div className="sq-field">
          <div className="sq-field-label">{t('配送方式')}</div>
          <div className="sq-field-value sq-field-carrier">
            <span>{t('黑皮通超商取貨')}</span>
            {/* The carrier's own delivery mark, rendered through HPE's own
                component from its own artwork - SafeDeal names a real courier
                here because 黑皮通 really does carry the handoff. Nothing of
                HPE's CIS is redefined on this page. */}
            <HpeLogo variant="deliveryIcon" height={20} />
          </div>
        </div>
        <div className="sq-field">
          <div className="sq-field-label">{t('寄件人資料（預填）')}</div>
          <div className="sq-field-value">{t('{name} ・ {phone}', { name: sellerName, phone: SENDER_PHONE })}</div>
        </div>
        <div className="go-spacer" />
        <button type="button" className="sq-btn" onClick={submit} disabled={phase !== 'idle'}>
          {phase === 'idle' ? t('建立交易') : t('建立中…')}
        </button>
      </div>
      {phase === 'success' && (
        <div className="sq-success">
          <span className="sq-success-check" aria-hidden="true"><CheckCircle2 size={34} /></span>
          <p className="sq-success-title">{t('交易已建立')}</p>
          <p className="sq-success-sub">{t('專屬交易連結已產生')}</p>
        </div>
      )}
    </PhoneShell>
  );
}
