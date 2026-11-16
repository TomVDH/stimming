// System apps: Control Panel, Task Manager and the media player.
import { g, rr, lin, rad, txt, fit, glyph, MONO } from '../paint.js';
import { toolbar, status, rows, rowAt, button, hitButton, screen } from './ui.js';
import { fill } from '../content.js';

export const control = {
  glyph: 'gear', noZoom: true,
  title: C => C.apps.control.title,
  size: () => [400, 300],
  init(win) { win.vals = {}; },
  paint(win, r, ctx) {
    g.fillStyle = lin(0, r.y, 0, r.y + r.h, [[0, 'oklch(0.96 0.01 88)'], [1, 'oklch(0.91 0.015 88)']]); g.fillRect(r.x, r.y, r.w, r.h);
    win.boxes = {};
    (ctx.C.apps.control.rows || []).slice(0, 8).forEach(([label, kind, extra], i) => {
      const y = r.y + 14 + i * 40, cx = r.x + r.w - 170;
      glyph('gear', r.x + 22, y + 13, 0.38);
      txt(fit(label, r.w - 220, 12.5, 600), r.x + 40, y + 17.5, 12.5, 'oklch(0.22 0.02 240)', { w: 600 });
      if (kind === 'toggle') {
        const opts = String(extra || 'On / Off').split('/').map(s => s.trim()), on = win.vals[i] || 0;
        opts.slice(0, 2).forEach((o, k) => {
          const x = cx + k * 78;
          rr(x, y + 3, 76, 21, k ? [0, 10, 10, 0] : [10, 0, 0, 10]);
          g.fillStyle = k === on ? lin(0, y, 0, y + 24, [[0, 'oklch(0.78 0.11 230)'], [1, 'oklch(0.58 0.15 242)']]) : lin(0, y, 0, y + 24, [[0, 'oklch(0.98 0 0)'], [1, 'oklch(0.86 0.01 240)']]);
          g.fill(); g.strokeStyle = 'oklch(0.5 0.03 240)'; g.lineWidth = 1; g.stroke();
          txt(fit(o, 70, 11.5), x + 38, y + 17.5, 11.5, k === on ? 'oklch(0.99 0 0)' : 'oklch(0.25 0.02 240)', { align: 'center', w: 600 });
          win.boxes[`t${i}:${k}`] = { x, y: y + 3, w: 76, h: 21 };
        });
      } else if (kind === 'slider' || kind === 'age') {
        const v = kind === 'age' ? ctx.age() : (win.vals[i] ?? 0.5), x0 = cx, w = 150;
        rr(x0, y + 11, w, 5, 2.5); g.fillStyle = 'oklch(0.75 0.02 240)'; g.fill();
        rr(x0, y + 11, w * v, 5, 2.5); g.fillStyle = 'oklch(0.6 0.14 240)'; g.fill();
        g.fillStyle = rad(x0 + w * v, y + 12, 1, 9, [[0, 'oklch(0.99 0 0)'], [1, 'oklch(0.75 0.02 240)']]); g.beginPath(); g.arc(x0 + w * v, y + 13.5, 8, 0, 7); g.fill();
        g.strokeStyle = 'oklch(0.45 0.02 240)'; g.stroke();
        win.boxes[`s${i}:${kind}`] = { x: x0 - 8, y, w: w + 16, h: 28 };
      } else {
        button(win, `b${i}`, cx, y + 3, 150, 22, String(label).split(' ')[0] === 'Make' ? 'Go faster' : 'Do it', true);
      }
    });
  },
  tap(win, x, y, ctx) {
    const k = hitButton(win, x, y), rowsC = ctx.C.apps.control.rows;
    if (!k) return;
    const i = +k.slice(1).split(':')[0], row = rowsC[i];
    if (k[0] === 't') win.vals[i] = +k.split(':')[1];
    else if (k[0] === 's') {
      const b = win.boxes[k], v = Math.max(0, Math.min(1, (x - b.x - 8) / (b.w - 16)));
      if (k.endsWith('age')) ctx.age(v); else win.vals[i] = v;
    } else if (row?.[2] === 'wait') { ctx.wait(6000); setTimeout(() => ctx.say(ctx.C.apps.control.faster), 6200); }
    else if (row?.[2]) ctx.act(row[2]);
    ctx.repaint(win); ctx.sound.click();
    return true;
  },
};

