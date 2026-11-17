
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
vec3 k2sky(vec3 dir) { return k2skyS(dir, 1.0); }