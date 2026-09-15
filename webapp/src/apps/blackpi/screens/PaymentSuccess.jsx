import { CheckCircle2 } from 'lucide-react';
import { useStageClassName } from '../../../shell/StageClassContext';
import { useT } from '../i18n';

// Screen 08 - 付款成功. Settling the order to 已付款 is scenario state, done by
// the Scenario 04 container that mounts this screen.
export function PaymentSuccess({ onViewOrder }) {
  useStageClassName('blackpi-stage');
  const t = useT();

  return (
    <div className="blackpi-app" style={{ alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 }}>
      <CheckCircle2 size={64} color="var(--bp-success)" />
      <h1 className="bp-h1">{t('付款成功')}</h1>
      <p className="bp-muted" style={{ textAlign: 'center' }}>{t('訂單已成立，賣家將盡快備貨出貨。')}</p>
      <button type="button" className="bp-btn bp-btn-block" style={{ maxWidth: 260 }} onClick={() => onViewOrder?.()}>
        {t('查看訂單')}
      </button>
    </div>
  );
}
