import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, LifeBuoy, ShieldCheck } from 'lucide-react';
import { useStageClassName } from '../../shell/StageClassContext';
import { useShoppingState } from '../../lib/shoppingStore';
import { useT } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

const STATUS_COPY = {
  none: { label: '尚未申請退款', variant: 'neutral' },
  pending: { label: '退款處理中', variant: 'neutral' },
  delayed: { label: '退款延遲，尚未完成', variant: 'warn' },
  sellerUnreachable: { label: '賣家已失聯，退款仍未完成', variant: 'err' },
  refunded: { label: '退款已完成', variant: 'ok' },
};

// Screen 20 - 黑皮退款中心.
export function RefundCenter() {
  useStageClassName('blackpi-stage');
  const navigate = useNavigate();
  const { route } = useParams();
  const t = useT();
  const [state] = useShoppingState();
  const status = STATUS_COPY[state.refundStatus] || STATUS_COPY.none;

  // AR Interaction Contract: the refund centre reports status and offers one
  // way on - 聯絡黑皮安心客服.
  useARInteraction({
    mode: 'single',
    surfaceId: 'scenario04/refund-center',
    action: () => navigate(`/scenario04-shopping/platform-support/${route}`),
  });

  return (
    <div className="blackpi-app">
      <header className="bp-header">
        <button type="button" className="bp-icon-btn" aria-label={t('返回')} onClick={() => navigate(-1)}>
          <ChevronLeft size={24} />
        </button>
        <div className="bp-header-title">{t('黑皮退款中心')}</div>
        <span style={{ width: 44 }} />
      </header>
      <div className="bp-scroll bp-page">
        <div className="bp-card bp-section" style={{ textAlign: 'center' }}>
          <ShieldCheck size={30} color="var(--bp-primary-dark)" />
          <p className={`bp-badge ${status.variant}`} style={{ marginTop: 10 }}>{t(status.label)}</p>
        </div>

        <div className="bp-card bp-section">
          <div className="bp-score-row"><span className="bp-score-label">{t('退貨狀態')}</span><span>{state.returnStatus === 'received' ? t('賣家已簽收') : state.returnStatus}</span></div>
          <div className="bp-score-row"><span className="bp-score-label">{t('退款狀態')}</span><span>{t(status.label)}</span></div>
        </div>

        <button type="button" className="bp-btn bp-btn-block bp-section" onClick={() => navigate(`/scenario04-shopping/platform-support/${route}`)}>
          <LifeBuoy size={16} /> {t('聯絡黑皮安心客服')}
        </button>
      </div>
    </div>
  );
}
