import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useFitStage } from './useFitStage';
import { StageClassProvider } from './StageClassContext';
import { installMediaAutoplayPrimer } from '../lib/mediaAutoplay';

// Mounted once at the app root (see src/main.jsx), stays mounted across every
// route change - replaces the old per-page fitStage()/topbar/script-tag
// boilerplate with one shared frame.
export function AppShell() {
  const stageRef = useRef(null);
  const [extraClass, setExtraClass] = useState('');
  const location = useLocation();
  // Re-measure on every navigation, not just on window resize/orientation -
  // a page like scenario03 that adds its own stage class (immersive full-
  // bleed layout) must never leave the next page scaled against a stale
  // measurement taken while that class was still applied.
  useFitStage(stageRef, location.pathname);
  useEffect(() => installMediaAutoplayPrimer(), []);

  return (
    <div ref={stageRef} className={`app ar-stage${extraClass ? ' ' + extraClass : ''}`}>
      <StageClassProvider setExtraClass={setExtraClass}>
        <Outlet />
      </StageClassProvider>
    </div>
  );
}
