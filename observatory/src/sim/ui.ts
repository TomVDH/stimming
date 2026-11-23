// The 1 m's control software: a DOS-era text-mode program, 120 by 42 cells.
// It draws into a canvas the monitor's size; the renderer lays it over the image.
import { rig, guideRms, type Filter } from './rig.ts';
import { rows as elementRows } from './panel.ts';
import { BINS, L0, L1, isFound, lambdaAt, wavelengthRGB, type Found, type Run } from './spectrum.ts';

// The virtual monitor in pixels.
export const SW = 1440;
export const SH = 900;
// One text cell, and the grid's top margin.
const CW = 12, CH = 21, COLS = 120, ROWS = 42, OY = 9;
// The camera image's place on the monitor: inside the IMAGE box.
export const IMG = { x: CW * 1, y: OY + CH * 2, w: CW * 82, h: CH * 30 };

// The VGA palette.
const V = {
  black: '#000000', blue: '#0000aa', cyan: '#00aaaa', grey: '#aaaaaa', dark: '#555555',
  bcyan: '#55ffff', yellow: '#ffff55', green: '#55ff55', red: '#ff5555', white: '#ffffff', magenta: '#ff55ff',
};
const FONT = '18px "Lucida Console", Consolas, "Courier New", monospace';

export type Target = { name: string; note: string };
export type View = {
  clock: string; lst: string; ha: string;
  ra: string; dec: string; alt: string; az: string; air: string;
  state: string; progress: number; subs: number; temp: string;
  zoom: string; stars: number; hfr: number; seeing: string;
  stats: { mean: number; med: number; sd: number; max: number; hist: number[] };
  targets: Target[];
  // The image overlay, in monitor px.
  centre: [number, number]; detected: [number, number][]; box: [number, number] | null;
  bar: { px: number; label: string }; banner: string; time: number; still: boolean;
  sel: { name: string; info: string; run: Run | null; found: Found[]; lines: string[] } | null;
  // The help window under the pointer, in monitor px, or null.
  // tries: the lines of its Try, drawn apart in yellow.
  tip: { title: string; lines: string[]; tries: string[]; at: [number, number] } | null;
  tipsOn: boolean;
};
export type Actions = {
  fit(): void; one(): void; zoom(f: number): void;
  goto(i: number): void; startStop(): void; exposure(dir: number): void; filter(f: Filter): void; reset(): void;
  autofocus(): void; guide(): void; night(): void; stars(): void; slewSelected(): void;
  track(): void; cooler(dir: number): void; tips(): void; focusStep(dir: number): void;
};
// The help window's text width in cells.
export const TIP_COLS = 44;

/* ---------- the log ---------- */
const lines: { t: string; text: string; cls: string }[] = [];
const pad = (n: number): string => String(n).padStart(2, '0');

// The log's text, for the QA hook.
export const logText = (): string[] => lines.map((l) => l.text);

