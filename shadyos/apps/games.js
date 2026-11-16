// Games: Mines (the OS cheats) and Patience (only the winning bit).
import { g, rr, lin, rad, txt, fit, glyph, begin } from '../paint.js';
import { toolbar, button, hitButton } from './ui.js';

/* ---------- Mines ---------- */
const N = 9, MINES = 10, CELL = 22;
function fresh(win) { win.cells = Array.from({ length: N * N }, () => ({ mine: false, open: false, flag: false, n: 0 })); win.over = 0; win.laid = false; }
function lay(win, safe) {
  let k = 0;
  while (k < MINES) { const i = (Math.random() * N * N) | 0; if (i !== safe && !win.cells[i].mine) { win.cells[i].mine = true; k++; } }
  win.cells.forEach((c, i) => { c.n = around(i).filter(j => win.cells[j].mine).length; });
  win.laid = true;
}
function around(i) {
  const x = i % N, y = (i / N) | 0, out = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const a = x + dx, b = y + dy; if ((dx || dy) && a >= 0 && b >= 0 && a < N && b < N) out.push(b * N + a); }
  return out;
}
function flood(win, i) {
  const st = [i];
  while (st.length) { const j = st.pop(), c = win.cells[j]; if (c.open || c.flag) continue; c.open = true; if (!c.n && !c.mine) st.push(...around(j)); }
}
const NUM = ['', 'oklch(0.5 0.17 250)', 'oklch(0.55 0.15 150)', 'oklch(0.58 0.2 25)', 'oklch(0.4 0.17 290)', 'oklch(0.45 0.15 30)', 'oklch(0.55 0.1 190)', 'oklch(0.2 0 0)', 'oklch(0.5 0 0)'];

export const mines = {
  glyph: 'mine', noZoom: true,
  title: C => C.apps.mines.title,
  size: () => [N * CELL + 64, N * CELL + 88],
  init(win) { fresh(win); },
  paint(win, r, ctx) {
    toolbar(r, 34);
    const left = MINES - win.cells.filter(c => c.flag).length;
    rr(r.x + 10, r.y + 7, 42, 20, 4); g.fillStyle = 'oklch(0.15 0.02 20)'; g.fill();
    txt(String(left).padStart(3, '0'), r.x + 31, r.y + 22, 14, 'oklch(0.7 0.22 25)', { w: 800, align: 'center', font: '"Iosevka Term Slab Nerd Font", monospace' });
    button(win, 'new', r.x + r.w / 2 - 30, r.y + 6, 60, 22, ctx.C.apps.mines.new_game, true);
    glyph('eye', r.x + r.w - 26, r.y + 17, win.over ? 0.5 : 0.42);
    const ox = r.x + (r.w - N * CELL) / 2, oy = r.y + 44;
    win.grid = { x: ox, y: oy };
    g.fillStyle = 'oklch(0.85 0.01 240)'; g.fillRect(ox - 2, oy - 2, N * CELL + 4, N * CELL + 4);
    win.cells.forEach((c, i) => {
      const x = ox + (i % N) * CELL, y = oy + ((i / N) | 0) * CELL;
      if (c.open) {
        g.fillStyle = c.mine ? 'oklch(0.65 0.2 25)' : 'oklch(0.94 0.008 240)'; g.fillRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
        if (c.mine) glyph('mine', x + CELL / 2, y + CELL / 2, 0.42);
        else if (c.n) txt(String(c.n), x + CELL / 2, y + 16, 13, NUM[c.n], { w: 800, align: 'center' });
      } else {
        rr(x + 1, y + 1, CELL - 2, CELL - 2, 4);
        g.fillStyle = lin(0, y, 0, y + CELL, [[0, 'oklch(0.86 0.06 230)'], [0.5, 'oklch(0.7 0.1 238)'], [0.51, 'oklch(0.6 0.12 242)'], [1, 'oklch(0.7 0.1 238)']]); g.fill();
        g.strokeStyle = 'oklch(1 0 0 / 0.55)'; g.lineWidth = 1; g.stroke();
        if (c.flag) { g.fillStyle = 'oklch(0.65 0.22 25)'; g.beginPath(); g.moveTo(x + 8, y + 5); g.lineTo(x + 16, y + 9); g.lineTo(x + 8, y + 13); g.fill(); g.fillStyle = 'oklch(0.2 0 0)'; g.fillRect(x + 7, y + 5, 1.5, 12); }
      }
    });
  },
  tap(win, x, y, ctx, alt) {
    if (hitButton(win, x, y) === 'new') { fresh(win); ctx.repaint(win); ctx.sound.click(); return true; }
    const gx = Math.floor((x - win.grid.x) / CELL), gy = Math.floor((y - win.grid.y) / CELL);
    if (win.over || gx < 0 || gy < 0 || gx >= N || gy >= N) return true;
    const i = gy * N + gx, c = win.cells[i], A = ctx.C.apps.mines;
    if (alt) { if (!c.open) { c.flag = !c.flag; ctx.repaint(win); ctx.sound.click(); } return true; }
    if (c.open || c.flag) return true;
    if (!win.laid) lay(win, i);
    const safeLeft = win.cells.filter(q => !q.mine && !q.open).length;
    // On the last safe tile, the OS often moves a mine under you.
    if (!c.mine && safeLeft === 1 && Math.random() < 0.6) { c.mine = true; win.cheated = true; }
    if (c.mine) {
      win.cells.forEach(q => { if (q.mine) q.open = true; }); win.over = 1;
      ctx.repaint(win); ctx.sound.crash();
      const [h, b] = win.cheated ? A.cheat : A.lose; win.cheated = false;
      setTimeout(() => ctx.notice(h, b), 500);
      return true;
    }
    flood(win, i); ctx.sound.click();
    if (!win.cells.some(q => !q.mine && !q.open)) { win.over = 2; setTimeout(() => ctx.notice(...A.win), 300); ctx.sound.ding(4); }
    ctx.repaint(win);
    return true;
  },
};

