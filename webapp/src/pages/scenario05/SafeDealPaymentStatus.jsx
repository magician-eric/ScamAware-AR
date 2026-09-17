import { useNavigate } from 'react-router-dom';
import { PhoneShell } from '../../apps/mydondon';
import { BrowserChrome } from './components/BrowserChrome';
import { SuqubianSiteHeader } from './components/SuqubianSiteHeader';
import { FAKE_TRADE_SITE_BRAND, FAKE_TRADE_SITE_DOMAIN } from '../../data/scenario05FakeSite';
import { useT } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

// SafeDeal（假交易網站）・收款狀態 - what the player finds when they go back
// to the site to check the payment the buyer swears they made.
//
// Everything on this page is the scam site talking about itself. "買方聲稱已
// 付款" is worded as the claim it is, never as a verified fact: the site is
// controlled by the scammer, and the whole point of the beat is that nothing
// the player can see here is evidence of anything. The real official
// platform - MyDonDon - has already shown them the truth (no order), which is
// exactly why the fake site has to explain the gap away.
//
// The gap it invents is the player's own account: the money is supposedly
// there, and the only thing standing between them and it is a verification
// they haven't done. The single control leads to the "support desk" that
// will ask for the deposit (see SafeDealSupportChat.jsx).
export function SafeDealPaymentStatus() {
  const navigate = useNavigate();
  const t = useT();
  const contactSupport = () => navigate('/scenario05-atm/safedeal-support');

  // AR Interaction Contract: one story action - 聯繫客服 - which is also the
  // only button on the page.
  useARInteraction({ mode: 'single', surfaceId: 'scenario05/safedeal-payment-status', action: contactSupport });

  return (
    <PhoneShell context="hpefake">
      <BrowserChrome domain={FAKE_TRADE_SITE_DOMAIN} />
      <SuqubianSiteHeader section={t('收款狀態')} brand={FAKE_TRADE_SITE_BRAND} tag={t('安全交易・安心收付')} />
      <div className="go-scroll sq-page">
        <div className="sq-field">
          <div className="sq-field-label">{t('買方付款狀態')}</div>
          <div className="sq-field-value">{t('買方聲稱已付款')}</div>
        </div>
        <div className="sq-field">
          <div className="sq-field-label">{t('賣方收款狀態')}</div>
          <div className="sq-field-value strong">{t('賣方尚未完成首次收款認證')}</div>
        </div>
        <section className="sq-card">
          <div className="sq-card-title">{t('系統提示')}</div>
          <p>{t('您的收款功能尚未啟用。請聯繫客服完成首次收款認證。')}</p>
        </section>
        <div className="go-spacer" />
        <button type="button" className="sq-btn" onClick={contactSupport}>
          {t('聯繫客服')}
        </button>
      </div>
    </PhoneShell>
  );
}
