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
export const ROOT = { s5hvs1: 311.13, betalyr: 130.81, j1407: 196, tzo: 103.83, wr124: 155.56, cygx1: 98, sgra: 82.41, qso: 73.42, neutron: 440, siriusb: 392, wise: 329.63, luhman: 293.66, proxima: 261.63, epseri: 233.08, sun: 233.08, procyon: 207.65, sirius: 196, vega: 185, ttauri: 185, regulus: 174.61, zetaoph: 164.81, rigel: 146.83, arcturus: 138.59, betelgeuse: 123.47, vycma: 110, st218: 98, wohg64: 103.83, quasi: 87.31, wr140: 146.83, vfts352: 174.61, xxtri: 196 };

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
  function braam(ac, t, pan, band, K, len = 6) {
    const ch = chordOf(ac, band, t);
    tapsOf(ac).blast({ t, root: keyOf(band) / 4, K, len, p: preset(band), pan, room: roomOf(ac, band), chordRoot: ch ? ch.root : 1 });
  }

  // The star's voice while the toy is awake, in two layers.
  // The space rumble: a constant, dense, deep surround drone, a seamless loop.
  // The hum: the star's choir from choir.js, in its own reverb.
  // The rumble feeds the choir's reverb a little, so both share one room.
  const GLUE = 0.6;
  let bed = null;
  let drone = null;
  // Which layers sound: the Dev toggles set them.
  const layers = { hum: true, rumble: true, h: 1, lvl: 1, near: 0, z: zoomAt(0) };
  // The toy's Turn speed against x10k: an orbit swell (swTurn) keeps pace with it.
  let turnK = 1;
  function setTurn(rate) { turnK = rate / 1e4; drone?.voice.setTurn(turnK); }
  // The zoom mix (choir.js ZOOM): choir and rumble levels and the layer gains by nearness.
  // `near` is 1 on the long lens, 0 on the full star, below 0 zoomed out.
  const dB = x => 10 ** (x / 20);
  // rate: the toy's eased Turn rate (1, 5000 or 10000), from main.js mixSound().
  function mixLayers(hum, rumble, near = 0, rate) {
    if (rate !== undefined) setTurn(rate);
    near = nearOf(near, drone?.band);
    const z = zoomAt(near);
    const h = hum ? lvl('sndHumLvl') * dB(z.choir) : 0;
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
      for (const x of [drone.g, drone.gc]) ease(x.gain, t, XOUT, false);
      for (const o of drone.os) { try { o.stop(t + XOUT + 0.5); } catch { /* stopped */ } }
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
    humOn.connect(gc).connect(kit.out);
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
    spinRate = 0;
    drone = null;
    for (const n of live) { try { n.stop(); } catch { /* not started */ } }
  }
  return { flare, rise, hum, mixLayers, setTurn, ping, spin, dim, quiet, get busy() { return pending > 0; } };
}
