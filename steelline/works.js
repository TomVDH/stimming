// Steel line layout: the five buildings in one side slice, in metres.
// Ore comes in at the left; coils leave at the right. Ground is y = 0.
// This file builds the static shapes; show.js moves the goods.

// The line runs from x = 0 to LINE_W; the view pans along it.
export const LINE_W = 690;
export const SKY_TOP = 112, DEEP = -40;

// Materials; the scene shader draws each one's pattern.
export const M = {
  WALL: 1, CUT: 2, STEEL: 3, BRICK: 4, CONC: 5, SOIL: 6, TRUSS: 7, BELT: 8, GLASS: 9,
  ROOF: 10, PILE: 11, RAIL: 12, PIPE: 13, HOLE: 14, GRATE: 15, CLAD: 16,
};
// Normal modes: flat, upright cylinder, lying cylinder, dome, tilted face.
export const N = { FLAT: 0, VCYL: 1, HCYL: 2, DOME: 3, TILT: 4 };

// Linear colours. Hot metal is the key light, so every surface stays dark.
export const C = {
  wall: [0.05, 0.053, 0.062], wallIn: [0.03, 0.032, 0.04],
  cut: [0.15, 0.155, 0.17], cutWarm: [0.17, 0.13, 0.1],
  steel: [0.08, 0.083, 0.092], steelDark: [0.045, 0.048, 0.055], steelRed: [0.07, 0.028, 0.02],
  brick: [0.16, 0.08, 0.05], conc: [0.07, 0.07, 0.072], soil: [0.09, 0.066, 0.046],
  ore: [0.2, 0.08, 0.045], coal: [0.03, 0.03, 0.033], coke: [0.055, 0.055, 0.058], sinter: [0.11, 0.06, 0.04],
  belt: [0.02, 0.02, 0.022], rail: [0.09, 0.09, 0.1], glass: [0.5, 0.6, 0.8], lamp: [1, 0.92, 0.78],
  hole: [0.006, 0.007, 0.01], clad: [0.04, 0.043, 0.05],
};

/* ---------- places: x positions of each step ---------- */
export const P = {
  // Step 1: ore yard and coke ovens.
  trainY: 0, dumpX0: 16, dumpX1: 32, pitY: -11,
  tunnelY: -12, tunnelX0: 16, tunnelX1: 128,
  piles: [[42, 64, 13, 'ore'], [60, 86, 11, 'ore'], [96, 116, 8, 'coal']],
  ovenX0: 126, ovenX1: 168, ovenY0: 5, ovenY1: 19, ovens: 14, coalTowerX: 120,
  quenchX: 176, quenchTop: 34,
  // Step 2: blast furnace.
  stockX0: 196, stockX1: 220, stockTop: 26,
  skipX0: 223, skipY0: -6, skipX1: 254, skipY1: 66,
  bfX: 262, castY: 8, tapX: 271, runnerX1: 292, torpedoX: 296,
  stoveXs: [312, 323, 334], stoveR: 4.6, stoveTop: 44,
  catcherX: 290,
  // Step 3: converter.
  shopX0: 350, shopX1: 448, shopTop: 74, craneY: 58,
  pitX: 366, convX: 408, convY: 28, floorY: 19, hoodY: 38,
  // Step 4: caster.
  castX0: 456, castX1: 534, castTop: 48, turretX: 470, tundishX: 480, mouldY: 21, arcR: 11,
  cutX: 516,
  // Step 5: rolling mill and coil yard.
  millX0: 540, millX1: 646, millTop: 24, reheatX0: 546, reheatX1: 576, roughX: 588,
  standX0: 602, standGap: 6.4, stands: 6, runX1: 650, coilerX: 653,
  yardX0: 646, yardX1: 690, trainX: 668,
};

// The blast furnace profile: inner radius by height, bottom to top.
export const BF_PROFILE = [[6, 6.4], [14, 6.4], [19, 7.8], [23, 7.8], [48, 5.4], [53, 5.0], [57, 3.2]];
export const bfR = y => {
  const p = BF_PROFILE;
  if (y <= p[0][0]) return p[0][1];
  for (let i = 1; i < p.length; i++) if (y <= p[i][0]) { const t = (y - p[i - 1][0]) / (p[i][0] - p[i - 1][0]); return p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t; }
  return p[p.length - 1][1];
};

