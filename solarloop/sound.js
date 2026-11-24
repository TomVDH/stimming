// Solar loop sound in Web Audio. Muted by default; the kit holds the context.
import { choir, tapBus, preset, keyed, renderBed, LOOP } from './choir.js';
// Space is silent, so the sound is a sonification: each part has a visible cause.
// A flare: the deep synth, then a slow glow chord. A lifting prominence: the synth only. A drag is silent.
// Awake: a voice over a constant deep surround rumble.
// Every star's voice is the choir in choir.js, shaped by its preset.

const jit = (k = 0.1) => 1 + (Math.random() * 2 - 1) * k;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// The key falls as the star grows: the hypergiant hums lowest.
// The Sun sits in A sharp (Tom, 2026-11-24), set by ear with its choir.
export const ROOT = { neutron: 440, siriusb: 392, wise: 329.63, luhman: 293.66, proxima: 261.63, epseri: 233.08, sun: 233.08, procyon: 207.65, sirius: 196, vega: 185, ttauri: 185, regulus: 174.61, zetaoph: 164.81, rigel: 146.83, arcturus: 138.59, betelgeuse: 123.47, vycma: 110 };

// `near` is 1 on the long lens, 0 on the full star, below 0 zoomed out.
// The rumble grows as the view closes in on the star (Tom).
// Level in dB by closeness, against the old fixed level (Tom).
// Long lens +2.3, wide view +1, full star 0; it fades only far out.
const RUMBLE = [[-1.4, -9], [-0.7, 0], [0, 0], [0.69, 1], [1, 2.3]];
export function rumbleAt(near) {
  const P = RUMBLE, x = clamp(near, P[0][0], P[P.length - 1][0]);
  let i = 1;
  while (i < P.length - 1 && x > P[i][0]) i++;
  const [x0, y0] = P[i - 1], [x1, y1] = P[i];
  return Math.pow(10, (y0 + (y1 - y0) * (x - x0) / (x1 - x0)) / 20);
}

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
  function braam(ac, t, pan, band, K, len = 6) {
    tapsOf(ac).blast({ t, root: keyOf(band) / 4, K, len, p: preset(band), pan, room: roomOf(ac, band) });
  }

  // The star's voice while the toy is awake, in two layers.
  // The space rumble: a constant, dense, deep surround drone, a seamless loop.
  // The hum: the star's choir from choir.js, in its own reverb.
  // The rumble feeds the choir's reverb a little, so both share one room.
  const GLUE = 0.6;
  let bed = null;
  let drone = null;
  // Which layers sound: the Dev toggles set them.
  const layers = { hum: true, rumble: true, h: 1, lvl: 1 };
  function mixLayers(hum, rumble, near = 0) {
    const h = hum ? lvl('sndHumLvl') : 0;
    const r = rumble ? rumbleAt(near) * lvl('sndRumbleLvl') : 0;
    if (Math.abs(layers.h - h) < 0.01 && Math.abs(layers.lvl - r) < 0.01) return;
    layers.hum = hum; layers.rumble = rumble; layers.h = h; layers.lvl = r;
    if (!drone) return;
    const t = drone.ac.currentTime;
    drone.humOn.gain.setTargetAtTime(h, t, 0.4);
    drone.rumOn.gain.setTargetAtTime(r, t, 0.4);
  }

  function hum(band) {
    const ac = kit.live();
    if (!ac) return;
    if (drone && drone.ac === ac && drone.band === band) {
      if (ac.currentTime > drone.voice.until - 40) drone.voice.sing(ac.currentTime + 240);
      return;
    }
    const t = ac.currentTime + 0.01;
    if (drone && drone.ac === ac) {
      for (const x of [drone.g, drone.gc]) x.gain.setTargetAtTime(0, t, 1.2);
      for (const o of drone.os) { try { o.stop(t + 6); } catch { /* stopped */ } }
    }
    const root = keyOf(band) / 2;
    const os = [];
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1, t + 6);
    g.connect(kit.out);
    send(ac, g, 0.8, hallOf(ac));

    // The choir skips the echo hall: its own reverb carries it.
    const humOn = ac.createGain();
    humOn.gain.value = layers.h;
    const gc = ac.createGain();
    gc.gain.setValueAtTime(0, t);
    gc.gain.linearRampToValueAtTime(1, t + 4);
    humOn.connect(gc).connect(kit.out);
    const voice = choir(ac, { t, base: root * 4, p: preset(band), out: humOn, os, track });
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
    drone = { ac, band, g, gc, os, voice, humOn, rumOn };
    me.d = drone;
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
    if (on('sndBlast')) braam(ac, t, pan, band, K * 0.7, 6);
    if (!on('sndGlow')) return;
    // The glow: a slow chord while the arcade shines.
    tapsOf(ac).glow({ t, root: keyOf(band) / 2, K, p: preset(band), pan, room: roomOf(ac, band) });
  }

  // A pulsar's tick: a dry click on a short low thump, each time a beam sweeps past.
  function tick() {
    const ac = kit.live();
    if (!ac || !kit.noise || !on('sndTick')) return;
    const t = ac.currentTime + 0.003;
    const c = voice(ac, 0);
    env(c, t, 0.12, 0.001, 0.05);
    noise(ac, t, 0.08, 1.4).connect(filt(ac, 'bandpass', 2400, 2)).connect(c);
    const th = voice(ac, 0);
    env(th, t, 0.16, 0.002, 0.14);
    const o = osc(ac, 'sine', 120, t, 0.2);
    o.frequency.exponentialRampToValueAtTime(50, t + 0.12);
    o.connect(th);
    send(ac, c, 0.3);
  }

  // The Carrington storm reaches the earth: a far telegraph sounder clacks, its line sparks.
  // In 1859 operators sent messages on the storm's current alone.
  function telegraph() {
    const ac = kit.live();
    if (!ac || !kit.noise || !on('sndTelegraph')) return;
    const t0 = ac.currentTime + 0.02;
    const pan = Math.random() < 0.5 ? -0.55 : 0.55;
    const bar = (at, f, lvl) => {
      const g = voice(ac, pan);
      env(g, at, lvl, 0.0015, 0.05);
      noise(ac, at, 0.07, 1.2).connect(filt(ac, 'bandpass', f, 6)).connect(g);
      send(ac, g, 0.6);
    };
    // The sounder: a click as the key goes down, a clack as it comes up.
    let at = t0;
    for (let i = 0; i < 22; i++) {
      const len = Math.random() < 0.35 ? 0.2 : 0.07;
      bar(at, 1500 * jit(0.05), 0.09);
      bar(at + len, 900 * jit(0.05), 0.06);
      at += len + (Math.random() < 0.2 ? 0.3 : 0.09);
    }
    // Sparks: short crackles where the current jumps at the instrument.
    for (let i = 0; i < 9; i++) {
      const sp = t0 + Math.random() * (at - t0);
      const g = voice(ac, clamp(pan + (Math.random() - 0.5) * 0.3, -1, 1));
      env(g, sp, 0.07 * jit(0.5), 0.001, 0.03 + 0.05 * Math.random());
      noise(ac, sp, 0.12, 2).connect(filt(ac, 'highpass', 3500, 0.7)).connect(g);
    }
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

  // Stops every sound now: mute, a hidden tab, or sleep.
  function quiet() {
    drone = null;
    for (const n of live) { try { n.stop(); } catch { /* not started */ } }
  }
  return { flare, rise, hum, mixLayers, tick, telegraph, dim, quiet, get busy() { return pending > 0; } };
}
