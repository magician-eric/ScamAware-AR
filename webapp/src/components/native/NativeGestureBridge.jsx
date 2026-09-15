import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { installJorjinGestureBridge } from '../../lib/arInteraction/native/installJorjinGestureBridge';

// Where the production native gesture binding is installed.
//
// It is mounted once, from src/App.jsx, as a sibling of the routed screen -
// never as a wrapper around it. It renders `null`: no element, no layout, no
// context, no styling, nothing a player can see. The five scenarios and every
// shared ending / analysis / quiz screen are reached through this one mount,
// so no screen listens for the native gesture event itself and no screen has
// to know that a gesture layer exists at all. A screen declares what it
// allows through the AR Interaction Contract, and that declaration is the
// whole of its involvement.
//
// (The two names left unspelled above are deliberate: the AR migration
// inventory and this suite's own subscription scan both read source files
// without stripping comments, so naming either token in prose here would
// register this file as a screen that declares a contract.)
//
// The binding itself lives one layer down and knows nothing about routes (see
// lib/arInteraction/native/installJorjinGestureBridge.js). This component is
// the only place a route is consulted, and it consults it for exactly one
// reason: the gesture tutorial.
//
// THE TUTORIAL EXCLUSION. /gesture-tutorial subscribes to the same native
// stream directly and runs its own WAIT_LEFT -> WAIT_RIGHT -> COMPLETE
// machine on it (pages/gestureTutorial/GestureTutorial.jsx), and that is
// correct: the tutorial's LEFT and RIGHT are teaching steps, not story
// actions, which is why that page declares no AR Interaction Contract. If
// this binding also ran there, one wave would be delivered twice - once to
// the tutorial, once to whatever contract happened to be active - so the
// binding is suspended for as long as that route is the one on screen, and
// resumes the moment the player leaves it.
//
// The suspension is a route list rather than a flag on the page because it
// has to hold even if the page is not mounted yet: the binding lives above
// the router and would otherwise be listening during the render that brings
// the tutorial up.
const SUSPENDED_PATHS = Object.freeze(['/gesture-tutorial']);

// Trailing slashes are a URL detail, not a different screen.
function normalizePath(pathname) {
  if (typeof pathname !== 'string' || pathname === '') return '/';
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.replace(/\/+$/, '') : pathname;
}

export function isNativeGestureBridgeSuspended(pathname) {
  return SUSPENDED_PATHS.includes(normalizePath(pathname));
}

export function NativeGestureBridge() {
  const { pathname } = useLocation();
  const suspended = isNativeGestureBridgeSuspended(pathname);

  // One subscription for the whole app, torn down only when the tutorial is
  // on screen. Ordinary navigation between story screens does not resubscribe
  // - the Bridge reads the active contract fresh on every dispatch, so a
  // subscription that outlives a screen cannot aim a gesture at the screen
  // before last.
  useEffect(() => {
    if (suspended) return undefined;
    return installJorjinGestureBridge();
  }, [suspended]);

  return null;
}
