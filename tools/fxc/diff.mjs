// Compares two frames from same.mjs: counts the pixels that differ, by how much.
// Usage: node diff.mjs <a-prefix> <b-prefix> [diff.png]
// The PNG shows each pixel's largest channel change, times 16.
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
const [A, B, outPng] = process.argv.slice(2);
const sa = JSON.parse(readFileSync(A + '.json')), sb = JSON.parse(readFileSync(B + '.json'));
if (sa.w !== sb.w || sa.h !== sb.h) throw new Error(`sizes differ: ${sa.w}x${sa.h} and ${sb.w}x${sb.h}`);
const a = readFileSync(A + '.raw'), b = readFileSync(B + '.raw');
const { w, h } = sa, n = w * h, d = new Uint8Array(n);
const over = [1, 2, 4, 8, 16, 32].map(t => [t, 0]);
let max = 0, sum = 0;
for (let i = 0; i < n; i++) {
  const m = Math.max(Math.abs(a[i * 4] - b[i * 4]), Math.abs(a[i * 4 + 1] - b[i * 4 + 1]), Math.abs(a[i * 4 + 2] - b[i * 4 + 2]));
  d[i] = m;
  max = Math.max(max, m);
  sum += m;
  for (const o of over) if (m > o[0]) o[1]++;
}
console.log(`${w}x${h} max ${max}/255, mean ${(sum / n).toFixed(4)}`);
for (const [t, c] of over) console.log(`  over ${t}/255: ${c} px (${(100 * c / n).toFixed(3)} %)`);
// The twelve largest changes, x and y from the top left.
const worst = [...d.keys()].filter(i => d[i] > 1).sort((p, q) => d[q] - d[p]).slice(0, 12);
for (const i of worst) console.log(`  x ${i % w} y ${h - 1 - Math.floor(i / w)}: ${d[i]}/255, rgb ${[...a.subarray(i * 4, i * 4 + 3)]} to ${[...b.subarray(i * 4, i * 4 + 3)]}`);
if (outPng) {
  // A grey PNG, top row first.
  const rows = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) rows[y * (w + 1) + 1 + x] = Math.min(255, d[(h - 1 - y) * w + x] * 16);
  const crcT = Array.from({ length: 256 }, (_, k) => { let c = k; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = buf => { let c = 0xffffffff; for (const v of buf) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const t = Buffer.concat([Buffer.from(type), data]), l = Buffer.alloc(4), c = Buffer.alloc(4); l.writeUInt32BE(data.length); c.writeUInt32BE(crc(t)); return Buffer.concat([l, t, c]); };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 0;
  writeFileSync(outPng, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]));
}
