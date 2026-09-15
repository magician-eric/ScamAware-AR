// AR image recognition: "which of the 19 printed targets is the player
// looking at?" - and nothing else.
//
// It is a *consumer* of the shared camera (./cameraSource.js), not an owner
// of one: it takes a reference to whatever frame source that module opened -
// the AR glasses' MJPEG stream on the glasses, a getUserMedia <video> in a
// desktop browser - reads frames from it, and releases the reference when it
// is done. It never calls getUserMedia itself and never inspects which of the
// two it got: everything below works on a CanvasImageSource plus the pixel
// size of the frame currently in it, which is all `drawImage()` needs.
//
// Hand gestures are not part of this. LEFT/RIGHT come from the glasses' own
// ToF 8x8 depth sensor over the ar-app's native bridge, not from an RGB
// frame, and nothing in the gesture path (src/lib/arInteraction/) touches
// this camera. Image recognition is the RGB camera's only consumer.
//
// Engine: MindAR's image-target detector and matcher (mind-ar 1.2.x), driven
// directly rather than through its Controller. The Controller runs
// detect -> match -> *track*, and only reports a target after several
// consecutive successfully-tracked frames. Tracking needs texture these
// targets do not have (they are smooth 3D-rendered icons; several compile to
// single-digit tracking features), and we do not need it: nothing is drawn in
// AR space, there is no pose to hold, and the answer we want - which image is
// in view - is exactly what detect + match already produce. So this module
// runs that pair on its own frame loop and reports every confident match, for
// as long as the page keeps it open. The pose estimate is still computed, but
// only as a geometric sanity check on the match, not to render anything.
//
// "Which image is in view *now*" is the only question answered here. It is
// deliberately not "which scenario is the player entering": a match is an
// offer, taken by a wave or a tap on the scan page, and holding one offer
// steady across the gaps between matched frames belongs to ./targetLock.js.
//
// The detector reads a fixed-size square crop from the centre of each frame
// (256x256 at our processing size), so a target that fills too much or too
// little of the frame is missed. Rather than force the player to find one
// exact distance, each frame is drawn at one of ZOOM_PASSES in turn, which
// widens the working range to roughly a 3x span of apparent sizes - see
// docs/ar-image-recognition.md.
import { acquireCameraSource, CameraReleasedError, mountCameraPreview, unmountCameraPreview } from './cameraSource';
import { recordScanDiagnostic } from './scanDiagnostics';
import { PROCESSING_HEIGHT, PROCESSING_WIDTH, prepareMatcherPixels } from './imageTargetFrame';
import { IMAGE_TARGETS, IMAGE_TARGETS_DATASET_PATH, targetForIndex } from './scenarioTargetMap';

// Alternating whole-frame and zoomed-in passes. 1 sees a target held far
// enough back to fit the frame; 1.8 sees one held close. Measured coverage of
// both together: roughly 120-360px of apparent target size at the processing
// resolution, against ~160-360px for the plain pass alone.
export const ZOOM_PASSES = Object.freeze([1, 1.8]);

// Roughly a second of animation frames with nothing to draw. Long enough that
// a single dropped frame between two MJPEG parts is not reported as a stall,
// short enough that a tester watching the overlay sees it while the glasses
// are still on their head.
const STALLED_SOURCE_PASSES = 60;

const DATASET_URL = `${import.meta.env.BASE_URL}${IMAGE_TARGETS_DATASET_PATH}`;

// MindAR's own camera model, reused so the pose check behaves as its authors
// intended: 45-degree vertical field of view, principal point at the centre.
function projectionTransform(width, height) {
  const focal = (height / 2) / Math.tan((45 * Math.PI / 180) / 2);
  return [
    [focal, 0, width / 2],
    [0, focal, height / 2],
    [0, 0, 1],
  ];
}

/**
 * The sighting gate, on its own so it can be reasoned about and tested
 * without a camera.
 *
 * Recognising a target is not the same thing as entering its scenario: the
 * player is *offered* the scenario and takes it with a wave or a tap (see
 * ../../pages/arScan/ArScanHome.jsx). So the recogniser keeps answering the
 * only question it can answer - is a target in view *now* - for as long as the
 * page is up, and every accepted match is reported:
 *
 *   open --offer(3)--> onTargetSeen(3)      (many times a second, while held)
 *        --offer(1)--> onTargetSeen(1)      (the player swept to another card)
 *        --lock()---> closed, callback never runs again
 *
 * Holding one target steady across the gaps between those frames is the page's
 * job, not this one's - see ../ar/targetLock.js.
 *
 * The gate exists for the one thing that is still absolute: once `lock()` has
 * been called the callback can never run again. That is what teardown uses, so
 * a match already in flight cannot land on an unmounted page, and it is
 * checked *before* the callback runs so a callback that synchronously triggers
 * more work cannot re-enter a closed gate.
 */
