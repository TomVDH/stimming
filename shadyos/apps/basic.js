// Small apps: dialog, notes, properties, nfo, cpu gauge, bin.
import { g, rr, lin, rad, txt, fit, wrap, bead, glyph, MONO } from '../paint.js';
import { toolbar, status, rows, rowAt, button, hitButton } from './ui.js';

export const dialog = {
  glyph: 'orb', noZoom: true,
  size: () => [380, 132],
  paint(win, r) {
    g.fillStyle = lin(0, r.y, 0, r.y + r.h, [[0, 'oklch(0.96 0.012 88)'], [1, 'oklch(0.9 0.015 88)']]); g.fillRect(r.x, r.y, r.w, r.h);
    const gx = r.x + 34, gy = r.y + 36;
    g.fillStyle = rad(gx, gy + 6, 0, 22, [[0, 'oklch(0.92 0.14 85)'], [0.6, 'oklch(0.72 0.17 60)'], [1, 'oklch(0.45 0.14 40)']]);
    g.beginPath(); g.moveTo(gx, gy - 20); g.lineTo(gx + 20, gy + 16); g.lineTo(gx - 20, gy + 16); g.closePath(); g.fill();
    g.fillStyle = 'oklch(1 0 0 / 0.5)'; g.beginPath(); g.moveTo(gx, gy - 15); g.lineTo(gx + 8, gy); g.lineTo(gx - 8, gy); g.fill();
    txt('!', gx, gy + 12, 18, 'oklch(0.25 0.06 50)', { w: 800, align: 'center' });
    const o = win.opts;
    txt(fit(o.head, r.w - 80, 13.5, 700), r.x + 66, r.y + 30, 13.5, 'oklch(0.18 0.02 240)', { w: 700 });
    wrap(o.body, r.w - 80, 12.5).slice(0, 2).forEach((l, i) => txt(l, r.x + 66, r.y + 50 + i * 16, 12.5, 'oklch(0.35 0.02 240)'));
    button(win, 'yes', r.x + r.w - 92, r.y + r.h - 32, 80, 22, o.yes || 'OK', true);
    if (o.no) button(win, 'no', r.x + r.w - 182, r.y + r.h - 32, 80, 22, o.no);
  },
  tap(win, x, y, ctx) {
    const b = hitButton(win, x, y);
    if (b === 'yes') { win.opts.onYes ? win.opts.onYes() : ctx.closeDialog(win); return true; }
    if (b === 'no') { win.opts.onNo ? win.opts.onNo() : ctx.closeDialog(win); return true; }
  },
};

export const notes = {
  glyph: 'page',
  title: C => C.apps.notes.title,
  size: () => [300, 220],
  init(win, ctx) { const p = ctx.C.apps.notes.pages; win.lines = win.opts.lines || p[(ctx.counter('notes')) % p.length] || []; },
  paint(win, r) {
    g.fillStyle = 'oklch(0.94 0.04 95)'; g.fillRect(r.x, r.y, r.w, r.h);
    g.strokeStyle = 'oklch(0.75 0.05 230 / 0.35)'; g.lineWidth = 1;
    for (let ly = r.y + 30; ly < r.y + r.h; ly += 18) { g.beginPath(); g.moveTo(r.x, ly); g.lineTo(r.x + r.w, ly); g.stroke(); }
    g.fillStyle = 'oklch(0.7 0.15 25 / 0.4)'; g.fillRect(r.x + 30, r.y, 1, r.h);
    win.lines.forEach((l, i) => txt(fit(l, r.w - 50, 13, 500, MONO), r.x + 38, r.y + 26 + i * 18, 13, 'oklch(0.25 0.03 250)', { font: MONO }));
  },
};

export const properties = {
  glyph: 'computer', noZoom: true,
  title: () => 'System Properties',
  size: () => [360, 290],
  paint(win, r, ctx) {
    const C = ctx.C;
    g.fillStyle = lin(0, r.y, 0, r.y + r.h, [[0, 'oklch(0.97 0.01 88)'], [1, 'oklch(0.9 0.015 88)']]); g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle = rad(r.x + r.w / 2, r.y + 50, 4, 70, [[0, 'oklch(0.5 0.14 280 / 0.35)'], [1, 'oklch(0.5 0.14 280 / 0)']]); g.fillRect(r.x, r.y, r.w, 110);
    glyph('eye', r.x + r.w / 2, r.y + 44, 1.6);
    txt(C.os.name, r.x + r.w / 2, r.y + 88, 20, 'oklch(0.2 0.03 260)', { w: 800, align: 'center' });
    txt(fit(C.os.edition, r.w - 30, 12), r.x + r.w / 2, r.y + 106, 12, 'oklch(0.4 0.03 260)', { align: 'center' });
    (C.os.properties || []).slice(0, 7).forEach(([k, v], i) => {
      const y = r.y + 134 + i * 20;
      txt(k, r.x + 22, y, 12, 'oklch(0.45 0.02 240)', { w: 600 });
      txt(fit(v, r.w - 140, 12), r.x + 122, y, 12, 'oklch(0.2 0.02 240)');
    });
  },
};

