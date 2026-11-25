// Solar loop sound in Web Audio. Muted by default; the kit holds the context.
import { choir, tapBus, preset, keyed, zoomAt, renderBed, LOOP } from './choir.js';
import { STARS } from './sun.js';
// Space is silent, so the sound is a sonification: each part has a visible cause.
// A flare: the deep synth, then a slow glow chord. A lifting prominence: the synth only. A drag is silent.
// Awake: a voice over a constant deep surround rumble.
// Every star's voice is the choir in choir.js, shaped by its preset.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// The key falls as the star grows: the hypergiant hums lowest.
// The Sun sits in A sharp (Tom, 2026-11-24), set by ear with its choir.
// The holes, the quasar and the bodies added after them take the roots set in sun.js (2026-11-24).
export const ROOT = { s5hvs1: 311.13, betalyr: 130.81, fomalhaut: 196, tzo: 103.83, wr124: 155.56, cygx1: 98, sgra: 82.41, qso: 73.42, neutron: 440, siriusb: 392, wise: 329.63, luhman: 293.66, proxima: 261.63, epseri: 233.08, sun: 233.08, procyon: 207.65, sirius: 196, vega: 185, ttauri: 185, regulus: 174.61, zetaoph: 164.81, rigel: 146.83, arcturus: 138.59, betelgeuse: 123.47, vycma: 110, st218: 98, wohg64: 103.83, quasi: 87.31, wr140: 146.83, mira: 130.81, rlep: 116.54, polaris: 185, magnetar: 349.23, crab: 415.3, ring: 369.99, vfts352: 174.61, xxtri: 196, epsaur: 138.59, mothra: 130.81, earendel: 155.56, powehi: 65.41, gargantua: 69.3 };

// A hole's full view stands `reach` times farther back, so its nearness reads low.
// The shift puts its full view back on the full-star stop: x16 sits at -1.4.
const NEAR_LN = Math.log(16) / 1.4;
export const nearOf = (near, band) => near + Math.log(STARS[band]?.reach || 1) / NEAR_LN;

