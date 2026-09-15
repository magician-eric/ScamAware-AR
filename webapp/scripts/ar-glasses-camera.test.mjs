// Which camera does CIBAR actually open, and can the recogniser read it?
//
// This is the test for the requirement that made the AR glasses work at all:
//
//   only the ar-app is open
//     -> the glasses' RGB camera
//     -> WebView showing CIBAR
//     -> cameraSource uses window.__jorjinCamera
//     -> the phone's camera never starts
//     -> point at the scenario 1 card
//     -> the existing MindAR recognition matches it
//
// Two halves, in that order:
//
//   1. SOURCE SELECTION - `getUserMediaCalls` stays empty for every shape of
//      the glasses descriptor, including the ones where the glasses stream is
//      broken. That last part is the whole point: on the glasses,
//      `getUserMedia` does not return the glasses' camera, it returns the
//      *phone's*, so a fallback there would light up exactly the lens that is
//      supposed to stay dark. The desktop fallback is checked from the other
//      side - no descriptor, one getUserMedia call.
//
//   2. THE POC - the real detector, matcher, estimator and frame preparation,
//      reading through the real MJPEG frame source, against the real shipped
//      dataset. Scenario 1 first, on its own, because that was the thing to
//      prove before anything else was worth doing; then all five, so the POC
//      is not a special case that only one card enjoys.
//
// What is faked and what is not: the *scope* is fake (scripts/stubs/
// fake-camera-scope.mjs stands in for `window`, since Node has no DOM and no
// glasses), and the frames are synthesised photos of the printed cards. The
// recognition core, the dataset and the code path from "a CanvasImageSource
// arrived" to "this is target N" are the real ones the browser runs.
//
// Run: npm run test:ar-glasses-camera
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from 'canvas';
import * as tf from '@tensorflow/tfjs';
import { CropDetector } from 'mind-ar/src/image-target/detector/crop-detector.js';
import { Matcher } from 'mind-ar/src/image-target/matching/matcher.js';
import { Estimator } from 'mind-ar/src/image-target/estimation/estimator.js';
import { CompilerBase } from 'mind-ar/src/image-target/compiler-base.js';
import 'mind-ar/src/image-target/detector/kernels/cpu/index.js';
import {
  __cameraSourceStateForTests,
  __resetCameraSourceForTests,
  CAMERA_FRAME_CLASS,
  GlassesCameraUnavailableError,
  acquireCameraSource,
  isGlassesCameraDeclared,
  mountCameraPreview,
  readGlassesCameraDescriptor,
} from '../src/lib/ar/cameraSource.js';
import {
  ZOOM_PASSES,
  drawRecognitionFrame,
  matchTargets,
} from '../src/lib/ar/imageRecognition.js';
import { PROCESSING_HEIGHT, PROCESSING_WIDTH, prepareMatcherPixels } from '../src/lib/ar/imageTargetFrame.js';
import { IMAGE_TARGETS, routeForTargetIndex, targetIndexById } from '../src/lib/ar/scenarioTargetMap.js';
import { createFakeCameraScope } from './stubs/fake-camera-scope.mjs';

// --- the descriptor the ar-app publishes -------------------------------------

const STREAM_URL = 'https://ericingptt.github.io/CIBAR/__jorjin-camera.mjpeg';
const GLASSES_WIDTH = 1280;
const GLASSES_HEIGHT = 960;

// Exactly the shape ar-app's claude/glasses-camera-stream-7xsp06 sets.
const JORJIN_CAMERA = Object.freeze({
  version: 1,
  available: true,
  streamUrl: STREAM_URL,
  width: GLASSES_WIDTH,
  height: GLASSES_HEIGHT,
});

function glassesScope(overrides = {}) {
  return createFakeCameraScope({
    jorjinCamera: { ...JORJIN_CAMERA, ...overrides.jorjinCamera },
    streams: { [STREAM_URL]: { width: GLASSES_WIDTH, height: GLASSES_HEIGHT }, ...overrides.streams },
    ...overrides.scope,
  });
}

// --- 1. source selection -----------------------------------------------------

