import { useEffect, useState } from 'react';
import { ChevronLeft, Check, Truck } from 'lucide-react';
import { useStageClassName } from '../../../shell/StageClassContext';
import { getProductByRoute } from '../data/catalog';
import { feedback } from '../../../lib/feedback';
import { useT } from '../i18n';
import { useARInteraction } from '../../../lib/arInteraction';
import { AssetImage } from '../components/AssetImage';
// 黑皮通 (HPE) is a separate brand from 黑皮購物 - reusing its real mark here
// rather than drawing a second one, the same way pages/scenario04/
// ReturnLogistics.jsx already reuses that App's tracking screen.
import { HpeLogo } from '../../hpe-logistics';

const STEPS = [
  { key: 'paid', label: '已付款' },
  { key: 'preparing', label: '賣家備貨' },
  { key: 'shipped', label: '已出貨' },
  { key: 'shipping', label: '配送中' },
  { key: 'delivered', label: '已送達' },
];
const STEP_INDEX = Object.fromEntries(STEPS.map((s, i) => [s.key, i]));
const MONTAGE_SEQUENCE = ['preparing', 'shipped', 'shipping'];
const STEP_GAP_MS = 700;
const STEP_MINUTES = [0, 35, 8 * 60, 2 * 24 * 60 + 40, 3 * 24 * 60 + 15];

