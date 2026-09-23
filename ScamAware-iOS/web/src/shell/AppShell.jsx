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
  // Whether the shared inactivity hint is up. The hint needs a strip of the
  // viewport that no screen is drawing in, and this is how the shell knows to
  // leave one: `useFitStage` fits the stage into the viewport minus the band,
  // so the strip below it is genuinely empty. Nothing inside the stage is
  // re-flowed, re-wrapped or re-proportioned to make room - see the note in
  // shell/useFitStage.js for why that distinction is the whole point.
  // How many pixels of the viewport the hint has measured itself to need, or 0
  // when it is not up. The hint reports it; nothing here guesses at it.
  const [hintBand, setHintBand] = useState(0);
  const location = useLocation();
  // Re-measure on every navigation, not just on window resize/orientation -
  // a page like scenario03 that adds its own stage class (immersive full-
  // bleed layout) must never leave the next page scaled against a stale
  // measurement taken while that class was still applied.
  useFitStage(stageRef, location.pathname, hintBand);
  useEffect(() => installMediaAutoplayPrimer(), []);

  return (
    <>
      <div ref={stageRef} className={`app ar-stage${extraClass ? ' ' + extraClass : ''}`}>
        <StageClassProvider setExtraClass={setExtraClass}>
          <Outlet />
        </StageClassProvider>
      </div>
      {/* The run's one inactivity hint. OUTSIDE the stage, deliberately: it
          draws in the band the fit above has kept clear, so it is never over
          any screen's content and no screen's content is ever moved to make
          room for it. It adds no layout, no context and no styling to the
          stage, and it is `pointer-events: none`, so every screen's own tap
          targets keep working underneath it.

          It asks the AR Interaction Contract what the player can do and
          renders null until a live choice has gone untaken for ten seconds -
          so most screens, most of the time, render nothing at all from here.
          See components/hints/InteractionHint.jsx. */}
      <InteractionHint onVisibilityChange={setHintBand} />
    </>
  );
}
