// ShadyOS 2D kit: canvas helpers, glyphs, the hybrid chrome and the panels.
// Each painter draws into the canvas that begin() or use() selects.

export const PD = 2;
export const SANS = 'Gabarito, system-ui, sans-serif';
export const MONO = '"Iosevka Term Slab Nerd Font", ui-monospace, monospace';
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = t => t * t * (3 - 2 * t);

/** @type {CanvasRenderingContext2D} */
export let g = null;
let cv = null, pd = PD;
const tmp = document.createElement('canvas'), tg = tmp.getContext('2d');

// Size a canvas for w by h CSS pixels and select it.
// Full-screen layers pass a lower scale to stay cheap.
export function begin(canvas, w, h, scale = PD) {
  cv = canvas; pd = scale;
  const cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
  if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  g = canvas.getContext('2d'); g.setTransform(scale, 0, 0, scale, 0, 0);
  // A canvas kept at its size keeps its old state, so reset it.
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.shadowBlur = 0; g.shadowColor = 'transparent';
  g.clearRect(0, 0, w, h);
  return g;
}
// Select a canvas as it is.
export function use(canvas) { cv = canvas; g = canvas.getContext('2d'); return g; }

let seed = 5;
export const reseed = s => { seed = s; };
export const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

export const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
export const lin = (x0, y0, x1, y1, s) => { const l = g.createLinearGradient(x0, y0, x1, y1); s.forEach(([o, c]) => l.addColorStop(o, c)); return l; };
export const rad = (x, y, r0, r1, s, fx = x, fy = y) => { const l = g.createRadialGradient(fx, fy, r0, x, y, r1); s.forEach(([o, c]) => l.addColorStop(o, c)); return l; };

export function txt(s, x, y, size, col, { w = 500, glow = null, align = 'left', font = SANS, shadow = null } = {}) {
  g.save(); g.font = `${w} ${size}px ${font}`; g.textAlign = align;
  if (glow) { g.shadowColor = glow; g.shadowBlur = 10; for (let i = 0; i < 6; i++) { g.fillStyle = glow; g.fillText(s, x, y); } }
  if (shadow) { g.shadowColor = shadow; g.shadowBlur = 3; g.shadowOffsetY = 1; } else g.shadowColor = 'transparent';
  g.fillStyle = col; g.fillText(s, x, y); g.restore();
}
export function measure(s, size, w = 500, font = SANS) { g.save(); g.font = `${w} ${size}px ${font}`; const m = g.measureText(s).width; g.restore(); return m; }
// Cut a line to a width, with an ellipsis.
export function fit(s, max, size, w = 500, font = SANS) {
  s = String(s ?? '');
  if (measure(s, size, w, font) <= max) return s;
  while (s.length > 1 && measure(s + '…', size, w, font) > max) s = s.slice(0, -1);
  return s + '…';
}
// Wrap text into lines that fit a width.
export function wrap(s, max, size, w = 500, font = SANS) {
  const out = []; let line = '';
  for (const word of String(s ?? '').split(/\s+/)) {
    const t = line ? `${line} ${word}` : word;
    if (line && measure(t, size, w, font) > max) { out.push(line); line = word; } else line = t;
  }
  if (line) out.push(line);
  return out;
}

// Static glass blurs a region of the current canvas.
export function frost(x, y, w, h, r, blur = 9, tint = 'oklch(0.42 0.035 215 / 0.38)') {
  const b = blur * 3;
  tmp.width = Math.max(1, (w + 2 * b) * pd); tmp.height = Math.max(1, (h + 2 * b) * pd);
  tg.drawImage(cv, (x - b) * pd, (y - b) * pd, tmp.width, tmp.height, 0, 0, tmp.width, tmp.height);
  g.save(); rr(x, y, w, h, r); g.clip();
  g.filter = `blur(${blur * pd}px) saturate(1.5) brightness(1.08)`;
  g.drawImage(tmp, x - b, y - b, w + 2 * b, h + 2 * b);
  g.filter = 'none'; g.fillStyle = tint; g.fillRect(x, y, w, h); g.restore();
}

// A gel bead: the aqua light, lit from above with a glow below.
export function bead(x, y, r, c, dim = false) {
  const [L, C, h] = c, k = dim ? 0.55 : 1;
  g.fillStyle = rad(x, y + r * 0.3, 0, r, [[0, `oklch(${L + 0.15} ${C * k} ${h})`], [0.7, `oklch(${L} ${C * k} ${h})`], [1, `oklch(${L - 0.2} ${C * k} ${h})`]]);
  g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  g.strokeStyle = 'oklch(0.15 0.03 240 / 0.6)'; g.lineWidth = 0.8; g.stroke();
  g.save(); g.beginPath(); g.arc(x, y, r - 0.6, 0, 7); g.clip();
  g.fillStyle = lin(0, y - r, 0, y, [[0, 'oklch(1 0 0 / 0.75)'], [0.98, 'oklch(1 0 0 / 0.25)'], [1, 'oklch(1 0 0 / 0)']]); g.fillRect(x - r, y - r, r * 2, r);
  g.fillStyle = rad(x, y + r * 1.1, 0, r * 1.1, [[0, 'oklch(0.95 0.15 90 / 0.55)'], [1, 'oklch(0.95 0.15 90 / 0)']]); g.fillRect(x - r, y, r * 2, r);
  g.restore();
}
export function sparkle(x, y, r, c) {
  g.save(); g.translate(x, y); g.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, q = i % 2 ? r * 0.25 : r; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
  g.closePath(); g.shadowColor = c; g.shadowBlur = 6; g.fillStyle = 'oklch(0.98 0.03 90)'; g.fill(); g.restore();
}
// A gel pill button; the default one glows blue.
export function pill(x, y, w, h, label, def = false, down = false) {
  rr(x, y, w, h, h / 2);
  g.fillStyle = def ? lin(0, y, 0, y + h, [[0, 'oklch(0.95 0.03 215)'], [0.3, 'oklch(0.88 0.07 222)'], [0.5, 'oklch(0.82 0.09 225)'], [0.51, 'oklch(0.7 0.13 230)'], [1, 'oklch(0.62 0.14 232)']])
    : lin(0, y, 0, y + h, [[0, 'oklch(0.98 0 0)'], [0.48, 'oklch(0.93 0.003 240)'], [0.49, 'oklch(0.86 0.006 240)'], [1, 'oklch(0.8 0.008 240)']]);
  if (down) g.filter = 'brightness(0.85)';
  g.fill(); g.filter = 'none';
  if (def) { g.save(); rr(x, y, w, h, h / 2); g.clip(); g.fillStyle = rad(x + w / 2, y + h * 1.15, 0, w * 0.45, [[0, 'oklch(0.9 0.14 200 / 0.8)'], [1, 'oklch(0.9 0.14 200 / 0)']]); g.fillRect(x, y, w, h); g.restore(); }
  g.strokeStyle = def ? 'oklch(0.42 0.1 240)' : 'oklch(0.55 0.005 240)'; g.lineWidth = 1; g.stroke();
  rr(x + 1, y + 1, w - 2, h - 2, h / 2 - 1); g.strokeStyle = 'oklch(1 0 0 / 0.7)'; g.stroke();
  txt(label, x + w / 2, y + h * 0.5 + 4.3, 12, 'oklch(0.15 0.01 240)', { align: 'center', w: def ? 600 : 500 });
}

