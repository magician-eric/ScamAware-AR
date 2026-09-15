// Gesture is an additional input, never a replacement for touch or mouse.
//
// CIBAR runs on three things: an AR headset whose ToF module speaks LEFT and
// RIGHT, a phone with a finger on it, and a desktop browser with a mouse. Only
// the first of those has a gesture sensor, so a story action that is reachable
// *only* by a wave is unreachable on two of the three. This suite is the
// site-wide guard against that: every action the AR Interaction Contract names
// must also be on the end of a pointer path, and the gesture layer must not be
// able to take a pointer path away.
//
// It is a source-level guard, deliberately. The browser-level proof (a real
// finger on a real phone profile, a real mouse, and a real `jorjinGesture`
// event, all landing on the same action) is what a run of the app shows; what
// a suite can pin is that no NEW screen can be added that a finger cannot use.
//
// What it does NOT do: it says nothing about the fake-App chrome that is
// deliberately inert (the LINE back chevron, the MyDonDon and GuGo footers,
// the BlackPi search bar's editability). Those are pinned by
// scripts/ar-interaction-regression-rules.mjs, and the rule there is the
// opposite one - they must stay unreachable by every input, gesture included.
// The two guards are complementary: this one covers declared story actions,
// that one covers everything deliberately closed.
//
// Run: npm run test:gesture-never-replaces-pointer
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { AR_MIGRATION_INVENTORY } from './ar-interaction-migration-inventory.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

const IDENT = /[A-Za-z_$][A-Za-z0-9_$]*/g;

// Language and framework words that carry no wiring: an action written inline
// as `() => navigate('/x')` names `navigate`, which every screen has, so
// finding it on a JSX prop would prove nothing.
const NOISE = new Set([
  'navigate', 'null', 'true', 'false', 'undefined', 'void', 'async', 'await',
  'return', 'const', 'let', 'if', 'else', 'then', 'catch', 'replace',
  'mode', 'surfaceId', 'disabled',
]);

// The text of every `useARInteraction(...)` call in a file, matched by
// balancing brackets rather than by a regex - the declarations are multi-line
// objects and several are inside a ternary.
function contractCalls(source) {
  const calls = [];
  let from = 0;
  for (;;) {
    const start = source.indexOf('useARInteraction(', from);
    if (start === -1) return calls;
    let depth = 0;
    let i = start + 'useARInteraction'.length;
    const open = i;
    for (; i < source.length; i += 1) {
      const ch = source[i];
      if (ch === '(' || ch === '{' || ch === '[') depth += 1;
      else if (ch === ')' || ch === '}' || ch === ']') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    calls.push(source.slice(open, i + 1));
    from = i;
  }
}

// The identifiers each declared side is built out of: `right: () => onBuy?.(p)`
// names `onBuy` and `p`.
function declaredSides(call) {
  const sides = [];
  for (const match of call.matchAll(/\b(action|left|right)\s*:\s*((?:[^,\n]|\n(?![ \t]*\}))+)/g)) {
    const expression = match[2].trim();
    if (expression === 'null' || expression === 'undefined') continue;
    sides.push({
      side: match[1],
      expression: expression.replace(/\s+/g, ' '),
      names: [...new Set(expression.match(IDENT) ?? [])].filter((name) => !NOISE.has(name)),
    });
  }
  return sides;
}

// Every identifier that reaches a JSX prop in this file - `onClick={goChat}`,
// `onSellItem={sellItem}`, `to={startRoute}`. A screen that hands its action to
// a presentational child (`<Home onSellItem={sellItem} />`) is wired through
// that child's own onClick, which is why a prop counts and not just `onClick`.
function pointerReachable(source) {
  const reachable = new Set();
  for (const match of source.matchAll(/\b[A-Za-z_$][A-Za-z0-9_$]*=\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g)) {
    for (const name of match[1].match(IDENT) ?? []) reachable.add(name);
  }
  // A local wrapper counts as the same action: `function goChat() {
  // onContactSeller?.(product); }` bound to an onClick is the pointer path for
  // a gesture declared as `() => onContactSeller?.(product)`.
  const wrappers = new Map();
  for (const match of source.matchAll(/function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\([^)]*\)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g)) {
    wrappers.set(match[1], new Set(match[2].match(IDENT) ?? []));
  }
  for (const match of source.matchAll(/(?:const|let)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*(?:\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}|([^;\n]+))/g)) {
    wrappers.set(match[1], new Set((match[2] ?? match[3] ?? '').match(IDENT) ?? []));
  }
  for (const [name, body] of wrappers) {
    if (!reachable.has(name)) continue;
    body.forEach((inner) => reachable.add(inner));
  }
  return reachable;
}