// The caster strand: straight down from the mould, a quarter arc, then flat.
export function strandAt(s) {
  const x0 = P.tundishX, top = P.mouldY - 0.5, drop = 3, R = P.arcR;
  if (s < drop) return [x0, top - s, 0];
  const a = (s - drop) / R;
  if (a < Math.PI / 2) return [x0 + R - R * Math.cos(a), top - drop - R * Math.sin(a), a];
  return [x0 + R + (s - drop - R * Math.PI / 2), top - drop - R, Math.PI / 2];
}
export const STRAND_LEN = 3 + P.arcR * Math.PI / 2 + (P.cutX - P.tundishX - P.arcR);

/* ---------- the builder ---------- */
// Each vertex: x, y, u, v | mat, nmode, a, b | r, g, b, k. Twelve floats.
export function builder() {
  const back = [], front = [];
  let out = back;
  const v = (x, y, u, w, m, n, a, b, c, k) => out.push(x, y, u, w, m, n, a, b, c[0], c[1], c[2], k);
  const api = {
    // Later shapes go in front of the moving goods.
    front(on = true) { out = on ? front : back; return api; },
    // A quad from four corners in order; uv is world position less the origin.
    quad(p, m, c, { n = N.FLAT, a = 0, b = 0, k = 0, o = p[0] } = {}) {
      const [p0, p1, p2, p3] = p;
      for (const q of [p0, p1, p2, p0, p2, p3]) v(q[0], q[1], q[0] - o[0], q[1] - o[1], m, n, a, b, c, k);
      return api;
    },
    rect(x0, y0, x1, y1, m, c, opt = {}) { return api.quad([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], m, c, opt); },
    // A convex polygon as a fan.
    poly(pts, m, c, { n = N.FLAT, a = 0, b = 0, k = 0, o = pts[0] } = {}) {
      for (let i = 1; i < pts.length - 1; i++) for (const q of [pts[0], pts[i], pts[i + 1]]) v(q[0], q[1], q[0] - o[0], q[1] - o[1], m, n, a, b, c, k);
      return api;
    },
    // A thick segment.
    // Its uv runs along the segment and across it, from 0.
    seg(x0, y0, x1, y1, w, m, c, { n = N.FLAT, a = 0, b = 0, k = 0 } = {}) {
      const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l * w / 2, ny = dx / l * w / 2;
      const q = [[x0 - nx, y0 - ny, 0, 0], [x1 - nx, y1 - ny, l, 0], [x1 + nx, y1 + ny, l, w], [x0 + nx, y0 + ny, 0, w]];
      for (const p of [q[0], q[1], q[2], q[0], q[2], q[3]]) v(p[0], p[1], p[2], p[3], m, n, a, b, c, k);
      return api;
    },
    // A disc or an arc band, as a dome-lit fan.
    disc(cx, cy, r, m, c, { seg = 24, a0 = 0, a1 = Math.PI * 2, k = 0, n = N.DOME } = {}) {
      for (let i = 0; i < seg; i++) {
        const t0 = a0 + (a1 - a0) * i / seg, t1 = a0 + (a1 - a0) * (i + 1) / seg;
        for (const q of [[cx, cy], [cx + Math.cos(t0) * r, cy + Math.sin(t0) * r], [cx + Math.cos(t1) * r, cy + Math.sin(t1) * r]]) v(q[0], q[1], q[0] - cx, q[1] - cy, m, n, 0, r, c, k);
      }
      return api;
    },
    data() { return { back: new Float32Array(back), front: new Float32Array(front) }; },
  };
  return api;
}

