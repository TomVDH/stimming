// The 1 m's control software, drawn into a canvas the monitor's size.
// The renderer lays it over the camera image.
// The monitor pass then shows both.
import { rig, guideRms, type Filter } from './rig.ts';
import { histPlot, rows, spectrumPlot } from './panel.ts';
import type { Found, Run } from './spectrum.ts';

// The virtual monitor in pixels.
export const SW = 1440;
export const SH = 900;
// The camera image's place on the monitor.
export const IMG = { x: 0, y: 32, w: 1060, h: 700 };
const LOG = { x: 0, y: 732, w: 1060, h: 168 };
const PANEL = { x: 1060, y: 32, w: 380, h: 868 };

const C = {
  bg: '#14151a', panel: '#191a1f', head: '#1f2126', line: '#2b2d34', btn: '#262830', btnHover: '#30333c',
  ink: '#d8dbe0', dim: '#8a909b', faint: '#5c626d', accent: '#4f9be0', ok: '#59bf77', warn: '#dfa443', bad: '#dc5f52', warm: '#e6b26a',
};
const SANS = '"Segoe UI", system-ui, sans-serif';
const MONO = 'Consolas, "Cascadia Mono", monospace';

export type Target = { name: string; note: string };
export type View = {
  clock: string; lst: string;
  ra: string; dec: string; alt: string; az: string; air: string;
  state: string; progress: number; subs: number; temp: string;
  zoom: string; stars: number; hfr: number;
  stats: { mean: number; med: number; sd: number; max: number; hist: number[] };
  targets: Target[];
  // The image overlay, in monitor px.
  centre: [number, number]; detected: [number, number][]; box: [number, number] | null;
  bar: { px: number; label: string }; banner: string;
  sel: { name: string; info: string; run: Run | null; found: Found[]; lines: string[] } | null;
};
export type Actions = {
  fit(): void; one(): void; zoom(f: number): void;
  goto(i: number): void; startStop(): void; exposure(dir: number): void; filter(f: Filter): void; reset(): void;
  autofocus(): void; guide(): void; night(): void;
};

/* ---------- the log ---------- */
const lines: { t: string; text: string; cls: string }[] = [];
const pad = (n: number): string => String(n).padStart(2, '0');