export function createSightingGate(onTargetSeen) {
  let locked = false;
  return {
    get isLocked() {
      return locked;
    },
    // Closes the gate without reporting anything - used when the scanner is
    // torn down, so a match already in flight cannot land after unmount.
    lock() {
      locked = true;
    },
    offer(targetIndex) {
      if (locked) return false;
      if (!targetForIndex(targetIndex)) return false;
      onTargetSeen(targetIndex);
      return true;
    },
  };
}

/**
 * The source rectangle to sample from a camera frame: the largest region with
 * the processing aspect ratio, centred, divided by `zoom`. Exported so the
 * offline recognition test frames its synthetic camera images exactly the way
 * the browser frames real ones.
 *
 * Takes the frame's dimensions as plain numbers, not an element: the glasses
 * hand us an <img> whose size is `naturalWidth`, a desktop browser a <video>
 * whose size is `videoWidth`, and a test a canvas whose size is `width`.
 * Reading that property is the frame source's job (see ./cameraSource.js);
 * this function only does the geometry.
 */
export function computeSourceRect(frameWidth, frameHeight, zoom) {
  const aspect = PROCESSING_WIDTH / PROCESSING_HEIGHT;
  let width = frameWidth;
  let height = frameWidth / aspect;
  if (height > frameHeight) {
    height = frameHeight;
    width = frameHeight * aspect;
  }
  width /= zoom;
  height /= zoom;
  return { x: (frameWidth - width) / 2, y: (frameHeight - height) / 2, width, height };
}

/**
 * Draw one camera frame into the processing canvas, framed for `zoom`.
 *
 * This is the one place the engine touches pixels that came from outside, and
 * it is deliberately typed no more tightly than the DOM types it: `imageSource`
 * is any **CanvasImageSource** - an HTMLImageElement carrying the glasses'
 * MJPEG stream, an HTMLVideoElement carrying a getUserMedia stream, a
 * VideoFrame, an ImageBitmap, an OffscreenCanvas, or a node-canvas Canvas in
 * the offline test. Nothing here reads a video-only property, so no frame
 * source is privileged and none can be assumed.
 *
 * @param {CanvasRenderingContext2D} context - PROCESSING_WIDTH x PROCESSING_HEIGHT.
 * @param {CanvasImageSource} imageSource
 * @param {number} frameWidth - the frame's own pixel dimensions.
 * @param {number} frameHeight
 * @param {number} zoom - one of ZOOM_PASSES.
 */
export function drawRecognitionFrame(context, imageSource, frameWidth, frameHeight, zoom) {
  const rect = computeSourceRect(frameWidth, frameHeight, zoom);
  context.drawImage(
    imageSource,
    rect.x, rect.y, rect.width, rect.height,
    0, 0, PROCESSING_WIDTH, PROCESSING_HEIGHT,
  );
  return rect;
}

async function loadEngine() {
  // One dynamic import for the whole engine: MindAR and TensorFlow.js are
  // several megabytes, and only this page needs them, so they stay out of the
  // entry chunk and load while the camera permission prompt is up.
  const [tf, { CropDetector }, { Matcher }, { Estimator }, { CompilerBase }] = await Promise.all([
    import('@tensorflow/tfjs'),
    import('mind-ar/src/image-target/detector/crop-detector.js'),
    import('mind-ar/src/image-target/matching/matcher.js'),
    import('mind-ar/src/image-target/estimation/estimator.js'),
    // compiler-base, not compiler: all we want from it is importData(), and
    // the subclass drags MindAR's compile worker into the bundle with it.
    import('mind-ar/src/image-target/compiler-base.js'),
  ]);
  return { tf, CropDetector, Matcher, Estimator, CompilerBase };
}