/* ---------- pieces ---------- */
// A cut-open shed: back wall, cut side walls, cut roof with a truss under it.
function shed(B, x0, x1, top, { floor = 0, wallT = 0.9, roofT = 1.1, windows = true, pitch = 2 } = {}) {
  B.rect(x0, floor, x1, top, M.WALL, C.wall);
  // High windows: a cool row under the eaves.
  if (windows) for (let x = x0 + 4; x < x1 - 6; x += 7) B.rect(x, top - 8, x + 4.4, top - 4, M.GLASS, C.glass, { k: 0.05 });
  B.rect(x0, floor, x0 + wallT, top, M.CUT, C.cut);
  B.rect(x1 - wallT, floor, x1, top, M.CUT, C.cut);
  const mid = (x0 + x1) / 2;
  B.quad([[x0 - 0.8, top], [mid, top + pitch], [mid, top + pitch + roofT], [x0 - 0.8, top + roofT]], M.CUT, C.cut);
  B.quad([[mid, top + pitch], [x1 + 0.8, top], [x1 + 0.8, top + roofT], [mid, top + pitch + roofT]], M.CUT, C.cut);
  // Roof truss: a lattice band under the roof.
  B.quad([[x0, top - 3.2], [x1, top - 3.2], [x1, top], [x0, top]], M.TRUSS, C.steelDark, { a: 3.2 });
}
// A floor slab cut through, with its walkway grating.
const slab = (B, x0, x1, y, t = 0.8) => B.rect(x0, y - t, x1, y, M.CUT, C.cut);
const grate = (B, x0, x1, y) => B.rect(x0, y - 0.35, x1, y, M.GRATE, C.steelDark);
// A stair: a stringer and steps, cut through.
function stair(B, x0, y0, x1, y1) {
  B.seg(x0, y0, x1, y1, 0.35, M.STEEL, C.steelDark);
  const n = Math.max(2, Math.round(Math.abs(y1 - y0) / 0.6));
  for (let i = 1; i < n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; B.rect(x - 0.3, y, x + 0.3, y + 0.12, M.STEEL, C.steelDark); }
}
// A ladder of rungs between two heights.
function ladder(B, x, y0, y1) {
  B.rect(x - 0.35, y0, x - 0.25, y1, M.STEEL, C.steelDark).rect(x + 0.25, y0, x + 0.35, y1, M.STEEL, C.steelDark);
  for (let y = y0 + 0.4; y < y1; y += 0.5) B.rect(x - 0.3, y, x + 0.3, y + 0.08, M.STEEL, C.steelDark);
}
// A mast with a floodlight head.
function mast(B, x, h) {
  B.quad([[x - 0.5, 0], [x + 0.5, 0], [x + 0.15, h], [x - 0.15, h]], M.STEEL, C.steelDark);
  B.rect(x - 1.6, h, x + 1.6, h + 0.8, M.STEEL, C.steelDark);
}
// An upright cylinder with dome-lit sides.
const cyl = (B, x, y0, y1, r, m, c, k = 0) => B.rect(x - r, y0, x + r, y1, m, c, { n: N.VCYL, a: x, b: r, k });
// A lying pipe between two points.
function pipe(B, x0, y0, x1, y1, r, c = C.steel) {
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1;
  // Horizontal pipes light as lying cylinders; others light flat.
  const flat = Math.abs(dy) < 0.01;
  B.seg(x0, y0, x1, y1, r * 2, M.PIPE, c, flat ? { n: N.HCYL, a: y0, b: r } : { n: N.TILT, a: -dy / l * 0.5, b: dx / l * 0.5 });
}

/* ---------- the works ---------- */
export function buildWorks() {
  const B = builder();
  ground(B);
  oreYard(B);
  furnace(B);
  converter(B);
  caster(B);
  mill(B);
  masts(B);
  return B.data();
}

// The ground cut open: grade, ballast, soil strata, and the cavities in it.
function ground(B) {
  B.rect(-80, DEEP - 20, LINE_W + 80, 0, M.SOIL, C.soil);
  B.rect(-80, -0.7, LINE_W + 80, 0, M.CUT, C.cutWarm);
  // Tunnels and pits: dark cavities with a cut lining.
  const cave = (x0, y0, x1, y1) => { B.rect(x0 - 0.8, y0 - 0.8, x1 + 0.8, y1, M.CUT, C.cut); B.rect(x0, y0, x1, y1 + 0.01, M.WALL, C.wallIn); };
  // The dumper pit and the reclaim tunnel under the piles.
  cave(P.dumpX0, P.pitY - 2, P.dumpX1, 0);
  cave(P.tunnelX0, P.tunnelY - 1.5, P.tunnelX1, P.tunnelY + 3.4);
  // The tunnel climbs to grade toward the stockhouse.
  B.quad([[P.tunnelX1 - 0.8, P.tunnelY - 2.3], [P.tunnelX1 + 22, -0.7], [P.tunnelX1 + 22, 0], [P.tunnelX1 - 0.8, P.tunnelY + 3.4]], M.CUT, C.cut);
  B.quad([[P.tunnelX1, P.tunnelY - 1.5], [P.tunnelX1 + 20, -0.2], [P.tunnelX1 + 20, 0], [P.tunnelX1, P.tunnelY + 3.4]], M.WALL, C.wallIn);
  // The skip pit under the stockhouse.
  cave(P.stockX0 + 6, P.skipY0 - 2, P.skipX0 + 4, 0);
  // The furnace foundation, deep in the ground.
  B.rect(P.bfX - 12, -9, P.bfX + 12, P.castY - 2, M.CONC, C.conc);
  // The reladling pit in the converter shop.
  cave(P.pitX - 9, -8, P.pitX + 9, 0);
  // The coiler pit at the end of the mill.
  cave(P.coilerX - 5, -9, P.coilerX + 5, 0);
  // Rails along the whole line, at grade.
  B.rect(-80, 0, LINE_W + 80, 0.35, M.RAIL, C.rail);
}

