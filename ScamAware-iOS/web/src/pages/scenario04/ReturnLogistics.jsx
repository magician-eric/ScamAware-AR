import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStageClassName } from '../../shell/StageClassContext';
import { applyEffects, useShoppingState } from '../../lib/shoppingStore';
import { HpeTrackingScreen } from '../../apps/hpe-logistics';
import { feedback } from '../../lib/feedback';
import { useT } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

const STEP_GAP_MS = 700;
// Screen 17 - 退貨物流. "查看最新物流" steps through the same sequence,
// rather than jumping straight to 賣家已簽收.
export function ReturnLogistics() {
  useStageClassName('hpe-stage');
  const navigate = useNavigate();
  const { route } = useParams();
  const t = useT();
  const [state, update] = useShoppingState();
  const [montaging, setMontaging] = useState(false);

  function runLogisticsMontage() {
    setMontaging(true);
    window.setTimeout(() => update({ returnStatus: 'shipped' }), 0);
    window.setTimeout(() => update({ returnStatus: 'inTransit' }), STEP_GAP_MS);
    window.setTimeout(() => {
      // The signed-for record is now part of the tracking history - the
      // evidence screen reads it from here rather than asking the player to
      // "save" a receipt the platform already holds.
      applyEffects({ evidenceSaved: ['seller-signed-receipt'] });
      update({ returnStatus: 'received' });
      feedback('delivered');
      setMontaging(false);
    }, STEP_GAP_MS * 3 + 150);
  }

  const received = state.returnStatus === 'received';
  const primaryAction = received
    ? () => navigate(`/scenario04-shopping/refund-delay/${route}`)
    : runLogisticsMontage;

  // AR Interaction Contract: the carrier screen has one action at a time -
  // step the tracking forward, then continue to the refund - and it is
  // genuinely busy while the montage runs, which is exactly when the button is
  // disabled too.
  useARInteraction({
    mode: 'single',
    surfaceId: received ? 'scenario04/return-logistics/received' : 'scenario04/return-logistics',
    action: primaryAction,
    disabled: montaging,
  });

  return (
    <HpeTrackingScreen
      status={state.returnStatus}
      shipmentNumber={state.trackingCode}
      onBack={() => navigate(-1)}
      onAction={primaryAction}
      actionBusy={montaging}
      actionLabel={state.returnStatus === 'received' ? t('查看退款進度') : montaging ? t('物流更新中…') : t('完成退貨寄件')}
    />
  );
}