test('available:true is what selects the glasses, and nothing else is', () => {
  assert.equal(readGlassesCameraDescriptor({ __jorjinCamera: JORJIN_CAMERA }), JORJIN_CAMERA);
  assert.equal(isGlassesCameraDeclared({ __jorjinCamera: JORJIN_CAMERA }), true);

  // Every shape that is not a live declaration is an ordinary browser. No
  // user-agent sniffing, no "looks like a WebView" guess.
  for (const [label, scope] of [
    ['no global at all', {}],
    ['available:false', { __jorjinCamera: { ...JORJIN_CAMERA, available: false } }],
    ['available missing', { __jorjinCamera: { version: 1, streamUrl: STREAM_URL } }],
    ['available is the string "true"', { __jorjinCamera: { ...JORJIN_CAMERA, available: 'true' } }],
    ['the global is not an object', { __jorjinCamera: 'yes' }],
  ]) {
    assert.equal(readGlassesCameraDescriptor(scope), null, label);
    assert.equal(isGlassesCameraDeclared(scope), false, label);
  }
});

test('on the glasses the stream is opened and getUserMedia is never called', async () => {
  __resetCameraSourceForTests();
  const fake = glassesScope();

  const camera = await acquireCameraSource('image-recognition', { scope: fake.scope });

  assert.deepEqual(fake.getUserMediaCalls, [], 'the phone camera was not touched');
  assert.equal(camera.source.kind, 'glasses');
  assert.equal(camera.source.streamUrl, STREAM_URL);
  assert.equal(__cameraSourceStateForTests().kind, 'glasses');

  const [img] = fake.elementsOfType('img');
  assert.ok(img, 'the glasses stream is carried by an <img>, which is a CanvasImageSource');
  assert.equal(img.src, STREAM_URL, 'the frame source points at streamUrl');
  assert.equal(img.className, CAMERA_FRAME_CLASS);
  assert.equal(fake.elementsOfType('video').length, 0, 'no <video> was created at all');

  assert.equal(camera.source.frameWidth, GLASSES_WIDTH);
  assert.equal(camera.source.frameHeight, GLASSES_HEIGHT);

  camera.release();
  assert.equal(img.src.startsWith('data:'), true, 'releasing closes the MJPEG connection');
  assert.equal(__cameraSourceStateForTests().isOpen, false);
});

test('a glasses stream that fails is a camera error, not a reason to open the phone', async () => {
  // The declaration is the commitment. Every one of these is a broken glasses
  // camera, and not one of them may reach getUserMedia: on the glasses that
  // call opens the phone's lens, which is the failure the whole design is
  // built to prevent. /ar-scan shows its manual fallback instead.
  const broken = [
    ['streamUrl missing', { jorjinCamera: { streamUrl: undefined } }],
    ['streamUrl empty', { jorjinCamera: { streamUrl: '   ' } }],
    ['streamUrl is not a string', { jorjinCamera: { streamUrl: 42 } }],
    ['the stream 404s', { streams: { [STREAM_URL]: null } }],
  ];

  for (const [label, overrides] of broken) {
    __resetCameraSourceForTests();
    const fake = glassesScope(overrides);
    await assert.rejects(
      () => acquireCameraSource('image-recognition', { scope: fake.scope }),
      GlassesCameraUnavailableError,
      label,
    );
    assert.deepEqual(fake.getUserMediaCalls, [], `${label}: fell back to the phone camera`);
    assert.equal(fake.elementsOfType('video').length, 0, `${label}: created a getUserMedia <video>`);
    assert.equal(__cameraSourceStateForTests().consumerCount, 0, `${label}: left a reference behind`);
  }
});

test('a stream that never delivers a frame times out instead of hanging forever', async () => {
  __resetCameraSourceForTests();
  // The URL is not in `streams`, so nothing ever loads and nothing ever
  // errors - an ar-app that advertises a camera it does not serve.
  const fake = createFakeCameraScope({ jorjinCamera: JORJIN_CAMERA, streams: {} });
  await assert.rejects(
    () => acquireCameraSource('image-recognition', { scope: fake.scope }),
    (error) => error instanceof GlassesCameraUnavailableError && /no frame arrived/.test(error.message),
  );
  assert.deepEqual(fake.getUserMediaCalls, []);
});

