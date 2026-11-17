// Load order: sound/ship runs first.
import './ship.ts';
import { clamp, rad } from '../setup.ts';
import { aimNow } from '../ship/hit.ts';
import { blip, burst, filt, jit, kit, track } from './kit.ts';

/* ---------- the traverse motor ---------- */
// A hydraulic pump whines with the slew speed; gears chatter under it.
// A clunk marks each start and each stop.
// The motor's sources and the params the slew drives.
export interface Motor { srcs: AudioScheduledSourceNode[]; g: GainNode; pump: OscillatorNode; gear: OscillatorNode; bp: BiquadFilterNode; chat: OscillatorNode; fg: GainNode; on: boolean; quiet: boolean; off: number; next: number; n: number }
export let motor: Motor | null = null, clunks = 0;
// This slew speed, in radians a second, runs the motor flat out.
const SLEW_TOP = rad(6);
function motorStart(ac: BaseAudioContext) {
  const g = ac.createGain(), am = ac.createGain(), lp = filt(ac, 'lowpass', 700, 0.9), bp = filt(ac, 'bandpass', 900, 5);
  g.gain.value = 0; am.gain.value = 0.75;
  // The pump: a low saw, darkened, for the hydraulic drone.
  const pump = ac.createOscillator();
  pump.type = 'sawtooth'; pump.frequency.value = 34;
  pump.connect(lp).connect(am);
  // The gear whine: a square through a narrow band.
  const gear = ac.createOscillator(), gg = ac.createGain();
  gear.type = 'square'; gear.frequency.value = 220; gg.gain.value = 0.15;
  gear.connect(bp).connect(gg).connect(am);
  // The flow: oil hisses through the valves.
  const flow = ac.createBufferSource(), fb = filt(ac, 'bandpass', 1500, 1.2), fg = ac.createGain();
  flow.buffer = kit.noise; flow.loop = true; fg.gain.value = 0.1;
  flow.connect(fb).connect(fg).connect(am);
  // The chatter: gear teeth beat the level at the mesh rate.
  const chat = ac.createOscillator(), cg = ac.createGain();
  chat.frequency.value = 8; cg.gain.value = 0.25;
  chat.connect(cg).connect(am.gain);
  am.connect(g).connect(kit.out);
  const srcs = [pump, gear, flow, chat];
  for (const s of srcs) s.start();
  motor = { srcs, g, pump, gear, bp, chat, fg, on: false, quiet: false, off: 0, next: 0, n: 0 };
}
// The traverse sound is off for now (Tom, 2026-11-12).
const MOTOR_ON = false;
// The frame loop feeds the motor the gun's slew speed.
export function motorUpdate() {
  if (!MOTOR_ON) return;
  const s = clamp(Math.hypot(aimNow.vy, aimNow.ve) / SLEW_TOP, 0, 1), ac = kit.live();
  if (!ac) { motorStop(true); return; }
  if (!motor) { if (s < 0.1) return; motorStart(ac); }
  // motorStart() sets motor.
  const m = motor!, t = ac.currentTime;
  // Two thresholds keep a slow settle from clunking twice.
  if (!m.on && s > 0.1) { m.on = true; m.quiet = false; clearTimeout(m.off); clunk(ac, 1); m.next = t + 0.12; }
  else if (m.on && s < 0.025) { m.on = false; clunk(ac, 0.7); m.off = setTimeout(() => { if (motor === m && !m.on) motorStop(); }, 1500); }
  // The teeth clank in a rhythm: 1.5 a second at a crawl, 7 flat out.
  // Each clank is scheduled ahead, so the rhythm holds between frames.
  if (m.on) while (m.next < t + 0.12) { clank(ac, Math.max(t, m.next), m.n++ % 2, s); m.next += 1 / (1.5 + 5.5 * s); }
  if (m.quiet) return;
  m.quiet = !m.on;
  const v = m.on ? s : 0;
  m.pump.frequency.setTargetAtTime(34 + 60 * v, t, 0.12);
  m.gear.frequency.setTargetAtTime(220 + 520 * v, t, 0.12);
  m.bp.frequency.setTargetAtTime(700 + 1400 * v, t, 0.12);
  m.chat.frequency.setTargetAtTime(8 + 34 * v, t, 0.12);
  m.fg.gain.setTargetAtTime(0.1 + 0.4 * v, t, 0.1);
  // The bed sits low; the clanks carry the motion.
  m.g.gain.setTargetAtTime(m.on ? 0.018 + 0.04 * Math.sqrt(s) : 0, t, m.on ? 0.06 : 0.1);
}
// A metal clank: a gear tooth strikes; tick and tock alternate in pitch.
// Inharmonic partials ring short, over a click of bright noise.
function clank(ac: BaseAudioContext, t: number, tock: number, s: number) {
  const o = kit.out, f = (tock ? 470 : 610) * jit(0.03), k = 1.4 * (0.6 + 0.4 * s) * jit(0.15), lp = filt(ac, 'lowpass', 5200, 0.7);
  lp.connect(o);
  track(t + 0.4,
    ...[[1, 0.03, 0.22], [2.63, 0.018, 0.14], [4.95, 0.01, 0.08]].map(([r, lv, d]) => blip(ac, lp, t, { f0: f * r, peak: lv * k, a: 0.001, dur: d })),
    burst(ac, lp, t, { dur: 0.025, rate: 1.2, f: 3200, q: 1.2, peak: 0.025 * k, a: 0.0008 }).src);
}
// now: a hard stop for mute and a hidden tab; else a short fade.
export function motorStop(now = false) {
  if (!motor) return;
  const m = motor, ac = kit.ac;
  motor = null;
  clearTimeout(m.off);
  if (now || !ac || ac.state !== 'running') { for (const s of m.srcs) { try { s.stop(); s.disconnect(); } catch { /* gone */ } } m.g.disconnect(); return; }
  const t = ac.currentTime;
  m.g.gain.setTargetAtTime(0, t, 0.03);
  for (const s of m.srcs) s.stop(t + 0.2);
  track(t + 0.25, ...m.srcs);
}
// A clunk: a low knock, a short tick, a brief metal ring.
export function clunk(ac: BaseAudioContext, k: number) {
  const t = ac.currentTime, o = kit.out;
  clunks++;
  track(t + 0.5,
    blip(ac, o, t, { f0: 130, f1: 52, glide: 0.12, peak: 0.3 * k, a: 0.002, dur: 0.24 }),
    burst(ac, o, t, { dur: 0.05, rate: 0.8, f: 1300, q: 1.5, peak: 0.14 * k, a: 0.001 }).src,
    blip(ac, o, t + 0.004, { f0: 780 * jit(0.05), peak: 0.03 * k, a: 0.002, dur: 0.4 }));
}