async function loadDataset(CompilerBase) {
  const response = await fetch(DATASET_URL);
  if (!response.ok) {
    recordScanDiagnostic('dataset', 'fail', { url: DATASET_URL, status: response.status });
    throw new Error(`Could not load AR target dataset (${response.status})`);
  }
  const dataList = new CompilerBase().importData(await response.arrayBuffer());
  if (dataList.length !== IMAGE_TARGETS.length) {
    recordScanDiagnostic('dataset', 'fail', {
      url: DATASET_URL,
      targetsInDataset: dataList.length,
      targetsDeclared: IMAGE_TARGETS.length,
    });
    // The dataset and scenarioTargetMap.js disagree about how many targets
    // exist, which means every index in it may mean something else. Refusing
    // is the only safe answer: a mis-indexed match enters the wrong scenario.
    throw new Error(
      `AR target dataset has ${dataList.length} targets but scenarioTargetMap.js declares ${IMAGE_TARGETS.length} - re-run "npm run build:image-targets"`,
    );
  }
  recordScanDiagnostic('dataset', 'ok', { url: DATASET_URL, targets: dataList.length });
  return dataList;
}

function nextFrame() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 16);
  });
}

/**
 * Start recognising targets in the shared camera's frames.
 *
 * Resolves once the camera is live and the loop is running; `onTargetSeen` is
 * then called with the index of the matched target in IMAGE_TARGETS on every
 * frame that matches one - repeatedly for a card the player is holding still,
 * and with a different index the moment they sweep to another card. It is not
 * a one-shot "found it" callback: what the caller does with a run of sightings
 * (how long an offer survives a gap in them) is the caller's decision, and
 * ../ar/targetLock.js is where /ar-scan makes it.
 *
 * Rejects if the camera cannot be opened - permission denied or no camera in a
 * browser, a glasses stream the ar-app advertised but does not serve on the
 * glasses - and the caller shows its manual fallback for that.
 *
 * @param {HTMLElement} previewHost - the box on screen the camera picture is
 *   shown in. The frame source's element is mounted into it; that same
 *   element is what frames are read from, so there is one decode of the feed
 *   and not two. May be null when nothing is being shown.
 * @returns {Promise<{stop: () => void}>} stop() locks the gate and releases
 *   the camera reference. It never stops the camera directly - if a second
 *   consumer is holding it, it keeps running.
 */
export async function startImageRecognition(previewHost, { onTargetSeen }) {
  // Sightings arrive many times a second, and the diagnostics chain
  // (./scanDiagnostics.js) is explicitly not a per-frame log: it records one
  // line per state change so the whole chain stays readable in logcat. Which
  // target is on offer, and when it is dropped again, is the page's state to
  // report - see ArScanHome - so the loop stays silent here and the `match`
  // step's 'pending' below is the last thing this module says about it.
  const gate = createSightingGate(onTargetSeen);
  recordScanDiagnostic('imageRecognition', 'pending', { step: 'acquiring camera' });
  // The camera is acquired before anything else on purpose, and its failure is
  // reported as the camera's - `imageRecognition: fail` for a camera that
  // never opened would put the blame two layers past where the chain actually
  // broke, which is the exact confusion this diagnosis started from.
  const camera = await acquireCameraSource('image-recognition');

  let running = true;
  const handle = {
    stop() {
      if (!running) return;
      running = false;
      gate.lock();
      unmountCameraPreview(camera.source);
      camera.release();
    },
  };

  try {
    mountCameraPreview(previewHost, camera.source);
    const { tf, CropDetector, Matcher, Estimator, CompilerBase } = await loadEngine();
    const dataList = await loadDataset(CompilerBase);
    if (!running) return handle;

    const matchingDataList = dataList.map((entry) => entry.matchingData);
    const detector = new CropDetector(PROCESSING_WIDTH, PROCESSING_HEIGHT);
    const matcher = new Matcher(PROCESSING_WIDTH, PROCESSING_HEIGHT);
    const estimator = new Estimator(projectionTransform(PROCESSING_WIDTH, PROCESSING_HEIGHT));

    const canvas = document.createElement('canvas');
    canvas.width = PROCESSING_WIDTH;
    canvas.height = PROCESSING_HEIGHT;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    recordScanDiagnostic('imageRecognition', 'ok', {
      status: 'running',
      source: camera.source.kind,
      processing: `${PROCESSING_WIDTH}x${PROCESSING_HEIGHT}`,
      targets: matchingDataList.length,
    });
    recordScanDiagnostic('match', 'pending', { status: 'no match yet' });

    runRecognitionLoop({
      frameSource: camera.source, context, tf, detector, matcher, estimator, matchingDataList, gate,
      isRunning: () => running,
    }).catch((error) => {
      recordScanDiagnostic('imageRecognition', 'fail', { stage: 'loop', reason: error?.message ?? String(error) });
      console.warn('AR image recognition stopped:', error);
    });
  } catch (error) {
    handle.stop();
    if (error instanceof CameraReleasedError) return handle;
    recordScanDiagnostic('imageRecognition', 'fail', { stage: 'start', reason: error?.message ?? String(error) });
    throw error;
  }

  return handle;
}

