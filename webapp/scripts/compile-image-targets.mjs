// Builds the AR image-recognition dataset.
//
//   asset-sources/shared/ar/image-targets/*.png   (source images, never shipped)
//                    |
//                    |  this script, driven by src/lib/ar/scenarioTargetMap.js
//                    v
//   public/assets/shared/ar/image-targets.mind    (compiled dataset, shipped)
//   public/assets/shared/ar/image-targets.manifest.json
//
// Run it with `npm run build:image-targets` after adding, removing or
// replacing a target in IMAGE_TARGETS. It is deliberately not part of `npm
// run build`: compiling takes about a minute, the inputs change rarely, and
// the output is committed so that a deploy never depends on this toolchain.
//
// The ordering is not decided here. This script walks IMAGE_TARGETS in the
// order that file declares and compiles each entry into that position, which
// is what makes "the index the matcher reports" and "the scenario the player
// gets" the same question - see the comment at the top of scenarioTargetMap.js.
//
// Two properties of the output are worth knowing:
//
//   - Targets are compiled from the *same* pixels the camera path produces:
//     flattened onto white (the PNGs have transparent backgrounds), converted
//     to grey and sharpened by src/lib/ar/imageTargetFrame.js. Compiling raw
//     pixels while matching sharpened ones is the kind of mismatch that shows
//     up as "recognition just doesn't work", with nothing in any log.
//   - COMPILE_SCALE resizes the sources before compiling. MindAR builds its
//     feature pyramid from the size it is given, so a target much smaller than
//     it will ever appear on camera needs upscaling to have levels at the top
//     of that range. The current sources do not - see the constant below.
import { createCanvas, loadImage } from 'canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OfflineCompiler } from 'mind-ar/src/image-target/offline-compiler.js';
import { IMAGE_TARGETS, IMAGE_TARGETS_DATASET_PATH, SCENARIO_ROUTES } from '../src/lib/ar/scenarioTargetMap.js';
import { SHARPEN_AMOUNT, prepareMatcherPixels } from '../src/lib/ar/imageTargetFrame.js';

const webapp = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = resolve(webapp, 'asset-sources/shared/ar/image-targets');
const OUTPUT_FILE = resolve(webapp, 'public', IMAGE_TARGETS_DATASET_PATH);
const MANIFEST_FILE = OUTPUT_FILE.replace(/\.mind$/, '.manifest.json');

// 1 = compile the sources at their own size.
//
// This was 3 for the previous target set, whose images were 94x93 to 205x170 -
// smaller than they ever appear inside the 256x256 detection crop, so they had
// to be upscaled to give the pyramid levels at that size. The current sources
// are 249x355 to 1359x1157 and need none of that. Measured over 21 poses per
// target (apparent size 0.14 to 0.85 of frame height, rotations 0/+14/-25):
// scales 1, 2 and 3 all recognise 105/105 with no misidentifications, so the
// larger ones buy nothing and cost 0.8MB of download and 90s of compile time.
//
// The spread is wider than it looks: scenario3.png is the artwork as it was
// supplied, several times the size of the other four. Compiled at its own
// size it also sweeps 105/105 with nothing misidentified, so it is left
// alone; downscaling it to 400x341 measures identically and only trades
// 0.16MB of dataset for a derived file nobody asked for.
//
// Re-check this when the sources change. A set of small images needs it back
// above 1; the recognition test is what tells you.
const COMPILE_SCALE = 1;

async function loadTargetCanvas(file) {
  const image = await loadImage(resolve(SOURCE_DIR, file));
  const width = Math.round(image.width * COMPILE_SCALE);
  const height = Math.round(image.height * COMPILE_SCALE);
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');

  // White, not transparent: these render as icons on white in every place
  // they are used, and a transparent background would compile as black and
  // invert every edge gradient the matcher keys on.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  // Apply the runtime's own preparation, then write the result back as a
  // neutral grey image. The compiler averages R, G and B to get its grey, so
  // writing the same value into all three channels round-trips exactly.
  const pixels = context.getImageData(0, 0, width, height);
  const grey = prepareMatcherPixels(pixels.data, width, height);
  for (let i = 0; i < grey.length; i++) {
    const offset = i * 4;
    pixels.data[offset] = grey[i];
    pixels.data[offset + 1] = grey[i];
    pixels.data[offset + 2] = grey[i];
    pixels.data[offset + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
}

async function main() {
  console.log(`Compiling ${IMAGE_TARGETS.length} AR image targets from ${SOURCE_DIR}`);
  const canvases = [];
  for (const [index, target] of IMAGE_TARGETS.entries()) {
    const canvas = await loadTargetCanvas(target.file);
    console.log(`  [${index}] ${target.file} -> ${canvas.width}x${canvas.height} (${target.scenario})`);
    canvases.push(canvas);
  }

  const startedAt = Date.now();
  let lastReported = -10;
  const compiler = new OfflineCompiler();
  await compiler.compileImageTargets(canvases, (percent) => {
    if (percent - lastReported < 10) return;
    lastReported = percent;
    console.log(`  ${Math.round(percent)}%`);
  });
  // Drop the tracking features before export. MindAR's format carries two
  // things per target: matching data (used to answer "which target is this?")
  // and tracking data (used to hold a pose across frames once one is found).
  // Nothing here tracks - see the header of src/lib/ar/imageRecognition.js for
  // why - and tracking data is 1.8MB of the 3.1MB it would otherwise be, on a
  // file the AR scan page has to download before it can recognise anything.
  // This makes the output a detection-only dataset; regenerating it with this
  // line removed is all it takes to get a tracking-capable one back.
  for (const entry of compiler.data) entry.trackingData = [];
  const buffer = Buffer.from(compiler.exportData());

  // The export path is long enough to be worth checking rather than trusting:
  // an empty matchingData would compile, ship, and simply never recognise.
  const reimported = new OfflineCompiler().importData(buffer);
  if (reimported.length !== IMAGE_TARGETS.length || reimported.some((entry) => !entry.matchingData?.length)) {
    throw new Error('compiled dataset did not round-trip - matching data is missing');
  }

  await mkdir(dirname(OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, buffer);
  await writeFile(MANIFEST_FILE, `${JSON.stringify({
    // A record of what index means what, next to the dataset it describes -
    // so the deployed dataset can be checked on site without the source tree.
    // scenarioTargetMap.js remains the source of truth; this is generated.
    generatedBy: 'npm run build:image-targets',
    compileScale: COMPILE_SCALE,
    sharpenAmount: SHARPEN_AMOUNT,
    targets: IMAGE_TARGETS.map((target, index) => ({
      targetIndex: index,
      id: target.id,
      file: target.file,
      scenario: target.scenario,
      route: SCENARIO_ROUTES[target.scenario],
    })),
  }, null, 2)}\n`);

  console.log(`Wrote ${OUTPUT_FILE} (${(buffer.length / 1024 / 1024).toFixed(2)}MB) in ${Math.round((Date.now() - startedAt) / 1000)}s`);
}

await main();