export const taskmgr = {
  glyph: 'graph', noZoom: true,
  title: C => C.apps.taskmgr.title,
  size: () => [380, 280],
  init(win, ctx) { win.procs = (ctx.C.apps.taskmgr.procs || []).map(([n, c]) => ({ n, c: +c || 0, v: +c || 0 })); win.sel = -1; },
  paint(win, r, ctx) {
    const A = ctx.C.apps.taskmgr;
    g.fillStyle = 'oklch(0.96 0.01 88)'; g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle = lin(0, r.y, 0, r.y + 20, [[0, 'oklch(0.97 0.005 90)'], [1, 'oklch(0.88 0.01 90)']]); g.fillRect(r.x, r.y, r.w, 20);
    txt('Process', r.x + 12, r.y + 14, 10.5, 'oklch(0.35 0.01 240)', { w: 600 }); txt('CPU', r.x + r.w - 70, r.y + 14, 10.5, 'oklch(0.35 0.01 240)', { w: 600 });
    win.list = rows(r.x, r.y + 21, r.w, r.h - 82, win.procs, win.sel, (p, i, ry) => {
      txt(fit(p.n, r.w - 110, 12, 500, MONO), r.x + 12, ry + 13.5, 12, 'oklch(0.22 0.02 240)', { font: MONO });
      txt(`${Math.round(p.v)}%`.padStart(4), r.x + r.w - 70, ry + 13.5, 12, p.v > 50 ? 'oklch(0.55 0.2 25)' : 'oklch(0.35 0.02 240)', { font: MONO });
    });
    // A tiny load graph above the button.
    const gy = r.y + r.h - 58, gw = r.w - 130;
    screen({ x: r.x + 10, y: gy, w: gw, h: 32 }, 'oklch(0.15 0.02 160)');
    g.strokeStyle = 'oklch(0.85 0.2 145)'; g.lineWidth = 1.4; g.beginPath();
    (win.hist || []).forEach((v, k, a) => { const x = r.x + 10 + (k / Math.max(1, a.length - 1)) * gw, y = gy + 30 - v * 28; k ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.stroke();
    button(win, 'end', r.x + r.w - 110, gy + 5, 100, 22, A.end, true);
    status(r, `${win.procs.length} processes · CPU 100%`, 16);
  },
  tick(win, dt, ctx) {
    if (!ctx.isTop(win) || ctx.reduce) return false;
    win.acc = (win.acc || 0) + dt;
    if (win.acc < 0.8) return true;
    win.acc = 0;
    win.procs.forEach(p => { p.v = Math.max(0, Math.min(99, p.c + (Math.random() - 0.5) * Math.max(4, p.c * 0.2))); });
    (win.hist ||= []).push(0.7 + Math.random() * 0.3); if (win.hist.length > 24) win.hist.shift();
    ctx.repaint(win);
    return true;
  },
  tap(win, x, y, ctx) {
    const A = ctx.C.apps.taskmgr;
    if (hitButton(win, x, y) === 'end') {
      const p = win.procs[win.sel];
      if (!p) return true;
      if (/^shady/i.test(p.n)) { ctx.notice(...A.self); ctx.sound.crash(); return true; }
      if (/d4rkm0th/i.test(p.n)) {
        const m = p.n.match(/\((\d+)\)/), n = m ? +m[1] + 1 : 2;
        p.n = p.n.replace(/\s*\(\d+\)$/, '') + ` (${n})`;
        ctx.say(fill(A.respawn, { name: p.n.replace(/\s*\(\d+\)$/, '') }));
      } else { win.procs.splice(win.sel, 1); win.sel = -1; ctx.say(fill(A.ended, { name: p.n })); }
      ctx.repaint(win); ctx.sound.click();
      return true;
    }
    const i = rowAt(win.list, y);
    if (i >= 0) { win.sel = i; ctx.repaint(win); ctx.sound.click(); return true; }
  },
};

export const player = {
  glyph: 'disc', noZoom: true,
  title: C => C.apps.player.title,
  size: () => [340, 220],
  init(win) { win.track = 0; win.bars = new Float32Array(18); },
  paint(win, r, ctx) {
    const A = ctx.C.apps.player, on = ctx.sound.playing() && win.playing;
    // The kid's skin: a dark slab with a bevel and a green readout.
    g.fillStyle = lin(0, r.y, 0, r.y + r.h, [[0, 'oklch(0.32 0.02 250)'], [1, 'oklch(0.16 0.02 260)']]); g.fillRect(r.x, r.y, r.w, r.h);
    const sx = r.x + 10, sy = r.y + 10, sw = r.w - 20, sh = 70;
    screen({ x: sx, y: sy, w: sw, h: sh }, 'oklch(0.1 0.02 160)');
    txt(A.now, sx + 8, sy + 15, 9.5, 'oklch(0.7 0.12 150)', { font: MONO });
    txt(fit(A.tracks[win.track % A.tracks.length], sw - 16, 12, 700, MONO), sx + 8, sy + 31, 12, 'oklch(0.9 0.2 145)', { font: MONO, w: 700 });
    const bw = (sw - 16) / win.bars.length;
    win.bars.forEach((v, i) => {
      const h = 4 + v * 26, x = sx + 8 + i * bw;
      g.fillStyle = lin(0, sy + sh - 4 - h, 0, sy + sh - 4, [[0, 'oklch(0.75 0.2 30)'], [0.5, 'oklch(0.85 0.18 90)'], [1, 'oklch(0.75 0.2 145)']]);
      g.fillRect(x, sy + sh - 4 - h, bw - 2, h);
    });
    const by = sy + sh + 14;
    button(win, 'prev', r.x + r.w / 2 - 100, by, 56, 24, '|◀');
    button(win, 'play', r.x + r.w / 2 - 34, by, 68, 24, on ? '❚❚' : '▶', true);
    button(win, 'next', r.x + r.w / 2 + 44, by, 56, 24, '▶|');
    const ly = by + 36;
    A.tracks.slice(0, 3).forEach((t, i) => txt(fit(`${i + 1}. ${t}`, r.w - 24, 11, 500, MONO), r.x + 12, ly + i * 14, 11, i === win.track % A.tracks.length ? 'oklch(0.9 0.15 90)' : 'oklch(0.7 0.03 240)', { font: MONO }));
  },
  tap(win, x, y, ctx) {
    const b = hitButton(win, x, y), n = ctx.C.apps.player.tracks.length;
    if (b === 'play') { win.playing = !win.playing; ctx.sound.music(win.playing); }
    else if (b === 'next') win.track = (win.track + 1) % n;
    else if (b === 'prev') win.track = (win.track + n - 1) % n;
    else return;
    ctx.repaint(win); ctx.sound.click(); ctx.wake();
    return true;
  },
  tick(win, dt, ctx) {
    if (!win.playing || ctx.reduce) return false;
    win.acc = (win.acc || 0) + dt;
    if (win.acc < 0.06) return true;
    win.acc = 0; win.t = (win.t || 0) + 1;
    win.bars.forEach((v, i) => { win.bars[i] = Math.max(0, Math.min(1, v * 0.6 + Math.random() * 0.5 * (1 - i / 30) + (win.t % 3 === 0 && i < 4 ? 0.4 : 0))); });
    ctx.repaint(win);
    return true;
  },
  close(win, ctx) { if (win.playing) ctx.sound.music(false); },
};
