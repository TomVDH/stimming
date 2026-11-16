// Full-screen moments: the boot, the blue crash, the grey curtain, the safe-to-turn-off screen.
// Each paints a W by H canvas; the renderer lays it over the desktop.
import { g, begin, lin, txt, wrap, glyph, MONO, SANS, clamp, smooth } from './paint.js';
import { fill } from './content.js';

// The boot: the eye-face, a three-block bar that slides, one line.
export function paintBoot(c, W, H, t, C, safe) {
  begin(c, W, H, 1);
  g.fillStyle = 'oklch(0.05 0.01 260)'; g.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H * 0.42, a = smooth(clamp(t / 0.5));
  g.globalAlpha = a;
  // The face: a rounded screen with one sleepy eye that opens.
  g.save(); g.translate(cx, cy);
  g.beginPath(); g.roundRect(-46, -40, 92, 72, 14);
  g.fillStyle = lin(0, -40, 0, 32, [[0, 'oklch(0.85 0.03 240)'], [1, 'oklch(0.55 0.04 250)']]); g.fill();
  g.beginPath(); g.roundRect(-36, -30, 72, 50, 8); g.fillStyle = 'oklch(0.2 0.06 270)'; g.fill();
  const open = smooth(clamp((t - 0.6) / 0.6));
  g.save(); g.scale(1, Math.max(0.06, open)); glyph('eye', 0, -5 / Math.max(0.06, open), 1.2); g.restore();
  g.strokeStyle = 'oklch(0.85 0.1 180)'; g.lineWidth = 2.4; g.lineCap = 'round';
  g.beginPath(); g.arc(0, 4, 10, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
  g.restore();
  txt(safe ? C.boot.safe_line : C.boot.line, cx, cy + 74, 14, 'oklch(0.85 0.02 240)', { align: 'center', w: 500 });
  // The bar: a groove, three blue blocks that slide through it.
  const bw = 150, bx = cx - bw / 2, by = cy + 94;
  g.beginPath(); g.roundRect(bx, by, bw, 14, 4); g.strokeStyle = 'oklch(0.55 0.02 240)'; g.lineWidth = 1.5; g.stroke();
  g.save(); g.beginPath(); g.roundRect(bx + 2, by + 2, bw - 4, 10, 3); g.clip();
  const p = ((t * 0.9) % 1.6) * (bw + 40) - 40;
  for (let i = 0; i < 3; i++) { g.fillStyle = lin(0, by, 0, by + 14, [[0, 'oklch(0.8 0.13 230)'], [1, 'oklch(0.5 0.17 250)']]); g.fillRect(bx + p + i * 11, by + 3, 8, 8); }
  g.restore();
  g.globalAlpha = 1;
}

// The blue crash. n is the percent complete.
export function paintCrash(c, W, H, n, C) {
  begin(c, W, H, 1);
  g.fillStyle = lin(0, 0, 0, H, [[0, 'oklch(0.48 0.17 255)'], [1, 'oklch(0.4 0.17 260)']]); g.fillRect(0, 0, W, H);
  const x = Math.max(24, W * 0.12), big = Math.min(120, W * 0.22), K = C.crash;
  let y = Math.max(80, H * 0.2);
  txt(K.face, x, y + big * 0.6, big, 'oklch(0.98 0 0)', { w: 400 });
  y += big * 0.9;
  wrap(K.head, W - x * 2, 24).forEach(l => { txt(l, x, y + 22, 24, 'oklch(0.98 0 0)', { w: 400 }); y += 32; });
  y += 10;
  (K.body || []).forEach(b => wrap(b, W - x * 2, 15).forEach(l => { txt(l, x, y + 16, 15, 'oklch(0.95 0.02 250)'); y += 22; }));
  y += 14;
  txt(fill(K.progress, { n }), x, y + 16, 15, 'oklch(0.95 0.02 250)');
  // A square of noise where a code would be.
  const q = Math.min(96, W * 0.18), qy = y + 36, m = 21, cell = q / m;
  if (qy + q < H - 20) {
    g.fillStyle = 'oklch(0.98 0 0)'; g.fillRect(x - 4, qy - 4, q + 8, q + 8);
    g.fillStyle = 'oklch(0.42 0.17 258)';
    let s = 333;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const finder = (i, j) => { g.fillRect(x + i * cell, qy + j * cell, 7 * cell, 7 * cell); g.fillStyle = 'oklch(0.98 0 0)'; g.fillRect(x + (i + 1) * cell, qy + (j + 1) * cell, 5 * cell, 5 * cell); g.fillStyle = 'oklch(0.42 0.17 258)'; g.fillRect(x + (i + 2) * cell, qy + (j + 2) * cell, 3 * cell, 3 * cell); };
    for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) {
      const corner = (i < 8 && j < 8) || (i > m - 9 && j < 8) || (i < 8 && j > m - 9);
      if (!corner && rnd() < 0.5) g.fillRect(x + i * cell, qy + j * cell, cell + 0.3, cell + 0.3);
    }
    finder(0, 0); finder(m - 7, 0); finder(0, m - 7);
  }
}

// The grey curtain: lines in many languages, a power ring in the middle.
export function paintPanic(c, W, H, drop, C) {
  begin(c, W, H, 1);
  const h = H * smooth(clamp(drop));
  g.fillStyle = 'oklch(0.08 0 0 / 0.84)'; g.fillRect(0, 0, W, h);
  if (drop < 0.95) return;
  const cx = W / 2, cy = H * 0.3;
  g.strokeStyle = 'oklch(0.92 0 0)'; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.arc(cx, cy, 30, -Math.PI * 0.32, Math.PI * 1.32); g.stroke();
  g.beginPath(); g.moveTo(cx, cy - 38); g.lineTo(cx, cy - 8); g.stroke();
  let y = cy + 70;
  (C.crash.panic || []).forEach(l => wrap(l, Math.min(560, W - 40), 15).forEach(s => { txt(s, cx, y, 15, 'oklch(0.92 0 0)', { align: 'center' }); y += 24; }));
}

// The end screen: orange words on black.
export function paintSafeOff(c, W, H, C) {
  begin(c, W, H, 1);
  g.fillStyle = 'oklch(0 0 0)'; g.fillRect(0, 0, W, H);
  let y = H / 2 - 10;
  wrap(C.crash.safe_off, Math.min(520, W - 40), 22, 700, MONO).forEach(l => { txt(l, W / 2, y, 22, 'oklch(0.75 0.16 60)', { align: 'center', font: MONO, w: 700 }); y += 30; });
}

// Safe mode: the words in four corners.
export function paintSafeMode(c, W, H, C, bar) {
  begin(c, W, H, 1);
  const s = C.crash.safe_mode, col = 'oklch(0.98 0 0)';
  txt(s, 10, bar + 20, 14, col, { font: SANS, w: 800 }); txt(s, W - 10, bar + 20, 14, col, { font: SANS, w: 800, align: 'right' });
  txt(s, 10, H - 70, 14, col, { font: SANS, w: 800 }); txt(s, W - 10, H - 70, 14, col, { font: SANS, w: 800, align: 'right' });
}
// Konami: up up down down left right left right b a.
export const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
