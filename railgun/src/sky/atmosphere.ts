// Load order: sky/sun runs first.
import './sun.ts';

/* ---------- K2: noise ---------- */
// Lifted from Marsh launch, which lifted it from Fireworks.
const K2_NOISE = /* glsl */`
float k2hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float k2noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(k2hash(i), k2hash(i + vec2(1, 0)), u.x), mix(k2hash(i + vec2(0, 1)), k2hash(i + vec2(1, 1)), u.x), u.y);
}
float k2fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * k2noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
  return s;
}
// Three-dimensional value noise for rock.
float k3hash(vec3 p) { p = fract(p * vec3(123.34, 456.21, 789.12)); p += dot(p, p.yzx + 45.32); return fract((p.x + p.y) * p.z); }
float k3noise(vec3 p) {
  vec3 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(k3hash(i), k3hash(i + vec3(1, 0, 0)), u.x), mix(k3hash(i + vec3(0, 1, 0)), k3hash(i + vec3(1, 1, 0)), u.x), u.y);
  float b = mix(mix(k3hash(i + vec3(0, 0, 1)), k3hash(i + vec3(1, 0, 1)), u.x), mix(k3hash(i + vec3(0, 1, 1)), k3hash(i + vec3(1, 1, 1)), u.x), u.y);
  return mix(a, b, u.z);
}
float k3fbm(vec3 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { s += a * k3noise(p); p = p * 2.07 + vec3(11.3, 7.1, 5.9); a *= 0.5; }
  return s;
}`;
/* ---------- end K2 ---------- */

