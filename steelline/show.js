// Steel line show: what each step draws this frame, from the line's state.
// It writes sprites, lights and plumes; render.js draws them.
import { K } from './shaders.js';
import { P, MASTS, STRAND_LEN, strandAt, bfR } from './works.js';
import { MAX_SPRITES, SF } from './render.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);

export function makeShow() {
  const spr = new Float32Array(MAX_SPRITES * SF);
  let n = 0;
  const L = [];
  const plumes = new Float32Array(10 * 4), plumeC = new Float32Array(10 * 4);
  let np = 0;

  // One sprite: centre, half size, angle, kind, heat, phase, colour, extra.
  function put(x, y, hw, hh, ang, kind, heat = 0, ph = 0, r = 0.05, g = 0.05, b = 0.055, w = 0) {
    if (n >= MAX_SPRITES) return;
    const o = n++ * SF;
    spr[o] = x; spr[o + 1] = y; spr[o + 2] = hw; spr[o + 3] = hh;
    spr[o + 4] = ang; spr[o + 5] = kind; spr[o + 6] = heat; spr[o + 7] = ph;
    spr[o + 8] = r; spr[o + 9] = g; spr[o + 10] = b; spr[o + 11] = w;
  }
  const box = (x, y, hw, hh, c = [0.05, 0.05, 0.055], ang = 0, glow = 0) => put(x, y, hw, hh, ang, K.BOX, 0, 0, c[0], c[1], c[2], glow);
  const hot = (x, y, hw, hh, heat, ang = 0, ph = 0, gain = 1) => put(x, y, hw, hh, ang, K.HOT, heat, ph, 0, 0, 0, gain);
  // A line between two points, as a thin box.
  const rope = (x0, y0, x1, y1, w = 0.09, c = [0.03, 0.03, 0.034]) => box((x0 + x1) / 2, (y0 + y1) / 2, Math.hypot(x1 - x0, y1 - y0) / 2, w, c, Math.atan2(y1 - y0, x1 - x0));
  // A light: position, reach, colour times strength.
  const light = (x, y, z, R, r, g, b) => L.push(x, y, z, R, r, g, b, 0);
  // A hot light from a heat, in the iron's colour.
  function hotLight(x, y, heat, R, gain = 1) {
    const t = clamp((heat - 0.22) / 0.78, 0, 1), k = (0.03 * t + 0.9 * t * t + 2.4 * t ** 4) * gain;
    if (k < 0.02) return;
    light(x, y, 2.2, R, k * 1.0, k * lerp(0.18, 0.7, t), k * lerp(0.03, 0.4, t * t));
  }
  function plume(x, y, k, w, c = [1, 1, 1]) {
    if (np >= 10 || k <= 0) return;
    plumes.set([x, y, k, w], np * 4);
    plumeC.set([c[0], c[1], c[2], 0], np * 4);
    np++;
  }

  // The view's span, so far goods cost nothing.
  let vx0 = 0, vx1 = 1e9;
  const seen = (x0, x1) => x1 > vx0 && x0 < vx1;

  /* ---------- the steps ---------- */
  function oreYard(st) {
    const y = st.yard;
    if (seen(-60, 200)) {
      // The train: a loco and wagons that stop over the dumper.
      const tx = y.trainX;
      if (tx > -80) {
        put(tx + 7.2, 2.6, 6.4, 2.2, 0, K.LOCO, 0, 0, 0.12, 0.05, 0.02);
        light(tx + 13.4, 1.8, 1.5, 3, 0.9, 0.8, 0.6);
        for (let i = 0; i < y.wagons.length; i++) {
          const w = y.wagons[i], x = tx - 6 - i * 11.4;
          const tip = w.tip;
          put(x, 2.6 + tip * 1.2, 5.2, 2.2, tip * 2.4, K.WAGON, 0, 0, 0.06, 0.035, 0.03, w.load);
        }
      }
      // Ore drops into the pit while a wagon tips.
      if (y.dumping > 0) for (let i = 0; i < 14; i++) {
        const t = (st.t * 1.3 + i / 14) % 1;
        put(lerp(P.dumpX0 + 4, P.dumpX0 + 8, (i * 37 % 10) / 10), lerp(1, P.pitY + 2, t), 0.35, 0.3, 0, K.LUMP, 0, i, 0.12, 0.05, 0.03);
      }
      // Lumps on the tunnel belt and up the incline.
      const belt = st.beltPos;
      for (let i = 0; i < 70; i++) {
        const s = ((i * 3.2 + belt) % 224);
        const len1 = P.tunnelX1 - P.tunnelX0 - 2;
        let x, yy;
        if (s < len1) { x = P.tunnelX0 + 2 + s; yy = P.tunnelY + 0.75; } else if (s < len1 + 25) { const t = (s - len1) / 25; x = P.tunnelX1 + t * 20; yy = lerp(P.tunnelY + 0.75, -0.25, t); } else continue;
        if (y.beltLoad < (i % 10) / 10) continue;
        const coke = i % 3 === 0;
        put(x, yy, 0.38, 0.26, 0, K.LUMP, 0, i, coke ? 0.05 : 0.13, coke ? 0.05 : 0.055, coke ? 0.055 : 0.03);
      }
      // Tunnel lamps.
      for (let x = P.tunnelX0 + 8; x < P.tunnelX1; x += 22) light(x, P.tunnelY + 2.8, 1.2, 3.2, 0.12, 0.13, 0.16);
    }
    if (seen(110, 200)) {
      // Coke oven chambers bake in turn; one pushes at a time.
      const w = (P.ovenX1 - P.ovenX0) / P.ovens;
      for (let i = 0; i < P.ovens; i++) {
        const age = y.ovens[i];
        const x = P.ovenX0 + (i + 0.5) * w;
        put(x, (P.ovenY0 + P.ovenY1) / 2, w * 0.3, (P.ovenY1 - P.ovenY0) / 2 - 0.6, 0, K.SLOT, lerp(0.3, 0.78, ease(age)), i, 0, 0, 0, age);
      }
      hotLight((P.ovenX0 + P.ovenX1) / 2, P.ovenY1 - 4, 0.6, 14, 0.9);
      // The quench car, and the cake it carries.
      const qx = y.quenchX;
      put(qx, 2.4, 5, 1.8, 0, K.BOX, 0, 0, 0.05, 0.04, 0.035, 0);
      if (y.cake > 0) { hot(qx, 4.4, 4.6, 0.7, y.cake, 0, 3); hotLight(qx, 5.5, y.cake, 8); }
      plume(P.quenchX, P.quenchTop, y.steam * 0.12, 3.6, [1.4, 1.4, 1.45]);
      plume(P.ovenX1 + 5.75, 58, 0.02, 1.2, [0.7, 0.68, 0.66]);
    }
  }

  function furnace(st) {
    const f = st.bf;
    if (!seen(180, 350)) return;
    // The inside: burden that sinks, a hearth that fills.
    put(P.bfX, 32, 8, 26, 0, K.FURNACE, f.heat, f.burden, 0, 0, 0, f.hearth);
    hotLight(P.bfX, 10, 0.85 * f.heat, 9, 1.2);
    hotLight(P.bfX, 24, 0.55, 12, 0.7);
    // Tuyere peepholes.
    for (const sx of [-1, 1]) { put(P.bfX + sx * 8.6, 15.6, 0.35, 0.35, 0, K.LAMP, 0, 0, 1.6, 1.0, 0.5, 0.5); }
    // Skip cars: one up, one down.
    for (const c of f.skips) {
      const x = lerp(P.skipX0 + 1, P.skipX1 - 1, c.s), yy = lerp(P.skipY0 + 1.2, P.skipY1 + 0.4, c.s);
      put(x, yy + 1.3, 1.6, 1.1, Math.atan2(P.skipY1 - P.skipY0, P.skipX1 - P.skipX0), K.SKIP, 0, 0, 0.07, 0.03, 0.02, c.full ? 1 : 0);
    }
    // The tap: iron runs the runner and pours into the torpedo.
    const tp = f.tap;
    if (tp > 0) {
      const y0 = P.castY + 0.45;
      hot((P.tapX + P.runnerX1) / 2, y0, (P.runnerX1 - P.tapX) / 2, 0.28, 0.95 * tp, 0, 1, 1.4);
      put(P.runnerX1 + 1.1, (P.castY - 1 + 4.2) / 2, 0.45, (P.castY - 1 - 4.2) / 2 + 0.2, 0, K.STREAM, 0.95, 0, 0, 0, 0, tp);
      hotLight(P.tapX + 4, P.castY + 1.5, 0.95 * tp, 10, 1.4);
      hotLight(P.runnerX1, 5, 0.9 * tp, 7, 1);
      plume(P.tapX + 6, P.castY + 1, 0.05 * tp, 3, [1.0, 0.8, 0.6]);
    }
    // Torpedo cars on the hot metal track.
    for (const t of st.torpedoes) put(t.x, 2.7, 8, 2.4, t.tilt, K.TORPEDO, t.heat, 0, 0, 0, 0, t.fill);
    // Stove glow: the cut stove's checkers.
    light(P.stoveXs[1], 20, 2, 6, 0.25, 0.06, 0.01);
    plume(P.bfX - 3.15, 84, f.bleed * 0.04, 1, [0.9, 0.85, 0.8]);
  }

  function converter(st) {
    const c = st.conv;
    if (!seen(330, 470)) return;
    // The vessel, its bath and the blow.
    put(P.convX, P.convY, 6, 7.5, c.tilt, K.CONV, c.heat, c.blow, 0, 0, 0, c.fill);
    if (c.fill > 0.05) hotLight(P.convX + Math.sin(-c.tilt) * 5, P.convY + Math.cos(c.tilt) * 4, c.heat * 0.9, 8, 1);
    if (c.blow > 0) {
      const b = c.blow;
      // The flame stands out of the mouth into the hood.
      put(P.convX, P.convY + 7.5 + 6, 3.2, 7.2, 0, K.FLAME, 0, 0, 0, 0, 0, b * 1.3);
      light(P.convX, P.convY + 11, 3, 16, 3.2 * b, 2.6 * b, 1.8 * b);
      plume(P.convX + 2, P.hoodY + 4, 0.1 * b, 3, [1.2, 0.75, 0.5]);
    }
    // The lance hangs from its carriage.
    box(P.convX, c.lance + 8, 0.28, 8, [0.06, 0.06, 0.065]);
    // The crane: a trolley on the runway, ropes and a ladle.
    const cr = c.crane;
    box(cr.x, P.craneY + 0.5, 3, 0.9, [0.08, 0.06, 0.02]);
    if (cr.ladle) {
      const ly = cr.y;
      rope(cr.x - 2, P.craneY, cr.x - 2.4, ly + 3.4);
      rope(cr.x + 2, P.craneY, cr.x + 2.4, ly + 3.4);
      put(cr.x, ly, 3.2, 3.2, cr.tip, K.LADLE, cr.heat, 0, 0, 0, 0, cr.fill);
      if (cr.fill > 0.05) hotLight(cr.x, ly + 3, cr.heat * 0.85, 7, 0.8);
    }
    // The pour into the vessel, and the tap out of it.
    if (c.pourIn > 0) put(P.convX - 4.5, P.convY + 8, 0.5, 4.5, 0, K.STREAM, 0.9, 0, 0, 0, 0, c.pourIn);
    if (c.tapOut > 0) put(P.convX + 4, (P.convY - 3 + 3) / 2 + 2, 0.35, 10, 0, K.STREAM, 1.0, 0, 0, 0, 0, c.tapOut);
    // The pit ladle on its car, and the steel ladle on its transfer car.
    if (c.pit.on) {
      put(P.pitX, -4, 3.2, 3.2, 0, K.LADLE, c.pit.heat, 0, 0, 0, 0, c.pit.fill);
      if (c.pit.fill > 0.05) hotLight(P.pitX, -1, c.pit.heat * 0.8, 6, 0.8);
    }
    if (c.pourPit > 0) put(P.pitX - 1, 0.6, 0.4, 3.4, 0, K.STREAM, 0.9, 0, 0, 0, 0, c.pourPit);
    for (const l of st.steelLadles) {
      box(l.x, 1.4, 4, 0.8, [0.05, 0.045, 0.04]);
      if (l.y > 5.3) { rope(l.x - 2, 41, l.x - 2.4, l.y + 3.4); rope(l.x + 2, 41, l.x + 2.4, l.y + 3.4); }
      put(l.x, l.y, 3.2, 3.2, 0, K.LADLE, l.heat, 0, 0, 0, 0, l.fill);
      if (l.fill > 0.05) hotLight(l.x, l.y + 3.3, l.heat * 0.8, 6, 0.7);
    }
  }

  function caster(st) {
    const s = st.cast;
    if (!seen(440, 560)) return;
    // The ladle on the turret pours into the tundish.
    if (s.ladle) {
      put(P.turretX + 3, 33, 3.2, 3.2, 0, K.LADLE, s.ladle.heat, 0, 0, 0, 0, s.ladle.fill);
      if (s.ladle.fill > 0.02) put(P.turretX + 6.2, 27.6, 0.25, 2.6, 0, K.STREAM, 0.98, 0, 0, 0, 0, 1);
    }
    // The tundish, the mould and the strand.
    box(P.tundishX, 26, 5, 1.4, [0.06, 0.05, 0.045]);
    if (s.tundish > 0.02) hot(P.tundishX, 26.4, 4.3, 0.8, 0.92, 0, 0, 1);
    box(P.tundishX, P.mouldY + 1, 1.6, 1.3, [0.08, 0.05, 0.03]);
    const flow = s.run;
    for (let d = 0.5; d < STRAND_LEN - 0.3; d += 0.9) {
      const [x, y, a] = strandAt(d), [x2, y2] = strandAt(d + 0.9);
      const heat = lerp(0.95, 0.52, d / STRAND_LEN) * (flow > 0 ? 1 : 0.85);
      hot((x + x2) / 2, (y + y2) / 2, 0.55, 0.8, heat, Math.atan2(y2 - y, x2 - x) + Math.PI / 2, d, 1);
    }
    for (let d = 2; d < STRAND_LEN; d += 7) { const [x, y] = strandAt(d); hotLight(x, y, lerp(0.9, 0.55, d / STRAND_LEN), 4.5, 0.6); }
    // Slabs on the roller table toward the mill.
    for (const sl of st.slabs) if (sl.x < P.reheatX0 + 1) { hot(sl.x, 2.6, 4.5, 0.55, sl.heat, 0, sl.id, 1); hotLight(sl.x, 3.2, sl.heat, 4, 0.5); }
    // The torch at the cut-off.
    if (s.torch > 0) {
      light(P.cutX, 3.6, 1.4, 3, 1.6 * s.torch, 1.2 * s.torch, 0.9 * s.torch);
      put(P.cutX, 4.2, 0.6, 0.6, 0, K.LAMP, 0, 0, 1.4, 1.2, 1, s.torch);
    }
    plume(P.tundishX + 6, 4, 0.05 * (flow > 0 ? 1 : 0), 4, [1.2, 1.2, 1.25]);
  }

  function mill(st) {
    const m = st.mill;
    if (!seen(530, 720)) return;
    // Slabs inside the reheat furnace, walking right.
    for (const sl of st.slabs) if (sl.x >= P.reheatX0 + 1 && sl.x <= P.reheatX1) hot(sl.x, 2.6, 1.0, 0.55, sl.heat, 0, sl.id, 1);
    hotLight((P.reheatX0 + P.reheatX1) / 2, 5, 0.85, 9, 1.0);
    // Burner flames along the roof.
    for (let x = P.reheatX0 + 3.6; x < P.reheatX1 - 2; x += 4) put(x, 8, 0.6, 0.6, 0, K.LAMP, 0, 0, 1.4, 0.5, 0.15, 0.6);
    // The bar or the strip in the mill.
    if (m.piece) {
      const pc = m.piece;
      // Thin strip draws at a floor of 0.7 m, so it reads at a glance.
      hot((pc.x0 + pc.x1) / 2, 2.4 + Math.max(pc.th, 0.7) / 2, (pc.x1 - pc.x0) / 2, Math.max(pc.th, 0.7) / 2, pc.heat, 0, pc.id, 1.5);
      for (let x = pc.x0 + 2; x < pc.x1; x += 10) hotLight(x, 3, pc.heat, 5, 0.6);
    }
    // Water curtains over the runout table while the strip runs.
    if (m.water > 0) for (let x = P.standX0 + P.stands * P.standGap; x < P.runX1 - 1; x += 3) put(x, 4.4, 1.0, 1.7, 0, K.WATER, 0, 0, 0, 0, 0, m.water);
    plume(P.standX0 + P.stands * P.standGap + 12, 3, 0.06 * m.water, 6, [1.3, 1.3, 1.35]);
    // The coil in the coiler pit, growing.
    if (m.coil > 0) {
      const r = 0.8 + 1.4 * m.coil;
      put(P.coilerX, -4, r, r, m.spin, K.COIL, m.coilHeat, 0, 0.05, 0.05, 0.055, 0);
      hotLight(P.coilerX, -3, m.coilHeat, 5, 0.6);
    }
    // Coils in the yard: stacked, cooling.
    for (const c of st.coils) put(c.x, c.y, 1.8, 1.8, 0, K.COIL, c.heat, 0, 0.12, 0.12, 0.13, 0);
    // The yard crane.
    const yc = m.crane;
    box(yc.x, 21, 2, 0.6, [0.08, 0.06, 0.02]);
    rope(yc.x, 20.6, yc.x, yc.y + 2);
    box(yc.x, yc.y + 2, 0.5, 0.25, [0.06, 0.06, 0.06]);
    if (m.carry) put(yc.x, yc.y, 1.8, 1.8, 0, K.COIL, m.carry.heat, 0, 0.06, 0.06, 0.065, 0);
    // The outbound train with its coils.
    const ot = st.outTrain;
    put(ot.x + 30, 2.6, 6.4, 2.2, 0, K.LOCO, 0, 0, 0.12, 0.05, 0.02);
    for (let i = 0; i < 4; i++) {
      const x = ot.x + 17 - i * 12;
      box(x, 1.8, 5.4, 0.5, [0.04, 0.04, 0.045]);
      for (let j = 0; j < 2; j++) if (ot.coils > i * 2 + j) put(x - 2.2 + j * 4.4, 4.1, 1.8, 1.8, 0, K.COIL, 0.15, 0, 0.06, 0.06, 0.065, 0);
    }
  }

  // Workers: tiny figures on the floors and gantries.
  function workers(crew) {
    for (const w of crew) {
      if (w.x < vx0 - 2 || w.x > vx1 + 2) continue;
      put(w.x, w.y + 0.55, 0.27 * w.dir, 0.55, 0, K.WORKER, 0, w.step_, w.vest[0], w.vest[1], w.vest[2], w.walking);
    }
  }

  /* ---------- sparks ---------- */
  // Each spark: x, y, vx, vy, life, heat.
  const SP = [];
  const MAXSP = 700;
  function spray(n, x, y, vx, vy, spread, heat = 0.95, life = 1.2) {
    for (let i = 0; i < n && SP.length < MAXSP; i++) {
      const a = (Math.random() - 0.5) * spread, c = Math.cos(a), s = Math.sin(a), sp = 0.6 + Math.random() * 0.8;
      SP.push({ x, y, vx: (vx * c - vy * s) * sp, vy: (vx * s + vy * c) * sp, life: life * (0.5 + Math.random()), heat: heat * (0.85 + Math.random() * 0.15) });
    }
  }
  let acc = 0;
  // Sources run on a fixed rate, so a slow frame sprays the same amount.
  function stepSparks(dt, st, calm) {
    acc += dt;
    const ticks = Math.min(4, Math.floor(acc * 60));
    acc -= ticks / 60;
    const k = calm ? 0.3 : 1;
    for (let t = 0; t < ticks; t++) {
      const bf = st.bf, cv = st.conv;
      if (bf.tap > 0.3) { spray(Math.round(2 * k), P.tapX + 0.6, P.castY + 0.8, 3, 5, 1.2, 0.95, 0.9); spray(Math.round(1 * k), P.runnerX1 + 1, 4.8, 1, 2, 2.4, 0.9, 0.6); }
      if (cv.blow > 0.2) spray(Math.round(6 * cv.blow * k), P.convX, P.convY + 7.5, 0, 16, 1.7, 1.0, 1.6);
      if (cv.tapOut > 0) spray(Math.round(1 * k), P.convX + 7, 9, 0, 3, 3, 0.95, 0.6);
      if (st.cast.torch > 0.3) spray(Math.round(3 * k), P.cutX, 2.4, 0, -3, 2.2, 1.0, 0.5);
      if (st.yard.cake > 0.6 && st.yard.quenchX < P.ovenX1) spray(Math.round(1 * k), st.yard.quenchX, 5.2, 0, 3, 2, 0.8, 0.7);
      if (st.mill.mode === 'rough' && Math.random() < 0.15 * k) spray(3, P.roughX, 3.2, 0, 5, 2.4, 0.85, 0.5);
    }
    for (let i = SP.length - 1; i >= 0; i--) {
      const p = SP[i];
      p.life -= dt;
      if (p.life <= 0) { SP[i] = SP[SP.length - 1]; SP.pop(); continue; }
      p.vy -= 9.8 * dt; p.vx *= 1 - dt * 0.4; p.vy *= 1 - dt * 0.4;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.heat -= dt * 0.35;
      // Sparks skip off the floors.
      if (p.y < 0.4 && p.vy < 0) { p.y = 0.4; p.vy *= -0.3; p.vx *= 0.6; }
    }
  }
  function sparks() {
    for (const p of SP) {
      if (p.x < vx0 || p.x > vx1) continue;
      const v = Math.hypot(p.vx, p.vy), len = Math.min(0.9, 0.08 + v * 0.03);
      put(p.x, p.y, len, 0.07, Math.atan2(p.vy, p.vx), K.SPARK, p.heat, 0, 0, 0, 0, Math.min(1, p.life * 2) * 1.6);
    }
  }

  /* ---------- the bottleneck ---------- */
  // A lamp over each door: green runs, red backs up, dark waits on its input.
  const DOORS = { yard: [P.dumpX1 + 3, 6], furnace: [P.bfX + 30, 12], converter: [P.shopX0 + 4, 10], caster: [P.castX0 + 4, 10], mill: [P.millX0 + 4, 10] };
  function doors(st) {
    for (const [s, [x, y]] of Object.entries(DOORS)) {
      if (!seen(x - 10, x + 10)) continue;
      const k = st.status[s];
      const blink = k === 'backed' ? (Math.sin(st.t * 5) > 0 ? 1 : 0.25) : 1;
      const c = k === 'run' ? [0.25, 1.4, 0.5] : k === 'backed' ? [1.8, 0.15, 0.06] : [0.4, 0.25, 0.08];
      const g = (k === 'starved' ? 0.35 : 1) * blink;
      box(x, y, 0.55, 0.4, [0.03, 0.03, 0.035]);
      put(x, y, 0.9, 0.9, 0, K.LAMP, 0, 0, c[0], c[1], c[2], g);
      light(x, y - 0.5, 2, 3.5, c[0] * 0.25 * g, c[1] * 0.25 * g, c[2] * 0.25 * g);
      if (st.rush[s] > 0) put(x, y + 1.4, 0.7, 0.7, 0, K.LAMP, 0, 0, 1.6, 1.3, 0.4, 0.5 + 0.5 * Math.sin(st.t * 9));
    }
  }

  // High-bay lamps under each roof: a dim cool light inside the sheds.
  const BAYS = [[P.stockX0, P.stockX1, P.stockTop, 'furnace'], [P.bfX - 16, P.bfX + 34, 32, 'furnace'], [P.shopX0, P.shopX1, P.shopTop, 'converter'], [P.castX0, P.castX1, P.castTop, 'caster'], [P.millX0, P.millX1, P.millTop, 'mill'], [P.yardX0, P.yardX1, 26, 'mill']];
  // Yard lights: cool floodlights on masts.
  function yard(st) {
    for (const [x0, x1, top, s] of BAYS) {
      // A step that waits on its input goes dark; a rushed one lights up.
      const g = st.status[s] === 'starved' ? 0.25 : st.rush[s] > 0 ? 1.7 : 1;
      for (let x = x0 + 8; x < x1 - 4; x += 18) {
        if (!seen(x - 30, x + 30)) continue;
        light(x, top - 4.5, 4, 12, 0.3 * g, 0.32 * g, 0.36 * g);
        put(x, top - 3.9, 0.7, 0.25, 0, K.LAMP, 0, 0, 0.9, 1.0, 1.1, 0.5 * g);
      }
    }
    for (const [x, h] of MASTS) {
      light(x, h - 2, 8, 26, 0.5 * st.night, 0.56 * st.night, 0.66 * st.night);
      put(x, h + 0.4, 1.4, 0.4, 0, K.LAMP, 0, 0, 0.9, 1.0, 1.1, st.night * 0.9);
    }
  }

  // The frame's whole picture.
  function build(st, view, crew) {
    n = 0; L.length = 0; np = 0;
    plumes.fill(0);
    vx0 = view.x - 20; vx1 = view.x + view.w + 20;
    // Hot lights first: the haze shades the first four by march.
    furnace(st); converter(st); caster(st); oreYard(st); mill(st); yard(st); doors(st);
    workers(crew);
    sparks();
    // Keep only the lights the view can see; the strongest first.
    const keep = [];
    for (let i = 0; i < L.length; i += 8) {
      const x = L[i], R = L[i + 3];
      if (x + R * 8 < view.x || x - R * 8 > view.x + view.w) continue;
      keep.push(L.slice(i, i + 8));
    }
    keep.sort((a, b) => (b[4] + b[5]) * b[3] - (a[4] + a[5]) * a[3]);
    const lights = keep.slice(0, 24).flat();
    return { sprites: spr, nSprites: n, lights, plumes, plumeC };
  }
  return { build, step: stepSparks };
}