export const nfo = {
  glyph: 'moth', skin: 'kid',
  title: C => C.apps.nfo.title,
  size: () => [390, 240],
  paint(win, r, ctx) {
    const F = { D: ['###.', '#..#', '#..#', '#..#', '###.'], 4: ['#..#', '#..#', '####', '...#', '...#'], R: ['###.', '#..#', '###.', '#.#.', '#..#'],
      K: ['#..#', '#.#.', '##..', '#.#.', '#..#'], M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'], 0: ['.##.', '#..#', '#.##', '##.#', '.##.'],
      T: ['#####', '..#..', '..#..', '..#..', '..#..'], H: ['#..#', '#..#', '####', '#..#', '#..#'] };
    const cs = Math.min(6, (r.w - 30) / 43);
    let bx = r.x + (r.w - 43 * cs) / 2;
    [...'D4RKM0TH'].forEach(ch => {
      F[ch].forEach((row, ry) => [...row].forEach((c, rx) => {
        if (c !== '#') return;
        g.fillStyle = `oklch(${0.86 - ry * 0.06} 0.15 ${200 - ry * 14})`; g.shadowColor = 'oklch(0.7 0.15 200 / 0.6)'; g.shadowBlur = 6;
        g.fillRect(bx + rx * cs, r.y + 14 + ry * cs, cs - 1, cs - 1);
      }));
      bx += (F[ch][0].length + 1) * cs;
    });
    g.shadowBlur = 0;
    const A = ctx.C.apps.nfo;
    A.lines.slice(0, 8).forEach((l, i) => txt(fit(l, r.w - 20, 11.5, 500, MONO), i ? r.x + 12 : r.x + r.w / 2, r.y + 14 + 5 * cs + 20 + i * 15, 11.5, i ? 'oklch(0.82 0.06 200)' : 'oklch(0.85 0.17 60)', { font: MONO, align: i ? 'left' : 'center' }));
    g.fillStyle = 'oklch(0.14 0.03 270)'; g.fillRect(r.x, r.y + r.h - 20, r.w, 20);
    // The ticker scrolls while the window is in front.
    txt(A.ticker + '   ' + A.ticker, r.x + 8 - (win.scroll || 0), r.y + r.h - 6, 11, 'oklch(0.85 0.17 330)', { font: MONO });
  },
  tick(win, dt, ctx) {
    if (!ctx.isTop(win) || ctx.reduce) return false;
    win.acc = (win.acc || 0) + dt;
    if (win.acc < 0.05) return true;
    win.acc = 0; win.scroll = ((win.scroll || 0) + 2.5) % (ctx.textW(ctx.C.apps.nfo.ticker + '   ', 11, 500, MONO));
    ctx.repaint(win);
    return true;
  },
};

export const gauge = {
  glyph: 'graph', skin: 'kid', noZoom: true,
  title: C => C.apps.gauge.title,
  size: () => [120, 120],
  paint(win, r, ctx) {
    const cx = r.x + r.w / 2, cy = r.y + r.h * 0.62, R = Math.min(r.w, r.h) * 0.42;
    g.fillStyle = rad(cx, cy, 0, R, [[0, 'oklch(0.3 0.04 240)'], [1, 'oklch(0.1 0.02 260)']]); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
    for (let i = 0; i <= 10; i++) { const a = Math.PI * (0.8 + i * 0.14); g.strokeStyle = i > 7 ? 'oklch(0.65 0.2 25)' : 'oklch(0.85 0.03 240)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx + Math.cos(a) * R * 0.78, cy + Math.sin(a) * R * 0.78); g.lineTo(cx + Math.cos(a) * R * 0.92, cy + Math.sin(a) * R * 0.92); g.stroke(); }
    const a = Math.PI * 2.2 + (win.jit || 0); g.strokeStyle = 'oklch(0.7 0.22 30)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R * 0.82, cy + Math.sin(a) * R * 0.82); g.stroke();
    bead(cx, cy, 4, [0.6, 0.05, 240]);
    txt(ctx.C.apps.gauge.load, cx, cy + R * 0.55, 10.5, 'oklch(0.85 0.17 60)', { w: 700, align: 'center', font: MONO });
    txt(ctx.C.apps.gauge.since, cx, r.y + 14, 9.5, 'oklch(0.7 0.03 240)', { align: 'center', font: MONO });
  },
  tick(win, dt, ctx) {
    if (ctx.reduce || !ctx.isTop(win)) return false;
    win.acc = (win.acc || 0) + dt;
    if (win.acc > 0.12) { win.acc = 0; win.jit = (Math.random() - 0.5) * 0.08; ctx.repaint(win); }
    return true;
  },
};

export const bin = {
  glyph: 'bin',
  title: C => C.apps.bin.title,
  size: () => [380, 250],
  paint(win, r, ctx) {
    const A = ctx.C.apps.bin;
    toolbar(r, 34);
    button(win, 'empty', r.x + 10, r.y + 6, 96, 22, A.empty_button);
    const all = [...A.items, ...ctx.binned.map(n => [n, 'Today'])];
    win.list = rows(r.x, r.y + 35, r.w, r.h - 55, all, win.sel ?? -1, ([n, d], i, ry) => {
      glyph('page', r.x + 14, ry + 9.5, 0.36);
      txt(fit(n, r.w * 0.6 - 30, 12), r.x + 28, ry + 13.5, 12, 'oklch(0.22 0.02 240)');
      txt(d, r.x + r.w * 0.66, ry + 13.5, 12, 'oklch(0.45 0.01 240)');
    });
    status(r, `${all.length} items`);
  },
  tap(win, x, y, ctx) {
    if (hitButton(win, x, y) === 'empty') { ctx.say(ctx.C.apps.bin.emptied); ctx.sound.crunch(); return true; }
    const i = rowAt(win.list, y);
    if (i >= 0) { win.sel = i; ctx.repaint(win); return true; }
  },
};
