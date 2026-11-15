// Railgun's field motes, shared by the WebGL2 and the WebGPU variant.
// Units are metres. Values match railgun/index.html at full charge.

export const ELEV = (6 * Math.PI) / 180;
export const L = 900;
export const A0 = [0, 245, 0];
export const AX = [0, Math.sin(ELEV), -Math.cos(ELEV)];
export const UP = [0, Math.cos(ELEV), Math.sin(ELEV)];
export const SIDE = [1, 0, 0];
// Full charge: k = 1.
export const G = 3600 + 22000;
export const PULL = 6 + 34;
export const DRAG = 0.12;
export const SOFT2 = 900;
// Railgun ships 2400; the larger counts test the ceiling.
export const COUNTS = [2400, 20000, 100000, 400000, 1000000];
export const CAM = { pos: [1500, 520, -120], at: [0, 292, -447], fov: 32 };
export const DUST = [0.62, 0.55, 0.44];
export const ICE = [0.78, 0.86, 1.0];

const q = new URLSearchParams(location.search);
export const N = Math.max(1, Math.min(4e6, +q.get('n') || 2400));
export const BENCH = q.has('bench');

// Steps of at most 1/60 s, as Railgun does.
export function substeps(dt) {
  const n = Math.max(1, Math.ceil(dt * 60 - 1e-6));
  return { n, h: dt / n };
}

// The frame loop and the readout.
// work(dt) steps and draws one frame; idle() resolves when the GPU is done.
// Bench mode runs bursts of B frames with one sync each.
// One sync per burst hides the sync's own latency.
export function run(label, work, idle) {
  const el = document.createElement('div');
  el.className = 'meter';
  document.body.append(el);
  const show = (ms, js, what = 'frame interval') => { el.textContent = `${label} · ${N.toLocaleString()} motes · ${what} ${ms.toFixed(2)} ms · js ${js.toFixed(2)} ms`; };
  const med = a => [...a].sort((x, y) => x - y)[a.length >> 1];
  if (BENCH) {
    (async () => {
      const B = 60, WARM = 3, RUNS = 9, per = [], js = [];
      for (let r = 0; r < WARM + RUNS; r++) {
        await new Promise(requestAnimationFrame);
        let jt = 0;
        const t0 = performance.now();
        for (let f = 0; f < B; f++) { const j = performance.now(); work(1 / 60); jt += performance.now() - j; }
        await idle();
        if (r >= WARM) { per.push((performance.now() - t0) / B); js.push(jt / B); }
      }
      window.__bench = { label, n: N, frame: med(per), frameMin: Math.min(...per), frameMax: Math.max(...per), js: med(js) };
      show(med(per), med(js), 'burst frame');
    })();
    return;
  }
  // Live view: no sync, so the readout shows JS time and frame interval.
  let prev = 0, shown = 0;
  const gap = [], js = [];
  (function frame(now) {
    requestAnimationFrame(frame);
    const dt = prev ? Math.min((now - prev) / 1000, 1 / 20) : 1 / 60;
    if (prev) gap.push(now - prev);
    prev = now;
    const t0 = performance.now();
    work(dt);
    js.push(performance.now() - t0);
    if (gap.length > 60) { gap.shift(); js.shift(); }
    if (now - shown > 250 && gap.length) { shown = now; show(med(gap), med(js)); }
  })(performance.now());
}
