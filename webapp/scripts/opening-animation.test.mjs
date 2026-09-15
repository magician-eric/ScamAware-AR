/**
 * The opening sequence, and the one unmarked control on it.
 *
 *   node --import=./scripts/register-jsx-loader.mjs --test ./scripts/opening-animation.test.mjs
 *
 * Two contracts are pinned here, and they fail in opposite directions.
 *
 * The SEQUENCE contract is a promise to the room: the App opens on its own home screen, on that
 * screen's own background, with a 4.6-second title sequence over it in three languages - Chinese
 * first and largest, English and Japanese together after it - and it ends by getting out of the
 * way. Every part of it is markup and keyframes, which is the point: this screen used to be a
 * <video>, and every failure it had (a file to fetch, a decode to wait for, an autoplay to be
 * refused, three platforms taking three different amounts of time to start the same file) was a
 * media-stack failure that could not be fixed from the page. The tests below are what stops any
 * of that coming back - by a <video> reappearing, by a route being reintroduced between the
 * opening and the home screen, or by the type quietly shrinking into a caption.
 *
 * The GESTURE contract is a promise to the member of staff running the tenth session of the day:
 * three taps in the screen's top-right corner skip the opening, and NOTHING says so.
 *
 * That half of this file used to reach into the rendered JSX, pull `props.onPointerDown` off a div
 * and call it with an object shaped like an event. Every assertion passed and the gesture did not
 * work on a phone - twice over, in ways that shape of test cannot see:
 *
 *   - the corner was `position: absolute` inside a stage that useFitStage letterboxes, so on any
 *     viewport 768 CSS px or wider the hit area was up to 425px away from the screen's corner and
 *     a thumb on the corner hit nothing;
 *   - the third tap did skip, and then the same tap's `click` landed on the home screen's
 *     staff-settings gear, which occupies the identical corner, and the app went to /staff-setup.
 *
 * So the gesture is now tested through the thing that actually runs: installOpeningStaffExit
 * attaches real listeners to a real EventTarget, and the tests dispatch real events at real
 * coordinates and assert what came out. Calling a handler is not evidence that a tap reaches it.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import React from 'react'
import {
  UNSAFE_LocationContext as LocationContext,
  UNSAFE_NavigationContext as NavigationContext,
  UNSAFE_RouteContext as RouteContext,
} from 'react-router-dom'

import {
  STAFF_SKIP_HIT_AREA_PX, STAFF_SKIP_TAIL_MS, STAFF_SKIP_TAPS, STAFF_SKIP_WINDOW_MS,
  installOpeningStaffExit,
} from '../src/pages/opening/openingStaffExit.js'

const WEBAPP = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFileSync(join(WEBAPP, path), 'utf8')

const SCREEN = read('src/pages/opening/OpeningSequence.jsx')
const HOME = read('src/pages/opening/OpeningHome.jsx')
const EXIT = read('src/pages/opening/openingStaffExit.js')
// The same sources with their comments removed. The comments explain what these files
// deliberately do NOT do, and naming a thing in order to say it is never touched must not read as
// touching it - so the "these words must not appear" checks below look at code only.
const uncommented = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
const SCREEN_CODE = uncommented(SCREEN)
const HOME_CODE = uncommented(HOME)
const EXIT_CODE = uncommented(EXIT)
const STYLE = read('src/pages/opening/OpeningSequence.css')
// And the stylesheet without its comments, for the same reason: it explains what the opening
// deliberately never does (@font-face, display:none, a url() of any kind), and saying so must not
// read as doing it.
const STYLE_CODE = STYLE.replace(/\/\*[\s\S]*?\*\//g, ' ')
const ROUTES = read('src/routes.jsx')
const LANGUAGE_SCREEN = read('src/pages/LanguageSelect.jsx')

// --- harness -----------------------------------------------------------------

const REACT_INTERNALS = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE

function recordingRouter() {
  const visited = []
  const record = (to) => visited.push(typeof to === 'string' ? to : to.pathname)
  return {
    visited,
    navigator: {
      push: record,
      replace: record,
      go: (n) => visited.push(`go(${n})`),
      createHref: (to) => (typeof to === 'string' ? to : to.pathname),
      encodeLocation: (to) => (typeof to === 'string' ? { pathname: to, search: '', hash: '' } : to),
    },
  }
}

/**
 * Renders the screen far enough to reach its handlers.
 *
 * `useEffect` is collected rather than run, and by default the collection is thrown away: the
 * gesture and markup tests below need the handlers, not the media stack. Pass an array and the
 * effects come back in it, which is how the startup tests get to run the real one against a
 * stand-in <video> (see mount()). Every ref a render creates is shared by every handler in that
 * render, so the tap counter and the once-only latch behave exactly as they do in a browser.
 */
function renderScreen(Component, { navigator }, effects = null) {
  const contexts = new Map([
    [LocationContext, {
      location: { pathname: '/', search: '', hash: '', state: null, key: 'test' },
      navigationType: 'POP',
    }],
    [NavigationContext, { basename: '/', navigator, static: false }],
    [RouteContext, { outlet: null, matches: [], isDataRoute: false }],
  ])
  const previous = REACT_INTERNALS.H
  REACT_INTERNALS.H = {
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useRef: (initial) => ({ current: initial }),
    useEffect: (cb) => { if (effects) effects.push(cb) },
    useInsertionEffect: () => {},
    useLayoutEffect: (cb) => cb(),
    useMemo: (factory) => factory(),
    useCallback: (fn) => fn,
    useContext: (ctx) => (contexts.has(ctx) ? contexts.get(ctx) : null),
  }
  try { return Component() } finally { REACT_INTERNALS.H = previous }
}

function walk(node, found = []) {
  if (Array.isArray(node)) { node.forEach((child) => walk(child, found)); return found }
  if (!node || typeof node !== 'object') return found
  found.push(node)
  walk(node.props?.children, found)
  return found
}

function textOf(node) {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  return textOf(node.props?.children)
}

// --- a window, a document and a finger ---------------------------------------

/**
 * Enough of a browser for the exit to install itself into and be tapped.
 *
 * The listeners it registers are real ones on a real EventTarget and the events below are real
 * Events, so registration, the capture flag, removal on teardown and preventDefault/
 * stopPropagation all behave as they do in a WebView rather than as a mock decided they should.
 */
function fakeWorld({ width = 412, height = 839, hitArea = STAFF_SKIP_HIT_AREA_PX } = {}) {
  const view = new EventTarget()
  view.innerWidth = width
  view.innerHeight = height
  const body = {
    children: [],
    appendChild(node) { node.parentNode = body; body.children.push(node); return node },
    removeChild(node) {
      body.children.splice(body.children.indexOf(node), 1)
      node.parentNode = null
      return node
    },
  }
  view.document = {
    documentElement: { clientWidth: width, clientHeight: height },
    body,
    createElement() {
      return {
        tagName: 'DIV',
        className: '',
        style: {},
        childNodes: [],
        textContent: '',
        parentNode: null,
        attributes: {},
        setAttribute(name, value) { this.attributes[name] = String(value) },
        getAttribute(name) { return Object.hasOwn(this.attributes, name) ? this.attributes[name] : null },
        // The rect a browser would compute from OpeningSequence.css: a hitArea square pinned to the
        // top-right of the viewport, because the element is `position: fixed` on document.body.
        getBoundingClientRect() {
          return {
            left: width - hitArea, right: width, top: 0, bottom: hitArea,
            x: width - hitArea, y: 0, width: hitArea, height: hitArea,
          }
        },
      }
    },
  }
  return { view, body }
}

class TapEvent extends Event {
  constructor(type, x, y) {
    super(type, { cancelable: true, bubbles: true })
    this.clientX = x
    this.clientY = y
  }
}

/** A touch event carries its coordinates on the finger, not on the event. */
class TouchTapEvent extends Event {
  constructor(type, x, y) {
    super(type, { cancelable: true, bubbles: true })
    this.changedTouches = [{ clientX: x, clientY: y, identifier: 0 }]
  }
}

/**
 * One physical tap, as the named platform actually reports it.
 *
 *   pointer  a modern Android WebView: pointerdown, then touchend, then click
 *   touch    a WebView with no Pointer Events at all: touchend, then click
 *   mouse    a desktop browser being used with a mouse: pointerdown, then click
 *
 * Every one of them is ONE tap and must be counted once. Returns the events so a test can look
 * at which of them were consumed.
 */
