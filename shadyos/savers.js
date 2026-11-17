// Screensavers. Each draws on its own half-size canvas, frame after frame.
// "lineup" is not here: the windows themselves line up.
import { g, begin, use, lin, rad, txt, glyph, SANS } from './paint.js';

const S = 0.5;
export function makeSaver(kind, W, H, C, onCorner) {
  const c = document.createElement('canvas');
  begin(c, W, H, S);
  g.fillStyle = 'oklch(0 0 0)'; g.fillRect(0, 0, W, H);
  const step = SAVERS[kind] ? SAVERS[kind](W, H, C, onCorner) : null;
  return step && { canvas: c, step: dt => { use(c); g.setTransform(S, 0, 0, S, 0, 0); step(dt); } };
}

const SAVERS = {
  // Shaded tubes that grow on a grid and turn at right angles.
  pipes(W, H) {
    const cell = 34, cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
    let p = null, n = 0;
    const spawn = () => ({ x: (Math.random() * cols) | 0, y: (Math.random() * rows) | 0, d: (Math.random() * 4) | 0, hue: Math.random() * 360, left: 30 + Math.random() * 40 });
    const D = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    let acc = 0;
    return dt => {
      acc += dt;
      while (acc > 0.035) {
        acc -= 0.035;
        if (!p || p.left-- <= 0) { if (n++ > 9) { g.fillStyle = 'oklch(0 0 0 / 0.9)'; g.fillRect(0, 0, W, H); n = 0; } p = spawn(); }
        if (Math.random() < 0.25) p.d = (p.d + (Math.random() < 0.5 ? 1 : 3)) % 4;
        const [dx, dy] = D[p.d], x0 = (p.x + 0.5) * cell, y0 = (p.y + 0.5) * cell;
        p.x += dx; p.y += dy;
        if (p.x < 0 || p.y < 0 || p.x >= cols || p.y >= rows) { p = null; continue; }
        const x1 = (p.x + 0.5) * cell, y1 = (p.y + 0.5) * cell, r = 7;
        const grad = dx ? lin(0, y0 - r, 0, y0 + r, [[0, `oklch(0.35 0.12 ${p.hue})`], [0.35, `oklch(0.85 0.12 ${p.hue})`], [1, `oklch(0.25 0.1 ${p.hue})`]])
          : lin(x0 - r, 0, x0 + r, 0, [[0, `oklch(0.35 0.12 ${p.hue})`], [0.35, `oklch(0.85 0.12 ${p.hue})`], [1, `oklch(0.25 0.1 ${p.hue})`]]);
        g.fillStyle = grad; g.fillRect(Math.min(x0, x1) - (dy ? r : 0), Math.min(y0, y1) - (dx ? r : 0), Math.abs(x1 - x0) + (dy ? 2 * r : 0), Math.abs(y1 - y0) + (dx ? 2 * r : 0));
        g.fillStyle = rad(x1 - 3, y1 - 3, 1, r + 3, [[0, `oklch(0.95 0.08 ${p.hue})`], [1, `oklch(0.3 0.1 ${p.hue})`]]); g.beginPath(); g.arc(x1, y1, r + 2, 0, 7); g.fill();
      }
    };
  },
  // Stars rush out from the middle as streaks.
  stars(W, H) {
    const st = Array.from({ length: 260 }, () => ({ x: (Math.random() - 0.5) * W, y: (Math.random() - 0.5) * H, z: 0.2 + Math.random() * 0.8 }));
    const at = s => [W / 2 + s.x * 0.3 / s.z, H / 2 + s.y * 0.3 / s.z];
    return dt => {
      g.fillStyle = 'oklch(0 0 0 / 0.45)'; g.fillRect(0, 0, W, H);
      g.lineCap = 'round';
      for (const s of st) {
        const [x0, y0] = at(s);
        s.z -= dt * 0.32;
        if (s.z <= 0.04) { s.x = (Math.random() - 0.5) * W; s.y = (Math.random() - 0.5) * H; s.z = 1; continue; }
        const [x1, y1] = at(s), k = 1 - s.z;
        g.strokeStyle = `oklch(${0.7 + k * 0.3} ${0.05 + k * 0.05} ${220 + k * 60} / ${Math.min(1, k * 1.6)})`;
        g.lineWidth = 1 + k * 3.5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      }
    };
  },
  // The logo bounces; a perfect corner gets a cheer.
  bounce(W, H, C, onCorner) {
    const w = 150, h = 54, b = { x: W * 0.3, y: H * 0.3, vx: 120, vy: 90, hue: 280, hit: 0 };
    // Half the time both walls share one period, so a corner comes.
    if (Math.random() < 0.5) { const T = 3.5 + Math.random() * 2; b.x = 0; b.y = 0; b.vx = (W - w) / T; b.vy = (H - h) / T; }
    return dt => {
      g.fillStyle = 'oklch(0 0 0)'; g.fillRect(0, 0, W, H);
      b.x += b.vx * dt; b.y += b.vy * dt;
      let hx = false, hy = false;
      if (b.x < 0) { b.x = -b.x; b.vx = Math.abs(b.vx); hx = true; } else if (b.x > W - w) { b.x = 2 * (W - w) - b.x; b.vx = -Math.abs(b.vx); hx = true; }
      if (b.y < 0) { b.y = -b.y; b.vy = Math.abs(b.vy); hy = true; } else if (b.y > H - h) { b.y = 2 * (H - h) - b.y; b.vy = -Math.abs(b.vy); hy = true; }
      if (hx || hy) b.hue = (b.hue + 70) % 360;
      if (hx && hy) { b.hit = 2.5; onCorner?.(); }
      glyph('eye', b.x + 28, b.y + h / 2, 1.1);
      txt(C.saver_text?.bounce ?? 'SHADY', b.x + 56, b.y + h / 2 + 10, 28, `oklch(0.8 0.18 ${b.hue})`, { w: 900, font: SANS });
      if (b.hit > 0) { b.hit -= dt; txt(C.saver_text?.corner ?? 'CORNER!!', W / 2, H / 2, 64, `oklch(0.9 0.2 ${(b.hit * 400) % 360})`, { w: 900, align: 'center' }); }
    };
  },
  // Two four-sided shapes that bounce and leave trails.
  mystify(W, H) {
    const shapes = [0, 1].map(k => ({ hue: k ? 320 : 180, p: Array.from({ length: 4 }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.5) * 300 })) }));
    return dt => {
      g.fillStyle = 'oklch(0 0 0 / 0.12)'; g.fillRect(0, 0, W, H);
      for (const s of shapes) {
        s.hue = (s.hue + dt * 20) % 360;
        for (const q of s.p) { q.x += q.vx * dt; q.y += q.vy * dt; if (q.x < 0 || q.x > W) q.vx *= -1; if (q.y < 0 || q.y > H) q.vy *= -1; }
        g.strokeStyle = `oklch(0.8 0.18 ${s.hue})`; g.lineWidth = 2.5; g.beginPath();
        s.p.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.closePath(); g.stroke();
      }
    };
  },
  // Belgian waffles with little wings, flying down and left.
  waffles(W, H) {
    const fl = Array.from({ length: 14 }, () => ({ x: Math.random() * W * 1.4, y: Math.random() * H * 1.2 - H * 0.2, s: 0.7 + Math.random() * 0.6, ph: Math.random() * 6 }));
    return dt => {
      g.fillStyle = 'oklch(0.08 0.02 260)'; g.fillRect(0, 0, W, H);
      for (const f of fl) {
        f.x -= 90 * f.s * dt; f.y += 45 * f.s * dt; f.ph += dt * 9;
        if (f.x < -80 || f.y > H + 60) { f.x = W + Math.random() * 200; f.y = Math.random() * H * 0.8 - H * 0.3; }
        waffle(f.x, f.y, f.s, Math.sin(f.ph));
      }
    };
  },
};
function waffle(x, y, s, flap) {
  g.save(); g.translate(x, y); g.scale(s, s);
  // The wings flap behind the waffle.
  g.fillStyle = 'oklch(0.97 0.01 90 / 0.95)';
  for (const sx of [-1, 1]) { g.save(); g.scale(sx, 1); g.rotate(-0.5 + flap * 0.5); g.beginPath(); g.ellipse(26, -6, 22, 8, -0.3, 0, 7); g.fill(); g.restore(); }
  g.beginPath(); g.roundRect(-22, -15, 44, 30, 6);
  g.fillStyle = lin(0, -15, 0, 15, [[0, 'oklch(0.85 0.13 80)'], [1, 'oklch(0.62 0.13 60)']]); g.fill();
  g.fillStyle = 'oklch(0.52 0.12 55)';
  for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) g.fillRect(-19 + i * 8.2, -12 + j * 8.6, 5.5, 6);
  g.fillStyle = 'oklch(0.98 0.01 90 / 0.8)'; for (let k = 0; k < 6; k++) g.fillRect(-16 + k * 6.5, -14 + (k % 2) * 3, 2, 2);
  g.restore();
}
export const SAVER_KINDS = ['lineup', ...Object.keys(SAVERS)];