// `opt(id)` reads a Dev row; a missing row means on, at level 1.
export function makeSound(kit, opt = () => undefined) {
  const on = id => opt(id) ?? true;
  const lvl = id => opt(id) ?? 1;
  let pending = 0;
  // Every scheduled source, so mute or a hidden tab can stop them.
  const live = new Set();
  const track = node => {
    pending++;
    live.add(node);
    node.onended = () => { pending--; live.delete(node); };
    return node;
  };

  // Interaction sounds share one bus, so one Dev level sets them all.
  let fx = null;
  function fxOf(ac) {
    if (!fx || fx.ac !== ac) {
      const dry = ac.createGain(), wet = ac.createGain();
      dry.connect(kit.out);
      wet.connect(hallOf(ac));
      fx = { ac, dry, wet };
    }
    fx.dry.gain.value = fx.wet.gain.value = lvl('sndFxLvl');
    return fx;
  }
  function voice(ac, pan, dest = fxOf(ac).dry) {
    const g = ac.createGain();
    g.gain.value = 0;
    const p = ac.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1);
    g.connect(p).connect(dest);
    return g;
  }
  function noise(ac, t, len, rate = 1) {
    const src = ac.createBufferSource();
    src.buffer = kit.noise;
    src.loop = true;
    src.playbackRate.value = rate;
    src.start(t, Math.random() * 0.9);
    src.stop(t + len);
    return track(src);
  }
  function osc(ac, type, f, t, len) {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.start(t); o.stop(t + len);
    return track(o);
  }
  function filt(ac, type, f, q = 0.7) {
    const b = ac.createBiquadFilter();
    b.type = type; b.frequency.value = f; b.Q.value = q;
    return b;
  }
  function env(g, t, peak, rise, fall) {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + rise);
    g.gain.exponentialRampToValueAtTime(0.0002, t + rise + fall);
  }
  // A wide hall: three long echoes, low passed.
  let hall = null;
  function hallOf(ac) {
    if (hall && hall.ac === ac) return hall.in;
    const inp = ac.createGain();
    const lp = filt(ac, 'lowpass', 3200);
    inp.connect(lp);
    for (const [d, g, p] of [[0.11, 0.3, -0.6], [0.23, 0.22, 0.6], [0.41, 0.15, 0]]) {
      const dl = ac.createDelay(1);
      dl.delayTime.value = d;
      const gn = ac.createGain();
      gn.gain.value = g;
      const pn = ac.createStereoPanner();
      pn.pan.value = p;
      lp.connect(dl).connect(gn).connect(pn).connect(kit.out);
    }
    hall = { ac, in: inp };
    return inp;
  }
  function send(ac, g, amt, to = fxOf(ac).wet) {
    const s = ac.createGain();
    s.gain.value = amt;
    g.connect(s).connect(to);
  }

  // The blast and glow come from choir.js, shaped by the star's preset.
  // They share one tap bus, so repeated taps never pile up.
  // The star's key, moved by its preset.
  const keyOf = band => keyed(ROOT[band] || 220, preset(band));
  let taps = null;
  function tapsOf(ac) {
    fxOf(ac);
    if (!taps || taps.ac !== ac) taps = { ac, bus: tapBus(ac, { out: fxOf(ac).dry, hall: fxOf(ac).wet, track }) };
    return taps.bus;
  }
  // A far star sends its taps into its choir's reverb too.
  const roomOf = (ac, band) => drone && drone.ac === ac && drone.band === band ? drone.voice.cv : null;
  // Taps play in the chord the choir sings now.
  const chordOf = (ac, band, t) => drone && drone.ac === ac && drone.band === band ? drone.voice.chordAt(t) : null;
  // up: a ratio over the chord's root, for a tap run. max: blasts that may ring at once.
  function braam(ac, t, pan, band, K, len = 6, up = 1, max = 1) {
    const ch = chordOf(ac, band, t);
    tapsOf(ac).blast({ t, root: keyOf(band) / 4 * up, K, len, p: preset(band), pan, room: roomOf(ac, band), chordRoot: ch ? ch.root : 1, max });
  }
  // Quick taps step through the chord the choir sings now (Tom, 2026-11-24).
  // A tap within RUN_GAP s of the last one takes the next step; a pause starts at the root again.
  const RUN_GAP = 1.6;
  const run = { n: -1, at: -Infinity };
  const octave = r => { while (r >= 2) r /= 2; while (r < 1) r *= 2; return r; };
  // The chord's tones inside one octave, low to high.
  // Tones within 30 cents of one another, or of the octave, count once.
  const CLOSE = 2 ** (30 / 1200);
  const tonesOf = ch => (ch ? ch.tones : [1, 1.2599, 1.4983]).map(octave).sort((a, b) => a - b)
    .filter((r, i, a) => (i === 0 || r / a[i - 1] > CLOSE) && (i === 0 || 2 / r > CLOSE));
  // Steps up a list for two octaves, then back down.
  const bounce = (list, n) => { const L = list.length, span = 2 * L, i = n % (2 * span), k = i <= span ? i : 2 * span - i; return list[k % L] * 2 ** Math.floor(k / L); };
  // How a star's tap run moves (Tom: it follows the choir).
  // arp: one note at a time up and down the chord. Bright songs take it.
  // triad: each tap adds a voice of an open triad (root, fifth, third an octave up), three ringing. Minor songs take it.
  // fifths: root, fifth, octave, with no third.
  const TAP_RUNS = {
    arp: (ch, n) => [bounce(tonesOf(ch), n), 1],
    triad: (ch, n) => {
      const ts = tonesOf(ch), near = x => ts.reduce((a, b) => Math.abs(b - x) < Math.abs(a - x) ? b : a);
      // The fifth, and the third: the tone nearest a minor or major third.
      return [bounce([1, near(1.4983), 2 * near(1.22)], n), 3];
    },
    fifths: (ch, n) => [bounce([1, 1.4983], n), 1],
  };
  const runOf = p => p.tapRun || (p.harmony === 2 || p.chord === 'minor' ? 'triad' : 'arp');

  // The star's voice while the toy is awake, in two layers.
  // The space rumble: a constant, dense, deep surround drone, a seamless loop.
  // The hum: the star's choir from choir.js, in its own reverb.
  // The rumble feeds the choir's reverb a little, so both share one room.
  const GLUE = 0.6;
  let bed = null;
  let drone = null;
  // Voices that fade out after a star switch.
  const leaving = new Set();
  // A stopped choir that stays connected costs as much as a live one.
  // Each old voice disconnects when its fade ends.
  function drop(d) {
    leaving.delete(d);
    for (const x of [d.g, d.gc]) x.disconnect();
  }
  // Runs fn when the audio clock passes `at`; a suspended context waits.
  function when(ac, at, fn) {
    const tick = () => ac.state === 'closed' || ac.currentTime >= at ? fn() : setTimeout(tick, Math.max(50, (at - ac.currentTime) * 1000));
    tick();
  }
  // Which layers sound: the Dev toggles set them.
  const layers = { hum: true, rumble: true, h: 1, lvl: 1, near: 0, z: zoomAt(0) };
  // The toy's Turn speed against x10k: an orbit swell (swTurn) keeps pace with it.
  let turnK = 1;
  function setTurn(rate) { turnK = rate / 1e4; drone?.voice.setTurn(turnK); }
  // The zoom mix (choir.js ZOOM): choir and rumble levels and the layer gains by nearness.
  // `near` is 1 on the long lens, 0 on the full star, below 0 zoomed out.
  const dB = x => 10 ** (x / 20);
  // The choir's base level: 15 percent down, the rumble unchanged (Tom, 2026-11-25).
  const CHOIR = 0.85;
  // rate: the toy's eased Turn rate (1, 5000 or 10000), from main.js mixSound().
  function mixLayers(hum, rumble, near = 0, rate) {
    if (rate !== undefined) setTurn(rate);
    near = nearOf(near, drone?.band);
    const z = zoomAt(near);
    const h = hum ? CHOIR * lvl('sndHumLvl') * dB(z.choir) : 0;
    const r = rumble ? dB(z.rumble) * lvl('sndRumbleLvl') : 0;
    if (Math.abs(layers.h - h) < 0.01 && Math.abs(layers.lvl - r) < 0.01 && Math.abs(layers.near - near) < 0.01) return;
    Object.assign(layers, { hum, rumble, h, lvl: r, near, z });
    if (!drone) return;
    const t = drone.ac.currentTime;
    drone.humOn.gain.setTargetAtTime(h, t, 0.4);
    drone.rumOn.gain.setTargetAtTime(r, t, 0.4);
    drone.voice.setLayers(z);
  }

  // The switch crossfade: the old voice leaves over XOUT s, the new one enters over XIN s.
  // The new voice waits XWAIT s, so it rises out of the wipe's dark point.
  // 5 s out keeps two dense choirs from piling up (Tom: careful with bleed).
  const XOUT = 5, XIN = 6, XWAIT = 0.4;
  // A quarter sine in, a quarter cosine out: the two powers sum to one.
  function ease(prm, at, dur, up) {
    const n = 96, c = new Float32Array(n), from = up ? 0 : prm.value;
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * Math.PI / 2; c[i] = up ? Math.sin(x) : from * Math.cos(x); }
    // A new gain starts at 1; it must hold silent until its curve begins.
    if (up) { prm.value = 0; prm.setValueAtTime(0, at - 0.005); }
    else if (prm.cancelAndHoldAtTime) prm.cancelAndHoldAtTime(at - 0.005);
    else { prm.cancelScheduledValues(at - 0.005); prm.setValueAtTime(from, at - 0.005); }
    prm.setValueCurveAtTime(c, at, dur);
  }
  // The idle rest (Tom, 2026-11-25): the choir thins out and goes down 6 dB.
  // The rumble holds, so the bass comes forward.
  // A low pass closes to REST_HZ, so the rest sounds a little dull.
  const REST_DB = -6, REST_HZ = 1400, OPEN_HZ = 20000, SETTLE = 10, STIR = 8;
  // The low pass moves by detune, so the sweep is even in pitch.
  const REST_CENTS = 1200 * Math.log2(REST_HZ / OPEN_HZ);
  // The ramp on the page clock: from, to, start in s, length in s.
  let rest = { from: 0, to: 0, at: 0, dur: 0 };
  const nowS = () => performance.now() / 1000;
  // The rest level now: 0 awake, 1 at rest.
  function restAt(t = nowS()) {
    const r = rest, x = t - r.at;
    return r.dur > 0 && x < r.dur * 3 ? r.to + (r.from - r.to) * Math.exp(-3 * x / r.dur) : r.to;
  }
  const restGain = k => 1 + (dB(REST_DB) - 1) * k;
  // Sets one drone on the running ramp; a new drone starts where the ramp is.
  function restDrone(d) {
    const at = d.ac.currentTime, cur = restAt();
    const ps = [[d.restC.gain, restGain], [d.restLP.detune, k => REST_CENTS * k]];
    for (const [p, f] of ps) {
      if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(at); else p.cancelScheduledValues(at);
      p.setValueAtTime(f(cur), at);
    }
    d.voice.rest(cur, at, 0);
    if (Math.abs(cur - rest.to) < 0.001) return;
    for (const [p, f] of ps) p.setTargetAtTime(f(rest.to), at, rest.dur / 3);
    d.voice.rest(rest.to, at, rest.dur);
  }
  function restTo(k, dur) {
    if (rest.to === k) return;
    rest = { from: restAt(), to: k, at: nowS(), dur };
    if (drone) restDrone(drone);
  }
  // The choir goes to rest over SETTLE s.
  const settle = () => restTo(1, SETTLE);
  // The choir comes back over STIR s.
  const stir = () => restTo(0, STIR);
  // Fades the voice out over dur s, before a stop.
  function fade(dur) {
    if (!drone) return;
    const t = drone.ac.currentTime;
    for (const x of [drone.g, drone.gc]) ease(x.gain, t, dur, false);
  }
  // Stops a fade and brings the voice back to full over about 2 s.
  function unfade() {
    if (!drone) return;
    const t = drone.ac.currentTime;
    for (const x of [drone.g, drone.gc]) {
      const p = x.gain;
      if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t); else { p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); }
      p.setTargetAtTime(1, t, 0.7);
    }
  }

  function hum(band) {
    const ac = kit.live();
    if (!ac) return;
    if (drone && drone.ac === ac && drone.band === band) {
      if (ac.currentTime > drone.voice.until - 40) drone.voice.sing(ac.currentTime + 240);
      return;
    }
    const t = ac.currentTime + 0.01;
    // A star switch crossfades at equal power: the old voice eases out, the new one in (Tom).
    if (drone && drone.ac === ac) {
      // Taps from the last star and their echoes taper out first, so they do not bleed.
      if (taps && taps.ac === ac) taps.bus.fadeAll(t, 1.5);
      const old = drone;
      for (const x of [old.g, old.gc]) ease(x.gain, t, XOUT, false);
      for (const o of old.os) { try { o.stop(t + XOUT + 0.5); } catch { /* stopped */ } }
      leaving.add(old);
      when(ac, t + XOUT + 0.5, () => drop(old));
    }
    const root = keyOf(band) / 2;
    const os = [];
    const g = ac.createGain();
    ease(g.gain, t + XWAIT, XIN, true);
    g.connect(kit.out);
    send(ac, g, 0.8, hallOf(ac));

    // The choir skips the echo hall: its own reverb carries it.
    const humOn = ac.createGain();
    humOn.gain.value = layers.h;
    const gc = ac.createGain();
    ease(gc.gain, t + XWAIT, XIN, true);
    const restC = ac.createGain();
    const restLP = ac.createBiquadFilter();
    restLP.type = 'lowpass';
    restLP.frequency.value = OPEN_HZ;
    restLP.Q.value = 0;
    humOn.connect(restC).connect(restLP).connect(gc).connect(kit.out);
    const voice = choir(ac, { t, base: root * 4, p: preset(band), out: humOn, hall: hallOf(ac), os, track });
    voice.setLayers(layers.z);
    voice.setTurn(turnK);
    voice.sing(t + 240);

    // The space rumble: a seamless rendered loop, added once it is ready.
    const rumOn = ac.createGain();
    rumOn.gain.value = layers.rumble ? layers.lvl : 0;
    rumOn.connect(g);
    const glue = ac.createGain();
    glue.gain.value = GLUE;
    rumOn.connect(glue).connect(voice.cv);
    const me = { ac, band };
    const bedP = bed && bed.ac === ac && bed.root === root ? Promise.resolve(bed.b) : renderBed(ac, root).then(b => (bed = { ac, root, b }).b);
    bedP.then(b => {
      // A newer star, mute, or a hidden tab won the race: drop this one.
      if (drone !== me.d || kit.live() !== ac) return;
      const s = track(ac.createBufferSource());
      s.buffer = b;
      s.loop = true;
      const a = ac.createGain();
      a.gain.value = 0.12;
      s.connect(a).connect(rumOn);
      s.start(ac.currentTime + 0.02, Math.random() * LOOP);
      os.push(s);
    });
    drone = { ac, band, g, gc, os, voice, humOn, rumOn, restC, restLP };
    me.d = drone;
    restDrone(drone);
  }

  // A prominence lifts off: the brass blast only (Tom).
  function rise(pan, band, k = 1) {
    const ac = kit.live();
    if (!ac || !on('sndLift')) return;
    braam(ac, ac.currentTime + 0.005, pan, band, clamp(k, 0.3, 1), 9);
  }

  // A tap: the brass blast, then the glow chord (Tom: only these two).
  function flare(pan, band, k = 1) {
    const ac = kit.live();
    if (!ac) return;
    const t = ac.currentTime + 0.005;
    const K = clamp(k, 0.3, 1);
    run.n = t - run.at < RUN_GAP ? run.n + 1 : 0;
    run.at = t;
    const [up, max] = TAP_RUNS[runOf(preset(band))](chordOf(ac, band, t), run.n);
    // Added triad voices sit lower, so three ringing are not much louder than one.
    if (on('sndBlast')) braam(ac, t, pan, band, K * 0.7 * (max > 1 && run.n > 0 ? 0.6 : 1), 6, up, max);
    if (!on('sndGlow')) return;
    // The glow: a slow chord while the arcade shines.
    const ch = chordOf(ac, band, t);
    tapsOf(ac).glow({ t, root: keyOf(band) / 2, K, p: preset(band), pan, room: roomOf(ac, band), chordRoot: ch ? ch.root : 1, notes: ch ? ch.tones : null });
  }

  // A pulsar: each beam flash is a soft highlight inside its own choir, no separate sound (Tom).
  // The choir bends, opens, dips and shimmers for about 0.3 s; choir.js holds the shape (wob).
  let spinRate = 0;
  // main.js calls this once per flash; pan is where the beam meets the eye, -1 to 1.
  function ping(pan, band) {
    const ac = kit.live();
    if (!ac || !on('sndPing') || spinRate > 2.5) return;
    if (drone && drone.ac === ac && drone.band === band) drone.voice.pulse(ac.currentTime + 0.003);
  }
  // main.js calls this each frame while the spin runs fast (flashes a second), and 0 at the end.
  // The flashes then fuse into a vibrato and tremolo at the spin rate.
  function spin(rate, band) {
    const ac = kit.live();
    spinRate = rate;
    if (!ac || !on('sndPing')) return;
    if (drone && drone.ac === ac && drone.band === band) drone.voice.spin(rate);
  }

  // Vega's primes: one soft note per pulse, a step of the pentatonic per group.
  function prime(band, group) {
    const ac = kit.live();
    if (!ac || !on('sndPrime')) return;
    const t = ac.currentTime + 0.01;
    const f = (ROOT[band] || 220) * 2 ** ([0, 2, 4, 7, 9, 12][group % 6] / 12);
    const pad = voice(ac, 0);
    pad.gain.setValueAtTime(0, t);
    pad.gain.linearRampToValueAtTime(0.03, t + 0.02);
    pad.gain.setTargetAtTime(0.0001, t + 0.05, 0.35);
    osc(ac, 'sine', f, t, 2.5).connect(pad);
    send(ac, pad, 0.8);
  }

  // The probe's beacon: a short pip at the shifted pitch, quieter as it reddens.
  function pip(f, level) {
    const ac = kit.live();
    if (!ac || !on('sndProbe') || !(level > 0.01)) return;
    const t = ac.currentTime + 0.01;
    const g = voice(ac, 0);
    env(g, t, 0.035 * level, 0.008, 0.12);
    osc(ac, 'sine', f, t, 0.2).connect(g);
    send(ac, g, 0.6);
  }

  // A neutrino tick: a dry, short click.
  function tick(level) {
    const ac = kit.live();
    if (!ac || !on('sndTick')) return;
    const t = ac.currentTime + 0.01;
    const g = voice(ac, 0);
    env(g, t, 0.06 * level, 0.001, 0.025);
    const hp = filt(ac, 'highpass', 2500, 0.7);
    hp.connect(g);
    noise(ac, t, 0.05).connect(hp);
  }

  // The Great Dimming: a chord that falls and muffles as the light goes.
  function dim(band) {
    const ac = kit.live();
    if (!ac || !on('sndDim')) return;
    const t = ac.currentTime + 0.01;
    const root = (ROOT[band] || 220) / 2;
    const pad = voice(ac, 0);
    pad.gain.setValueAtTime(0, t);
    pad.gain.linearRampToValueAtTime(0.05, t + 3);
    pad.gain.setTargetAtTime(0.0001, t + 12, 5);
    const plp = filt(ac, 'lowpass', 1200, 0.5);
    plp.frequency.exponentialRampToValueAtTime(160, t + 10);
    plp.connect(pad);
    for (const m of [1, 1.189, 1.498]) {
      const o = osc(ac, 'triangle', root * m, t, 30);
      o.frequency.exponentialRampToValueAtTime(root * m * 0.94, t + 10);
      o.connect(plp);
    }
    send(ac, pad, 0.5);
  }

  // The Sun's egg: a ship's distress beacon, three pips and a pause on a radio hiss (Tom, 2026-11-24).
  // It runs len s from now and pans to Mercury; the returned function ends it early.
  const BEACON_HZ = 1180, BEACON_EVERY = 2.6, BEACON_LVL = 0.035;
  function beacon(pan, len) {
    const ac = kit.live();
    if (!ac) return null;
    const t = ac.currentTime + 0.02, end = t + len;
    const g = voice(ac, pan);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(BEACON_LVL, t + 2.4);
    g.gain.setValueAtTime(BEACON_LVL, end - 4);
    g.gain.linearRampToValueAtTime(0, end);
    // A narrow radio band: the pips and the hiss share it.
    const band = filt(ac, 'bandpass', 1500, 2.5);
    band.connect(g);
    const hiss = ac.createGain();
    hiss.gain.value = 0.18;
    const src = noise(ac, t, len, 1);
    src.connect(hiss).connect(band);
    const gate = ac.createGain();
    gate.gain.value = 0;
    const tone = osc(ac, 'square', BEACON_HZ, t, len);
    tone.connect(gate).connect(band);
    // Three short pips, then a pause.
    for (let at = t + 0.6; at < end - 1; at += BEACON_EVERY) {
      for (let k = 0; k < 3; k++) {
        const a = at + k * 0.24;
        gate.gain.setValueAtTime(0, a);
        gate.gain.linearRampToValueAtTime(1, a + 0.01);
        gate.gain.setValueAtTime(1, a + 0.11);
        gate.gain.linearRampToValueAtTime(0, a + 0.12);
      }
    }
    send(ac, g, 0.5);
    return () => {
      const n = ac.currentTime;
      g.gain.cancelScheduledValues(n);
      g.gain.setValueAtTime(g.gain.value, n);
      g.gain.linearRampToValueAtTime(0, n + 0.4);
      for (const x of [src, tone]) { try { x.stop(n + 0.45); } catch { /* ended */ } }
    };
  }

  // Stops every sound now: mute, a hidden tab, or sleep.
  function quiet() {
    spinRate = 0;
    for (const n of live) { try { n.stop(); } catch { /* not started */ } }
    for (const d of [drone, ...leaving]) if (d) drop(d);
    drone = null;
  }
  return { flare, rise, hum, mixLayers, setTurn, ping, spin, dim, prime, pip, tick, beacon, quiet, settle, stir, fade, unfade, get rest() { return restAt(); }, get restGains() { return drone && { choir: drone.restC.gain.value, hz: Math.round(OPEN_HZ * 2 ** (drone.restLP.detune.value / 1200)), layers: drone.voice.restGains?.() }; }, get busy() { return pending > 0; } };
}