function tap(view, x, y, platform = 'pointer') {
  const events = {
    pointer: [new TapEvent('pointerdown', x, y), new TouchTapEvent('touchend', x, y), new TapEvent('click', x, y)],
    touch: [new TouchTapEvent('touchend', x, y), new TapEvent('click', x, y)],
    mouse: [new TapEvent('pointerdown', x, y), new TapEvent('click', x, y)],
  }[platform]
  for (const event of events) view.dispatchEvent(event)
  return events
}

/** A clock the test drives, so a 1.5s window can be tested without waiting 1.5s. */
function clock(start = 1000) {
  let at = start
  return { now: () => at, advance: (ms) => { at += ms } }
}

function install(world, extra = {}) {
  const skips = []
  const time = extra.clock ?? clock()
  const teardown = installOpeningStaffExit({
    onSkip: () => skips.push(time.now()),
    view: world.view,
    now: time.now,
    tailMs: 40,
    ...extra,
  })
  return { skips, teardown, time, ...world }
}

const CORNER = [412 - 20, 20]

/**
 * A clock the test owns.
 *
 * The startup and stall watchdogs are the whole point of this screen and both of them are a
 * `setTimeout` - so a test that cannot move time can only check that the numbers are declared,
 * which is what a change to 30000 would also pass. This records the timers the screen arms and
 * fires them on demand, in due order.
 *
 * It is installed for the synchronous part of a test only, and every test below restores it: the
 * runner needs the real one back.
 */
function fakeClock() {
  const realSetTimeout = globalThis.setTimeout
  const realClearTimeout = globalThis.clearTimeout
  const pending = new Map()
  let now = 0
  let nextId = 1
  return {
    install() {
      globalThis.setTimeout = (fn, delay = 0) => {
        const id = nextId
        nextId += 1
        pending.set(id, { at: now + delay, fn })
        return id
      }
      globalThis.clearTimeout = (id) => { pending.delete(id) }
    },
    restore() {
      globalThis.setTimeout = realSetTimeout
      globalThis.clearTimeout = realClearTimeout
    },
    advance(ms) {
      now += ms
      const due = [...pending.entries()]
        .filter(([, timer]) => timer.at <= now)
        .sort((a, b) => a[1].at - b[1].at)
      for (const [id, timer] of due) if (pending.delete(id)) timer.fn()
    },
    get armed() { return pending.size },
  }
}

/**
 * Renders the overlay far enough to reach its markup, without running its effects.
 */
async function screen() {
  const module = await import('../src/pages/opening/OpeningSequence.jsx')
  const router = recordingRouter()
  const tree = renderScreen(() => module.OpeningSequence({}), router)
  return { module, tree, nodes: walk(tree), ...router }
}

/**
 * Renders the overlay AND runs its effects against a clock this test owns.
 *
 * The whole of the overlay's JavaScript is two timers and a skip, so this is the only way to
 * assert what it actually does: `advance(4150)` is the home UI coming up and `advance(4600)` is
 * the overlay ceasing to exist, and a change to either number has to fail here rather than in a
 * room.
 *
 * The staff exit is installed for real, into a window of this test's own - which is what makes
 * `skip()` three actual taps at actual coordinates rather than a call to the handler they are
 * supposed to reach.
 *
 * The clock is live when this returns. Every caller restores it.
 */
async function mount() {
  const module = await import('../src/pages/opening/OpeningSequence.jsx')
  const router = recordingRouter()
  const effects = []
  const calls = []
  const props = {
    onReveal: () => calls.push('reveal'),
    onFinish: () => calls.push('finish'),
  }
  const tree = renderScreen(() => module.OpeningSequence(props), router, effects)

  const clock = fakeClock()
  clock.install()
  const world = fakeWorld()
  const previousWindow = globalThis.window
  globalThis.window = world.view
  let teardown = []
  try {
    teardown = effects.map((effect) => effect()).filter((fn) => typeof fn === 'function')
  } finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }

  const skip = () => { for (let i = 0; i < STAFF_SKIP_TAPS; i++) tap(world.view, ...CORNER) }
  return { module, tree, nodes: walk(tree), calls, clock, teardown, world, skip, ...router }
}

// --- the hidden staff gesture, driven by real events -------------------------

test('the screen hands the staff exit its own finish(), and installs it as an effect', () => {
  // The exit is not a prop on an element any more, so what pins it to this screen is that it is
  // installed from it and torn down with it - and that the thing it is given is the same
  // once-only finish() every other exit uses.
  assert.match(SCREEN, /installOpeningStaffExit\(\{ onSkip: \(\) => finishRef\.current\(\) \}\)/,
    'the staff exit must skip through the same once-only finish() as the other exits')
  assert.match(SCREEN, /useEffect\(\(\) => installOpeningStaffExit\(.*\), \[\]\)/,
    'and must be installed exactly once: re-installing it would reset the tap counter')
  assert.ok(!/onPointerDown|onClick|onTouch/.test(SCREEN_CODE),
    'the corner must not be a React handler on an element inside the stage - that is the bug')
})

// --- A to F: the gesture, driven by real events ------------------------------

test('A. one tap in the corner does not skip', () => {
  const world = install(fakeWorld())
  tap(world.view, ...CORNER)
  assert.deepEqual(world.skips, [], 'one tap is not the gesture')
  world.teardown()
})

test('B. two taps in the corner do not skip', () => {
  const world = install(fakeWorld())
  tap(world.view, ...CORNER)
  world.time.advance(200)
  tap(world.view, ...CORNER)
  assert.deepEqual(world.skips, [], 'two taps are not the gesture - a double tap is an accident')
  world.teardown()
})

test('C. three taps in the corner inside 1.5s skip the opening', () => {
  const world = install(fakeWorld())
  tap(world.view, ...CORNER)
  world.time.advance(400)
  tap(world.view, ...CORNER)
  world.time.advance(500)
  tap(world.view, ...CORNER)
  assert.equal(world.skips.length, 1, 'the third tap inside 1.5s skips the opening')
  world.teardown()
})

test('C. and it holds everywhere in the corner, and at every realistic speed', () => {
  for (const [x, y] of [[411, 0], [412, 0], [412 - 88, 88], [412 - 44, 44], [412 - 1, 1]]) {
    for (const gap of [0, 40, 120, 400, 740]) {
      const world = install(fakeWorld())
      for (let i = 0; i < 3; i++) {
        tap(world.view, x, y)
        if (i < 2) world.time.advance(gap)
      }
      assert.equal(world.skips.length, 1,
        `three taps at (${x},${y}) ${gap}ms apart must skip`)
      world.teardown()
    }
  }
})

test('D. three taps spread over more than 1.5s do not skip', () => {
  // Three taps spread over two seconds is what a curious wearer produces, not a member of staff
  // performing a gesture they know. The window slides, so by the third tap the first has aged out
  // and only two are in play.
  const world = install(fakeWorld())
  tap(world.view, ...CORNER)
  world.time.advance(900)
  tap(world.view, ...CORNER)
  world.time.advance(900)
  tap(world.view, ...CORNER)
  assert.deepEqual(world.skips, [], 'taps spread over 1.8s must not skip')
  // ...and it does not leave the counter armed either: one more slow tap is still not three.
  world.time.advance(1600)
  tap(world.view, ...CORNER)
  assert.deepEqual(world.skips, [], 'a fourth slow tap must not skip either')
  world.teardown()
})

test('D. the boundary is 1.5 seconds exactly', () => {
  const inside = install(fakeWorld())
  tap(inside.view, ...CORNER); inside.time.advance(749)
  tap(inside.view, ...CORNER); inside.time.advance(750)
  tap(inside.view, ...CORNER)
  assert.equal(inside.skips.length, 1, '1499ms end to end is inside the window')
  inside.teardown()

  const outside = install(fakeWorld())
  tap(outside.view, ...CORNER); outside.time.advance(750)
  tap(outside.view, ...CORNER); outside.time.advance(750)
  tap(outside.view, ...CORNER)
  assert.deepEqual(outside.skips, [], '1500ms end to end has aged the first tap out')
  outside.teardown()
})

test('D. the window slides, so a fast three inside a slow run still counts', () => {
  const world = install(fakeWorld())
  tap(world.view, ...CORNER)
  world.time.advance(5000)
  tap(world.view, ...CORNER)
  world.time.advance(200)
  tap(world.view, ...CORNER)
  assert.deepEqual(world.skips, [], 'two inside the window is still two')
  world.time.advance(200)
  tap(world.view, ...CORNER)
  assert.equal(world.skips.length, 1, 'three inside 1.5s is the gesture, whenever it happens')
  world.teardown()
})

