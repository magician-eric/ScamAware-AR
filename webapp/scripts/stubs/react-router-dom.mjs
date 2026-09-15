// Test-only stand-in for react-router-dom, used by scripts/gesture-contract.test.mjs.
//
// The AR Interaction Contract tests mount real scenario screens far enough to
// run their hooks, outside any <Router>. Those screens call useNavigate() at
// the top of their body, which the real router refuses to answer without a
// router context. This stub answers it, and records where each screen asked
// to go - which is exactly what the contract tests need to prove: a RIGHT
// gesture runs the *same* semantic handler the button runs, ending in the
// same navigation.
//
// Only the members the screens under test actually use are provided.
export const navigations = [];

export function resetNavigations() {
  navigations.length = 0;
}

// One stable function for the whole process, not a fresh closure per call:
// the real useNavigate() returns a referentially stable navigate, and screens
// rely on that - several put it in an effect's dependency array. A stub that
// handed back a new function every render would re-run those effects on every
// render and spin a screen that is perfectly well behaved in the app.
function navigate(...args) {
  navigations.push(args);
}

export function useNavigate() {
  return navigate;
}

// The current location, defaulting to the app root - which is what every
// suite written against this stub before now expects. A test that mounts a
// component which behaves differently per route (the native gesture binding
// is suspended on /gesture-tutorial) sets it for the duration of that mount.
//
// One object per location, replaced rather than rebuilt on every call: the
// real useLocation() returns a referentially stable value between navigations,
// and a component that puts it in an effect's dependency array must not see a
// new one on every render.
const ROOT = { pathname: '/', search: '', hash: '', state: null, key: 'test' };
let location = ROOT;

export function setLocation(next) {
  location = typeof next === 'string'
    ? { ...ROOT, pathname: next, key: next }
    : { ...ROOT, ...(next ?? {}) };
}

export function resetLocation() {
  location = ROOT;
}

export function useLocation() {
  return location;
}

// Route params default to none, which is what every suite written against
// this stub before now expects. A test that mounts a screen registered at a
// parameterised path (scenario04's `/result/:route/:outcome`) sets them for
// the duration of that mount, so the URL the screen navigates to is the one a
// real run would produce rather than one with `undefined` in it.
let params = {};

export function setParams(next) {
  params = next ?? {};
}

export function resetParams() {
  params = {};
}

export function useParams() {
  return params;
}

export function Link() {
  return null;
}

export function NavLink() {
  return null;
}

export function Navigate() {
  return null;
}