function oreYard(B) {
  // The train dumps into a grated hopper over the pit.
  B.quad([[P.dumpX0, -1], [P.dumpX1, -1], [P.dumpX1 - 5, P.pitY + 1], [P.dumpX0 + 5, P.pitY + 1]], M.STEEL, C.steelDark);
  B.quad([[P.dumpX0 + 1, -1.4], [P.dumpX1 - 1, -1.4], [P.dumpX1 - 5.6, P.pitY + 1.6], [P.dumpX0 + 5.6, P.pitY + 1.6]], M.PILE, C.ore, { k: 0.6 });
  B.rect(P.dumpX0, -0.4, P.dumpX1, 0, M.GRATE, C.steelDark);
  // The tunnel belt runs on idlers; small hoppers drop from each pile.
  B.rect(P.tunnelX0 + 2, P.tunnelY - 0.2, P.tunnelX1, P.tunnelY + 0.5, M.BELT, C.belt);
  B.quad([[P.tunnelX1, P.tunnelY - 0.2], [P.tunnelX1 + 20, -0.9], [P.tunnelX1 + 20, -0.2], [P.tunnelX1, P.tunnelY + 0.5]], M.BELT, C.belt);
  for (const [x0, x1] of P.piles) {
    const m = (x0 + x1) / 2;
    B.quad([[m - 3, -0.6], [m + 3, -0.6], [m + 1, P.tunnelY + 2.4], [m - 1, P.tunnelY + 2.4]], M.STEEL, C.steelDark);
  }
  // The piles: long heaps on the ground.
  for (const [x0, x1, h, kind] of P.piles) {
    const c = kind === 'coal' ? C.coal : C.ore, m = (x0 + x1) / 2;
    B.poly([[x0 - 6, 0], [x1 + 6, 0], [m + 3, h], [m - 3, h]], M.PILE, c, { o: [x0, 0], k: kind === 'coal' ? 0.2 : 0.6 });
  }
  // The stacker-reclaimer: a boom on a rail-mounted tower.
  const sx = 74;
  B.rect(sx - 3, 0.3, sx + 3, 4, M.STEEL, C.steelRed).rect(sx - 1.2, 4, sx + 1.2, 16, M.TRUSS, C.steelRed, { a: 2.4 });
  B.seg(sx - 22, 9, sx + 8, 18, 1.6, M.TRUSS, C.steelRed, { a: 1.6 });
  B.seg(sx, 16, sx - 16, 11.5, 0.15, M.STEEL, C.steelDark).seg(sx, 16, sx + 6, 17.4, 0.15, M.STEEL, C.steelDark);
  B.rect(sx + 4, 15, sx + 9, 19, M.STEEL, C.steelDark);

  // Coal tower over the oven battery.
  const tx = P.coalTowerX;
  B.rect(tx - 4, 0.3, tx + 4, 30, M.CONC, C.conc).rect(tx - 4.6, 30, tx + 4.6, 31.2, M.CUT, C.cut);
  B.quad([[tx - 3, 22], [tx + 3, 22], [tx + 1, 16], [tx - 1, 16]], M.HOLE, C.hole);
  // The battery: a long refractory block cut open on its oven chambers.
  B.rect(P.ovenX0 - 1, 0.3, P.ovenX1 + 1, P.ovenY0, M.CONC, C.conc);
  B.rect(P.ovenX0, P.ovenY0, P.ovenX1, P.ovenY1, M.BRICK, C.brick);
  B.rect(P.ovenX0 - 1.2, P.ovenY1, P.ovenX1 + 1.2, P.ovenY1 + 1.4, M.CUT, C.cut);
  // The charging car rail on top, and the battery stays at the ends.
  B.rect(P.ovenX0 - 6, P.ovenY1 + 1.4, P.ovenX1 + 1, P.ovenY1 + 1.8, M.RAIL, C.rail);
  for (const x of [P.ovenX0 - 1.6, P.ovenX1 + 0.6]) B.rect(x, P.ovenY0, x + 1, P.ovenY1 + 4, M.STEEL, C.steelDark);
  // The waste-gas main runs along the top.
  pipe(B, P.ovenX0, P.ovenY1 + 4.2, P.ovenX1, P.ovenY1 + 4.2, 1.1);
  // A tall stack for the battery's flue gas.
  B.quad([[P.ovenX1 + 4, 0.3], [P.ovenX1 + 7.5, 0.3], [P.ovenX1 + 6.4, 58], [P.ovenX1 + 5.1, 58]], M.BRICK, C.brick, { n: N.VCYL, a: P.ovenX1 + 5.75, b: 1.75 });
  // The quench tower: an open-topped box the quench car runs into.
  const q = P.quenchX;
  B.rect(q - 5, 0.3, q + 5, 12, M.WALL, C.wallIn).rect(q - 5.8, 0.3, q - 5, P.quenchTop, M.CUT, C.cut).rect(q + 5, 0.3, q + 5.8, P.quenchTop, M.CUT, C.cut);
  B.rect(q - 5, 12, q + 5, P.quenchTop, M.WALL, C.wall);
  for (let y = 14; y < P.quenchTop - 2; y += 2.2) B.seg(q - 5, y, q + 5, y + 1.2, 0.35, M.STEEL, C.steelDark);
  B.rect(q - 6.4, P.quenchTop, q + 6.4, P.quenchTop + 0.9, M.CUT, C.cut);
  B.rect(q - 4, 9.4, q + 4, 10, M.PIPE, C.steelDark);
}

