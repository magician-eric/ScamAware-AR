// Does the compiled dataset actually recognise the five printed targets, and
// does each one lead to its own scenario?
//
// This runs the real recogniser, not a model of it. The detector, the
// matcher, the pose estimator, the frame preparation and the frame framing
// are the exact modules src/lib/ar/imageRecognition.js uses in the browser,
// loaded against the exact dataset that ships in
// public/assets/shared/ar/image-targets.mind. The only thing replaced is the
// camera: instead of a MediaStream, each frame is a synthesised photo of one
// printed target - drawn onto a white card, on a grey surface, rotated,
// at a range of distances - rendered at a camera-like resolution and then
// framed through drawRecognitionFrame() the same way a real frame is.
//
// What that does and does not prove: it proves the dataset is indexed the way
// scenarioTargetMap.js says, that matching works end to end, and that no
// target is ever mistaken for one belonging to another scenario. It cannot
// prove anything about real optics - motion blur, glare on a glossy print,
// the AR glasses' own lens - which is what on-site testing is for.
//
// Run: npm run test:ar-image-recognition   (~1 minute; it does real work)
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
// Registers MindAR's detector kernels for the CPU backend. The browser gets
// the WebGL ones automatically (detector.js imports them); Node has no WebGL,
// so the CPU implementations of the same kernels stand in. Same algorithm,
// same feature points, just slower.
import 'mind-ar/src/image-target/detector/kernels/cpu/index.js';
import { IMAGE_TARGETS, SCENARIO_ROUTES, routeForTargetIndex } from '../src/lib/ar/scenarioTargetMap.js';
import { PROCESSING_HEIGHT, PROCESSING_WIDTH, prepareMatcherPixels } from '../src/lib/ar/imageTargetFrame.js';
import { ZOOM_PASSES, drawRecognitionFrame, matchTargets } from '../src/lib/ar/imageRecognition.js';

const url = (path) => new URL(`../${path}`, import.meta.url);
const sourceImage = (file) => fileURLToPath(url(`asset-sources/shared/ar/image-targets/${file}`));

// A camera frame is bigger than the size we process at; using a realistic
// capture resolution here means the frame framing is actually exercised.
const CAMERA_WIDTH = 1280;
const CAMERA_HEIGHT = 960;

// How large the target appears in the captured frame, as a fraction of the
// frame height, plus how far off-square the card is held. Together these are
// "someone holding a printed card up to the glasses at arm's length, then
// closer, then further away, never perfectly straight".
const POSES = [
  { fill: 0.20, rotate: 0 },
  { fill: 0.28, rotate: 9 },
  { fill: 0.38, rotate: -6 },
  { fill: 0.52, rotate: 12 },
  { fill: 0.68, rotate: -15 },
];

