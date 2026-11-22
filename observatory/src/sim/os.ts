// The 1 m reflector's operator screen: panels, plots, the log and autofocus.
// It reads and writes the rig; main.ts renders the image.
import { rig, guideRms, type Filter } from './rig.ts';
import { drawHistogram } from './panel.ts';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`os: missing #${id}`);
  return el as T;
};

export type Hooks = {
  wake(): void;
  // reset starts a new stack; reframe keeps it but redraws the crop.
  restack(kind: 'reset' | 'reframe'): void;
  zoomBy(f: number): void;
  fit(): void;
  oneToOne(): void;
  // Resolves typed text to a slew; false when nothing matches.
  goto(text: string): boolean;
  slewToSelected(): boolean;
  // The HFR a short frame at this focuser position would measure.
  measure(pos: number): number;
};

export type Info = {
  ra: string; dec: string; alt: string; az: string; lst: string; air: string;
  state: string; progress: number; subs: number; scale: string; zoom: string;
  mean: string; med: string; sd: string; max: string; hfr: string; stars: string;
  hist: number[];
};

let hooks: Hooks;
const logEl = $<HTMLElement>('log');
const lines: HTMLElement[] = [];

const pad = (n: number): string => String(n).padStart(2, '0');
const stamp = (): string => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

// Adds one line to the log; cls marks warnings and successes.
export function log(text: string, cls = ''): void {
  const row = document.createElement('div');
  const t = document.createElement('span');
  t.className = 't';
  t.textContent = `${stamp()}  `;
  const m = document.createElement('span');
  if (cls) m.className = cls;
  m.textContent = text;
  row.append(t, m);
  logEl.append(row);
  lines.push(row);
  if (lines.length > 200) lines.shift()?.remove();
  logEl.scrollTop = logEl.scrollHeight;
}

function press(btn: HTMLElement, on: boolean): void {
  btn.setAttribute('aria-pressed', String(on));
}

/* ---------- autofocus ---------- */
let afPoints: [number, number][] = [];
let afFit: { a: number; b: number; c: number } | null = null;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// Fits hfr² = A pos² + B pos + C by least squares.
// The hyperbola's centre is the best focus.
function fitV(pts: [number, number][]): { a: number; b: number; c: number } | null {
  const x0 = pts[0][0];
  let s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, t0 = 0, t1 = 0, t2 = 0;
  for (const [p, h] of pts) {
    const x = (p - x0) / 100, y = h * h;
    s0++; s1 += x; s2 += x * x; s3 += x * x * x; s4 += x * x * x * x;
    t0 += y; t1 += x * y; t2 += x * x * y;
  }
  // Solves the 3 by 3 normal equations with Cramer's rule.
  const det = (m: number[]): number => m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
  const M = [s4, s3, s2, s3, s2, s1, s2, s1, s0];
  const D = det(M);
  if (Math.abs(D) < 1e-9) return null;
  const A = det([t2, s3, s2, t1, s2, s1, t0, s1, s0]) / D;
  const B = det([s4, t2, s2, s3, t1, s1, s2, t0, s0]) / D;
  const C = det([s4, s3, t2, s3, s2, t1, s2, s1, t0]) / D;
  if (A <= 0) return null;
  return { a: A / 1e4, b: x0 - (B / (2 * A)) * 100, c: C - (B * B) / (4 * A) };
}

async function autofocus(btn: HTMLButtonElement): Promise<void> {
  if (rig.autofocus) return;
  rig.autofocus = true;
  btn.disabled = true;
  const wasLooping = rig.looping;
  rig.looping = false;
  afPoints = [];
  afFit = null;
  const start = Math.round(rig.focus);
  log(`Autofocus: 9 points around ${start.toLocaleString()}, 60 steps apart`);
  for (let i = -4; i <= 4; i++) {
    rig.focus = start + i * 60;
    hooks.restack('reset');
    hooks.wake();
    await sleep(700);
    const h = hooks.measure(rig.focus);
    afPoints.push([rig.focus, h]);
    log(`AF ${i + 5}/9  ${rig.focus.toLocaleString()}  HFR ${h.toFixed(2)} px`);
    drawV();
  }
  afFit = fitV(afPoints);
  if (afFit && afFit.b > start - 600 && afFit.b < start + 600) {
    rig.focus = Math.round(afFit.b);
    log(`Autofocus done: ${rig.focus.toLocaleString()}, HFR ${Math.sqrt(afFit.c).toFixed(2)} px`, 'ok');
  } else {
    rig.focus = start;
    log('Autofocus failed: no clear minimum. Back at the start.', 'w');
  }
  hooks.restack('reset');
  rig.autofocus = false;
  rig.looping = wasLooping;
  btn.disabled = false;
  drawV();
  hooks.wake();
}