/* ---------- glyphs: every icon in the OS ---------- */
// Each glyph fits a box of about 36 by 36, centred on 0, 0.
const GLYPH = {
  computer() {
    rr(-17, -16, 34, 26, 4); g.fillStyle = lin(0, -16, 0, 10, [[0, 'oklch(0.92 0.01 240)'], [1, 'oklch(0.7 0.015 240)']]); g.fill();
    rr(-13, -12, 26, 18, 2); g.fillStyle = lin(0, -12, 0, 6, [[0, 'oklch(0.32 0.08 250)'], [1, 'oklch(0.18 0.06 270)']]); g.fill();
    GLYPH.eye(0, -3, 0.42);
    g.fillStyle = lin(0, 10, 0, 18, [[0, 'oklch(0.75 0.01 240)'], [1, 'oklch(0.55 0.015 240)']]);
    g.beginPath(); g.moveTo(-5, 10); g.lineTo(5, 10); g.lineTo(9, 17); g.lineTo(-9, 17); g.closePath(); g.fill();
  },
  folder() {
    g.fillStyle = lin(0, -14, 0, 16, [[0, 'oklch(0.86 0.12 85)'], [1, 'oklch(0.66 0.13 65)']]);
    rr(-17, -14, 15, 8, 3); g.fill(); rr(-17, -10, 34, 26, 3); g.fill();
    g.fillStyle = lin(0, -6, 0, 16, [[0, 'oklch(0.94 0.1 90)'], [1, 'oklch(0.76 0.13 72)']]); rr(-17, -5, 34, 21, 3); g.fill();
    g.fillStyle = 'oklch(1 0 0 / 0.4)'; g.fillRect(-15, -4, 30, 1.5);
  },
  bin() {
    g.fillStyle = lin(-14, 0, 14, 0, [[0, 'oklch(0.55 0.04 220 / 0.85)'], [0.35, 'oklch(0.9 0.03 210 / 0.7)'], [1, 'oklch(0.45 0.04 230 / 0.9)']]);
    g.beginPath(); g.moveTo(-14, -12); g.lineTo(14, -12); g.lineTo(11, 18); g.lineTo(-11, 18); g.closePath(); g.fill();
    g.strokeStyle = 'oklch(1 0 0 / 0.35)'; g.lineWidth = 1.2;
    for (const x of [-7, 0, 7]) { g.beginPath(); g.moveTo(x, -9); g.lineTo(x * 0.85, 15); g.stroke(); }
    rr(-16, -16, 32, 5, 2); g.fillStyle = lin(0, -16, 0, -11, [[0, 'oklch(0.92 0.02 220)'], [1, 'oklch(0.62 0.03 230)']]); g.fill();
    g.fillStyle = 'oklch(0.95 0.02 90)'; g.fillRect(-6, -9, 7, 9); g.fillStyle = 'oklch(0.8 0.1 30)'; g.fillRect(1, -6, 6, 8);
  },
  page() {
    g.fillStyle = lin(0, -18, 0, 18, [[0, 'oklch(0.99 0.005 90)'], [1, 'oklch(0.86 0.02 85)']]);
    g.beginPath(); g.moveTo(-13, -18); g.lineTo(6, -18); g.lineTo(13, -11); g.lineTo(13, 18); g.lineTo(-13, 18); g.closePath(); g.fill();
    g.fillStyle = 'oklch(0.8 0.02 85)'; g.beginPath(); g.moveTo(6, -18); g.lineTo(6, -11); g.lineTo(13, -11); g.fill();
    g.fillStyle = 'oklch(0.6 0.03 240 / 0.6)'; for (let i = 0; i < 5; i++) g.fillRect(-8, -6 + i * 5, 16 - (i % 2) * 5, 1.5);
  },
  terminal() {
    rr(-17, -15, 34, 30, 5); g.fillStyle = lin(0, -15, 0, 15, [[0, 'oklch(0.3 0.01 240)'], [1, 'oklch(0.12 0.01 240)']]); g.fill();
    rr(-17, -15, 34, 7, [5, 5, 0, 0]); g.fillStyle = 'oklch(0.75 0.01 240)'; g.fill();
    g.strokeStyle = 'oklch(0.85 0.17 150)'; g.lineWidth = 2.4; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(-10, -2); g.lineTo(-4, 3); g.lineTo(-10, 8); g.stroke();
    g.beginPath(); g.moveTo(0, 9); g.lineTo(8, 9); g.stroke();
  },
  moth() {
    const wing = s => { g.beginPath(); g.moveTo(0, -2); g.bezierCurveTo(s * 10, -18, s * 20, -12, s * 18, 0); g.bezierCurveTo(s * 16, 8, s * 6, 6, 0, 2); g.fill(); };
    g.fillStyle = lin(0, -16, 0, 10, [[0, 'oklch(0.75 0.06 300)'], [1, 'oklch(0.4 0.08 290)']]); wing(1); wing(-1);
    g.fillStyle = lin(0, 0, 0, 16, [[0, 'oklch(0.6 0.06 300)'], [1, 'oklch(0.3 0.06 290)']]);
    g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(12, 6, 10, 18, 2, 16); g.lineTo(-2, 16); g.bezierCurveTo(-10, 18, -12, 6, 0, 0); g.fill();
    g.fillStyle = 'oklch(0.9 0.15 85)'; for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 10, -6, 3, 0, 7); g.fill(); }
    g.fillStyle = 'oklch(0.2 0.03 290)'; rr(-2, -6, 4, 18, 2); g.fill();
  },
  cards() {
    const card = (x, y, a, red) => {
      g.save(); g.translate(x, y); g.rotate(a);
      rr(-10, -14, 20, 28, 3); g.fillStyle = 'oklch(0.98 0.005 90)'; g.fill(); g.strokeStyle = 'oklch(0.5 0.01 240)'; g.lineWidth = 0.8; g.stroke();
      g.fillStyle = red ? 'oklch(0.58 0.2 25)' : 'oklch(0.2 0.02 260)';
      g.beginPath(); g.moveTo(0, -6); g.bezierCurveTo(7, -1, 5, 6, 0, 2); g.bezierCurveTo(-5, 6, -7, -1, 0, -6); g.fill();
      g.restore();
    };
    card(-6, 1, -0.25, false); card(6, 0, 0.22, true);
  },
  mine() {
    g.strokeStyle = 'oklch(0.25 0.02 260)'; g.lineWidth = 3; g.lineCap = 'round';
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(Math.cos(a) * 17, Math.sin(a) * 17); g.lineTo(-Math.cos(a) * 17, -Math.sin(a) * 17); g.stroke(); }
    g.fillStyle = rad(-4, -4, 1, 13, [[0, 'oklch(0.6 0.02 260)'], [1, 'oklch(0.15 0.02 260)']]); g.beginPath(); g.arc(0, 0, 12, 0, 7); g.fill();
    g.fillStyle = 'oklch(1 0 0 / 0.8)'; g.beginPath(); g.arc(-4, -4, 3, 0, 7); g.fill();
    g.fillStyle = 'oklch(0.7 0.22 25)'; g.beginPath(); g.arc(5, 5, 2.2, 0, 7); g.fill();
  },
  disc() {
    const cg = g.createConicGradient(0.6, 0, 0);
    [[0, 'oklch(0.85 0.02 240)'], [0.15, 'oklch(0.9 0.1 200)'], [0.3, 'oklch(0.75 0.02 240)'], [0.5, 'oklch(0.92 0.12 90)'], [0.65, 'oklch(0.7 0.02 240)'], [0.8, 'oklch(0.88 0.12 330)'], [1, 'oklch(0.85 0.02 240)']].forEach(([o, c]) => cg.addColorStop(o, c));
    g.fillStyle = cg; g.beginPath(); g.arc(0, 0, 18, 0, 7); g.fill();
    g.fillStyle = 'oklch(0.3 0.02 240)'; g.beginPath(); g.arc(0, 0, 4, 0, 7); g.fill();
    g.strokeStyle = 'oklch(1 0 0 / 0.5)'; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, 9, 0, 7); g.stroke();
  },
  chat() {
    const bub = (x, y, w, h, c0, c1, tail) => {
      rr(x, y, w, h, h / 2); g.fillStyle = lin(0, y, 0, y + h, [[0, c0], [1, c1]]); g.fill();
      g.beginPath(); g.moveTo(x + tail, y + h - 2); g.lineTo(x + tail - 5, y + h + 6); g.lineTo(x + tail + 6, y + h - 3); g.fill();
      g.fillStyle = 'oklch(1 0 0 / 0.5)'; rr(x + 3, y + 2, w - 6, h * 0.35, h * 0.2); g.fill();
    };
    bub(-17, -15, 26, 17, 'oklch(0.85 0.14 145)', 'oklch(0.6 0.17 150)', 8);
    bub(-6, -2, 24, 16, 'oklch(0.85 0.1 230)', 'oklch(0.58 0.15 245)', 16);
  },
  gear() {
    g.fillStyle = lin(0, -18, 0, 18, [[0, 'oklch(0.9 0.01 240)'], [1, 'oklch(0.55 0.02 240)']]);
    g.beginPath();
    for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12, r = i % 3 === 0 ? 18 : 14.5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fill();
    g.fillStyle = 'oklch(0.32 0.02 240)'; g.beginPath(); g.arc(0, 0, 6, 0, 7); g.fill();
  },
  graph() {
    rr(-17, -15, 34, 30, 4); g.fillStyle = lin(0, -15, 0, 15, [[0, 'oklch(0.25 0.03 160)'], [1, 'oklch(0.12 0.02 170)']]); g.fill();
    g.strokeStyle = 'oklch(0.5 0.08 150 / 0.4)'; g.lineWidth = 0.8;
    for (let i = -10; i <= 10; i += 6) { g.beginPath(); g.moveTo(-15, i); g.lineTo(15, i); g.stroke(); }
    g.strokeStyle = 'oklch(0.88 0.2 145)'; g.lineWidth = 2; g.beginPath();
    [-14, 6, -9, -2, -4, 8, 1, -6, 6, 2, 10, -11, 14, -12].forEach((v, i, a) => { if (i % 2 === 0) (i ? g.lineTo : g.moveTo).call(g, v, a[i + 1]); });
    g.stroke();
  },
  eye(x = 0, y = 0, s = 1) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.beginPath(); g.moveTo(-18, 0); g.quadraticCurveTo(0, -17, 18, 0); g.quadraticCurveTo(0, 17, -18, 0); g.closePath();
    g.fillStyle = lin(0, -10, 0, 10, [[0, 'oklch(0.99 0.01 90)'], [1, 'oklch(0.82 0.02 80)']]); g.fill();
    g.save(); g.clip();
    g.fillStyle = rad(0, 0, 1, 9, [[0, 'oklch(0.85 0.14 180)'], [0.6, 'oklch(0.6 0.17 280)'], [1, 'oklch(0.3 0.1 285)']]); g.beginPath(); g.arc(0, 0, 9, 0, 7); g.fill();
    g.fillStyle = 'oklch(0.08 0.02 280)'; g.beginPath(); g.ellipse(0, 0, 2.6, 6, 0, 0, 7); g.fill();
    g.fillStyle = 'oklch(1 0 0 / 0.85)'; g.beginPath(); g.arc(-3, -3.5, 2, 0, 7); g.fill();
    g.restore(); g.restore();
  },
  orb() {
    g.fillStyle = rad(0, 6, 2, 19, [[0, 'oklch(0.85 0.15 175)'], [0.5, 'oklch(0.45 0.14 250)'], [1, 'oklch(0.18 0.06 270)']]);
    g.beginPath(); g.arc(0, 0, 18, 0, 7); g.fill();
    g.strokeStyle = 'oklch(0.08 0.02 260 / 0.8)'; g.lineWidth = 1; g.stroke();
    GLYPH.eye(0, 1, 0.55);
    g.save(); g.beginPath(); g.arc(0, 0, 17, 0, 7); g.clip();
    g.fillStyle = lin(0, -18, 0, 0, [[0, 'oklch(1 0 0 / 0.7)'], [1, 'oklch(1 0 0 / 0.05)']]); g.beginPath(); g.ellipse(0, -8, 14, 9, 0, 0, 7); g.fill();
    g.restore();
  },
};
export const GLYPHS = Object.keys(GLYPH);
export function glyph(kind, x, y, s = 1) {
  g.save(); g.translate(x, y); g.scale(s, s); (GLYPH[kind] || GLYPH.page)(); g.restore();
}
// A glyph alone on a square canvas, for a dock sprite.
export function glyphCanvas(kind, size = 72) {
  const c = document.createElement('canvas');
  begin(c, size, size);
  g.shadowColor = 'oklch(0 0 0 / 0.5)'; g.shadowBlur = 5; g.shadowOffsetY = 2;
  glyph(kind, size / 2, size / 2, size / 42);
  return c;
}

