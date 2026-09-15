# AR image recognition

`/ar-scan` keeps the camera open and watches for one of five printed target
images, one per scenario. Seeing one **offers** that scenario: the prompt under
the camera becomes the first line of its story and a CTA appears. The player
takes the offer with a RIGHT wave or a tap, and nothing else enters a scenario.

```
target seen -> offer (prompt + CTA)  ──wave / tap──>  prepareScenarioEntry(route) -> navigate(route)
                    │
                    └── no sighting for TARGET_LOSS_TOLERANCE_MS -> back to searching
```

Recognition is deliberately **not** entry. It used to be: a match navigated
immediately, and on a real poster — a hundred-odd 3D images, five of them
targets — a player was inside a scenario before they had registered what they
had pointed at, and the exploring was over. The recogniser is exactly as fast
as it was; the decision is the player's now.

---

## 1. The pieces

| File | What it owns |
| --- | --- |
| `webapp/src/lib/ar/scenarioTargetMap.js` | **The target table.** Which image belongs to which scenario, and in what order. Everything else follows this file. |
| `webapp/src/lib/ar/cameraSource.js` | **Which camera.** The AR glasses' MJPEG stream or `getUserMedia`, opened once, handed out as references, closed when the last one is released. |
| `webapp/src/lib/ar/imageTargetFrame.js` | How a frame becomes the grey pixels the matcher sees. Shared by the runtime and the compiler so the two cannot drift. |
| `webapp/src/lib/ar/imageRecognition.js` | The recognition loop and the sighting gate. A camera *consumer*. Answers "is a target in view **now**", every frame, and nothing else. |
| `webapp/src/lib/ar/targetLock.js` | **The offer.** Which target is on offer, held steady across the gaps between matched frames, dropped after `TARGET_LOSS_TOLERANCE_MS` without one. No pose, no tracker, no filter. |
| `webapp/src/pages/arScan/ArScanHome.jsx` | The page. Turns the offer into a prompt and a CTA, and — only when the player takes it — `prepareScenarioEntry(route)`, then `navigate(route)`. |
| `webapp/scripts/compile-image-targets.mjs` | Builds the dataset from the source PNGs. |
| `webapp/scripts/serve-fake-jorjin-camera.mjs` | Serves a fake `__jorjinCamera` + MJPEG stream, so the glasses path can be driven in Chrome. |
| `webapp/asset-sources/shared/ar/image-targets/*.png` | The five source images. Never shipped. |
| `webapp/public/assets/shared/ar/image-targets.mind` | The compiled dataset. Shipped, committed. |

---

## 2. Which camera, and how frames get in

CIBAR runs in two places and does not get its frames the same way in both.

```
AR glasses (the real target)            Chrome / a phone / a laptop
----------------------------            ---------------------------
ar-app owns the glasses' RGB camera      nothing owns a camera but us
and republishes it as MJPEG; it          navigator.mediaDevices
declares it on window.__jorjinCamera       .getUserMedia({facingMode:'environment'})

     <img src=streamUrl>                    <video srcObject=stream>
                 \                            /
                  v                          v
                     Camera Source  (lib/ar/cameraSource.js)
                              |
                  +-----------+-----------+
                  |                       |
           image recognition       the on-screen preview
                                   (the same element)
```

The descriptor the ar-app sets on the WebView before CIBAR loads:

```js
window.__jorjinCamera = {
  version: 1,
  available: true,
  streamUrl: 'https://ericingptt.github.io/CIBAR/__jorjin-camera.mjpeg',
  width: 1280,
  height: 960,
}
```

`available === true` is the *only* thing that selects the glasses path — no
user-agent sniffing, no "looks like a WebView" guess — and it is a
**commitment**: from that point on `cameraSource.js` will not call
`getUserMedia` under any circumstance, including a `streamUrl` that is
missing, empty, 404s or never delivers a frame. All of those are reported as
a camera error and `/ar-scan` offers its manual scenario selection instead.

That is not caution for its own sake. In the ar-app's WebView `getUserMedia`
does not return the glasses' camera — it either fails or opens the **phone's**
camera, and a phone lighting up while the player is wearing the glasses is the
exact failure this design exists to prevent. Falling back would be worse than
failing.

With no descriptor (desktop development, the demo laptop, a phone browser) the
old `getUserMedia` path is unchanged, down to the constraints.

