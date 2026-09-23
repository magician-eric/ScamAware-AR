import { X, Heart } from 'lucide-react';
import { useT } from '../i18n';

// The like / pass buttons under the card stack. They only report the
// interaction; what a like or a pass means for the story is the host's call.
export function MeetUSwipeActions({ onPass, onLike, disabled = false }) {
  const t = useT();
  return (
    <div className="meetu-swipe-actions">
      <button
        type="button"
        className="meetu-swipe-btn pass"
        aria-label={t('略過')}
        disabled={disabled}
        style={{ pointerEvents: disabled ? 'none' : 'auto' }}
        onClick={onPass}
      >
        <X size={28} />
      </button>
      <button
        type="button"
        className="meetu-swipe-btn like"
        aria-label={t('喜歡')}
        disabled={disabled}
        style={{ pointerEvents: disabled ? 'none' : 'auto' }}
        onClick={onLike}
      >
        <Heart size={28} fill="currentColor" />
      </button>
    </div>
  );
}
