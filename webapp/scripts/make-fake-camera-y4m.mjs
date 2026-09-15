// Builds a fake camera feed for the browser end-to-end check of /ar-scan.
//
// Chromium can take an uncompressed Y4M file as its camera:
//
//   node scripts/make-fake-camera-y4m.mjs /tmp/s1.y4m none:8 bitcoin.png:22
//   chromium --use-fake-ui-for-media-stream \
//            --use-fake-device-for-media-stream \
//            --use-file-for-fake-video-capture=/tmp/s1.y4m
//
// Each argument after the output path is `<source image>:<frame count>`, in
// order, where `none` is the bare surface with no target in it - so the example
// above is half a second of empty desk followed by a second and a half of the
// bitcoin card held up. Chromium loops the file, which is also what makes it a
// test of the offer: the target keeps coming back, and the app must keep
// offering exactly one scenario and enter none of them until the player waves
// or taps.
//
// Frames are drawn the same way scripts/ar-image-recognition.test.mjs draws
// its synthetic photos: the icon on a white card, on a grey surface, slightly
// rotated. See docs/ar-image-recognition.md section 7.
import { createCanvas, loadImage } from 'canvas';
import { openSync, writeSync, closeSync } from 'node:fs';
const out = process.argv[2];
const spec = process.argv.slice(3); // file:frames ... ('none' for empty desk)
const W = 640, H = 480, FPS = 15;
async function planes(file) {
  const c = createCanvas(W, H); const ctx = c.getContext('2d');
  ctx.fillStyle = '#d8d8d8'; ctx.fillRect(0, 0, W, H);
  if (file !== 'none') {
    const img = await loadImage(`./asset-sources/shared/ar/image-targets/${file}`);
    const longest = H * 0.40, s = longest / Math.max(img.width, img.height);
    const w = img.width * s, h = img.height * s, m = longest * 0.08;
    ctx.save(); ctx.translate(W/2, H/2); ctx.rotate(7 * Math.PI/180);
    ctx.fillStyle = '#fff'; ctx.fillRect(-w/2-m, -h/2-m, w+2*m, h+2*m);
    ctx.drawImage(img, -w/2, -h/2, w, h); ctx.restore();
  }
  const rgba = ctx.getImageData(0, 0, W, H).data;
  const cl = (n) => (n < 0 ? 0 : n > 255 ? 255 : Math.round(n));
  const y = Buffer.alloc(W*H), u = Buffer.alloc(W*H/4), v = Buffer.alloc(W*H/4);
  for (let i = 0; i < W*H; i++) { const o = i*4; y[i] = cl(0.299*rgba[o] + 0.587*rgba[o+1] + 0.114*rgba[o+2]); }
  for (let cy = 0; cy < H/2; cy++) for (let cx = 0; cx < W/2; cx++) {
    const o = ((cy*2)*W + cx*2)*4, r = rgba[o], g = rgba[o+1], b = rgba[o+2];
    u[cy*(W/2)+cx] = cl(-0.168736*r - 0.331264*g + 0.5*b + 128);
    v[cy*(W/2)+cx] = cl(0.5*r - 0.418688*g - 0.081312*b + 128);
  }
  return [y, u, v];
}
const fd = openSync(out, 'w');
writeSync(fd, `YUV4MPEG2 W${W} H${H} F${FPS}:1 Ip A1:1 C420jpeg\n`);
for (const part of spec) {
  const [file, n] = part.split(':');
  const p = await planes(file);
  for (let i = 0; i < Number(n); i++) { writeSync(fd, 'FRAME\n'); for (const pl of p) writeSync(fd, pl); }
}
closeSync(fd);
console.log('wrote', out);