/* ---------- Patience ---------- */
const SUITS = [['spade', false], ['heart', true], ['diamond', true], ['club', false]];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const CARD = [44, 62];
function pip(kind, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s); g.beginPath();
  if (kind === 'heart') { g.moveTo(0, 6); g.bezierCurveTo(-9, -1, -6, -9, 0, -4); g.bezierCurveTo(6, -9, 9, -1, 0, 6); }
  else if (kind === 'diamond') { g.moveTo(0, -8); g.lineTo(6, 0); g.lineTo(0, 8); g.lineTo(-6, 0); }
  else if (kind === 'spade') { g.moveTo(0, -8); g.bezierCurveTo(9, 0, 6, 7, 0, 3); g.bezierCurveTo(-6, 7, -9, 0, 0, -8); g.moveTo(0, 2); g.lineTo(3, 8); g.lineTo(-3, 8); }
  else { g.arc(0, -4, 3.6, 0, 7); g.moveTo(4, 2); g.arc(-3.6 + 0.4, 2, 3.6, 0, 7); g.moveTo(7.6, 2); g.arc(4, 2, 3.6, 0, 7); g.moveTo(0, 2); g.lineTo(3, 8); g.lineTo(-3, 8); }
  g.fill(); g.restore();
}
export function cardFace(x, y, rank, suit) {
  const [w, h] = CARD, [kind, red] = SUITS[suit];
  rr(x + 0.5, y + 0.5, w - 1, h - 1, 4); g.fillStyle = lin(0, y, 0, y + h, [[0, 'oklch(0.99 0.004 90)'], [1, 'oklch(0.93 0.01 90)']]); g.fill();
  g.strokeStyle = 'oklch(0.45 0.01 240)'; g.lineWidth = 1; g.stroke();
  g.fillStyle = red ? 'oklch(0.56 0.21 25)' : 'oklch(0.2 0.02 260)';
  txt(RANKS[rank], x + 5, y + 14, 12, g.fillStyle, { w: 800 });
  pip(kind, x + 9, y + 23, 0.55);
  pip(kind, x + w / 2 + 4, y + h / 2 + 6, 1.35);
}
// A card on its own canvas, for a sprite.
export function cardCanvas(rank, suit) { const c = document.createElement('canvas'); begin(c, CARD[0], CARD[1]); cardFace(0, 0, rank, suit); return c; }

export const patience = {
  glyph: 'cards', noZoom: true,
  title: C => C.apps.patience.title,
  size: () => [4 * (CARD[0] + 12) + 40, 230],
  paint(win, r, ctx) {
    const A = ctx.C.apps.patience;
    g.fillStyle = rad(r.x + r.w / 2, r.y + r.h * 0.4, 10, r.w * 0.8, [[0, 'oklch(0.52 0.12 150)'], [1, 'oklch(0.32 0.09 155)']]); g.fillRect(r.x, r.y, r.w, r.h);
    const gap = (r.w - 4 * CARD[0]) / 5;
    win.spots = [];
    for (let s = 0; s < 4; s++) {
      const x = r.x + gap + s * (CARD[0] + gap), y = r.y + 20;
      win.spots.push([x, y]);
      rr(x, y, CARD[0], CARD[1], 4); g.strokeStyle = 'oklch(1 0 0 / 0.3)'; g.lineWidth = 1.2; g.stroke();
      if (!win.dealt) cardFace(x, y, 12, s);
    }
    txt(fit(win.finished ? A.done : win.dealt ? '' : A.blurb, r.w - 20, 12), r.x + r.w / 2, r.y + 120, 12, 'oklch(0.95 0.03 140)', { align: 'center', w: 600 });
    if (!win.dealt) button(win, 'deal', r.x + r.w / 2 - 70, r.y + r.h - 40, 140, 24, A.deal, true);
  },
  tap(win, x, y, ctx) {
    if (!win.dealt && hitButton(win, x, y) === 'deal') { win.dealt = true; win.boxes = {}; ctx.repaint(win); ctx.cascadeCards(win, win.spots); return true; }
  },
};