function furnace(B) {
  const x = P.bfX;
  // The stockhouse: bins of ore, sinter and coke, cut open.
  shed(B, P.stockX0, P.stockX1, P.stockTop, { windows: false });
  const bins = [[P.stockX0 + 1.5, C.ore], [P.stockX0 + 8.5, C.coke], [P.stockX0 + 15.5, C.sinter]];
  for (const [bx, c] of bins) {
    B.quad([[bx, 21], [bx + 6.5, 21], [bx + 6.5, 10], [bx, 10]], M.STEEL, C.steelDark);
    B.quad([[bx, 10], [bx + 6.5, 10], [bx + 4.2, 6], [bx + 2.3, 6]], M.STEEL, C.steelDark);
    B.quad([[bx + 0.5, 19], [bx + 6, 19], [bx + 6, 10.4], [bx + 0.5, 10.4]], M.PILE, c, { k: 0.4 });
    B.quad([[bx + 0.5, 10.4], [bx + 6, 10.4], [bx + 3.9, 6.6], [bx + 2.6, 6.6]], M.PILE, c, { k: 0.4 });
  }
  slab(B, P.stockX0, P.stockX1, 22);
  grate(B, P.stockX0, P.stockX1, 5.6);
  // The feeder belt from the bins to the skip pit.
  B.rect(P.stockX0 + 2, 4.6, P.skipX0 + 1, 5.2, M.BELT, C.belt);
  stair(B, P.stockX0 + 1.4, 0, P.stockX0 + 6, 5.6);
  ladder(B, P.stockX1 - 2, 5.6, 22);

  // The skip incline: a lattice bridge from the pit to the furnace top.
  B.seg(P.skipX0, P.skipY0, P.skipX1, P.skipY1, 2.6, M.TRUSS, C.steelRed, { a: 2.6 });
  B.seg(P.skipX0, P.skipY0 + 0.2, P.skipX1, P.skipY1 + 0.2, 0.4, M.STEEL, C.steelDark);
  // Its two legs.
  B.quad([[236, 0.3], [237.4, 0.3], [238.6, 23], [237.6, 23]], M.STEEL, C.steelDark);
  B.quad([[244, 0.3], [245.4, 0.3], [246.4, 42], [245.4, 42]], M.STEEL, C.steelDark);

  // The furnace shell and its lining, cut through on both sides.
  const prof = BF_PROFILE, t = 1.6, s = 0.9;
  for (let i = 0; i < prof.length - 1; i++) {
    const [y0, r0] = prof[i], [y1, r1] = prof[i + 1];
    for (const side of [-1, 1]) {
      B.quad([[x + side * r0, y0], [x + side * (r0 + t), y0], [x + side * (r1 + t), y1], [x + side * r1, y1]], M.BRICK, C.brick);
      B.quad([[x + side * (r0 + t), y0], [x + side * (r0 + t + s), y0], [x + side * (r1 + t + s), y1], [x + side * (r1 + t), y1]], M.CUT, C.steelRed);
    }
  }
  // The hearth floor: carbon blocks on the foundation.
  B.rect(x - 6.4 - t - s, P.castY - 2, x + 6.4 + t + s, 6, M.BRICK, C.cutWarm);
  // The top: the cone, the receiving hopper and the uptakes.
  B.quad([[x - 3.2 - t, 57], [x + 3.2 + t, 57], [x + 2, 60], [x - 2, 60]], M.STEEL, C.steel);
  B.quad([[x - 4, 60], [x + 4, 60], [x + 4, 64], [x - 4, 64]], M.STEEL, C.steelDark);
  B.quad([[x - 3, 64], [x + 3, 64], [x + 4.5, 68], [x - 4.5, 68]], M.STEEL, C.steel);
  for (const sx of [-1, 1]) B.quad([[x + sx * 2.5, 58], [x + sx * 3.8, 58], [x + sx * 3.8, 78], [x + sx * 2.5, 78]], M.PIPE, C.steel, { n: N.VCYL, a: x + sx * 3.15, b: 0.65 });
  B.rect(x - 4.4, 78, x + 4.4, 79.6, M.PIPE, C.steel, { n: N.HCYL, a: 78.8, b: 0.8 });
  // Bleeders and their flare tips.
  for (const sx of [-1, 1]) B.rect(x + sx * 3.15 - 0.3, 79.6, x + sx * 3.15 + 0.3, 84, M.STEEL, C.steelDark);
  // The downcomer to the dust catcher.
  pipe(B, x + 3.6, 77.5, P.catcherX, 52, 1.2);
  cyl(B, P.catcherX, 36, 52, 3.6, M.STEEL, C.steel);
  B.disc(P.catcherX, 52, 3.6, M.STEEL, C.steel, { a0: 0, a1: Math.PI, seg: 12 });
  B.quad([[P.catcherX - 3.6, 36], [P.catcherX + 3.6, 36], [P.catcherX + 0.8, 31], [P.catcherX - 0.8, 31]], M.STEEL, C.steelDark);
  for (const lx of [-3, 3]) B.rect(P.catcherX + lx - 0.3, P.castY, P.catcherX + lx + 0.3, 36, M.STEEL, C.steelDark);
  // The bustle pipe rings the bosh; tuyeres feed the hot blast in.
  B.rect(x - 11.5, 19.2, x + 11.5, 21.2, M.PIPE, C.steelRed, { n: N.HCYL, a: 20.2, b: 1 });
  for (const sx of [-1, 1]) B.seg(x + sx * 11, 19.4, x + sx * 8.6, 15.6, 0.7, M.PIPE, C.steel);
  // The hot blast main from the stoves.
  pipe(B, x + 11, 30.4, P.stoveXs[2] + 1, 30.4, 1.3, C.steelRed);
  B.seg(x + 11, 30.4, x + 11, 20.4, 1.6, M.PIPE, C.steelRed);
  // Three hot stoves: tall domed cylinders.
  for (const sx of P.stoveXs) {
    cyl(B, sx, 0.3, P.stoveTop, P.stoveR, M.STEEL, C.steel);
    B.disc(sx, P.stoveTop, P.stoveR, M.STEEL, C.steel, { a0: 0, a1: Math.PI, seg: 14 });
    for (let y = 6; y < P.stoveTop; y += 6) B.rect(sx - P.stoveR, y, sx + P.stoveR, y + 0.25, M.STEEL, C.steelDark);
  }
  // The middle stove is cut open on its checker bricks.
  const ms = P.stoveXs[1];
  B.rect(ms - P.stoveR + 0.6, 3, ms + P.stoveR - 0.6, P.stoveTop - 1, M.BRICK, C.brick, { k: 0.35 });

  // The cast house: a floor round the hearth, a roof over it.
  shed(B, x - 16, x + 34, 32, { windows: true, pitch: 1.6 });
  slab(B, x - 16, x - 8.4, P.castY);
  slab(B, x + 8.4, x + 34, P.castY);
  B.rect(x + 8.4, 0.3, x + 34, P.castY - 0.8, M.WALL, C.wallIn);
  for (const cx of [x + 14, x + 22, x + 33]) B.rect(cx - 0.4, 0.3, cx + 0.4, P.castY - 0.8, M.CONC, C.conc);
  // The runner: a sand-lined trough from the taphole to the spout.
  B.rect(P.tapX - 0.4, P.castY, P.runnerX1, P.castY + 0.7, M.CUT, C.cutWarm);
  B.rect(P.runnerX1 - 0.6, P.castY - 1.6, P.runnerX1 + 0.8, P.castY + 0.7, M.STEEL, C.steelDark);
  // The mudgun and drill stand by the taphole.
  B.rect(P.tapX + 2, P.castY + 0.7, P.tapX + 3, P.castY + 4, M.STEEL, C.steelDark);
  stair(B, x + 26, P.castY, x + 30, 0.3);
  // A platform round the furnace at the tuyere level, and one at the top.
  grate(B, x - 12, x - 8.8, 23);
  grate(B, x + 8.8, x + 13, 23);
  ladder(B, x - 11, P.castY, 23);
  grate(B, x - 8, x + 8, 64.5);
  ladder(B, x - 6, 57, 64.5);
}

