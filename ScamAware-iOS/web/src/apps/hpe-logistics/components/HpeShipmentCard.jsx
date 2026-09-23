import { HpeStatusBadge } from './HpeStatusBadge';

export function HpeShipmentCard({ heading, shipmentNumber, shipmentNumberLabel, status, statusLabel, currentStatusLabel }) {
  return (
    <article className="hpe-shipment-card">
      <div className="hpe-shipment-card__top"><span>{heading}</span><HpeStatusBadge status={status} label={statusLabel} /></div>
      <dl>
        <div><dt>{shipmentNumberLabel}</dt><dd>{shipmentNumber}</dd></div>
        <div><dt>{currentStatusLabel}</dt><dd>{statusLabel}</dd></div>
      </dl>
    </article>
  );
}
