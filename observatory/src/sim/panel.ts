// Plots for the control software: the spectrogram and the histogram.
// Each draws into a rectangle of a 2D context.
import { BINS, L0, L1, lambdaAt, isFound, wavelengthRGB, type Found, type Run } from './spectrum.ts';

// The spectrogram: a colour strip with dark lines, and a trace.
export function spectrumPlot(g: CanvasRenderingContext2D, X: number, Y: number, W: number, H: number, run: Run | null, found: readonly Found[]): void {
  const stripH = Math.round(H * 0.24), plotTop = Y + stripH + 6, plotH = H - stripH - 22;
  const x = (l: number): number => X + ((l - L0) / (L1 - L0)) * W;
  g.fillStyle = '#0b0c0e';
  g.fillRect(X, Y, W, stripH);
  g.fillRect(X, plotTop, W, plotH);
  if (run && run.time > 0) {
    const s = run.now;
    for (let px = 0; px < W; px++) {
      const i = Math.min(BINS - 1, Math.round((px / W) * (BINS - 1)));
      const [r, gg, b] = wavelengthRGB(lambdaAt(i));
      const v = Math.max(0, Math.min(1, s[i]));
      g.fillStyle = `rgb(${(r * v * 255) | 0},${(gg * v * 255) | 0},${(b * v * 255) | 0})`;
      g.fillRect(X + px, Y, 1, stripH);
    }
    g.strokeStyle = 'rgba(205, 220, 236, 0.9)';
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i < BINS; i++) {
      const px = x(lambdaAt(i)), py = plotTop + plotH - (Math.max(0, Math.min(1.15, s[i])) / 1.15) * plotH;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.stroke();
    // Found lines get a tick and a label.
    g.font = '11px Consolas, monospace';
    g.textAlign = 'center';
    let lastX = -99;
    for (const f of [...found].filter(isFound).sort((a, b) => a.l - b.l)) {
      const px = x(f.l);
      g.strokeStyle = f.emission ? 'rgba(255, 150, 150, 0.7)' : f.el === 'O₂' ? 'rgba(150, 170, 190, 0.45)' : 'rgba(232, 190, 120, 0.7)';
      g.beginPath();
      g.moveTo(px, plotTop);
      g.lineTo(px, plotTop + plotH);
      g.stroke();
      if (px - lastX > 30) {
        g.fillStyle = 'rgba(230, 235, 245, 0.85)';
        g.fillText(f.id, px, plotTop + 11);
        lastX = px;
      }
    }
  }
  g.fillStyle = '#7d838e';
  g.font = '11px Consolas, monospace';
  g.textAlign = 'center';
  for (let l = 400; l <= 750; l += 50) g.fillText(`${l}`, x(l), Y + H - 4);
  g.textAlign = 'left';
}

// Element rows: the strongest found line per element, or nothing yet.
export type Row = { el: string; label: string; depth: number; found: boolean };

const NAMES: Record<string, string> = {
  H: 'Hydrogen', He: 'Helium', Ca: 'Calcium', Na: 'Sodium', Mg: 'Magnesium', Fe: 'Iron',
  C: 'Carbon', TiO: 'Titanium oxide', N: 'Nitrogen', O: 'Oxygen', S: 'Sulphur', 'O₂': 'Our air',
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
export function histPlot(g: CanvasRenderingContext2D, X: number, Y: number, W: number, H: number, values: readonly number[]): void {
  const N = 96;
  const bins = new Array<number>(N).fill(0);
  for (const v of values) bins[Math.max(0, Math.min(N - 1, Math.floor(v * N)))]++;
  const top = Math.log1p(Math.max(1, ...bins));
  g.fillStyle = '#0b0c0e';
  g.fillRect(X, Y, W, H);
  g.fillStyle = 'rgba(140, 180, 222, 0.85)';
  for (let i = 0; i < N; i++) {
    const h = (Math.log1p(bins[i]) / top) * (H - 2);
    g.fillRect(X + (i / N) * W, Y + H - h, Math.max(1, W / N - 1), h);
  }
}
