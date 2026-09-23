import { Check } from 'lucide-react';
import { getTrackingStepIndex, HPE_TRACKING_STEPS } from '../state';
import { useT } from '../i18n';

// HPE_TRACKING_STEPS is HPE's own vocabulary for where a parcel is, so HPE
// translates it. It used to be handed a `translate` function by whichever
// scenario mounted the screen, which put HPE's labels in a story dictionary
// (§13 AD-14).
export function HpeTrackingTimeline({ status }) {
  const t = useT();
  const currentIndex = getTrackingStepIndex(status);
  return (
    <ol className="hpe-timeline" aria-label={t('物流進度')}>
      {HPE_TRACKING_STEPS.map((step, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        return <li key={step.key} className={done ? 'is-done' : current ? 'is-current' : ''}>
          <span className="hpe-timeline__dot">{done && <Check size={12} strokeWidth={3} />}</span>
          <span>{t(step.label)}</span>
        </li>;
      })}
    </ol>
  );
}
