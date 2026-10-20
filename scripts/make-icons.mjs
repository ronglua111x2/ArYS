// Generate the placeholder icon set (no dependencies): a "no entry" glyph on a rounded square.
//   extension/icons/icon-{16,32,48,128}.png   -> referenced by manifest.json
//   store/logo-300.png    -> store logo (Partner Center wants 1:1, 300x300 recommended)
// Replace the PNGs with real artwork any time; this script only exists so the repo is self-contained.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = fileURLToPath(new URL('..', import.meta.url));

const BG = [15, 118, 110]; // teal-700
const FG = [255, 255, 255];
const SS = 4; // supersampling per axis

/** Coverage (0..1) of the glyph at a point in the unit square. */
function glyph(x, y) {
  const cx = x - 0.5;
  const cy = y - 0.5;
  // Rounded-square background.
  const r = 0.2;
  const qx = Math.abs(cx) - (0.5 - r);
  const qy = Math.abs(cy) - (0.5 - r);
  const inBg = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) <= r;
  if (!inBg) return null;
  const d = Math.hypot(cx, cy);
  const ring = d <= 0.31 && d >= 0.2;
  // Slash from top-left to bottom-right, clipped to the ring's outer circle.
  const slash = d <= 0.31 && Math.abs(cx - cy) / Math.SQRT2 <= 0.05;
  return ring || slash;
}

function render(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let py = 0; py < size; py++) {
    raw[py * (size * 4 + 1)] = 0; // filter: none
    for (let px = 0; px < size; px++) {
      let fg = 0;
      let bg = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const v = glyph((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size);
          if (v === null) continue;
          bg++;
          if (v) fg++;
        }
      }
      const n = SS * SS;
      const alpha = bg / n;
      const mix = bg ? fg / bg : 0;
      const o = py * (size * 4 + 1) + 1 + px * 4;
      for (let c = 0; c < 3; c++) raw[o + c] = Math.round(BG[c] + (FG[c] - BG[c]) * mix);
      raw[o + 3] = Math.round(alpha * 255);
    }
  }
  return png(size, raw);
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const iconDir = join(root, 'extension', 'icons');
const assetDir = join(root, 'store');
mkdirSync(iconDir, { recursive: true });
mkdirSync(assetDir, { recursive: true });
for (const s of [16, 32, 48, 128]) writeFileSync(join(iconDir, `icon-${s}.png`), render(s));
writeFileSync(join(assetDir, 'logo-300.png'), render(300));
console.log('Wrote extension/icons/icon-{16,32,48,128}.png and store/logo-300.png');