/**
 * @param {object} args
 * @param {{element: CanvasImageSource, frameWidth: number, frameHeight: number}} args.frameSource
 *   Anything that can name its current frame and be drawn from - see
 *   ./cameraSource.js. `frameWidth`/`frameHeight` are read fresh every pass,
 *   because both sources can change resolution mid-stream (a glasses stream
 *   that reconnects at a different size, a <video> whose track renegotiates)
 *   and a cached size would silently mis-frame every subsequent crop.
 */
async function runRecognitionLoop({
  frameSource, context, tf, detector, matcher, estimator, matchingDataList, gate, isRunning,
}) {
  const targetIndexes = matchingDataList.map((_, index) => index);
  let pass = 0;
  // Two records at most, both about the same question: is the source still
  // handing over pixels? A stream that opens and then stops - the glasses'
  // camera released mid-session, the ar-app's encoder failing - otherwise
  // looks exactly like a target the player has not found yet.
  let drewAnyFrame = false;
  let emptyPasses = 0;
  // DEV logging only: which target the last line was about, so a card held in
  // front of the lens logs once instead of once per frame.
  let loggedIndex = -1;

  while (isRunning() && !gate.isLocked) {
    await nextFrame();
    if (!isRunning() || gate.isLocked) break;
    // No frame has been decoded yet, or the source dropped one. Nothing to
    // read, and drawing a zero-sized image would throw.
    const { frameWidth, frameHeight } = frameSource;
    if (!frameWidth || !frameHeight) {
      emptyPasses += 1;
      if (emptyPasses === STALLED_SOURCE_PASSES) {
        recordScanDiagnostic('firstFrame', 'fail', {
          reason: drewAnyFrame ? 'the source stopped producing frames' : 'the source has produced no frame',
          emptyPasses,
        });
      }
      continue;
    }
    emptyPasses = 0;
    if (!drewAnyFrame) {
      drewAnyFrame = true;
      recordScanDiagnostic('firstFrame', 'ok', { frameWidth, frameHeight, reading: 'recognition loop' });
    }

    const zoom = ZOOM_PASSES[pass % ZOOM_PASSES.length];
    pass += 1;

    drawRecognitionFrame(context, frameSource.element, frameWidth, frameHeight, zoom);
    const { data } = context.getImageData(0, 0, PROCESSING_WIDTH, PROCESSING_HEIGHT);
    const grey = prepareMatcherPixels(data, PROCESSING_WIDTH, PROCESSING_HEIGHT);

    const inputT = tf.tensor2d(grey, [PROCESSING_HEIGHT, PROCESSING_WIDTH]);
    let featurePoints;
    try {
      ({ featurePoints } = detector.detect(inputT));
    } finally {
      inputT.dispose();
    }

    const matchedIndex = matchTargets({ matcher, estimator, matchingDataList, targetIndexes, featurePoints });
    if (import.meta.env.DEV && matchedIndex !== loggedIndex) {
      loggedIndex = matchedIndex;
      if (matchedIndex !== -1) console.info('[ar] matched target', matchedIndex, targetForIndex(matchedIndex)?.id);
    }
    if (matchedIndex !== -1) gate.offer(matchedIndex);
  }
}

/**
 * One frame's worth of matching: the first target whose keyframe matches and
 * whose pose can be estimated wins. Extracted (and exported) so the offline
 * recognition test drives exactly the code the browser runs.
 */
export function matchTargets({ matcher, estimator, matchingDataList, targetIndexes, featurePoints }) {
  for (const index of targetIndexes) {
    const { keyframeIndex, screenCoords, worldCoords } = matcher.matchDetection(matchingDataList[index], featurePoints);
    if (keyframeIndex === -1) continue;
    // A keyframe match with no consistent pose is a coincidence of
    // descriptors, not a target in view - drop it rather than offer a
    // scenario on it.
    if (!estimator.estimate({ screenCoords, worldCoords })) continue;
    return index;
  }
  return -1;
}
