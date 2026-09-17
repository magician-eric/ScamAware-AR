import { useEffect } from 'react';
import { interactionHintBandHeight } from '../components/hints/interactionHintBand';

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
//
// `reserveHintBand` is the one thing on top of that port: when the shared
// inactivity hint is up it needs a strip of the viewport that no screen is
// drawing in, and this is how it gets one. The stage is fitted into the
// viewport MINUS the band and centred in what is left, so the band below it is
// genuinely empty rather than something the hint is laid over.
//
// It is done here, in the fit, and deliberately not by giving the stage
// padding or by re-flowing anything inside it. Re-flowing was tried and is
// wrong: it re-wraps and clips text (a scenario's ending paragraph lost three
// of its four lines), and it squashes every fake-phone screen out of shape -
// the police phone went from 0.4498 to 0.4897 aspect, an 8.9% distortion,
// because those stages stretch their shell to the stage's height. Scaling the
// whole box the way this hook already scales it changes no layout at all: not
// one line break moves, not one aspect ratio changes, and putting the band
// back restores the screen exactly.
export function useFitStage(stageRef, refitKey, reserveHintBand = 0) {
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    function fit() {
      stage.style.cssText = '';
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // `offsetWidth/Height` rather than getBoundingClientRect(): the stage
      // carries a CSS transition on `transform` now (so the band eases in), and
      // a rect read while that is animating would be the transformed size and
      // would feed a wrong scale straight back into the next fit. The offset
      // pair is the layout size and is blind to transforms.
      const boxW = stage.offsetWidth;
      const boxH = stage.offsetHeight;
      if (!boxW || !boxH) return;
      // The band is what the hint measured itself to be, so the stage gives up
      // exactly that and no more. Clamped to a floor only so the frame before
      // the first measurement cannot reserve nothing.
      const band = reserveHintBand > 0 ? interactionHintBandHeight(reserveHintBand) : 0;
      const availableH = Math.max(1, vh - band);
      const scale = Math.min(vw / boxW, availableH / boxH);
      stage.style.position = 'fixed';
      stage.style.left = '50%';
      // Centred in what is left above the band. With no band this is vh/2,
      // which is exactly the `top: 50%` this has always used.
      stage.style.top = `${availableH / 2}px`;
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
  }, [stageRef, refitKey, reserveHintBand]);
}
