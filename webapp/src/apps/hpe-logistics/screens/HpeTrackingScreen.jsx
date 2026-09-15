import { Truck } from 'lucide-react';
import { HpeShell } from '../components/HpeShell';
import { HpeShipmentCard } from '../components/HpeShipmentCard';
import { HpeTrackingTimeline } from '../components/HpeTrackingTimeline';
import { getTrackingStep } from '../state';
import { useT } from '../i18n';

// Every label on this screen is HPE's own tracking UI, so HPE owns the words
// (§13 AD-14) - the hosting scenario supplies the shipment, decides what the
// button does and what it is called, and nothing else.
export function HpeTrackingScreen({ status, shipmentNumber, onBack, onAction, actionLabel, actionBusy = false }) {
  const t = useT();
  const statusLabel = t(getTrackingStep(status).label);
  return (
    <HpeShell title={t('退貨物流')} onBack={onBack}>
      <HpeShipmentCard heading={t('退貨物流')} shipmentNumber={shipmentNumber} shipmentNumberLabel={t('寄件編號')} status={status} statusLabel={statusLabel} currentStatusLabel={t('目前狀態')} />
      <section className="hpe-tracking-panel"><HpeTrackingTimeline status={status} /></section>
      <button type="button" className="hpe-primary-button" onClick={onAction} disabled={actionBusy}>
        {status !== 'received' && <Truck size={17} aria-hidden="true" />}{actionLabel}
      </button>
    </HpeShell>
  );
}
