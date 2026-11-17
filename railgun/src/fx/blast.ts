// @ts-nocheck
// Load order: rock/shards runs first.
import '../rock/shards.ts';
import * as THREE from 'three';
import { linFit } from '../../../shared/stim.js';
import { EMBER, WHITE } from '../rock/asteroid.ts';
import { ASH_D, PU } from '../rock/trail.ts';
import { makeVol } from './volfx.ts';

/* ---------- the blast: a fireball, two shells, a soot cloud ---------- */
// The fireball grows from R to about 6R in four seconds.
// It cools white, orange, red, then hangs as soot for twenty.
// uFb: age, rock radius, power, seed.
export const fireball = makeVol(/* glsl */`
uniform vec3 uBP, uHotC, uFireC, uEmberC, uSootC, uAshC;
uniform vec4 uFb;
// It swells to twelve radii over about twelve seconds.
float rb() { return uFb.y * (1.0 + 11.0 * (1.0 - exp(-uFb.x / 4.5))); }
// The fire sphere blows out to eight radii, most of it in two seconds.
// The negative phase then pulls it in by a fifth; it eases back a little.
float rf() {
  float a = uFb.x, pull = smoothstep(2.0, 5.5, a) - 0.35 * smoothstep(7.0, 12.0, a);
  return uFb.y * (1.0 + 7.0 * (1.0 - exp(-a / 1.1))) * (1.0 - 0.45 * pull);
}
// The fire's heat: a flash, then a strong glow for 8 s, then a faint tail.
float fireEnv(float a) { return 0.8 * exp(-a / 0.6) + 0.9 * exp(-a / 8.0) + 0.12 * exp(-a / 40.0); }
// Blackbody cooling: white, yellow, orange, deep red.
vec3 bbody(float T) {
  vec3 c = uEmberC;
  c = mix(c, uFireC * 2.0, smoothstep(0.1, 0.4, T));
  c = mix(c, uFireC * 1.4 + uHotC * 1.6, smoothstep(0.4, 0.75, T));
  return mix(c, uHotC * 4.0, smoothstep(0.8, 1.2, T));
}
float dens(vec3 p, out vec3 em) {
  em = vec3(0.0);
  float age = uFb.x, Rb = rb(), Rf = rf();
  // The fire: a sphere that blows outward from the hit, then cools.
  vec3 qf = p - uBP;
  // The negative phase does not shrink evenly: lobes collapse and bulge as it pulls in.
  float pk = smoothstep(1.6, 3.2, age) * (1.0 - smoothstep(7.0, 11.0, age));
  vec3 nd = qf / max(length(qf), 1.0);
  float lobe = texture(uVol, nd * 0.55 + vec3(uFb.w, 0.12 * age, 0.31)).r - 0.5 + 0.6 * (texture(uVol, nd * 1.3 + vec3(0.2 * age, uFb.w, 0.7)).g - 0.5);
  // Big heads bulge out of the ball from the first moment.
  float head = texture(uVol, nd * 0.8 + vec3(0.41, uFb.w, 0.05 * age)).b - 0.45;
  float eb = 0.35 * smoothstep(0.0, 0.8, age) * (1.0 - 0.5 * smoothstep(6.0, 12.0, age));
  float rs = length(qf) / (Rf * (1.0 + pk * 0.45 * lobe + eb * head)), fd = 0.0, vd = 0.0;
  if (rs < 1.15 && age < 20.0) {
    float cool = smoothstep(1.5, 12.0, age);
    // The noise scales with the ball, so every cell runs outward with it.
    vec3 u = qf / Rf;
    float fn = 0.6 * texture(uVol, u * 0.9 + vec3(uFb.w, 0.0, age * 0.03)).r + 0.4 * texture(uVol, u * 2.3 + vec3(0.0, uFb.w, age * 0.05)).g;
    // A round front with a turbulent skin.
    // Billows push the edge in and out.
    float ball = smoothstep(1.0, 0.8, rs + (0.6 - fn) * 0.45);
    // The shock heats the outer shell for the first second only.
    float front = smoothstep(0.55, 0.95, rs) * exp(-age / 0.7);
    // Later the core stays hot and the skin cools.
    // That gives the ball a limb.
    float core = mix(1.0, mix(1.25, 0.6, smoothstep(0.35, 1.0, rs)), smoothstep(0.4, 1.6, age));
    // As it cools, holes open and the fire breaks into pockets.
    float hold = smoothstep(0.3, 0.55, fn + 0.45 * (1.0 - cool) - 0.15 * cool);
    float fire = ball * hold * (1.0 - smoothstep(9.0, 20.0, age));
    // Hot knots and cool cells: the ball is never one flat colour.
    // Broad cells set the knots: the ball boils in lobes, not grain.
    float kn = texture(uVol, u * 0.42 + vec3(0.5, uFb.w, age * 0.02)).b;
    float knot = smoothstep(0.36, 0.7, 0.65 * kn + 0.35 * fn);
    // The knots come in after 1 s and ease after 4 s.
    float kk = smoothstep(0.6, 1.8, age) * (1.0 - 0.6 * smoothstep(4.0, 7.0, age));
    float T = fireEnv(age) * (0.6 + 0.8 * front) * core * mix(0.25 + 1.3 * fn * fn, 0.1 + 2.1 * knot * knot, kk);
    // Cool fire is dim fire, not pink fire.
    // The glow dips from 1 to 6 s.
    // The hot knots then stay under the clip.
    float dip = 1.0 - 0.45 * smoothstep(0.8, 2.2, age) * (1.0 - smoothstep(3.5, 6.0, age));
    em = bbody(T) * fire * min(1.0, T * 2.5) * 5.0 * dip / Rf * uFb.z;
    // The fire clears the outer soot; the veins are its own.
    fd = fire * (1.0 - smoothstep(2.0, 9.0, age)) * max(knot, smoothstep(0.35, 0.6, fn));
    // Dark soot veins fill the cool cells between the knots.
    // The fire lights them from inside, so they read brown, not black.
    float vein = ball * (1.0 - knot) * smoothstep(0.25, 1.4, age) * (1.0 - smoothstep(3.0, 5.5, age));
    vd = vein * (0.6 + 0.9 * smoothstep(0.5, 1.0, rs)) * 3.2 / Rf;
  }
  // The cloud rises slowly as it cools.
  vec3 q = p - uBP - vec3(0.0, 25.0 * age, 0.0);
  // The aging cloud spreads sideways and sags.
  float old = smoothstep(2.0, 18.0, age);
  // The wind shears the top over; the cloud spreads sideways as it ages.
  q.x -= q.y * 0.3 * old;
  float r = length(q * vec3(1.0 / (1.0 + 0.25 * old), 1.0 + 0.3 * old, 1.0)) / Rb;
  if (r > 1.45) return vd;
  // Big lobes swell and sink round the ball, slowly changing.
  float lob = texture(uVol, normalize(q) * 0.33 + vec3(uFb.w, age * 0.008, 0.0)).r;
  r *= 1.0 + 0.6 * (0.55 - lob) * (0.5 + 0.5 * smoothstep(0.5, 6.0, age));
  if (r > 1.3) return vd;
  vec3 w = q / Rb + vec3(uFb.w, -age * 0.02, 0.0);
  // A slow curl warp turns the ball into torn billows.
  w += (texture(uVol, w * 0.6 + vec3(age * 0.006)).rgb - 0.5) * (0.25 + 0.4 * old);
  // Three octaves of billows push the surface in and out.
  // Large billows first: the octaves sit at a broad scale, so the ball rolls, not grains.
  // Worley cells round each billow off, like a heap's turrets.
  float n = 0.6 * texture(uVol, w * 0.26).b + 0.28 * texture(uVol, w * 0.6).b + 0.12 * texture(uVol, w * 1.4).r;
  // The Worley cells run lower than the old billows: the mid point moves down.
  float shape = smoothstep(0.95, 0.75, r + (0.48 - n) * (1.5 + 0.7 * old)) * smoothstep(1.3, 1.15, r);
  // Fine cells carve small lobes into each billow.
  float d = clamp(shape * (0.55 + 0.6 * texture(uVol, w * 2.6).g) - 0.12, 0.0, 1.0) * 1.4;
  // The fire clears its own soot for the first seconds.
  d *= 1.0 - 0.85 * fd;
  // The soot skin starts thin and thickens as the fire dies.
  d *= mix(0.4, 1.0, smoothstep(0.5, 7.0, age));
  // The soot erodes from the rim and its thin parts, gone by 90 s.
  float er = smoothstep(10.0, 70.0, age);
  // Large cells tear it into tufts, not grain.
  float e = 0.7 * texture(uVol, w * 0.5 + vec3(age * 0.008)).b + 0.3 * texture(uVol, w * 1.2).g;
  d = clamp((d - er * (0.1 + 0.8 * e + 0.35 * r)) / max(1.0 - 0.75 * er, 0.12), 0.0, 1.0);
  // It thins as it grows, so the sky shows through.
  // A denser core: the soot is thickest at the heart of the ball.
  return vd + d * 2.6 / Rb * (1.0 + 0.9 * (1.0 - smoothstep(0.0, 0.85, r))) * (1.0 - 0.5 * smoothstep(3.0, 16.0, age)) * (1.0 - smoothstep(65.0, 90.0, age));
}
// Soot turns to pale ash as it cools, like the comet trail.
// Soot as light as the clouds' shade: the sun then models its billows.
vec3 alb(vec3 p) { return 2.0 * mix(uSootC, uAshC, smoothstep(2.0, 12.0, uFb.x)); }
// The fire's core and the falling pieces light the smoke from inside.
vec3 vlight(vec3 p) {
  vec3 b = p - uBP;
  float R0 = rf() * 0.9, k = uFb.z * (1.2 * exp(-uFb.x / 1.5) + fireEnv(uFb.x)) * (1.0 - smoothstep(65.0, 90.0, uFb.x));
  // Soot between the core and p swallows the fire's light.
  // The outer billows then take the sun, not the fire.
  float rr = length(b) / rb();
  vec3 L = uAstC * k * R0 * R0 / (dot(b, b) + R0 * R0) * mix(1.0, exp(-2.2 * smoothstep(0.25, 1.0, rr)), smoothstep(1.0, 4.0, uFb.x));
  // Deep inside, the sky's light is shut out: a cheap occlusion.
  // VOLFX adds the sky light; this takes part of it back.
  L -= mix(uHorC, uZenC, 0.5) * 0.3 * 0.7 * (1.0 - smoothstep(0.15, 0.8, rr));
  // At night the moon lights the soot faintly and silvers its far edge.
  vec3 nb = normalize(b);
  float edge = pow(1.0 - abs(dot(nb, normalize(cameraPosition - uBP))), 2.0);
  L += uSunC * uStars * (0.3 + 0.6 * max(dot(nb, uSun), 0.0) + 0.9 * edge);
  // The lit horizon warms the underside, as it does the low clouds.
  L += uHorC * 0.5 * smoothstep(0.2, -0.7, nb.y) * (1.0 - 0.7 * uStars);
  for (int i = 0; i < 4; i++) {
    if (uDebL[i].w <= 0.0) continue;
    vec3 d = p - uDebL[i].xyz;
    float s = uDebL[i].w * 6.0;
    L += uAstC * 0.8 * s * s / (dot(d, d) + s * s);
  }
  return L;
}`, {
  uBP: { value: new THREE.Vector3() }, uFb: { value: new THREE.Vector4() },
  uHotC: { value: new THREE.Vector3(...WHITE) }, uFireC: { value: PU.uFireC.value }, uEmberC: { value: new THREE.Vector3(...EMBER) },
  // Dark mid-grey, not black: black smoke shows no light and shadow, so it reads flat.
  uSootC: { value: new THREE.Vector3(...linFit(0.5, 0.012, 50)) }, uAshC: { value: new THREE.Vector3(...ASH_D) },
});
// The fireball is far out: clouds and mesas stand in front of it, so it keeps the depth test.
fireball.material.depthTest = true;
// The fire's pull-in, 0 to 1, as the fireball shader has it.
export const pullOf = a => THREE.MathUtils.smoothstep(a, 2.0, 5.5) - 0.35 * THREE.MathUtils.smoothstep(a, 7.0, 12.0);