export function log(text: string, cls = ''): void {
  const d = new Date();
  lines.push({ t: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`, text, cls });
  if (lines.length > 60) lines.shift();
}

/* ---------- autofocus data ---------- */
export const af = { points: [] as [number, number][], fit: null as null | { a: number; b: number; c: number } };

type Hit = { x: number; y: number; w: number; h: number; act: () => void };
type Region = { x: number; y: number; w: number; h: number; id: string };

const cx = (c: number): number => c * CW;
const cy = (r: number): number => OY + r * CH;

export class Screen {
  readonly canvas = document.createElement('canvas');
  private g: CanvasRenderingContext2D;
  private hits: Hit[] = [];
  // The areas that have a tip; the last one drawn wins.
  private regions: Region[] = [];
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

  // The tip id at a point, from the last draw.
  tipAt(x: number, y: number): string | null {
    for (let i = this.regions.length - 1; i >= 0; i--) {
      const h = this.regions[i];
      if (x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h) return h.id;
    }
    return null;
  }

  // Gives n cells over rows rows a tip.
  private tip(c: number, r: number, n: number, id: string, rows = 1): void {
    this.regions.push({ x: cx(c), y: cy(r), w: n * CW, h: rows * CH, id });
  }

  private over(c: number, r: number, n: number): boolean {
    const [hx, hy] = this.hover;
    return hx >= cx(c) && hx < cx(c + n) && hy >= cy(r) && hy < cy(r + 1);
  }

  // Text in cells: one glyph per cell, as a text mode draws it.
  private put(c: number, r: number, s: string, fg: string = V.grey, bg?: string): void {
    const g = this.g;
    const chars = [...s];
    if (bg) {
      g.fillStyle = bg;
      g.fillRect(cx(c), cy(r), chars.length * CW, CH);
    }
    g.fillStyle = fg;
    g.font = FONT;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    chars.forEach((ch, i) => {
      if (ch !== ' ') g.fillText(ch, cx(c + i) + CW / 2, cy(r) + CH / 2 + 1);
    });
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
  }

  // A clickable label: inverse video under the pointer, or when on.
  private key(c: number, r: number, s: string, act: () => void, on = false, fg: string = V.white, id = ''): number {
    const n = [...s].length;
    const hot = this.over(c, r, n);
    this.put(c, r, s, hot || on ? V.black : fg, hot ? V.bcyan : on ? V.cyan : undefined);
    this.hits.push({ x: cx(c), y: cy(r), w: n * CW, h: CH, act });
    if (id) this.tip(c, r, n, id);
    return c + n;
  }

  // A double-line box on cell centres, with a title on its top edge.
  private box(c0: number, r0: number, c1: number, r1: number, title = '', colour: string = V.cyan): void {
    const g = this.g;
    const x0 = cx(c0) + CW / 2, y0 = cy(r0) + CH / 2, x1 = cx(c1) + CW / 2, y1 = cy(r1) + CH / 2;
    g.strokeStyle = colour;
    g.lineWidth = 2;
    for (const d of [-2, 2]) {
      g.strokeRect(Math.round(x0 + d) + 0.5, Math.round(y0 + d) + 0.5, Math.round(x1 - x0 - 2 * d), Math.round(y1 - y0 - 2 * d));
    }
    if (title) this.put(c0 + 2, r0, ` ${title} `, V.black, colour);
  }

  draw(v: View, a: Actions): void {
    const g = this.g;
    this.hits = [];
    this.regions = [];
    g.clearRect(0, 0, SW, SH);
    // Text mode: black everywhere but the image.
    g.fillStyle = V.black;
    g.fillRect(0, 0, SW, IMG.y);
    g.fillRect(0, IMG.y, IMG.x, IMG.h);
    g.fillRect(IMG.x + IMG.w, IMG.y, SW - IMG.x - IMG.w, IMG.h);
    g.fillRect(0, IMG.y + IMG.h, SW, SH - IMG.y - IMG.h);
    this.titleBar(v);
    this.imageBox(v, a);
    this.logBox();
    this.telescope(v, a);
    this.camera(v, a);
    this.focus(v, a);
    this.targets(v, a);
    this.spectrum(v, a);
    this.keyBar(a, v.tipsOn);
    if (v.tip) this.help(v.tip);
  }

  // The help window: white on blue, with a shadow, as old DOS help drew it.
  private help(t: NonNullable<View['tip']>): void {
    const g = this.g;
    const extra = t.tries.length ? t.tries.length + 1 : 0;
    const w = TIP_COLS + 4, h = t.lines.length + extra + 2;
    const pc = Math.floor(t.at[0] / CW), pr = Math.floor((t.at[1] - OY) / CH);
    // Below and right of the pointer; else left of it, or above it.
    let c = pc + 2, r = pr + 1;
    if (c + w + 1 > COLS) c = Math.max(0, pc - w - 1);
    if (r + h + 1 > ROWS - 1) r = Math.max(1, pr - h);
    g.fillStyle = 'rgba(0, 0, 0, 0.75)';
    g.fillRect(cx(c + 1), cy(r + 1), w * CW, h * CH);
    g.fillStyle = V.blue;
    g.fillRect(cx(c), cy(r), w * CW, h * CH);
    this.box(c, r, c + w - 1, r + h - 1, '', V.white);
    this.put(c + 2, r, ` ${t.title} `, V.yellow, V.blue);
    t.lines.forEach((l, i) => this.put(c + 2, r + 1 + i, l, V.white, V.blue));
    // The Try sits after a blank row, in yellow.
    t.tries.forEach((l, i) => this.put(c + 2, r + 2 + t.lines.length + i, l, V.yellow, V.blue));
  }

  private titleBar(v: View): void {
    this.put(0, 0, ' '.repeat(COLS), V.black, V.cyan);
    this.put(1, 0, 'OBSCTL 3.2', V.black, V.cyan);
    this.put(13, 0, '│ 1.0 m f/3 Ritchey-Chretien · cooled CCD · obs-ctl-01', V.black, V.cyan);
    this.put(78, 0, `UTC ${v.clock}  LST ${v.lst}`, V.black, V.cyan);
    this.tip(78, 0, 26, 'title');
    this.put(106, 0, 'ROOF:OPEN', V.blue, V.cyan);
    this.tip(106, 0, 9, 'roof');
  }

  private imageBox(v: View, a: Actions): void {
    const g = this.g;
    this.box(0, 1, 83, 32, `IMAGE · ${rig.filter} · ${rig.exposure} s · stack ${v.subs}`);
    this.tip(0, 1, 40, 'image');
    // Zoom and overlay keys on the top border, right side.
    let c = 42;
    c = this.key(c, 1, '[Fit]', a.fit, false, V.white, 'fit') + 1;
    c = this.key(c, 1, '[1:1]', a.one, false, V.white, 'one') + 1;
    c = this.key(c, 1, '[-]', () => a.zoom(1 / 1.5), false, V.white, 'zoom') + 1;
    c = this.key(c, 1, '[+]', () => a.zoom(1.5), false, V.white, 'zoom') + 1;
    this.put(c, 1, ` ${v.zoom} `.padEnd(10), V.yellow, V.black);
    this.tip(c, 1, 10, 'zoom');
    this.key(74, 1, '[Stars]', a.stars, rig.overlay.stars, V.white, 'starsOverlay');
    // Statistics on the bottom border.
    const s = v.stats;
    this.put(2, 32, ` MEAN ${s.mean.toFixed(0).padStart(5)}  MED ${s.med.toFixed(0).padStart(5)}  SD ${s.sd.toFixed(1).padStart(6)}  MAX ${s.max.toFixed(0).padStart(5)}  HFR ${v.hfr.toFixed(2)}  STARS ${String(v.stars).padStart(4)} `, V.yellow, V.black);
    this.tip(2, 32, 80, 'stats');
    // The overlay, in graphics.
    const { x: x0, y: y0, w, h } = IMG;
    g.save();
    g.beginPath();
    g.rect(x0, y0, w, h);
    g.clip();
    const [ox, oy] = v.centre;
    g.strokeStyle = 'rgba(255, 85, 85, 0.6)';
    g.lineWidth = 1;
    g.setLineDash([6, 4]);
    g.beginPath();
    g.moveTo(x0, Math.round(oy) + 0.5); g.lineTo(x0 + w, Math.round(oy) + 0.5);
    g.moveTo(Math.round(ox) + 0.5, y0); g.lineTo(Math.round(ox) + 0.5, y0 + h);
    g.stroke();
    g.setLineDash([]);
    g.strokeRect(Math.round(ox) - 20.5, Math.round(oy) - 20.5, 41, 41);
    if (rig.overlay.stars) {
      g.strokeStyle = V.green;
      for (const [x, y] of v.detected.slice(0, 500)) g.strokeRect(Math.round(x) - 6.5, Math.round(y) - 6.5, 13, 13);
    }
    if (v.box) {
      g.strokeStyle = V.yellow;
      const [bx, by] = v.box;
      g.beginPath();
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        g.moveTo(bx + sx * 16, by + sy * 8); g.lineTo(bx + sx * 16, by + sy * 16); g.lineTo(bx + sx * 8, by + sy * 16);
      }
      g.stroke();
    }
    // The scale bar, bottom left.
    g.fillStyle = V.white;
    g.fillRect(x0 + 12, y0 + h - 14, Math.round(v.bar.px), 2);
    g.restore();
    this.put(1, 30, ` ${v.bar.label} `, V.white);
    this.put(77, 2, 'N ↑', V.white);
    this.put(77, 3, 'E ←', V.white);
    if (v.banner && (v.still || Math.floor(v.time * 2) % 2 === 0)) {
      const t = `*** ${v.banner} ***`;
      this.put(42 - Math.floor(t.length / 2), 3, t, V.yellow, V.black);
    }
  }

  private logBox(): void {
    this.box(0, 33, 83, 40, 'LOG');
    this.tip(0, 33, 84, 'log', 8);
    lines.slice(-6).forEach((l, i) => {
      const fg = l.cls === 'w' ? V.yellow : l.cls === 'ok' ? V.green : l.cls === 'tip' ? V.bcyan : V.grey;
      this.put(2, 34 + i, l.t, V.dark);
      this.put(11, 34 + i, l.text.slice(0, 71), fg);
    });
  }

  private telescope(v: View, a: Actions): void {
    this.box(84, 1, 119, 7, 'TELESCOPE');
    const [, , tot] = guideRms();
    this.put(86, 2, 'RA ', V.grey); this.put(89, 2, v.ra, V.yellow);
    this.tip(86, 2, 18, 'radec', 2);
    this.put(104, 2, 'HA ', V.grey); this.put(107, 2, v.ha, V.yellow);
    this.tip(104, 2, 15, 'ha');
    this.put(86, 3, 'DEC', V.grey); this.put(90, 3, v.dec, V.yellow);
    this.put(86, 4, 'ALT', V.grey); this.put(90, 4, v.alt.padStart(6), V.yellow);
    this.put(98, 4, 'AZ', V.grey); this.put(101, 4, v.az.padStart(6), V.yellow);
    this.put(109, 4, 'X', V.grey); this.put(111, 4, v.air, V.yellow);
    this.tip(86, 4, 33, 'altaz');
    this.put(86, 5, 'TRACK', V.grey);
    this.tip(86, 5, 6, 'track');
    // A slew owns the mount; else the mode is a toggle.
    if (rig.slew) { this.put(92, 5, 'SLEWING', V.yellow); this.tip(92, 5, 8, 'track'); }
    else this.key(92, 5, rig.tracking ? 'SIDEREAL' : 'OFF     ', a.track, false, rig.tracking ? V.green : V.red, 'track');
    this.put(104, 5, 'SEEING', V.grey); this.put(111, 5, v.seeing, V.yellow);
    this.tip(104, 5, 15, 'seeing');
    this.put(86, 6, 'GUIDE', V.grey);
    this.key(92, 6, rig.guiding ? `ON  RMS ${tot.toFixed(2)}"` : 'OFF  open loop', a.guide, false, rig.guiding ? V.green : V.red, 'guide');
    this.tip(86, 6, 6, 'guide');
  }

  private camera(v: View, a: Actions): void {
    this.box(84, 8, 119, 14, 'CAMERA');
    this.put(86, 9, v.state.slice(0, 32).padEnd(32), rig.looping ? V.white : V.grey);
    // A block progress bar, 30 cells.
    const n = Math.round(v.progress * 30);
    this.put(86, 10, '█'.repeat(n) + '░'.repeat(30 - n), V.cyan);
    this.tip(86, 9, 32, 'state', 2);
    this.put(86, 11, 'EXP', V.grey);
    const c = this.key(90, 11, '<', () => a.exposure(-1), false, V.white, 'exposure');
    this.put(c, 11, ` ${String(rig.exposure).padStart(2)} s `, V.yellow);
    this.key(c + 6, 11, '>', () => a.exposure(1), false, V.white, 'exposure');
    this.tip(86, 11, 4, 'exposure');
    this.tip(c, 11, 6, 'exposure');
    this.put(101, 11, 'STACK', V.grey);
    this.put(107, 11, String(v.subs).padStart(3), V.yellow);
    this.tip(101, 11, 9, 'stack');
    this.key(111, 11, '[Rst]', a.reset, false, V.white, 'stack');
    this.put(86, 12, 'FILTER', V.grey);
    this.tip(86, 12, 7, 'filter');
    let fc = 93;
    for (const f of ['L', 'R', 'G', 'B', 'Hα'] as Filter[]) fc = this.key(fc, 12, f === 'Hα' ? ' Hα ' : ` ${f} `, () => a.filter(f), rig.filter === f, V.white, 'filter') + 1;
    // The sensor's temperature, then the cooler's set point.
    this.put(86, 13, 'CCD', V.grey);
    this.put(90, 13, v.temp, V.yellow);
    this.tip(86, 13, 10, 'ccd');
    this.put(97, 13, 'SET', V.grey);
    this.key(101, 13, '<', () => a.cooler(-1), false, V.white, 'cooler');
    this.put(102, 13, `${rig.coolerSet < 0 ? '−' : '+'}${String(Math.abs(rig.coolerSet)).padStart(2)}`, V.yellow);
    this.key(105, 13, '>', () => a.cooler(1), false, V.white, 'cooler');
    this.tip(97, 13, 4, 'cooler');
    this.tip(102, 13, 3, 'cooler');
    this.key(108, 13, rig.looping ? '[ STOP]' : '[START]', a.startStop, false, rig.looping ? V.red : V.green, 'start');
  }

  private focus(v: View, a: Actions): void {
    const g = this.g;
    this.box(84, 15, 119, 19, 'FOCUS');
    this.put(86, 16, 'POS', V.grey);
    // The focuser moves by hand with < and >.
    this.key(89, 16, '<', () => a.focusStep(-1), false, V.white, 'focus');
    this.put(90, 16, String(Math.round(rig.focus)).padStart(6), V.yellow);
    this.key(96, 16, '>', () => a.focusStep(1), false, V.white, 'focus');
    this.put(98, 16, 'HFR', V.grey);
    this.put(102, 16, `${v.hfr.toFixed(2)}`, V.yellow);
    this.tip(86, 16, 21, 'focus');
    this.key(108, 16, rig.autofocus ? '[ ... ]' : '[AUTO ]', a.autofocus, rig.autofocus, V.white, 'autofocus');
    this.tip(86, 17, 32, 'vcurve', 2);
    // The V-curve, in graphics, two rows high.
    const x = cx(86), y = cy(17) + 2, w = cx(118) - x, h = CH * 2 - 4;
    g.fillStyle = '#000';
    g.fillRect(x, y, w, h);
    g.strokeStyle = V.dark;
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    if (!af.points.length) {
      this.put(88, 17, 'no V-curve: press F6', V.dark);
      return;
    }
    const xs = af.points.map((p) => p[0]), ys = af.points.map((p) => p[1]);
    const a0 = Math.min(...xs) - 30, a1 = Math.max(...xs) + 30, top = Math.max(...ys) * 1.1;
    const X = (p: number): number => x + 3 + ((p - a0) / (a1 - a0)) * (w - 6);
    const Y = (q: number): number => y + h - 3 - (q / top) * (h - 6);
    const f = af.fit;
    if (f) {
      g.strokeStyle = V.bcyan;
      g.beginPath();
      for (let i = 0; i <= 60; i++) {
        const p = a0 + ((a1 - a0) * i) / 60;
        const q = Math.sqrt(Math.max(0, f.a * (p - f.b) ** 2 + f.c));
        if (i === 0) g.moveTo(X(p), Y(q));
        else g.lineTo(X(p), Y(q));
      }
      g.stroke();
      g.fillStyle = V.green;
      g.fillRect(Math.round(X(f.b)), y + 2, 1, h - 4);
    }
    g.fillStyle = V.yellow;
    for (const [p, q] of af.points) g.fillRect(Math.round(X(p)) - 2, Math.round(Y(q)) - 2, 4, 4);
  }

  private targets(v: View, a: Actions): void {
    this.box(84, 20, 119, 27, 'TARGETS · key 1-6');
    this.tip(84, 20, 36, 'targets');
    v.targets.slice(0, 6).forEach((t, i) => {
      const r = 21 + i;
      const hot = this.over(85, r, 34);
      if (hot) this.put(85, r, ' '.repeat(34), V.black, V.bcyan);
      const fg = hot ? V.black : V.white;
      this.put(86, r, `${i + 1}`, hot ? V.black : V.yellow, hot ? V.bcyan : undefined);
      this.put(88, r, t.name.slice(0, 17), fg, hot ? V.bcyan : undefined);
      this.put(118 - t.note.length, r, t.note, hot ? V.black : V.grey, hot ? V.bcyan : undefined);
      this.hits.push({ x: cx(85), y: cy(r), w: 34 * CW, h: CH, act: () => a.goto(i) });
    });
  }

  private spectrum(v: View, a: Actions): void {
    const g = this.g;
    this.box(84, 28, 119, 40, 'SPECTROGRAPH');
    this.tip(84, 28, 36, 'spectro', 13);
    const s = v.sel;
    if (!s) {
      this.put(86, 30, 'No target.', V.grey);
      this.put(86, 31, 'Click a star or a galaxy', V.dark);
      this.put(86, 32, 'in the image to observe it.', V.dark);
      return;
    }
    this.put(86, 29, s.name.slice(0, 22), V.white);
    this.key(110, 29, '[SLEW]', a.slewSelected, false, V.white, 'slew');
    this.put(86, 30, s.info.slice(0, 32), V.grey);
    // The plot: a colour strip, then the trace, in graphics.
    const x = cx(86), y = cy(31) + 3, w = cx(118) - x, h = CH * 4 - 6;
    const stripH = 12, top = y + stripH + 3, ph = h - stripH - 3;
    g.fillStyle = '#000';
    g.fillRect(x, y, w, h);
    const X = (l: number): number => x + ((l - L0) / (L1 - L0)) * w;
    if (s.run && s.run.time > 0) {
      const sp = s.run.now;
      for (let px = 0; px < w; px++) {
        const i = Math.min(BINS - 1, Math.round((px / w) * (BINS - 1)));
        const [r, gg, b] = wavelengthRGB(lambdaAt(i));
        const val = Math.max(0, Math.min(1, sp[i]));
        g.fillStyle = `rgb(${(r * val * 255) | 0},${(gg * val * 255) | 0},${(b * val * 255) | 0})`;
        g.fillRect(x + px, y, 1, stripH);
      }
      // Found lines first, so the trace draws over them.
      for (const f of s.found.filter(isFound)) {
        g.fillStyle = f.emission ? V.magenta : f.el === 'O₂' ? V.dark : V.cyan;
        g.fillRect(Math.round(X(f.l)), top, 1, ph);
      }
      g.strokeStyle = V.yellow;
      g.lineWidth = 1;
      g.beginPath();
      for (let i = 0; i < BINS; i += 2) {
        const px = X(lambdaAt(i)), py = top + ph - (Math.max(0, Math.min(1.15, sp[i])) / 1.15) * ph;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.stroke();
    }
    g.strokeStyle = V.dark;
    g.strokeRect(x + 0.5, top + 0.5, w - 1, ph - 1);
    // Each wavelength label sits on its own column of the plot.
    for (const l of [400, 500, 600, 700]) this.put(86 + Math.round(((l - L0) / (L1 - L0)) * 32) - 1, 35, String(l), V.dark);
    s.lines.slice(0, 3).forEach((l, i) => this.put(86, 36 + i, l.slice(0, 32), i === 0 ? V.grey : V.white));
    const found = elementRows(s.found).filter((r) => r.found).map((r) => r.el);
    this.put(86, 39, `FOUND ${found.length ? found.join(' ') : '-'}`.slice(0, 32), V.green);
  }

  private keyBar(a: Actions, tipsOn: boolean): void {
    let c = 0;
    const r = ROWS - 1;
    this.put(0, r, ' '.repeat(COLS), V.black, V.black);
    // The labels sit on cyan, as in the old file managers.
    const bar = (num: string, label: string, act: () => void, id: string): void => {
      this.put(c, r, num, V.white, V.black);
      c += num.length;
      const n = label.length;
      const hot = this.over(c, r, n);
      this.put(c, r, label, V.black, hot ? V.bcyan : V.cyan);
      this.hits.push({ x: cx(c), y: cy(r), w: n * CW, h: CH, act });
      this.tip(c - num.length, r, n + num.length, id);
      c += n + 1;
    };
    bar('F1', tipsOn ? 'No tips ' : 'Tips    ', a.tips, 'tips');
    bar('F2', 'Slew    ', a.slewSelected, 'slew');
    bar('F3', rig.looping ? 'Stop    ' : 'Expose  ', a.startStop, 'start');
    bar('F4', 'Filter  ', () => {
      const fs: Filter[] = ['L', 'R', 'G', 'B', 'Hα'];
      a.filter(fs[(fs.indexOf(rig.filter) + 1) % fs.length]);
    }, 'filter');
    bar('F6', 'Focus   ', a.autofocus, 'autofocus');
    bar('F8', rig.guiding ? 'Unguide ' : 'Guide   ', a.guide, 'guide');
    bar('F9', this.night ? 'Day     ' : 'Night   ', a.night, 'night');
    this.put(c + 1, r, '+/- zoom  F fit  Z 1:1  T track  1-6 go', V.grey);
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