### Everything downstream is a FrameSource

The two paths differ in one place — which element is created — and nowhere
else. `acquireCameraSource(label)` returns `{ source, release }`, where
`source` is:

```js
{ kind: 'glasses' | 'user-media', element, frameWidth, frameHeight, stream }
```

`element` is any **CanvasImageSource**, and `frameWidth`/`frameHeight` are the
pixel size of the frame currently in it — `naturalWidth` for the glasses'
`<img>`, `videoWidth` for a `<video>`, read fresh every pass because either
can change resolution mid-stream. That pair is everything `drawImage()` needs,
so nothing above this module knows which camera it got. The recognition core
takes them through one function, `drawRecognitionFrame(context, imageSource,
frameWidth, frameHeight, zoom)`, which is also what the offline tests call on
a node-canvas `Canvas` — no frame source is privileged, and none can be
assumed.

The preview element **is** the frame source element: one decode, one
connection. `mountCameraPreview(host, source)` moves it into the page's camera
box. A second `<img>` on the same MJPEG URL would open a second stream from
the glasses, so the page does not create a camera element of its own — it
provides an empty host and the recogniser mounts whichever element it opened.

### Reference counting

A consumer calls `acquireCameraSource(label)` and `release()` when it is done.
The camera opens on the first acquire and closes after the last release — for
`getUserMedia` that stops the tracks, for the glasses it drops the `<img>`'s
`src`, which is what closes the HTTP connection to the ar-app.

- **One open, one prompt.** Two consumers acquiring in the same tick await the
  same in-flight open.
- **No consumer can close the camera on another.** Image recognition ends the
  moment a target is found; anything else still holding it keeps running.
- **No consumer reconfigures the source.** No `applyConstraints`, no
  `track.stop()`, no `facingMode` swapping, no re-pointing the `<img>`. A
  consumer that needs different pixel dimensions scales the frames *it* draws.

Image recognition is the RGB camera's only consumer today. **Hand gestures are
not a second one, and never were.** LEFT/RIGHT come from the glasses' own
**ToF 8×8 depth sensor** — separate hardware — and reach the web app as
already-decided semantic events through the ar-app's native bridge
(`src/lib/arInteraction/gestureBridge.js`). No gesture code reads an RGB
frame or acquires this camera. The reference counting stays because it is what
keeps opens at exactly one per visit to `/ar-scan` across React's mount and
unmount churn, and it is what makes a future frame-tap or photo capture an
`acquire()`/`release()` pair rather than a second stream.

Verified in `scripts/ar-glasses-camera.test.mjs` (which camera, and the
recognition POC through it), `scripts/ar-scan-entry.test.mjs` (the reference
counting) and, end to end in a real browser, by §7.

## 3. Engine

**MindAR's image-target detector and matcher** (`mind-ar` 1.2.5), driven
directly rather than through its `Controller`.

Why not the `Controller`: it runs detect → match → **track**, and only reports a
target after several consecutive successfully-tracked frames. Tracking needs
texture a target set cannot be relied on to have — the previous set compiled to
single-digit tracking-feature counts, so the Controller would never have
reported them. We also do not need tracking: nothing is drawn in AR space,
there is no pose to hold, and "which image is in view" is exactly what detect +
match already answer. The pose estimate is still computed, but only as a
geometric sanity check on a match.

Two consequences worth knowing:

- The shipped dataset is **detection-only**: the compiler drops tracking
  features before export, which is over half its size. Removing that one line in
  `compile-image-targets.mjs` and rebuilding gets a tracking-capable dataset
  back.
- Nothing is loaded until `/ar-scan` is opened. MindAR and TensorFlow.js come in
  through one dynamic `import()`, so they are their own chunks — the entry
  bundle grew by about 5 kB.

**Cost:** ~1.2 MB of JS (≈300 kB gzipped) plus a 0.68 MB dataset, all lazy, all
only on `/ar-scan`.

**`canvas` note.** `mind-ar` depends on `canvas` for its Node-side offline
compiler. `canvas@2` (the version its range resolves to) has no prebuilt binary
for Node 22 and falls back to a source build that needs cairo headers, which
would break `npm ci` in the deploy workflow. `package.json` therefore carries
`"overrides": { "canvas": "^3.2.3" }` — canvas 3 ships a Node 22 prebuild.
Verified with a clean `npm ci` on Node 22.

