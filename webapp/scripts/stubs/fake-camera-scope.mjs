// A fake `window` for src/lib/ar/cameraSource.js.
//
// That module picks between two very different cameras - the AR glasses'
// MJPEG stream, advertised on `window.__jorjinCamera`, and `getUserMedia` in
// an ordinary browser - and the thing worth testing is the *choice*: which
// one it opened, and, above all, that the getUserMedia path is never touched
// once the glasses have declared themselves. That needs a scope with both
// possibilities present and both instrumented, which is what this builds.
//
// It is deliberately not a DOM: it implements exactly the element surface
// cameraSource.js uses (a src, a couple of listeners, natural/video
// dimensions) and nothing else, so a test failure here means the module
// reached for something new rather than that a DOM shim drifted.
//
// Test-only. Nothing the app builds or ships imports it.

function fakeElement(tagName, scope) {
  const listeners = new Map();
  const element = {
    tagName: tagName.toUpperCase(),
    className: '',
    parentNode: null,
    children: [],
    naturalWidth: 0,
    naturalHeight: 0,
    videoWidth: 0,
    videoHeight: 0,
    readyState: 0,
    HAVE_METADATA: 1,
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(handler);
    },
    removeEventListener(type, handler) {
      listeners.get(type)?.delete(handler);
    },
    dispatch(type) {
      [...(listeners.get(type) ?? [])].forEach((handler) => handler({ type, target: element }));
    },
    listenerCount(type) {
      return listeners.get(type)?.size ?? 0;
    },
    appendChild(child) {
      child.parentNode?.children?.splice(child.parentNode.children.indexOf(child), 1);
      child.parentNode = element;
      element.children.push(child);
      return child;
    },
    remove() {
      const parent = element.parentNode;
      if (!parent) return;
      parent.children.splice(parent.children.indexOf(element), 1);
      element.parentNode = null;
    },
    play: () => Promise.resolve(),
  };

  // Attaching a MediaStream to a <video> is what makes its metadata (and so
  // its dimensions) available; without that, cameraSource.js would sit waiting
  // for a `loadedmetadata` that a fake with an inert property never fires.
  let srcObject = null;
  Object.defineProperty(element, 'srcObject', {
    enumerable: true,
    get: () => srcObject,
    set(value) {
      srcObject = value;
      if (tagName !== 'video') return;
      if (!value) { element.readyState = 0; element.videoWidth = 0; element.videoHeight = 0; return; }
      element.readyState = 4;
      element.videoWidth = scope.__userMediaSize.width;
      element.videoHeight = scope.__userMediaSize.height;
    },
  });

  // The one piece of real behaviour: pointing an <img> at a URL either starts
  // producing frames or fails, and both have to be observable.
  let src = '';
  Object.defineProperty(element, 'src', {
    enumerable: true,
    get: () => src,
    set(value) {
      src = value;
      element.naturalWidth = 0;
      element.naturalHeight = 0;
      if (tagName !== 'img') return;
      const served = scope.__serveStream(value);
      if (served === undefined) return;
      const deliver = () => {
        if (element.src !== value) return; // re-pointed or closed in the meantime
        if (served === null) { element.dispatch('error'); return; }
        element.naturalWidth = served.width;
        element.naturalHeight = served.height;
        element.dispatch('load');
      };
      if (scope.__deliverSynchronously) deliver();
      else setTimeout(deliver, 0);
    },
  });
  return element;
}

/**
 * @param {object} [options]
 * @param {object|null} [options.jorjinCamera] - the value of
 *   `window.__jorjinCamera`, exactly as the ar-app would set it. null leaves
 *   the global unset, which is a desktop browser.
 * @param {Record<string, {width:number,height:number}|null>} [options.streams]
 *   URL -> the frames it serves, or null for a URL that fails to load. A URL
 *   that is not listed at all never resolves - a stream advertised but never
 *   served, which is what the first-frame timeout is for.
 * @param {(constraints: object) => Promise<object>} [options.getUserMedia] -
 *   omitted means "a browser with a working camera". Calls are counted
 *   whatever it does, and that count is the point of this whole file.
 * @param {string} [options.href] - the page's own URL, which decides whether
 *   a stream URL is cross-origin.
 * @param {string} [options.userAgent] - what `navigator.userAgent` says. Only
 *   ever consulted to decide how long to wait for a descriptor that has not
 *   arrived yet (see cameraSource.js's `looksLikeAndroidWebView`); it never
 *   selects a camera. Omitted means an ordinary browser.
 * @param {(url: string) => Promise<object>} [options.fetch] - the diagnostic
 *   probe cameraSource.js runs *after* a glasses stream has already failed,
 *   to find out what the server actually answered. Omitted means a scope with
 *   no fetch at all, which the probe skips.
 */
export function createFakeCameraScope({
  jorjinCamera = null,
  streams = {},
  getUserMedia = null,
  href = 'https://magician-eric.github.io/ScamAware-AR/',
  userMediaSize = { width: 1280, height: 720 },
  deliverSynchronously = false,
  userAgent = null,
  fetch = null,
} = {}) {
  const getUserMediaCalls = [];
  const stoppedTracks = [];
  const created = [];

  const defaultGetUserMedia = async () => {
    const track = { kind: 'video', stop: () => stoppedTracks.push(track) };
    return { getTracks: () => [track] };
  };

  const fetchCalls = [];
  // Only the keys cameraSource.js reads, and nothing that would let a test
  // pass because the shim was more generous than a browser.
  const session = new Map();

  const scope = {
    location: { href },
    sessionStorage: {
      getItem: (key) => (session.has(key) ? session.get(key) : null),
      setItem: (key, value) => session.set(key, String(value)),
      removeItem: (key) => session.delete(key),
    },
    __deliverSynchronously: deliverSynchronously,
    __userMediaSize: userMediaSize,
    __serveStream: (url) => (Object.hasOwn(streams, url) ? streams[url] : undefined),
    document: {
      createElement(tagName) {
        const element = fakeElement(tagName, scope);
        created.push(element);
        return element;
      },
    },
    navigator: {
      userAgent: userAgent ?? undefined,
      mediaDevices: {
        getUserMedia: async (constraints) => {
          getUserMediaCalls.push(constraints);
          return (getUserMedia ?? defaultGetUserMedia)(constraints);
        },
      },
    },
  };
  if (fetch) {
    scope.fetch = async (url, options) => {
      fetchCalls.push({ url, options });
      return fetch(url, options);
    };
  }
  if (jorjinCamera !== null) scope.__jorjinCamera = jorjinCamera;

  return {
    scope,
    getUserMediaCalls,
    fetchCalls,
    stoppedTracks,
    created,
    /** The elements cameraSource.js made, by tag - the camera it chose. */
    elementsOfType: (tagName) => created.filter((element) => element.tagName === tagName.toUpperCase()),
    host: () => fakeElement('div', scope),
  };
}
