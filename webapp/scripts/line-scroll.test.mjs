import assert from 'node:assert/strict';
import test from 'node:test';
import { mountSurface } from './ar-surface-harness.mjs';
import { LineChatScroll } from '../src/apps/line/components/Line.jsx';

test('LINE reveals late media and footer changes, preserving manual history scroll', () => {
  const originalObserver = globalThis.ResizeObserver;
  const observers = [];
  globalThis.ResizeObserver = class {
    targets = [];
    disconnected = false;
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.targets.push(target); }
    disconnect() { this.disconnected = true; }
  };
  const listeners = new Map();
  let top = 0;
  const viewport = {
    scrollHeight: 1200, clientHeight: 500, children: [{}, {}],
    get scrollTop() { return top; },
    set scrollTop(value) { top = Math.min(value, this.scrollHeight - this.clientHeight); },
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) { if (listeners.get(type) === listener) listeners.delete(type); },
  };
  let mounted;
  try {
    mounted = mountSurface(LineChatScroll, { scrollRef: { current: viewport }, children: 'messages' });
    assert.equal(top, 700);
    assert.deepEqual(observers[0].targets, [viewport, ...viewport.children]);
    viewport.clientHeight = 400; // reply footer appears after final message
    observers[0].callback();
    assert.equal(top, 800);
    viewport.scrollHeight = 1450; // image/card grows after initial render
    observers[0].callback();
    assert.equal(top, 1050);
    viewport.scrollTop = 100;
    listeners.get('scroll')();
    viewport.scrollHeight = 1500;
    observers[0].callback();
    assert.equal(top, 100, 'reading earlier messages must remain possible');
    mounted.rerender(); // new beat / enabled CTA: reveal it without a swipe
    assert.equal(top, 1100);
    assert.equal(observers[0].disconnected, true);
    mounted.unmount();
    assert.equal(observers[1].disconnected, true);
    assert.equal(listeners.size, 0);
  } finally {
    mounted?.unmount();
    if (originalObserver === undefined) delete globalThis.ResizeObserver;
    else globalThis.ResizeObserver = originalObserver;
  }
});

test('LINE reveals new beats when ResizeObserver is unavailable', () => {
  const originalObserver = globalThis.ResizeObserver;
  delete globalThis.ResizeObserver;
  let mounted;
  const viewport = { children: [], scrollHeight: 900, scrollTop: 0, addEventListener() {}, removeEventListener() {} };
  try {
    mounted = mountSurface(LineChatScroll, { scrollRef: { current: viewport } });
    assert.equal(viewport.scrollTop, 900);
  } finally {
    mounted?.unmount();
    if (originalObserver !== undefined) globalThis.ResizeObserver = originalObserver;
  }
});