export function log(text: string, cls = ''): void {
  const d = new Date();
  lines.push({ t: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`, text, cls });
  if (lines.length > 60) lines.shift();
}

/* ---------- autofocus data ---------- */
export const af = { points: [] as [number, number][], fit: null as null | { a: number; b: number; c: number } };

type Hit = { x: number; y: number; w: number; h: number; act: () => void };

export class Screen {
  readonly canvas = document.createElement('canvas');
  private g: CanvasRenderingContext2D;
  private hits: Hit[] = [];
  hover: [number, number] = [-1, -1];
  night = false;

  constructor() {
    this.canvas.width = SW;
    this.canvas.height = SH;
    this.g = this.canvas.getContext('2d')!;
  }

  inImage(x: number, y: number): boolean {
    return x >= IMG.x && x < IMG.x + IMG.w && y >= IMG.y && y < IMG.y + IMG.h && !this.hitAt(x, y);
  }

  hitAt(x: number, y: number): (() => void) | null {
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const h = this.hits[i];
      if (x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h) return h.act;
    }
    return null;
  }

  private over(x: number, y: number, w: number, h: number): boolean {
    const [hx, hy] = this.hover;
    return hx >= x && hx < x + w && hy >= y && hy < y + h;
  }

  // A flat button; on marks a pressed toggle.
  private button(x: number, y: number, w: number, h: number, label: string, act: () => void, style: { on?: boolean; primary?: boolean; stop?: boolean } = {}): void {
    const g = this.g;
    const hot = this.over(x, y, w, h);
    g.fillStyle = style.stop ? (hot ? '#6a2b26' : '#5a2420') : style.primary ? (hot ? '#255a8e' : '#1f4a75') : style.on ? '#24364a' : hot ? C.btnHover : C.btn;
    g.fillRect(x, y, w, h);
    g.strokeStyle = style.on ? C.accent : style.primary ? '#2e6aa6' : style.stop ? '#8a3a33' : '#3a3d46';
    g.lineWidth = 1;
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    g.fillStyle = style.on || style.primary || style.stop ? '#fff' : C.ink;
    g.font = `13px ${SANS}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(label, x + w / 2, y + h / 2 + 1);
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    this.hits.push({ x, y, w, h, act });
  }

  private head(y: number, title: string, right = ''): number {
    const g = this.g;
    g.fillStyle = C.head;
    g.fillRect(PANEL.x, y, PANEL.w, 24);
    g.fillStyle = C.line;
    g.fillRect(PANEL.x, y + 24, PANEL.w, 1);
    g.fillStyle = C.dim;
    g.font = `600 11px ${SANS}`;
    g.fillText(title.toUpperCase().split('').join(String.fromCharCode(8202)), PANEL.x + 12, y + 16);
    if (right) {
      g.font = `12px ${MONO}`;
      g.textAlign = 'right';
      g.fillText(right, PANEL.x + PANEL.w - 12, y + 16);
      g.textAlign = 'left';
    }
    return y + 25;
  }

  private text(x: number, y: number, s: string, colour = C.ink, font = `13px ${SANS}`): void {
    this.g.fillStyle = colour;
    this.g.font = font;
    this.g.fillText(s, x, y);
  }

  draw(v: View, a: Actions): void {
    const g = this.g;
    this.hits = [];
    g.clearRect(0, 0, SW, SH);
    // Everything but the image is opaque software chrome.
    g.fillStyle = C.bg;
    g.fillRect(0, 0, SW, IMG.y);
    g.fillRect(IMG.x + IMG.w, IMG.y, SW - IMG.w, SH - IMG.y);
    g.fillRect(0, IMG.y + IMG.h, IMG.w, SH - IMG.y - IMG.h);
    this.topBar(v, a);
    this.overlay(v, a);
    this.logArea();
    this.panel(v, a);
  }

  private topBar(v: View, a: Actions): void {
    const g = this.g;
    g.fillStyle = '#0e0f12';
    g.fillRect(0, 0, SW, IMG.y);
    g.fillStyle = C.line;
    g.fillRect(0, IMG.y - 1, SW, 1);
    this.text(12, 21, 'Observatory Control', C.ink, `600 14px ${SANS}`);
    this.text(160, 21, '1 m f/3 RC  ·  obs-ctl-01', C.dim);
    const dot = (x: number, colour: string): void => {
      g.fillStyle = colour;
      g.beginPath();
      g.arc(x, 16, 4, 0, Math.PI * 2);
      g.fill();
    };
    dot(760, C.ok);
    this.text(770, 21, 'Roof open', C.dim);
    dot(860, C.ok);
    this.text(870, 21, 'Weather safe', C.dim);
    this.text(990, 21, `UTC ${v.clock}   LST ${v.lst}`, C.ink, `13px ${MONO}`);
    this.button(SW - 76, 5, 64, 22, 'Night', a.night, { on: this.night });
  }

  private overlay(v: View, a: Actions): void {
    const g = this.g;
    const { x: x0, y: y0, w, h } = IMG;
    g.save();
    g.beginPath();
    g.rect(x0, y0, w, h);
    g.clip();
    const [cx, cy] = v.centre;
    if (rig.overlay.cross) {
      g.strokeStyle = 'rgba(225, 80, 70, 0.55)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x0, Math.round(cy) + 0.5); g.lineTo(x0 + w, Math.round(cy) + 0.5);
      g.moveTo(Math.round(cx) + 0.5, y0); g.lineTo(Math.round(cx) + 0.5, y0 + h);
      g.stroke();
      g.beginPath();
      g.arc(cx, cy, 30, 0, Math.PI * 2);
      g.stroke();
    }
    if (rig.overlay.stars) {
      g.strokeStyle = 'rgba(89, 191, 119, 0.85)';
      for (const [x, y] of v.detected.slice(0, 500)) {
        g.beginPath();
        g.arc(x, y, 7, 0, Math.PI * 2);
        g.stroke();
      }
    }
    if (v.box) {
      g.strokeStyle = 'rgba(230, 178, 106, 0.95)';
      g.strokeRect(v.box[0] - 14, v.box[1] - 14, 28, 28);
    }
    g.restore();
    // The view's tools sit in the image's top left corner.
    let x = x0 + 10;
    const y = y0 + 10;
    for (const [label, act, wd] of [['Fit', a.fit, 40], ['1:1', a.one, 40], ['−', () => a.zoom(1 / 1.5), 28], ['+', () => a.zoom(1.5), 28]] as const) {
      this.button(x, y, wd, 24, label, act);
      x += wd + 4;
    }
    g.fillStyle = 'rgba(10, 11, 14, 0.75)';
    g.fillRect(x, y, 78, 24);
    this.text(x + 8, y + 17, v.zoom, C.ink, `13px ${MONO}`);
    x += 82;
    this.button(x, y, 56, 24, 'Stars', () => { rig.overlay.stars = !rig.overlay.stars; }, { on: rig.overlay.stars });
    // The compass: north up, east left.
    const ox = x0 + w - 30, oy = y0 + 46;
    g.strokeStyle = 'rgba(216, 219, 224, 0.85)';
    g.beginPath();
    g.moveTo(ox, oy); g.lineTo(ox, oy - 24);
    g.moveTo(ox, oy); g.lineTo(ox - 24, oy);
    g.stroke();
    this.text(ox - 4, oy - 29, 'N', C.ink, `12px ${SANS}`);
    this.text(ox - 38, oy + 4, 'E', C.ink, `12px ${SANS}`);
    // The scale bar.
    g.fillStyle = 'rgba(216, 219, 224, 0.85)';
    g.fillRect(x0 + 14, y0 + h - 18, v.bar.px, 2);
    this.text(x0 + 14, y0 + h - 25, v.bar.label, C.ink, `12px ${SANS}`);
    // The mount's position, bottom right.
    g.fillStyle = 'rgba(10, 11, 14, 0.7)';
    g.fillRect(x0 + w - 300, y0 + h - 50, 292, 42);
    this.text(x0 + w - 290, y0 + h - 33, `RA  ${v.ra}   Dec ${v.dec}`, C.ink, `12px ${MONO}`);
    this.text(x0 + w - 290, y0 + h - 15, `Alt ${v.alt}   Az ${v.az}   X ${v.air}`, C.dim, `12px ${MONO}`);
    if (v.banner) {
      g.font = `600 15px ${SANS}`;
      g.fillStyle = v.banner === 'SLEWING' ? C.warn : C.accent;
      g.textAlign = 'center';
      g.fillText(v.banner, x0 + w / 2, y0 + 28);
      g.textAlign = 'left';
    }
  }

  private logArea(): void {
    const g = this.g;
    g.fillStyle = '#0c0d10';
    g.fillRect(LOG.x, LOG.y, LOG.w, LOG.h);
    g.fillStyle = C.line;
    g.fillRect(LOG.x, LOG.y, LOG.w, 1);
    const show = lines.slice(-8);
    show.forEach((l, i) => {
      const y = LOG.y + 22 + i * 19;
      this.text(12, y, l.t, C.faint, `12px ${MONO}`);
      this.text(84, y, l.text, l.cls === 'w' ? C.warn : l.cls === 'ok' ? C.ok : C.dim, `12px ${MONO}`);
    });
  }

  private panel(v: View, a: Actions): void {
    const g = this.g;
    g.fillStyle = C.panel;
    g.fillRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h);
    g.fillStyle = C.line;
    g.fillRect(PANEL.x, PANEL.y, 1, PANEL.h);
    const L = PANEL.x + 12, R = PANEL.x + PANEL.w - 12;

    // Targets: a click slews the mount.
    let y = this.head(PANEL.y, 'Targets', 'click to slew');
    v.targets.forEach((t, i) => {
      const ry = y + 4 + i * 24;
      const hot = this.over(PANEL.x, ry, PANEL.w, 24);
      if (hot) {
        g.fillStyle = C.btnHover;
        g.fillRect(PANEL.x + 1, ry, PANEL.w - 1, 24);
      }
      this.text(L, ry + 17, t.name, C.ink);
      g.textAlign = 'right';
      this.text(R, ry + 17, t.note, C.dim, `12px ${MONO}`);
      g.textAlign = 'left';
      this.hits.push({ x: PANEL.x, y: ry, w: PANEL.w, h: 24, act: () => a.goto(i) });
    });
    y += 8 + v.targets.length * 24;

    // Camera.
    y = this.head(y, 'Camera', v.temp);
    this.text(L, y + 20, v.state, rig.looping ? C.ink : C.dim);
    g.fillStyle = '#0b0c0e';
    g.fillRect(L, y + 28, R - L, 4);
    g.fillStyle = C.accent;
    g.fillRect(L, y + 28, (R - L) * v.progress, 4);
    const ry = y + 42;
    this.button(L, ry, 26, 26, '−', () => a.exposure(-1));
    g.fillStyle = '#0b0c0e';
    g.fillRect(L + 30, ry, 58, 26);
    g.textAlign = 'center';
    this.text(L + 59, ry + 18, `${rig.exposure} s`, C.ink, `13px ${MONO}`);
    g.textAlign = 'left';
    this.button(L + 92, ry, 26, 26, '+', () => a.exposure(1));
    const fs: Filter[] = ['L', 'R', 'G', 'B', 'Hα'];
    fs.forEach((f, i) => this.button(L + 134 + i * 45, ry, 42, 26, f, () => a.filter(f), { on: rig.filter === f }));
    const ry2 = ry + 34;
    this.button(L, ry2, 80, 26, rig.looping ? 'Stop' : 'Start', a.startStop, rig.looping ? { stop: true } : { primary: true });
    this.text(L + 92, ry2 + 18, `Stack ${v.subs}`, C.ink, `13px ${MONO}`);
    this.button(R - 64, ry2, 64, 26, 'Reset', a.reset);
    y = ry2 + 36;

    // Focus.
    y = this.head(y, 'Focus', `HFR ${v.hfr.toFixed(2)} px`);
    this.text(L, y + 22, `Position ${Math.round(rig.focus).toLocaleString()}`, C.ink, `13px ${MONO}`);
    this.button(R - 100, y + 6, 100, 26, rig.autofocus ? 'Focusing…' : 'Autofocus', a.autofocus, { primary: !rig.autofocus });
    this.vcurve(L, y + 40, R - L, 56);
    y += 106;

    // Guiding.
    const [, , tot] = guideRms();
    y = this.head(y, 'Guiding', rig.guiding ? `RMS ${tot.toFixed(2)}″` : 'off');
    this.guidePlot(L, y + 8, R - L - 90, 44);
    this.button(R - 80, y + 16, 80, 26, rig.guiding ? 'Guiding' : 'Guide', a.guide, { on: rig.guiding });
    y += 60;

    // Spectrum of the picked target.
    y = this.head(y, 'Spectrum', v.sel ? '' : 'click a star or galaxy');
    if (v.sel) {
      this.text(L, y + 19, v.sel.name, C.warm, `600 14px ${SANS}`);
      this.text(L, y + 37, v.sel.info, C.dim, `12px ${SANS}`);
      spectrumPlot(g, L, y + 46, R - L, 104, v.sel.run, v.sel.found);
      v.sel.lines.forEach((l, i) => this.text(L, y + 168 + i * 17, l, C.ink, `12px ${SANS}`));
      const found = rows(v.sel.found).filter((r) => r.found).map((r) => r.label);
      this.text(L, y + 168 + v.sel.lines.length * 17, found.length ? `Found: ${found.join(', ')}` : 'Found: nothing yet', C.dim, `12px ${SANS}`);
    }
    y += 230;

    // Image statistics.
    y = this.head(y, 'Image', `${v.stars} stars`);
    histPlot(g, L, y + 8, R - L, 40, v.stats.hist);
    this.text(L, y + 66, `Mean ${v.stats.mean.toFixed(0)}  Med ${v.stats.med.toFixed(0)}  σ ${v.stats.sd.toFixed(1)}  Max ${v.stats.max.toFixed(0)}`, C.dim, `12px ${MONO}`);
  }

  private vcurve(x: number, y: number, w: number, h: number): void {
    const g = this.g;
    g.fillStyle = '#0b0c0e';
    g.fillRect(x, y, w, h);
    if (!af.points.length) {
      this.text(x + 8, y + h / 2 + 4, 'Autofocus draws its V-curve here', C.faint, `12px ${SANS}`);
      return;
    }
    const xs = af.points.map((p) => p[0]), ys = af.points.map((p) => p[1]);
    const a0 = Math.min(...xs) - 30, a1 = Math.max(...xs) + 30, top = Math.max(...ys) * 1.15;
    const X = (p: number): number => x + 4 + ((p - a0) / (a1 - a0)) * (w - 8);
    const Y = (q: number): number => y + h - 4 - (q / top) * (h - 8);
    const f = af.fit;
    if (f) {
      g.strokeStyle = C.accent;
      g.beginPath();
      for (let i = 0; i <= 60; i++) {
        const p = a0 + ((a1 - a0) * i) / 60;
        const q = Math.sqrt(Math.max(0, f.a * (p - f.b) ** 2 + f.c));
        if (i === 0) g.moveTo(X(p), Y(q));
        else g.lineTo(X(p), Y(q));
      }
      g.stroke();
      g.strokeStyle = C.ok;
      g.beginPath();
      g.moveTo(X(f.b), y + 2);
      g.lineTo(X(f.b), y + h - 2);
      g.stroke();
    }
    g.fillStyle = C.warm;
    for (const [p, q] of af.points) g.fillRect(X(p) - 2, Y(q) - 2, 5, 5);
  }

  private guidePlot(x: number, y: number, w: number, h: number): void {
    const g = this.g;
    g.fillStyle = '#0b0c0e';
    g.fillRect(x, y, w, h);
    const mid = y + h / 2, k = (h / 2 - 3) / 4;
    g.fillStyle = '#3a3d46';
    g.fillRect(x, Math.round(mid), w, 1);
    const hist = rig.history;
    const line = (i: 0 | 1, colour: string): void => {
      g.strokeStyle = colour;
      g.beginPath();
      hist.forEach((v, n) => {
        const px = x + w - (hist.length - 1 - n) * (w / 119);
        const py = mid - Math.max(-4.2, Math.min(4.2, v[i])) * k;
        if (n === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      });
      g.stroke();
    };
    line(0, C.accent);
    line(1, C.bad);
  }
}

/* ---------- autofocus ---------- */
// Fits hfr² = A pos² + B pos + C by least squares.
// The hyperbola's centre is the best focus.
export function fitV(pts: [number, number][]): { a: number; b: number; c: number } | null {
  const x0 = pts[0][0];
  let s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, t0 = 0, t1 = 0, t2 = 0;
  for (const [p, h] of pts) {
    const x = (p - x0) / 100, y = h * h;
    s0++; s1 += x; s2 += x * x; s3 += x * x * x; s4 += x * x * x * x;
    t0 += y; t1 += x * y; t2 += x * x * y;
  }
  const det = (m: number[]): number => m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
  const D = det([s4, s3, s2, s3, s2, s1, s2, s1, s0]);
  if (Math.abs(D) < 1e-9) return null;
  const A = det([t2, s3, s2, t1, s2, s1, t0, s1, s0]) / D;
  const B = det([s4, t2, s2, s3, t1, s1, s2, t0, s0]) / D;
  const Cc = det([s4, s3, t2, s3, s2, t1, s2, s1, t0]) / D;
  if (A <= 0) return null;
  return { a: A / 1e4, b: x0 - (B / (2 * A)) * 100, c: Cc - (B * B) / (4 * A) };
}