/* ---------- K2: sky ---------- */
// A day sky replaces the night one.
// Zenith, horizon, dust band, the sun.
// Long cirrus streaks hang across it.
// New: the rock, the bolt and the hit light the air.
const K2_SKY = /* glsl */`
uniform vec3 uSunC, uZenC, uHorC;
// The shared air's knobs: Rayleigh, dust amount, dust height in metres, sun glow.
uniform vec4 uAirK;
uniform float uSunE;
uniform vec3 uSunD, uGlowC, uMoonD, uCloudSun, uCloudAmb;
uniform float uMoonK, uStars, uStarT, uTrailK;
uniform mat3 uSkyRot, uSkyRot0;
uniform vec3 uWisp;
uniform vec4 uAst;
uniform float uAstR;
uniform vec3 uAstC;
uniform float uFill;
uniform vec4 uRockL;
uniform float uRockR;
uniform vec4 uBolt;
uniform vec3 uBoltC;
// The bolt's light as a cloud scatters it: warm white, not the plasma's blue.
// Cloud drops spread every colour alike; the bolt's hue lives in its core.
vec3 cloudBoltC() { return vec3(dot(uBoltC, vec3(0.3, 0.5, 0.2))) * vec3(1.08, 0.97, 0.86); }
uniform vec4 uHit;
uniform vec4 uVoid;
uniform float uVoidK, uVoidT;
uniform vec2 uVoidD;
// How far inside the void a world point sits: 1 deep in, 0 outside.
float voidIn(vec3 P) { return uVoidK * (1.0 - smoothstep(0.88 * uVoid.w, uVoid.w, length(P - uVoid.xyz))); }
// The blast shoves the high deck outward from uVoidD: the hole's radius is h.
// Everything that stood inside 1.6 h is packed into the band from h to 1.6 h.
// Returns the plane point to sample, and in pack how much the band thickens.
vec2 voidWarp(vec2 xz, out float pack, out float hole) {
  pack = 1.0; hole = 0.0;
  float h = uVoid.w * uVoidK;
  if (h < 1.0) return xz;
  vec2 v = xz - uVoidD;
  float n = k3noise(vec3(v * 0.0004, 1.7)), r = length(v), hr = h * (1.0 + 0.1 * (n - 0.5));
  if (r > 1.6 * hr) return xz;
  hole = 1.0 - smoothstep(0.92 * hr, 1.04 * hr, r);
  float rs = max(r - hr, 0.0) / 0.6 * 1.6;
  pack = 1.0 + 1.2 * (1.0 - smoothstep(hr, 1.6 * hr, r));
  return uVoidD + v / max(r, 1.0) * rs;
}
uniform vec4 uHitP;
// The blast: its world place and strength; the rock's radius sizes the shell.
uniform vec4 uBlast;
uniform float uBk;
uniform vec4 uSootS;
uniform float uSootK;
uniform vec3 uSootL;
uniform vec4 uEat;
uniform vec2 uAstG;
uniform vec4 uDebL[4];
uniform vec4 uPool[4];
uniform float uHitR;
// The blast on a cloud at P: its light, the shock rim and the push.
// thin is 1 at a cloud's thin edge, where light shines through.
// The flash lights near cloud brightest; the shock reaches it first.
vec3 cloudHit(vec3 P, float thin, out float rim, out vec3 push) {
  rim = 0.0; push = vec3(0.0);
  float t = uStarT - uHitP.w;
  if (t < 0.0 || t > 70.0) return vec3(0.0);
  vec3 d = P - uHitP.xyz;
  float r = max(length(d), 1.0);
  vec3 n = d / r;
  // The light reaches everything at once.
  float tl = t;
  vec3 L = vec3(0.0);
  if (tl > -0.1) {
    float tp = max(tl, 0.0);
    // A hard white flash, then a long amber afterglow.
    float I = uBk * smoothstep(-0.1, 0.05, tl) * (0.5 * exp(-tp / 0.6) + 0.8 * exp(-tp / 5.0)) * (1.0 - smoothstep(9.0, 18.0, tp));
    // The glow turns fire-coloured fast; the white lives in the front rim.
    vec3 c = mix(vec3(1.0, 0.9, 0.78) * 1.3, uAstC, smoothstep(0.0, 0.7, tp));
    I *= 6.0 / (1.0 + r * r / 1.2e9);
    // Light that passes through toward the eye: a silver edge.
    float fwd = pow(max(dot(n, normalize(cameraPosition - P)), 0.0), 5.0);
    // Little flat wash: thin edges and the far side take the light.
    L = c * I * (0.12 + 2.4 * fwd * thin);
    // The light front: a bright rim runs ahead of the glow.
    L += vec3(1.0, 0.92, 0.82) * uBk * exp(-tl * tl / 0.01) * (0.3 + 1.7 * thin) * 1.6 / (1.0 + r * r / 1.2e9);
  }
  // The fast rim rides the drawn shell, so the two meet.
  float Rr = 1.4 * uHitR + 36000.0 * (1.0 - exp(-t / 9.0));
  float w = 500.0 + 0.06 * Rr;
  rim = exp(-(r - Rr) * (r - Rr) / (2.0 * w * w)) * exp(-t / 7.0);
  // The heave: a slow pressure wave bows the clouds out for twenty seconds.
  float Rh = 70000.0 * (1.0 - exp(-t / 14.0));
  float wh = 3000.0 + 0.15 * Rh;
  push = n * smoothstep(Rh + wh, Rh - 2.0 * wh, r) * exp(-t / 22.0) * (1.0 - smoothstep(40.0, 68.0, t)) * (2000.0 + 0.06 * Rh);
  return L;
}
#ifdef CSHADE
float shadeAt(vec3 P);
#endif
// Cirrus: long streaks on one wind line, gathered in patches.
// The shared air for the cirrus, inline: the sky chunk comes before AIR.
// The horizon sky stands in for the air's own light.
vec3 cirrusAir(vec3 c, vec3 P) {
  vec3 v = P - cameraPosition;
  float hit = length(v);
  vec3 rd = v / max(hit, 1.0);
  float yc = max(cameraPosition.y, 0.0), yp = max(P.y, 0.0), dy = max(yp - yc, 1.0);
  float hM = max(uAirK.z, 100.0);
  float aR = (exp(-yc / 8000.0) - exp(-yp / 8000.0)) * 8000.0 / dy * uAirK.x;
  float aM = (exp(-yc / hM) - exp(-yp / hM)) * hM / dy * uAirK.y;
  vec3 T = exp(-(vec3(5.8e-6, 13.5e-6, 33.1e-6) * aR + vec3(1.1e-5) * aM) * hit);
  float mu = dot(rd, uSunD);
  vec3 inL = mix(uHorC, uZenC, 0.17) * 0.92 + uGlowC * (0.4224 / pow(1.5776 - 1.52 * mu, 1.5) / 12.0) * uAirK.w * aM / max(aM + aR, 1e-3);
  return c * T + inL * (1.0 - T);
}
vec3 wisps(vec3 dir, vec3 col, float cs) {
  if (dir.y < 0.008) return col;
  // A flat layer nine kilometres up; q.x runs along the wind.
  vec2 p = dir.xz / (dir.y + 0.07);
  // The layer's point in the world, for the blast.
  vec3 Pc = cameraPosition + vec3(p.x, 0.0, p.y) * 9000.0 + vec3(0.0, 9000.0, 0.0);
  float rim; vec3 push;
  vec3 hl = cloudHit(Pc, 0.6, rim, push);
  p -= push.xz / 9000.0;
  // The void packs the deck's own streaks outward into a ring.
  float pack, hole;
  p = (voidWarp(cameraPosition.xz + p * 9000.0, pack, hole) - cameraPosition.xz) / 9000.0;
  vec2 q = vec2(dot(p, vec2(0.966, -0.259)), dot(p, vec2(0.259, 0.966))) + uWisp.xy;
  // Slow bends keep the streaks from running ruled.
  q.y += 1.6 * k2fbm(q * vec2(0.09, 0.25));
  float streak = k2fbm(vec2(q.x * 0.22, q.y * 3.4));
  float hair = k2noise(vec2(q.x * 0.7, q.y * 11.0));
  float bank = k2fbm(q * vec2(0.05, 0.22) + 31.0);
  // Thin streaks run everywhere; the banks gather them thicker.
  float d = smoothstep(0.5, 0.86, streak + 0.12 * hair) * (0.45 + 0.55 * smoothstep(0.4 - 0.08 * uWisp.z, 0.62, bank));
  // A soft shoulder: edges feather into the sky.
  d = d * d * (3.0 - 2.0 * d);
  d *= smoothstep(0.015, 0.12, dir.y);
  // The heave clears the air it pushes; the layer fills back in.
  d *= 1.0 - 0.55 * smoothstep(800.0, 5000.0, length(push));
  // Packed ice thickens; the middle is swept clear.
  // The packed band then thins out over half a minute; it never fills back in.
  d = min(d * pack, 1.0) * (1.0 - hole) * (1.0 - 0.55 * smoothstep(4.0, 30.0, uVoidT) * smoothstep(1.0, 1.4, pack));
  if (d < 0.002) return col;
  // High ice still holds sunlight; it reads brighter than the dusty air.
  float shd = 0.0;
#ifdef CSHADE
  // The trail and the blast cloud shade the ice.
  shd = shadeAt(Pc);
#endif
  vec3 cloud = uCloudSun * (0.62 + 0.3 * pow(max(cs, 0.0), 2.0)) * (1.0 - 0.75 * shd) + uCloudAmb;
  // The passing bolt lights the ice round it, blue-white, for a few kilometres.
  if (uBolt.w > 0.001) { vec3 bd = Pc - uBolt.xyz; cloud += cloudBoltC() * uBolt.w * 0.45 / (1.0 + dot(bd, bd) / 2.0e7); }
  // By day the bright sky drowns thin ice; denser, brighter streaks still read.
  float dayW = smoothstep(0.08, 0.45, uSunD.y);
  cloud *= 1.0 + 0.15 * dayW;
  d *= 1.0 + 0.15 * dayW;
  // The shock rim: compressed air, lit by everything round it.
  // The shock rim: a faint warm ripple, not a white wave.
  cloud += hl + rim * (uCloudSun * 0.15 + uCloudAmb * 0.8 + hl * 0.8 + 0.01);
  // A thin veil: the sky shows through the densest streak (Tom).
  // Far ice sinks into the same air as everything else.
  cloud = cirrusAir(cloud, Pc);
  return mix(col, cloud, min(1.0, d * (0.45 + 0.2 * rim)));
}
vec3 astGlow(vec3 dir) {
  float ang = acos(clamp(dot(dir, uAst.xyz), -1.0, 1.0));
  float out_ = max(ang - uAstR, 0.0);
  return uAstC * min(uAst.w, 1.2) * (0.05 * exp(-out_ / (uAstR * 0.8)) + 0.012 * exp(-out_ / (uAstR * 3.0)));
}
vec3 boltGlow(vec3 dir) {
  if (uBolt.w < 0.001) return vec3(0.0);
  vec3 v = uBolt.xyz - cameraPosition;
  float c = dot(dir, normalize(v)) - 1.0;
  return uBoltC * uBolt.w * (0.06 * exp(c * 900.0) + 0.015 * exp(c * 60.0) + 0.004 * exp(c * 8.0));
}
vec3 hitGlow(vec3 dir) {
  if (uHit.w < 0.001) return vec3(0.0);
  float c = dot(dir, uHit.xyz) - 1.0;
  return uAstC * uHit.w * (0.2 * exp(c * 40.0) + 0.045 * exp(c * 4.0) + 0.006);
}
// The bare sky: no glow from the rock, the bolt or the hit.
vec3 k2skyB(vec3 dir, float sunK) {
  float up = max(dir.y, 0.0);
  float cs = dot(dir, uSunD);
  // Zenith to horizon, with a dust band low down.
  vec3 col = mix(uHorC, uZenC, pow(up, 0.45));
  col = mix(col, uHorC * 0.92, exp(-up * 14.0) * 0.55);
  // Below the horizon the sky model only feeds the haze colour.
  col = mix(col, uHorC * 0.8, smoothstep(0.0, -0.05, dir.y));
  // The sun: a wide glow, a tight glow and the disc.
  float cp = max(cs, 0.0);
  float glow = pow(cp, 5.0) * 0.22 + pow(cp, 90.0) * 0.7 * sunK + pow(cp, 8000.0) * 14.0 * sunK;
  col += uGlowC * glow * (0.35 + 0.65 * exp(-up * 4.0));
  if (sunK > 0.5 && dir.y > 0.0) {
    // Stars: one in about seventy cells, a few twinkle.
    if (uStars > 0.01) {
      // A Time drag samples the star field along its recent turn.
      // The samples blend into a short arc that fades toward its tail.
      int n = uTrailK > 0.002 ? 32 : 1;
      vec3 dA = uSkyRot * dir, dB = uSkyRot0 * dir, acc = vec3(0.0);
      float wsum = 0.0;
      for (int j = 0; j < 32; j++) {
        if (j >= n) break;
        float u = n > 1 ? float(j) / 31.0 : 0.0, wt = 1.0 - 0.75 * u;
        wsum += wt;
        vec3 g = normalize(mix(dA, dB, u)) * 420.0, id = floor(g);
        float h = k3hash(id);
        if (h > 0.986) {
          vec3 o = vec3(k3hash(id + 1.7), k3hash(id + 3.1), k3hash(id + 5.3)) - 0.5;
          float s = smoothstep(0.3, 0.0, length(fract(g) - 0.5 - o * 0.4));
          float tw = 0.7 + 0.3 * sin(uStarT * (1.5 + 4.0 * h) + h * 400.0);
          float m = pow((h - 0.986) / 0.014, 3.0) * 2.5 + 0.15;
          acc += s * tw * m * wt;
        }
      }
      // An arc spreads its light; a gain keeps it as bright as the dot.
      acc *= n > 1 ? 7.0 / wsum : 1.0;
      col += vec3(0.75, 0.82, 1.0) * acc * uStars * smoothstep(0.0, 0.2, dir.y);
    }
    // The moon: a small disc and a soft halo.
    if (uMoonK > 0.01) {
      float a = acos(clamp(dot(dir, uMoonD), -1.0, 1.0));
      float disc = smoothstep(0.0062, 0.0055, a) * (0.85 + 0.15 * k2noise(dir.xy * 900.0));
      col += uMoonK * (vec3(1.5, 1.45, 1.35) * disc + vec3(0.05, 0.06, 0.09) * exp(-a / 0.05) + vec3(0.012, 0.016, 0.03) * exp(-a / 0.3));
    }
  }
  // The haze colour reads this sky without its clouds.
  if (sunK > 0.5) col = wisps(dir, col, cs);
  return col;
}
// The nearing rock wraps itself in a great globe of fire.
// A hot core, an orange globe round it, a soft halo that fades out.
// The far sky keeps its own colour: no wash over the whole dome.
vec3 rockFill(vec3 c, vec3 dir) {
  if (uFill < 0.001) return c;
  float m = max(dot(dir, uAst.xyz), 0.0), near_ = pow(m, 60.0), globe = pow(m, 9.0), halo = pow(m, 3.0);
  c = mix(c, c * vec3(1.25, 0.85, 0.6), 0.3 * uFill * halo);
  return c + uAstC * uFill * (0.6 * near_ + 0.32 * globe + 0.07 * halo);
}
vec3 k2skyS(vec3 dir, float sunK) { return rockFill(k2skyB(dir, sunK), dir) + astGlow(dir) + boltGlow(dir) + hitGlow(dir); }
vec3 k2sky(vec3 dir) { return k2skyS(dir, 1.0); }`;
/* ---------- end K2 ---------- */