async function cameraFrameOf(file, { fill, rotate }) {
  const image = await loadImage(sourceImage(file));
  const canvas = createCanvas(CAMERA_WIDTH, CAMERA_HEIGHT);
  const context = canvas.getContext('2d');
  context.fillStyle = '#d8d8d8'; // the table the card is lying on
  context.fillRect(0, 0, CAMERA_WIDTH, CAMERA_HEIGHT);

  const longest = CAMERA_HEIGHT * fill;
  const scale = longest / Math.max(image.width, image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  const margin = longest * 0.08;

  context.save();
  context.translate(CAMERA_WIDTH / 2, CAMERA_HEIGHT / 2);
  context.rotate((rotate * Math.PI) / 180);
  context.fillStyle = '#ffffff'; // the card itself
  context.fillRect(-width / 2 - margin, -height / 2 - margin, width + 2 * margin, height + 2 * margin);
  context.drawImage(image, -width / 2, -height / 2, width, height);
  context.restore();
  return canvas;
}

// Exactly what imageRecognition.js's loop does per frame: frame the capture
// for this zoom pass, prepare the pixels, detect. `drawRecognitionFrame` is
// the browser's own function, called here on a node-canvas Canvas - which is
// the point of it taking a CanvasImageSource plus two numbers rather than an
// element it can interrogate. On the glasses the same call is handed an <img>
// carrying the MJPEG stream.
function featurePointsFor(frame, zoom, detector) {
  const canvas = createCanvas(PROCESSING_WIDTH, PROCESSING_HEIGHT);
  const context = canvas.getContext('2d');
  drawRecognitionFrame(context, frame, frame.width, frame.height, zoom);
  const { data } = context.getImageData(0, 0, PROCESSING_WIDTH, PROCESSING_HEIGHT);
  const grey = prepareMatcherPixels(data, PROCESSING_WIDTH, PROCESSING_HEIGHT);
  const inputT = tf.tensor2d(grey, [PROCESSING_HEIGHT, PROCESSING_WIDTH]);
  try {
    return detector.detect(inputT).featurePoints;
  } finally {
    inputT.dispose();
  }
}

async function buildRecogniser() {
  const buffer = await readFile(url('public/assets/shared/ar/image-targets.mind'));
  const dataList = new CompilerBase().importData(buffer);
  const matchingDataList = dataList.map((entry) => entry.matchingData);
  const detector = new CropDetector(PROCESSING_WIDTH, PROCESSING_HEIGHT);
  const matcher = new Matcher(PROCESSING_WIDTH, PROCESSING_HEIGHT);
  const focal = (PROCESSING_HEIGHT / 2) / Math.tan((45 * Math.PI / 180) / 2);
  const estimator = new Estimator([
    [focal, 0, PROCESSING_WIDTH / 2],
    [0, focal, PROCESSING_HEIGHT / 2],
    [0, 0, 1],
  ]);
  const targetIndexes = matchingDataList.map((_, index) => index);

  // One pose, scanned the way the running loop scans: alternating zoom passes
  // until one of them matches.
  return {
    dataList,
    recognise(frame) {
      for (const zoom of ZOOM_PASSES) {
        const featurePoints = featurePointsFor(frame, zoom, detector);
        const matched = matchTargets({ matcher, estimator, matchingDataList, targetIndexes, featurePoints });
        if (matched !== -1) return matched;
      }
      return -1;
    },
  };
}

const recogniserPromise = buildRecogniser();

// Scanned once, shared by every assertion below: each pose of each target is
// a couple of seconds of CPU work, and re-running them per test case would
// turn a one-minute test into a ten-minute one.
const resultsPromise = (async () => {
  const recogniser = await recogniserPromise;
  const rows = [];
  for (const [index, target] of IMAGE_TARGETS.entries()) {
    const matches = [];
    for (const pose of POSES) {
      const frame = await cameraFrameOf(target.file, pose);
      matches.push(recogniser.recognise(frame));
    }
    rows.push({ index, target, matches });
  }
  return rows;
})();

// Frames with no target in them at all. Sharpening the frame is what makes
// the smooth targets matchable (see imageTargetFrame.js), and sharpening also
// amplifies noise - so the other direction has to be pinned too: an empty
// desk, a noisy frame or a blank wall must recognise *nothing*. A false
// positive here would drop a player into a scam story at random.
const EMPTY_SCENES = [
  { name: 'plain grey surface', paint: (ctx) => { ctx.fillStyle = '#d8d8d8'; ctx.fillRect(0, 0, CAMERA_WIDTH, CAMERA_HEIGHT); } },
  { name: 'blank white card', paint: (ctx) => {
    ctx.fillStyle = '#d8d8d8'; ctx.fillRect(0, 0, CAMERA_WIDTH, CAMERA_HEIGHT);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(CAMERA_WIDTH / 2 - 220, CAMERA_HEIGHT / 2 - 160, 440, 320);
  } },
  { name: 'sensor noise', paint: (ctx) => {
    const image = ctx.createImageData(CAMERA_WIDTH, CAMERA_HEIGHT);
    // Deterministic pseudo-noise, so a failure here is reproducible.
    let seed = 12345;
    for (let i = 0; i < image.data.length; i += 4) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const value = 90 + (seed % 120);
      image.data[i] = image.data[i + 1] = image.data[i + 2] = value;
      image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
  } },
];

test('an empty scene matches no target', async () => {
  const recogniser = await recogniserPromise;
  for (const scene of EMPTY_SCENES) {
    const canvas = createCanvas(CAMERA_WIDTH, CAMERA_HEIGHT);
    scene.paint(canvas.getContext('2d'));
    const matched = recogniser.recognise(canvas);
    assert.equal(
      matched,
      -1,
      `${scene.name} was recognised as ${matched === -1 ? 'nothing' : IMAGE_TARGETS[matched].id}`,
    );
  }
});

test('the shipped dataset holds exactly the targets scenarioTargetMap.js declares', async () => {
  const { dataList } = await recogniserPromise;
  assert.equal(
    dataList.length,
    IMAGE_TARGETS.length,
    'dataset and target table disagree on target count - re-run npm run build:image-targets',
  );
});

test('no target is ever recognised as one belonging to another scenario', async () => {
  const rows = await resultsPromise;
  const confusions = [];
  for (const { index, target, matches } of rows) {
    for (const matched of matches) {
      if (matched === -1 || matched === index) continue;
      confusions.push(`${target.id} -> ${IMAGE_TARGETS[matched].id}`);
    }
  }
  // A miss costs the player a second of holding the card still. A confusion
  // drops them into the wrong scam story, which is the one failure that
  // cannot be recovered from on stage.
  assert.deepEqual(confusions, [], `targets recognised as the wrong image: ${confusions.join(', ')}`);
});

// Requirement: any one of a scenario's images enters that scenario. So each
// scenario is checked as a group, and every target that does recognise has to
// resolve to its own scenario's route.
for (const [scenario, route] of Object.entries(SCENARIO_ROUTES)) {
  test(`${scenario}: a recognised target enters ${route}`, async () => {
    const rows = (await resultsPromise).filter((row) => row.target.scenario === scenario);
    assert.ok(rows.length > 0, `no targets declared for ${scenario}`);

    const recognised = rows.filter((row) => row.matches.some((matched) => matched === row.index));
    const detail = rows
      .map((row) => `${row.target.id} ${row.matches.filter((m) => m === row.index).length}/${POSES.length}`)
      .join(', ');
    assert.ok(recognised.length > 0, `no image for ${scenario} was recognised at any pose (${detail})`);

    for (const row of rows) {
      for (const matched of row.matches) {
        if (matched === -1) continue;
        assert.equal(routeForTargetIndex(matched), route, `${row.target.id} routed outside ${scenario}`);
      }
    }
  });
}

test('every target is recognised at every pose', async () => {
  const rows = await resultsPromise;
  const incomplete = rows
    .filter((row) => row.matches.some((matched) => matched !== row.index))
    .map((row) => `${row.target.id} ${row.matches.filter((m) => m === row.index).length}/${POSES.length}`);

  // Every card, every sampled distance. Held at what was measured when this
  // set landed, so a regression in the dataset, the frame preparation or the
  // zoom passes fails here rather than on stage. With one image per scenario
  // there is no spare: a target that stops matching is a scenario that cannot
  // be entered by camera at all.
  assert.deepEqual(incomplete, [], `not recognised at every pose: ${incomplete.join(', ')}`);
});

test('recognition report', async () => {
  const rows = await resultsPromise;
  const lines = rows.map(({ index, target, matches }) => {
    const hits = matches.map((matched, i) => (matched === index ? `${POSES[i].fill}` : null)).filter(Boolean);
    return `  [${String(index).padStart(2)}] ${target.id.padEnd(11)} ${target.scenario.padEnd(11)} ${hits.length}/${POSES.length} poses${hits.length ? ` (fill ${hits.join(', ')})` : ''}`;
  });
  console.log(`\nrecognised poses per target (frame ${CAMERA_WIDTH}x${CAMERA_HEIGHT}, zoom passes ${ZOOM_PASSES.join('/')}):\n${lines.join('\n')}\n`);
});
