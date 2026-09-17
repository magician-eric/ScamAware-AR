import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { PhoneShell } from '../../apps/mydondon';
import { BrowserChrome } from './components/BrowserChrome';
import { SuqubianSiteHeader } from './components/SuqubianSiteHeader';
import { getScenario05State, payVerificationDeposit } from '../../lib/scenario05Store';
import { VERIFICATION_AMOUNT_DIGITS } from '../../data/scenario05Verification';
import { FAKE_TRADE_SITE_BRAND, FAKE_TRADE_SITE_DOMAIN } from '../../data/scenario05FakeSite';
import { useT } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

// The one simulated transfer in Scenario 05.
//
// It is a closed educational simulation and says so on the screen: no bank
// API, no real transfer, no payment link, no real account number, no card
// details, no OTP, nothing asked of the player and nowhere to navigate off to.
// Confirming it writes local scenario state and nothing else.
//
// It also happens exactly once. The store refuses a second write
// (payVerificationDeposit), the recorded loss is an assignment rather than a
// running total, and this screen's own control disappears the moment it has
// been used - so a double tap, a gesture landing on top of a tap, a refresh
// or walking back into this page from the support chat all show the completed
// state instead of charging again. There is no second deposit anywhere in the
// scenario: no unfreeze fee, no guarantee, no shortfall, no re-verification.
export function SafeDealTransfer() {
  const navigate = useNavigate();
  const t = useT();
  // Read straight from the store rather than through useScenario05State, so
  // that "has this run already paid?" is answered by the same single source
  // the endings read, including on a fresh mount after a refresh.
  const [state, setState] = useState(() => getScenario05State());
  const paid = state.verificationPaid;

  const confirmTransfer = () => {
    if (paid) return;
    setState(payVerificationDeposit());
  };
  const backToSupport = () => navigate('/scenario05-atm/safedeal-support', { replace: true });

  // AR Interaction Contract: one story action throughout, but not the same one
  // before and after. The whole declaration is replaced rather than disabled,
  // so the gesture that confirmed the transfer cannot be repeated - it now
  // runs the return the screen actually offers (same shape as the answered
  // state of the shared quiz).
  useARInteraction(paid
    ? { mode: 'single', surfaceId: 'scenario05/safedeal-transfer-done', action: backToSupport }
    : { mode: 'single', surfaceId: 'scenario05/safedeal-transfer', action: confirmTransfer });

  return (
    <PhoneShell context="hpefake">
      <BrowserChrome domain={FAKE_TRADE_SITE_DOMAIN} />
      <SuqubianSiteHeader section={t('模擬轉帳確認')} brand={FAKE_TRADE_SITE_BRAND} tag={t('安全交易・安心收付')} />
      <div className="go-scroll sq-page">
        <div className="sq-sim-banner">
          <ShieldAlert size={16} aria-hidden="true" />
          <span>{t('教育模擬｜不會進行真實轉帳')}</span>
        </div>
        <div className="sq-field">
          <div className="sq-field-label">{t('驗證金額')}</div>
          <div className="sq-field-value strong sq-sim-amount">
            {t('NT${amount}', { amount: VERIFICATION_AMOUNT_DIGITS })}
          </div>
        </div>
        {paid && (
          <div className="sq-sim-done">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>{t('模擬轉帳已完成')}</span>
          </div>
        )}
        <div className="go-spacer" />
        {paid ? (
          <button type="button" className="sq-btn sq-btn-outline" onClick={backToSupport}>
            {t('返回客服對話')}
          </button>
        ) : (
          <button type="button" className="sq-btn" onClick={confirmTransfer}>
            {t('確認模擬轉帳')}
          </button>
        )}
      </div>
    </PhoneShell>
  );
}