/* ---------- desktop ---------- */
export function wallpaper(W, H) {
  g.fillStyle = lin(0, 0, W * 0.4, H, [[0, 'oklch(0.2 0.045 230)'], [0.5, 'oklch(0.16 0.04 210)'], [1, 'oklch(0.11 0.03 280)']]);
  g.fillRect(0, 0, W, H);
  g.fillStyle = rad(W * 0.62, H * 0.58, 10, W * 0.6, [[0, 'oklch(0.45 0.09 75 / 0.55)'], [0.4, 'oklch(0.3 0.07 150 / 0.25)'], [1, 'oklch(0.2 0.04 200 / 0)']]);
  g.fillRect(0, 0, W, H);
  g.save(); g.globalCompositeOperation = 'lighter';
  // The aurora sweep: a soft violet curtain high on the left.
  for (let k = 0; k < 40; k++) {
    const t = k / 39, x = W * (0.05 + t * 0.5);
    g.fillStyle = lin(x, H * 0.05, x, H * 0.55, [[0, 'oklch(0.6 0.15 300 / 0)'], [0.35, `oklch(0.62 0.14 ${300 - t * 60} / ${0.035 * Math.sin(t * Math.PI)})`], [1, 'oklch(0.6 0.12 200 / 0)']]);
    g.fillRect(x - W * 0.02, H * 0.05 + Math.sin(t * 6) * 18, W * 0.04, H * 0.5);
  }
  for (let k = 0; k < 70; k++) {
    const t = k / 69, sp = Math.sin(t * Math.PI);
    g.beginPath(); g.moveTo(-60, H * (0.95 - t * 0.25));
    g.bezierCurveTo(W * 0.25, H * (0.4 + t * 0.35), W * 0.55, H * (0.95 - t * 0.5), W + 60, H * (0.25 + t * 0.2));
    g.strokeStyle = `oklch(${0.55 + sp * 0.2} ${0.1 + sp * 0.04} ${175 - t * 110} / ${0.012 + sp * 0.03})`;
    g.lineWidth = 1 + sp * 10; g.stroke();
  }
  g.filter = 'blur(6px)';
  for (let k = 0; k < 4; k++) {
    g.beginPath(); g.moveTo(-60, H * (0.82 - k * 0.04));
    g.bezierCurveTo(W * 0.25, H * (0.55 + k * 0.03), W * 0.55, H * (0.72 - k * 0.05), W + 60, H * (0.32 + k * 0.03));
    g.strokeStyle = `oklch(0.8 0.1 ${85 - k * 10} / 0.12)`; g.lineWidth = 3 + k * 2; g.stroke();
  }
  g.filter = 'none';
  for (let i = 0; i < 26; i++) {
    const x = rnd() * W, y = H * (0.2 + rnd() * 0.7), r = 4 + rnd() * 22, a = 0.03 + rnd() * 0.07;
    g.fillStyle = rad(x, y, 0, r, [[0, `oklch(0.85 0.08 ${70 + rnd() * 120} / ${a * 0.6})`], [0.85, `oklch(0.85 0.08 90 / ${a})`], [1, 'oklch(0.85 0.08 90 / 0)']]);
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  g.restore();
}
export function flare(W, H, x, y) {
  g.save(); g.globalCompositeOperation = 'lighter';
  g.fillStyle = rad(x, y, 0, 60, [[0, 'oklch(1 0.03 90 / 0.8)'], [0.15, 'oklch(0.9 0.1 80 / 0.35)'], [1, 'oklch(0.8 0.1 80 / 0)']]); g.beginPath(); g.arc(x, y, 60, 0, 7); g.fill();
  g.fillStyle = 'oklch(0.9 0.08 80 / 0.25)'; g.fillRect(x - 160, y - 0.75, 320, 1.5);
  [[0.25, 14, 200], [0.45, 26, 150], [0.62, 9, 60], [0.8, 34, 280]].forEach(([t, r, hue]) => {
    const hx = x + (W / 2 - x) * t * 2, hy = y + (H / 2 - y) * t * 2;
    g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.lineTo(hx + Math.cos(a) * r, hy + Math.sin(a) * r); } g.closePath();
    g.fillStyle = `oklch(0.7 0.1 ${hue} / 0.08)`; g.fill();
  });
  g.restore();
}
// The face in the bokeh: drawn alone, shown only on an old screen.
export function ghostFace(W, H) {
  const x = W * 0.3, y = H * 0.55, s = Math.min(W, H) * 0.28;
  g.save(); g.globalCompositeOperation = 'lighter'; g.filter = `blur(${s * 0.05}px)`;
  g.fillStyle = 'oklch(0.75 0.06 200 / 0.5)';
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(x + sx * s * 0.28, y - s * 0.12, s * 0.12, s * 0.07, 0, 0, 7); g.fill(); }
  g.strokeStyle = 'oklch(0.75 0.06 200 / 0.4)'; g.lineWidth = s * 0.04;
  g.beginPath(); g.arc(x, y + s * 0.05, s * 0.32, 0.25 * Math.PI, 0.75 * Math.PI); g.stroke();
  g.restore();
}
export function icons(list) {
  list.forEach(({ glyph: k, name, x, y }) => {
    g.save(); g.shadowColor = 'oklch(0 0 0 / 0.6)'; g.shadowBlur = 8; g.shadowOffsetY = 3; glyph(k, x, y, 1.15); g.restore();
    const lines = wrap(name, 84, 11.5, 600).slice(0, 2);
    lines.forEach((l, i) => txt(l, x, y + 36 + i * 13, 11.5, 'oklch(0.98 0.005 90)', { w: 600, align: 'center', shadow: 'oklch(0 0 0 / 0.95)' }));
  });
}
export function watermark(lines, x, y, align) {
  lines.slice(0, 2).forEach((l, i) => txt(l, x, y + i * 15, i ? 10.5 : 12, `oklch(0.95 0.01 90 / ${i ? 0.4 : 0.5})`, { w: i ? 500 : 700, align }));
}
export function burnIn(rects) {
  g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = 'oklch(0.84 0.02 85)';
  rects.forEach(([x, y, w, h, r]) => { rr(x, y, w, h, r); g.fill(); }); g.restore();
}

