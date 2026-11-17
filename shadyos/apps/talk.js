// Apps that talk back: the terminal and the messenger.
import { g, rr, lin, rad, txt, fit, wrap, glyph, MONO, measure } from '../paint.js';
import { screen, button, hitButton } from './ui.js';
import { fill, pick } from '../content.js';

const LINE = 16;
// A caret blinks for ten seconds after the last key, then holds still.
function blink(win, dt, ctx) {
  if (!ctx.isFocus(win)) { if (win.caret !== 1) { win.caret = 1; ctx.repaint(win); } return false; }
  win.idle = (win.idle || 0) + dt;
  if (win.idle > 10 || ctx.reduce) { if (win.caret !== 1) { win.caret = 1; ctx.repaint(win); } return false; }
  const c = Math.floor(win.idle * 2) % 2 ? 0 : 1;
  if (c !== win.caret) { win.caret = c; ctx.repaint(win); }
  return true;
}

export const terminal = {
  glyph: 'terminal', typing: true,
  title: C => C.apps.terminal.title,
  size: () => [470, 290],
  init(win, ctx) { const T = ctx.C.apps.terminal; win.out = [...(T.motd || [])]; win.input = ''; win.hist = []; win.hi = 0; win.caret = 1; },
  paint(win, r, ctx) {
    const T = ctx.C.apps.terminal;
    screen(r, 'oklch(0.12 0.012 250)');
    g.fillStyle = rad(r.x + r.w / 2, r.y + r.h / 2, 10, r.w * 0.7, [[0, 'oklch(0.3 0.08 150 / 0.12)'], [1, 'oklch(0 0 0 / 0)']]); g.fillRect(r.x, r.y, r.w, r.h);
    const cw = measure('M', 12.5, 500, MONO), cols = Math.max(10, Math.floor((r.w - 20) / cw));
    // Long lines wrap by characters, like a real tty.
    const lines = [];
    for (const l of [...win.out, T.prompt + win.input]) { const s = String(l); if (!s.length) lines.push(''); for (let i = 0; i < s.length; i += cols) lines.push(s.slice(i, i + cols)); }
    const fitN = Math.floor((r.h - 14) / LINE), show = lines.slice(-fitN);
    show.forEach((l, i) => txt(l, r.x + 10, r.y + 18 + i * LINE, 12.5, i === show.length - 1 ? 'oklch(0.92 0.12 150)' : 'oklch(0.82 0.13 150)', { font: MONO, glow: null }));
    if (win.caret) {
      const last = show[show.length - 1] || '';
      g.fillStyle = 'oklch(0.9 0.15 150)'; g.fillRect(r.x + 10 + measure(last, 12.5, 500, MONO), r.y + 6 + (show.length - 1) * LINE, cw, LINE - 2);
    }
  },
  tap(win, x, y, ctx) { ctx.focus(win); return true; },
  type(win, s, ctx) { win.input += s; win.idle = 0; ctx.repaint(win); ctx.sound.click(); },
  key(win, k, ctx) {
    win.idle = 0;
    if (k === 'Backspace') win.input = win.input.slice(0, -1);
    else if (k === 'ArrowUp' && win.hist.length) { win.hi = Math.max(0, win.hi - 1); win.input = win.hist[win.hi] || ''; }
    else if (k === 'ArrowDown') { win.hi = Math.min(win.hist.length, win.hi + 1); win.input = win.hist[win.hi] || ''; }
    else if (k === 'Enter') run(win, ctx);
    else return false;
    ctx.repaint(win);
    return true;
  },
};
function run(win, ctx) {
  const T = ctx.C.apps.terminal, raw = win.input.trim(), cmd = raw.toLowerCase();
  win.out.push(T.prompt + win.input); win.input = '';
  if (!raw) return;
  win.hist.push(raw); win.hi = win.hist.length;
  const table = T.commands || {};
  const hit = table[cmd] ?? table[cmd.split(/\s+/)[0]];
  const vars = { cmd: raw, days: ctx.days().toLocaleString('en-US') };
  if (hit === undefined) { win.out.push(fill(pick(T.unknown || ['{cmd}: no']), vars)); ctx.sound.click(); return; }
  const say = typeof hit === 'object' && !Array.isArray(hit) ? hit.say : hit, act = hit?.do;
  if (act === 'clear') win.out = [];
  for (const l of [].concat(say ?? [])) win.out.push(fill(l, vars));
  ctx.sound.click();
  if (act && act !== 'clear') setTimeout(() => ctx.act(act), 450);
}

