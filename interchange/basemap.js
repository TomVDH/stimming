// Interchange trails: the still map under the trails, drawn once in Canvas 2D.
// Dark fields, the decks in height order with their shadows, paint, lamp pools.

import { LANE_W } from './designs.js';

// A small seeded random, so the fields stay put.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * Draws the map for one network.
 * @param {HTMLCanvasElement} cv The target, at device pixels.
 * @param {object} net From buildNet.
 * @param {{cx:number, cy:number, s:number}} v The view, in device pixels: centre and pixels per metre.
 */
export function drawMap(cv, net, v) {
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const X = x => v.cx + x * v.s, Y = y => v.cy - y * v.s;
  const rand = rng(52);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#0b0d0c';
  ctx.fillRect(0, 0, W, H);

  // Fields: a loose patchwork of dark plots, a few with tree lines.
  const span = Math.max(W, H) / v.s / 2 + 60;
  const cell = 70;
  for (let gx = -span; gx < span; gx += cell) for (let gy = -span; gy < span; gy += cell) {
    const k = rand();
    const g = 10 + Math.floor(k * 7), r = g - 1 - Math.floor(rand() * 3), b = g - 3;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    const jx = (rand() - 0.5) * 18, jy = (rand() - 0.5) * 18;
    ctx.fillRect(X(gx + jx), Y(gy + cell + jy), cell * v.s + 1, cell * v.s + 1);
    if (rand() < 0.22) {
      // A hedge along one side of the plot: soft clumps, not a row of dots.
      ctx.fillStyle = 'rgba(3,5,4,0.55)';
      for (let q = 0; q < 14; q++) {
        if (rand() < 0.25) continue;
        ctx.beginPath();
        ctx.arc(X(gx + jx + q * cell / 14 + (rand() - 0.5) * 3), Y(gy + jy + (rand() - 0.5) * 3), (2 + rand() * 4) * v.s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Each link in short pieces, so a deck can pass over or under another.
  const pieces = [];
  for (const l of net.links) {
    const lane = l.kind === 'lane';
    const width = lane ? LANE_W + 0.25 : LANE_W + 1.6;
    for (let a = 0; a < l.n - 1; a += 10) {
      const b = Math.min(l.n - 1, a + 11);
      let z = 0;
      for (let q = a; q <= b; q++) z += l.z[q];
      pieces.push({ l, a, b, z: z / (b - a + 1), width, lane });
    }
  }
  pieces.sort((p, q) => p.z - q.z);
  const path = (p, off = 0) => {
    ctx.beginPath();
    const l = p.l;
    for (let q = p.a; q <= p.b; q++) {
      const j = Math.min(q, l.n - 2);
      const dx = l.xy[j * 2 + 2] - l.xy[j * 2], dy = l.xy[j * 2 + 3] - l.xy[j * 2 + 1], m = Math.hypot(dx, dy) || 1;
      // The offset runs to the driver's left for a positive off.
      const x = l.xy[q * 2] - dy / m * off, y = l.xy[q * 2 + 1] + dx / m * off;
      if (q === p.a) ctx.moveTo(X(x), Y(y)); else ctx.lineTo(X(x), Y(y));
    }
  };
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  const px = Math.max(1, v.s);
  // Bands of height: shadows first, then decks, then paint.
  const bands = new Map();
  for (const p of pieces) {
    const k = Math.round(p.z * 3);
    if (!bands.has(k)) bands.set(k, []);
    bands.get(k).push(p);
  }
  for (const k of [...bands.keys()].sort((a, b) => a - b)) {
    const list = bands.get(k);
    for (const p of list) {
      if (p.z < 0.12) continue;
      // The moon sits to the north-west: each deck throws its shadow south-east.
      const d = p.z * 5.5;
      ctx.save();
      ctx.translate(d * v.s, d * v.s);
      ctx.strokeStyle = `rgba(0,0,0,${Math.min(0.55, 0.25 + p.z * 0.12)})`;
      ctx.lineWidth = (p.width + 2) * v.s;
      path(p);
      ctx.stroke();
      ctx.restore();
    }
    for (const p of list) {
      // Higher decks catch more moonlight.
      const c = Math.round(30 + p.z * 5 + (p.lane ? 0 : 2));
      ctx.strokeStyle = `rgb(${c},${c + 1},${c + 4})`;
      ctx.lineWidth = p.width * v.s;
      path(p);
      ctx.stroke();
      if (p.lane && p.l.lane === 1) {
        // The hard shoulder beyond the outer lane.
        ctx.lineWidth = 2.6 * v.s;
        ctx.strokeStyle = `rgb(${c - 4},${c - 3},${c})`;
        path(p, -(LANE_W / 2 + 1.3));
        ctx.stroke();
      }
      if (p.lane && p.l.lane === 0) {
        // The median: a strip, then a concrete barrier.
        ctx.lineWidth = 2.2 * v.s;
        ctx.strokeStyle = `rgb(${c - 6},${c - 5},${c - 3})`;
        path(p, LANE_W / 2 + 1.1);
        ctx.stroke();
      }
    }
    for (const p of list) {
      const l = p.l, a = Math.min(0.9, 0.35 + v.s * 0.18);
      const line = (off, dash, alpha = a, w = 0.15) => {
        ctx.setLineDash(dash ? [3 * v.s, 9 * v.s] : []);
        ctx.lineDashOffset = -p.a * l.step * v.s;
        ctx.strokeStyle = `rgba(200,200,190,${alpha})`;
        ctx.lineWidth = Math.max(0.7, w * v.s);
        path(p, off);
        ctx.stroke();
      };
      const h = LANE_W / 2 - 0.15;
      if (p.lane) {
        if (l.lane === 0) { line(h, false); line(-h, true); line(LANE_W / 2 + 2.15, false, a * 0.7, 0.4); }
        else line(-h, false);
      } else { line(h + 0.6, false); line(-h - 0.6, false); }
      if (p.z > 0.25) {
        // Parapets on a bridge deck.
        const e = p.width / 2 + (p.lane ? (l.lane === 1 ? 2.6 : 0) : 0);
        ctx.setLineDash([]);
        ctx.strokeStyle = `rgba(120,122,128,${0.55})`;
        ctx.lineWidth = Math.max(0.8, 0.45 * v.s);
        if (!p.lane || l.lane === 1) { path(p, -e); ctx.stroke(); }
        if (!p.lane) { path(p, e); ctx.stroke(); }
      }
    }
  }
  ctx.setLineDash([]);

  // Lamp posts along the outer edge of each road, and their warm pools.
  ctx.globalCompositeOperation = 'lighter';
  const pool = 16 * v.s;
  for (const l of net.links) {
    if (l.kind !== 'lane' || l.lane !== 1) continue;
    const t0 = Math.ceil(l.t0 / 48) * 48;
    for (let t = t0; t < l.t1; t += 48) {
      const q = Math.round((t - l.t0) / l.step);
      if (q < 0 || q >= l.n - 1) continue;
      const dx = l.xy[q * 2 + 2] - l.xy[q * 2], dy = l.xy[q * 2 + 3] - l.xy[q * 2 + 1], m = Math.hypot(dx, dy) || 1;
      const x = X(l.xy[q * 2] + dy / m * 4.2), y = Y(l.xy[q * 2 + 1] - dx / m * 4.2);
      if (x < -pool || y < -pool || x > W + pool || y > H + pool) continue;
      const g = ctx.createRadialGradient(x, y, 0, x, y, pool);
      g.addColorStop(0, 'rgba(255,170,80,0.13)');
      g.addColorStop(0.4, 'rgba(255,150,60,0.05)');
      g.addColorStop(1, 'rgba(255,140,50,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - pool, y - pool, pool * 2, pool * 2);
      ctx.fillStyle = 'rgba(255,214,160,0.9)';
      ctx.fillRect(x - px * 0.6, y - px * 0.6, px * 1.2, px * 1.2);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}