---

## 4. The target table

`scenarioTargetMap.js` is the single source of truth. **The index into
`IMAGE_TARGETS` is the target index the matcher reports.** Three things agree on
that order, and they cannot drift because they all read the same array: the
compiler walks it to build the dataset, the matcher reports a position in that
dataset, and the table turns that position back into a route.

Nothing derives a scenario from a filename.

| # | Target | Scenario | Route |
| --- | --- | --- | --- |
| 0 | `scenario1.png` | investment | `/scenario01-investment` |
| 1 | `scenario2.png` | romance | `/scenario02-romance` |
| 2 | `scenario3.png` | authority | `/scenario03-police` |
| 3 | `scenario4.png` | fakeSeller | `/scenario04-shopping` |
| 4 | `scenario5.png` | fakeBuyer | `/scenario05-atm` |

One image per scenario. The table is not limited to that — each entry declares
its own `scenario`, so several images can point at the same one — but with one
apiece there is no spare: a target that stops matching is a scenario that
cannot be entered by camera at all, which is what the recognition test asserts
against.

The `id` on each entry happens to match its filename. Nothing resolves a route
from a filename or an id; the `scenario` field is the only thing that decides
where a match leads.

The same table is emitted next to the dataset as
`public/assets/shared/ar/image-targets.manifest.json`, so a deployed build can
be checked on site without the source tree.

### Adding or replacing a target

1. Put the PNG in `webapp/asset-sources/shared/ar/image-targets/`.
2. Add an entry to `IMAGE_TARGETS`. Appending is cheapest — existing indexes
   keep their meaning — but any edit is safe as long as step 3 runs.
3. `npm run build:image-targets`
4. `npm run test:ar-image-recognition`
5. Commit the regenerated `.mind` and `.manifest.json`.

If the dataset and the table ever disagree on target count, the page refuses to
start rather than offer a scenario on an index that may mean something else.

---

## 5. From a matched frame to an entered scenario

Three layers, each answering one question, and the split is the point: the
first is about *this frame*, the second about *this card*, the third about
*this player*.

### The sighting gate — is a target in view now?

The loop reports **every** confident match, for as long as the page keeps the
recogniser open:

```
open --offer(3)--> onTargetSeen(3)     many times a second while a card is held
     --offer(1)--> onTargetSeen(1)     the player swept to another card
     --lock()---->  closed, callback never runs again
```

`lock()` is the one absolute: it closes the gate without reporting anything,
which is what teardown uses so a match already in flight cannot land on an
unmounted page. It is checked *before* the callback runs, so a callback that
synchronously triggers more work cannot re-enter a closed gate.

### The target lock — which card is on offer?

A player holding a printed card in front of the glasses does not produce an
unbroken run of matches. A hand tremor, a head turn, a reflection off the
print, or the alternating zoom pass looking at the wrong scale all drop
frames, and a prompt driven straight off "matched this frame" would blink out
and back several times a second while the card never left the player's hand.

So `targetLock.js` holds the offer between sightings:

```
see(1) ─┬─ same target again  -> no change (the steady state)
        └─ different target   -> the offer is REPLACED; there is only ever one

expire(now) -> drops the offer once now - lastSeenAt >= TARGET_LOSS_TOLERANCE_MS
```

`TARGET_LOSS_TOLERANCE_MS` is 3.5 s, checked on a 500 ms interval, so an offer
outlives its last sighting by 3.5–4.0 s. Re-seeing the same card inside that
window refreshes it and nothing on screen moves. It is not a tracker: there is
no pose, no motion model and no per-frame history — the whole state is which
target, and when it was last seen.

### The page — did the player take it?

