// Contour map lakes: every hollow fills to the level where it spills.
// A priority flood from the sheet's edges gives each cell its water level.
// Cells whose level stands above the ground form lakes.
// The flood's parent links run downhill, so they trace each outlet's river.
// As a module worker it answers { h, n } with { id, lakes, rivers }.

// A lake must be this deep and this large, or it is only a puddle.
const MIN_DEPTH = 2.5, MIN_AREA = 14;
// A level at or under this stands at sea level: the sea's own flood owns it.
const SEA = 0.5;

/**
 * @param {Float32Array} h  Heights in metres, n by n.
 * @param {number} n
 * @param {number} [eps]  A rise per cell over filled land, so filled flats still drain.
 */
export function fillLakes(h, n, eps = 0) {
  const size = n * n;
  const W = new Float32Array(size);
  const parent = new Int32Array(size).fill(-1);
  const seen = new Uint8Array(size);
  // A binary heap of cells keyed by their water level.
  let hk = new Float32Array(4096), hv = new Int32Array(4096), hn = 0;
  const push = (k, v) => {
    if (hn === hk.length) {
      const k2 = new Float32Array(hn * 2), v2 = new Int32Array(hn * 2);
      k2.set(hk); v2.set(hv); hk = k2; hv = v2;
    }
    let i = hn++;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (hk[p] <= k) break;
      hk[i] = hk[p]; hv[i] = hv[p]; i = p;
    }
    hk[i] = k; hv[i] = v;
  };
  const pop = () => {
    const v = hv[0], k = hk[--hn], last = hv[hn];
    let i = 0;
    for (;;) {
      let c = 2 * i + 1;
      if (c >= hn) break;
      if (c + 1 < hn && hk[c + 1] < hk[c]) c++;
      if (hk[c] >= k) break;
      hk[i] = hk[c]; hv[i] = hv[c]; i = c;
    }
    hk[i] = k; hv[i] = last;
    return v;
  };
  // Cells inside a hollow skip the heap: a plain queue is enough there.
  const pit = new Int32Array(size);
  let ph = 0, pt = 0;
  // The edges drain off the sheet; below zero they hold the sea.
  const seed = c => { if (seen[c]) return; seen[c] = 1; W[c] = Math.max(h[c], 0); push(W[c], c); };
  for (let i = 0; i < n; i++) { seed(i); seed((n - 1) * n + i); seed(i * n); seed(i * n + n - 1); }
  while (hn > 0 || ph < pt) {
    const c = ph < pt ? pit[ph++] : pop();
    const x = c % n, y = (c - x) / n, wc = W[c];
    for (let k = 0; k < 4; k++) {
      const d = k === 0 ? (x > 0 ? c - 1 : -1) : k === 1 ? (x < n - 1 ? c + 1 : -1) : k === 2 ? (y > 0 ? c - n : -1) : (y < n - 1 ? c + n : -1);
      if (d < 0 || seen[d]) continue;
      seen[d] = 1;
      parent[d] = c;
      // The sea's level stays flat; filled land rises by eps toward its source.
      if (h[d] <= wc) { W[d] = wc > 0 ? wc + eps : wc; pit[pt++] = d; }
      else { W[d] = h[d]; push(W[d], d); }
    }
  }

  // Lakes: four-way groups of cells under water above sea level.
  const id = new Int32Array(size).fill(-1);
  const lakes = [];
  const q = new Int32Array(size);
  for (let s = 0; s < size; s++) {
    if (id[s] !== -1 || W[s] - h[s] <= 0.01 || W[s] <= SEA) continue;
    const L = { level: W[s], bottom: h[s], deep: s, area: 0, x0: n, y0: n, x1: -1, y1: -1, outlet: -1 };
    const k = lakes.length;
    let qh = 0, qt = 0;
    q[qt++] = s; id[s] = k;
    while (qh < qt) {
      const c = q[qh++], x = c % n, y = (c - x) / n;
      L.area++;
      if (h[c] < L.bottom) { L.bottom = h[c]; L.deep = c; }
      if (x < L.x0) L.x0 = x; if (x > L.x1) L.x1 = x; if (y < L.y0) L.y0 = y; if (y > L.y1) L.y1 = y;
      for (let j = 0; j < 4; j++) {
        const d = j === 0 ? (x > 0 ? c - 1 : -1) : j === 1 ? (x < n - 1 ? c + 1 : -1) : j === 2 ? (y > 0 ? c - n : -1) : (y < n - 1 ? c + n : -1);
        if (d < 0 || id[d] !== -1) continue;
        if (W[d] - h[d] > 0.01 && W[d] > SEA) { id[d] = k; q[qt++] = d; }
        // The outlet: the lowest dry cell on the shore.
        else if (L.outlet < 0 || h[d] < h[L.outlet]) L.outlet = d;
      }
    }
    lakes.push(L);
    L.cells = q.slice(0, qt);
  }
  // Puddles drop out; the rest are numbered again from zero.
  const keep = [];
  for (const L of lakes) {
    if (L.level - L.bottom < MIN_DEPTH || L.area < MIN_AREA) { for (const c of L.cells) id[c] = -1; continue; }
    const k = keep.length;
    for (const c of L.cells) id[c] = k;
    keep.push(L);
  }
  for (const L of keep) delete L.cells;

  // Rivers: from each outlet, down the flood's parent links.
  // A river ends in the sea, in another lake, or at the sheet's edge.
  // Each step takes the steepest fall of the filled surface, eight ways.
  // On a flat the flood's parent link leads on.
  const STEPS = [[-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1], [-1, -1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [1, 1, Math.SQRT2]];
  const down = c => {
    const x = c % n, y = (c - x) / n;
    let best = -1, bs = 0;
    for (const [dx, dy, len] of STEPS) {
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= n || Y >= n) return -1;
      const d = Y * n + X, sl = (W[d] - W[c]) / len;
      if (sl < bs) { bs = sl; best = d; }
    }
    return best >= 0 ? best : parent[c];
  };
  const rivers = keep.map((L, k) => {
    const path = [];
    const been = new Set();
    let c = L.outlet;
    for (let i = 0; c >= 0 && i < 6000 && !been.has(c); i++) {
      path.push(c);
      been.add(c);
      if (h[c] < 0 && W[c] <= SEA) break;
      if (id[c] !== -1 && id[c] !== k) break;
      c = down(c);
    }
    return { lake: k, path: Int32Array.from(path) };
  });
  return { id, lakes: keep, rivers, W };
}

