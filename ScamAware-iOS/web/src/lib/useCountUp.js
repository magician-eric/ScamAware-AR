import { useEffect, useRef, useState } from 'react';

// Animates a displayed number from its previous value up to `target` over
// `duration` ms - shared by every 幣勝客 BITION balance/profit display so the
// "numbers visibly climbing" requirement doesn't need its own timer per page.
// Purely cosmetic: the real value is always `target`, this only smooths how
// it's painted.
export function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return undefined;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) * (1 - t);
      setValue(from + (target - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}