`ArScanHome` renders the offer (that scenario's opening line plus its CTA) and
navigates only from `enterSelectedScenario()`, which is both the CTA's
`onClick` and the `single` contract's RIGHT action — one function, not two
paths that agree. With no offer the screen is `display`: a RIGHT wave does
nothing, and in particular never falls back to the last card that was seen.

`isLeavingRef` closes the last race: a sighting, a wave or a tap arriving in
the same instant as another entry (including "choose manually") cannot start a
second navigation.

---

## 6. Frame preparation, and why it is shared

Every frame is:

1. drawn into a fixed 640×480 processing canvas, and
2. converted to grey and put through a 3×3 unsharp mask (amount 1.5).

Both steps live in `imageTargetFrame.js` and are applied **identically at
compile time and at runtime**. That is the whole reason the module exists: a
target compiled from one kind of pixels and a camera frame prepared another way
simply never match, with no error anywhere.

The sharpening pass was added for a previous set of targets — smooth
3D-rendered icons whose only strong gradients were their own silhouettes, where
it roughly doubled the feature points found and turned several from unmatchable
into reliable. The current five are detailed enough not to need it: measured
with and without, they match at every sampled pose either way. It is kept as
headroom for a soft or badly lit lens rather than as a necessity. The other side
of that trade — sharpening amplifies noise — is held by the empty-scene case in
the recognition test, which requires sensor noise to match nothing.

**Zoom passes.** Detection runs on a fixed 256×256 crop from the centre of the
frame, so a target that fills too much or too little of it is missed. Frames
alternate between whole-frame and 1.8× zoomed, which widens the working range of
apparent target sizes by roughly a third at the near end.

**Compile scale.** `COMPILE_SCALE` in `compile-image-targets.mjs` resizes the
sources before compiling, because MindAR builds its feature pyramid from the
size it is given. It was 3 for the previous, much smaller sources (94×93 to
205×170). The current sources are 249×355 to 300×443 and need no upscaling:
measured over 21 poses per target, scales 1, 2 and 3 all recognise 105/105 with
no misidentifications, so it is 1 — which is also 0.8 MB less dataset and 90 s
less compile time. Re-check it when the sources change; the recognition test is
what tells you.

---

## 7. What was tested, and how

### `npm run test:ar-image-recognition` (~1 min)

Runs the real detector, matcher, estimator, frame preparation and frame framing
— the same modules the browser runs — against the shipped `.mind`, on
synthesised photos of each target: a white card on a grey surface, rotated,
at five apparent sizes.

Result: **all 5 targets recognised at all 5 poses, 0 misidentifications.**
Empty scenes (bare surface, blank card, sensor noise) match nothing.

A wider sweep used for tuning — 21 poses per target, apparent size 0.14 to 0.85
of frame height, rotations 0/+14/−25° — also came back 105/105 with nothing
misidentified.

### `npm run test:ar-glasses-camera` (~1 min)

Two halves. **Which camera**: `getUserMedia` is never called for any shape of
the glasses descriptor — including a `streamUrl` that is missing, blank, the
wrong type, 404s or never delivers a frame, which are the cases a careless
fallback would turn into "the phone's camera opened on stage". Plus the other
direction (no descriptor → exactly one `getUserMedia` call, a `<video>`, the
same constraints as before), the cross-origin CORS decision, and the preview
being the same element frames are read from.

**The recognition POC**: the real detector, matcher, estimator, dataset and
`drawRecognitionFrame` reading through a frame source that is emphatically not
an `HTMLVideoElement` — scenario 1 first, then all five, then an empty frame
matching nothing.

### `npm run test:ar-scan-entry`

The wiring, without a camera: the lock (a repeated target and a second target
both report nothing), the shared camera (two consumers → one open; one
consumer releasing does not stop the other's; a failed open is not cached),
every target entering its own scenario, the manual Scenario Menu button, and
teardown stopping the recogniser.

It also pins **entry parity**: an AR entry and a Scenario Menu click leave the
scenario in the same run state, because both go through `prepareScenarioEntry()`
and there is no second initialisation path.

### Browser end-to-end (manual)

The built app, served over HTTP, driven in headless Chromium with a fake camera
fed from a generated Y4M — a second of empty desk, then the target card.

```bash
npm run build
node scripts/make-fake-camera-y4m.mjs /tmp/s1.y4m none:8 scenario1.png:22

# serve webapp/dist as /CIBAR/, then:
chromium --use-fake-ui-for-media-stream \
         --use-fake-device-for-media-stream \
         --use-file-for-fake-video-capture=/tmp/s1.y4m
```

Results, in a 412×915 portrait viewport, measured from arriving on `/ar-scan`.
Every row is **navigations = 0** until the player does something, and that is
the point of the table:

| Case | Feed | Offered after | Navigations before input | Then |
| --- | --- | --- | --- | --- |
| `scenario1` | card held | 2.31 s | 0 | RIGHT → `#/scenario01-investment` |
| `scenario2` | card held | 2.42 s | 0 | RIGHT → `#/scenario02-romance` |
| `scenario3` | card held | 2.36 s | 0 | RIGHT → `#/scenario03-police` |
| `scenario4` | card held | 2.45 s | 0 | RIGHT → `#/scenario04-shopping` |
| `scenario5` | card held | 2.35 s | 0 | **tap** on the CTA → `#/scenario05-atm` |
| left alone, 10 s | card held | — | **0** | the offer is still standing |
| a picture that is not a target, 15 s | scenery | never | 0 | still searching, no error shown |
| 2 s on / 2 s off, 12 s | wobble | 2.3 s | 0 | 75 samples, the CTA never blinked off |
| card, then gone | walk away | 2.08 s | 0 | offer dropped 3.5 s later, back to searching |
| RIGHT with nothing on offer | walk away | — | 0 | nothing happens — no fallback to the last card |
| sweep card 2 ⇄ card 4, 20 s | sweep | — | 0 | 110 samples, always exactly one CTA, always matching its headline |

Recognition speed is unchanged — a card is offered in about 2.3 s, the same as
the old flow took to navigate. What changed is that nothing follows from it
until the player waves or taps.

This is not a committed test — it needs a browser driver, which is not a
dependency here. `scripts/make-fake-camera-y4m.mjs` is committed so the
fixtures can be regenerated for a new dataset. Note that a *desktop*-sized
window is not a valid read of the layout: the scan screen sizes its type with
`clamp(…, Nvw, …)`, so a letterboxed page in a 1280 px window renders every
line several steps larger than a phone or the glasses ever will.

### Glasses camera end-to-end (manual)

The same idea for the glasses path, and it needs no glasses:
`scripts/serve-fake-jorjin-camera.mjs` serves the built app with a real
`window.__jorjinCamera` injected into `<head>` and a real
`multipart/x-mixed-replace` MJPEG stream at the URL it names — a few seconds
of empty desk, then the printed card.

```bash
npm run build
node scripts/serve-fake-jorjin-camera.mjs --target scenario1.png
# open http://localhost:5178/CIBAR/
```

Driven in headless Chromium with `navigator.mediaDevices.getUserMedia`
replaced by a tripwire that counts and throws, so "the phone camera never
started" is measured rather than assumed. Measured from arriving on
`/ar-scan`:

| Case | Frame element | Result | Time | `getUserMedia` calls |
| --- | --- | --- | --- | --- |
| `scenario1` (the POC) | `<img class="ar-camera-frame">` | `#/scenario01-investment` | 2.4 s | **0** |
| `scenario2` | `<img>` | `#/scenario02-romance` | 2.4 s | **0** |
| `scenario3` | `<img>` | `#/scenario03-police` | 2.4 s | **0** |
| `scenario4` | `<img>` | `#/scenario04-shopping` | 2.3 s | **0** |
| `scenario5` | `<img>` | `#/scenario05-atm` | 2.4 s | **0** |
| stream blocked mid-flight | none mounted | camera-error message + manual button | — | **0** |
| no `__jorjinCamera` (`vite preview` + a fake Y4M device) | `<video class="ar-camera-frame">` | `#/scenario01-investment` | — | 1 |

The camera picture also still fills the artwork's alpha cutout exactly — the
`.ar-scan-camera-box` and the mounted element measure the same rect — which is
what the host-element change had to not break.

### Still requires the glasses themselves

Everything above is a synthesised feed. None of it touches real optics —
motion blur, glare on a glossy print, the glasses' own lens and exposure — or
the real stream's latency and frame rate, or how the ar-app frames its stream
in practice. Those need the 佐臻 hardware: point the real glasses at the
scenario 1 card first, then the other four.

---

## 8. What did not change

`/scenario-menu` is untouched and still reachable from `/ar-scan`'s manual
button — it remains the debug, desktop-testing and camera-failure path. No
scenario content, outcome, analysis, quiz, gesture rule or colour changed, and
the source PNGs were not moved or edited.

The gesture layer was not touched either. `src/lib/arInteraction/` — the
contract, the bridge, the LEFT/RIGHT vocabulary, the DEV keyboard adapter — is
byte-identical: gestures come from the ToF depth sensor, not from this camera,
so nothing about changing which camera CIBAR opens reaches them. What did
change there is only the description: comments and docs that said image
recognition and gesture recognition share one RGB stream were wrong, and now
say what the hardware actually does.
