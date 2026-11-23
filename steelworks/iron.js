// Steelworks iron: a channel sim on the runner graph, in JS.
// Each cell holds iron depth, slag depth and heat (1 is tap heat).
// Flow is a pipe model: each link keeps a flux with inertia and drag.
import * as THREE from 'three';
import { CHANNELS, polyLength, polyAt } from './layout.js';

export const DS = 0.25;
// Gravity runs three times fast: the toy compresses the cast in time.
const G = 160;
// Drag: thin and cold iron barely moves.
const DRAG = 0.0005, LIN = 2.5;
// Iron under this heat no longer flows.
const T_STOP = 0.22;
// The iron dam past the skimmer, and the slag gate's lip, over the trough bed.
// The gate sits higher, so only the slag on top runs off there.
const DAM = 0.08, LIP = 0.15;
// A wet trough keeps a pool between casts.
const WET = false;

const lum = T => { const t = Math.max(0, Math.min(1, (T - 0.22) / 0.78)); return 0.03 * t + 0.9 * t * t + 2.4 * t ** 4; };
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// The colour of iron at heat T, as the shaders draw it.
export function incandRGB(T, out = new THREE.Color()) {
  const t = Math.max(0, Math.min(1, (T - 0.22) / 0.78));
  let r = 0.55, g = 0.03, b = 0.004;
  const m = (c, k) => { r += (c[0] - r) * k; g += (c[1] - g) * k; b += (c[2] - b) * k; };
  m([1, 0.2, 0.02], sstep(0, 0.4, t)); m([1, 0.52, 0.13], sstep(0.4, 0.8, t)); m([1, 0.86, 0.62], sstep(0.8, 1, t));
  const k = lum(T);
  return out.setRGB(r * k, g * k, b * k);
}

