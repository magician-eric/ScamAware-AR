import { useNavigate } from 'react-router-dom';
import { PhoneShell } from '../../apps/mydondon';
import { BrowserChrome } from './components/BrowserChrome';
import { SuqubianSiteHeader } from './components/SuqubianSiteHeader';
import { FAKE_TRADE_SITE_BRAND, FAKE_TRADE_SITE_DOMAIN } from '../../data/scenario05FakeSite';
import { useT } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

// SafeDeal（假交易網站）・交易安全提醒. Reached when the player chooses to
// check the official process before creating a shop. It is a page on the
// same outside website as ShopCreate - same browser chrome, same masthead,
// same address - and returns to the MyDonDon conversation.
//
// This is the scam site itself (spec section 39 rewrite: 黑皮通 never builds
// listings or hosts a shop, so there is no genuine "official 黑皮通 process"
// to send the player to here). It gives useful-sounding reassurance without
// judging the buyer, and without announcing that this is a scam - exactly
// the kind of copy a fake "buyer protection" page would actually show.
export function TradeInfo() {
  const navigate = useNavigate();
  const t = useT();
  const backToChat = () => navigate('/scenario05-atm/chat', { replace: true });

  // AR Interaction Contract: a reassurance page with one way on.
  useARInteraction({ mode: 'single', surfaceId: 'scenario05/trade-info', action: backToChat });

  return (
    <PhoneShell context="hpefake">
      <BrowserChrome domain={FAKE_TRADE_SITE_DOMAIN} />
      <SuqubianSiteHeader section={t('交易安全提醒')} brand={FAKE_TRADE_SITE_BRAND} tag={t('安全交易・安心收付')} />
      <div className="go-scroll sq-page">
        <div className="sq-card sq-safety-notice">
          <div className="sq-card-title">{t('交易安全提醒')}</div>
          <p>{t('建立賣場與查看交易資訊，請以本站頁面顯示的內容為準。')}</p>
          <p>{t('客服聯絡方式請以官方網站「客服中心」所列資訊為準。')}</p>
          <p>{t('平台不會要求賣家透過非官方管道設定收款功能。')}</p>
        </div>
        <div className="go-spacer" />
        <button type="button" className="sq-btn sq-btn-outline" onClick={backToChat}>
          {t('返回聊天')}
        </button>
      </div>
    </PhoneShell>
  );
}
