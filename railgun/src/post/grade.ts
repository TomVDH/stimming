// Load order: post/bloom runs first.
import './bloom.ts';
import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { linFit } from '../../../shared/stim.js';
import { FLARE } from '../../../shared/flare.js';

/* ---------- K2: grade ---------- */
// Linear grade before tone mapping: fringe, split tone, vignette, grain, letterbox.
// The grade's base look: shadow tint, vignette and grain.
export interface GradeLook { tint: [number, number, number]; vig: number; vigIn: number; grain: number }
export function makeGrade({ tint, vig, vigIn, grain }: GradeLook) {
  return new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uRes: { value: new THREE.Vector2(1, 1) },
      uTint: { value: new THREE.Vector3(...tint) },
      uVig: { value: vig },
      uVigIn: { value: vigIn },
      uGrain: { value: grain },
      uSeed: { value: 0 },
      uRage: { value: 0 },
      uFlash: { value: 0 },
      // The impact flare: screen place of the hit, and its strength.
      uLF: { value: new THREE.Vector3(0.5, 0.5, 0) },
      // The focus pull: 0 sharp, 1 soft.
      uSoft: { value: 0 },
      // Contrast power and saturation, from the settings.
      uCon: { value: 0.24 }, uSat: { value: 1.06 }, uBri: { value: 0.78 },
      // The reset: overexposure under the white fill, and an image scale.
      uVeil: { value: 0 }, uZoom: { value: 1 },
      // The muzzle flash's streak: screen place and strength.
      uLF2: { value: new THREE.Vector3(0.5, 0.5, 0) },
      // The streak's colour: blue-white for the shot, fire for the falling rock.
      uLF2C: { value: new THREE.Vector3(0.75, 0.86, 1.0) },
      // The nearing rock's own flare: screen place and strength.
      uLF3: { value: new THREE.Vector3(0.5, 0.5, 0) },
      // The flares' ghost gain: 0 keeps a flare one level streak.
      uGhost: { value: 1 },
      // Light shafts from the blast: its place on screen, strength, sky fill.
      uGod: { value: new THREE.Vector4(0.5, 0.5, 0, 0) }, uGodC: { value: new THREE.Vector3(...linFit(0.9, 0.11, 70)) },
      uBox: { value: 0 },
      // Villeneuve: on or off, exposure, key hue, pull, black floor.
      uVil: { value: 0 }, uExp: { value: 1 }, uKey: { value: new THREE.Vector3(1, 1, 1) }, uPull: { value: 0.55 }, uLift: { value: 0.5 },
      // The grain's cell, in device pixels.
      uGrainPx: { value: 1 },
      // Shock refraction: screen centre, radius and strength, two fronts.
      uShk0: { value: new THREE.Vector4() }, uShk1: { value: new THREE.Vector4() },
      // Heat shimmer: the barrel's ends on screen, then width, strength, clock.
      uHzA: { value: new THREE.Vector4() }, uHzK: { value: new THREE.Vector3() }, uHtA: { value: new THREE.Vector4() },
    },
    vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec2 uRes;
    uniform vec3 uTint;
    uniform float uVig, uVigIn, uGrain, uBox, uSeed, uRage, uFlash;
    uniform vec3 uLF, uLF2, uLF2C, uLF3, uGodC;
    uniform float uGhost;
    uniform vec4 uGod;
    uniform float uSoft, uCon, uSat, uBri;
    uniform float uVeil, uZoom;
    uniform float uVil, uExp, uPull, uLift, uGrainPx;
    uniform vec3 uKey;
    uniform vec4 uShk0, uShk1, uHzA, uHtA;
    uniform vec3 uHzK;
    varying vec2 vUv;
    ${FLARE}
    // A shock front bends light outward at its rim.
    vec2 shk(vec2 q, vec4 s) {
      if (s.w < 0.001) return vec2(0.0);
      vec2 d = q - s.xy;
      float r = max(length(d), 1e-4), w = 0.06 * s.z + 0.003, x = (r - s.z) / w;
      return d / r * s.w * x * exp(-x * x);
    }
    float vn(vec2 p) {
      vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
      float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5);
      float b = fract(sin(dot(i + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5);
      float c = fract(sin(dot(i + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5);
      float e = fract(sin(dot(i + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5);
      return mix(mix(a, b, u.x), mix(c, e, u.x), u.y);
    }
    float h(vec2 p) {
      uvec2 q = uvec2(p);
      uint n = (q.x * 1597334677u) ^ (q.y * 3812015801u);
      n *= 1597334677u; n ^= n >> 16; n *= 2246822519u; n ^= n >> 13;
      return float(n) / 4294967295.0;
    }
    // Grain: one hash per cell; large cells blend to soft clumps.
    float gr(vec2 p) {
      if (uGrainPx < 1.01) return h(p);
      p /= uGrainPx;
      vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
      float n = mix(mix(h(i), h(i + vec2(1.0, 0.0)), u.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), u.x), u.y);
      // The blend lowers the contrast; the gain restores it.
      return 0.5 + (n - 0.5) * 1.6;
    }
    // The Villeneuve print curve: a short toe and a long, soft shoulder.
    vec3 vilCurve(vec3 x) { return (x * (0.15 * x + 0.05) + 0.004) / (x * (0.15 * x + 0.5) + 0.06) - 0.0667; }
    vec3 vilTone(vec3 c) {
      const vec3 LW = vec3(0.2126, 0.7152, 0.0722);
      vec3 x = max(c, 0.0) * uExp * 2.8;
      float lx = max(dot(x, LW), 1e-5);
      // A little contrast round mid grey keeps the cloud bands apart.
      x *= pow(lx / 0.28, 0.2);
      lx = max(dot(x, LW), 1e-5);
      // Half by channel, half by luminance: highs wash out, the hue holds.
      vec3 t = clamp(mix(vilCurve(x), x * (vilCurve(vec3(lx)).x / lx), 0.5) / 0.7251, 0.0, 1.0);
      float lt = dot(t, LW);
      // One hue: colour falls toward the key; the highs go to cream.
      t = mix(t, lt * mix(uKey, vec3(1.0), 0.7 * smoothstep(0.5, 1.0, lt)), uPull);
      // Milky blacks under a cream white: the print reaches neither end.
      vec3 lo = 0.012 * uLift * mix(vec3(1.0), uKey, 0.5), hi = 0.96 * mix(vec3(1.0), uKey, 0.06);
      return lo + (hi - lo) * clamp(t, 0.0, 1.0);
    }
    // Distance from p to the segment ab.
    float sgm(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }
    void main() {
      // Shock fronts and hot air bend the frame.
      vec2 asp = vec2(uRes.x / uRes.y, 1.0), q0 = (vUv - 0.5) * asp;
      vec2 dq = shk(q0, uShk0) + shk(q0, uShk1);
      if (uHzK.y > 0.001) {
        // Shimmer rises off the barrel, strongest just above it.
        vec2 a = (uHzA.xy - 0.5) * asp, b = (uHzA.zw - 0.5) * asp, ab = b - a;
        float t = clamp(dot(q0 - a, ab) / dot(ab, ab), 0.0, 1.0);
        vec2 o = q0 - (a + ab * t);
        float m = exp(-pow(o.x / uHzK.x, 2.0)) * smoothstep(-0.3 * uHzK.x, 0.2 * uHzK.x, o.y) * exp(-max(o.y, 0.0) / (3.0 * uHzK.x));
        vec2 np = q0 * 90.0 + vec2(0.0, -uHzK.z * 3.0);
        dq += (vec2(vn(np), vn(np + 17.0)) - 0.5) * uHzK.y * m;
      }
      if (uHtA.w > 0.0001) {
        // Hot air rises off the fireball in a column and wavers.
        vec2 o = q0 - uHtA.xy;
        float r = uHtA.z, m = exp(-pow(o.x / (r * (1.0 + 0.4 * max(o.y, 0.0) / r)), 2.0)) * smoothstep(-0.6 * r, 0.4 * r, o.y) * exp(-max(o.y, 0.0) / (2.5 * r));
        vec2 np = o / r * 7.0 + vec2(0.0, -uHzK.z * 1.6);
        dq += (vec2(vn(np), vn(np + 23.0)) - 0.5) * uHtA.w * m;
      }
      // The reset punches the image in, then springs it back.
      vec2 uv = 0.5 + (vUv - 0.5) / uZoom + dq / asp;
      // The exposure flickers at rage; there is no colour fringe.
      vec3 c0 = texture2D(tDiffuse, uv).rgb;
      // After the white fill the frame comes back overexposed and settles.
      c0 *= 1.0 + 3.0 * uVeil;
      // The lens hunts focus for a moment after the hit.
      if (uSoft > 0.002) {
        vec2 px = uSoft * 3.5 / uRes;
        vec3 b = vec3(0.0);
        for (int k = 0; k < 8; k++) { float a = float(k) * 0.785398; b += texture2D(tDiffuse, uv + vec2(cos(a), sin(a)) * px).rgb; }
        c0 = mix(c0, b / 8.0, min(uSoft, 1.0));
      }
      if (uGod.z > 0.002) {
        // Shafts from the blast's core: only its hottest pixels feed them.
        // Cloud and smoke in front block the samples and cut dark shafts.
        // 56 taps, each pixel starting at its own offset, so the rays never band.
        vec2 dl = (uGod.xy - uv) / 56.0, sp = uv + dl * h(gl_FragCoord.xy + uSeed);
        float acc = 0.0, sky = 0.0, wt = 1.0;
        for (int k = 0; k < 56; k++) {
          sp += dl;
          float lum = dot(texture2D(tDiffuse, sp).rgb, vec3(0.3, 0.59, 0.11));
          // The core feeds the hot rays.
          acc += max(lum - 3.0, 0.0) * wt;
          // The lit sky round it feeds faint rays; far clouds block them and cast shadow shafts.
          vec2 dc = (sp - uGod.xy) * asp;
          // Only sky far brighter than dusk feeds them; the plain sky does not.
          sky += smoothstep(0.9, 2.5, lum) * exp(-dot(dc, dc) / 0.12) * wt;
          wt *= 0.982;
        }
        // Dark near shapes stay dark: the gun stands in front of the rays.
        float own = smoothstep(0.03, 0.4, dot(c0, vec3(0.3, 0.59, 0.11)));
        c0 += uGodC * (acc / 56.0 + 0.35 * sky / 56.0) * uGod.z * mix(0.25, 1.0, own);
        // The whole sky fills a little with the flash.
        c0 += uGodC * 0.05 * uGod.w * own;
      }
      vec3 c = c0 * (1.0 + 0.1 * uRage + uFlash) + uTint;
      // The muzzle flash: a long level blue-white streak.
      if (uLF2.z > 0.001) c += flFlare(vUv, uLF2.xy, uRes.x / uRes.y, uLF2C, 0.8, vec3(0.3, 1.8, 0.5 * uGhost)) * uLF2.z;
      // The nearing rock: a fiery glow and a soft level streak.
      if (uLF3.z > 0.001) c += flFlare(vUv, uLF3.xy, uRes.x / uRes.y, flWarm(vec3(1.0, 0.5, 0.18), 0.6), 1.1, vec3(1.2, 0.9, 0.6 * uGhost)) * uLF3.z;
      // The impact flare: a wide orange glow like the fireball, a softer streak.
      if (uLF.z > 0.001) c += flFlare(vUv, uLF.xy, uRes.x / uRes.y, flWarm(vec3(1.0, 0.62, 0.3), 0.7), 1.25, vec3(1.7, 0.7, 0.9 * uGhost)) * uLF.z;
      float l0 = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c *= mix(vec3(0.9, 0.97, 1.12), vec3(1.1, 1.0, 0.88), smoothstep(0.0, 0.5, sqrt(max(l0, 0.0))));
      // Contrast: shadows sink and highs lift round a mid grey.
      float lc = max(dot(c, vec3(0.2126, 0.7152, 0.0722)), 1e-5);
      c *= pow(lc / 0.18, uCon);
      lc = dot(c, vec3(0.2126, 0.7152, 0.0722));
      // A restrained palette: colour pulled back, shadows cool, highs warm.
      c = max(mix(vec3(lc), c, uSat), 0.0) * uBri;
      c *= mix(vec3(0.94, 0.98, 1.06), vec3(1.04, 1.0, 0.95), smoothstep(0.02, 0.6, lc));
      // A soft matte floor: the deepest blacks lift a touch.
      c += vec3(0.004, 0.0045, 0.006) * (1.0 - smoothstep(0.0, 0.05, lc));
      vec2 q = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
      c *= 1.0 - uVig * smoothstep(uVigIn, 1.1, length(q));
      // Villeneuve maps the tones here; the output pass then maps none.
      if (uVil > 0.5) c = vilTone(c);
      float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
      vec2 gp = gl_FragCoord.xy + vec2(uSeed * 37.0, uSeed * 91.0);
      c *= 1.0 + (gr(gp) - 0.5) * uGrain * (1.2 - 0.6 * smoothstep(0.0, 0.3, lum)) * 2.0;
      float bar = max(0.0, 0.5 - 0.5 * (uRes.x / uRes.y) / 2.39);
      if (uBox > 0.5 && (vUv.y < bar || vUv.y > 1.0 - bar)) c = vec3(0.0);
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }`,
  });
}
/* ---------- end K2 ---------- */
