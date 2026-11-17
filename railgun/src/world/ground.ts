// Load order: sky/dome runs first.
import '../sky/dome.ts';
import * as THREE from 'three';
import { linFit } from '../../../shared/stim.js';
import { state } from '../state.ts';
import { scene } from '../setup.ts';
import { U } from './uniforms.ts';
import { HEAD } from '../sky/atmosphere.ts';
import { AIR } from '../sky/air.ts';
// Low swells on the plain: a few metres, kilometres long, flat round the mount.
import TERRAIN from './terrain.glsl';

/* ---------- the planet: one curve for every view ---------- */
// A small world, about Earth's size: the ground drops away d² / 2R from any eye.
// The image moves; shading keeps the flat world's positions.
export const PLANET_R = 6.0e6;
export const CURVE = /* glsl */`vec3 curved(vec3 p) { vec2 d = p.xz - cameraPosition.xz; p.y -= dot(d, d) / ${(2 * 6.0e6).toFixed(1)}; return p; }`;

/* ---------- ground: a dusty plain with low relief ---------- */
export const GROUND_C = linFit(0.52, 0.035, 65);
// The plain reaches out to the ranges' feet: 240 km across.
// The grid packs its vertices round the eye: about 3 m apart there.
// The spacing grows outward to about 3 km at the rim.
// So the near waves displace, and the vertex count stays the same.
export function groundGeo(cx: number, cz: number) {
  const N = 480, K = 7.07, A = 120000 / (Math.exp(K) - 1);
  const f = (u: number) => Math.sign(u) * A * (Math.exp(K * Math.abs(u)) - 1);
  const g = new THREE.PlaneGeometry(2, 2, N, N).rotateX(-Math.PI / 2);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) P.setXYZ(i, cx + f(P.getX(i)), 0, cz + f(P.getZ(i)));
  g.computeBoundingSphere();
  return g;
}
// The wide eye and the portrait eye each get their own grid.
state.groundTall = null;
export const ground = new THREE.Mesh(groundGeo(1670, 1990), new THREE.ShaderMaterial({
  uniforms: { ...U, uGroundC: { value: new THREE.Vector3(...GROUND_C) } },
  vertexShader: /* glsl */`varying vec3 vP; ${TERRAIN} ${CURVE}
  void main() { vP = (modelMatrix * vec4(position, 1.0)).xyz; vP.y += terrH(vP.xz); gl_Position = projectionMatrix * viewMatrix * vec4(curved(vP), 1.0); }`,
  fragmentShader: /* glsl */`
  varying vec3 vP;
  uniform vec3 uGroundC;
  uniform vec4 uShocks[5];
  uniform float uRage;
  uniform float uTime;
  uniform vec2 uGLift;
  ${HEAD}
  ${AIR}
  ${TERRAIN}
  // Dunes: long rounded crests across the wind, bent by low noise.
  const vec2 WIND = vec2(0.8, 0.6);
  const vec2 WIND2 = vec2(-0.5, 0.86);
  const float F1 = 0.011, F2 = 0.0052;
  // g holds each set's gain; a set fades once a pixel spans its wave.
  float dune(vec2 p, vec2 g) {
    float w = k2fbm(p * 0.00028);
    float c = 0.5 + 0.5 * sin(dot(p, WIND) * F1 + 3.2 * w);
    // Crest height wanders with the warp, so the rows do not repeat.
    float h = 0.5 + (c * c * (3.0 - 2.0 * c) - 0.5) * g.x * (0.45 + 0.8 * w);
    // A second, longer set crosses the first.
    float c2 = 0.5 + 0.5 * sin(dot(p, WIND2) * F2 + 2.4 * k2fbm(p * 0.0005 + 3.1));
    return h + 0.35 * (0.5 + (c2 - 0.5) * g.y);
  }
  // Gaussian gain of a wave of frequency f over the pixel footprint.
  // The footprint runs along the wave, so grazing pixels filter hard.
  float band(vec2 dx, vec2 dy, vec2 dir, float f) {
    float w = 1.6 * f * length(vec2(dot(dx, dir), dot(dy, dir)));
    return exp(-0.5 * w * w);
  }
  void main() {
    // The relief fades with distance, so far dunes never shimmer.
    float dist = length(vP - cameraPosition);
    float fade = smoothstep(14000.0, 900.0, dist);
    vec2 dx = dFdx(vP.xz), dy = dFdy(vP.xz);
    vec2 g = vec2(band(dx, dy, WIND, F1), band(dx, dy, WIND2, F2));
    float e = 6.0, h0 = dune(vP.xz, g);
    float A = 14.0 * fade;
    vec3 N = normalize(vec3(-(dune(vP.xz + vec2(e, 0.0), g) - h0) / e * A, 1.0, -(dune(vP.xz + vec2(0.0, e), g) - h0) / e * A));
    // The swells tilt the plain: their slope joins the dunes' normal.
    // A short step near the eye resolves the gentle waves; far out it is long.
    float ts = mix(6.0, 40.0, smoothstep(1500.0, 4000.0, dist)), t0 = terrH(vP.xz);
    N = normalize(N + vec3(-(terrH(vP.xz + vec2(ts, 0.0)) - t0) / ts, 0.0, -(terrH(vP.xz + vec2(0.0, ts)) - t0) / ts));
    // Hummocks: soft wind-blown mounds a few metres across, as a bump only.
    // They fade out before a pixel spans one.
    float hk = smoothstep(1200.0, 150.0, dist) * band(dx, dy, normalize(vec2(1.0, 0.3)), 0.035);
    if (hk > 0.01) {
      vec2 hp = vP.xz * 0.035;
      float h00 = k2noise(hp), hx = k2noise(hp + vec2(0.035, 0.0)), hz = k2noise(hp + vec2(0.0, 0.035));
      N = normalize(N + vec3(-(hx - h00), 0.0, -(hz - h00)) * 0.6 * hk);
    }
    // Fine wind ripples near the eye, filtered like the dunes.
    float near = smoothstep(1600.0, 200.0, dist) * band(dx, dy, WIND, 0.38);
    float rp = cos(dot(vP.xz, WIND) * 0.38 + 5.0 * k2noise(vP.xz * 0.012)) * 0.05 * near;
    N = normalize(N + vec3(WIND.x, 0.0, WIND.y) * rp);
    // Clean sand: crests a touch lighter, troughs a touch deeper.
    float tone = 0.94 + 0.12 * k2fbm(vP.xz * 0.0002);
    vec3 alb = uGroundC * tone * mix(0.8, 1.1, clamp(h0 / 1.35, 0.0, 1.0)) * (1.0 - 0.28 * nightK());
    // The ground round the mount is scorched: a shade darker.
    alb *= 1.0 - 0.25 * smoothstep(560.0, 240.0, length(vP.xz - vec2(0.0, 90.0)));
    // A flat plain takes little light at four degrees; lift it.
    float nl = clamp(dot(N, uSun) * uGLift.x + uGLift.y, 0.0, 1.2);
    // Wrap light: the terminator rolls softly over each crest.
    float nw = clamp((dot(N, uSun) * uGLift.x + uGLift.y + 0.35) / 1.35, 0.0, 1.2);
    nl = mix(nl, nw, 0.6 * fade);
    float sv = sunVis(vP) * smokeShade(vP);
    // At night the rock only warms the plain; it does not flood it.
    vec3 col = alb * (ambient(N) + uSunC * nl * sv + keyLight(N) + arcLight(vP, N));
    // The lee slopes take a cool bounce from the sky, so shade reads as colour.
    col += alb * mix(uZenC, uHorC, 0.35) * 0.3 * (1.0 - smoothstep(0.0, 0.6, nw)) * fade * (1.0 - nightK());
    // A landed piece leaves an ember pool: a hot core and a warm spill.
    for (int i = 0; i < 4; i++) {
      if (uPool[i].z < 0.002) continue;
      vec2 pd = vP.xz - uPool[i].xy;
      float d2 = dot(pd, pd), rr = uPool[i].w;
      col += alb * vec3(1.0, 0.45, 0.16) * uPool[i].z * 1.5 * exp(-d2 / (rr * rr));
      col += vec3(1.0, 0.32, 0.08) * uPool[i].z * 0.9 * exp(-d2 / (rr * rr * 0.04));
    }
    // The bolt lights the plain faintly as it climbs away.
    if (uBolt.w > 0.001) { vec3 bb = uBolt.xyz - vP; col += alb * uBoltC * uBolt.w * 0.5 * 2.5e7 / (dot(bb, bb) + 2.5e7); }
    // The blast lights the plain once its light arrives.
    // By day only: at night the plain stays dark under the blast.
    col += alb * blastLight(vP) * (0.35 + 0.65 * max(dot(N, normalize(uBlast.xyz - vP)), 0.0)) * (1.0 - nightK());
    // A satin sheen: Fresnel at grazing angles, a soft lobe toward the sun.
    vec3 V = normalize(cameraPosition - vP);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 5.0);
    float lobe = pow(max(dot(reflect(-uSun, N), V), 0.0), 10.0);
    col += uSunC * (0.22 * lobe + 0.12 * fres) * sv * fade + ambient(N) * 0.15 * fres;
    // Crests facing the sky glow with it at grazing angles: a soft fresnel rim.
    // Slopes that turn from the eye catch more of it, so the crests outline.
    float fr2 = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    col += mix(uHorC, uSunC, 0.4) * 0.12 * fr2 * fade * (1.0 - 0.7 * nightK());
    // The plain trembles in rings round the mount at rage.
    float r0 = length(vP.xz);
    col *= 1.0 + 0.14 * uRage * sin(r0 * 0.045 - uTime * 9.0) * exp(-r0 / 900.0);
    // The Mach rings: one per round, a thin bright front, dark air behind.
    for (int i = 0; i < 5; i++) {
      vec4 S = uShocks[i];
      if (S.w <= 0.0) continue;
      float r = length(vP.xz - S.xy);
      float sw = 6.0 + 0.07 * S.z;
      float shock = exp(-(r - S.z) * (r - S.z) / (2.0 * sw * sw));
      float inside = smoothstep(S.z, S.z - sw * 3.0, r);
      // Dust stands up in the front and catches the sun.
      // The air behind it is swept clean.
      col *= 1.0 - min(0.6, 0.3 * S.w) * inside * (1.0 - shock);
      // Sand ripples trail the front and settle.
      float behind = max(S.z - r, 0.0);
      col *= 1.0 + 0.1 * min(S.w, 1.0) * sin(behind * 0.07) * exp(-behind / 400.0) * inside;
      col += (ambient(N) + sunLight(vec3(0.0, 0.3, 0.0)) * 0.5) * uGroundC * 2.4 * shock * S.w;
    }
    // Far plain goes blue and flat in the air.
    // The plain's own low dust, then the same air as the ranges and the clouds.
    gl_FragColor = vec4(aerial(k2haze(col, vP), vP), 1.0);
  }`,
}));
scene.add(ground);
