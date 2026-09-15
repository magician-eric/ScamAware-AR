import { CheckCircle2, PackageCheck, Truck } from 'lucide-react';

const ICONS = { shipped: PackageCheck, inTransit: Truck, received: CheckCircle2 };

export function HpeStatusBadge({ status, label }) {
  const Icon = ICONS[status] || PackageCheck;
  return <span className={`hpe-status hpe-status--${status}`}><Icon size={15} aria-hidden="true" />{label}</span>;
}
