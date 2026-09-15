import { Phone } from 'lucide-react';
import { WarningMarquee } from './WarningMarquee';
import { useT } from '../i18n';

// Shared "call the anti-fraud hotline" screen shown from every red warning
// in scenario02. No real `tel:` link anywhere - this is a kiosk device, an
// accidental real dial-out would be a genuine problem, so this is purely an
// educational prompt with a "go back" and an optional "stop paying" choice.
export function Hotline165({ onBack, onStopPayment }) {
  const t = useT();
  return (
    <div className="hotline165-overlay">
      <div className="hotline165-card">
        <WarningMarquee text={t('若遇到疑似詐騙、網路交友誘投資或要求追加付款，請立即停止匯款，並撥打 165 查證。')} />
        <div className="hotline165-icon"><Phone size={34} /></div>
        <h2>{t('反詐騙諮詢專線 165')}</h2>
        <p>{t('若遇到疑似詐騙、網路交友誘投資或要求追加付款，請立即停止匯款，並撥打 165 查證。')}</p>
        <button type="button" className="bition-btn-primary" onClick={onBack}>{t('返回體驗')}</button>
        {onStopPayment && (
          <button type="button" className="bition-btn-secondary" onClick={onStopPayment}>{t('我選擇停止付款')}</button>
        )}
      </div>
    </div>
  );
}