const FILES = [...new Set(AR_MIGRATION_INVENTORY.map((row) => row.file))];
const SOURCES = new Map(await Promise.all(FILES.map(async (file) => [file, stripComments(await read(file))])));

// =============================================================================
// 1. no gesture-only story action
// =============================================================================

test('every action a gesture can take is also on the end of a pointer path', () => {
  const gestureOnly = [];
  let checked = 0;

  for (const [file, source] of SOURCES) {
    const calls = contractCalls(source);
    // The render/wiring half of the file: everything the contract calls
    // themselves are not, so a name that appears only inside the declaration
    // does not count as its own pointer path.
    const rendered = calls.reduce((rest, call) => rest.replace(call, ' '), source);
    const reachable = pointerReachable(rendered);

    for (const call of calls) {
      for (const declared of declaredSides(call)) {
        checked += 1;
        if (!declared.names.some((name) => reachable.has(name))) {
          gestureOnly.push(`${file} — ${declared.side}: ${declared.expression}`);
        }
      }
    }
  }

  assert.ok(checked > 100, `the inventory should cover the whole app; only ${checked} sides were read`);
  assert.deepEqual(gestureOnly, [], 'these actions can only be taken by a gesture, so they are unreachable on a phone or a desktop');
});

// =============================================================================
// 2. the gesture layer cannot take a pointer path away
// =============================================================================

const GESTURE_LAYER = [
  'src/lib/arInteraction/interactionContract.js',
  'src/lib/arInteraction/useARInteraction.js',
  'src/lib/arInteraction/gestureBridge.js',
  'src/lib/arInteraction/index.js',
  'src/lib/arInteraction/native/jorjinGestureAdapter.js',
  'src/lib/arInteraction/native/installJorjinGestureBridge.js',
  'src/components/native/NativeGestureBridge.jsx',
];

test('nothing in the gesture layer touches, blocks or fakes a pointer event', async () => {
  // The layer reads the screen's declaration and calls a React handler. It
  // never reaches the DOM, so it has no way to swallow a tap, cover the stage,
  // disable a control or synthesise a click.
  const forbidden = [
    'preventDefault', 'stopPropagation', 'stopImmediatePropagation',
    'pointer-events', 'touch-action', 'setPointerCapture',
    'querySelector', 'getElementById', 'document.', '.click(',
    'setAttribute', 'inert', 'createElement', 'appendChild', 'style.',
    'onClick', 'onPointerDown', 'onTouchStart', 'onMouseDown',
  ];

  for (const file of GESTURE_LAYER) {
    const source = stripComments(await read(file));
    forbidden.forEach((token) => {
      assert.equal(source.includes(token), false, `${file} must not contain ${token} - the gesture layer never touches the DOM`);
    });
  }
});

test('the only DOM listener the gesture layer installs is the vendor gesture event', async () => {
  for (const file of GESTURE_LAYER) {
    const source = stripComments(await read(file));
    for (const match of source.matchAll(/addEventListener\(([^,)]+)/g)) {
      const target = match[1].trim();
      assert.equal(target, 'JORJIN_GESTURE_EVENT',
        `${file} listens for ${target}; the adapter may only subscribe to the vendor's own gesture event`);
    }
  }
});

test('the contract makes availability, not visibility - it can only ever say no to a gesture', async () => {
  const contract = stripComments(await read('src/lib/arInteraction/interactionContract.js'));

  // `disabled` in a declaration means "this screen has already switched this
  // action off"; the contract reads it off the declaration, it never writes it
  // onto anything. If it could write it, declaring a screen to the contract
  // would be able to disable that screen's own buttons - which is exactly the
  // failure this whole change is about.
  assert.match(contract, /function callable\(fn, disabled\)/, 'availability is read from the declaration');
  assert.match(contract, /const disabled = value\.disabled === true;/, 'and read off the declaration, not the DOM');
  assert.equal(/\.disabled\s*=(?!=)/.test(contract), false, 'the contract must never assign a `.disabled` property');

  // And the screen keeps its own handlers: the contract holds a getter, calls
  // it, and hands nothing back to the DOM.
  assert.match(contract, /return \{ performed: true, result: action\(\) \}/, 'an action is the screen\'s own handler, called directly');
});
