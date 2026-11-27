// Packs the visual6502 layout polygons into a compact binary for the Wafer hunt toy.
// Usage: node wafer/tools/pack.mjs [dir-with-segdefs]
// Source: github.com/trebonian/visual6502 (segdefs.js, chip-6800/segdefs.js).
// Format: u16 npoly, u16 ncontact, u16 w, u16 h, then varints (see unpack in index.html).
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..');
const SRC = {
  '6502': 'https://raw.githubusercontent.com/trebonian/visual6502/master/segdefs.js',
  '6800': 'https://raw.githubusercontent.com/trebonian/visual6502/master/chip-6800/segdefs.js',
};
const dir = process.argv[2];

async function load(id) {
  const cached = dir && join(dir, id === '6502' ? 'segdefs.js' : 'seg6800.js');
  const text = cached && existsSync(cached) ? readFileSync(cached, 'utf8') : await (await fetch(SRC[id])).text();
  return new Function(`${text.replace(/^var segdefs/m, 'const segdefs')}; return segdefs;`)();
}

const bytes = [];
const u = v => { v = Math.round(v); while (v >= 128) { bytes.push((v & 127) | 128); v = Math.floor(v / 128); } bytes.push(v); };
const z = v => u(v < 0 ? -2 * v - 1 : 2 * v);

// Drops repeated points and points on a straight run.
function clean(p) {
  let q = [];
  for (let i = 0; i < p.length; i += 2) if (!q.length || q[q.length - 2] !== p[i] || q[q.length - 1] !== p[i + 1]) q.push(p[i], p[i + 1]);
  if (q.length > 4 && q[0] === q[q.length - 2] && q[1] === q[q.length - 1]) q.length -= 2;
  for (let again = true; again;) {
    again = false;
    const n = q.length / 2, r = [];
    for (let i = 0; i < n; i++) {
      const a = (i + n - 1) % n, b = (i + 1) % n;
      const cr = (q[i * 2] - q[a * 2]) * (q[b * 2 + 1] - q[i * 2 + 1]) - (q[i * 2 + 1] - q[a * 2 + 1]) * (q[b * 2] - q[i * 2]);
      if (cr === 0 && n > 3) again = true; else r.push(q[i * 2], q[i * 2 + 1]);
    }
    q = r;
  }
  return q;
}

for (const id of ['6502', '6800']) {
  const segs = await load(id);
  let minx = 1e9, miny = 1e9, maxx = 0, maxy = 0;
  for (const d of segs) for (let i = 3; i < d.length; i += 2) {
    minx = Math.min(minx, d[i]); maxx = Math.max(maxx, d[i]); miny = Math.min(miny, d[i + 1]); maxy = Math.max(maxy, d[i + 1]);
  }
  // Shift to the origin; y flips so the layout reads as the project draws it.
  const polys = segs.map(d => {
    const p = [];
    for (let i = 3; i < d.length; i += 2) p.push(d[i] - minx, maxy - d[i + 1]);
    return { node: d[0], layer: d[2], p: clean(p) };
  }).filter(s => s.p.length >= 6);
  // Contacts: where a metal polygon and a lower polygon of the same node overlap.
  const bbox = s => { let a = 1e9, b = 1e9, c = 0, e = 0; for (let i = 0; i < s.p.length; i += 2) { a = Math.min(a, s.p[i]); c = Math.max(c, s.p[i]); b = Math.min(b, s.p[i + 1]); e = Math.max(e, s.p[i + 1]); } return [a, b, c, e]; };
  const byNode = new Map();
  for (const s of polys) { s.b = bbox(s); (byNode.get(s.node) ?? byNode.set(s.node, []).get(s.node)).push(s); }
  const contacts = [];
  for (const list of byNode.values()) {
    const metal = list.filter(s => s.layer === 0), low = list.filter(s => s.layer !== 0);
    for (const m of metal) for (const l of low) {
      const x0 = Math.max(m.b[0], l.b[0]), x1 = Math.min(m.b[2], l.b[2]), y0 = Math.max(m.b[1], l.b[1]), y1 = Math.min(m.b[3], l.b[3]);
      if (x1 - x0 >= 14 && y1 - y0 >= 14 && contacts.length < 60000) contacts.push([Math.round((x0 + x1) / 2), Math.round((y0 + y1) / 2)]);
    }
  }
  const w = maxx - minx, h = maxy - miny;
  bytes.length = 0;
  for (const v of [polys.length, contacts.length, w, h]) { bytes.push(v & 255, v >> 8); }
  const polyBytes = [];
  for (const s of polys) {
    bytes.push(s.layer);
    u(s.p.length / 2); u(s.p[0]); u(s.p[1]);
    for (let i = 2; i < s.p.length; i += 2) { z(s.p[i] - s.p[i - 2]); z(s.p[i + 1] - s.p[i - 1]); }
  }
  let px = 0, py = 0;
  for (const [x, y] of contacts) { z(x - px); z(y - py); px = x; py = y; }
  writeFileSync(join(out, `${id}.bin`), Uint8Array.from(bytes));
  console.log(id, 'polys', polys.length, 'contacts', contacts.length, 'size', w, h, 'bytes', bytes.length);

  // Report empty 90-unit cells, for placing a doodle.
  const C = 90, gx = Math.ceil(w / C), gy = Math.ceil(h / C), occ = new Uint8Array(gx * gy);
  for (const s of polys) for (let y = Math.floor(s.b[1] / C); y <= Math.min(gy - 1, Math.floor(s.b[3] / C)); y++) for (let x = Math.floor(s.b[0] / C); x <= Math.min(gx - 1, Math.floor(s.b[2] / C)); x++) occ[y * gx + x] = 1;
  const free = [];
  for (let y = 0; y < gy - 1; y++) for (let x = 0; x < gx - 1; x++) {
    let ok = true;
    for (let dy = -1; dy <= 2 && ok; dy++) for (let dx = -1; dx <= 2 && ok; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < gx && yy < gy && occ[yy * gx + xx]) ok = false; }
    if (ok) free.push([x * C + C, y * C + C]);
  }
  console.log(id, 'free spots (unit coords, y down)', free.slice(0, 12).map(f => f.join(',')).join(' | '), 'count', free.length);
}