test('a newer descriptor version is still used', async () => {
  __resetCameraSourceForTests();
  const fake = glassesScope({ jorjinCamera: { version: 2 } });
  const camera = await acquireCameraSource('image-recognition', { scope: fake.scope });
  assert.equal(camera.source.kind, 'glasses', 'a version bump must not ground the glasses');
  assert.deepEqual(fake.getUserMediaCalls, []);
  camera.release();
});

test('a cross-origin stream is requested anonymously so the canvas is not tainted', async () => {
  __resetCameraSourceForTests();
  // A tainted canvas makes getImageData throw, which kills recognition with
  // no message pointing anywhere near the cause.
  const fake = glassesScope({ scope: { href: 'https://cibar.example/app/' } });
  const camera = await acquireCameraSource('image-recognition', { scope: fake.scope });
  assert.equal(fake.elementsOfType('img')[0].crossOrigin, 'anonymous');
  camera.release();

  __resetCameraSourceForTests();
  const sameOrigin = glassesScope();
  const second = await acquireCameraSource('image-recognition', { scope: sameOrigin.scope });
  assert.equal(
    sameOrigin.elementsOfType('img')[0].crossOrigin,
    undefined,
    'a same-origin stream must not demand CORS headers the ar-app does not send',
  );
  second.release();
});

test('with no descriptor the desktop getUserMedia fallback is unchanged', async () => {
  __resetCameraSourceForTests();
  const fake = createFakeCameraScope();

  const camera = await acquireCameraSource('image-recognition', { scope: fake.scope });

  assert.equal(camera.source.kind, 'user-media');
  assert.deepEqual(fake.getUserMediaCalls, [{ video: { facingMode: 'environment' }, audio: false }]);
  const [video] = fake.elementsOfType('video');
  assert.ok(video, 'Chrome still gets a <video> fed by a MediaStream');
  assert.equal(video.className, CAMERA_FRAME_CLASS);
  assert.equal(video.srcObject, camera.source.stream);
  assert.equal(fake.elementsOfType('img').length, 0);

  camera.release();
  assert.equal(fake.stoppedTracks.length, 1, 'the last release still stops the browser camera');
});

test('the preview shows the element frames are read from, whichever it is', async () => {
  for (const [label, fake] of [['glasses', glassesScope()], ['desktop', createFakeCameraScope()]]) {
    __resetCameraSourceForTests();
    const camera = await acquireCameraSource('image-recognition', { scope: fake.scope });
    const host = fake.host();

    mountCameraPreview(host, camera.source);
    assert.deepEqual(host.children, [camera.source.element], `${label}: the preview is the frame source`);

    // Mounting twice must not open a second connection or duplicate the node.
    mountCameraPreview(host, camera.source);
    assert.equal(host.children.length, 1, `${label}: mounting is idempotent`);
    camera.release();
  }
});

// --- 2. the POC: real recognition through the glasses frame source -----------

const url = (path) => new URL(`../${path}`, import.meta.url);
const sourceImage = (file) => fileURLToPath(url(`asset-sources/shared/ar/image-targets/${file}`));

