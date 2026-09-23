import { useEffect } from 'react';
import { Check, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useARInteraction } from '../../lib/arInteraction';
import { HpeShell, HpeShipmentCard } from '../../apps/hpe-logistics';
import { getProduct } from '../../apps/mydondon';
import { useScenario05State } from '../../lib/scenario05Store';
import { useStageClassName } from '../../shell/StageClassContext';
import { useT, useScenario05Lang } from './i18n';

const STEP_GAP_MS = 700;
const STEPS = ['shipped', 'inTransit', 'delivered'];

// Screen S07b - 黑皮通's real logistics app (spec section E). This is the
// one part of the story that is entirely genuine: a real courier really
// does pick up, carry and deliver the item the player listed - which is
// exactly why shipping it is the actual loss, not a bank/payment
// verification step. This screen is deliberately bare: product/parcel,
// sender info, recipient info, courier hand-off, and nothing about payment
// or verification ever appears here (spec section E's "黑皮通不得顯示"
// list) - 黑皮通 is a delivery company and only ever talks about delivery.
//
// Renders through HPE's own native app chrome (HpeShell), the same way
// scenario04's ReturnLogistics.jsx does, rather than MyDonDon's PhoneShell/
// go-ctx system - 黑皮通 has never been a browser page, so it gets its own
// stage class instead of borrowing scenario05's browser-chrome contexts.
//
// Once the parcel is delivered this hands back to the MyDonDon conversation,
// not to the trading site: the player asks the buyer about the money first
// and finds the account gone (see buyer.s09.* in data/scenario05Dialogues.js),
// and only then goes looking at SafeDeal.
//
// Reference surface for the AR Interaction Contract's `single` geometry with
// a real disabled window (lib/arInteraction). This screen has exactly one
// story action throughout - confirm the shipment, then return to the
// conversation - but that button is genuinely disabled while the delivery
// montage plays, and the contract has to be disabled with it: a gesture must
// not be able to run a handler the screen has greyed out.
export function HpeShip() {
  useStageClassName('hpe-stage');
  const navigate = useNavigate();
  const t = useT();
  const lang = useScenario05Lang();
  const [state, update] = useScenario05State();
  const product = getProduct(state.selectedProduct, lang);
  const status = state.shipStatus;
  const montaging = status !== 'idle' && status !== 'delivered';
  const shipmentNumber = `HPE${state.shipmentCodeSuffix ?? '0000'}`;

  useEffect(() => {
    if (!product) navigate('/scenario05-atm', { replace: true });
  }, [product, navigate]);

  function runShipMontage() {
    update({ shipStatus: 'shipped' });
    window.setTimeout(() => update({ shipStatus: 'inTransit' }), STEP_GAP_MS);
    window.setTimeout(() => update({ shipStatus: 'delivered' }), STEP_GAP_MS * 2);
  }

  const primaryAction = status === 'delivered' ? () => navigate('/scenario05-atm/chat') : runShipMontage;

  useARInteraction({
    mode: 'single',
    surfaceId: 'scenario05/hpe-ship',
    disabled: montaging,
    action: primaryAction,
  });

  if (!product) return null;

  const stepLabels = { shipped: t('已收件'), inTransit: t('運送中'), delivered: t('已送達') };
  const currentIndex = status === 'idle' ? -1 : STEPS.indexOf(status);

  return (
    <HpeShell title={t('寄件')} backDisplayOnly>
      <HpeShipmentCard
        heading={t('包裹')}
        shipmentNumber={shipmentNumber}
        shipmentNumberLabel={t('寄件編號')}
        status={status === 'idle' ? 'shipped' : status === 'delivered' ? 'received' : status}
        statusLabel={status === 'idle' ? t('準備寄件') : stepLabels[status]}
        currentStatusLabel={t('目前狀態')}
      />
      <section className="hpe-shipment-card">
        <dl>
          <div><dt>{t('商品名稱')}</dt><dd>{product.name}</dd></div>
          <div><dt>{t('物流方式')}</dt><dd>{t('黑皮通超商取貨')}</dd></div>
        </dl>
      </section>
      <section className="hpe-tracking-panel">
        <ol className="hpe-timeline" aria-label={t('物流進度')}>
          {STEPS.map((step, index) => {
            const done = status === 'delivered' ? index <= currentIndex : currentIndex > index;
            const current = index === currentIndex && status !== 'delivered';
            return (
              <li key={step} className={done ? 'is-done' : current ? 'is-current' : ''}>
                <span className="hpe-timeline__dot">{done && <Check size={12} strokeWidth={3} />}</span>
                <span>{stepLabels[step]}</span>
              </li>
            );
          })}
        </ol>
      </section>
      <button
        type="button"
        className="hpe-primary-button"
        disabled={montaging}
        onClick={primaryAction}
      >
        {status !== 'delivered' && <Truck size={17} aria-hidden="true" />}
        {status === 'idle' ? t('確認寄件') : status === 'delivered' ? t('返回對話') : t('物流更新中…')}
      </button>
    </HpeShell>
  );
}
