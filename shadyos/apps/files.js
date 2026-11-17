// Files: the Basement browser. Folders and files come from content.yaml.
import { g, rr, lin, rad, txt, fit, glyph } from '../paint.js';
import { status, rows, rowAt } from './ui.js';
import { fill } from '../content.js';

function list(win, ctx) {
  const A = ctx.C.apps.files, f = A.folders[win.folder] || [];
  const out = f.map(e => (Array.isArray(e) ? e : [String(e), '']));
  // File creep lands in the start folder.
  if (win.folder === A.start) for (let k = 41; k <= ctx.untitled(); k++) out.push([fill(A.untitled, { n: k }), A.untitled_date]);
  return out;
}

export const files = {
  glyph: 'folder',
  title: C => C.apps.files.title,
  size: () => [600, 330],
  init(win, ctx) { win.folder = ctx.C.apps.files.start; win.sel = -1; },
  paint(win, r, ctx) {
    const A = ctx.C.apps.files, { x, y, w, h } = r;
    g.fillStyle = lin(0, y, 0, y + 34, [[0, 'oklch(0.93 0.01 90)'], [1, 'oklch(0.82 0.015 90)']]); g.fillRect(x, y, w, 34);
    g.fillStyle = 'oklch(0.6 0.01 240)'; g.fillRect(x, y + 34, w, 1);
    rr(x + 10, y + 7, 52, 20, 10); g.fillStyle = lin(0, y + 7, 0, y + 27, [[0, 'oklch(0.98 0 0)'], [1, 'oklch(0.84 0.01 90)']]); g.fill(); g.strokeStyle = 'oklch(0.55 0.01 240)'; g.lineWidth = 0.8; g.stroke();
    g.fillStyle = 'oklch(0.35 0.02 240)'; g.beginPath(); g.moveTo(x + 22, y + 17); g.lineTo(x + 29, y + 12); g.lineTo(x + 29, y + 22); g.fill(); g.beginPath(); g.moveTo(x + 50, y + 17); g.lineTo(x + 43, y + 12); g.lineTo(x + 43, y + 22); g.fill();
    txt(fit(win.folder, w * 0.4, 12.5, 700), x + 74, y + 21.5, 12.5, 'oklch(0.25 0.02 240)', { w: 700 });
    const sw2 = Math.min(138, w * 0.3);
    if (w > 320) { rr(x + w - sw2 - 12, y + 8, sw2, 19, 9.5); g.fillStyle = 'oklch(0.99 0.005 90)'; g.fill(); g.strokeStyle = 'oklch(0.6 0.01 240)'; g.stroke(); txt('Search', x + w - sw2, y + 21.5, 11, 'oklch(0.6 0.01 240)'); }
    const sw = Math.min(140, w * 0.3), names = Object.keys(A.folders);
    g.fillStyle = lin(x, 0, x + sw, 0, [[0, 'oklch(0.88 0.02 230)'], [1, 'oklch(0.85 0.025 230)']]); g.fillRect(x, y + 35, sw, h - 55);
    g.fillStyle = 'oklch(0.65 0.02 230)'; g.fillRect(x + sw, y + 35, 1, h - 55);
    txt('PLACES', x + 12, y + 54, 9.5, 'oklch(0.5 0.03 235)', { w: 700 });
    win.side = { x, y: y + 62, w: sw, n: names };
    names.slice(0, Math.floor((h - 90) / 21)).forEach((n, i) => {
      const ry = y + 62 + i * 21, on = n === win.folder;
      if (on) { rr(x + 3, ry + 0.5, sw - 6, 19, 3); g.fillStyle = lin(0, ry, 0, ry + 20, [[0, 'oklch(0.97 0.02 220)'], [0.9, 'oklch(0.86 0.05 225)'], [1, 'oklch(0.94 0.03 220)']]); g.fill(); g.strokeStyle = 'oklch(0.75 0.08 225)'; g.lineWidth = 1; g.stroke(); }
      g.fillStyle = rad(x + 19, ry + 9, 0, 6, [[0, 'oklch(0.9 0.06 85)'], [1, 'oklch(0.6 0.1 70)']]); rr(x + 13, ry + 4, 12, 11, 2); g.fill();
      txt(fit(n, sw - 40, 12, on ? 700 : 500), x + 32, ry + 14, 12, 'oklch(0.25 0.02 240)', { w: on ? 700 : 500 });
    });
    const lx = x + sw + 1, lw = w - sw - 1, all = list(win, ctx);
    g.fillStyle = lin(0, y + 35, 0, y + 53, [[0, 'oklch(0.97 0.005 90)'], [1, 'oklch(0.88 0.01 90)']]); g.fillRect(lx, y + 35, lw, 18);
    txt('Name', lx + 26, y + 48, 10.5, 'oklch(0.35 0.01 240)', { w: 600 }); txt('Modified', lx + lw * 0.62, y + 48, 10.5, 'oklch(0.35 0.01 240)', { w: 600 });
    // A long list shows its newest files.
    const sel = win.sel >= 0 ? win.sel : all.length - 1;
    win.list = rows(lx, y + 54, lw, h - 74, all, win.sel, ([n, d], i, ry) => {
      g.fillStyle = lin(0, ry + 4, 0, ry + 15, [[0, 'oklch(0.98 0.01 90)'], [1, 'oklch(0.85 0.02 85)']]); g.fillRect(lx + 9, ry + 3, 10, 13);
      g.strokeStyle = 'oklch(0.6 0.02 80)'; g.lineWidth = 0.6; g.strokeRect(lx + 9, ry + 3, 10, 13);
      txt(fit(n, lw * 0.62 - 32, 12), lx + 26, ry + 13.5, 12, 'oklch(0.22 0.02 240)'); txt(fit(d, lw * 0.38 - 8, 12), lx + lw * 0.62, ry + 13.5, 12, 'oklch(0.45 0.01 240)');
    }, 19, sel);
    status(r, fill(A.status, { n: all.length }));
  },
  tap(win, x, y, ctx) {
    const s = win.side;
    if (s && x < s.x + s.w && y >= s.y) {
      const i = Math.floor((y - s.y) / 21);
      if (s.n[i]) { win.folder = s.n[i]; win.sel = -1; ctx.repaint(win); ctx.sound.click(); return true; }
      return;
    }
    const i = rowAt(win.list, y);
    if (i < 0) return;
    const file = list(win, ctx)[i];
    // A second tap on the selected file opens it.
    if (win.sel === i && file?.[2]) ctx.act(file[2].startsWith?.('open:') ? file[2] : `say:${file[2]}`);
    win.sel = i; ctx.repaint(win); ctx.sound.click();
    return true;
  },
};