/* ---------- plots ---------- */
function ctx(c: HTMLCanvasElement): [CanvasRenderingContext2D, number, number] | null {
  const dpr = window.devicePixelRatio || 1;
  const w = c.clientWidth, h = c.clientHeight;
  if (!w || !h) return null;
  if (c.width !== Math.round(w * dpr)) {
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
  }
  const g = c.getContext('2d');
  if (!g) return null;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  return [g, w, h];
}

function drawV(): void {
  const r = ctx($<HTMLCanvasElement>('vcurve'));
  if (!r) return;
  const [g, w, h] = r;
  g.font = '10px Consolas, monospace';
  if (afPoints.length === 0) {
    g.fillStyle = '#5d636e';
    g.fillText('Run autofocus to see the V-curve', 8, h / 2 + 3);
    return;
  }
  const xs = afPoints.map((p) => p[0]), ys = afPoints.map((p) => p[1]);
  const x0 = Math.min(...xs) - 30, x1 = Math.max(...xs) + 30;
  const y1 = Math.max(...ys) * 1.15;
  const X = (p: number): number => 6 + ((p - x0) / (x1 - x0)) * (w - 12);
  const Y = (v: number): number => h - 12 - (v / y1) * (h - 20);
  if (afFit) {
    g.strokeStyle = '#5aa2e6';
    g.beginPath();
    for (let i = 0; i <= 60; i++) {
      const p = x0 + ((x1 - x0) * i) / 60;
      const v = Math.sqrt(Math.max(0, afFit.a * (p - afFit.b) ** 2 + afFit.c));
      if (i === 0) g.moveTo(X(p), Y(v));
      else g.lineTo(X(p), Y(v));
    }
    g.stroke();
    g.strokeStyle = '#5cc27a';
    g.beginPath();
    g.moveTo(X(afFit.b), 4);
    g.lineTo(X(afFit.b), h - 12);
    g.stroke();
  }
  g.fillStyle = '#e8b46a';
  for (const [p, v] of afPoints) g.fillRect(X(p) - 2, Y(v) - 2, 4, 4);
  g.fillStyle = '#8b919c';
  g.fillText(`${Math.round(x0 + 30)}`, 4, h - 2);
  g.textAlign = 'right';
  g.fillText(`${Math.round(x1 - 30)}`, w - 4, h - 2);
  g.textAlign = 'left';
}