function converter(B) {
  shed(B, P.shopX0, P.shopX1, P.shopTop);
  // The crane bridge: a lattice girder across the bay on its runway.
  B.rect(P.shopX0 + 0.9, P.craneY - 1.4, P.shopX1 - 0.9, P.craneY - 0.4, M.STEEL, C.steelDark);
  B.rect(P.shopX0 + 0.9, P.craneY + 1.4, P.shopX1 - 0.9, P.craneY + 3.4, M.TRUSS, C.steelRed, { a: 2 });
  for (let x = P.shopX0 + 10; x < P.shopX1; x += 16) B.rect(x - 0.5, 0.3, x + 0.5, P.craneY - 1.4, M.STEEL, C.steelDark);
  // The operating floor, open round the vessel.
  slab(B, P.shopX0 + 0.9, P.convX - 8, P.floorY);
  slab(B, P.convX + 8, P.shopX1 - 0.9, P.floorY);
  for (const x of [P.convX - 13, P.convX + 13]) B.rect(x - 0.5, 0.3, x + 0.5, P.floorY - 0.8, M.CONC, C.conc);
  // The trunnion stands.
  for (const x of [P.convX - 8.4, P.convX + 7.4]) B.rect(x, P.floorY, x + 1, P.convY + 1.2, M.STEEL, C.steelDark);
  // The hood over the mouth, and its duct up through the roof to the stack.
  const hx = P.convX;
  B.quad([[hx - 6, P.hoodY], [hx + 6, P.hoodY], [hx + 4, P.hoodY + 6], [hx - 1, P.hoodY + 6]], M.STEEL, C.steelRed);
  B.quad([[hx - 1, P.hoodY + 6], [hx + 4, P.hoodY + 6], [hx + 18, P.hoodY + 20], [hx + 13, P.hoodY + 20]], M.PIPE, C.steelRed, { n: N.TILT, a: -0.35, b: 0.35 });
  B.rect(hx + 13, P.hoodY + 20, hx + 18, 102, M.STEEL, C.steel, { n: N.VCYL, a: hx + 15.5, b: 2.5 });
  B.rect(hx + 12.6, 100, hx + 18.4, 102, M.STEEL, C.steelDark);
  // The lance carriage tower.
  B.rect(hx - 0.8, P.hoodY + 6, hx + 0.8, P.craneY - 2, M.TRUSS, C.steelDark, { a: 1.6 });
  // Stairs between the floors.
  stair(B, P.shopX1 - 12, 0.3, P.shopX1 - 4, P.floorY);
  stair(B, P.shopX0 + 26, P.floorY, P.shopX0 + 32, P.floorY + 9);
  grate(B, P.shopX0 + 18, P.shopX0 + 32, P.floorY + 9);
  // Hot metal ladles at rest on the floor, as props.
  ladder(B, P.shopX1 - 2.4, P.floorY, P.craneY - 1.4);
}