// A frame the way the glasses' RGB camera would hand one over: the printed
// card on a surface, at the resolution __jorjinCamera declares.
async function glassesFrameOf(file, { fill = 0.38, rotate = -6 } = {}) {
  const image = await loadImage(sourceImage(file));
  const canvas = createCanvas(GLASSES_WIDTH, GLASSES_HEIGHT);
  const context = canvas.getContext('2d');
  context.fillStyle = '#d8d8d8';
  context.fillRect(0, 0, GLASSES_WIDTH, GLASSES_HEIGHT);

  const longest = GLASSES_HEIGHT * fill;
  const scale = longest / Math.max(image.width, image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  const margin = longest * 0.08;

  context.save();
  context.translate(GLASSES_WIDTH / 2, GLASSES_HEIGHT / 2);
  context.rotate((rotate * Math.PI) / 180);
  context.fillStyle = '#ffffff';
  context.fillRect(-width / 2 - margin, -height / 2 - margin, width + 2 * margin, height + 2 * margin);
  context.drawImage(image, -width / 2, -height / 2, width, height);
  context.restore();
  return canvas;
}

// The FrameSource contract, filled by something that is emphatically not an
// HTMLVideoElement: a node-canvas Canvas, whose size lives on `.width`. If
// the recognition core still reached for `videoWidth` this would read 0 and
// every assertion below would fail.
function frameSourceOf(canvas) {
  return { kind: 'glasses', element: canvas, get frameWidth() { return canvas.width; }, get frameHeight() { return canvas.height; } };
}

async function buildRecogniser() {
  const buffer = await readFile(url('public/assets/shared/ar/image-targets.mind'));
  const dataList = new CompilerBase().importData(buffer);
  const matchingDataList = dataList.map((entry) => entry.matchingData);
  const detector = new CropDetector(PROCESSING_WIDTH, PROCESSING_HEIGHT);
  const matcher = new Matcher(PROCESSING_WIDTH, PROCESSING_HEIGHT);
  const focal = (PROCESSING_HEIGHT / 2) / Math.tan((45 * Math.PI / 180) / 2);
  const estimator = new Estimator([[focal, 0, PROCESSING_WIDTH / 2], [0, focal, PROCESSING_HEIGHT / 2], [0, 0, 1]]);
  const targetIndexes = matchingDataList.map((_, index) => index);
  const canvas = createCanvas(PROCESSING_WIDTH, PROCESSING_HEIGHT);
  const context = canvas.getContext('2d');

  // One iteration of runRecognitionLoop(), minus the tf/gate plumbing: read
  // the frame source's own dimensions, draw through drawRecognitionFrame(),
  // prepare, detect, match.
  return function recognise(frameSource) {
    for (const zoom of ZOOM_PASSES) {
      drawRecognitionFrame(context, frameSource.element, frameSource.frameWidth, frameSource.frameHeight, zoom);
      const { data } = context.getImageData(0, 0, PROCESSING_WIDTH, PROCESSING_HEIGHT);
      const grey = prepareMatcherPixels(data, PROCESSING_WIDTH, PROCESSING_HEIGHT);
      const inputT = tf.tensor2d(grey, [PROCESSING_HEIGHT, PROCESSING_WIDTH]);
      let featurePoints;
      try {
        ({ featurePoints } = detector.detect(inputT));
      } finally {
        inputT.dispose();
      }
      const matched = matchTargets({ matcher, estimator, matchingDataList, targetIndexes, featurePoints });
      if (matched !== -1) return matched;
    }
    return -1;
  };
}

const recognisePromise = buildRecogniser();

test('POC: scenario 1 is recognised through the glasses frame source', async () => {
  const recognise = await recognisePromise;
  const index = targetIndexById('scenario1');
  assert.notEqual(index, -1, 'scenario1 is missing from IMAGE_TARGETS');

  const frame = frameSourceOf(await glassesFrameOf(IMAGE_TARGETS[index].file));
  const matched = recognise(frame);

  assert.equal(matched, index, 'the scenario 1 card was not recognised through the glasses path');
  assert.equal(routeForTargetIndex(matched), '/scenario01-investment');
});

test('and then all five, so the POC is not a one-card special case', async () => {
  const recognise = await recognisePromise;
  const failures = [];
  for (const [index, target] of IMAGE_TARGETS.entries()) {
    const matched = recognise(frameSourceOf(await glassesFrameOf(target.file)));
    if (matched !== index) failures.push(`${target.id} -> ${matched === -1 ? 'nothing' : IMAGE_TARGETS[matched].id}`);
  }
  assert.deepEqual(failures, [], `not recognised through the glasses path: ${failures.join(', ')}`);
});

test('an empty frame from the glasses still matches nothing', async () => {
  const recognise = await recognisePromise;
  const canvas = createCanvas(GLASSES_WIDTH, GLASSES_HEIGHT);
  const context = canvas.getContext('2d');
  context.fillStyle = '#d8d8d8';
  context.fillRect(0, 0, GLASSES_WIDTH, GLASSES_HEIGHT);
  assert.equal(recognise(frameSourceOf(canvas)), -1);
});