export function makeIron() {
  // Cells, channel by channel.
  const chans = CHANNELS.map(ch => ({ ...ch, L: polyLength(ch.pts) }));
  let N = 0;
  for (const ch of chans) { ch.n = Math.max(2, Math.round(ch.L / DS)); ch.first = N; N += ch.n; }
  const bed = new Float32Array(N), w = new Float32Array(N), px = new Float32Array(N), pz = new Float32Array(N);
  const hI = new Float32Array(N), hS = new Float32Array(N), T = new Float32Array(N), spd = new Float32Array(N);
  const p = new THREE.Vector2();
  for (const ch of chans) {
    for (let i = 0; i < ch.n; i++) {
      const s = ((i + 0.5) / ch.n) * ch.L, c = ch.first + i;
      polyAt(ch.pts, s, p);
      px[c] = p.x; pz[c] = p.y; w[c] = ch.w;
      bed[c] = ch.y0 + (ch.y1 - ch.y0) * (s / ch.L);
    }
  }
  const byId = Object.fromEntries(chans.map(c => [c.id, c]));
  const tr = byId.trough, ir = byId.iron, sl = byId.slag;
  // Links: [a, b, kind]; kind 0 normal, 1 skimmer (iron only), 2 gate (slag only).
  const links = [];
  for (const ch of chans) for (let i = 0; i < ch.n - 1; i++) links.push([ch.first + i, ch.first + i + 1, 0]);
  links.push([tr.first + tr.n - 1, ir.first, 1]);
  // The gate sits where the slag runner leaves the trough.
  const gateCell = tr.first + Math.min(tr.n - 2, Math.round((tr.L - (tr.L - 9.2)) / DS));
  links.push([gateCell, sl.first, 2]);
  const Q = new Float32Array(links.length), F = new Float32Array(links.length);
  const out = new Float32Array(N), lw = links.map(([a, b]) => Math.min(w[a], w[b]));
  const spoutCell = ir.first + ir.n - 1, pitCell = sl.first + sl.n - 1;

  // The data texture the iron shader reads: depth, slag, heat, speed.
  const data = new Float32Array(N * 4);
  const tex = new THREE.DataTexture(data, N, 1, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;

  const st = { tap: 0, slagShare: 0, spoutRate: 0, pitRate: 0, ladle: 0, pit: 0, front: 0, heat: 0 };

  // The last cast left a thin crust in every channel, still warm in places.
  // The trough keeps a crusted pool up to the dam between casts.
  function reset() {
    const lvl = bed[tr.first + tr.n - 1] + DAM - 0.015;
    for (let c = 0; c < N; c++) {
      const pool = WET && c >= tr.first && c < tr.first + tr.n;
      hI[c] = pool ? lvl - bed[c] : 0.022 + 0.006 * Math.sin(c * 1.7); hS[c] = pool ? 0.02 : 0;
      T[c] = pool ? 0.55 + 0.1 * Math.max(0, Math.sin(c * 0.37)) : 0.1 + 0.11 * Math.max(0, Math.sin(c * 0.37) * Math.sin(c * 0.11 + 1.3));
      spd[c] = 0;
    }
    Q.fill(0);
    st.ladle = 0; st.pit = 0; st.spoutRate = 0; st.pitRate = 0;
  }
  reset();

  // One step. tapRate: m³/s from the taphole; slagShare: its slag part.
  function step(dt, tapRate, slagShare) {
    st.tap = tapRate; st.slagShare = slagShare;
    // The taphole feeds the trough's first cell at tap heat.
    if (tapRate > 0) {
      const c = tr.first, vol = tapRate * dt, h0 = (hI[c] + hS[c]) * w[c] * DS;
      T[c] = (T[c] * h0 + vol) / (h0 + vol);
      hI[c] += vol * (1 - slagShare) / (w[c] * DS);
      hS[c] += vol * slagShare / (w[c] * DS);
    }
    // Flux on each link.
    out.fill(0);
    for (let k = 0; k < links.length; k++) {
      const [a, b, kind] = links[k];
      const ha = hI[a] + hS[a], hb = hI[b] + hS[b];
      const ea = bed[a] + ha, eb = bed[b] + hb;
      let head = ea - eb, hav, up;
      if (kind === 2) {
        hav = Math.max(0, ea - Math.max(bed[a] + LIP, eb));
        head = hav;
        up = a;
      } else if (kind === 1) {
        // Iron runs under the skimmer and over the dam; the slag stays.
        hav = Math.max(0, bed[a] + hI[a] - Math.max(bed[a] + DAM, eb));
        head = hav;
        up = a;
      } else {
        // Upwind follows the head, so a stale flux cannot lock a link.
        up = head >= 0 ? a : b;
        hav = up === a ? ha : hb;
        if (Q[k] * head < 0) Q[k] *= 0.5;
      }
      const mob = sstep(T_STOP, T_STOP + 0.2, T[up]);
      let q = Q[k] + dt * G * hav * (head / DS) * mob;
      // Linear damping calms the slosh; depth drag stops thin, cold iron.
      q /= 1 + dt * (LIN + DRAG / (hav * hav + 1e-4) / Math.max(mob, 0.02));
      if (kind !== 0 && q < 0) q = 0;
      Q[k] = q;
      F[k] = q * lw[k];
      if (F[k] > 0) out[a] += F[k]; else out[b] -= F[k];
    }
    // Free outflow over the spout and into the slag pit.
    const weir = c => Math.sqrt(G) * Math.pow(Math.max(0, hI[c] + hS[c] - 0.01), 1.5) * w[c] * sstep(T_STOP, T_STOP + 0.2, T[c]);
    const fSp = weir(spoutCell), fPit = weir(pitCell);
    out[spoutCell] += fSp; out[pitCell] += fPit;
    // Scale outflows so no cell gives more than it holds.
    for (let c = 0; c < N; c++) {
      const vol = (hI[c] + hS[c]) * w[c] * DS;
      out[c] = out[c] * dt > vol ? vol / (out[c] * dt) : 1;
    }
    // Move iron, slag and heat along each link.
    const mv = (a, b, vol, kind) => {
      const ha = hI[a] + hS[a];
      if (ha <= 1e-6 || vol <= 0) return;
      let vS = kind === 1 ? 0 : kind === 2 ? vol : vol * hS[a] / ha;
      const areaA = w[a] * DS;
      vS = Math.min(vS, hS[a] * areaA);
      let vI = kind === 2 ? 0 : vol - vS;
      vI = Math.min(vI, hI[a] * areaA);
      hI[a] -= vI / areaA; hS[a] -= vS / areaA;
      if (b < 0) return;
      const areaB = w[b] * DS, v = vI + vS;
      if (v <= 0) return;
      // Frozen skull counts little: hot iron melts back into it.
      const hb = (hI[b] + hS[b]) * areaB * (T[b] < T_STOP ? 0.05 : 1);
      T[b] = (T[b] * hb + T[a] * v) / (hb + v);
      hI[b] += vI / areaB; hS[b] += vS / areaB;
    };
    for (let k = 0; k < links.length; k++) {
      const [a, b, kind] = links[k];
      if (F[k] > 0) mv(a, b, F[k] * dt * out[a], kind);
      else if (F[k] < 0) mv(b, a, -F[k] * dt * out[b], kind);
    }
    const sp = fSp * dt * out[spoutCell], pt = fPit * dt * out[pitCell];
    mv(spoutCell, -1, sp, 0); mv(pitCell, -1, pt, 0);
    st.spoutRate += (sp / dt - st.spoutRate) * Math.min(1, dt * 4);
    st.pitRate += (pt / dt - st.pitRate) * Math.min(1, dt * 4);
    st.ladle = Math.min(1, st.ladle + sp / 60);
    st.pit = Math.min(1, st.pit + pt / 20);
    // Cooling: a thin layer loses heat fast; deep iron holds it.
    let heat = 0;
    for (let c = 0; c < N; c++) {
      const h = hI[c] + hS[c];
      // A deep pool under its crust stays liquid between casts.
      T[c] = Math.max(h > 0.1 ? 0.5 : 0.06, T[c] - dt * (0.0025 + 0.0011 / (h + 0.01)));
      heat += h * lum(T[c]);
    }
    st.heat = heat;
    // Speed per cell: the mean of the links on either side.
    spd.fill(0);
    for (let k = 0; k < links.length; k++) {
      const [a, b] = links[k];
      const u = F[k] / (lw[k] * Math.max(0.02, (hI[a] + hS[a] + hI[b] + hS[b]) / 2));
      spd[a] += u * 0.5; spd[b] += u * 0.5;
    }
  }

  function upload() {
    for (let c = 0; c < N; c++) {
      data[c * 4] = hI[c]; data[c * 4 + 1] = hS[c]; data[c * 4 + 2] = T[c]; data[c * 4 + 3] = spd[c];
    }
    tex.needsUpdate = true;
  }

  // Light groups: each lights the hall from its hot part.
  const groups = [
    [tr.first, tr.first + (tr.n >> 1)], [tr.first + (tr.n >> 1), tr.first + tr.n],
    [ir.first, ir.first + Math.round(ir.n / 3)], [ir.first + Math.round(ir.n / 3), ir.first + Math.round(ir.n * 2 / 3)], [ir.first + Math.round(ir.n * 2 / 3), ir.first + ir.n],
    [sl.first, sl.first + (sl.n >> 1)], [sl.first + (sl.n >> 1), sl.first + sl.n],
  ];
  const col = new THREE.Color();
  // Fills the light arrays from index i0: position and colour per group.
  function lights(LP, LC, i0, gain) {
    groups.forEach(([c0, c1], g) => {
      let sw = 0, x = 0, y = 0, z = 0, r = 0, gg = 0, b = 0;
      for (let c = c0; c < c1; c++) {
        const h = hI[c] + hS[c], k = Math.min(h, 0.25) * w[c] * DS;
        incandRGB(T[c], col);
        const wt = k * (col.r + col.g);
        sw += wt; x += px[c] * wt; y += (bed[c] + h) * wt; z += pz[c] * wt;
        r += col.r * k; gg += col.g * k; b += col.b * k;
      }
      const L = LP[i0 + g], C = LC[i0 + g];
      if (sw > 1e-6) L.set(x / sw, y / sw + 0.45, z / sw, 0.6 + (c1 - c0) * DS * 0.12);
      // Light off the iron reads warmer than the iron itself.
      C.set(r, gg * 0.78, b * 0.55).multiplyScalar(gain);
    });
  }

  // The surface ribbons: one strip per channel, vertices at cell centres.
  function ribbons() {
    const geos = [];
    for (const ch of chans) {
      const pos = [], cell = [], U = [], S = [], B = [], W = [], idx = [];
      const d = new THREE.Vector2(), q = new THREE.Vector2();
      const across = [-1, -0.6, 0, 0.6, 1];
      const rows = ch.n + 1;
      for (let i = 0; i < rows; i++) {
        const s = Math.min(ch.L, Math.max(0, i === 0 ? 0 : i === rows - 1 ? ch.L : (i - 0.5 + 0.5) * (ch.L / ch.n)));
        polyAt(ch.pts, Math.min(s, ch.L - 1e-3), q, d);
        polyAt(ch.pts, s, q);
        const c = ch.first + Math.min(ch.n - 1, Math.max(0, i - (i === rows - 1 ? 1 : 0)));
        for (const u of across) {
          pos.push(q.x - d.y * u * ch.w / 2, 0, q.y + d.x * u * ch.w / 2);
          cell.push(c); U.push(u); S.push(s); W.push(ch.w);
          B.push(ch.y0 + (ch.y1 - ch.y0) * (s / ch.L));
        }
      }
      const nc = across.length;
      for (let i = 0; i < rows - 1; i++) for (let j = 0; j < nc - 1; j++) {
        const a = i * nc + j, b = a + 1, c = a + nc, e = c + 1;
        idx.push(a, c, b, b, c, e);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('aCell', new THREE.Float32BufferAttribute(cell, 1));
      g.setAttribute('aU', new THREE.Float32BufferAttribute(U, 1));
      g.setAttribute('aS', new THREE.Float32BufferAttribute(S, 1));
      g.setAttribute('aBed', new THREE.Float32BufferAttribute(B, 1));
      g.setAttribute('aW', new THREE.Float32BufferAttribute(W, 1));
      g.setIndex(idx);
      geos.push(g);
    }
    return geos;
  }

  // The hottest cell near a point on the floor plan, for a splash.
  function nearest(x, z) {
    let best = -1, bd = 1e9;
    for (let c = 0; c < N; c++) {
      const d = (px[c] - x) ** 2 + (pz[c] - z) ** 2;
      if (d < bd) { bd = d; best = c; }
    }
    return { c: best, d: Math.sqrt(bd), h: hI[best] + hS[best], T: T[best], x: px[best], y: bed[best] + hI[best] + hS[best], z: pz[best] };
  }
  // A moving front: the farthest hot cell along the iron runner.
  function hotAt(c) { return { h: hI[c] + hS[c], T: T[c], s: spd[c], x: px[c], y: bed[c] + hI[c] + hS[c], z: pz[c] }; }
  const busy = () => st.tap > 0 || st.spoutRate > 1e-4 || st.pitRate > 1e-4 || Array.prototype.some.call(spd, v => Math.abs(v) > 0.02);

  return { Q, F, links, N, tex, step, upload, lights, ribbons, reset, nearest, hotAt, busy, st, chans, spoutCell, pitCell, skimCell: tr.first + tr.n - 1, T, hI, hS };
}