function caster(B) {
  shed(B, P.castX0, P.castX1, P.castTop);
  B.rect(P.castX0 + 0.9, 40, P.castX1 - 0.9, 41, M.STEEL, C.steelDark);
  B.rect(P.castX0 + 0.9, 41.6, P.castX1 - 0.9, 43.2, M.TRUSS, C.steelRed, { a: 1.6 });
  // The turret column, and the casting floor at the tundish.
  B.rect(P.turretX - 1.4, 0.3, P.turretX + 1.4, 28, M.STEEL, C.steel, { n: N.VCYL, a: P.turretX, b: 1.4 });
  slab(B, P.castX0 + 0.9, P.turretX - 2, 24.6);
  slab(B, P.tundishX + 8, P.castX1 - 0.9, 24.6);
  // The strand's segment frame: a row of roller pairs round the arc.
  for (let s = 0.6; s < STRAND_LEN; s += 1.4) {
    const [x, y, a] = strandAt(s);
    const nx = Math.cos(a), ny = -Math.sin(a);
    for (const k of [-1.1, 1.1]) B.disc(x + nx * k, y + ny * k, 0.42, M.STEEL, C.steelDark, { seg: 8 });
  }
  // Segment frames behind the rollers.
  B.quad([[P.tundishX - 2, 2], [P.tundishX + P.arcR + 2, 2], [P.tundishX + P.arcR + 2, P.mouldY - 1], [P.tundishX - 2, P.mouldY - 1]], M.WALL, C.wallIn);
  // The roller table from the strand to the mill.
  for (let x = P.tundishX + P.arcR + 1; x < P.millX0 + 6; x += 1.6) B.disc(x, 1.8, 0.5, M.STEEL, C.steelDark, { seg: 8 });
  B.rect(P.tundishX + P.arcR, 0.3, P.millX0 + 6, 1.3, M.STEEL, C.steelDark);
  stair(B, P.castX1 - 10, 0.3, P.castX1 - 3, 24.6);
}