function drawGuide(): void {
  const r = ctx($<HTMLCanvasElement>('guide-plot'));
  if (!r) return;
  const [g, w, h] = r;
  const mid = h / 2, k = (h / 2 - 4) / 4;
  g.strokeStyle = '#2c2e33';
  g.beginPath();
  for (const v of [-2, 2]) {
    g.moveTo(0, mid - v * k);
    g.lineTo(w, mid - v * k);
  }
  g.stroke();
  g.strokeStyle = '#4a4e57';
  g.beginPath();
  g.moveTo(0, mid);
  g.lineTo(w, mid);
  g.stroke();
  const hist = rig.history;
  const line = (i: 0 | 1, colour: string): void => {
    g.strokeStyle = colour;
    g.beginPath();
    hist.forEach((v, n) => {
      const x = w - (hist.length - 1 - n) * (w / 119);
      const y = mid - Math.max(-4.2, Math.min(4.2, v[i])) * k;
      if (n === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    });
    g.stroke();
  };
  line(0, '#5aa2e6');
  line(1, '#e06456');
}

/* ---------- the per-frame update ---------- */
const set = (id: string, text: string): void => {
  const el = document.getElementById(id);
  if (el && el.textContent !== text) el.textContent = text;
};

export function frameOS(info: Info): void {
  set('m-ra', info.ra);
  set('m-dec', info.dec);
  set('m-alt', info.alt);
  set('m-az', info.az);
  set('m-lst', info.lst);
  set('m-air', info.air);
  set('mount-state', rig.slew ? 'Slewing' : rig.jog.n || rig.jog.e ? 'Jogging' : rig.tracking ? 'Tracking' : 'Stopped');
  set('cam-state', info.state);
  $<HTMLElement>('cam-progress').style.width = `${Math.round(info.progress * 100)}%`;
  set('stack-count', `${info.subs} sub${info.subs === 1 ? '' : 's'}`);
  set('cam-temp', `${rig.sensorTemp >= 0 ? '+' : '−'}${Math.abs(rig.sensorTemp).toFixed(1)} °C`);
  set('cam-power', `${Math.round(rig.coolerPower)}%`);
  set('cam-scale', info.scale);
  set('z-read', info.zoom);
  set('foc-pos', Math.round(rig.focus).toLocaleString());
  set('foc-state', rig.autofocus ? 'Autofocus' : `HFR ${info.hfr}`);
  const [ra, dec, tot] = guideRms();
  set('guide-state', rig.guiding ? `RMS ${tot.toFixed(2)}″ (RA ${ra.toFixed(2)}, Dec ${dec.toFixed(2)})` : 'Not guiding');
  set('img-state', `${info.stars} stars`);
  set('s-mean', info.mean);
  set('s-med', info.med);
  set('s-sd', info.sd);
  set('s-max', info.max);
  set('s-hfr', `${info.hfr} px`);
  set('s-stars', info.stars);
  const now = new Date();
  set('clock', `UTC ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}  LST ${info.lst}`);
  drawGuide();
  drawHistogram($<HTMLCanvasElement>('histogram'), info.hist);
}

// The weather mast: slow changes, all within safe limits.
function weather(): void {
  const t = Date.now() / 60000;
  const temp = 4.2 - 0.4 * Math.sin(t / 17), rh = 58 + 6 * Math.sin(t / 23), wind = 3 + 1.5 * Math.sin(t / 3.1);
  set('weather', '');
  const el = $<HTMLElement>('weather');
  el.innerHTML = '';
  const dot = document.createElement('span');
  dot.className = 'dot';
  el.append(dot, `Safe · ${temp.toFixed(1)} °C · RH ${Math.round(rh)}% · ${wind.toFixed(1)} m/s · SQM 21.0`);
}

export function initOS(h: Hooks, names: string[]): void {
  hooks = h;
  // Zoom and overlays.
  $<HTMLButtonElement>('z-fit').addEventListener('click', () => hooks.fit());
  $<HTMLButtonElement>('z-one').addEventListener('click', () => hooks.oneToOne());
  $<HTMLButtonElement>('z-in').addEventListener('click', () => hooks.zoomBy(1.5));
  $<HTMLButtonElement>('z-out').addEventListener('click', () => hooks.zoomBy(1 / 1.5));
  for (const [id, key] of [['o-cross', 'cross'], ['o-stars', 'stars'], ['o-labels', 'labels']] as const) {
    const b = $<HTMLButtonElement>(id);
    b.addEventListener('click', () => {
      rig.overlay[key] = !rig.overlay[key];
      press(b, rig.overlay[key]);
      hooks.wake();
    });
  }
  // Camera.
  const loop = $<HTMLButtonElement>('loop');
  const showLoop = (): void => {
    loop.textContent = rig.looping ? 'Stop' : 'Start';
    loop.className = rig.looping ? 'stop' : 'primary';
  };
  loop.addEventListener('click', () => {
    rig.looping = !rig.looping;
    showLoop();
    log(rig.looping ? `Exposures started: ${rig.exposure} s, ${rig.filter}` : 'Exposures stopped');
    hooks.wake();
  });
  showLoop();
  $<HTMLSelectElement>('exposure').addEventListener('change', (e) => {
    rig.exposure = Number((e.target as HTMLSelectElement).value);
    log(`Exposure set to ${rig.exposure} s`);
    hooks.restack('reset');
  });
  const filters = $<HTMLElement>('filters');
  for (const b of filters.querySelectorAll<HTMLButtonElement>('button')) {
    b.addEventListener('click', () => {
      const f = b.dataset.f as Filter;
      if (f === rig.filter) return;
      log(`Filter wheel: ${rig.filter} → ${f}`);
      rig.filter = f;
      for (const o of filters.querySelectorAll<HTMLButtonElement>('button')) press(o, o === b);
      hooks.restack('reset');
    });
  }
  $<HTMLInputElement>('livestack').addEventListener('change', (e) => {
    rig.liveStack = (e.target as HTMLInputElement).checked;
    hooks.restack('reset');
  });
  $<HTMLButtonElement>('restack').addEventListener('click', () => {
    log('Stack reset');
    hooks.restack('reset');
  });
  // Mount: a held button jogs; letting go stops.
  const rate = $<HTMLSelectElement>('jog-rate');
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-jog]')) {
    const dir = b.dataset.jog!;
    const go = (e: PointerEvent): void => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      const v = Number(rate.value);
      rig.slew = null;
      rig.jog.n = dir === 'N' ? v : dir === 'S' ? -v : 0;
      rig.jog.e = dir === 'E' ? v : dir === 'W' ? -v : 0;
      hooks.wake();
    };
    const stop = (): void => {
      if (rig.jog.n || rig.jog.e) hooks.restack('reset');
      rig.jog.n = rig.jog.e = 0;
    };
    b.addEventListener('pointerdown', go);
    b.addEventListener('pointerup', stop);
    b.addEventListener('pointercancel', stop);
    b.addEventListener('lostpointercapture', stop);
  }
  $<HTMLButtonElement>('m-stop').addEventListener('click', () => {
    rig.jog.n = rig.jog.e = 0;
    if (rig.slew) log('Slew aborted', 'w');
    rig.slew = null;
    hooks.wake();
  });
  $<HTMLInputElement>('m-track').addEventListener('change', (e) => {
    rig.tracking = (e.target as HTMLInputElement).checked;
    log(rig.tracking ? 'Tracking: sidereal' : 'Tracking stopped: the sky drifts west', rig.tracking ? '' : 'w');
    hooks.restack('reset');
  });
  const list = $<HTMLElement>('goto-list');
  for (const n of names) {
    const o = document.createElement('option');
    o.value = n;
    list.append(o);
  }
  $<HTMLFormElement>('goto').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $<HTMLInputElement>('goto-in');
    if (!hooks.goto(input.value.trim())) log(`Go to: nothing called "${input.value.trim()}"`, 'w');
  });
  $<HTMLButtonElement>('slew-target').addEventListener('click', () => {
    if (!hooks.slewToSelected()) log('Slew: pick a target in the image first', 'w');
  });
  // Focuser.
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-foc]')) {
    b.addEventListener('click', () => {
      if (rig.autofocus) return;
      rig.focus += Number(b.dataset.foc);
      hooks.restack('reset');
    });
  }
  const af = $<HTMLButtonElement>('autofocus');
  af.addEventListener('click', () => void autofocus(af));
  // Guider.
  const guide = $<HTMLButtonElement>('guide');
  guide.addEventListener('click', () => {
    rig.guiding = !rig.guiding;
    press(guide, rig.guiding);
    guide.textContent = rig.guiding ? 'Guiding' : 'Start guiding';
    log(rig.guiding ? 'Guiding started' : 'Guiding stopped: the mount runs open loop', rig.guiding ? 'ok' : 'w');
    hooks.wake();
  });
  // Night mode.
  const night = $<HTMLButtonElement>('night');
  night.addEventListener('click', () => {
    const on = !document.body.classList.contains('is-night');
    document.body.classList.toggle('is-night', on);
    press(night, on);
  });
  weather();
  setInterval(weather, 30000);
  drawV();
}