test('E. three taps anywhere but the corner do not skip', () => {
  // Every other corner, the middle of the screen, the rest of the top edge, and one pixel past each
  // of the two edges the hit area actually has.
  const outside = [
    [0, 0], [0, 839], [412, 839], [206, 420], [200, 20], [412, 100],
    [412 - 89, 40], [40, 0], [412 - 20, 89], [10, 500],
  ]
  for (const [x, y] of outside) {
    const world = install(fakeWorld())
    for (let i = 0; i < 3; i++) { tap(world.view, x, y); world.time.advance(120) }
    assert.deepEqual(world.skips, [], `three taps at (${x},${y}) must not skip`)
    world.teardown()
  }
})

test('E. and a tap outside the corner is left completely alone', () => {
  // The corner consumes its own taps so they never reach the home screen underneath. Everywhere else on
  // the screen has to keep working exactly as if this thing were not installed at all.
  const world = install(fakeWorld())
  const [pointerdown] = tap(world.view, 100, 400)
  assert.equal(pointerdown.defaultPrevented, false,
    'a tap in the middle of the screen must not be preventDefaulted by the staff exit')
  world.teardown()
})

test('F. one physical tap counts once, on every platform', () => {
  // The bug this guards against is silent and the wrong way round: a tap counted twice makes the
  // gesture fire on two taps, so a wearer brushing the screen skips the opening for the room.
  for (const platform of ['pointer', 'touch', 'mouse']) {
    const world = install(fakeWorld())
    tap(world.view, ...CORNER, platform)
    world.time.advance(120)
    tap(world.view, ...CORNER, platform)
    assert.deepEqual(world.skips, [],
      `two ${platform} taps emit more than two events and must still count as two`)
    world.time.advance(120)
    tap(world.view, ...CORNER, platform)
    assert.equal(world.skips.length, 1, `three ${platform} taps are the gesture`)
    world.teardown()
  }
})

test('F. the first family seen in the corner is the one that counts', () => {
  // A modern WebView emits all three for one finger. Whichever arrives first latches, and the
  // weaker ones are ignored from then on - which is exact, where any "ignore anything within N
  // ms" rule cannot be: two deliberate taps can be 120ms apart and a pointerdown's own click can
  // be 300ms behind it.
  const world = install(fakeWorld())
  const events = tap(world.view, ...CORNER, 'pointer')
  assert.equal(events[0].type, 'pointerdown')
  assert.equal(events[0].defaultPrevented, true, 'the pointerdown is the one that counted')
  assert.equal(events[1].defaultPrevented, false, 'the touchend of the same tap is ignored')
  assert.equal(events[2].defaultPrevented, false, 'and so is its click')
  world.teardown()
})

test('F. a WebView with no Pointer Events at all still counts one tap per finger', () => {
  const world = install(fakeWorld())
  const events = tap(world.view, ...CORNER, 'touch')
  assert.equal(events[0].defaultPrevented, true, 'touchend counts when nothing better arrived')
  assert.equal(events[1].defaultPrevented, false, 'and its trailing click is ignored')
  world.teardown()
})

// --- G: what happens after the skip ------------------------------------------

test('G. the skip goes nowhere, because the home screen is already there', async () => {
  // There is no destination any more. The opening is an overlay over the home screen, so the
  // skip reveals the home UI and unmounts the overlay - and the thing a staff member sees is the
  // screen that was underneath the whole time, at the moment they ask for it.
  const opening = await mount()
  try {
    opening.skip()
    assert.deepEqual(opening.calls, ['reveal', 'finish'],
      'the skip must reveal the home UI before the overlay stops existing')
    assert.deepEqual(opening.visited, [], 'and it must navigate nowhere at all')
  } finally {
    opening.clock.restore()
  }
})

test('G. the rest of the skipping tap cannot reach the home screen underneath', async () => {
  // The whole reported failure, and it is if anything sharper now: the home screen is not merely
  // mounted a millisecond later, it is underneath the opening the entire time. Its staff-settings
  // gear is at top:1.8%/right:3.5% - the identical corner. The third pointerdown ends the opening
  // synchronously, and without the guard that same tap's click lands on the gear and the app goes
  // to /staff-setup. Driven for real in a browser, five runs out of six ended there.
  const world = install(fakeWorld())
  tap(world.view, ...CORNER); world.time.advance(150)
  tap(world.view, ...CORNER); world.time.advance(150)

  const third = new TapEvent('pointerdown', ...CORNER)
  world.view.dispatchEvent(third)
  assert.equal(world.skips.length, 1, 'the third tap skips')
  // The opening is over and the overlay is gone; the rest of that one tap arrives anyway.
  world.teardown()

  const trailingTouch = new TouchTapEvent('touchend', ...CORNER)
  const trailingClick = new TapEvent('click', ...CORNER)
  world.view.dispatchEvent(trailingTouch)
  world.view.dispatchEvent(trailingClick)
  assert.equal(trailingClick.defaultPrevented, true,
    'the click that would have opened the next screen\'s corner control must be eaten')
  assert.equal(trailingTouch.defaultPrevented, true, 'and so must the touchend before it')

  // And only in that corner, and only for a moment: everything else on the next screen is live
  // immediately.
  const elsewhere = new TapEvent('click', 100, 400)
  world.view.dispatchEvent(elsewhere)
  assert.equal(elsewhere.defaultPrevented, false,
    'the guard must never touch a tap anywhere but the corner')
})

test('G. the guard lets go as soon as it has eaten the tap that armed it', () => {
  // It guards one gesture, not a window of time. The tap that skipped the opening is the tap that
  // must not reach the next screen; the staff member's next deliberate tap is not this one's
  // business, and a corner that stayed deaf would be its own bug report.
  const world = install(fakeWorld())
  for (let i = 0; i < 2; i++) { tap(world.view, ...CORNER); world.time.advance(120) }
  world.view.dispatchEvent(new TapEvent('pointerdown', ...CORNER))
  assert.equal(world.skips.length, 1)
  world.teardown()

  const trailing = new TapEvent('click', ...CORNER)
  world.view.dispatchEvent(trailing)
  assert.equal(trailing.defaultPrevented, true, 'the trailing click is eaten')

  const next = new TapEvent('click', ...CORNER)
  world.view.dispatchEvent(next)
  assert.equal(next.defaultPrevented, false,
    'and a deliberate tap after it reaches the screen normally')
})

test('G. the guard expires on its own if the WebView never sends the click', () => {
  const time = clock()
  const world = install(fakeWorld(), { clock: time, tailMs: 700 })
  for (let i = 0; i < 3; i++) { tap(world.view, ...CORNER); time.advance(120) }
  world.teardown()
  time.advance(701)
  const late = new TapEvent('click', ...CORNER)
  world.view.dispatchEvent(late)
  assert.equal(late.defaultPrevented, false, 'the guard is not a permanent hole in the corner')
})

// --- H: the gesture and the update are strangers ------------------------------

test('H. skipping the opening does nothing to the update running behind it', () => {
  // OtaController starts its check before this screen mounts and finishes on a background thread.
  // The one thing that must never happen is a staff member skipping the opening and, in doing so,
  // cancelling an 80 MiB download that was nearly finished - or worse, promoting a staged version
  // mid-session. Neither file may reach the update mechanism at all.
  for (const [name, code] of [['the screen', SCREEN_CODE], ['the staff exit', EXIT_CODE]]) {
    for (const forbidden of [
      '__cibarOta', 'cibarOta', 'location.reload', 'window.location', 'ota', 'Ota',
      'activate', 'promote', 'restart',
    ]) {
      assert.ok(!code.includes(forbidden),
        `${name} must not reference "${forbidden}" - the opening and the update are strangers`)
    }
  }
})

