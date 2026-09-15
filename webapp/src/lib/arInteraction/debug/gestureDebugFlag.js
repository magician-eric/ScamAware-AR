// The one switch that decides whether any AR gesture debug tooling exists at
// runtime. Off unless it is explicitly turned on.
//
//   VITE_AR_GESTURE_DEBUG=true npm run dev
//
// Not "on in development": off there too, until the flag is set. A player is
// never one keypress away from advancing the story, and a production build
// with no such variable set resolves this to `false` at build time, so the
// keyboard adapter is never started and the overlay is never mounted.
//
// This is the only file in the AR gesture layer that reads build
// configuration. The Bridge itself has no flag, no mode and no debug branch:
// a debug source and a native source travel the identical dispatch path (see
// ../gestureBridge.js).

// Vite replaces `import.meta.env` at build time; nothing else in this module
// depends on a bundler, and an explicit `env` argument is what the tests use
// to exercise both states.
const BUILD_ENV = import.meta.env ?? {};

export function isARGestureDebugEnabled(env = BUILD_ENV) {
  // A string compare, not a truthiness check: env vars arrive as strings, and
  // `VITE_AR_GESTURE_DEBUG=false` must mean off rather than "a non-empty
  // string, therefore on".
  return (env?.VITE_AR_GESTURE_DEBUG ?? '') === 'true';
}

// Whether the gesture layer may write a diagnostic line to the console.
//
// This is a lower bar than the switch above, and deliberately so: the switch
// above decides whether *tooling that can drive the app* exists (a keyboard
// that advances the story, an overlay drawn over the screen), and that has to
// stay off for a player. A console line changes nothing a player can see or
// do, and it is the only way to answer "the glasses said RIGHT and nothing
// happened - which layer stopped it?" on a device that is already built and
// in someone's hand.
//
// Three ways in, and none of them is on for a player by default:
//
//   VITE_AR_GESTURE_DEBUG=true            the debug switch above, so DEV
//                                         tooling implies DEV logging
//   npm run dev                           import.meta.env.DEV
//   __CIBAR_AR_GESTURE_DIAGNOSTICS__      set to `true` on the global object
//                                         from a WebView inspector, to turn
//                                         logging on in an installed build
//                                         without rebuilding it
//
// The runtime switch is read on every call rather than captured at import, so
// turning it on mid-session takes effect on the next gesture.
export function isARGestureDiagnosticsEnabled(env = BUILD_ENV) {
  if (isARGestureDebugEnabled(env)) return true;
  if (env?.DEV === true) return true;
  return globalThis?.__CIBAR_AR_GESTURE_DIAGNOSTICS__ === true;
}
