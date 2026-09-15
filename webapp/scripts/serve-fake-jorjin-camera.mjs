// Drive the AR-glasses camera path in an ordinary browser.
//
// The glasses side of src/lib/ar/cameraSource.js is two things: a
// `window.__jorjinCamera` descriptor, and an MJPEG stream at the URL it
// names. Neither needs the glasses to exist - so this serves both, in front
// of the real built app, and the whole path from "the ar-app declared a
// camera" to "MindAR matched the scenario 1 card" can be watched in Chrome
// before anyone puts the hardware on.
//
// What this proves and what it does not: it exercises the real descriptor
// check, the real <img> frame source, the real cross-origin decision, the
// real recognition loop and the real dataset. It cannot say anything about
// the glasses' own optics, exposure or stream latency - only the hardware
// can - and it is not a substitute for the on-site run.
//
//   npm run build
//   node scripts/serve-fake-jorjin-camera.mjs --target scenario1.png
//   # open http://localhost:5178/ScamAware-AR/ , pick a language, watch /ar-scan
//
// getUserMedia is not involved at any point. Chrome will not even ask for
// camera permission, which is itself the thing being demonstrated: if the
// prompt appears, the glasses path was not taken.
//
// Options:
//   --target <file>   a PNG from asset-sources/shared/ar/image-targets/, or
//                     `none` for an empty desk. Default scenario1.png.
//   --port <n>        default 5178.
//   --root <dir>      what to serve. Default ./dist.
//   --fps <n>         default 12.
//   --delay <s>       seconds of empty desk before the card appears; default 2,
//                     so the recogniser is demonstrably running on frames that
//                     do not match before it sees one that does.
//   --size <WxH>      stream resolution. Default 1280x960.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from 'canvas';

const here = fileURLToPath(new URL('.', import.meta.url));

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

const TARGET = option('target', 'scenario1.png');
const PORT = Number(option('port', 5178));
const ROOT = resolve(here, '..', option('root', 'dist'));
const FPS = Number(option('fps', 12));
const DELAY_SECONDS = Number(option('delay', 2));
const [WIDTH, HEIGHT] = option('size', '1280x960').split('x').map(Number);

// Must match vite.config.js's `base`, because that is the path the built
// index.html's own asset URLs are written against.
const BASE = '/ScamAware-AR/';
const STREAM_PATH = `${BASE}__jorjin-camera.mjpeg`;
const BOUNDARY = 'jorjinframe';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mind': 'application/octet-stream',
  '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

// The descriptor, verbatim from ar-app's contract. Injected into <head> so it
// is set before the app's own scripts run - which is the same ordering the
// WebView gives it.
const DESCRIPTOR_SCRIPT = `<script>window.__jorjinCamera=${JSON.stringify({
  version: 1,
  available: true,
  streamUrl: STREAM_PATH,
  width: WIDTH,
  height: HEIGHT,
})};console.info('[fake-jorjin] __jorjinCamera declared', window.__jorjinCamera);</script>`;

async function targetFrames() {
  const empty = createCanvas(WIDTH, HEIGHT);
  const emptyContext = empty.getContext('2d');
  emptyContext.fillStyle = '#d8d8d8';
  emptyContext.fillRect(0, 0, WIDTH, HEIGHT);
  if (TARGET === 'none') return { empty, withTarget: null };

  const file = resolve(here, '..', 'asset-sources/shared/ar/image-targets', TARGET);
  if (!existsSync(file)) throw new Error(`no such target image: ${file}`);
  const image = await loadImage(file);

  const withTarget = createCanvas(WIDTH, HEIGHT);
  const context = withTarget.getContext('2d');
  context.drawImage(empty, 0, 0);
  // The same framing the offline recognition test measured as comfortably
  // inside the working range: a printed card held a little off-square.
  const longest = HEIGHT * 0.38;
  const scale = longest / Math.max(image.width, image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  const margin = longest * 0.08;
  context.save();
  context.translate(WIDTH / 2, HEIGHT / 2);
  context.rotate((-6 * Math.PI) / 180);
  context.fillStyle = '#ffffff';
  context.fillRect(-width / 2 - margin, -height / 2 - margin, width + 2 * margin, height + 2 * margin);
  context.drawImage(image, -width / 2, -height / 2, width, height);
  context.restore();
  return { empty, withTarget };
}

const frames = await targetFrames();

function streamCamera(response) {
  response.writeHead(200, {
    'Content-Type': `multipart/x-mixed-replace; boundary=${BOUNDARY}`,
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Connection: 'close',
    Pragma: 'no-cache',
  });

  const startedAt = Date.now();
  let closed = false;
  const timer = setInterval(() => {
    if (closed) return;
    const showTarget = frames.withTarget && (Date.now() - startedAt) / 1000 >= DELAY_SECONDS;
    const jpeg = (showTarget ? frames.withTarget : frames.empty).toBuffer('image/jpeg', { quality: 0.9 });
    response.write(`--${BOUNDARY}\r\nContent-Type: image/jpeg\r\nContent-Length: ${jpeg.length}\r\n\r\n`);
    response.write(jpeg);
    response.write('\r\n');
  }, Math.round(1000 / FPS));

  const stop = () => { closed = true; clearInterval(timer); };
  response.on('close', stop);
  response.on('error', stop);
}

async function serveFile(pathname, response) {
  // The path is normalised and then required to still be inside ROOT, so a
  // `..` in a request cannot read the rest of the machine.
  const relative = normalize(decodeURIComponent(pathname.slice(BASE.length))).replace(/^(\.\.[/\\])+/, '');
  let file = join(ROOT, relative);
  if (!file.startsWith(ROOT)) { response.writeHead(403).end('forbidden'); return; }
  // Anything that is not a real file - the base path itself, a directory, a
  // hash route the browser asked for directly - is the SPA's index.html.
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(ROOT, 'index.html');

  const body = await readFile(file);
  if (file.endsWith('index.html')) {
    const html = body.toString('utf8').replace('<head>', `<head>${DESCRIPTOR_SCRIPT}`);
    response.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' }).end(html);
    return;
  }
  response.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' }).end(body);
}

createServer((request, response) => {
  const { pathname } = new URL(request.url, `http://localhost:${PORT}`);
  if (pathname === STREAM_PATH) { streamCamera(response); return; }
  if (!pathname.startsWith(BASE)) { response.writeHead(302, { Location: BASE }).end(); return; }
  serveFile(pathname, response).catch((error) => {
    response.writeHead(500).end(String(error));
  });
}).listen(PORT, () => {
  if (!existsSync(ROOT)) console.warn(`[fake-jorjin] ${ROOT} does not exist - run "npm run build" first`);
  console.log(`[fake-jorjin] serving ${ROOT} on http://localhost:${PORT}${BASE}`);
  console.log(`[fake-jorjin] __jorjinCamera.streamUrl = ${STREAM_PATH} (${WIDTH}x${HEIGHT} @ ${FPS}fps)`);
  console.log(`[fake-jorjin] target: ${TARGET}${frames.withTarget ? ` after ${DELAY_SECONDS}s of empty desk` : ' (empty desk only)'}`);
});