test('H. and the skip touches nothing but this screen', () => {
  // Everything the gesture is allowed to do, listed. It reveals the home UI, unmounts the
  // overlay, drops its own listeners and removes its own element. Anything else would be a new
  // power - and note there is no navigation on the list at all.
  assert.match(SCREEN, /handlersRef\.current\.onReveal/, 'the skip reveals the home UI')
  assert.match(SCREEN, /handlersRef\.current\.onFinish/, 'and ends the overlay')
  assert.ok(!/useNavigate|navigate\(/.test(SCREEN_CODE) && !/useNavigate|navigate\(/.test(HOME_CODE),
    'the opening navigates nowhere: a navigation here would re-mount the home screen')
  assert.ok(!/history|sessionStorage|localStorage|fetch|XMLHttpRequest|serviceWorker/.test(EXIT_CODE),
    'the staff exit talks to nothing outside the page')
})

// --- the corner itself --------------------------------------------------------

test('the hidden corner is a real element, on the body, and drawn as nothing', () => {
  const world = fakeWorld()
  const { teardown } = install(world)
  assert.equal(world.body.children.length, 1, 'the corner must exist as a real element')
  const [corner] = world.body.children
  assert.equal(corner.className, 'opening__staff-exit')
  assert.equal(corner.parentNode, world.body,
    'on document.body, so no transformed ancestor can move `position: fixed` off the screen')
  assert.equal(corner.getAttribute('aria-hidden'), 'true',
    'a screen reader announcing a skip target gives it away as thoroughly as drawing one')
  assert.equal(corner.textContent, '', 'the corner renders nothing')
  assert.equal(corner.childNodes.length, 0)
  assert.equal(corner.getAttribute('role'), null, 'and is not a button, a link or anything else')
  assert.equal(corner.getAttribute('aria-label'), null)
  assert.equal(corner.getAttribute('title'), null)
  teardown()
  assert.equal(world.body.children.length, 0, 'and it leaves with the opening')
})

test('tearing down really removes the listeners as well as the element', () => {
  const world = install(fakeWorld())
  world.teardown()
  for (let i = 0; i < 5; i++) { tap(world.view, ...CORNER); world.time.advance(100) }
  assert.deepEqual(world.skips, [], 'a torn-down exit counts nothing')
})

test('the corner falls back to the same box before the element has been laid out', () => {
  // First frame, or a document that never laid it out: getBoundingClientRect() is all zeros and
  // the corner has to come from somewhere. It comes from the same number the stylesheet uses.
  const world = fakeWorld()
  const bare = { ...world.view.document, body: null }
  const { skips, teardown } = install({ view: world.view, body: world.body }, { doc: bare })
  for (let i = 0; i < 3; i++) { tap(world.view, 412 - 10, 10) }
  assert.equal(skips.length, 1, 'the fallback corner is the top-right corner')
  teardown()

  const world2 = fakeWorld()
  const bare2 = { ...world2.view.document, body: null }
  const second = install({ view: world2.view, body: world2.body }, { doc: bare2 })
  for (let i = 0; i < 3; i++) { tap(world2.view, 412 - 120, 10) }
  assert.deepEqual(second.skips, [], 'and it is only a corner')
  second.teardown()
})

test('the corner is 88 CSS px square, in the top-right, above everything', () => {
  const rule = /\.opening__staff-exit\s*\{([^}]*)\}/.exec(STYLE)
  assert.ok(rule, 'the hidden corner must have its own rule')
  const body = rule[1]

  // Fixed and not absolute, and the element is on document.body - `top: 0; right: 0` has to mean
  // the screen's corner. Inside the stage it meant the stage's corner, which on any viewport
  // 768px or wider is a letterboxed column up to 425px away from where a thumb goes.
  assert.match(body, /position:\s*fixed/,
    'absolute inside the stage is the bug: the stage is transformed and letterboxed')
  assert.match(body, /top:\s*0/)
  assert.match(body, /right:\s*0/)
  assert.ok(EXIT.includes("doc.body.appendChild(element)"),
    'and it has to hang off the body, or a transformed ancestor becomes its containing block')

  // Size. A flat square rather than a share of the stage: a thumb is the same size on every
  // screen, and the spec's floor is 80.
  const width = Number(/width:\s*(\d+)px/.exec(body)?.[1])
  const height = Number(/height:\s*(\d+)px/.exec(body)?.[1])
  assert.ok(width >= 80 && height >= 80,
    `the hit area must stay comfortable to hit - it is ${width}x${height}`)
  assert.equal(width, STAFF_SKIP_HIT_AREA_PX,
    'the stylesheet and the pre-layout fallback must be the same number')
  assert.equal(height, STAFF_SKIP_HIT_AREA_PX)
  // ...and still a corner, not a quadrant, on the narrowest phone this ships to.
  assert.ok(width <= 320 * 0.32 && height <= 568 * 0.2,
    'a hit area that covers a quarter of the frame is not a hidden one')

  // Above the opening, and above the home screen that is revealed under the finger a moment later.
  const zIndex = Number(/z-index:\s*(\d+)/.exec(body)?.[1])
  assert.ok(zIndex >= 2147483647, `the corner must be above every layer - z-index is ${zIndex}`)

  // Drawn as nothing. A cursor change alone gives it away to anybody moving a mouse across the
  // screen, and a tap highlight gives it away to everybody in the room.
  assert.ok(!/cursor:/.test(body), 'no cursor change may hint that the corner is interactive')
  assert.match(body, /background:\s*transparent/)
  assert.ok(!/border(?!-radius)|outline\s*:|box-shadow|content\s*:/.test(body),
    'the corner must draw nothing at all')
  assert.match(body, /-webkit-tap-highlight-color:\s*transparent/)
  assert.match(body, /touch-action:\s*manipulation/,
    'a synthesised double-tap-zoom would eat one of the three taps')

  // The old tap-anywhere skip is gone: the whole surface being the target is the opposite of a
  // hidden one, and it made the opening unwatchable for anybody who touched the screen.
  const surface = /\.opening\s*\{([^}]*)\}/.exec(STYLE)?.[1] ?? ''
  assert.ok(!/cursor:\s*pointer/.test(surface), 'the opening must not look interactive')
})

test('exactly three, exactly 1.5 seconds, and a guard measured in one tap', () => {
  assert.equal(STAFF_SKIP_TAPS, 3,
    'a double tap is what a wearer produces by accident on an unresponsive screen')
  assert.equal(STAFF_SKIP_WINDOW_MS, 1500)
  assert.ok(STAFF_SKIP_TAIL_MS > 300 && STAFF_SKIP_TAIL_MS < 1000,
    'long enough for the slowest trailing click, short enough not to deaden the next screen')
})


test('nothing on the screen announces the gesture', async () => {
  const { tree, nodes } = await screen()

  // This screen is type now, so "renders no text" is not the assertion it used to be. What still
  // holds is that the only text on it is the title, in three languages, and that nothing on it
  // names, hints at or counts down the staff exit. The words below are the ones a well-meaning
  // change would add.
  const rendered = textOf(tree)
  for (const word of ['跳過', 'Skip', 'skip', '點三下', '三下', '工作人員', 'Staff', '倒數', '提示']) {
    assert.ok(!rendered.includes(word), `the screen must not display "${word}"`)
  }

  // No element anywhere on this screen may be a control at all.
  for (const node of nodes) {
    assert.ok(!['button', 'a', 'input'].includes(node.type),
      `the opening must render no ${node.type}`)
  }
  assert.ok(!nodes.some((node) => node.props?.onClick || node.props?.onPointerDown),
    'and nothing on it may be clickable')
})

// --- reading the timeline out of the stylesheet ------------------------------

/**
 * One @keyframes rule, as a list of {pct, decls} - every percentage it names,
 * with the declarations at it.
 *
 * The whole motion design is in these numbers, so the tests below read them
 * rather than asserting that some string appears somewhere: "AR overshoots and
 * rebounds" is a claim about four keyframes in order, and only a parse can
 * check it.
 */
