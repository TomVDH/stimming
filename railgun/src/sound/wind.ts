// @ts-nocheck
// Load order: sound/kit runs first.
import './kit.ts';
import { state } from '../state.ts';
import { roarK } from '../setup.ts';
import { ast, astMesh } from '../rock/asteroid.ts';
import { chaos } from '../play/charge.ts';
import { filt, kit } from './kit.ts';

/* ---------- the wind bed ---------- */
// Low wind over the plain, a whistle past the pylon.
// It dips under a charge.
export let bed = null;
function windBed(ac) {
  if (bed) return;
  const src = ac.createBufferSource(), lp = filt(ac, 'lowpass', 400), g = ac.createGain();
  src.buffer = kit.noise; src.loop = true; src.playbackRate.value = 0.5;
  g.gain.value = 0;
  src.connect(lp).connect(g).connect(kit.out);
  const bp = filt(ac, 'bandpass', 900, 2), g2 = ac.createGain();
  g2.gain.value = 0;
  src.connect(bp).connect(g2).connect(kit.out);
  // A slow swell moves the wind's cutoff.
  const lfo = ac.createOscillator(), lg = ac.createGain();
  lfo.frequency.value = 0.1; lg.gain.value = 150;
  lfo.connect(lg).connect(lp.frequency);
  src.start(); lfo.start();
  bed = { src, g, g2, lfo };
}
// The rock's roar: Ten seconds' booster crackle, far off and soft.
// It loads once; null while it loads, false if it fails.
let roarBuf = null, roarP = null, roarBed = null;
function loadRoar(ac) {
  roarP ??= fetch('thrust.mp3').then(r => r.arrayBuffer()).then(b => ac.decodeAudioData(b)).then(buf => {
    // The MP3 pads both ends with silence; the loop skips it.
    const d0 = buf.getChannelData(0), q = 0.002;
    let a = 0, z = d0.length - 1;
    while (a < z && Math.abs(d0[a]) < q) a++;
    while (z > a && Math.abs(d0[z]) < q) z--;
    // The tail cross-fades into the head, so the loop has no seam.
    const F = Math.floor(0.6 * buf.sampleRate), N = z - a - F;
    const out = ac.createBuffer(buf.numberOfChannels, N, buf.sampleRate);
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const src = buf.getChannelData(c), dst = out.getChannelData(c);
      for (let i = 0; i < N; i++) dst[i] = src[a + i];
      // Equal power keeps the level steady through the join.
      for (let i = 0; i < F; i++) { const w = (i / F) * Math.PI / 2; dst[i] = src[a + i] * Math.sin(w) + src[a + N + i] * Math.cos(w); }
    }
    roarBuf = out;
  }).catch(() => { roarBuf = false; });
}
function rockRoar(ac) {
  if (roarBed) return;
  loadRoar(ac);
  if (!roarBuf) return;
  const src = ac.createBufferSource(), lp = filt(ac, 'lowpass', 2200), g = ac.createGain();
  // Played slow, it sounds far and big.
  src.buffer = roarBuf; src.loop = true; src.playbackRate.value = 0.72;
  g.gain.value = 0;
  src.connect(lp).connect(g).connect(kit.out);
  src.start(0, Math.random() * roarBuf.duration);
  roarBed = { src, lp, g };
}
export function soundBed() {
  const ac = kit.live();
  if (!ac) { if (bed) { bed.g.gain.value = 0; bed.g2.gain.value = 0; } if (roarBed) roarBed.g.gain.value = 0; return; }
  windBed(ac);
  const k = state.pace * (1 - 0.4 * chaos);
  bed.g.gain.setTargetAtTime(0.02 * k, ac.currentTime, 0.3);
  bed.g2.gain.setTargetAtTime(0.006 * k, ac.currentTime, 0.3);
  rockRoar(ac);
  if (roarBed) {
    // It plays only while a rock burns in the sky.
    const up = state.tgtKind === 'rock' && astMesh.visible && (ast.state === 'approach' || ast.state === 'hold' || (ast.state === 'strike' && state.strike && !state.strike.hit));
    // It grows a little and brightens as the rock comes down.
    const near = Math.min(ast.s, 1);
    roarBed.g.gain.setTargetAtTime(up ? (0.022 + 0.03 * near * near) * state.pace * roarK : 0, ac.currentTime, up ? 1.2 : 0.5);
    roarBed.lp.frequency.setTargetAtTime(1400 + 1800 * near, ac.currentTime, 1);
  }
}
