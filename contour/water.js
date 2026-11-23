// Contour map lakes and rivers on the main thread.
// The fill worker says where each lake stands and how high it can rise.
// Here each lake's level rises from its bottom to its brim; a breached lake drains.
// A full lake spills: its river grows from the outlet down to the sea.
import { N } from './terrain.js';

const DRY = -1e4;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function makeWater(T) {
  // lv: the water level over each cell; DRY where no lake reaches.
  // fm: the pale edge of rising water, 0 to 1.
  const lv = new Float32Array(N * N).fill(DRY), fm = new Float32Array(N * N);
  const dirty = [N, N, -1, -1];
  let lakes = [], ghosts = [], rivers = [];
  // The last answer's lake map, so each new lake finds the lake it was.
  let prevId = null;
  const mark = (x0, y0, x1, y1) => {
    dirty[0] = Math.min(dirty[0], x0); dirty[1] = Math.min(dirty[1], y0);
    dirty[2] = Math.max(dirty[2], x1); dirty[3] = Math.max(dirty[3], y1);
  };

  // A lake's cells and the dry ring round them, which carries the level to the shore.
  // The ring is three cells wide: the smoothed land can dip under the level
  // a cell or two past the shore, and the water must not end in a step there.
  const RING = 3;
  function cellsOf(L, id, k) {
    const x0 = Math.max(0, L.x0 - RING), x1 = Math.min(N - 1, L.x1 + RING), y0 = Math.max(0, L.y0 - RING), y1 = Math.min(N - 1, L.y1 + RING);
    const w = x1 - x0 + 1, hgt = y1 - y0 + 1;
    const a = new Uint8Array(w * hgt), b = new Uint8Array(w * hgt);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (id[y * N + x] === k) a[(y - y0) * w + x - x0] = 1;
    // A square dilation, one axis at a time.
    for (let y = 0; y < hgt; y++) for (let x = 0; x < w; x++) {
      let m = 0;
      for (let d = -RING; d <= RING && !m; d++) { const X = x + d; if (X >= 0 && X < w) m = a[y * w + X]; }
      b[y * w + x] = m;
    }
    const out = [];
    for (let y = 0; y < hgt; y++) for (let x = 0; x < w; x++) {
      let m = 0;
      for (let d = -RING; d <= RING && !m; d++) { const Y = y + d; if (Y >= 0 && Y < hgt) m = b[Y * w + x]; }
      if (!m) continue;
      const c = (y + y0) * N + x + x0;
      // Another lake's own cells stay its own.
      if (id[c] === k || id[c] === -1) out.push(c);
    }
    return Int32Array.from(out);
  }
  function write(L) {
    const f = L.foam;
    for (const c of L.cells) { lv[c] = L.cur; fm[c] = f; }
    mark(Math.max(0, L.x0 - RING), Math.max(0, L.y0 - RING), Math.min(N - 1, L.x1 + RING), Math.min(N - 1, L.y1 + RING));
  }
  function wipe(L) {
    for (const c of L.cells) { lv[c] = DRY; fm[c] = 0; }
    mark(Math.max(0, L.x0 - RING), Math.max(0, L.y0 - RING), Math.min(N - 1, L.x1 + RING), Math.min(N - 1, L.y1 + RING));
  }
  // Seconds to fill: small hollows fill fast, wide basins take longer.
  const fillTime = area => clamp(1.4 + Math.sqrt(area) / 22, 1.5, 6);

  /**
   * Takes a worker answer. full: the lakes start at their brims.
   * A lake keeps the level it had; a lake that has gone drains away.
   */
  function apply({ id, lakes: next, rivers: rv }, full = false) {
    const old = lakes.concat(ghosts);
    const before = lakes;
    const made = next.map((L, k) => {
      const cells = cellsOf(L, id, k);
      // The lake it was: the old lake under its deepest cell, or under any cell.
      let was = null;
      if (prevId) {
        const j = prevId[L.deep];
        if (j >= 0) was = before[j];
        else for (const c of cells) if (id[c] === k && prevId[c] >= 0) { was = before[prevId[c]]; break; }
      }
      // A lake born under this press starts dry and stays so until the brush leaves.
      // A hollow still under the brush restarts dry at each new answer.
      const cur = was && !(was.fresh && was.held) ? Math.max(L.bottom, was.cur) : L.bottom;
      return { ...L, cells, cur, foam: 0, draining: false, fresh: was ? was.fresh : true, held: was ? was.held : false };
    });
    prevId = id;
    // Water above a new brim drains as a ghost, on its old shore.
    // A ghost sinks to the new lake's level, or to its own bottom when dry.
    ghosts = [];
    for (const L of old) {
      if (L.cur <= L.bottom + 0.05) continue;
      const k = id[L.deep], into = k >= 0 ? made[k] : null;
      const floor = into ? into.level : L.bottom;
      if (L.cur > floor + 0.3) ghosts.push({ ...L, level: floor, foam: 0, draining: true, drop: L.cur - floor });
    }
    // A lake never starts above its brim, so its shore stays smooth.
    for (const L of made) { L.cur = full ? L.level : Math.min(L.cur, L.level); if (full) L.fresh = false; }
    for (const L of old) wipe(L);
    lakes = made;
    for (const L of ghosts) write(L);
    for (const L of lakes) write(L);
    // A river keeps its length where its outlet stays put.
    const prev = rivers;
    rivers = rv.filter(r => r.path.length > 1).map(r => {
      const o = r.path[0], ox = o % N, oy = (o - ox) / N;
      const was = prev.find(p => Math.abs(p.ox - ox) <= 3 && Math.abs(p.oy - oy) <= 3);
      return { lake: r.lake, path: r.path, ox, oy, g: full ? r.path.length : was ? Math.min(was.g, r.path.length) : 0, pts: smoothPath(r.path) };
    });
  }

  // River points in cells, softened so the path loses its grid steps.
  // On flat ground a river meanders, as real lowland rivers do.
  function smoothPath(path) {
    const soften = (p, passes) => {
      for (let pass = 0; pass < passes; pass++) {
        p = p.map((q, i) => {
          if (i === 0 || i === p.length - 1) return q;
          const a = p[i - 1], b = p[i + 1];
          return [(a[0] + 2 * q[0] + b[0]) / 4, (a[1] + 2 * q[1] + b[1]) / 4];
        });
      }
      return p;
    };
    let p = soften(Array.from(path, c => [c % N, Math.floor(c / N)]), 4);
    const h = T.h, n = p.length, K = 4;
    const phase = (path[0] % 97) * 0.37;
    let run = 0;
    p = p.map((q, i) => {
      if (i === 0 || i === n - 1) return q;
      const a = p[Math.max(0, i - 2)], b = p[Math.min(n - 1, i + 2)];
      const tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
      run += Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]);
      // Metres of fall per cell over the next few steps.
      const j = Math.min(n - 1, i + K);
      const fall = Math.abs(h[path[i]] - h[path[j]]) / Math.max(1, j - i);
      const flat = 1 - Math.min(1, Math.max(0, (fall - 0.05) / 0.45));
      // The swing grows in from the outlet and dies at the mouth.
      const ends = Math.min(1, i / 8, (n - 1 - i) / 8);
      const off = flat * ends * 1.7 * Math.sin(run / 2.3 + phase) + flat * ends * 0.6 * Math.sin(run / 0.9 + phase * 2);
      return [q[0] - ty / tl * off, q[1] + tx / tl * off];
    });
    return soften(p, 2);
  }

  /**
   * Moves each level and each river on by dt.
   * hold: the brush's cell, or null. A lake under the brush waits to fill.
   * Returns { busy, rising, growing }: rising is metres a second summed over lakes.
   */
  function step(dt, calm, hold = null) {
    let busy = false, rising = 0, growing = 0;
    for (const L of ghosts.concat(lakes)) {
      // A ghost drains its own depth; a lake fills from bottom to brim.
      const span = L.draining ? Math.max(2, L.drop || 0) : Math.max(0.5, Math.abs(L.level - L.bottom));
      const before = L.cur, foam0 = L.foam;
      // Water pours into a hollow only once the brush has left it.
      // A lake born under this press stays dry; an older one waits.
      const r = hold ? hold[2] : 0;
      const near = hold && !L.draining && hold[0] >= L.x0 - r && hold[0] <= L.x1 + r && hold[1] >= L.y0 - r && hold[1] <= L.y1 + r;
      const held = near && (L.fresh || L.cur < L.level);
      L.held = held;
      if (held && L.fresh && L.cur > L.bottom) L.cur = L.bottom;
      if (!held && L.cur >= L.level) L.fresh = false;
      if (L.cur !== L.level && !held) {
        if (calm) L.cur = L.level;
        else {
          // A breached lake drains in about a second.
          const v = L.draining ? span / 1.1 : span / fillTime(L.area);
          // The level slows as it nears its brim.
          const left = Math.abs(L.level - L.cur);
          const sp = v * clamp(0.25 + left / span * 1.5, 0.25, 1);
          L.cur += Math.sign(L.level - L.cur) * Math.min(left, sp * dt);
        }
        if (Math.abs(L.cur - L.level) < 0.02) L.cur = L.level;
      }
      const up = L.cur > before;
      if (up) rising += (L.cur - before) / Math.max(dt, 1e-3) * Math.sqrt(L.area) / 40;
      L.foam = calm ? 0 : up ? Math.min(1, L.foam + dt / 0.2) : Math.max(0, L.foam - dt / 0.7);
      if (L.cur !== before || L.foam !== foam0) { write(L); busy = true; }
    }
    // A drained ghost leaves.
    ghosts = ghosts.filter(L => { if (L.cur > L.level || L.foam > 0) return true; wipe(L); for (const K of lakes) write(K); return false; });
    for (const r of rivers) {
      const L = lakes[r.lake];
      const full = L && L.cur >= L.level - 0.25;
      const to = full ? r.path.length : 0;
      if (r.g === to) continue;
      if (calm) r.g = to;
      else if (r.g < to) { r.g = Math.min(to, r.g + dt * 110); growing++; }
      else r.g = Math.max(0, r.g - dt * 320);
      busy = true;
    }
    return { busy, rising, growing };
  }

  // The water level at a cell, or null where no lake stands.
  function levelAt(x, y) {
    const i = clamp(Math.round(x), 0, N - 1), j = clamp(Math.round(y), 0, N - 1);
    const v = lv[j * N + i];
    return v > DRY / 2 && v > T.h[j * N + i] ? v : null;
  }
  // A new press: every lake standing now is older than it.
  function pressed() { for (const L of lakes) L.fresh = false; }
  function take() { const r = dirty[2] < dirty[0] ? null : dirty.slice(); dirty[0] = dirty[1] = N; dirty[2] = dirty[3] = -1; return r; }
  function clear() { lv.fill(DRY); fm.fill(0); lakes = []; ghosts = []; rivers = []; prevId = null; mark(0, 0, N - 1, N - 1); }

  return {
    lv, fm, apply, step, levelAt, take, clear, pressed,
    get lakes() { return lakes; }, get rivers() { return rivers; }, get ghosts() { return ghosts; },
  };
}