function mill(B) {
  shed(B, P.millX0, P.millX1, P.millTop);
  B.rect(P.millX0 + 0.9, 17, P.millX1 - 0.9, 17.8, M.STEEL, C.steelDark);
  // The reheat furnace: a long refractory box, open on its hearth.
  B.rect(P.reheatX0, 0.3, P.reheatX1, 10, M.BRICK, C.brick);
  B.rect(P.reheatX0 + 1.2, 1.4, P.reheatX1 - 1.2, 8.6, M.WALL, [0.05, 0.02, 0.01]);
  B.rect(P.reheatX0 - 0.6, 10, P.reheatX1 + 0.6, 11.2, M.CUT, C.cut);
  for (let x = P.reheatX0 + 3; x < P.reheatX1 - 2; x += 4) B.rect(x, 11.2, x + 1.2, 13.5, M.STEEL, C.steelDark);
  B.rect(P.reheatX1 - 3, 13.5, P.reheatX1 - 1, 30, M.BRICK, C.brick, { n: N.VCYL, a: P.reheatX1 - 2, b: 1 });
  // The roller table through the mill.
  for (let x = P.reheatX1; x < P.runX1; x += 1.4) B.disc(x, 1.8, 0.45, M.STEEL, C.steelDark, { seg: 8 });
  B.rect(P.reheatX1, 0.3, P.runX1, 1.3, M.STEEL, C.steelDark);
  // Stands: two housings, a work roll pair, backup rolls, the motor spindle.
  const stand = (x, h, big) => {
    B.rect(x - 1.8, 0.3, x + 1.8, h, M.STEEL, C.steel);
    B.rect(x - 1.2, 0.9, x + 1.2, h - 1, M.HOLE, C.hole);
    const r = big ? 1.1 : 0.7;
    B.disc(x, 2.4 + r * 2 + 0.25, r * 1.4, M.STEEL, C.steelDark, { seg: 14 });
    B.disc(x, 2.4 + r, r, M.STEEL, C.steel, { seg: 14 });
    B.disc(x, 2.4 - r, r, M.STEEL, C.steel, { seg: 14 });
    B.disc(x, 2.4 - r * 3 - 0.25, r * 1.4, M.STEEL, C.steelDark, { seg: 14 });
    B.rect(x - 2.2, h, x + 2.2, h + 1, M.STEEL, C.steelRed);
  };
  stand(P.roughX, 14, true);
  for (let i = 0; i < P.stands; i++) stand(P.standX0 + i * P.standGap, 11.5, false);
  // Water headers over the runout table.
  for (let x = P.standX0 + P.stands * P.standGap; x < P.runX1 - 1; x += 3) pipe(B, x - 1.2, 6.2, x + 1.2, 6.2, 0.35);
  // The coil yard: a shed of its own with a crane beam.
  shed(B, P.yardX0, P.yardX1, 26, { pitch: 1.2 });
  B.rect(P.yardX0 + 0.9, 20, P.yardX1 - 0.9, 20.8, M.STEEL, C.steelDark);
  B.rect(P.yardX0 + 0.9, 21.4, P.yardX1 - 0.9, 22.8, M.TRUSS, C.steelRed, { a: 1.4 });
  stair(B, P.millX0 + 3, 0.3, P.millX0 + 9, 8);
  grate(B, P.millX0 + 9, P.reheatX0 - 0.6, 8);
  // The pulpit: the mill's control room, lit inside.
  B.rect(P.standX0 + 8, 13, P.standX0 + 20, 17, M.CUT, C.cut);
  B.rect(P.standX0 + 9, 13.6, P.standX0 + 19, 16.4, M.GLASS, [0.9, 0.85, 0.7], { k: 0.25 });
}

// Yard lights on masts between the buildings.
export const MASTS = [[6, 34], [104, 30], [188, 36], [340, 40], [452, 34], [680, 32]];
function masts(B) { for (const [x, h] of MASTS) mast(B, x, h); }