/**
 * Fills the small hollows of a new land; its large basins stay as lakes.
 * Filled ground keeps a slight fall, so water runs off it.
 * The sea is never filled.
 * @param {Float32Array} h  Changed in place.
 * @param {number} n
 * @param {number} [keep]  How many lakes stay at most.
 */
export function drain(h, n, keep = 6) {
  const { id, lakes, W } = fillLakes(h, n, 0.02);
  const kept = new Set(lakes.map((L, k) => [k, L]).filter(([, L]) => L.area >= 250 && L.level - L.bottom >= 6)
    .sort((a, b) => b[1].area - a[1].area).slice(0, keep).map(([k]) => k));
  for (let c = 0; c < h.length; c++) if (W[c] > h[c] && W[c] > SEA && !kept.has(id[c])) h[c] = W[c];
}

// In a worker: one answer for each height grid.
if (typeof WorkerGlobalScope !== 'undefined' && globalThis instanceof WorkerGlobalScope) {
  globalThis.onmessage = e => {
    const { h, n, seq } = e.data;
    const r = fillLakes(h, n);
    globalThis.postMessage({ seq, id: r.id, lakes: r.lakes, rivers: r.rivers }, [r.id.buffer, ...r.rivers.map(v => v.path.buffer)]);
  };
}
