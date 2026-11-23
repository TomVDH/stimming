// Steel line choreography: the machines of each step and their timing.
// Stocks between steps live in `stock`; the K7 kit runs the workers and growth.
// Each machine waits on its input and stops when its output is full.
import { P, STRAND_LEN } from './works.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
// Moves v toward to at rate r per second.
const toward = (v, to, r, dt) => (v < to ? Math.min(to, v + r * dt) : Math.max(to, v - r * dt));

// A crane runs its queue of waypoints: x and y move together.
function drive(cr, dt, vx, vy) {
  if (!cr.q?.length) return true;
  const [tx, ty] = cr.q[0];
  const dx = tx - cr.x, dy = ty - cr.y, d = Math.hypot(dx / vx, dy / vy);
  if (d <= dt) { cr.x = tx; cr.y = ty; cr.q.shift(); }
  else { cr.x += dx * dt / d; cr.y += dy * dt / d; }
  return !cr.q.length;
}

// Caps on each stock: a full stock backs its step up.
export const CAPS = { ore: 14, coke: 8, iron: 1, steel: 1, slabs: 6, coils: 10 };
export const STEPS = ['yard', 'furnace', 'converter', 'caster', 'mill'];

export function makeLine() {
  const st = {
    t: 0, night: 1, beltPos: 0,
    stock: { ore: 6, coke: 3, slabs: 0, coils: 3 },
    // Rush: seconds left per step, from a tap on a building.
    rush: { yard: 0, furnace: 0, converter: 0, caster: 0, mill: 0 },
    status: { yard: 'run', furnace: 'run', converter: 'run', caster: 'run', mill: 'run' },
    busy: { yard: 0.7, furnace: 0.7, converter: 0.7, caster: 0.7, mill: 0.7 },
    // The beat each step last made; the sound and the camera read it.
    events: [],
    yard: { trainX: -200, wagons: [], dumping: 0, beltLoad: 0, ovens: [], quenchX: P.ovenX0 + 4, cake: 0, steam: 0 },
    bf: { heat: 0.8, burden: 0, hearth: 0.55, skips: [{ s: 0, full: true }, { s: 1, full: false }], tap: 0, bleed: 0 },
    torpedoes: [{ x: P.torpedoX, tilt: 0, heat: 0.9, fill: 0, mode: 'wait' }, { x: P.pitX, tilt: 0, heat: 0.85, fill: 0.9, mode: 'atpit' }],
    conv: { tilt: 0, heat: 0.85, blow: 0, fill: 0, lance: 46, pourIn: 0, tapOut: 0, pourPit: 0,
      crane: { x: P.pitX, y: 32, ladle: false, tip: 0, heat: 0.85, fill: 0, q: [] }, pit: { on: true, heat: 0.85, fill: 0 } },
    steelLadles: [{ x: P.convX + 7, y: 5.2, heat: 0.95, fill: 0, mode: 'wait' }],
    cast: { ladle: { heat: 0.97, fill: 0.7 }, tundish: 0.8, run: 1, torch: 0, cast: 0 },
    slabs: [],
    mill: { piece: null, water: 0, coil: 0, coilHeat: 0, spin: 0, crane: { x: P.yardX0 + 10, y: 12, q: [] }, mode: 'idle', slot: null, carry: null },
    coils: [],
    outTrain: { x: 760, coils: 0, mode: 'away' },
    workers: [],
  };
  for (let i = 0; i < P.ovens; i++) st.yard.ovens.push((i * 0.37) % 1);
  for (let i = 0; i < 6; i++) st.yard.wagons.push({ tip: 0, load: 1 });
  let slabId = 0;
  // Coils start stacked in the yard.
  const stackAt = i => [P.yardX0 + 6 + (i % 5) * 4, 2.2 + Math.floor(i / 5) * 3.4];
  for (let i = 0; i < st.stock.coils; i++) { const [x, y] = stackAt(i); st.coils.push({ x, y, heat: 0.1 }); }
  for (let i = 0; i < 3; i++) st.slabs.push({ x: P.reheatX0 + 4 + i * 9, heat: 0.75 + i * 0.05, id: slabId++, mode: 'reheat' });
  const emit = (kind, x, k = 1) => st.events.push({ kind, x, k });
  const speed = step => 1 + (st.rush[step] > 0 ? 1 : 0);

  /* ---------- step 1: ore yard and coke ovens ---------- */
  const yard = st.yard;
  let trainT = 30, trainMode = 'away', wagonI = 0, tipT = 0;
  // A train comes on a timer, or at once when the hand calls one.
  function callTrain() { if (trainMode === 'away') trainT = 0; }
  function stepYard(dt) {
    const k = speed('yard');
    const stopX = i => 30 + i * 11.4;
    if (trainMode === 'away') {
      trainT -= dt * k;
      if (trainT <= 0) { trainMode = 'in'; yard.trainX = -140; wagonI = 0; for (const w of yard.wagons) { w.load = 1; w.tip = 0; } emit('train', 0); }
    } else if (trainMode === 'in') {
      const to = stopX(wagonI);
      yard.trainX = toward(yard.trainX, to, 6 * k * clamp((to - yard.trainX) / 8 + 0.15, 0.15, 1), dt);
      if (Math.abs(yard.trainX - to) < 0.01) {
        // A full ore stock holds the train at the dumper.
        if (st.stock.ore < CAPS.ore) { trainMode = 'tip'; tipT = 0; emit('dump', P.dumpX0 + 8); }
      }
    } else if (trainMode === 'tip') {
      tipT += dt * k / 4;
      const w = yard.wagons[wagonI];
      w.tip = Math.sin(clamp(tipT, 0, 1) * Math.PI) * 0.9 * (tipT < 0.5 ? 1 : 1);
      yard.dumping = tipT > 0.25 && tipT < 0.75 ? 1 : 0;
      if (tipT > 0.5 && w.load > 0) { w.load = 0; st.stock.ore = Math.min(CAPS.ore, st.stock.ore + 2); }
      if (tipT >= 1) {
        w.tip = 0; yard.dumping = 0; wagonI++;
        trainMode = wagonI >= yard.wagons.length ? 'out' : 'in';
      }
    } else if (trainMode === 'out') {
      yard.trainX -= dt * 7 * k;
      if (yard.trainX < -160) { trainMode = 'away'; trainT = 55; }
    }
    // The belt runs while the stockhouse has room and the yard has ore.
    const room = st.bfStore < 1;
    const running = room && st.stock.ore > 0.2;
    yard.beltLoad = toward(yard.beltLoad, running ? clamp(st.stock.ore / 4, 0.3, 1) : 0, 0.5, dt);
    if (running) {
      st.beltPos += dt * 2.6 * k;
      const take = dt * 0.05 * k;
      st.stock.ore = Math.max(0, st.stock.ore - take * 2);
      st.bfStore = Math.min(1, st.bfStore + take);
    }
    // Ovens bake for about a minute; one push at a time.
    for (let i = 0; i < yard.ovens.length; i++) yard.ovens[i] = Math.min(1, yard.ovens[i] + dt * k / 70);
    stepQuench(dt, k);
    yard.steam = Math.max(0, yard.steam - dt * 0.35);
  }
  let qMode = 'home', qT = 0;
  function stepQuench(dt, k) {
    const home = P.ovenX0 + 4;
    if (qMode === 'home') {
      const i = yard.ovens.findIndex(a => a >= 1);
      if (i >= 0 && st.stock.coke < CAPS.coke) {
        qMode = 'under'; qT = i;
      }
    } else if (qMode === 'under') {
      const w = (P.ovenX1 - P.ovenX0) / P.ovens, x = P.ovenX0 + (qT + 0.5) * w;
      yard.quenchX = toward(yard.quenchX, x, 5 * k, dt);
      if (Math.abs(yard.quenchX - x) < 0.01) { qMode = 'push'; yard.ovens[qT] = 0; yard.cake = 0.85; emit('push', x); }
    } else if (qMode === 'push') {
      qMode = 'toQuench';
    } else if (qMode === 'toQuench') {
      yard.quenchX = toward(yard.quenchX, P.quenchX, 6 * k, dt);
      if (Math.abs(yard.quenchX - P.quenchX) < 0.01) { qMode = 'quench'; qT = 0; yard.steam = 1; emit('quench', P.quenchX); }
    } else if (qMode === 'quench') {
      qT += dt * k;
      yard.cake = Math.max(0, 0.85 - qT * 0.35);
      if (qT > 3.5) { qMode = 'back'; yard.cake = 0; st.stock.coke = Math.min(CAPS.coke, st.stock.coke + 1); }
    } else if (qMode === 'back') {
      yard.quenchX = toward(yard.quenchX, home, 6 * k, dt);
      if (Math.abs(yard.quenchX - home) < 0.01) qMode = 'home';
    }
  }

  /* ---------- step 2: blast furnace ---------- */
  const bf = st.bf;
  st.bfStore = 0.6;
  let skipDir = 1, skipWait = 0, tapT = 0;
  function stepFurnace(dt) {
    const k = speed('furnace');
    // Skips: a full car climbs while the empty one comes down.
    const haveCharge = st.bfStore > 0.05 && st.stock.coke > 0.05 && bf.hearth < 0.98;
    if (skipWait > 0) skipWait -= dt * k;
    else if (haveCharge || bf.skips[0].s !== (skipDir > 0 ? 0 : 1)) {
      const a = bf.skips[0];
      a.s = clamp(a.s + skipDir * dt * k / 7, 0, 1);
      bf.skips[1].s = 1 - a.s;
      a.full = skipDir > 0; bf.skips[1].full = skipDir < 0;
      if (a.s >= 1 || a.s <= 0) {
        // A car tips into the top: one charge in.
        skipDir = -skipDir; skipWait = 1.2;
        st.bfStore = Math.max(0, st.bfStore - 0.08);
        st.stock.coke = Math.max(0, st.stock.coke - 0.12);
        bf.charge = Math.min(1, (bf.charge ?? 0.5) + 0.12);
        emit('skip', P.skipX1);
      }
    }
    // The burden sinks as iron melts out of it.
    bf.charge = Math.max(0, (bf.charge ?? 0.5) - dt * 0.006 * k);
    bf.heat = toward(bf.heat, 0.45 + 0.55 * clamp(bf.charge * 2, 0, 1), 0.05, dt);
    bf.burden += dt * 0.12 * k * bf.heat;
    bf.hearth = Math.min(1, bf.hearth + dt * 0.012 * k * bf.heat);
    bf.bleed = Math.max(0, bf.bleed - dt * 0.2);
    // Tap when the hearth is full and an empty torpedo waits at the spout.
    const t = st.torpedoes.find(q => q.mode === 'wait' && Math.abs(q.x - P.torpedoX) < 0.1);
    if (bf.tap === 0 && tapT <= 0 && bf.hearth > 0.7 && t) { tapT = 0.001; emit('tap', P.tapX); }
    if (tapT > 0) {
      tapT += dt * k;
      bf.tap = clamp(Math.min(tapT / 1.5, (16 - tapT) / 1.5), 0, 1);
      const flow = bf.tap * dt * k / 13;
      bf.hearth = Math.max(0, bf.hearth - flow * 0.8);
      if (t) { t.fill = Math.min(1, t.fill + flow); t.heat = 0.92; }
      if (tapT >= 16) { tapT = 0; bf.tap = 0; if (t) t.mode = 'go'; emit('plug', P.tapX); }
    }
  }
  // Torpedoes run on parallel tracks, so they pass; each stop holds one car.
  function stepTorpedoes(dt) {
    const k = Math.max(speed('furnace'), speed('converter'));
    const busyAt = (q, modes) => st.torpedoes.some(o => o !== q && modes.includes(o.mode));
    for (const q of st.torpedoes) {
      q.heat = toward(q.heat, q.fill > 0.05 ? 0.9 : 0.6, 0.01, dt);
      const run = to => { q.x = toward(q.x, to, 8 * k * clamp(Math.abs(to - q.x) / 10 + 0.1, 0.1, 1), dt); return q.x === to; };
      if (q.mode === 'go') {
        const free = !busyAt(q, ['atpit', 'pour', 'untilt']);
        if (run(free ? P.pitX : P.pitX - 20) && free) q.mode = 'atpit';
      } else if (q.mode === 'atpit') {
        // Pour into the pit ladle once it is back and empty.
        const pit = st.conv.pit;
        if (pit.on && pit.fill < 0.02 && q.fill > 0.05) { q.mode = 'pour'; emit('reladle', P.pitX); }
      } else if (q.mode === 'pour') {
        const pit = st.conv.pit;
        q.tilt = toward(q.tilt, -0.55, 0.4 * k, dt);
        const on = q.tilt < -0.4 ? 1 : 0;
        st.conv.pourPit = on;
        if (on) { const f = Math.min(q.fill, dt * k / 9); q.fill -= f; pit.fill = Math.min(1, pit.fill + f); pit.heat = q.heat; }
        if (q.fill <= 0.01 || pit.fill >= 1) { q.fill = Math.max(0, q.fill); st.conv.pourPit = 0; q.mode = 'untilt'; }
      } else if (q.mode === 'untilt') {
        q.tilt = toward(q.tilt, 0, 0.5 * k, dt);
        if (q.tilt === 0) q.mode = q.fill > 0.05 ? 'atpit' : 'back';
      } else if (q.mode === 'back') {
        const free = !busyAt(q, ['wait']);
        if (run(free ? P.torpedoX : P.torpedoX + 20) && free) q.mode = 'wait';
      }
    }
  }

  /* ---------- step 3: converter ---------- */
  const cv = st.conv;
  let cMode = 'idle', cT = 0;
  function stepConverter(dt) {
    const k = speed('converter');
    const cr = cv.crane;
    cT += dt * k;
    const go = m => { cMode = m; cT = 0; };
    const moved = drive(cr, dt * k, 6, 7);
    switch (cMode) {
      case 'idle':
        // A filled pit ladle and an empty vessel start a heat.
        if (cv.pit.fill > 0.5 && cv.fill < 0.02 && !st.torpedoes.some(q => q.mode === 'pour')) { cr.q = [[P.pitX, 32], [P.pitX, -4]]; go('fetch'); }
        break;
      case 'fetch':
        if (moved) {
          cr.ladle = true; cv.pit.on = false; cr.fill = cv.pit.fill; cr.heat = cv.pit.heat; cv.pit.fill = 0;
          cr.q = [[P.pitX, 33], [P.convX - 10.5, 33]]; go('carry');
        }
        break;
      case 'carry':
        cv.tilt = toward(cv.tilt, 0.95, 0.35 * k, dt);
        if (moved && cv.tilt === 0.95) go('charge');
        break;
      case 'charge':
        cr.tip = toward(cr.tip, -0.8, 0.4 * k, dt);
        cv.pourIn = cr.tip < -0.6 ? 1 : 0;
        if (cv.pourIn) { const f = Math.min(cr.fill, dt * k / 7); cr.fill -= f; cv.fill = Math.min(0.85, cv.fill + f * 0.85); cv.heat = 0.84; }
        if (!cv.charged) { cv.charged = true; emit('charge', P.convX); }
        if (cr.fill <= 0.01) { cr.fill = 0; cv.pourIn = 0; cv.charged = false; go('return'); }
        break;
      case 'return':
        cr.tip = toward(cr.tip, 0, 0.6 * k, dt);
        cv.tilt = toward(cv.tilt, 0, 0.3 * k, dt);
        if (cr.tip === 0) { cr.q = [[P.pitX, 33], [P.pitX, -4]]; go('setdown'); }
        break;
      case 'setdown':
        cv.tilt = toward(cv.tilt, 0, 0.3 * k, dt);
        if (moved) { cr.ladle = false; cv.pit.on = true; cv.pit.fill = 0; cr.q = [[P.pitX, 32]]; go('lanceDown'); }
        break;
      case 'lanceDown':
        cv.tilt = toward(cv.tilt, 0, 0.3 * k, dt);
        if (cv.tilt === 0) cv.lance = toward(cv.lance, 33, 5 * k, dt);
        if (cv.lance === 33) go('blow');
        break;
      case 'blow':
        // About fourteen seconds of oxygen: the flame, then the sparks.
        if (!cv.blown) { cv.blown = true; emit('blow', P.convX); }
        cv.blow = clamp(Math.min(cT / 1.2, (14 - cT) / 1.5), 0, 1) * (0.85 + 0.15 * Math.sin(cT * 11) * Math.sin(cT * 3.7));
        cv.heat = toward(cv.heat, 1.0, 0.012, dt);
        if (cT >= 14) { cv.blow = 0; cv.blown = false; go('lanceUp'); }
        break;
      case 'lanceUp':
        cv.lance = toward(cv.lance, 46, 6 * k, dt);
        if (cv.lance === 46) go('tapWait');
        break;
      case 'tapWait':
        if (st.steelLadles.some(q => q.mode === 'wait' && q.fill < 0.02)) go('tap');
        break;
      case 'tap': {
        const l = st.steelLadles.find(q => q.mode === 'wait');
        cv.tilt = toward(cv.tilt, -1.75, 0.35 * k, dt);
        cv.tapOut = cv.tilt < -1.6 ? 1 : 0;
        if (cv.tapOut && l) { const f = Math.min(cv.fill, dt * k / 10); cv.fill -= f; l.fill = Math.min(1, l.fill + f / 0.85); l.heat = 0.97; }
        if (cv.tapOut && !cv.tapped) { cv.tapped = true; emit('steelTap', P.convX); }
        if (cv.fill <= 0.01) { cv.fill = 0; cv.tapOut = 0; cv.tapped = false; if (l) l.mode = 'go'; go('right'); }
        break;
      }
      case 'right':
        cv.tilt = toward(cv.tilt, 0, 0.35 * k, dt);
        if (cv.tilt === 0) go('idle');
        break;
    }
    cv.heat = toward(cv.heat, cv.fill > 0.02 ? cv.heat : 0.7, 0.02, dt);
  }

  /* ---------- step 4: caster ---------- */
  const cs = st.cast;
  let slabRun = 0;
  function stepCaster(dt) {
    const k = speed('caster');
    // Steel ladles shuttle between the converter and the turret.
    for (const l of st.steelLadles) {
      if (l.mode === 'go') {
        l.x = toward(l.x, P.turretX + 3, 6 * k, dt);
        if (l.x === P.turretX + 3 && !cs.ladle) l.mode = 'lift';
      } else if (l.mode === 'lift') {
        l.y = toward(l.y, 33, 5 * k, dt);
        if (l.y === 33) { cs.ladle = { heat: l.heat, fill: l.fill }; l.fill = 0; l.y = 5.2; l.mode = 'home'; emit('turret', P.turretX); }
      } else if (l.mode === 'home') {
        l.x = toward(l.x, P.convX + 7, 6 * k, dt);
        if (l.x === P.convX + 7) l.mode = 'wait';
      }
    }
    // The ladle feeds the tundish; the tundish feeds the strand.
    if (cs.ladle) {
      const f = Math.min(cs.ladle.fill, dt * k / 60);
      cs.ladle.fill -= f;
      cs.tundish = Math.min(1, cs.tundish + f * 1.5);
      if (cs.ladle.fill <= 0.002) cs.ladle = null;
    }
    // A full slab yard stops the strand.
    const room = st.slabs.length < CAPS.slabs + 3;
    const flow = cs.tundish > 0.05 && room ? 1 : 0;
    cs.run = toward(cs.run, flow, 0.5, dt);
    cs.tundish = Math.max(0, cs.tundish - dt * k * cs.run * 0.012);
    cs.cast += dt * k * cs.run * 0.9;
    slabRun += dt * k * cs.run * 0.9;
    cs.torch = Math.max(0, cs.torch - dt * 0.8);
    if (slabRun > 9) {
      slabRun = 0; cs.torch = 1;
      st.slabs.push({ x: P.cutX + 4.5, heat: 0.78, id: slabId++, mode: 'table' });
      emit('cut', P.cutX);
    }
    // Slabs roll to the reheat furnace and walk through it in a queue.
    const inFurnace = st.slabs.filter(s => s.mode === 'reheat');
    for (const s of st.slabs) {
      if (s.mode === 'table') {
        const qEnd = P.reheatX0 - 5 - 10 * st.slabs.filter(o => o.mode === 'table' && o.x > s.x).length;
        s.heat = Math.max(0.45, s.heat - dt * 0.004);
        s.x = toward(s.x, qEnd, 3 * k, dt);
        if (s.x >= P.reheatX0 - 5 - 0.01 && inFurnace.length < 3) { s.mode = 'reheat'; s.x = P.reheatX0 + 2; }
      }
    }
    st.stock.slabs = st.slabs.length;
  }

  /* ---------- step 5: rolling mill and coil yard ---------- */
  const ml = st.mill;
  let mT = 0;
  function stepMill(dt) {
    const k = speed('mill');
    // Slabs in the furnace walk right and heat up.
    const inF = st.slabs.filter(s => s.mode === 'reheat').sort((a, b) => b.x - a.x);
    inF.forEach((s, i) => {
      s.heat = toward(s.heat, 0.9, 0.012 * k, dt);
      s.x = toward(s.x, P.reheatX1 - 2 - i * 3.2, 0.4 * k, dt);
    });
    mT += dt * k;
    const go = m => { ml.mode = m; mT = 0; };
    const coilRoom = st.coils.length < CAPS.coils + 2;
    switch (ml.mode) {
      case 'idle': {
        const s = inF[0];
        if (s && s.x >= P.reheatX1 - 2.1 && s.heat > 0.86 && ml.coil === 0 && coilRoom) {
          st.slabs.splice(st.slabs.indexOf(s), 1);
          ml.piece = { x0: P.reheatX1 - 1, x1: P.reheatX1 + 8, th: 1.1, heat: 0.9, id: s.id };
          go('rough'); emit('drop', P.reheatX1);
        }
        break;
      }
      case 'rough': {
        // Five passes back and forth through the roughing stand.
        const pc = ml.piece, pass = Math.floor(mT / 2.4), f = (mT % 2.4) / 2.4;
        const len = 9 * Math.pow(1.45, Math.min(pass, 5));
        pc.th = 1.1 / Math.pow(1.45, Math.min(pass, 5));
        const dir = pass % 2 ? -1 : 1;
        const head = dir > 0 ? lerp(P.roughX - 4, P.roughX + len - 2, ease(f)) : lerp(P.roughX + len - 2, P.roughX - 4, ease(f));
        pc.x0 = dir > 0 ? head - len : head; pc.x1 = dir > 0 ? head : head + len;
        if (pc.x0 < P.reheatX1 + 0.5) { pc.x0 = P.reheatX1 + 0.5; }
        if (f < 0.05 && mT % 2.4 < dt * k + 0.001) emit('bite', P.roughX);
        if (pass >= 5) { go('finish'); emit('race', P.standX0); }
        break;
      }
      case 'finish': {
        // The bar threads the finishing stands and races out as strip.
        const pc = ml.piece;
        const v = lerp(3, 26, ease(mT / 2.5));
        pc.th = 0.16;
        pc.heat = 0.88;
        const total = 70;
        const head = Math.min(P.coilerX, P.roughX + 10 + mT * v);
        pc.x1 = head;
        if (head >= P.coilerX - 0.1) {
          ml.coil = Math.min(1, ml.coil + dt * k / 3.2);
          ml.spin -= dt * k * 9;
          ml.coilHeat = 0.72;
          pc.x0 = Math.min(head - 1, lerp(P.roughX - 2, P.coilerX, ml.coil));
        } else pc.x0 = Math.max(P.reheatX1 + 0.5, head - total * 0.6);
        ml.water = toward(ml.water, 1, 2, dt);
        if (ml.coil >= 1) { ml.piece = null; go('coiled'); emit('coiled', P.coilerX); }
        break;
      }
      case 'coiled':
        ml.water = toward(ml.water, 0, 0.8, dt);
        ml.coilHeat = Math.max(0.35, ml.coilHeat - dt * 0.02);
        if (mT > 1.5) go('pick');
        break;
      case 'pick': {
        // The yard crane lifts the coil out of the pit onto the stack.
        const cr = ml.crane, moved = drive(cr, dt * k, 8, 8);
        if (!ml.slot) {
          ml.slot = stackAt(st.coils.length % (CAPS.coils + 2));
          cr.q = [[P.coilerX, 10], [P.coilerX, -4]];
        } else if (moved && ml.coil > 0) {
          ml.coil = 0; ml.carry = { heat: ml.coilHeat };
          cr.q = [[P.coilerX, 10], [ml.slot[0], 10], ml.slot.slice()];
        } else if (moved && ml.carry) {
          st.coils.push({ x: ml.slot[0], y: ml.slot[1], heat: ml.carry.heat });
          ml.carry = null; ml.slot = null; emit('stack', cr.x);
          cr.q = [[cr.x, 12]]; go('rest');
        }
        break;
      }
      case 'rest':
        if (drive(ml.crane, dt * k, 8, 8) && mT > 1) go('idle');
        break;
    }
    for (const c of st.coils) c.heat = Math.max(0.12, c.heat - dt * 0.004);
    st.stock.coils = st.coils.length;
    stepTrain(dt, k);
  }
  // The outbound train: it comes for coils when the yard holds eight.
  let oT = 0;
  function stepTrain(dt, k) {
    const ot = st.outTrain;
    oT += dt * k;
    if (ot.mode === 'away' && st.coils.length >= 8) { ot.mode = 'in'; ot.x = 760; ot.coils = 0; emit('horn', P.trainX); }
    else if (ot.mode === 'in') {
      ot.x = toward(ot.x, P.trainX, 7 * k * clamp((ot.x - P.trainX) / 10 + 0.1, 0.1, 1), dt);
      if (ot.x === P.trainX) { ot.mode = 'load'; oT = 0; }
    } else if (ot.mode === 'load') {
      // A coil a second, top of the stack first.
      if (oT > 1.1 && st.coils.length && ot.coils < 8) { st.coils.pop(); ot.coils++; oT = 0; emit('load', P.trainX); }
      if (ot.coils >= 8 || (!st.coils.length && oT > 2)) { ot.mode = 'out'; emit('horn', P.trainX); emit('milestone', P.trainX); }
    } else if (ot.mode === 'out') {
      ot.x += dt * 8 * k;
      if (ot.x > 780) { ot.mode = 'away'; ot.coils = 0; }
    }
  }

  /* ---------- the whole line ---------- */
  // Each step runs, waits on its input, or backs up behind a full output.
  function status() {
    const s = st.status, cs = st.cast;
    s.yard = trainMode === 'in' && st.stock.ore >= CAPS.ore - 0.5 ? 'backed' : 'run';
    s.furnace = st.bfStore < 0.05 || st.stock.coke < 0.05 ? 'starved' : bf.hearth > 0.97 && tapT <= 0 ? 'backed' : 'run';
    s.converter = cMode === 'tapWait' ? 'backed' : cMode === 'idle' && cv.pit.fill < 0.5 ? 'starved' : 'run';
    s.caster = cs.run < 0.5 && cs.tundish > 0.05 ? 'backed' : cs.tundish < 0.05 ? 'starved' : 'run';
    s.mill = st.coils.length >= CAPS.coils ? 'backed' : ml.mode === 'idle' && !st.slabs.some(q => q.mode === 'reheat') ? 'starved' : 'run';
    for (const k of STEPS) st.busy[k] = s[k] === 'run' ? (st.rush[k] > 0 ? 1 : 0.7) : 0.15;
  }
  // A shift: about five minutes of night, dawn, a short day and dusk.
  const SHIFT = 300;
  function sky() {
    const f = ((st.t + 40) / SHIFT) % 1;
    st.day = ease((f - 0.55) / 0.08) - ease((f - 0.9) / 0.08);
    st.night = 1 - st.day;
  }
  function step(dt) {
    st.t += dt;
    sky();
    for (const s of STEPS) st.rush[s] = Math.max(0, st.rush[s] - dt);
    stepYard(dt); stepFurnace(dt); stepTorpedoes(dt); stepConverter(dt); stepCaster(dt); stepMill(dt);
    status();
  }
  function takeEvents() { const e = st.events.slice(); st.events.length = 0; return e; }
  return { st, step, takeEvents, callTrain };
}
