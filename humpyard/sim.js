// Hump yard sim: one dimension along the tracks.
// A shunter pushes a train over the crest. Each cut uncouples there and rolls free.
// Gravity, rolling resistance and the retarders set its speed.
// It couples with a clank onto the cuts already on its sorting track.

import { buildYard, heightAt, gradeAt, poseAt, MASTER, GROUP, FAR_Z, TRACKS } from './yard.js';

const G = 9.81;
const COUPLER = 0.5;
// Retarders grip at this deceleration.
const GRIP = 2.4;
// The master retarder lets cuts out at this speed.
const MASTER_V = 3.6;
// A cut should touch the cut ahead at about this speed.
const TOUCH_V = 1.7;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Wagon types: length in metres, and how often each turns up.
export const TYPES = [
  { id: 'van', len: 14.2, w: 3 },
  { id: 'hopper', len: 12.4, w: 2 },
  { id: 'tank', len: 15.4, w: 2 },
  { id: 'flat', len: 18.6, w: 3 },
];
export const LOCO_LEN = 14.8;

export function makeSim() {
  const rand = rng(374);
  const Y = buildYard();
  const { segs, lead, leaves, switches, crestS } = Y;
  let wagons = [], nextId = 0, t = 0;
  let train = null, loco = null, phase = 'arrive', phaseT = 0;
  let push = 1.6, auto = true;
  const events = [];
  const pose = new Float32Array(6);

  const pickType = () => {
    let r = rand() * TYPES.reduce((k, x) => k + x.w, 0);
    for (const x of TYPES) { r -= x.w; if (r <= 0) return x; }
    return TYPES[0];
  };
  function makeWagon(type, dest) {
    return {
      id: nextId++, type: TYPES.indexOf(type), len: type.len, dest,
      paint: Math.floor(rand() * 6),
      // Some wagons roll easier than others.
      rr: 0.016 + 0.014 * rand(),
      route: [lead], S: 0, v: 0, ahead: null, free: false, depart: false, gone: false,
      brake: 0, x: 0, y: 0, z: 0, hx: 0, hy: 0, hz: -1,
    };
  }

  // A new train: cuts of one to three wagons, each cut to one track.
  function newTrain() {
    const list = [];
    const n = 16 + Math.floor(rand() * 7);
    while (list.length < n) {
      const k = 1 + Math.floor(rand() * rand() * 3.2), dest = Math.floor(rand() * TRACKS);
      const ty = pickType();
      for (let j = 0; j < k && list.length < n; j++) list.push(makeWagon(rand() < 0.7 ? ty : pickType(), dest));
      list[list.length - 1].cutEnd = true;
    }
    list[list.length - 1].cutEnd = true;
    // Offsets of each wagon's centre behind the train's front.
    let off = 0;
    list.forEach((w, i) => { if (i) off += (list[i - 1].len + w.len) / 2 + COUPLER; w.off = off; });
    loco = { id: nextId++, type: -1, len: LOCO_LEN, route: [lead], S: 0, v: 0, off: off + (list[list.length - 1].len + LOCO_LEN) / 2 + COUPLER, x: 0, y: 0, z: 0, hx: 0, hy: 0, hz: -1, brake: 0 };
    train = { list, base: crestS - 70, v: 3.2 };
    wagons.push(...list);
    phase = 'arrive'; phaseT = 0;
  }

  // The segment of the route at global distance S; the route grows at each switch.
  function segOf(w) {
    let s = w.route[w.route.length - 1];
    while (w.S > s.start + s.len && s.kids.length) {
      // The wagon follows its leader's route when coupled.
      const next = w.ahead && w.ahead.route.find(x => x.parent === s) || s.kids[s.sw];
      w.route.push(next);
      s = next;
    }
    for (let k = w.route.length - 1; k >= 0; k--) if (w.S >= w.route[k].start || k === 0) return w.route[k];
    return s;
  }
  function place(w) {
    const s = segOf(w);
    poseAt(s, w.S - s.start, pose);
    w.x = pose[0]; w.y = pose[1]; w.z = pose[2]; w.hx = pose[3]; w.hy = pose[4]; w.hz = pose[5];
    w.seg = s;
  }

  // The wagon nearest ahead on this wagon's way, following the switches as they lie.
  function nextAhead(w) {
    let best = null;
    const s0 = w.seg;
    for (const o of wagons) {
      if (o === w || !o.free || o.gone || o.S <= w.S) continue;
      // The other wagon is on this segment, or further along the way the switches send this one.
      let s = o.seg, ok = false;
      for (let k = 0; k < 6 && s; k++) { if (s === s0) { ok = true; break; } s = s.parent; }
      if (!ok) continue;
      // Below this wagon's segment, the path must follow the switches.
      s = o.seg;
      const chain = [];
      while (s && s !== s0) { chain.push(s); s = s.parent; }
      let match = true;
      for (const c of chain) if (c.parent && c.parent.kids[c.parent.sw] !== c && !w.route.includes(c)) { match = false; break; }
      if (!match) continue;
      if (!best || o.S < best.S) best = o;
    }
    return best;
  }

  // The speed the yard wants a cut to leave the track retarder at, from the room ahead.
  function groupTarget(w) {
    const leaf = leaves[w.seg.track ?? w.dest];
    const tail = wagons.filter(o => o.free && !o.gone && o.seg === leaf && o.S > w.S).reduce((m, o) => Math.min(m, o.S - o.len / 2), leaf.buffer);
    const room = Math.max(0, tail - w.S);
    return clamp(Math.sqrt(TOUCH_V * TOUCH_V + 2 * 0.012 * room), TOUCH_V, MASTER_V);
  }

  // Heads of chains: free wagons with nothing coupled ahead.
  function stepFree(dt) {
    for (const w of wagons) if (w.free && !w.gone) place(w);
    const heads = wagons.filter(w => w.free && !w.gone && !w.ahead);
    for (const h of heads) {
      // The chain behind this head.
      const chain = [h];
      for (let k = 0; k < chain.length; k++) for (const o of wagons) if (o.ahead === chain[k] && !o.gone) chain.push(o);
      let F = 0;
      let braking = 0;
      for (const w of chain) {
        F += G * gradeAt(w.z) - (h.v > 0.01 ? w.rr : 0);
        w.brake = 0;
        const inM = w.z < MASTER[0] && w.z > MASTER[1], inG = w.z < GROUP[0] && w.z > GROUP[1];
        if (!h.depart && (inM || inG)) {
          const target = inM ? MASTER_V : groupTarget(h);
          // The beams bite hard, then let go well under the target.
          if (h.v > target + 0.25) h.grip = true;
          if (h.v < target - 0.7) h.grip = false;
          if (h.grip) { F -= GRIP; braking += 1; w.brake = clamp(0.55 + (h.v - target) / 2, 0.55, 1); }
        }
      }
      let a = F / chain.length;
      if (h.depart) a = h.v < 6 ? 0.35 : 0;
      h.v = Math.max(0, h.v + a * dt);
      // Rolling resistance cannot push a cut backward.
      if (h.v === 0 && !h.depart) h.v = 0;
      h.S += h.v * dt;
      for (const w of chain) w.v = h.v;
      if (braking) events.push({ type: 'squeal', x: h.x, y: h.y, z: h.z, k: Math.min(1, braking * 0.6) });
      // Couple, or meet the buffer.
      place(h);
      const o = h.depart ? null : nextAhead(h);
      if (o) {
        const gap = o.S - h.S - (o.len + h.len) / 2 - COUPLER;
        if (gap <= 0) {
          // The struck cut: count its wagons for the momentum.
          let lead2 = o; while (lead2.ahead) lead2 = lead2.ahead;
          let m2 = 0; for (const w of wagons) { let x = w; while (x && x !== lead2) x = x.ahead; if (x === lead2 && w.free && !w.gone) m2++; }
          const dv = h.v - o.v;
          const v = (chain.length * h.v + m2 * o.v) / (chain.length + m2);
          h.ahead = o;
          h.S = o.S - (o.len + h.len) / 2 - COUPLER;
          lead2.v = v;
          events.push({ type: 'clank', x: h.x, y: h.y, z: h.z - h.len / 2, k: clamp(dv / 3, 0.15, 1) });
        }
      } else if (!h.depart && h.seg.track != null) {
        const end = h.seg.buffer - h.len / 2;
        if (h.S >= end && h.v > 0) {
          events.push({ type: 'clank', x: h.x, y: h.y, z: h.z - h.len / 2, k: clamp(h.v / 3, 0.15, 1), buffer: true });
          h.S = end; h.v = 0;
        }
      }
    }
    // Followers sit behind their leaders.
    for (let pass = 0; pass < 4; pass++) for (const w of wagons) {
      if (!w.ahead || w.gone) continue;
      w.S = w.ahead.S - (w.ahead.len + w.len) / 2 - COUPLER;
      w.v = w.ahead.v; w.depart = w.ahead.depart;
    }
    for (const w of wagons) if (w.free && !w.gone) { place(w); if (w.z < FAR_Z + 30) w.gone = true; }
    if (wagons.some(w => w.gone)) {
      for (const w of wagons) if (w.ahead && w.ahead.gone) w.ahead = null;
      wagons = wagons.filter(w => !w.gone);
    }
  }

  // The yard computer: each switch lies for the next cut coming to it.
  function setSwitches() {
    for (const sw of switches) {
      const s = sw.seg, end = s.start + s.len;
      // A wagon on the points locks them.
      const busy = wagons.some(w => !w.gone && w.S + w.len / 2 > end - 2 && w.S - w.len / 2 < end + 2 && (w.route.includes(s) || w.seg === s));
      sw.locked = busy;
      if (busy) continue;
      // The next wagon to reach this switch.
      let next = null;
      for (const w of wagons) {
        if (w.gone || w.S >= end) continue;
        let ss = w.seg || lead, ok = false;
        for (let k = 0; k < 6 && ss; k++) { if (ss === s) { ok = true; break; } ss = ss.parent; }
        // A wagon upstream of this switch: on its segment or an ancestor, on the way.
        let on = ok && wayTo(w, s);
        if (!on) continue;
        if (!next || w.S > next.S) next = w;
      }
      sw.next = next;
      if (!next) continue;
      if (sw.manual != null && sw.hold === next.id) { s.sw = sw.manual; continue; }
      sw.manual = null; sw.hold = -1;
      if (!auto) continue;
      const r = s.row, b = (next.dest >> (2 - r)) & 1;
      if (s.sw !== b) { s.sw = b; events.push({ type: 'throw', x: sw.x, y: heightAt(sw.z), z: sw.z }); }
    }
  }
  // Whether a wagon, as the switches lie, is on its way to segment s.
  function wayTo(w, s) {
    let x = w.seg || lead;
    // s must be x itself or below x along the current switches.
    const path = [];
    let p = s;
    while (p && p !== x) { path.push(p); p = p.parent; }
    if (p !== x) return false;
    for (let k = path.length - 1; k >= 1; k--) {
      const c = path[k - 1], par = path[k];
      if (par.kids[par.sw] !== c) return false;
    }
    return true;
  }

  function stepTrain(dt) {
    if (!train) return;
    // The hump signal: red while the next cut's track is full.
    const front = train.list[0];
    let want = push;
    const lead0 = front ? front.S : crestS;
    if (phase === 'arrive') {
      want = lead0 < crestS - 22 ? 4 : push;
      if (lead0 >= crestS - 22) phase = 'push';
    }
    if (front) {
      const leaf = leaves[front.dest];
      const tail = wagons.filter(o => o.free && o.seg === leaf).reduce((m, o) => Math.min(m, o.S - o.len / 2), leaf.buffer);
      train.red = tail - leaf.start < 30 && auto;
      if (train.red) want = 0;
    }
    if (!front) want = -3.5;
    train.v += clamp(want - train.v, -0.8 * dt, 0.8 * dt);
    train.base += train.v * dt;
    for (const w of train.list) { w.S = train.base - w.off; place(w); w.v = train.v; }
    loco.S = train.base - loco.off; place(loco); loco.v = train.v;
    // Uncouple the front cut as it tips over the crest.
    if (front && front.S > crestS + 1.5) {
      let k = 0;
      while (k < train.list.length && !train.list[k].cutEnd) k++;
      const cut = train.list.splice(0, k + 1);
      cut.forEach((w, i) => { w.free = true; w.ahead = i ? cut[i - 1] : null; });
      events.push({ type: 'uncouple', x: front.x, y: front.y, z: front.z + front.len / 2 });
    }
    if (!train.list.length && loco.z > 120) { train = null; loco = null; phase = 'sort'; phaseT = 0; }
  }

  function step(dt) {
    t += dt; phaseT += dt;
    stepTrain(dt);
    stepFree(dt);
    setSwitches();
    // All cuts at rest and no train: the sorted trains leave, then a new one comes.
    if (phase === 'sort' && phaseT > 2 && wagons.every(w => w.v < 0.03)) {
      for (const w of wagons) if (!w.ahead) w.depart = true;
      phase = 'depart'; phaseT = 0;
      events.push({ type: 'depart' });
    }
    if (phase === 'depart' && (!wagons.length || phaseT > 70)) { wagons = []; newTrain(); }
  }
  newTrain();

  return {
    yard: Y,
    get wagons() { return wagons; },
    get loco() { return loco; },
    get train() { return train; },
    get phase() { return phase; },
    get t() { return t; },
    get auto() { return auto; },
    set auto(v) { auto = !!v; },
    get push() { return push; },
    set push(v) { push = v; },
    get busy() { return phase !== 'sort' || wagons.some(w => w.v > 0.03); },
    step(dt) { let left = dt; while (left > 1e-6) { const h = Math.min(1 / 60, left); step(h); left -= h; } },
    // Throws one switch by hand; it holds for the cut now coming to it.
    throwSwitch(i) {
      const sw = switches[i];
      if (!sw || sw.locked) return false;
      sw.seg.sw ^= 1;
      sw.manual = sw.seg.sw; sw.hold = sw.next ? sw.next.id : -1;
      events.push({ type: 'throw', x: sw.x, y: heightAt(sw.z), z: sw.z, hand: true });
      return true;
    },
    // Sets the whole route to track k for the next cut.
    routeTo(k) {
      let s = lead, any = false;
      for (let r = 0; r < 3; r++) {
        const b = (k >> (2 - r)) & 1;
        const sw = switches.find(x => x.seg === s);
        if (sw && !sw.locked && s.sw !== b) { s.sw = b; any = true; }
        if (sw && !sw.locked) { sw.manual = b; sw.hold = sw.next ? sw.next.id : -1; }
        s = s.kids[s.sw];
      }
      if (any) events.push({ type: 'throw', x: 0, y: heightAt(-60), z: -60, hand: true });
      return any;
    },
    takeEvents() { return events.splice(0); },
  };
}