/* ---------- K2: haze ---------- */
const K2_HAZE = /* glsl */`
uniform float uHaze;
uniform float uHazeH;
uniform vec2 uLayer;
// uDustLoad: shot dust in the low air, 0 clear to 1 thick.
uniform float uDustLoad;
float k2hazeAmount(vec3 P) {
  vec3 v = P - cameraPosition;
  float dist = length(v);
  float k = 1.0 / uHazeH;
  float h0 = max(cameraPosition.y, 0.0), h1 = max(P.y, 0.0), dh = h1 - h0;
  float avg = abs(dh) < 0.01 ? exp(-h0 * k) : (exp(-h0 * k) - exp(-h1 * k)) / (dh * k);
  return 1.0 - exp(-dist * uHaze * (1.0 + 1.8 * uDustLoad) * max(avg, 0.0));
}
// The haze takes the horizon sky colour without the sun's disc.
// At night the haze takes the bare sky: no rock glow, no hit glow on the plain.
vec3 k2hazeColor(vec3 dir) { vec3 d = normalize(vec3(dir.x, 0.02, dir.z)); return mix(k2skyS(d, 0.0), k2skyB(d, 0.0), uStars) * 0.9 * mix(vec3(1.0), vec3(1.08, 0.86, 0.66), uDustLoad); }
vec3 k2haze(vec3 c, vec3 P) {
  return mix(c, k2hazeColor(normalize(P - cameraPosition)), k2hazeAmount(P));
}`;
/* ---------- end K2 ---------- */

