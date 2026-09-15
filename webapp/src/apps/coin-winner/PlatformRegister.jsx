import { useState } from 'react';
import { useStageClassName } from '../../shell/StageClassContext';
import { useEventCallback } from './useEventCallback';
import { DEMO_PHONE_NUMBER } from '../../lib/constants';
import { useT } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

// Keeping the phone's own keyboard from ever popping up matters here, so
// this is a "simulated quick sign-up": every field is pre-filled and purely
// a display card (not an <input>, so there's nothing to focus and no
// keyboard risk), the terms line is pre-agreed text rather than a checkbox,
// and the only real control is one big "建立帳戶" button - always tappable
// from the start, no gating.
// The referral code is the one field this form cannot make up: it is the
// person who talked the player into signing up, so the hosting scenario
// draws it from its own cast and hands it over. The platform just prints
// it, and shows its own neutral placeholder when nobody supplied one.
// Two events, because the two moments are genuinely different:
// onAccountCreated fires the instant the account exists (the success card
// appears), which is what the hosting scenario persists; onRegistrationComplete
// fires once that card has been on screen for its beat, which is what the
// scenario navigates on. The app itself keeps no record of either.
export function PlatformRegister({ onAccountCreated, onRegistrationComplete, referralCode = 'REFERRAL88' }) {
  const reportAccountCreated = useEventCallback(onAccountCreated);
  const reportRegistrationComplete = useEventCallback(onRegistrationComplete);
  useStageClassName('bition-stage');
  const t = useT();
  const [status, setStatus] = useState('form');
  const fields = [
    { label: '手機號碼', value: DEMO_PHONE_NUMBER },
    { label: '登入密碼', value: '********' },
    { label: '確認密碼', value: '********' },
    { label: '推薦碼', value: referralCode },
  ];

  // AR Interaction Contract: 建立帳戶 is the one story action, and it exists
  // only while the form is showing - the 建立中…／帳戶建立成功 beats run
  // themselves out, and their button is disabled or absent, so both are
  // `display`. UI disabled and gesture disabled are the same state here.
  useARInteraction(status === 'form'
    ? { mode: 'single', surfaceId: 'coin-winner/register', action: () => createAccount() }
    : { mode: 'display', surfaceId: 'coin-winner/register-creating' });

  function createAccount() {
    setStatus('creating');
    setTimeout(() => {
      setStatus('done');
      reportAccountCreated();
      setTimeout(() => reportRegistrationComplete(), 800);
    }, 900);
  }

  return (
    <div className="bition-app">
      <div className="bition-register-scroll">
        <div className="bition-logo-block">
          <div className="bition-logo">
            {t('幣勝客')}
            <span>BITION</span>
          </div>
          <p className="bition-tagline">{t('快速註冊')}</p>
        </div>

        {status !== 'done' && (
          <div className="bition-form">
            {fields.map((f) => (
              <div className="bition-display-field" key={f.label}>
                <span>{t(f.label)}</span>
                <strong>{f.value}</strong>
              </div>
            ))}

            <div className="bition-terms-static">{t('✓ 已閱讀並同意《使用者服務協議》與《風險揭露聲明》')}</div>

            {status === 'form' && (
              <button type="button" className="bition-btn-primary" onClick={createAccount}>{t('建立帳戶')}</button>
            )}
            {status === 'creating' && (
              <button type="button" className="bition-btn-primary" disabled>{t('建立中……')}</button>
            )}
          </div>
        )}

        {status === 'done' && (
          <div className="bition-success">
            <div className="bition-success-check">✓</div>
            <p>{t('帳戶建立成功')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
