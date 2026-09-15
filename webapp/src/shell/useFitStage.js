import { useEffect } from 'react';

// Port of the old js/app.js fitStage(): scales the stage element to fit the
// viewport while preserving its aspect ratio, centered/letterboxed. The old
// "fitWidth" branch (triggered by body[data-fit="width"]) is dropped here -
// grepping the pre-SPA site confirmed no page ever set that attribute, so it
// was dead code; the feed page's internal scrolling comes entirely from its
// own .feed-scroll CSS, not from fitStage().
//
// `refitKey` is an optional value (e.g. the current route) that forces an
// immediate re-measure whenever it changes, on top of the existing resize/
// orientation/ResizeObserver triggers. The stage's own box size is fixed by
// CSS (width/height on .ar-stage) so a route change alone should never
// actually move the numbers - this is a defensive re-fit, not a fix for a
// reproduced miscalculation, so that a scenario adding its own class (e.g.
// scenario03's "police-stage") can never leave a stale scale/transform
// applied once its route is gone, even if some other page's own CSS
// transition briefly changed the box's rendered size right as it unmounted.
export function useFitStage(stageRef, refitKey) {
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    function fit() {
      stage.style.cssText = '';
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const rect = stage.getBoundingClientRect();
      const scale = Math.min(vw / rect.width, vh / rect.height);
      stage.style.position = 'fixed';
      stage.style.left = '50%';
      stage.style.top = '50%';
      stage.style.transformOrigin = 'center center';
      stage.style.transform = `translate(-50%,-50%) scale(${scale})`;
    }

    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', fit);

    let raf = null;
    let ro = null;
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(() => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(fit);
      });
      ro.observe(stage);
    }

    return () => {
      window.removeEventListener('resize', fit);
      window.removeEventListener('orientationchange', fit);
      if (ro) ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [stageRef, refitKey]);
}