function keyframes(name) {
  const block = new RegExp(`@keyframes ${name}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(STYLE_CODE)
  assert.ok(block, `@keyframes ${name} must exist`)
  const stops = []
  for (const rule of block[1].matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const decls = rule[2].trim()
    const selector = rule[1].trim()
    for (const pct of rule[1].matchAll(/([\d.]+)%/g)) {
      stops.push({ pct: Number(pct[1]), decls, selector })
    }
  }
  assert.ok(stops.length > 0, `@keyframes ${name} must have keyframes`)
  return stops.sort((a, b) => a.pct - b.pct)
}

/** The same, in milliseconds, which is the unit the design is written in. */
function timeline(name, total) {
  return keyframes(name).map((stop) => ({ ...stop, ms: Math.round((stop.pct / 100) * total) }))
}

/**
 * When an element's own movement begins.
 *
 * Every rule here opens with a `0%, X%` hold - the element sitting at its start
 * state until its moment - so X is the moment. A rule with two tracks (a
 * transform and a short brightness flash, say) has two such holds, which is why
 * the property being asked about has to be named.
 */
function startsAt(name, total, property = 'transform') {
  const hold = timeline(name, total)
    .filter((stop) => stop.decls.includes(property) && /(^|,)\s*0%/.test(stop.selector))
    .filter((stop) => stop.pct > 0)
  assert.ok(hold.length > 0, `${name} must hold at its start state until its moment`)
  return hold[0].ms
}

/** Every scale() factor a keyframes rule passes through, in order. */
function scales(name) {
  return keyframes(name)
    .filter((stop) => stop.decls.includes('transform'))
    .map((stop) => /scale\(([\d.]+)\)/.exec(stop.decls))
    .filter(Boolean)
    .map((match) => Number(match[1]))
}

/**
 * Whether an element is actually in motion across a window of the sequence.
 *
 * Two ways to be moving, and both count: a keyframe INSIDE the window, or a
 * window that sits between two keyframes that differ - which is a layer being
 * interpolated slowly across the whole of it. The second is how the quietest
 * things here move (the grid creeping outward for a second and a half), and a
 * check that only looked for keyframes inside would call them dead.
 */
function movesBetween(name, total, from, to) {
  const stops = timeline(name, total)
  const inside = stops.filter((stop) => stop.ms > from && stop.ms < to)
  if (inside.length > 0) return true
  const before = stops.filter((stop) => stop.ms <= from).pop()
  const after = stops.find((stop) => stop.ms >= to)
  return !!before && !!after && before.decls !== after.decls
}

/** When an element first reaches full opacity, in ms. */
function fullyVisibleAt(name, total) {
  const stop = timeline(name, total).find((entry) => /opacity:\s*1\b/.test(entry.decls))
  assert.ok(stop, `${name} must reach opacity 1 at some point`)
  return stop.ms
}

// --- there is no film, anywhere, any more -------------------------------------

test('the opening is drawn by the page: no video, no file, no decode', () => {
  // The screen this replaced was a <video> playing media/intro/intro.mp4, and everything that
  // went wrong with it went wrong before the first frame. None of it may come back by accident.
  for (const forbidden of [
    '<video', 'video', '.mp4', '.webm', '.gif', 'autoPlay', 'autoplay', 'playsInline', 'preload',
    'poster', 'canplay', 'muted', 'HTMLVideoElement', 'requestAnimationFrame', 'canvas', 'WebGL',
  ]) {
    assert.ok(!SCREEN_CODE.includes(forbidden) && !HOME_CODE.includes(forbidden),
      `the opening must not reference "${forbidden}" - it is markup and keyframes, nothing else`)
  }
  // Nothing it renders is fetched, either: no image, no font, no stylesheet of its own.
  assert.ok(!/url\(/.test(STYLE_CODE), 'the opening stylesheet must load nothing')
  assert.ok(!/@font-face|@import|https?:/.test(STYLE_CODE),
    'no web font and no remote anything: the offline APK has no network and no font CDN')
})

test('the film and its folder are gone from the repository', () => {
  // A dead .mp4 in public/ is 12 MiB in every APK and every OTA bundle, for a screen that no
  // longer exists. The whole drop folder went with it.
  assert.equal(existsSync(join(WEBAPP, 'public/media/intro')), false,
    'webapp/public/media/intro/ must not exist any more')
  assert.equal(existsSync(join(WEBAPP, 'src/pages/intro')), false,
    'src/pages/intro/ was the film screen and must be gone with it')

  // And nothing anywhere still points at either.
  const sources = []
  const walkDir = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walkDir(full)
      else if (/\.(jsx?|mjs|css|html|json|ts|tsx)$/.test(entry.name)) sources.push(full)
    }
  }
  walkDir(join(WEBAPP, 'src'))
  for (const file of sources) {
    const text = uncommented(readFileSync(file, 'utf8'))
    assert.ok(!text.includes('media/intro'), `${file} still points at the deleted drop folder`)
    assert.ok(!text.includes('IntroVideo'), `${file} still references the deleted film screen`)
  }
})

// --- one screen, not two ------------------------------------------------------

test('the opening plays ON the home screen, and never navigates to it', () => {
  assert.ok(ROUTES.includes('<OpeningHome />'), 'the index route must render the opening home')
  assert.ok(ROUTES.includes("import { OpeningHome } from './pages/opening/OpeningHome'"))
  // The home screen is mounted underneath from the first paint - that is what makes the
  // background of the first frame and the background of the home screen the same pixels, never
  // re-fetched and never re-decoded.
  assert.match(HOME, /<LanguageSelect booting=\{!revealed\} \/>/,
    'the real home screen must be rendered underneath the opening')
  assert.match(HOME, /!openingDone && \(/,
    'and the overlay must be conditionally rendered, so it can be unmounted')
  // The route the rest of the app returns to is untouched.
  assert.ok(ROUTES.includes("{ path: 'language', element: <LanguageSelect /> }"),
    'the home screen must still be routed exactly as before, with no opening on it')
})

test('the overlay is unmounted at the end, not left at opacity 0', () => {
  // An overlay held at opacity 0 over the home screen keeps swallowing every tap aimed at a
  // language button - the screen looks finished and nothing works.
  assert.match(HOME_CODE, /\{!openingDone && \(/)
  assert.ok(!/display:\s*none/.test(STYLE_CODE), 'nothing here is hidden instead of removed')
  const surface = /\.opening\s*\{([^}]*)\}/.exec(STYLE)?.[1] ?? ''
  assert.match(surface, /pointer-events:\s*auto/,
    'while it exists it must swallow taps, so the home UI cannot be hit early')
})

test('the home screen is only dimmed, never unmounted, moved or re-fetched', () => {
  // The one thing the opening does to the screen underneath it: hides its interface with
  // `opacity`. The artwork <img> is deliberately not in that list - it is the opening's own
  // background, and it has to stay exactly where it is.
  const booting = /\.scenario-selection-page\.is-booting[^{]*\{([^}]*)\}/.exec(STYLE)
  assert.ok(booting, 'the booting state must have a rule')
  assert.match(booting[1].trim(), /^opacity:\s*0;?$/,
    'opacity and nothing else: anything that changes layout would move the artwork')
  const selector = STYLE.slice(STYLE.indexOf('.scenario-selection-page.is-booting'),
    STYLE.indexOf('.scenario-selection-page.is-booting') + 400)
  assert.ok(!selector.includes('scenario-selection-background'),
    'the background artwork must never be faded, hidden or otherwise touched')
  assert.match(LANGUAGE_SCREEN, /booting = false/, 'and the home screen owns the flag')
  assert.equal((LANGUAGE_SCREEN.match(/scenario-selection-background/g) ?? []).length, 1,
    'there is exactly one background element, and both screens share it')
})

// --- the sequence itself ------------------------------------------------------

test('the whole sequence is about seven seconds, and every layer agrees', async () => {
  const { module } = await screen()
  // Seven seconds, and the extra time over the first version is deliberately NOT
  // spread evenly: every individual movement is still 200-600ms. What grew is
  // the time a finished movement is allowed to stand - the read of the Chinese
  // title, and the read of the three-language composition.
  assert.ok(module.OPENING_TOTAL_MS >= 6500 && module.OPENING_TOTAL_MS <= 7500,
    `the opening is ${module.OPENING_TOTAL_MS}ms - fast movements, real pauses`)
  assert.ok(module.OPENING_REVEAL_MS < module.OPENING_TOTAL_MS,
    'the home UI must come up before the overlay goes, or the hand-over is a cut')
  assert.ok(module.OPENING_TOTAL_MS - module.OPENING_REVEAL_MS >= 300,
    'and with enough overlap to read as a cross-fade')

  // Every animation on the screen is the length of the whole sequence, with its
  // own moments as keyframe percentages: CSS animations do not compose
  // transforms, so an element with two overlapping animations silently loses one
  // of them. This is what keeps that impossible - and it is why the four rings
  // are four elements rather than one reused four times.
  const durations = [...STYLE.matchAll(/animation:[^;]*?(\d+)ms/g)].map((m) => Number(m[1]))
  assert.ok(durations.length >= 20,
    `the whole sequence must be animated, saw only ${durations.length} animations`)
  for (const duration of durations) {
    assert.equal(duration, module.OPENING_TOTAL_MS,
      'every animation must run the length of the sequence')
  }
  assert.ok(!/animation-delay|\d+ms\s+\d+ms/.test(STYLE_CODE),
    'a delay would put an element on a second clock; stagger belongs in the keyframes')
})

test('Chinese first and alone, then English and Japanese together', async () => {
  const { module, tree } = await screen()
  const total = module.OPENING_TOTAL_MS
  const rendered = textOf(tree)
  assert.equal(module.ZH_LINES.join(' '), '沉浸式 AR 詐騙體驗')
  assert.deepEqual(module.EN_LINES, ['IMMERSIVE AR', 'ANTI-FRAUD EXPERIENCE'])
  assert.equal(module.JP_LINE, '没入型 AR 詐欺体験')
  for (const line of [...module.EN_LINES, module.JP_LINE, '詐騙體驗', '沉', '浸', '式']) {
    assert.ok(rendered.includes(line), `${line} must actually be on the screen`)
  }

  // The order is the whole design, and it now has a phase in front of it: the
  // space is scanned BEFORE any type exists, so the Chinese does not start on
  // the first frame - it starts as the sweep reaches the middle of the screen.
  const zh = startsAt('openingZhGlyph', total)
  const ar = startsAt('openingZhAr', total)
  const en = startsAt('openingEn', total)
  const jp = startsAt('openingJp', total)
  const sweep = timeline('openingSweep', total)

  assert.ok(sweep[0].ms === 0, 'the scan starts on the first frame')
  assert.ok(zh >= 350 && zh <= 1000,
    `the Chinese must wait for the scan and then come straight in - it starts at ${zh}ms`)
  assert.ok(ar > zh, 'AR lands after 沉浸式 has been placed')
  assert.ok(en > zh + 1200,
    'English may not arrive until the Chinese has been read for a moment')
  assert.ok(Math.abs(jp - en) <= 200,
    `English and Japanese must read as one arrival - they are ${Math.abs(jp - en)}ms apart`)
  assert.ok(en < 3200 && jp < 3200, 'and both are placed well before the composition holds')
})

// --- SCAN → ASSEMBLE → LOCK → EXPAND → PROJECT → PULSE → REVEAL --------------

test('PHASE 01: the space is scanned before any text exists', () => {
  // The failure this guards against is the one the whole rework is for: an
  // opening that begins by throwing a word at the viewer. Before the title
  // there is a sweep, a grid, axes, brackets and ticks - and no type at all.
  for (const name of ['openingSweep', 'openingGrid', 'openingAxisV', 'openingAxisH',
    'openingTick', 'openingCorner', 'openingReticle']) {
    const first = keyframes(name)
    assert.ok(first[0].pct === 0, `${name} must be part of the opening frame`)
  }
  // And the sweep is a pass, not a fade: it crosses the screen top to bottom.
  const sweep = keyframes('openingSweep')
  assert.match(sweep[0].decls, /translate3d\(0,\s*-\d+%/, 'the sweep starts above the screen')
  assert.ok(sweep.some((s) => /translate3d\(0,\s*4\d\d%/.test(s.decls)),
    'and ends below it')
})

test('PHASE 02: 沉浸式 is calibrated into place, not flown in', async () => {
  const { module, nodes } = await screen()
  // Three glyphs, three elements, three different offsets - that is what makes
  // it a convergence rather than a slide.
  const glyphs = nodes.filter((node) => node.props?.className === 'opening__zh-glyph')
  assert.equal(glyphs.length, 3, '沉 浸 式 must each be their own element')
  const offsets = glyphs.map((node) => node.props.style['--dx'])
  assert.equal(new Set(offsets).size, 3, 'each glyph starts off its own mark')
  assert.ok(offsets.some((dx) => dx < 0) && offsets.some((dx) => dx > 0),
    'they converge from both sides, rather than all sliding the same way')
  for (const dx of offsets) {
    assert.ok(Math.abs(dx) < 1,
      `an offset of ${dx}em is a scatter, not a calibration - it must stay under one glyph`)
  }
  assert.equal(module.ZH_LEAD_GLYPHS.map((g) => g.glyph).join(''), '沉浸式')

  // And it lands as a set: one keyframes rule, ending at zero offset and scale 1.
  const stops = keyframes('openingZhGlyph')
  assert.match(stops[0].decls, /var\(--dx\)/, 'the start is the per-glyph offset')
  assert.match(stops[stops.length - 1].decls, /translate3d\(0,\s*0,\s*0\)\s*scale\(1\)/,
    'and every glyph ends exactly on its mark')
  // Never letter-spacing: that is layout, on the largest text on the screen.
  assert.ok(!/letter-spacing/.test(
    /@keyframes openingZhGlyph[\s\S]*?\n\}/.exec(STYLE_CODE)[0]),
  'the convergence must be transforms, not an animated letter-spacing')
})

test('PHASE 02: AR locks on - overshoot, rebound, lock - and it is the first climax',
  async () => {
    const { module } = await screen()
    const total = module.OPENING_TOTAL_MS
    // 1.6 → .92 → 1.045 → 1. Too big, past the mark, back, locked.
    const path = scales('openingZhAr')
    assert.ok(path[0] >= 1.4, `AR must start well oversized - it starts at ${path[0]}`)
    const min = Math.min(...path)
    assert.ok(min < 1, `it must overshoot past its final size - the lowest is ${min}`)
    const rebound = path[path.indexOf(min) + 1]
    assert.ok(rebound > 1, `and rebound above it before settling - saw ${rebound}`)
    assert.equal(path[path.length - 1], 1, 'and end locked at 1')

    // Fast: the whole lock is one movement, not a slow zoom. Measured from the
    // moment it starts moving to the moment it settles - the trailing keyframe
    // that carries scale(1) to the end of the sequence is not part of it.
    const begins = startsAt('openingZhAr', total)
    const settles = timeline('openingZhAr', total)
      .find((s) => s.ms > begins && /scale\(1\)/.test(s.decls)).ms
    const duration = settles - begins
    assert.ok(duration >= 250 && duration <= 500,
      `the lock must have force - it takes ${duration}ms`)

    // And it is witnessed: brackets closing onto it, a slice, a scan, two beams
    // and a ring, all inside the same moment.
    for (const name of ['openingArBracket', 'openingArSlice', 'openingArScan',
      'openingArBeam', 'openingRingLock']) {
      const fires = startsAt(name, total)
      assert.ok(Math.abs(fires - settles) <= 400,
        `${name} must land with the lock - it is ${Math.abs(fires - settles)}ms away`)
    }
  })

test('PHASE 02: 詐騙體驗 is uncovered by a wipe, not delivered from off-screen', () => {
  const stops = keyframes('openingZhTail')
  assert.match(stops[0].decls, /clip-path:\s*inset\(0 100% 0 0\)/,
    'the line starts fully clipped, in place')
  assert.match(stops[stops.length - 1].decls, /clip-path:\s*inset\(0 0 0 0\)/,
    'and is uncovered left to right')
  const block = /@keyframes openingZhTail[\s\S]*?\n\}/.exec(STYLE_CODE)[0]
  assert.ok(!/translate/.test(block), 'it must not move: it is revealed where it stands')
  // With a bright edge riding the reveal, or the wipe is an invisible boundary.
  assert.ok(/@keyframes openingZhWipe/.test(STYLE_CODE))
})

test('PHASE 03: the frame opens outward while the title holds still', async () => {
  const { module } = await screen()
  const total = module.OPENING_TOTAL_MS
  // The depth shift: between the lock and the projection, the space expands and
  // the title does not move. That contrast is the effect.
  const window = (name) => timeline(name, total).filter((s) => s.ms > 1700 && s.ms < 2900)
  for (const name of ['openingGrid', 'openingReticle', 'openingCorner']) {
    assert.ok(window(name).length > 0, `${name} must move during the depth shift`)
  }
  const growsBy = (name) => {
    const found = timeline(name, total).filter((s) => /scale\(([\d.]+)\)/.test(s.decls))
    const before = found.filter((s) => s.ms <= 1800).pop()
    const after = found.find((s) => s.ms > 1800)
    return Number(/scale\(([\d.]+)\)/.exec(after.decls)[1])
      - Number(/scale\(([\d.]+)\)/.exec(before.decls)[1])
  }
  assert.ok(growsBy('openingGrid') > 0, 'the grid grows - the space is opening')
  assert.ok(growsBy('openingReticle') > 0, 'and so does the tracking frame')
  // "Still" means no keyframe in this window that says anything different from
  // where it already was - the end of a hold is not a movement.
  const zhTrack = timeline('openingZh', total).filter((s) => /transform/.test(s.decls))
  const zhResting = zhTrack[0].decls
  const zhMoves = zhTrack.filter((s) => s.ms > 1700 && s.ms < 2600 && s.decls !== zhResting)
  assert.equal(zhMoves.length, 0, 'and the title itself must be perfectly still through it')
  // A second ring goes out with it.
  assert.ok(Math.abs(startsAt('openingRingDepth', total) - 2000) <= 500,
    'and a ring goes out with it')
})

test('PHASE 04: English and Japanese are projected out of depth, not slid in', () => {
  for (const name of ['openingEn', 'openingJp']) {
    const stops = keyframes(name)
    const from = stops[0].decls
    assert.match(from, /perspective\(\d+px\)/, `${name} must arrive through depth`)
    assert.match(from, /rotateY\(-?\d+deg\)/, `${name} must be turned away as it starts`)
    assert.match(from, /scale\(\.\d+\)/, `${name} must start smaller than it lands`)
    assert.match(from, /opacity:\s*0/)
    const landed = stops.find((s) => /translate3d\(0,\s*0,\s*0\)\s*rotateY\(0deg\)\s*scale\(1\)/
      .test(s.decls))
    assert.ok(landed, `${name} must come all the way forward onto the title's plane`)
  }
  // From opposite sides.
  assert.match(keyframes('openingEn')[0].decls, /translate3d\(\d+vw/, 'English from the right')
  assert.match(keyframes('openingJp')[0].decls, /translate3d\(-\d+vw/, 'Japanese from the left')
  // And each is lit by a line passing over it as it lands - the projection tell.
  assert.ok(/@keyframes openingEnScan/.test(STYLE_CODE))
  assert.ok(/@keyframes openingJpScan/.test(STYLE_CODE))
})

test('PHASE 05: the three-language composition is held long enough to read', async () => {
  const { module } = await screen()
  const total = module.OPENING_TOTAL_MS
  const enIn = fullyVisibleAt('openingEn', total)
  const jpIn = fullyVisibleAt('openingJp', total)
  const pulse = startsAt('openingRingPulseA', total)
  const holdStarts = Math.max(enIn, jpIn)
  assert.ok(pulse - holdStarts >= 1300,
    `all three must stand together for at least 1.3s - they get ${pulse - holdStarts}ms`)

  // And nothing may be leaving during that hold.
  for (const name of ['openingEn', 'openingJp']) {
    const leaving = timeline(name, total)
      .find((s) => /opacity:\s*0/.test(s.decls) && s.ms > holdStarts)
    assert.ok(leaving.ms > pulse, `${name} must not start leaving before the pulse`)
  }
})

test('PHASE 06: there is a system pulse, and it is the biggest moment on screen',
  async () => {
    const { module } = await screen()
    const total = module.OPENING_TOTAL_MS
    const pulse = startsAt('openingRingPulseA', total)
    assert.ok(pulse >= 4600 && pulse <= 5600, `the pulse lands at ${pulse}ms`)

    // Two rings, the second behind the first.
    const second = startsAt('openingRingPulseB', total)
    assert.ok(second > pulse && second - pulse <= 250,
      `the second ring follows by ${second - pulse}ms`)

    // AR flares, the title swells, and everything else is thrown outward.
    const flare = timeline('openingZhAr', total)
      .find((s) => /filter:\s*brightness\(1\.[5-9]/.test(s.decls))
    assert.ok(flare && Math.abs(flare.ms - pulse) <= 400, 'AR flares with it')
    const swell = timeline('openingZh', total).find((s) => /scale\(1\.0[2-9]/.test(s.decls))
    assert.ok(swell && Math.abs(swell.ms - pulse) <= 500, 'and the title swells slightly')

    // Pushed outward, and measured against where it already was: the layer has
    // been drifting gently outward for the whole hold, so what makes this a
    // shove is that it goes several times further, several times faster.
    const pushed = (name, sign) => {
      const offsets = timeline(name, total)
        .filter((s) => /translate3d\(-?[\d.]+vw/.test(s.decls))
        .map((s) => ({ ms: s.ms, vw: Number(/translate3d\((-?[\d.]+)vw/.exec(s.decls)[1]) }))
      const drift = offsets.filter((o) => o.ms <= pulse).pop()
      const shove = offsets.find((o) => o.ms > pulse)
      assert.ok(sign * shove.vw > sign * drift.vw * 2,
        `${name} must be shoved outward by the pulse, not merely keep drifting `
        + `- it goes from ${drift.vw}vw to ${shove.vw}vw`)
      assert.ok(shove.ms - pulse <= 400, `${name} must react to the pulse immediately`)
    }
    pushed('openingEn', 1)
    pushed('openingJp', -1)
  })

test('PHASE 07-08: the exit is after the pulse, and the title locks alone', async () => {
  const { module } = await screen()
  const total = module.OPENING_TOTAL_MS
  const pulse = startsAt('openingRingPulseA', total)

  // English and Japanese retreat INTO depth rather than fading where they stand.
  for (const name of ['openingEn', 'openingJp']) {
    const gone = timeline(name, total).filter((s) => /opacity:\s*0/.test(s.decls)).pop()
    assert.ok(gone.ms > pulse, `${name} leaves only after the pulse`)
    assert.match(gone.decls, /rotateY\(-?1\d+deg\)/, `${name} turns away as it goes`)
    assert.match(gone.decls, /scale\(\.9\d\)/, `${name} shrinks into the distance`)
  }

  // The final lock: the brackets come home and a line crosses the whole title,
  // both after the pulse and both before the reveal.
  const snap = timeline('openingCorner', total)
    .filter((s) => s.ms > pulse && /translate3d\(0,\s*0,\s*0\)/.test(s.decls))[0]
  assert.ok(snap && snap.ms < module.OPENING_REVEAL_MS, 'the brackets snap home for the lock')
  const lastScan = timeline('openingZhLock', total).filter((s) => /opacity:\s*1/.test(s.decls)).pop()
  assert.ok(lastScan.ms > pulse && lastScan.ms < module.OPENING_REVEAL_MS,
    'and a scan crosses the title one last time before the hand-over')

  // With the title alone on screen for a beat before anything fades.
  assert.ok(module.OPENING_REVEAL_MS - lastScan.ms >= 150,
    'the locked title must stand for a moment, not blink out')
})

test('the title is the size of the screen, and the other two are not captions', () => {
  // The sizes are the design: Chinese 75-88% of the width, English 70-85%, Japanese 65-80%. What
  // is checked here is the vw term each one is driven by on a phone, because that is the term
  // that decides those percentages - and the failure being guarded against is the long English
  // line being quietly shrunk to fit rather than being allowed two lines.
  const term = (name) => {
    const value = new RegExp(`--opening-${name}:[^;]*?min\\(([\\d.]+)vw`).exec(STYLE)
    assert.ok(value, `--opening-${name} must be driven by a vw term`)
    return Number(value[1])
  }
  const zh = term('zh')
  const en = term('en')
  const jp = term('jp')
  assert.ok(zh >= 15 && zh <= 19, `the Chinese title is ${zh}vw - it must fill the screen`)
  assert.ok(en >= 4.8 && en <= 6.4, `the English line is ${en}vw - large motion type, not a caption`)
  assert.ok(jp >= 6.8 && jp <= 8.8, `the Japanese line is ${jp}vw`)
  assert.ok(zh > jp && jp > en,
    'the hierarchy is Chinese first, then Japanese and English at a similar weight')

  // Two lines each for the two long ones, authored rather than wrapped - and never four.
  assert.match(STYLE, /\.opening__zh-line\s*\{[^}]*white-space:\s*nowrap/,
    'each Chinese line is one line: 沉浸式 AR / 詐騙體驗, never split further')
  assert.match(STYLE, /\.opening__en-line\s*\{[^}]*display:\s*block/)

  // Weight. A hairline title at that size is a different design.
  assert.match(STYLE, /\.opening__zh-line\s*\{[^}]*font-weight:\s*(800|900)/)
  assert.match(STYLE, /\.opening__en\s*\{[^}]*font-weight:\s*[78]00/)

  // Japanese is asked for from a Japanese face, and is declared as Japanese, so 験 and 体 cannot
  // fall back to a glyph that is not in a Traditional Chinese font.
  assert.match(SCREEN, /lang="ja"/)
  assert.match(STYLE, /\.opening__jp\s*\{[^}]*font-family:[^;]*Noto Sans JP/)
})

test('the motion never stops between the lock and the hand-over', async () => {
  const { module } = await screen()
  const total = module.OPENING_TOTAL_MS
  // The one thing this sequence is not allowed to be: a composition that arrives
  // and then waits. Every layer that is on screen during the hold has to still be
  // moving in it, which in keyframe terms means a keyframe strictly inside it.
  const holdStart = Math.max(fullyVisibleAt('openingEn', total), fullyVisibleAt('openingJp', total))
  const holdEnd = startsAt('openingRingPulseA', total)
  for (const name of ['openingEn', 'openingJp', 'openingCorner', 'openingReticle',
    'openingGrid', 'openingTick', 'openingSweep', 'openingZhLock']) {
    assert.ok(movesBetween(name, total, holdStart, holdEnd),
      `${name} stops moving during the hold - the composition goes still`)
  }

  // Every layer except one. The Chinese title is deliberately the only thing on
  // screen that does NOT move here: it is the core the rest of the composition
  // is working around, and a title that drifts with everything else is a title
  // nobody's eye can settle on. Its stillness is load-bearing, so it is asserted
  // rather than left to chance.
  const zhTrack = timeline('openingZh', total).filter((s) => /transform/.test(s.decls))
  const zhInside = zhTrack.filter((s) => s.ms > holdStart && s.ms < holdEnd
    && s.decls !== zhTrack.find((entry) => entry.ms <= holdStart).decls)
  assert.equal(zhInside.length, 0, 'the title itself holds perfectly still through the hold')

  // The rings go out once each and are not a loop: a system that keeps pinging is
  // a screensaver. Four of them, one per moment - the AR lock, the depth shift,
  // and the two of the pulse.
  assert.ok(!/infinite/.test(STYLE_CODE), 'nothing in the opening may loop')
  const rings = ['openingRingLock', 'openingRingDepth', 'openingRingPulseA', 'openingRingPulseB']
  for (const ring of rings) {
    const expansions = keyframes(ring).filter((s) => /scale\(\.\d+\)/.test(s.decls))
    assert.ok(expansions.length > 0, `${ring} must expand from small`)
  }
  const moments = rings.map((ring) => startsAt(ring, total))
  assert.equal(new Set(moments).size, rings.length,
    'each ring is its own moment - that is why there is more than one element')
})

test('every movement is a transform or an opacity', () => {
  // Anything else in a keyframe is a layout or a paint on every frame of a 4.6-second animation,
  // on a phone that is also holding a decoded background image and a live React tree.
  // clip-path is on the list because one reveal needs it - 詐騙體驗 is uncovered
  // where it stands, and the alternatives (an animated width, or a translate
  // that moves the text instead of revealing it) are a relayout and a different
  // effect respectively. Everything else is transform/opacity, plus two
  // brightness flashes measured in tenths of a second.
  const allowed = new Set([
    'transform', 'opacity', 'filter', 'clip-path', 'animation-timing-function',
  ])
  for (const block of STYLE_CODE.matchAll(/@keyframes\s+(\w+)\s*\{([\s\S]*?)\n\}/g)) {
    for (const declaration of block[2].matchAll(/([a-z-]+)\s*:/g)) {
      assert.ok(allowed.has(declaration[1]),
        `@keyframes ${block[1]} animates "${declaration[1]}" - `
        + 'only transform/opacity/filter/clip-path may move')
    }
  }
})

// --- the two moments the rest of the app depends on ---------------------------

test('the home UI comes up first, the overlay goes second, and each happens once', async () => {
  const opening = await mount()
  try {
    assert.deepEqual(opening.calls, [], 'nothing happens at mount')
    opening.clock.advance(opening.module.OPENING_REVEAL_MS - 1)
    assert.deepEqual(opening.calls, [], 'and nothing happens early')

    opening.clock.advance(1)
    assert.deepEqual(opening.calls, ['reveal'],
      'the home UI is revealed while the overlay is still on top of it')

    opening.clock.advance(opening.module.OPENING_TOTAL_MS - opening.module.OPENING_REVEAL_MS)
    assert.deepEqual(opening.calls, ['reveal', 'finish'], 'and then the overlay is unmounted')

    opening.clock.advance(10_000)
    assert.deepEqual(opening.calls, ['reveal', 'finish'], 'exactly once each, whatever happens after')
  } finally {
    opening.clock.restore()
  }
})

test('the three taps end the opening at any point in it, and only once', async () => {
  const opening = await mount()
  try {
    opening.skip()
    assert.deepEqual(opening.calls, ['reveal', 'finish'],
      'a skip reveals the home UI and unmounts the overlay, in that order')
    // The timers are still armed behind it; neither may fire a second hand-over.
    opening.clock.advance(10_000)
    assert.deepEqual(opening.calls, ['reveal', 'finish'])
    assert.deepEqual(opening.visited, [], 'and a skip navigates nowhere')
  } finally {
    opening.clock.restore()
  }
})

test('unmounting the overlay takes its timers and its corner with it', async () => {
  const opening = await mount()
  try {
    assert.equal(opening.world.body.children.length, 1, 'the hidden corner is installed')
    assert.ok(opening.clock.armed >= 2, 'both timers are armed')
    for (const fn of opening.teardown) fn()
    assert.equal(opening.clock.armed, 0, 'and both are cleared when the overlay goes')
    assert.equal(opening.world.body.children.length, 0, 'as is the corner element')
  } finally {
    opening.clock.restore()
  }
})

// --- once per cold start, not once per mount ---------------------------------

test('coming back to / does not replay the opening', async () => {
  // The regression this pins is a direct consequence of the design: the opening
  // no longer navigates, so '/' STAYS in the history stack underneath
  // /gesture-tutorial, and the glasses' hardware Back key walks back onto it.
  // The screen this replaced used `replace: true`, so there was nothing to come
  // back to; here, without a flag, a player pressing Back to reach the language
  // buttons gets 4.6 more seconds of opening instead.
  //
  // Driven through two real renders of the real component rather than by reading
  // its source: what has to hold is that the SECOND mount renders no overlay,
  // and a source check would pass on a flag that was written but never read.
  const module = await import('../src/pages/opening/OpeningHome.jsx')
  const router = recordingRouter()
  const first = walk(renderScreen(module.OpeningHome, router))
  const overlayOf = (nodes) => nodes.find((node) => typeof node.type === 'function'
    && node.type.name === 'OpeningSequence')

  const opening = overlayOf(first)
  assert.ok(opening, 'the first mount - the cold start - plays the opening')

  // The home screen is underneath it from that first paint, and hidden while
  // the opening is on top.
  const home = first.find((node) => typeof node.type === 'function'
    && node.type.name === 'LanguageSelect')
  assert.ok(home, 'the real home screen is mounted underneath')
  assert.equal(home.props.booting, true)

  // Play it through to the end, exactly as the sequence does.
  opening.props.onReveal()
  opening.props.onFinish()

  const second = walk(renderScreen(module.OpeningHome, router))
  assert.equal(overlayOf(second), undefined,
    'a return to / must render the plain home screen, with no opening on it')
  const homeAgain = second.find((node) => typeof node.type === 'function'
    && node.type.name === 'LanguageSelect')
  assert.equal(homeAgain.props.booting, false,
    'and its buttons must be up on the first paint, not faded in again')
  assert.deepEqual(router.visited, [],
    'and none of this may involve a navigation')
})

test('PHASE 01 really is text-free: nothing readable before the scan is done', async () => {
  const { module } = await screen()
  const total = module.OPENING_TOTAL_MS
  // The regression Codex caught on the first push of this rework, and the reason
  // it is worth a test of its own: the scan phase is a PROMISE ("no type yet"),
  // and a hold that ends 100ms early does not break anything, does not fail a
  // build, and quietly turns the hand-over into a cross-fade. The only way to
  // notice is to measure the moment each type layer stops being invisible.
  const SCAN_ENDS_MS = 700

  // Every layer that carries type, and how each of them is hidden until its
  // moment: three of them by opacity, and 詐騙體驗 by being clipped to nothing.
  const hiddenUntil = {
    openingZhGlyph: () => startsAt('openingZhGlyph', total, 'opacity'),
    openingZhAr: () => startsAt('openingZhAr', total, 'opacity'),
    openingEn: () => startsAt('openingEn', total, 'opacity'),
    openingJp: () => startsAt('openingJp', total, 'opacity'),
    openingZhTail: () => startsAt('openingZhTail', total, 'clip-path'),
  }
  for (const [name, moment] of Object.entries(hiddenUntil)) {
    const visibleFrom = moment()
    assert.ok(visibleFrom >= SCAN_ENDS_MS,
      `${name} starts becoming visible at ${visibleFrom}ms, inside the scan phase `
      + `- PHASE 01 must be over (${SCAN_ENDS_MS}ms) before any type appears`)
  }

  // And the scan itself has to have finished its pass by then, or the promise is
  // kept by an empty screen rather than by a scan.
  const sweepDone = timeline('openingSweep', total).find((s) => s.ms > 0 && /430%/.test(s.decls))
  assert.ok(sweepDone.ms <= SCAN_ENDS_MS + 50,
    `the sweep must have crossed by ${SCAN_ENDS_MS}ms - it finishes at ${sweepDone.ms}ms`)
})
