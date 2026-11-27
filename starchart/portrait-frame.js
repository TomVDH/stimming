import { STARS, R, BCRIT, NR, MAX_FLARES, magAxis, SPIN, streamPath } from './sun.js';

const identity = () => new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
const four = () => new Float32Array(4);

// Match the live tray's logarithmic radius scale.
export function portraitSize(rsun) {
  const f = Math.min(1, Math.max(0, (Math.log10(rsun) + 4.8) / 9.3)) ** 1.4;
  return 24 + f * 76;
}

export function portraitFrame(id, data) {
  const B = STARS[id];
  const f = { band: B, data, count: 0, bloomLevels: 3, march: 1, frameNo: 0, time: 34, sc: 1, dpr: 1, dip: 1, lens: 0, full: .5, far: 1, off: 1, shimmer: 0, volDens: 0, volLight: 1.3 * B.disk[0], corona: 0, bend: 0, volHold: 0, jet: B.jet, pulse: -1, flashW: .25, post: null, fluid: null };
  for (const key of ['bodyA', 'bodyB', 'ship', 'ship2', 'dot', 'probe', 'probe2', 'beam', 'yso', 'lump', 'beat', 'cam', 'film', 'fx1', 'fx2', 'fx3', 'fx4', 'fx5', 'hole', 'holeV', 'holeQ', 'ring', 'ring2', 'ring3', 'shell', 'pair', 'pair2', 'bow', 'lh', 'quake', 'ns', 'nsU', 'nsV', 'bin', 'binD', 'binN', 'gas']) f[key] = four();
  f.rot = identity(); f.toSun = identity(); f.camM = identity();
  f.view = four(); f.centre = new Float32Array(2); f.sway = new Float32Array(2);
  f.regs = new Float32Array(NR * 4); f.spots = new Float32Array(NR * 4);
  f.fl = new Float32Array(MAX_FLARES * 4); f.flB = new Float32Array(MAX_FLARES * 4); f.sat = new Float32Array(MAX_FLARES * 4);
  f.egg = new Float32Array(16); f.dim = new Float32Array(8); f.path = new Float32Array(48);
  f.bodyK = new Float32Array(2); f.holeSky = new Float32Array(2); f.holeF = new Float32Array(2); f.nsBend = new Float32Array(2); f.bowC = new Float32Array(3);
  f.fx3.set([0, 1.35, 0, 1]); f.fx4.set([1, 0, 1, 1]); f.cam[3] = 1;
  f.lump.set([B.lump[0], B.lump[1], 1, B.lump[3]]);
  const axis = B.yso.slice(0, 3), length = Math.hypot(...axis) || 1;
  f.yso.set([...axis.map(x => x / length), B.yso[3]]);
  let cx = 0, cy = 0, half = 1100 * B.reach;
  if (B.yso[3] > 0) half = R * 11;
  if (B.ring) {
    const g = B.ring;
    cx = g.cx * R; cy = g.cy * R; half = (g.outer || 6) * R * 1.4;
    f.ring.set([g.tau, g.cx, g.cy, g.ratio]);
    f.ring2.set([g.angle, g.glow, g.inner || 0, g.outer || 0]);
    f.ring3.set([g.cloud ?? 1, g.width ?? .1, g.clump ?? .9, g.bands ? 1 : 0]);
  }
  if (B.pair) {
    const p = B.pair;
    f.pair.set([...p.at, 1]); f.pair2.set([p.size, p.neck, p.cool, 0]);
    if (!B.bow) { cx = p.at[0] * R * .5; cy = p.at[1] * R * .5; half = R * (1.5 + Math.hypot(...p.at.slice(0, 2)) * .5); }
  }
  if (B.bin) {
    const b = B.bin;
    f.bin.set([b.a, 0, 0, 1]); f.binD.set([b.rd, b.th, b.jet, b.light]);
    f.binN.set([0, Math.cos(b.tilt), Math.sin(b.tilt), 0]);
    f.gas.set([1, 2.5 * b.light, 3 * b.heat, 4.5 * b.heat]);
    streamPath(b).forEach((p, i) => f.path.set(p, i * 4));
    cx = b.a * R * .5; half = R * (b.a * .5 + b.rd + 1.8);
  }
  if (B.shells) f.shell.set([B.shells.light, B.shells.gap, 3, 0]);
  if (B.bow) {
    const b = B.bow;
    f.bow.set([1 + (b.style || 0), b.heading, b.size, b.kind]); f.bowC.set(b.col);
    if ([4, 5, 6, 7, 8].includes(b.kind)) half = Math.max(half, b.size * R * 1.8);
    if (b.kind === 2 && b.style >= 2) half = b.size * R * .045;
    if (b.kind === 2 && (b.style || 0) < 2) {
      cx = Math.cos(b.heading) * b.size * R * .85;
      cy = Math.sin(b.heading) * b.size * R * .85;
      half = b.size * R * 1.15;
    }
  }
  if (B.hole) {
    const h = B.hole, v = h.vol, q = h.qso;
    half = R * (q ? 18 : 13);
    f.full = 0;
    f.fx3[1] = q ? 1.45 : 1.65;
    f.hole.set([1, h.tilt, h.light, h.heat]);
    f.holeSky.set([2 * half / 288 * BCRIT / R, 0]); f.holeF.set([1, 0]);
    if (v) f.holeV.set([1, v.dens, v.light * (id === 'cygx1' || id === 'sgra' ? 1.8 : 1), q ? 40 : 18]);
    if (q) f.holeQ.set([1, q.torus, q.clouds, q.winds]);
  }
  if (B.ns) {
    const n = B.ns, m = magAxis(0);
    f.ns.set([1, n.u, n.wind, n.rl]);
    const len = Math.hypot(SPIN[0], SPIN[1]);
    const u = [SPIN[1] / len, -SPIN[0] / len, 0];
    const v = [SPIN[1] * u[2] - SPIN[2] * u[1], SPIN[2] * u[0] - SPIN[0] * u[2], SPIN[0] * u[1] - SPIN[1] * u[0]];
    f.nsU.set([...u, 0]); f.nsV.set([...v, Math.acos(SPIN[2])]);
    f.beam.set([...m, B.beam]); f.lh.set([...m, n.beam * .5]);
    if (!B.bow) half = R * 4;
  }
  f.view.set([cx, cy, half, half]);
  f.centre.set([.5 - cx / half * .5, .5 - cy / half * .5]);
  return f;
}