// Shared lighting: sky hemisphere, sun, rim, the rock's glow.
const LIGHT = /* glsl */`
uniform float uL;
uniform vec3 uAxisA, uAxisD, uAxisUp;
uniform sampler2D uShadowT;
uniform mat4 uShadowM;
uniform float uShadowB;
uniform vec4 uArcL;
uniform vec4 uMuzL;
// 1 where the sun reaches P, 0 in the gun's shadow.
float sunTap(vec2 uv, float z) { return step(z - uShadowB, texture2D(uShadowT, uv).r); }
float sunVis(vec3 P) {
  vec4 s = uShadowM * vec4(P, 1.0);
  if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0 || s.z < 0.0) return 1.0;
  // Ground far behind the gun still takes its shadow.
  float z = min(s.z, 1.0);
  vec2 t = vec2(0.5 / 2048.0, 0.5 / 1024.0);
  return 0.25 * (sunTap(s.xy + t * vec2(-1, -1), z) + sunTap(s.xy + t * vec2(1, -1), z) + sunTap(s.xy + t * vec2(-1, 1), z) + sunTap(s.xy + t * vec2(1, 1), z));
}
// The brightest arc lights the gun and the plain.
vec3 arcLight(vec3 P, vec3 N) {
  vec3 d = uArcL.xyz - P;
  float r2 = dot(d, d);
  vec3 arc = vec3(0.7, 0.8, 1.0) * uArcL.w * max(dot(N, d * inversesqrt(r2 + 1.0)), 0.0) * 30000.0 / (r2 + 30000.0);
  // The muzzle blast reaches kilometres.
  vec3 m = uMuzL.xyz - P;
  float m2 = dot(m, m);
  return arc + vec3(0.75, 0.85, 1.0) * uMuzL.w * max(dot(N, m * inversesqrt(m2 + 1.0)), 0.0) * 6.0e5 / (m2 + 6.0e5);
}
vec3 ambient(vec3 N) { return mix(uHorC, uZenC, N.y * 0.5 + 0.5) * 0.55; }
vec3 sunLight(vec3 N) { return uSunC * max(dot(N, uSun), 0.0); }
// The rock lights what faces it, faintly by day.
// The blast lights everything within some 20 km of it.
// The light from P to the eye through the soot ball: 1 clear, 0 hidden.
float sootT(vec3 P) {
  if (uSootK < 0.001) return 1.0;
  vec3 rd = P - cameraPosition;
  float L = length(rd);
  rd /= L;
  vec3 oc = cameraPosition - uSootS.xyz;
  float b = dot(oc, rd), h = b * b - dot(oc, oc) + uSootS.w * uSootS.w;
  if (h <= 0.0) return 1.0;
  h = sqrt(h);
  float ch = max(min(-b + h, L) - max(-b - h, 0.0), 0.0) / uSootS.w;
  return exp(-uSootK * ch);
}
// Sunlight at P after the soot ball: 1 clear.
// The shadow way is steered, so the shadow sweeps the plain in view.
float smokeShade(vec3 P) {
  if (uSootK < 0.001) return 1.0;
  vec3 oc = P - uSootS.xyz;
  float b = dot(oc, uSootL), h = b * b - dot(oc, oc) + uSootS.w * uSootS.w;
  if (h <= 0.0) return 1.0;
  h = sqrt(h);
  float T = exp(-uSootK * max(-b + h - max(-b - h, 0.0), 0.0) / uSootS.w);
  return mix(1.0, T, 0.75);
}
// The blast's light at P: the flash, then a lingering glow; it lands everywhere at once.
float blastAt(vec3 P) {
  float tl = uStarT - uHitP.w;
  if (tl < 0.0) return 0.0;
  return uBk * ((exp(-tl / 0.4) + 0.3 * exp(-tl / 5.0)) * (1.0 - smoothstep(8.0, 18.0, tl)) + 0.16 * exp(-tl / 8.0) * (1.0 - smoothstep(20.0, 32.0, tl)));
}
// At night the near world stays mostly dark against the lit sky.
vec3 blastLight(vec3 P) { vec3 b = uBlast.xyz - P; return uAstC * blastAt(P) * 1.5 * 4.0e8 / (dot(b, b) + 4.0e8) * mix(1.0, 0.35, uStars); }
// The rock lights what faces it: faintly by day, clearly at night.
// uStars is 0 by day and 1 once the sun is 10 degrees under.
float nightK() { return uStars; }
// The rock lights nothing near at night: no orange on the gun or the plain.
vec3 keyLight(vec3 N) { return uAstC * uAst.w * 0.25 * (1.0 - nightK()) * max(dot(N, uAst.xyz), 0.0); }
// Light from behind catches the edges: the sun's and the rock's.
vec3 rim(vec3 N, vec3 P) {
  vec3 V = normalize(cameraPosition - P);
  float f = pow(1.0 - abs(dot(N, V)), 2.5);
  return f * (uSunC * 0.3 * max(dot(uSun, -V), 0.0) + uAstC * uAst.w * 0.15 * (1.0 - nightK()));
}`;
export const HZFADE = /* glsl */`
// Far things sink behind the horizon: the earth's curve, drawn four times deeper,
// with a band of thick low haze over it. Within 8 km of the eye nothing fades.
float hzFade(vec3 P) {
  float d = length(P.xz - cameraPosition.xz), drop = d * d / 3.2e6;
  return mix(1.0, smoothstep(drop, drop + 300.0 + 0.012 * d, P.y), smoothstep(8000.0, 16000.0, d));
}`;
export const HEAD = `${K2_NOISE}\nuniform vec3 uSun;\n${K2_SKY}\n${K2_HAZE}\n${LIGHT}
${HZFADE}`;
