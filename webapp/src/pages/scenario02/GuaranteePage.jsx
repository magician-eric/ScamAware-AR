import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
import { useStageClassName } from '../../shell/StageClassContext';
import { useSaveScenario02Progress, usePlatformState } from '../../lib/scenario02Store';
import { useT } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

// Section 二十四: the "verification top-up" page reached after the second
// red warning. No real bank/wallet/QR/payment instructions - clicking
// through always ends in the scripted account-freeze message, never in an
// endless top-up loop, and leads straight into the educational disclosure.
export function GuaranteePage() {
  useSaveScenario02Progress('/scenario02-romance/guarantee');
  useStageClassName('bition-stage');
  const navigate = useNavigate();
  const t = useT();
  const [platform] = usePlatformState();
  const [status, setStatus] = useState('form');
  const projected = (platform.balance || 38640) + 30000;

  function confirmVerification() {
    setStatus('processing');
    setTimeout(() => setStatus('frozen'), 1500);
  }

  // AR Interaction Contract: 完成驗證 while the form is up, nothing while the
  // scripted verification runs, then 查看發生了什麼事 on the freeze notice.
  useARInteraction(status === 'form'
    ? { mode: 'single', surfaceId: 'scenario02/guarantee', action: confirmVerification }
    : status === 'frozen'
      ? {
        mode: 'single',
        surfaceId: 'scenario02/guarantee/frozen',
        action: () => navigate('/scenario02-romance/scammed-result'),
      }
      : { mode: 'display', surfaceId: 'scenario02/guarantee-processing' });

  return (
    <div className="bition-app">
      <header className="bition-sub-header">
        <div className="bition-home-logo small">{t('幣勝客')} <span>BITION</span></div>
      </header>
      <div className="bition-home-scroll">
        <div className="bition-card">
          <h2 className="bition-section-title">{t('完成資金安全驗證')}</h2>

          {status === 'form' && (
            <>
              <div className="bition-stat-row"><span>{t('驗證金額')}</span><strong>NT$30,000</strong></div>
              <div className="bition-stat-row"><span>{t('完成後預計可提領')}</span><strong>NT${Math.round(projected).toLocaleString()}</strong></div>
              <button type="button" className="bition-btn-primary" onClick={confirmVerification}>{t('完成驗證')}</button>
            </>
          )}

          {status === 'processing' && <p className="bition-processing">{t('驗證處理中……')}</p>}

          {status === 'frozen' && (
            <div className="bition-withdraw-failed">
              <h3>{t('帳戶暫時凍結')}</h3>
              <p>{t('系統偵測您的帳戶涉及異常交易。請聯繫線上客服完成解凍程序。')}</p>
              <button type="button" className="bition-btn-primary" onClick={() => navigate('/scenario02-romance/scammed-result')}>
                {t('查看發生了什麼事')}
              </button>
            </div>
          )}
        </div>
        <aside className="bition-inline-fraud-warning" role="status" aria-live="assertive">
          <span className="bition-inline-fraud-warning-icon" aria-hidden="true"><TriangleAlert size={22} /></span>
          <span className="bition-inline-fraud-warning-copy">
            <strong>{t('高度疑似假投資詐騙')}</strong>
            <span>{t('正規投資平台不會要求您為了提領自己的資金，再繳交「安全驗證金」、「風控保證金」、「稅金」或其他追加款項。')}</span>
          </span>
        </aside>
      </div>
    </div>
  );
}
