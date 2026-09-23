import { useEffect, useInsertionEffect, useRef } from 'react';
import { useStageClassName } from '../../../shell/StageClassContext';
import { ShoppingBag } from 'lucide-react';
import { useT } from '../i18n';

// Screen 01 - Splash. Holds the logo for a beat and then reports that the
// intro is over; where that lands is decided by whoever mounts the App.
// Marking the run as started is scenario state, written by the Scenario 04
// container that mounts this screen.
const SPLASH_HOLD_MS = 1100;

export function Splash({ onIntroComplete }) {
  useStageClassName('blackpi-stage');
  const t = useT();

  // The beat is the App's; the destination is not. Keeping the newest
  // callback in a ref means a host passing an inline arrow cannot restart
  // this timer on a re-render.
  const advance = useRef(onIntroComplete);
  useInsertionEffect(() => {
    advance.current = onIntroComplete;
  }, [onIntroComplete]);

  useEffect(() => {
    const timer = setTimeout(() => advance.current?.(), SPLASH_HOLD_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="blackpi-app" style={{ background: 'linear-gradient(180deg,#0ABAB5,#089B96)', color: '#000', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <div style={{ width: 74, height: 74, borderRadius: 22, background: 'rgba(255,255,255,.16)', display: 'grid', placeItems: 'center' }} aria-hidden="true">
        <ShoppingBag size={36} />
      </div>
      <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '.04em' }}>{t('黑皮購物')}</div>
      <p style={{ color: '#000', fontSize: 'var(--fs-body-sm)' }}>BlackPi Shopping</p>
    </div>
  );
}
