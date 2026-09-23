import { useCallback, useInsertionEffect, useRef } from 'react';

// Wraps a callback prop so its identity is stable for the life of the
// component while always calling the newest version. Every screen that ends
// a visit (the home check-ins, deposit success, the activated strategy, the
// withdrawal failure) hands its completion event to the host through a prop
// and reads it back from behind a "already fired" guard; without this, a host
// that passes an inline arrow would hand each render a different function,
// and the guarded handler a component keeps hold of could go stale.
export function useEventCallback(fn) {
  const ref = useRef(fn);
  useInsertionEffect(() => {
    ref.current = fn;
  }, [fn]);
  return useCallback((...args) => ref.current?.(...args), []);
}