/* ---------- window chrome: the hybrid ---------- */
// The OS's glass: aqua beads on the left, a glass caption cluster on the right.
export const GLASS = { top: 30, side: 7, bottom: 7, r: 9 };
export const KID = { top: 26, side: 5, bottom: 5, r: 4 };
const BEADS = [['close', [0.62, 0.19, 25]], ['fold', [0.8, 0.15, 80]], ['zoom', [0.72, 0.17, 145]]];
// Hit zones of the chrome, in window coordinates.
export function chromeHits(win) {
  if (win.skin === 'kid') return [{ act: 'close', x: win.w - 16, y: 13, r: 10 }, { act: 'fold', x: win.w - 34, y: 13, r: 10 }];
  const out = BEADS.map(([act], i) => ({ act, x: 17 + i * 19, y: 15, r: 9 }));
  if (win.cluster !== false && win.w > 220) {
    const cx = win.w - 9;
    out.push({ act: 'close', x: cx - 21, y: 9, r: 0, w: 42, h: 18 }, { act: 'zoom', x: cx - 42 - 13, y: 9, r: 0, w: 26, h: 18 }, { act: 'fold', x: cx - 68 - 13, y: 9, r: 0, w: 26, h: 18 });
  }
  return out;
}
export function chromeHit(win, lx, ly) {
  for (const h of chromeHits(win)) {
    if (win.noZoom && h.act === 'zoom') continue;
    if (h.w ? Math.abs(lx - h.x) <= h.w / 2 && Math.abs(ly - h.y) <= h.h / 2 : Math.hypot(lx - h.x, ly - h.y) < h.r) return h.act;
  }
  return null;
}
export function glassFace(win) {
  const { w, h } = win, title = win.title + (win.frozen ? ` ${win.frozenTag || '(Not Responding)'}` : '');
  g.save(); rr(0, 0, w, h, 9); g.clip();
  g.fillStyle = lin(0, 0, w, 0, [[0, 'oklch(1 0 0 / 0.3)'], [0.5, 'oklch(0 0 0 / 0.1)'], [1, 'oklch(1 0 0 / 0.16)']]); g.fillRect(0, 0, w, h);
  g.fillStyle = lin(0, 0, 90, 90, [[0, 'oklch(1 0 0 / 0.36)'], [0.7, 'oklch(1 0 0 / 0.36)'], [1, 'oklch(1 0 0 / 0)']]);
  g.beginPath(); g.moveTo(0, 0); g.lineTo(300, 0); g.lineTo(0, 300); g.fill();
  g.fillStyle = lin(w, 0, w - 90, 90, [[0, 'oklch(1 0 0 / 0.36)'], [0.7, 'oklch(1 0 0 / 0.36)'], [1, 'oklch(1 0 0 / 0)']]);
  g.beginPath(); g.moveTo(w, 0); g.lineTo(w - 300, 0); g.lineTo(w, 300); g.fill();
  // Brushed pinstripes run through the title bar.
  for (let y = 1; y < GLASS.top; y += 2) { g.fillStyle = `oklch(1 0 0 / ${0.05 - y * 0.0012})`; g.fillRect(0, y, w, 1); }
  const L = Math.hypot(w, h);
  g.save(); g.translate(0, h); g.rotate(-0.94);
  for (let t = 0, k = 0; t < L * 1.4; k++) {
    const bw = 2 + ((k * 37) % 11);
    g.fillStyle = k % 3 !== 1 ? 'oklch(0 0 0 / 0.09)' : 'oklch(0.92 0 0 / 0.09)';
    g.fillRect(t - L * 0.2, -L, bw, L * 2);
    t += bw + 6 + ((k * 53) % 19);
  }
  g.restore();
  g.restore();
  rr(0.5, 0.5, w - 1, h - 1, 9); g.strokeStyle = 'oklch(0.05 0.01 240 / 0.8)'; g.lineWidth = 1; g.stroke();
  rr(1.5, 1.5, w - 3, h - 3, 8); g.strokeStyle = 'oklch(1 0 0 / 0.6)'; g.stroke();
  // Left: three gel beads.
  BEADS.forEach(([act, c], i) => { if (!(win.noZoom && act === 'zoom')) bead(17 + i * 19, 15, 6.2, c, win.frozen); });
  // Right: the glass caption cluster; the close tab glows red.
  let tR = w - 10;
  if (win.cluster !== false && w > 220) {
    const x1 = w - 9, x0 = x1 - 94, y0 = 1, ch = 18;
    g.save(); rr(x0, y0, x1 - x0, ch, [0, 0, 6, 6]); g.clip();
    g.fillStyle = lin(0, y0, 0, y0 + ch, [[0, 'oklch(1 0 0 / 0.5)'], [0.48, 'oklch(1 0 0 / 0.18)'], [0.5, 'oklch(0.2 0.02 240 / 0.25)'], [1, 'oklch(0.5 0.03 220 / 0.35)']]); g.fillRect(x0, y0, x1 - x0, ch);
    g.fillStyle = lin(0, y0, 0, y0 + ch, [[0, 'oklch(0.85 0.12 30)'], [0.48, 'oklch(0.66 0.2 28)'], [0.5, 'oklch(0.5 0.2 27)'], [1, 'oklch(0.66 0.21 30)']]); g.fillRect(x1 - 42, y0, 42, ch);
    g.fillStyle = rad(x1 - 21, y0 + ch, 0, 20, [[0, 'oklch(0.9 0.15 50 / 0.8)'], [1, 'oklch(0.9 0.15 50 / 0)']]); g.fillRect(x1 - 42, y0, 42, ch);
    g.restore();
    rr(x0 + 0.5, y0 + 0.5, x1 - x0 - 1, ch - 1, [0, 0, 6, 6]); g.strokeStyle = 'oklch(0.08 0.01 240 / 0.7)'; g.stroke();
    g.fillStyle = 'oklch(0.08 0.01 240 / 0.5)'; g.fillRect(x1 - 42, y0, 1, ch); g.fillRect(x1 - 68, y0, 1, ch);
    g.strokeStyle = 'oklch(1 0 0 / 0.95)'; g.lineWidth = 1.6; g.lineCap = 'round';
    const cx = x1 - 21, cy = y0 + 9;
    g.beginPath(); g.moveTo(cx - 4, cy - 4); g.lineTo(cx + 4, cy + 4); g.moveTo(cx + 4, cy - 4); g.lineTo(cx - 4, cy + 4); g.stroke();
    g.strokeStyle = 'oklch(0.15 0.01 240 / 0.9)'; g.lineWidth = 1.3;
    if (!win.noZoom) g.strokeRect(x1 - 60, cy - 4, 9, 8);
    g.beginPath(); g.moveTo(x1 - 86, cy + 3.5); g.lineTo(x1 - 77, cy + 3.5); g.stroke();
    tR = x0 - 8;
  }
  const tL = 74, cx = clamp(w / 2, tL + 40, Math.max(tL + 40, tR - 40));
  txt(fit(title, Math.max(30, Math.min(cx - tL, tR - cx) * 2), 13, 600), cx, 20, 13, 'oklch(0.14 0.02 240)', { w: 600, align: 'center', glow: 'oklch(1 0 0 / 0.7)' });
}
// The client: a paper panel with a pinstripe edge. Leaves a clip open.
export function client(x, y, w, h) {
  rr(x - 1, y - 1, w + 2, h + 2, 4); g.strokeStyle = 'oklch(1 0 0 / 0.55)'; g.lineWidth = 1; g.stroke();
  rr(x, y, w, h, 3); g.fillStyle = 'oklch(0.95 0.018 88)'; g.fill(); g.strokeStyle = 'oklch(0.08 0.01 240 / 0.7)'; g.stroke();
  g.save(); rr(x, y, w, h, 3); g.clip();
}
export function kidFace(win) {
  const { w, h } = win, top = KID.top;
  g.save(); rr(0, 0, w, top, 4); g.clip();
  g.fillStyle = lin(0, 0, w, 0, [[0, 'oklch(0.55 0.22 28)'], [0.45, 'oklch(0.75 0.18 60)'], [0.7, 'oklch(0.35 0.12 30)'], [1, 'oklch(0.12 0.02 270)']]); g.fillRect(0, 0, w, top);
  g.fillStyle = lin(0, 0, 0, top, [[0, 'oklch(1 0 0 / 0.45)'], [0.5, 'oklch(1 0 0 / 0.1)'], [0.51, 'oklch(0 0 0 / 0.1)'], [1, 'oklch(0 0 0 / 0.3)']]); g.fillRect(0, 0, w, top);
  g.restore();
  txt(fit(win.title, w - 56, 12, 800, MONO), 10, 18, 12, 'oklch(0.99 0.03 90)', { w: 800, font: MONO, shadow: 'oklch(0 0 0 / 0.9)' });
  [w - 16, w - 34].forEach((dx, i) => sparkle(dx, 13, 7, i ? 'oklch(0.85 0.15 200)' : 'oklch(0.85 0.2 20)'));
  g.strokeStyle = 'oklch(0.75 0.18 50 / 0.7)'; g.lineWidth = 1; rr(0.5, 0.5, w - 1, h - 1, 4); g.stroke();
  g.save(); rr(5, top + 2, w - 10, h - top - 7, 2); g.clip();
  g.fillStyle = 'oklch(0.07 0.01 270)'; g.fillRect(5, top + 2, w - 10, h - top - 7);
}
// The client rectangle of a window, in window coordinates.
export function clientRect(win) {
  if (win.skin === 'kid') return { x: 5, y: KID.top + 2, w: win.w - 10, h: win.h - KID.top - 7 };
  return { x: GLASS.side, y: GLASS.top, w: win.w - GLASS.side * 2, h: win.h - GLASS.top - GLASS.bottom };
}