function stepTime(paymentTimestamp, index) {
  const date = new Date((paymentTimestamp || Date.now()) + STEP_MINUTES[index] * 60000);
  return new Intl.DateTimeFormat(undefined, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
}

// Screens 09 + 10 - 訂單詳情 + 物流蒙太奇. "查看最新物流" steps the order
// through each status in sequence instead of jumping straight to delivered.
// Every stage remains dated from the original payment timestamp.
// `order` ({ id, status, createdAt, disputeStatus }) comes in as a prop and
// every status change is reported back through onDeliveryStatusChange - the
// montage timing below is App presentation, the order state it reports is
// Scenario 04's to keep. The three ways out of this screen - back to 我的訂單,
// 拆開包裹, 查看售後進度 - are reported the same way: the App says what the
// shopper asked for, Scenario 04 decides which screen that is.
export function OrderDetail({
  productRoute: route = null, order = {},
  onDeliveryStatusChange, onBackToOrders, onOpenUnboxing, onContactSeller,
}) {
  useStageClassName('blackpi-stage');
  const t = useT();
  const product = getProductByRoute(route);
  const [montaging, setMontaging] = useState(false);
  const [deliveryNotice, setDeliveryNotice] = useState(false);
  const currentIndex = STEP_INDEX[order.status] ?? 0;

  useEffect(() => {
    if (order.status === 'placed') onDeliveryStatusChange?.('paid');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.status]);

  function runLogisticsMontage() {
    setMontaging(true);
    MONTAGE_SEQUENCE.forEach((status, i) => {
      window.setTimeout(() => onDeliveryStatusChange?.(status), i * STEP_GAP_MS);
    });
    const afterSequence = MONTAGE_SEQUENCE.length * STEP_GAP_MS;
    window.setTimeout(() => {
      setDeliveryNotice(true);
      feedback('delivered');
    }, afterSequence + 150);
    window.setTimeout(() => {
      onDeliveryStatusChange?.('delivered');
      setMontaging(false);
    }, afterSequence + STEP_GAP_MS);
  }

  // AR Interaction Contract: this screen only ever offers one thing at a time -
  // 查看最新物流 before delivery, 拆開包裹 once the parcel is here, 查看售後進度
  // after a dispute has been opened - so it is `single` throughout, and
  // `display` while the logistics montage is running, which is exactly when
  // the button is disabled. The timeline itself and the carrier's delivery
  // notification are presentation.
  const delivered = order.status === 'delivered' || order.status === 'completed';
  const primaryAction = order.disputeStatus
    ? () => onContactSeller?.()
    : delivered
      ? () => onOpenUnboxing?.()
      : runLogisticsMontage;

  const primarySurfaceId = order.disputeStatus
    ? 'blackpi/order-detail/aftersales'
    : delivered ? 'blackpi/order-detail/unbox' : 'blackpi/order-detail';

  useARInteraction(product && !montaging
    ? { mode: 'single', surfaceId: primarySurfaceId, action: primaryAction }
    : { mode: 'display', surfaceId: 'blackpi/order-detail-montage' });

  if (!product) return null;

  return (
    <div className="blackpi-app">
      {/* A delivery notice comes from the carrier, not the storefront - the
          sender here is 黑皮通物流 (HPE), with its own mark, not 黑皮購物. */}
      {deliveryNotice && (
        <div className="bp-os-notification" role="status">
          <div className="bp-os-notification-sender">
            <HpeLogo variant="deliveryIcon" height={18} className="bp-os-notification-icon" />
            <strong>{t('黑皮通物流')}</strong>
          </div>
          <div>{t('您的包裹已送達')}</div>
        </div>
      )}
      <header className="bp-header">
        <button type="button" className="bp-icon-btn" aria-label={t('返回')} onClick={() => onBackToOrders?.()}>
          <ChevronLeft size={24} />
        </button>
        <div className="bp-header-title">{t('訂單詳情')}</div>
        <span style={{ width: 44 }} />
      </header>
      <div className="bp-scroll bp-page">
        <div className="bp-card bp-section">
          <h2 className="bp-h2">{t(product.shop)}</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 14 }}>
            <AssetImage assetKey={product.assetKey} className="bp-compact-thumb" />
            <span style={{ flex: 1 }}>
              {t(product.name)}
              {/* Same order line as 結帳確認, so the variant the shopper paid
                  for is still on screen once the order exists. */}
              {product.variant && <span className="bp-muted" style={{ display: 'block', marginTop: 4 }}>{t('規格 ')}{t(product.variant)}</span>}
            </span>
            <span style={{ flex: 'none', marginLeft: 10 }}>NT${product.price.toLocaleString()}</span>
          </div>
          <p className="bp-tertiary" style={{ marginTop: 8 }}>{t('訂單編號 ')}{order.id || t('產生中…')}</p>
        </div>

        <div className="bp-card bp-section">
          <h2 className="bp-h2">{t('物流進度')}</h2>
          <div className="bp-timeline" key={order.status}>
            {STEPS.map((s, i) => {
              const isDone = i < currentIndex;
              const isCurrent = i === currentIndex;
              return (
                <div key={s.key} className={`bp-timeline-step ${isDone ? 'done' : isCurrent ? 'current' : ''}`} style={{ '--i': i }}>
                  <div className="bp-timeline-dot">{isDone && <Check size={12} className="bp-timeline-check" strokeWidth={3} />}</div>
                  <div className="bp-timeline-content">
                    <div className="bp-timeline-label">
                      {/* The one step that is physically the carrier's leg of
                          the journey names the carrier, so 配送中 is not left
                          reading as if 黑皮購物 drove the parcel itself. */}
                      {s.key === 'shipping' ? (
                        <span className="bp-timeline-carrier">
                          <HpeLogo variant="deliveryIcon" height={15} className="bp-timeline-carrier-icon" />
                          {t('黑皮通物流')}｜{t(s.label)}
                        </span>
                      ) : t(s.label)}
                    </div>
                    <div className="bp-tertiary">{stepTime(order.createdAt, i)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {order.status !== 'delivered' && order.status !== 'completed' && (
          <button type="button" className="bp-btn bp-btn-secondary bp-btn-block bp-section" onClick={runLogisticsMontage} disabled={montaging}>
            <Truck size={16} /> {montaging ? t('物流更新中…') : t('查看最新物流')}
          </button>
        )}

        {(order.status === 'delivered' || order.status === 'completed') && !order.disputeStatus && (
          <button type="button" className="bp-btn bp-btn-block bp-section" onClick={() => onOpenUnboxing?.()}>
            {t('拆開包裹')}
          </button>
        )}

        {order.disputeStatus && (
          <button type="button" className="bp-btn bp-btn-block bp-section" onClick={() => onContactSeller?.()}>
            {t('查看售後進度')}
          </button>
        )}
      </div>
    </div>
  );
}
