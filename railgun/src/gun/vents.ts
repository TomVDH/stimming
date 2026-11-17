// Load order: gun/motes runs first.
import './motes.ts';
import * as THREE from 'three';
import { linFit, reduced } from '../../../shared/stim.js';
import { state } from '../state.ts';
import { rnd } from '../setup.ts';
import { AX, barrelPt } from '../world/axis.ts';
import { VENTS } from './gun.ts';
import { arcFrame, arcSide, arcUp } from './arcs.ts';
import { sight } from '../view/camera.ts';
import { makeVol, volSteps } from '../fx/volfx.ts';
import { bp } from '../play/shot.ts';
import { filt, hiss, kit, track } from '../sound/kit.ts';

/* ---------- breech vents: a ripple of side jets, then the flap opens ---------- */
// Each jet: uVj = place, birth time. uVd = heading, strength.
const VJ = VENTS.length * 2;
// Lit as the comet trail is: a short march toward the sun, two-lobe phase.
export const ventJets = makeVol(/* glsl */`
uniform vec4 uVj[${VJ}], uVd[${VJ}];
uniform vec3 uSteamC;
uniform float uTime;
float dens(vec3 p, out vec3 em) {
  em = vec3(0.0);
  float cov = 0.0, hot = 0.0;
  for (int i = 0; i < ${VJ}; i++) {
    float age = uTime - uVj[i].w;
    if (age < 0.0 || age > 4.0) continue;
    vec3 dir = uVd[i].xyz;
    // The steam climbs and drifts downwind as it slows.
    vec3 q = p - uVj[i].xyz - vec3(5.0, 16.0, 2.0) * age * age;
    // Far from this jet: skip it before any exp.
    if (dot(q, q) > 120000.0) continue;
    float x = dot(q, dir);
    float L = 260.0 * (1.0 - exp(-age / 0.3));
    float rr = length(q - dir * x), R = 5.0 + 0.3 * max(x, 0.0) + 14.0 * age;
    float c = exp(-rr * rr / (R * R)) * smoothstep(-6.0, 6.0, x) * (1.0 - smoothstep(0.7 * L, 1.15 * L + 20.0, x));
    cov = max(cov, c * smoothstep(0.0, 0.04, age) * exp(-age / 1.1) * uVd[i].w);
    // A hot breath at the louvre for the first instant.
    hot = max(hot, c * exp(-age / 0.12) * exp(-max(x, 0.0) / 40.0));
  }
  if (cov < 0.004) return 0.0;
  vec3 w = p * 0.012 + vec3(0.0, -uTime * 0.15, 0.0);
  float d = clamp((dustN(w) - (1.0 - min(cov, 1.0))) * 2.2, 0.0, 1.0);
  em = vec3(1.0, 0.55, 0.25) * hot * d * 0.08;
  return d * 0.06;
}
vec3 alb(vec3 p) { return uSteamC; }
vec3 vlight(vec3 p) { return blastLight(p); }`, {
  uVj: { value: Array.from({ length: VJ }, () => new THREE.Vector4(0, 0, 0, -1e9)) },
  uVd: { value: Array.from({ length: VJ }, () => new THREE.Vector4()) },
  uSteamC: { value: new THREE.Vector3(...linFit(0.9, 0.008, 240)) },
});
let ventFx: { t0: number } | null = null;
const vjB = new THREE.Vector3();
// The vents fire back to front, the two flanks a beat apart.
export function fireVents() {
  if (reduced()) return;
  const u = ventJets.material.uniforms;
  let i = 0;
  VENTS.forEach(([a, h], k) => {
    arcFrame(a);
    for (const sd of [-1, 1]) {
      barrelPt(a, sd * 44, h, bp);
      vjB.copy(arcSide).multiplyScalar(sd).addScaledVector(AX, -0.3).addScaledVector(arcUp, 0.12).normalize();
      u.uVj.value[i].set(bp.x, bp.y, bp.z, state.simT + 0.11 * k + (sd > 0 ? 0 : 0.05));
      u.uVd.value[i++].set(vjB.x, vjB.y, vjB.z, 0.75 + 0.35 * rnd());
    }
  });
  ventFx = { t0: state.simT };
  ventSounds();
}
export function updateVents() {
  const on = !!ventFx && state.simT - ventFx.t0 < 5.5 && !sight;
  ventJets.visible = on;
  if (!on) return;
  const u = ventJets.material.uniforms;
  barrelPt(-275, 0, 50, u.uC.value);
  u.uR.value = 360;
  u.uVSteps.value = Math.max(8, Math.round(volSteps() * 0.6)); u.uLSteps.value = 2; u.uLs.value = 12;
}
// The flap: a heavy latch clank, then the swing's dull knock.
export function flapSound() {
  const ac = kit.live();
  if (!ac) return;
  [[0, 140, 0.18], [0.09, 70, 0.22]].forEach(([d, f, l]) => {
    const t = ac.currentTime + d, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.25);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(l, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(kit.out); o.start(t); o.stop(t + 0.4);
    track(t + 0.45, o);
  });
}
// Each vent hisses in turn: a short, bright breath of noise.
function ventSounds() {
  const ac = kit.live();
  if (!ac) return;
  VENTS.forEach((_, k) => [-1, 1].forEach(sd => {
    const t = ac.currentTime + 0.11 * k + (sd > 0 ? 0 : 0.05), n = hiss(ac, t, 1.4, 1.2);
    const bpf = filt(ac, 'bandpass', 2600 + 1400 * Math.random(), 0.9), g = ac.createGain(), pn = ac.createStereoPanner();
    pn.pan.value = 0.5 * sd;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.025, t + 0.02); g.gain.setTargetAtTime(0.0001, t + 0.15, 0.35);
    n.connect(bpf).connect(g).connect(pn).connect(kit.out);
    track(t + 1.5, n);
  }));
}
