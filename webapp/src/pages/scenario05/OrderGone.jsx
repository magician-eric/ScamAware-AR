import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { useARInteraction } from '../../lib/arInteraction';
import { PhoneShell } from '../../apps/mydondon';
import { BrowserChrome } from './components/BrowserChrome';
import { FAKE_TRADE_SITE_DOMAIN } from '../../data/scenario05FakeSite';
import { useT } from './i18n';

const PROCESSING_MS = 1200;

// Screen S09 - the ghost order reveals itself (spec section F). The player
// lands here straight from HpeShip.jsx once the real courier has really
// delivered the item: they go back to the site to collect what they're
// owed, and there is nothing to collect.
//
// First a believable "processing" beat (payments really do take a moment on
// real sites), then the site itself stops resolving - no masthead, no
// listing, just a browser hitting a dead address. Nothing here states the
// word "scam"; the player is left to read the page for what it is before
// EndingScammed spells it out.
//
// Reference surface for the two simplest AR Interaction Contract geometries
// (lib/arInteraction), because this screen really is both in turn: the
// processing beat is genuinely a screen with nothing to do, and what follows
// it has exactly one story action. So it declares `display` while processing
// - no gesture does anything, and no button was added to give one something
// to do - and `single` afterwards, where RIGHT runs the same 查看結果 handler
// the button already runs.
export function OrderGone() {
  const navigate = useNavigate();
  const t = useT();
  const [processing, setProcessing] = useState(true);

  const seeResult = () => navigate('/scenario05-atm/ending-scammed');

  useEffect(() => {
    const timer = setTimeout(() => setProcessing(false), PROCESSING_MS);
    return () => clearTimeout(timer);
  }, []);

  useARInteraction(processing
    ? { mode: 'display', surfaceId: 'scenario05/order-gone-processing' }
    : { mode: 'single', surfaceId: 'scenario05/order-gone', action: seeResult });

  if (processing) {
    return (
      <PhoneShell context="bank">
        <div className="bk-processing">
          <span className="bk-spinner" />
          <p>{t('款項處理中')}</p>
        </div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell context="hpefake">
      <BrowserChrome domain={FAKE_TRADE_SITE_DOMAIN} />
      <div className="go-scroll sq-page">
        <div className="sq-alert">
          <span className="sq-alert-icon" aria-hidden="true"><XCircle size={22} /></span>
          <div>
            <div className="sq-alert-title">{t('此網站目前無法連上')}</div>
            <div className="sq-alert-code">{FAKE_TRADE_SITE_DOMAIN}</div>
          </div>
        </div>
        <section className="sq-card">
          <p className="sq-card-help">{t('賣場已不存在，頁面內容無法顯示。')}</p>
        </section>
        <div className="go-spacer" />
        <button type="button" className="sq-btn" onClick={seeResult}>
          {t('查看結果')}
        </button>
      </div>
    </PhoneShell>
  );
}
