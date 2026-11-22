// The side panel's drawings: the spectrogram, the composition and the histogram.
import { BINS, L0, L1, lambdaAt, isFound, wavelengthRGB, type Found, type Run } from './spectrum.ts';

// Sizes a 2D canvas to its CSS box and the device pixel ratio.
function fit(c: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr);
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  const g = c.getContext('2d');
  g?.setTransform(dpr, 0, 0, dpr, 0, 0);
  return g;
}

// The spectrogram: a colour strip with dark lines, and a trace.
export function drawSpectrum(c: HTMLCanvasElement, run: Run | null, found: readonly Found[]): void {
  const g = fit(c);
  if (!g) return;
  const W = c.clientWidth, H = c.clientHeight;
  g.clearRect(0, 0, W, H);
  const stripH = Math.round(H * 0.26), plotTop = stripH + 10, plotH = H - plotTop - 16;
  const x = (l: number): number => ((l - L0) / (L1 - L0)) * W;
  g.fillStyle = '#05060a';
  g.fillRect(0, 0, W, stripH);
  g.fillRect(0, plotTop, W, plotH);
  if (run && run.time > 0) {
    const s = run.now;
    for (let px = 0; px < W; px++) {
      const i = Math.min(BINS - 1, Math.round((px / W) * (BINS - 1)));
      const [r, gg, b] = wavelengthRGB(lambdaAt(i));
      const v = Math.max(0, Math.min(1, s[i]));
      g.fillStyle = `rgb(${(r * v * 255) | 0},${(gg * v * 255) | 0},${(b * v * 255) | 0})`;
      g.fillRect(px, 0, 1, stripH);
    }
    g.strokeStyle = 'rgba(200, 220, 240, 0.9)';
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i < BINS; i++) {
      const px = x(lambdaAt(i)), py = plotTop + plotH - Math.max(0, Math.min(1.15, s[i])) / 1.15 * plotH;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.stroke();
    // Found lines get a tick and a label.
    g.font = '10px system-ui, sans-serif';
    g.textAlign = 'center';
    let lastX = -99;
    for (const f of [...found].filter(isFound).sort((a, b) => a.l - b.l)) {
      const px = x(f.l);
      g.strokeStyle = f.emission ? 'rgba(255, 150, 150, 0.7)' : f.el === 'O₂' ? 'rgba(150, 170, 190, 0.5)' : 'rgba(255, 220, 140, 0.7)';
      g.beginPath();
      g.moveTo(px, plotTop);
      g.lineTo(px, plotTop + plotH);
      g.stroke();
      if (px - lastX > 26) {
        g.fillStyle = 'rgba(230, 235, 245, 0.85)';
        g.fillText(f.id, px, plotTop + 10);
        lastX = px;
      }
    }
  }
  g.fillStyle = 'rgba(160, 175, 195, 0.8)';
  g.font = '10px system-ui, sans-serif';
  g.textAlign = 'center';
  for (let l = 400; l <= 750; l += 50) g.fillText(`${l}`, x(l), H - 3);
}

// Element rows: the strongest found line per element, or nothing yet.
export type Row = { el: string; label: string; depth: number; found: boolean };

const NAMES: Record<string, string> = {
  H: 'Hydrogen', He: 'Helium', Ca: 'Calcium', Na: 'Sodium', Mg: 'Magnesium', Fe: 'Iron',
  C: 'Carbon (CH)', TiO: 'Titanium oxide', N: 'Nitrogen (gas)', O: 'Oxygen (gas)', S: 'Sulphur (gas)', 'O₂': 'Oxygen (our air)',
};

export function rows(found: readonly Found[]): Row[] {
  const best = new Map<string, Found>();
  for (const f of found) {
    const b = best.get(f.el);
    if (!b || (isFound(f) && (!isFound(b) || f.depth > b.depth))) best.set(f.el, f);
  }
  return Object.keys(NAMES)
    .filter((el) => best.has(el))
    .map((el) => {
      const f = best.get(el)!;
      return { el, label: NAMES[el], depth: Math.max(0, f.depth), found: isFound(f) };
    });
}

// The stack's histogram after the stretch, counts on a log scale.
export function drawHistogram(c: HTMLCanvasElement, values: readonly number[]): void {
  const g = fit(c);
  if (!g) return;
  const W = c.clientWidth, H = c.clientHeight, N = 64;
  const bins = new Array<number>(N).fill(0);
  for (const v of values) bins[Math.max(0, Math.min(N - 1, Math.floor(v * N)))]++;
  const top = Math.log1p(Math.max(...bins));
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#05060a';
  g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(150, 190, 230, 0.8)';
  for (let i = 0; i < N; i++) {
    const h = top > 0 ? (Math.log1p(bins[i]) / top) * (H - 2) : 0;
    g.fillRect((i / N) * W, H - h, W / N - 1, h);
  }
}
