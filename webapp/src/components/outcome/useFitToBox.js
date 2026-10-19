import { useLayoutEffect, useRef } from 'react';

// Fits a scroll box's content to the box instead of scrolling it. The outcome
// and analysis screens are read on the AR glasses, where nobody can scroll, and
// their English and Japanese text runs much longer than the Chinese - so when
// the content is taller than the box, every child is zoomed down (through
// `--cibar-fit`, see the two CSS files) until it fits. `zoom` re-flows rather
// than shrinking a picture of the layout: lines get longer as the type gets
// smaller, so the text stays sharp and fills the width. Never below MIN_FIT;
// past that the box still scrolls, as before.
const MIN_FIT = 0.66;

export function useFitToBox(...deps) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return undefined;
    const overflow = () => box.scrollHeight - box.clientHeight;
    const fit = () => {
      box.style.setProperty('--cibar-fit', '1');
      if (overflow() <= 1) return;
      // The largest zoom that fits. Re-flow makes height a stepped function of
      // zoom, so it is searched for rather than computed from one ratio.
      let fits = MIN_FIT;
      let tooBig = 1;
      for (let pass = 0; pass < 7; pass += 1) {
        const zoom = (fits + tooBig) / 2;
        box.style.setProperty('--cibar-fit', zoom.toFixed(3));
        if (overflow() <= 1) fits = zoom; else tooBig = zoom;
      }
      box.style.setProperty('--cibar-fit', fits.toFixed(3));
    };
    fit();
    let resize = null;
    if (typeof ResizeObserver === 'function') {
      let width = box.clientWidth;
      let height = box.clientHeight;
      resize = new ResizeObserver(() => {
        if (box.clientWidth === width && box.clientHeight === height) return;
        width = box.clientWidth;
        height = box.clientHeight;
        fit();
      });
      resize.observe(box);
    }
    let live = true;
    globalThis.document?.fonts?.ready?.then(() => { if (live) fit(); });
    return () => {
      live = false;
      resize?.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}
