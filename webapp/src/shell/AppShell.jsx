import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useFitStage } from './useFitStage';
import { StageClassProvider } from './StageClassContext';
import { installMediaAutoplayPrimer } from '../lib/mediaAutoplay';
import { InteractionHint } from '../components/hints/InteractionHint';

// Mounted once at the app root (see src/main.jsx), stays mounted across every
// route change - replaces the old per-page fitStage()/topbar/script-tag
// boilerplate with one shared frame.
export function AppShell() {
  const stageRef = useRef(null);
  const [extraClass, setExtraClass] = useState('');
  // Whether the shared inactivity hint is up. It is a stage class rather than
  // anything the hint draws for itself: the hint needs a band of its own at the
  // bottom, and the screen sharing the stage has to be inset into what is left
  // instead of being covered by it (see components/hints/InteractionHint.css).
  const [hintVisible, setHintVisible] = useState(false);
  const location = useLocation();
  // Re-measure on every navigation, not just on window resize/orientation -
  // a page like scenario03 that adds its own stage class (immersive full-
  // bleed layout) must never leave the next page scaled against a stale
  // measurement taken while that class was still applied.
  useFitStage(stageRef, location.pathname);
  useEffect(() => installMediaAutoplayPrimer(), []);

  return (
    <div ref={stageRef} className={`app ar-stage${extraClass ? ' ' + extraClass : ''}${hintVisible ? ' has-interaction-hint' : ''}`}>
      <StageClassProvider setExtraClass={setExtraClass}>
        <Outlet />
      </StageClassProvider>
      {/* The run's one inactivity hint - a sibling of the routed screen, never
          a wrapper around it, so it adds no layout, no context and no styling
          to anything. It lives here rather than beside the gesture mounts in
          App.jsx because it is the only one of the three that draws: inside
          the stage it is placed against the stage's own bottom edge and scaled
          with it, which is what it needs to be readable on the glasses.

          It asks the AR Interaction Contract what the player can do and
          renders null until a live choice has gone untaken for ten seconds -
          so most screens, most of the time, render nothing at all from here.
          See components/hints/InteractionHint.jsx. */}
      <InteractionHint onVisibilityChange={setHintVisible} />
    </div>
  );
}