/* ---------- panels: menus, balloons ---------- */
// A drop-down menu. Items are [label, action] or '-'.
export function menuSize(items) {
  let w = 120;
  for (const it of items) if (it !== '-') w = Math.max(w, measure(Array.isArray(it) ? it[0] : it, 13, 500) + 40);
  const h = items.reduce((s, it) => s + (it === '-' ? 9 : 24), 10);
  return [Math.ceil(w), h];
}
export function menuFace(items, hover, w, h) {
  rr(0.5, 0.5, w - 1, h - 1, 8); g.fillStyle = 'oklch(1 0 0 / 0.08)'; g.fill();
  g.strokeStyle = 'oklch(1 0 0 / 0.35)'; g.lineWidth = 1; g.stroke();
  const rows = []; let y = 5;
  items.forEach((it, i) => {
    if (it === '-') { g.fillStyle = 'oklch(1 0 0 / 0.18)'; g.fillRect(12, y + 4, w - 24, 1); y += 9; return; }
    const label = Array.isArray(it) ? it[0] : it;
    if (i === hover) { rr(5, y, w - 10, 24, 5); g.fillStyle = lin(0, y, 0, y + 24, [[0, 'oklch(0.7 0.13 240)'], [1, 'oklch(0.55 0.15 250)']]); g.fill(); }
    txt(label, 16, y + 16.5, 13, i === hover ? 'oklch(0.99 0 0)' : 'oklch(0.96 0.01 240)', { shadow: 'oklch(0 0 0 / 0.6)' });
    rows.push({ i, y, h: 24 }); y += 24;
  });
  return rows;
}
export function balloonFace(text, w, h) {
  rr(0.5, 0.5, w - 1, h - 1, 10); g.fillStyle = lin(0, 0, 0, h, [[0, 'oklch(0.99 0.01 95 / 0.95)'], [1, 'oklch(0.93 0.03 95 / 0.95)']]); g.fill();
  g.strokeStyle = 'oklch(0.3 0.02 240 / 0.6)'; g.lineWidth = 1; g.stroke();
  glyph('eye', 22, h / 2, 0.55);
  wrap(text, w - 52, 12.5).slice(0, 3).forEach((l, i, a) => txt(l, 42, h / 2 + 4.5 + (i - (a.length - 1) / 2) * 16, 12.5, 'oklch(0.2 0.02 240)', { w: 500 }));
}
export function balloonSize(text) { return [Math.min(320, Math.max(180, measure(text, 12.5) + 60)), wrap(text, 268, 12.5).length > 1 ? 54 : 40]; }

