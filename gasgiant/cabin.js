// Gas giant dive, the cabin pass: the capsule's window and a crop of its wall, after Window seat's pass 2.
// The cabin is traced in capsule metres: a curved wall, a bezel ring, a tapered liner, two panes.
// Light comes in through the window; the outside, blurred, is the cabin's only sky.
// The outer pane carries the weather: frost up high, drops in the decks, veils, heat shimmer deep down.
// Output: one RGBA16F target, linear light before the grade.

export const CABIN_FS = /* glsl */`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uScene, uBloom;
uniform vec3 uEye;
uniform mat3 uLook;
uniform vec2 uTan, uShake;
uniform float uBloomK, uTime, uWipe, uFrost, uWet, uRush, uHeat, uFlash, uAsp, uEntry, uDeck;
const float PI = 3.14159265;
// The window, metres: the rim opening narrows to the outer pane.
const vec2 OUTB = vec2(0.37, 0.275), INB = vec2(0.305, 0.225);
const float ROUT = 0.12, RIN = 0.09, DEPTH = 0.16;
// The wall bows toward the eye at its sides.
const float BOW = 0.06;
// The bezel: a raised ring 3 cm wide round the rim.
const float BZW = 0.032;
// The cabin lamp's colour and power: cool white, dim.
const vec3 LAMP = vec3(0.12, 0.13, 0.14);
float h12(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h12(i), h12(i + vec2(1, 0)), f.x), mix(h12(i + vec2(0, 1)), h12(i + vec2(1, 1)), f.x), f.y); }
float vf(vec2 p) { return vn(p) * 0.55 + vn(p * 2.1 + 3.7) * 0.3 + vn(p * 4.3 + 7.1) * 0.15; }
float h13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vn3(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h13(i), h13(i + vec3(1, 0, 0)), f.x), mix(h13(i + vec3(0, 1, 0)), h13(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(h13(i + vec3(0, 0, 1)), h13(i + vec3(1, 0, 1)), f.x), mix(h13(i + vec3(0, 1, 1)), h13(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
// Fire's flame ramp, from the Fire toy by way of Volcano's port: end, mid, then start colour.
const vec3 RAMP_E = vec3(0.45, 0.04, 0.03), RAMP_M = vec3(1.0, 0.32, 0.05), RAMP_S = vec3(1.0, 0.86, 0.6);
vec3 fireRamp(float t) {
  vec3 c = mix(vec3(0.0), RAMP_E, smoothstep(0.05, 0.35, t));
  c = mix(c, RAMP_M, smoothstep(0.35, 0.65, t));
  return mix(c, RAMP_S, smoothstep(0.65, 1.0, t));
}
const vec3 FLASH_C = vec3(0.64, 0.74, 1.0);
float sdBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float sdRecess(vec2 p, float z) { float k = clamp(-z / DEPTH, 0.0, 1.0); return sdBox(p, mix(OUTB, INB, k), mix(ROUT, RIN, k)); }
// GGX with Smith visibility and Schlick's Fresnel.
float ggx(float nh, float a) { float a2 = a * a, d = nh * nh * (a2 - 1.0) + 1.0; return a2 / (PI * d * d); }
float vis(float nl, float nv, float a) { float k = a * 0.5; return 0.25 / ((nl * (1.0 - k) + k) * (nv * (1.0 - k) + k)); }
vec3 fres(vec3 f0, float c) { return f0 + (1.0 - f0) * pow(1.0 - clamp(c, 0.0, 1.0), 5.0); }
// The outside along a cabin ray: the eye's own pixel, plus a small offset.
vec3 outside(vec2 uv) {
  uv = clamp(uv, 0.001, 0.999);
  return texture(uScene, uv).rgb + texture(uBloom, uv).rgb * uBloomK;
}
// The window's light: a soft copy of the outside, from five taps.
vec3 winLight() {
  return (texture(uBloom, vec2(0.5)).rgb * 0.5 + texture(uScene, vec2(0.5, 0.5)).rgb + texture(uScene, vec2(0.36, 0.64)).rgb
    + texture(uScene, vec2(0.64, 0.64)).rgb + texture(uScene, vec2(0.36, 0.36)).rgb + texture(uScene, vec2(0.64, 0.36)).rgb) / 5.5;
}
// A lit surface: base colour, roughness, metalness; the window is an area light.
vec3 shade(vec3 P, vec3 n, vec3 v, vec3 base, float rough, float metal, vec3 W) {
  vec3 Lp = vec3(0.0, 0.0, -DEPTH) - P;
  float d2 = dot(Lp, Lp);
  vec3 l = Lp * inversesqrt(d2);
  // The window's area as seen from P, with its own facing.
  float face = clamp(-l.z, 0.0, 1.0);
  float area = 0.07;
  float E = face * area / (d2 + area * 0.6);
  float nl = max(dot(n, l), 0.0), nv = max(dot(n, v), 1e-3);
  vec3 h = normalize(l + v);
  // A big light widens the lobe: roughness grows with its size over distance.
  float a = clamp(rough * rough + 0.25 * area / (d2 + 0.05), 0.02, 1.0);
  vec3 f0 = mix(vec3(0.04), base, metal);
  vec3 F = fres(f0, dot(h, v));
  vec3 spec = F * ggx(max(dot(n, h), 0.0), a) * vis(nl, nv, a);
  vec3 diff = (1.0 - F) * (1.0 - metal) * base / PI;
  vec3 c = W * E * nl * (diff + spec) * PI;
  // A dim cabin lamp above and behind the eye, so the metal and paint read.
  vec3 Lm = vec3(-0.32, 0.42, 0.62) - P;
  float m2 = dot(Lm, Lm);
  vec3 lm = Lm * inversesqrt(m2);
  vec3 hm = normalize(lm + v);
  float ml = max(dot(n, lm), 0.0);
  float am = max(rough * rough, 0.02);
  vec3 Fm = fres(f0, dot(hm, v));
  c += LAMP * (ml / m2) * ((1.0 - Fm) * (1.0 - metal) * base / PI + Fm * ggx(max(dot(n, hm), 0.0), am) * vis(ml, nv, am)) * PI;
  // Bounce light: the window's light off the white liner and the wall, strongest near the window.
  // It takes the liner's white and the wall's grey, a single bounce folded into one term.
  float near = exp(-length(P.xy) / 0.45);
  vec3 bounce = W * (0.035 + 0.09 * near) * mix(vec3(0.62, 0.64, 0.65), vec3(0.2, 0.22, 0.23), smoothstep(0.3, 0.8, length(P.xy)));
  c += (1.0 - metal * 0.6) * base * bounce * (0.55 + 0.45 * max(n.z, 0.0));
  // The lamp's light bounces too, a dim fill from above.
  c += base * LAMP * 0.06 * (0.6 + 0.4 * n.y);
  // A faint teal glow from the panel lights under the frame.
  c += base * vec3(0.0009, 0.0016, 0.0016) * (0.6 - 0.4 * n.y);
  return c;
}
void main() {
  vec2 cc = (vUv + uShake) * 2.0 - 1.0;
  vec3 dE = normalize(vec3(cc.x * uTan.x, cc.y * uTan.y, -1.0));
  vec3 d = uLook * dE;
  vec3 v = -d;
  // The entry's flame and the flashes light the cabin with the window.
  vec3 W = winLight() + uEntry * vec3(0.9, 0.3, 0.09) + uFlash * FLASH_C * 0.6 * uDeck;
  vec3 col;
  // The wall: z = BOW * x * x, solved along the ray.
  float A = BOW * d.x * d.x, B = 2.0 * BOW * uEye.x * d.x - d.z, C = BOW * uEye.x * uEye.x - uEye.z;
  float t = abs(A) > 1e-6 ? (-B - sqrt(max(B * B - 4.0 * A * C, 0.0))) / (2.0 * A) : -C / B;
  if (t < 0.0) t = abs(A) > 1e-6 ? (-B + sqrt(max(B * B - 4.0 * A * C, 0.0))) / (2.0 * A) : 9.0;
  if (t < 0.0) t = 9.0;
  vec3 P = uEye + d * t;
  float sdw = sdBox(P.xy, OUTB, ROUT);
  if (sdw > 0.0) {
    if (sdw < BZW) {
      // The bezel: a machined ring, rounded in section, with eight recessed screws.
      float k = sdw / BZW;
      vec2 g = normalize(vec2(sdBox(P.xy + vec2(1e-3, 0.0), OUTB, ROUT) - sdw, sdBox(P.xy + vec2(0.0, 1e-3), OUTB, ROUT) - sdw) + 1e-6);
      float slope = cos(k * PI) * 0.9;
      vec3 n = normalize(vec3(g * slope, 1.0));
      float ang = atan(P.y, P.x);
      float sc = abs(fract(ang / (2.0 * PI) * 8.0 + 0.0625) - 0.5) * 2.0;
      float screw = smoothstep(0.1, 0.07, length(vec2(sc * 0.35, k - 0.5)));
      float brush = vn(vec2(ang * 260.0, k * 3.0));
      vec3 base = mix(vec3(0.62, 0.64, 0.66), vec3(0.3, 0.31, 0.33), screw);
      col = shade(P, n, v, base, mix(0.26 + 0.1 * brush, 0.5, screw), 0.9, W);
    } else {
      // The wall: painted panels with seams, a fine orange peel.
      vec3 n = normalize(vec3(-2.0 * BOW * P.x, 0.0, 1.0));
      vec2 q = P.xy;
      float seam = smoothstep(0.004, 0.0015, abs(fract(q.y * 2.2 + 0.31) - 0.5) * 0.4545) + smoothstep(0.004, 0.0015, abs(fract(q.x * 1.6 + 0.08) - 0.5) * 0.625);
      float peel = vf(q * 140.0);
      n = normalize(n + vec3(vf(q * 140.0 + 1.3) - 0.5, peel - 0.5, 0.0) * 0.04);
      vec3 base = mix(vec3(0.09, 0.1, 0.105), vec3(0.025, 0.028, 0.03), clamp(seam, 0.0, 1.0));
      col = shade(P, n, v, base, 0.55 + 0.15 * peel, 0.0, W);
      // The raised bezel shades the wall at its foot.
      col *= mix(0.5, 1.0, smoothstep(0.0, 0.05, sdw - BZW));
    }
  } else {
    // The recess: step down the tapered liner to the outer pane.
    float zA = 0.0, zB = -DEPTH;
    bool hitSide = false;
    vec3 Q = P;
    for (int i = 1; i <= 12; i++) {
      float z = -DEPTH * float(i) / 12.0;
      vec3 X = uEye + d * ((z - uEye.z) / d.z);
      if (sdRecess(X.xy, z) > 0.0) { hitSide = true; zB = z; break; }
      zA = z;
    }
    if (hitSide) {
      for (int i = 0; i < 5; i++) {
        float z = 0.5 * (zA + zB);
        vec3 X = uEye + d * ((z - uEye.z) / d.z);
        if (sdRecess(X.xy, z) > 0.0) zB = z; else zA = z;
      }
      Q = uEye + d * ((zB - uEye.z) / d.z);
      // The liner: soft white composite, darker toward the pane.
      float s0 = sdRecess(Q.xy, Q.z);
      vec2 g = normalize(vec2(sdRecess(Q.xy + vec2(1e-3, 0.0), Q.z) - s0, sdRecess(Q.xy + vec2(0.0, 1e-3), Q.z) - s0) + 1e-6);
      vec3 n = normalize(vec3(-g, -0.35));
      float deep = clamp(-Q.z / DEPTH, 0.0, 1.0);
      vec3 base = mix(vec3(0.7, 0.72, 0.72), vec3(0.42, 0.44, 0.45), deep);
      col = shade(Q, n, v, base, 0.7, 0.0, W) * (1.0 + 2.5 * deep);
      // A black gasket where the liner meets the pane.
      col *= mix(1.0, 0.15, smoothstep(0.82, 0.97, deep));
    } else {
      // The panes. The outer pane at the foot of the recess carries the weather.
      vec3 X = uEye + d * ((-DEPTH - uEye.z) / d.z);
      vec2 p = X.xy;
      float edge = -sdRecess(p, -DEPTH);
      vec2 uv = vUv + uShake;
      // Heat deep down: the air outside wavers.
      uv += uHeat * 0.004 * vec2(vn(p * 30.0 + vec2(0.0, uTime * 3.0)) - 0.5, vn(p * 30.0 + vec2(5.0, uTime * 2.5)) - 0.5);
      // Drops: they bead when the capsule hangs and race up the glass in a fall.
      vec2 dq = p * vec2(40.0, 24.0);
      vec2 cell = floor(dq);
      float rx = h12(cell), ry = h12(cell + 7.1), rs = h12(cell + 3.3);
      float speed = mix(-0.02, 1.6, uRush) * (0.4 + rs);
      vec2 c = vec2(rx * 0.6 + 0.2, fract(ry + uTime * speed));
      vec2 dd = (fract(dq) - c) * vec2(1.0, 1.0 / (1.0 + 3.0 * uRush * rs));
      float rad = (0.12 + 0.16 * rs) * step(1.0 - uWet * 0.85, h12(cell + 11.0));
      float drop = smoothstep(rad, rad * 0.8, length(dd));
      // A drop is a small lens: it flips and shrinks the view behind it.
      float rr = length(dd) / max(rad, 1e-3);
      uv -= drop * dd * 0.14;
      vec3 out_ = outside(uv);
      // Its edge bends light away and goes dark; the lamp leaves a glint near its top.
      out_ *= mix(1.0, 0.3, drop * smoothstep(0.55, 1.0, rr));
      vec2 gq = dd / max(rad, 1e-3) - vec2(-0.3, 0.35);
      out_ += drop * exp(-dot(gq, gq) * 40.0) * (LAMP * 3.0 + W * 0.4);
      // Veils of hue and brightness rush up the glass in the air.
      vec2 wp = vec2(p.x * 5.0, p.y * 1.0 - uTime * 0.9);
      float w1 = vf(wp), w2 = vf(vec2(p.x * 3.0 + 4.0, p.y * 0.7 - uTime * 0.6));
      vec3 hue = mix(vec3(0.82, 1.1, 1.06), vec3(1.12, 0.84, 1.16), smoothstep(0.3, 0.7, w2));
      hue = mix(hue, vec3(0.9, 1.16, 0.9), smoothstep(0.55, 0.8, w1) * 0.6);
      out_ *= mix(vec3(1.0), hue, uWipe * 0.8) * (1.0 + uWipe * (w1 - 0.5) * 1.3);
      // In a deck the cloud tears past the glass: three layers of wisps at 1, 4 and 12 m.
      // Each layer rushes up at its own speed, so they shear; a flash lights them all.
      if (uDeck > 0.01) {
        for (int k = 0; k < 3; k++) {
          float zk = -DEPTH - (k == 0 ? 1.0 : k == 1 ? 4.0 : 12.0);
          vec3 Xk = uEye + d * ((zk - uEye.z) / d.z);
          float sc = k == 0 ? 2.2 : k == 1 ? 0.8 : 0.3;
          float sp = (0.3 + 3.5 * uRush) * (k == 0 ? 1.0 : k == 1 ? 0.55 : 0.3);
          float wv = vf(vec2(Xk.x * sc * 2.4 + float(k) * 3.1, Xk.y * sc * 0.6 - uTime * sp));
          float wsp = smoothstep(0.42, 0.78, wv) * uDeck;
          vec3 wl = W * (0.7 + 0.6 * wv) + FLASH_C * uFlash * (1.5 + 2.0 * wv);
          out_ = mix(out_, wl, wsp * (0.85 - 0.2 * float(k)));
        }
      }
      // Entry: the plasma round the hull, marched through 1.2 m outside the pane.
      // It streams up from the heat shield below; Fire's ramp colours it by heat.
      if (uEntry > 0.01) {
        vec3 fl = vec3(0.0);
        float tr = 1.0;
        for (int k = 0; k < 10; k++) {
          float zk = -DEPTH - 0.06 - 0.12 * (float(k) + h12(gl_FragCoord.xy));
          vec3 Xk = uEye + d * ((zk - uEye.z) / d.z);
          vec3 q = vec3(Xk.x * 3.0, Xk.y * 1.1 - uTime * 2.6, zk * 3.0);
          float n3 = vn3(q * 2.0) * 0.55 + vn3(q * 4.3 + 7.1) * 0.3 + vn3(q * 9.1 + 3.3) * 0.15;
          float heat = clamp((n3 - 0.35) * 2.2 + (0.25 - Xk.y) * 1.4, 0.0, 1.0) * uEntry;
          float den = smoothstep(0.1, 0.5, heat);
          fl += tr * fireRamp(heat) * pow(heat, 1.1) * 1.5 * den * 0.12;
          tr *= 1.0 - den * 0.08;
        }
        out_ = out_ * tr + fl;
      }
      // Frost grows in from the edge of the outer pane, high and cold.
      float fr = vf(p * 90.0) * 0.6 + vf(p * 300.0) * 0.4;
      float frost = uFrost * smoothstep(0.03, 0.0, edge - fr * 0.035);
      out_ = mix(out_, (W * 1.6 + vec3(0.04)) * vec3(0.85, 0.95, 1.0) * (0.5 + 0.9 * fr) + out_ * 0.3, frost * 0.85);
      // The pane's edge sits in the gasket's shade.
      out_ *= smoothstep(0.0, 0.012, edge);
      // The inner pane: it reflects the cabin faintly, with a smudge or two.
      float ct = abs(d.z);
      float F = 0.04 + 0.96 * pow(1.0 - ct, 5.0);
      float smudge = smoothstep(0.55, 0.8, vf(p * 9.0 + 2.0));
      vec3 refl = (W * 0.05 + vec3(0.0006, 0.001, 0.001)) * (0.6 + 1.5 * smudge);
      col = out_ * (1.0 - F) + refl * (F + 0.02 * smudge);
    }
  }
  // A flash outside lights the cabin for a moment: it is already in W.
  o = vec4(col, 1.0);
}`;
