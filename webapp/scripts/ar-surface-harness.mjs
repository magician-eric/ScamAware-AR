// The shared mount harness for the AR suites - one copy, used by
// test:gesture-contract, test:ar-interaction-migration and
// test:gesture-bridge.
//
// These screens have to actually mount, re-render and unmount for the
// contract's lifecycle rules to mean anything, and `react-dom/server` never
// runs effects. So this drives React's hook dispatcher directly - the same
// technique scripts/mydondon-boundary.test.mjs uses to reach a screen's
// handlers - extended to keep hook state across re-renders and to run effect
// setup/cleanup at the right moments.
//
// It calls the component function itself, so a screen's own hooks run for
// real while its children stay uninvoked React elements: no DOM, no router,
// and no rendering of PhoneShell or any app chrome is needed.
//
// Import it through a loader that can resolve the app's JSX (see
// scripts/register-gesture-contract-loaders.mjs).
import React from 'react';

const REACT_INTERNALS = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
const sameDeps = (a, b) => Array.isArray(a) && Array.isArray(b)
  && a.length === b.length && a.every((dep, i) => Object.is(dep, b[i]));

export function mountSurface(Component, props = {}) {
  const cells = [];
  const effects = [];
  let live = true;
  let output = null;
  // React batches a setState fired from an effect into a follow-up render;
  // this harness has no scheduler, so a store that pushes its current value on
  // subscribe (lib/scenario03Store's useScenario03State does) would otherwise
  // re-enter render() from inside the effect flush. Rendering is therefore
  // one-at-a-time: a re-entrant call only marks the tree dirty, and the
  // outermost render loops until it settles.
  let rendering = false;
  let dirty = false;

  function render() {
    if (rendering) { dirty = true; return output; }
    rendering = true;
    try {
      let passes = 0;
      do {
        dirty = false;
        renderOnce();
        passes += 1;
        // A screen that never settles is a bug worth failing on, not a test
        // that hangs the runner.
        if (passes > 50) throw new Error('render did not settle after 50 passes');
      } while (dirty && live);
    } finally {
      rendering = false;
    }
    return output;
  }

  function renderOnce() {
    let cursor = 0;
    let effectCursor = 0;
    const scheduled = [];
    const useMemoImpl = (factory, deps) => {
      const i = cursor++;
      const prev = cells[i];
      if (prev && sameDeps(prev.deps, deps)) return prev.value;
      cells[i] = { value: factory(), deps };
      return cells[i].value;
    };
    const dispatcher = {
      useState(initial) {
        const i = cursor++;
        if (!(i in cells)) cells[i] = { value: typeof initial === 'function' ? initial() : initial };
        const cell = cells[i];
        return [cell.value, (next) => {
          cell.value = typeof next === 'function' ? next(cell.value) : next;
          if (live) render();
        }];
      },
      useRef(initial) {
        const i = cursor++;
        if (!(i in cells)) cells[i] = { current: initial };
        return cells[i];
      },
      useMemo: useMemoImpl,
      useCallback: (fn, deps) => useMemoImpl(() => fn, deps),
      useEffect(fn, deps) { scheduled.push({ i: effectCursor++, fn, deps }); },
      useLayoutEffect(fn, deps) { dispatcher.useEffect(fn, deps); },
      useInsertionEffect(fn, deps) { dispatcher.useEffect(fn, deps); },
      useContext: () => null,
    };
    const previous = REACT_INTERNALS.H;
    REACT_INTERNALS.H = dispatcher;
    try {
      output = Component(props);
    } finally {
      REACT_INTERNALS.H = previous;
    }
    scheduled.forEach(({ i, fn, deps }) => {
      const prev = effects[i];
      if (prev && sameDeps(prev.deps, deps)) return;
      prev?.cleanup?.();
      // Claim the slot BEFORE running the effect: an effect that sets state
      // synchronously must find its own deps already recorded, or the render
      // it triggers would run it a second time, and so on forever.
      effects[i] = { deps, cleanup: undefined };
      effects[i].cleanup = fn();
    });
    return output;
  }

  render();
  return {
    get output() { return output; },
    rerender: render,
    unmount() {
      live = false;
      [...effects].reverse().forEach((effect) => effect?.cleanup?.());
      effects.length = 0;
    },
  };
}