/* ---------- the menu bar ---------- */
// Lays the titles out from x0; drops what does not fit before x1.
export function barLayout(titles, x0, x1) {
  const out = []; let x = x0;
  titles.forEach((t, i) => {
    const w = measure(t, 13, i ? 500 : 700) + 18;
    if (x + w > x1) return;
    out.push({ title: t, x, w }); x += w;
  });
  return out;
}
export function barFace(W, H, items, open) {
  g.fillStyle = lin(0, 0, 0, H, [[0, 'oklch(1 0 0 / 0.24)'], [0.5, 'oklch(1 0 0 / 0.07)'], [1, 'oklch(1 0 0 / 0.02)']]); g.fillRect(0, 0, W, H);
  g.fillStyle = 'oklch(0.05 0.02 240 / 0.7)'; g.fillRect(0, H - 1, W, 1);
  g.fillStyle = 'oklch(1 0 0 / 0.35)'; g.fillRect(0, 0, W, 1);
  items.forEach(({ title, x, w }, i) => {
    if (open === i) { rr(x, 3, w, H - 6, 5); g.fillStyle = 'oklch(0.6 0.14 245 / 0.85)'; g.fill(); }
    txt(title, x + 9, H / 2 + 4.6, 13, 'oklch(0.98 0.01 90)', { w: i ? 500 : 700, shadow: 'oklch(0 0 0 / 0.8)' });
  });
}
// The OS's eye: it follows you, blinks, and narrows when annoyed.
export function eyeFace(look, open, mood) {
  const w = 28, h = 18, cx = w / 2, cy = h / 2;
  const lid = clamp(open * (1 - mood * 0.45));
  g.save();
  g.beginPath(); g.moveTo(cx - 12, cy); g.quadraticCurveTo(cx, cy - 11 * lid, cx + 12, cy); g.quadraticCurveTo(cx, cy + 11 * lid, cx - 12, cy); g.closePath();
  g.shadowColor = 'oklch(0.7 0.15 280 / 0.7)'; g.shadowBlur = 5;
  g.fillStyle = lin(0, cy - 8, 0, cy + 8, [[0, 'oklch(0.99 0.01 90)'], [1, 'oklch(0.84 0.02 80)']]); g.fill();
  g.shadowBlur = 0; g.clip();
  const px = cx + look[0] * 5, py = cy + look[1] * 2.6;
  g.fillStyle = rad(px, py, 0.5, 6, [[0, 'oklch(0.85 0.14 180)'], [0.6, 'oklch(0.6 0.17 280)'], [1, 'oklch(0.3 0.1 285)']]); g.beginPath(); g.arc(px, py, 6, 0, 7); g.fill();
  g.fillStyle = 'oklch(0.08 0.02 280)'; g.beginPath(); g.ellipse(px, py, 1.7 - mood * 0.6, 4, 0, 0, 7); g.fill();
  g.fillStyle = 'oklch(1 0 0 / 0.85)'; g.beginPath(); g.arc(px - 2, py - 2.2, 1.3, 0, 7); g.fill();
  g.restore();
  g.strokeStyle = 'oklch(0.12 0.03 280 / 0.9)'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(cx - 12, cy); g.quadraticCurveTo(cx, cy - 11 * lid, cx + 12, cy); g.stroke();
  return [w, h];
}