// Reframe the render when visible emission reaches its capture boundary.
export function portraitNeedsRoom(pixels, width, height, pad = 3) {
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (x >= pad && x < width - pad && y >= pad && y < height - pad) continue;
    if (pixels[(y * width + x) * 4 + 3] > 3) return true;
  }
  return false;
}

// Bounds follow actual alpha, including feathered edges and narrow objects.
export function portraitBounds(pixels, width, height, pad = 3) {
  let left = width, right = -1, top = height, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!pixels[(y * width + x) * 4 + 3]) continue;
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right < left) return null;
  left = Math.max(0, left - pad); top = Math.max(0, top - pad);
  right = Math.min(width - 1, right + pad); bottom = Math.min(height - 1, bottom + pad);
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

export function portraitLoopState(elapsedMs) {
  const phase = ((elapsedMs % 120000) + 120000) % 120000 / 120000;
  return { phase, angle: phase * Math.PI * 2, blend: phase * phase * (3 - 2 * phase), timeA: 34 + phase * 8, timeB: 26 + phase * 8 };
}

// The paired times blend into the same state at either loop end.
export function turnPortraitFrame(frame, loop, second = false) {
  frame.time = second ? loop.timeB : loop.timeA;
  const axis = frame.band.ns ? SPIN : [0, 1, 0];
  const length = Math.hypot(...axis), [x, y, z] = axis.map(v => v / length);
  const c = Math.cos(loop.angle), s = Math.sin(loop.angle), t = 1 - c;
  frame.rot.set([t*x*x+c, t*x*y+s*z, t*x*z-s*y, t*x*y-s*z, t*y*y+c, t*y*z+s*x, t*x*z+s*y, t*y*z-s*x, t*z*z+c]);
  const m = frame.rot;
  if (frame.band.bow?.kind === 2) frame.sway.set([Math.sin(loop.angle) * .006, (1 - Math.cos(loop.angle)) * .004]);
  frame.toSun.set([m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]);
  if (frame.band.ns) {
    const spinLength = Math.hypot(SPIN[0], SPIN[1]);
    const u = [SPIN[1] / spinLength, -SPIN[0] / spinLength, 0];
    const v = [SPIN[1]*u[2]-SPIN[2]*u[1], SPIN[2]*u[0]-SPIN[0]*u[2], SPIN[0]*u[1]-SPIN[1]*u[0]];
    const rotate = q => [m[0]*q[0]+m[3]*q[1]+m[6]*q[2], m[1]*q[0]+m[4]*q[1]+m[7]*q[2], m[2]*q[0]+m[5]*q[1]+m[8]*q[2]];
    frame.nsU.set([...rotate(u), 0]); frame.nsV.set([...rotate(v), Math.acos(SPIN[2])]);
    frame.beam.set([...rotate(magAxis(0)), frame.band.beam]);
    frame.lh.set([...frame.beam.slice(0, 3), frame.band.ns.beam * .5]);
  }
}
