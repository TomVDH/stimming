// Shared bits for app clients: toolbars, lists, hit boxes.
import { g, rr, lin, txt, fit, pill, MONO } from '../paint.js';

// A grey toolbar strip with a gloss.
export function toolbar(r, h = 30) {
  g.fillStyle = lin(0, r.y, 0, r.y + h, [[0, 'oklch(0.95 0.01 90)'], [1, 'oklch(0.83 0.015 90)']]); g.fillRect(r.x, r.y, r.w, h);
  g.fillStyle = 'oklch(0.6 0.01 240)'; g.fillRect(r.x, r.y + h, r.w, 1);
}
// A status strip along the bottom.
export function status(r, text, h = 20) {
  g.fillStyle = lin(0, r.y + r.h - h, 0, r.y + r.h, [[0, 'oklch(0.88 0.01 90)'], [1, 'oklch(0.8 0.015 90)']]); g.fillRect(r.x, r.y + r.h - h, r.w, h);
  txt(fit(text, r.w - 16, 10.5), r.x + r.w / 2, r.y + r.h - 6, 10.5, 'oklch(0.4 0.01 240)', { align: 'center' });
}
// Striped rows; the selected one glows blue.
// The list scrolls so the focus row shows.
export function rows(x, y, w, h, items, sel, draw, rowH = 19, focus = sel) {
  const fit = Math.max(1, Math.floor(h / rowH)), off = Math.max(0, Math.min(items.length - fit, focus >= fit ? focus - fit + 1 : 0));
  items.slice(off, off + fit).forEach((it, k) => {
    const i = k + off, ry = y + k * rowH;
    g.fillStyle = i % 2 ? 'oklch(0.92 0.02 225 / 0.6)' : 'oklch(0.96 0.015 88)'; g.fillRect(x, ry, w, rowH);
    if (i === sel) { rr(x + 2, ry + 0.5, w - 4, rowH - 1, 3); g.fillStyle = lin(0, ry, 0, ry + rowH, [[0, 'oklch(0.97 0.02 220)'], [0.9, 'oklch(0.86 0.06 225)'], [1, 'oklch(0.95 0.03 220)']]); g.fill(); g.strokeStyle = 'oklch(0.75 0.09 225)'; g.lineWidth = 1; g.stroke(); }
    draw(it, i, ry);
  });
  return { off, rowH, y, n: Math.min(fit, items.length) };
}
// Which row a point falls in, or -1.
export function rowAt(list, py) { const k = Math.floor((py - list.y) / list.rowH); return k >= 0 && k < list.n ? k + list.off : -1; }
export const inBox = (b, x, y) => b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
// A pill button that remembers its box.
export function button(win, key, x, y, w, h, label, def = false) {
  pill(x, y, w, h, label, def, win.down === key);
  (win.boxes ||= {})[key] = { x, y, w, h };
}
export function hitButton(win, x, y) {
  for (const [k, b] of Object.entries(win.boxes || {})) if (inBox(b, x, y)) return k;
  return null;
}
// A dark text area for terminal-like apps.
export function screen(r, col = 'oklch(0.13 0.01 240)') { g.fillStyle = col; g.fillRect(r.x, r.y, r.w, r.h); }
export function mono(s, x, y, col = 'oklch(0.86 0.15 150)', size = 12.5) { txt(s, x, y, size, col, { font: MONO }); }