/* ---------- the dock ---------- */
export function dockFace(w, h, slots, sep) {
  rr(0.5, 0.5, w - 1, h - 1, 14); g.strokeStyle = 'oklch(1 0 0 / 0.45)'; g.lineWidth = 1; g.stroke();
  g.fillStyle = lin(0, 0, 0, h, [[0, 'oklch(1 0 0 / 0.28)'], [0.45, 'oklch(1 0 0 / 0.06)'], [1, 'oklch(1 0 0 / 0.0)']]); rr(1, 1, w - 2, h * 0.5, [13, 13, 0, 0]); g.fill();
  if (sep) { g.fillStyle = 'oklch(1 0 0 / 0.3)'; g.fillRect(sep, 8, 1, h - 16); }
  slots.forEach(s => { if (s.running) { g.fillStyle = rad(s.x, h - 5, 0, 3, [[0, 'oklch(0.95 0.1 200)'], [1, 'oklch(0.7 0.15 220 / 0)']]); g.beginPath(); g.arc(s.x, h - 5, 3, 0, 7); g.fill(); } });
}

/* ---------- pointers ---------- */
export const CUR = [16, 24];
// The kid's pointer: a flame-glass arrow, tip at (2, 2).
export function arrowCursor() {
  const c = document.createElement('canvas');
  begin(c, CUR[0], CUR[1]);
  const pts = [[0, 0], [0, 16.5], [4, 12.8], [6.8, 19], [9.6, 17.8], [6.9, 11.8], [11.8, 11.8]];
  const path = () => { g.beginPath(); pts.forEach(([x, y]) => g.lineTo(x + 2, y + 2)); g.closePath(); };
  path(); g.fillStyle = lin(0, 2, 0, 21, [[0, 'oklch(0.93 0.14 88)'], [0.45, 'oklch(0.74 0.19 52)'], [1, 'oklch(0.52 0.21 27)']]); g.fill();
  g.save(); path(); g.clip(); g.fillStyle = lin(0, 2, 8, 9, [[0, 'oklch(1 0 0 / 0.6)'], [0.6, 'oklch(1 0 0 / 0.15)'], [0.61, 'oklch(1 0 0 / 0)']]); g.fillRect(0, 0, CUR[0], CUR[1]); g.restore();
  path(); g.lineJoin = 'round'; g.strokeStyle = 'oklch(0.12 0.02 270)'; g.lineWidth = 1.3; g.stroke();
  return c;
}
// The wait wheel: a rainbow disc that spins in the shader.
export function wheelCursor() {
  const c = document.createElement('canvas'), s = 22;
  begin(c, s, s);
  const cg = g.createConicGradient(0, s / 2, s / 2);
  ['oklch(0.7 0.2 25)', 'oklch(0.8 0.17 70)', 'oklch(0.85 0.18 110)', 'oklch(0.75 0.17 150)', 'oklch(0.65 0.15 240)', 'oklch(0.6 0.2 300)', 'oklch(0.7 0.2 25)'].forEach((col, i, a) => cg.addColorStop(i / (a.length - 1), col));
  g.fillStyle = cg; g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 1, 0, 7); g.fill();
  g.fillStyle = rad(s / 2, s * 0.35, 0, s / 2, [[0, 'oklch(1 0 0 / 0.6)'], [1, 'oklch(1 0 0 / 0)']]); g.fill();
  g.strokeStyle = 'oklch(0.15 0.02 260 / 0.8)'; g.lineWidth = 1; g.stroke();
  return c;
}
// The hourglass, for the kid's old habits.
export function glassCursor() {
  const c = document.createElement('canvas'), w = 16, h = 22;
  begin(c, w, h);
  g.fillStyle = 'oklch(0.95 0.03 90)'; g.strokeStyle = 'oklch(0.12 0.02 270)'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(2, 2); g.lineTo(14, 2); g.lineTo(14, 4); g.lineTo(9, 11); g.lineTo(14, 18); g.lineTo(14, 20); g.lineTo(2, 20); g.lineTo(2, 18); g.lineTo(7, 11); g.lineTo(2, 4); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = 'oklch(0.8 0.15 75)'; g.beginPath(); g.moveTo(4, 5); g.lineTo(12, 5); g.lineTo(8, 10); g.fill();
  g.beginPath(); g.moveTo(8, 15); g.lineTo(12.5, 19); g.lineTo(3.5, 19); g.fill();
  return c;
}