export const chat = {
  glyph: 'chat', typing: true,
  title: C => C.apps.chat.title,
  size: () => [330, 360],
  init(win, ctx) { win.msgs = []; win.input = ''; win.n = 0; win.caret = 1; win.typingT = 0; later(win, ctx, 1400); },
  paint(win, r, ctx) {
    const A = ctx.C.apps.chat;
    g.fillStyle = lin(0, r.y, 0, r.y + r.h, [[0, 'oklch(0.97 0.015 230)'], [1, 'oklch(0.92 0.02 230)']]); g.fillRect(r.x, r.y, r.w, r.h);
    // The buddy header with the moth as a picture.
    g.fillStyle = lin(0, r.y, 0, r.y + 50, [[0, 'oklch(0.85 0.06 230)'], [1, 'oklch(0.72 0.09 240)']]); g.fillRect(r.x, r.y, r.w, 50);
    rr(r.x + 8, r.y + 6, 38, 38, 6); g.fillStyle = 'oklch(0.2 0.04 280)'; g.fill(); g.strokeStyle = 'oklch(1 0 0 / 0.8)'; g.lineWidth = 1.5; g.stroke();
    glyph('moth', r.x + 27, r.y + 25, 0.82);
    g.fillStyle = 'oklch(0.75 0.2 145)'; g.beginPath(); g.arc(r.x + 58, r.y + 19, 4, 0, 7); g.fill();
    txt(A.buddy, r.x + 68, r.y + 23, 13.5, 'oklch(0.18 0.03 250)', { w: 700 });
    txt(fit(A.status, r.w - 76, 11), r.x + 56, r.y + 39, 11, 'oklch(0.3 0.03 250)');
    // Messages, newest at the bottom.
    const top = r.y + 56, bottom = r.y + r.h - 64, out = [];
    for (const m of win.msgs) {
      const ls = wrap(m.t, r.w * 0.66, 12.5);
      out.push({ me: m.me, ls, h: ls.length * 16 + 10 });
    }
    let y = bottom;
    if (win.typingT) { txt(fill(A.typing, { name: A.buddy }), r.x + 12, y - 4, 11, 'oklch(0.45 0.03 250)'); y -= 18; }
    for (let i = out.length - 1; i >= 0 && y > top; i--) {
      const m = out[i], bw = Math.max(...m.ls.map(l => measure(l, 12.5))) + 18, bx = m.me ? r.x + r.w - bw - 10 : r.x + 10;
      y -= m.h + 6;
      rr(bx, y, bw, m.h, 9);
      g.fillStyle = m.me ? lin(0, y, 0, y + m.h, [[0, 'oklch(0.75 0.12 240)'], [1, 'oklch(0.6 0.15 245)']]) : lin(0, y, 0, y + m.h, [[0, 'oklch(0.99 0 0)'], [1, 'oklch(0.92 0.01 240)']]);
      g.fill(); g.strokeStyle = 'oklch(0.5 0.03 240 / 0.4)'; g.lineWidth = 1; g.stroke();
      m.ls.forEach((l, k) => txt(l, bx + 9, y + 17 + k * 16, 12.5, m.me ? 'oklch(0.99 0 0)' : 'oklch(0.2 0.02 250)'));
    }
    // The input box and the Nudge button.
    g.fillStyle = 'oklch(0.85 0.02 230)'; g.fillRect(r.x, r.y + r.h - 58, r.w, 1);
    rr(r.x + 8, r.y + r.h - 50, r.w - 16, 22, 5); g.fillStyle = 'oklch(1 0 0)'; g.fill(); g.strokeStyle = ctx.isFocus(win) ? 'oklch(0.6 0.15 240)' : 'oklch(0.7 0.02 240)'; g.stroke();
    const shown = fit(win.input, r.w - 34, 12.5);
    txt(shown, r.x + 14, r.y + r.h - 35, 12.5, 'oklch(0.2 0.02 250)');
    if (win.caret && ctx.isFocus(win)) { g.fillStyle = 'oklch(0.3 0.05 250)'; g.fillRect(r.x + 15 + measure(shown, 12.5), r.y + r.h - 46, 1.5, 15); }
    button(win, 'nudge', r.x + 8, r.y + r.h - 24, 74, 20, A.nudge, true);
  },
  tap(win, x, y, ctx) {
    if (hitButton(win, x, y) === 'nudge') {
      ctx.shake(); ctx.sound.buzz();
      setTimeout(() => { win.msgs.push({ t: ctx.C.apps.chat.nudged }); ctx.repaint(win); ctx.sound.ding(3); ctx.wake(); }, 900);
      return true;
    }
    ctx.focus(win); ctx.repaint(win); return true;
  },
  type(win, s, ctx) { win.input += s; win.idle = 0; ctx.repaint(win); },
  key(win, k, ctx) {
    win.idle = 0;
    if (k === 'Backspace') win.input = win.input.slice(0, -1);
    else if (k === 'Enter' && win.input.trim()) { win.msgs.push({ me: true, t: win.input.trim() }); win.input = ''; ctx.sound.click(); later(win, ctx, 900 + Math.random() * 1600); }
    else return false;
    ctx.repaint(win);
    return true;
  },
  tick(win, dt, ctx) { return blink(win, dt, ctx); },
  close(win) { clearTimeout(win.t); },
};
// The buddy types for a while, then sends the next line.
function later(win, ctx, ms) {
  const lines = ctx.C.apps.chat.lines || [];
  if (win.n >= lines.length) return;
  clearTimeout(win.t);
  win.t = setTimeout(() => { win.typingT = 1; ctx.repaint(win); ctx.wake();
    win.t = setTimeout(() => { win.typingT = 0; win.msgs.push({ t: lines[win.n++] }); ctx.repaint(win); ctx.sound.ding(2); ctx.wake();
      // The first two lines come by themselves.
      if (win.n < 2) later(win, ctx, 1800);
    }, 900 + Math.random() * 1200);
  }, ms);
}
terminal.tick = (win, dt, ctx) => blink(win, dt, ctx);
