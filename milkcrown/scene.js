// Milk crown renderer: raw WebGL2.
// Passes: one signed-distance march into HDR, bloom, then the grade.
// Lengths are in mm. The camera looks along -z; y is up.
import { TRI_VS, program, linked, target, free, bind, tri } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { GRADE } from '../shared/grade.js';
import { NMAX, G, GB } from './event.js';

const HEAD = `#version 300 es
precision highp float;
`;

const SCENE = `${HEAD}
uniform vec3 uCamPos;
uniform mat3 uCamRot;
uniform vec3 uLens;
uniform vec4 uDrop, uCrown, uRim, uPool, uJet, uJDrop, uRings;
uniform vec4 uFing[${NMAX}];
uniform vec4 uBead[${NMAX}];
uniform vec3 uBack, uSpot;
uniform vec2 uBound;
uniform float uPx;
// A uniform zero keeps D3D from unrolling each loop.
uniform int uZero;
in vec2 vUv;
out vec4 o;
const float PI = 3.14159265;
const float G = ${G.toFixed(6)};
const float GB = ${GB.toFixed(6)};
// The key softbox: front left, above. The strip light: behind, right.
const vec3 LK = normalize(vec3(-0.62, 0.62, 0.48));
const vec3 LB = normalize(vec3(0.5, 0.42, -0.76));
const vec3 MILK = vec3(0.93, 0.915, 0.88);

vec3 camRay(vec2 uv) {
  vec2 s = uv * 2.0 - 1.0;
  s.y -= uLens.z;
  return normalize(uCamRot * vec3(s.x * uLens.x, s.y * uLens.y, -1.0));
}
float smin(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }
// A cone with round ends of radius r1 at a and r2 at b.
float rcone(vec3 p, vec3 a, vec3 b, float r1, float r2) {
  vec3 ba = b - a;
  float l2 = dot(ba, ba), rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1.0 / max(l2, 1e-8);
  vec3 pa = p - a;
  // A cone shorter than its radius step is one ball: the formula gives NaN.
  if (a2 <= 1e-6) return r1 > r2 ? length(pa) - r1 : length(p - b) - r2;
  float y = dot(pa, ba), z = y - l2;
  vec3 xv = pa * l2 - ba * y;
  float x2 = dot(xv, xv), y2 = y * y * l2, z2 = z * z * l2;
  float k = sign(rr) * rr * rr * x2;
  if (sign(z) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - r2;
  if (sign(y) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - r1;
  return (sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
float seg2(vec2 p, vec2 a, vec2 b, out float h) {
  vec2 pa = p - a, ba = b - a;
  h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

// A packet of rings: age t, start radius r0, speed c, wavelength lam, amplitude a, length L.
float ring(float r, float t, float r0, float c, float lam, float a, float L) {
  if (t <= 0.0) return 0.0;
  float u = r0 + c * t - r;
  if (u < -1.5 || u > L) return 0.0;
  float w = smoothstep(-1.5, 0.6, u) * (1.0 - smoothstep(L * 0.35, L, u));
  float k = exp(-t / 75.0) * inversesqrt(1.0 + r / 4.0);
  return a * w * k * sin(6.2832 * u / lam);
}
// The pool surface height at radius r.
float poolH(float r) {
  float h = 0.0;
  float x = r / uPool.y;
  if (x < 1.0) { float q = 1.0 - x * x; h -= uPool.x * q * q; }
  float d = (r - uCrown.x) / uPool.w;
  h += uPool.z * exp(-d * d);
  float s = uRings.w;
  h += ring(r, uRings.x, 2.5, 0.42, 1.4, 0.07 * s, 5.0);
  h += ring(r, uRings.y, 9.0, 0.24, 3.4, 0.34 * s, 9.0);
  h += ring(r, uRings.z, 1.5, 0.26, 2.4, 0.2 * s, 6.0);
  return h * (1.0 - smoothstep(34.0, 44.0, r));
}

// One point and its bead, in sector id, at radius r and angle th.
float point(vec3 p, float r, float th, float id, float Rt, float H) {
  float N = uRim.z, S = 2.0 * PI / N, t = uRim.w, s = uRings.w;
  int i = int(mod(id + N, N));
  vec4 F = uFing[i];
  vec4 B = uBead[i];
  float ph2 = th - (id + F.x) * S;
  vec3 l = vec3(cos(ph2) * r, p.y, sin(ph2) * r);
  float grow = uRim.y, rr = uRim.x;
  float td = F.y;
  float rb = (0.36 + 0.12 * s) * F.z * smoothstep(3.0, 8.0, t) * (1.0 - smoothstep(14.0, 19.0, t) * step(t, td));
  vec2 dir = normalize(vec2(0.62, 1.0));
  vec2 base = vec2(Rt, H);
  float L = grow * F.w * mix(1.0, 0.4, smoothstep(td, td + 2.2, t));
  vec2 tip = base + dir * L;
  float neck = smoothstep(td - 1.5, td, t);
  float df = 1e3;
  if (H > 0.04 && L > 0.05) {
    float rTip = mix(0.15, 0.05, neck) * (1.0 - smoothstep(td, td + 0.6, t)) + 0.09 * smoothstep(td, td + 1.5, t);
    df = rcone(l, vec3(base, 0.0), vec3(tip, 0.0), rr * 1.2, max(rTip * 1.5, 0.05));
  }
  if (t < td) {
    // The bead on the point, drawn away as the neck thins.
    if (rb > 0.02 && H > 0.04) df = smin(df, length(l - vec3(tip + dir * (rb * 0.45 + neck * rb * 0.85), 0.0)) - rb, 0.18 * (1.0 - neck) + 0.05);
  } else {
    // The bead flies on alone; a small new bead forms on the point.
    float dt = t - td;
    vec3 bp = vec3(B.x + B.z * dt, B.y + B.w * dt - 0.5 * GB * dt * dt, 0.0);
    df = min(df, length(l - bp) - rb);
    float rb2 = rb * 0.5 * smoothstep(td, td + 2.5, t) * (1.0 - smoothstep(14.0, 19.0, t));
    if (rb2 > 0.02 && H > 0.04) df = smin(df, length(l - vec3(tip + dir * rb2 * 0.5, 0.0)) - rb2, 0.12);
  }
  return df;
}
// The crown: wall, rim, and the points of this sector and the next.
float crown(vec3 p, bool fast) {
  float H = uCrown.y, Rb = uCrown.x, lean = uCrown.z, w0 = uCrown.w;
  float r = length(p.xz);
  vec2 q = vec2(r, p.y);
  float Rm = Rb + lean * H * 0.55, Rt = Rm + (lean + 0.3) * H * 0.45;
  float d = 1e3, h;
  float N = uRim.z, S = 2.0 * PI / N;
  float th = atan(p.z, p.x);
  float id = floor(th / S + 0.5);
  float ph = th - id * S;
  if (H > 0.04) {
    // The wall flares out in two segments, thick at the foot.
    float d1 = seg2(q, vec2(Rb, -0.9), vec2(Rm, H * 0.55), h) - w0 * mix(2.0, 1.1, h);
    float d2 = seg2(q, vec2(Rm, H * 0.55), vec2(Rt, H), h) - w0 * mix(1.1, 0.8, h);
    d = smin(d1, d2, 0.3);
    // The rim sags between points.
    float sag = 0.16 * uRim.y * (0.5 - 0.5 * cos(ph / S * 2.0 * PI));
    d = smin(d, length(vec2(r - Rt, p.y - H + sag)) - uRim.x, 0.35);
  }
  // The march skips the points far from their ring; shading never does.
  float zone = max(max(Rb - 2.0 - r, r - Rt - 18.0), max(-3.0 - p.y, p.y - H - 16.0));
  bool near = !fast || zone < 0.5;
  float df = near ? 1e3 : zone + 0.5;
  if (near) {
    float side = ph > 0.0 ? 1.0 : -1.0;
    for (int k = uZero; k < 2; k++) df = min(df, point(p, r, th, id + side * float(k), Rt, H));
  }
  return smin(d, df, 0.25);
}

// The Worthington jet: a column, a thinning neck and a bulb.
float jet(vec3 p) {
  float top = uJet.x;
  if (top < 0.05) return 1e3;
  vec3 q = vec3(length(p.xz), p.y, 0.0);
  float rb = uJet.y, nk = max(uJet.z, 0.03), bl = uJet.w;
  // A flared foot, a column, a short neck, the bulb on top.
  float rc = max(0.52 * rb, nk);
  float ym = max(top * 0.3, -0.5);
  float yn = max(top - max(bl, nk) * 2.8, ym + 0.15);
  float yk = max(top - max(bl, nk) * 1.7, yn + 0.1);
  float d = rcone(q, vec3(0.0, -3.0, 0.0), vec3(0.0, ym, 0.0), rb, rc);
  d = smin(d, rcone(q, vec3(0.0, ym, 0.0), vec3(0.0, yn, 0.0), rc, max(rc * 0.85, nk)), 0.5);
  d = smin(d, rcone(q, vec3(0.0, yn, 0.0), vec3(0.0, yk, 0.0), max(rc * 0.85, nk), nk), 0.3);
  if (bl > 0.02) d = smin(d, length(q - vec3(0.0, top - bl, 0.0)) - bl, 0.25);
  else d = smin(d, length(q - vec3(0.0, top - nk, 0.0)) - nk, 0.3);
  return d;
}

// A drop with a little shape wobble along y.
float blob(vec3 p, vec3 c, float r, float w) {
  vec3 q = p - c;
  q.y /= 1.0 + w;
  q.xz *= 1.0 + w * 0.5;
  return (length(q) - r) * min(1.0, 1.0 / (1.0 + abs(w)));
}

// Everything but the pool. Shading calls this: it has no bound.
float parts(vec3 p, bool fast) {
  float d = min(crown(p, fast), jet(p));
  if (uDrop.w > 0.01) d = smin(d, blob(p, vec3(0.0, uDrop.y, 0.0), uDrop.w, uDrop.z), 0.6);
  if (uJDrop.y > 0.01) d = min(d, blob(p, vec3(0.0, uJDrop.x, 0.0), uJDrop.y, uJDrop.z));
  return d;
}
// The field: the parts, with the pool when asked.
// fast lets bounds stand in for far parts; shading asks for true distances.
float field(vec3 p, bool pool, bool fast, out float m) {
  float out_ = max(length(p.xz) - uBound.x, p.y - uBound.y);
  // Nothing lies within 2 mm of the bound.
  float dt = fast && out_ > 0.0 ? out_ + 2.0 : parts(p, fast);
  m = 1.0;
  if (!pool) return dt;
  float dp = (p.y - poolH(length(p.xz))) * 0.7;
  m = dt < dp ? 1.0 : 0.0;
  return smin(dp, dt, 0.8);
}

// The studio as a reflection sees it: the softbox, the strip, the backdrop.
vec3 backdrop(vec3 d) {
  float a = atan(d.x, -d.z);
  vec2 g = vec2(a - 0.02, d.y - 0.1) / vec2(0.55, 0.32);
  float spot = exp(-dot(g, g));
  vec3 c = uBack * (0.28 + 0.72 * smoothstep(-0.15, 0.4, d.y)) + uSpot * spot;
  return c * smoothstep(-0.3, 0.0, -d.z * 0.5 + 0.2);
}
float panel(vec3 d, vec3 L, vec2 size) {
  float c = dot(d, L);
  if (c <= 0.0) return 0.0;
  vec3 w = d / c - L;
  vec3 u = normalize(cross(vec3(0.0, 1.0, 0.0), L)), v = cross(L, u);
  vec2 x = abs(vec2(dot(w, u), dot(w, v))) / size;
  return smoothstep(1.0, 0.8, x.x) * smoothstep(1.0, 0.8, x.y);
}
vec3 env(vec3 d) {
  vec3 c = backdrop(d) + vec3(0.012, 0.013, 0.016);
  c += vec3(16.0, 15.4, 14.4) * panel(d, LK, vec2(0.42, 0.3));
  c += vec3(6.0, 6.8, 8.2) * panel(d, LB, vec2(0.06, 0.55));
  return c;
}

float fres(float c, float f0) { return f0 + (1.0 - f0) * pow(1.0 - c, 5.0); }

// A glossy lobe toward a light: Blinn-Phong, normalised.
float lobe(vec3 n, vec3 v, vec3 l, float k) {
  vec3 h = normalize(v + l);
  return pow(max(dot(n, h), 0.0), k) * (k + 8.0) / 25.0 * step(0.0, dot(n, l));
}
// Milk under the studio light. m is 0 for the pool, 1 for the rest.
// sh, ao and th come from the probes; refl is what the surface mirrors.
vec3 milk(vec3 p, vec3 n, vec3 rd, float m, float sh, float ao, float th, vec3 refl) {
  vec3 v = -rd;
  // Milk scatters light: a wrapped key, soft at the terminator.
  float k = max(0.0, (dot(n, LK) + 0.4) / 1.4);
  float b = max(0.0, (dot(n, LB) + 0.2) / 1.2);
  // The key is a pool of light on the set; the milk beyond it falls dark.
  float fall = exp(-dot(p.xz - vec2(-4.0, 3.0), p.xz - vec2(-4.0, 3.0)) / 520.0);
  vec3 c = MILK * (vec3(1.05, 1.0, 0.95) * 1.2 * k * sh * fall + vec3(0.55, 0.62, 0.75) * 0.3 * b);
  c += MILK * (0.05 + 0.05 * n.y) * (uBack * 2.0 + 0.08) * ao;
  if (m > 0.5) {
    // Back light through a thin sheet: warm and soft.
    float through = th * th * (0.45 + 0.55 * max(0.0, dot(rd, -LB) * 0.5 + 0.5));
    c += (vec3(1.0, 0.88, 0.7) * 0.8 + uSpot * 0.8) * through;
    // A soft glow at the edges, where light skims through the milk.
    c += vec3(0.5, 0.55, 0.65) * pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.25 * max(0.0, n.y * 0.5 + 0.5);
  }
  float F = fres(max(dot(v, n), 0.0), 0.022);
  // The glints: the softbox and the strip, bright on wet milk.
  c += F * (vec3(26.0, 25.0, 23.0) * lobe(n, v, LK, 140.0) * sh + vec3(12.0, 13.5, 16.0) * lobe(n, v, LB, 90.0));
  // Milk is not a perfect mirror: the reflection stays soft.
  return mix(c, refl, F * (m < 0.5 ? 0.6 : 1.0));
}

void main() {
  vec3 ro = uCamPos, rd = camRay(vUv);
  // The march runs inside a cylinder round the set; past it the pool is flat.
  float A = dot(rd.xz, rd.xz), Bq = dot(ro.xz, rd.xz), R = 46.0;
  float disc = Bq * Bq - A * (dot(ro.xz, ro.xz) - R * R);
  float t0 = 0.0, t1 = -1.0;
  if (disc > 0.0) { t0 = max(0.0, (-Bq - sqrt(disc)) / A); t1 = (-Bq + sqrt(disc)) / A; }
  // Clip to the slab the set lives in.
  if (rd.y < 0.0) { t0 = max(t0, (uBound.y + 2.0 - ro.y) / rd.y); t1 = min(t1, (-6.0 - ro.y) / rd.y); }
  // One loop, one field call: the march first, then every shading probe.
  // D3D inlines each call site in full, so one site links fastest.
  // Probes: 0-3 the normal, 4-6 occlusion, 7-9 thinness, 10-31 the soft shadow, 32-79 the mirror.
  float t = t0, m = 0.0, mm, hit = 0.0, tp = 0.0, far = 1.0;
  bool marching = t1 > t0, sky = false, shOn = false, mOn = false, mHit = false;
  int k = 0;
  vec3 p = ro, mq = ro, n = vec3(0.0, 1.0, 0.0), nacc = vec3(0.0), rf = reflect(rd, n);
  float ao = 0.0, aw = 1.0, th = 0.0, sh = 1.0, ts = 0.15, tm = 0.05;
  for (int i = uZero; i < 240; i++) {
    vec3 q = ro + rd * t;
    bool pool = true, fast = true;
    float h = 0.0;
    int j = -1;
    if (!marching) {
      j = k++;
      if (j == 0) {
        if (hit < 0.5 && rd.y >= 0.0) { sky = true; break; }
        // The flat pool beyond the set: it shows the studio and fades with depth.
        tp = hit > 0.5 ? t : -ro.y / rd.y;
        if (hit < 0.5) { p = ro + rd * tp; m = 0.0; }
        // Only the set casts shadows, and they fall within 40 mm of it.
        far = smoothstep(34.0, 40.0, length(p.xz));
        shOn = far < 0.999;
      }
      if (j < 4) {
        if (hit < 0.5) continue;
        vec3 e = 0.5773 * (2.0 * vec3(float(((j + 3) >> 1) & 1), float((j >> 1) & 1), float(j & 1)) - 1.0);
        q = p + e * 0.012;
      }
      else if (j < 7) { h = 0.25 + 0.6 * float(j - 4); q = p + n * h; fast = false; }
      else if (j < 10) { if (m < 0.5) continue; h = 0.18 * float(j - 6) * float(j - 6); q = p - n * h; pool = false; fast = false; }
      else if (j < 32) { if (!shOn || sh < 0.02 || ts > 30.0) continue; q = p + n * 0.03 + LK * ts; pool = false; fast = false; }
      else { if (!mOn || mHit || tm > 40.0) break; q = p + n * 0.04 + rf * tm; pool = false; if (q.y > uBound.y) break; }
    }
    float d = field(q, pool, fast, mm);
    if (marching) {
      p = q; m = mm;
      if (d < uPx * t * 0.6) { hit = 1.0; marching = false; }
      else { t += d; if (t > t1 || i >= 149) marching = false; }
    }
    else if (j < 4) {
      vec3 e = 0.5773 * (2.0 * vec3(float(((j + 3) >> 1) & 1), float((j >> 1) & 1), float(j & 1)) - 1.0);
      nacc += e * d;
      if (j == 3) { n = normalize(nacc); rf = reflect(rd, n); mOn = m < 0.5 && dot(p.xz, p.xz) < 1600.0; }
    }
    else if (j < 7) { ao += (h - d) * aw; aw *= 0.6; }
    else if (j < 10) th += clamp(d + h, 0.0, h) / max(h, 1e-3) / 3.0;
    else if (j < 32) { sh = min(sh, 9.0 * d / ts); ts += clamp(d, 0.12, 2.0); }
    else { if (d < 0.02) { mHit = true; mq = q; } tm += d; }
  }
  if (sky) { o = vec4(backdrop(rd), 1.0); return; }
  ao = clamp(1.0 - 0.55 * ao, 0.0, 1.0);
  sh = mix(clamp(sh, 0.0, 1.0), 1.0, far);
  // The set in the milk's mirror: small and grazing, so a lit milk tone, no normal.
  vec3 refl = mHit ? MILK * (0.55 + 0.6 * smoothstep(-1.0, 8.0, mq.y)) * exp(-dot(mq.xz, mq.xz) / 900.0) + uBack : env(rf);
  vec3 c = milk(p, n, rd, m, sh, ao, th, refl);
  c = mix(c, backdrop(vec3(rd.x, 0.02, rd.z)) * 0.9, smoothstep(140.0, 700.0, tp));
  // Max drops a NaN on D3D: one bad pixel would spread through the bloom.
  o = vec4(min(max(c, vec3(0.0)), vec3(64.0)), 1.0);
}`;

/* ---------- grade: downsample, bloom, tone, vignette, grain ---------- */const FINAL = `${HEAD}
uniform sampler2D uHdr, uBloom;
uniform float uFrame, uBloomK;
uniform vec2 uRes, uSrc;
in vec2 vUv;
out vec4 o;
${GRADE}
vec3 film(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  // Four taps a quarter pixel out: a clean downsample of the larger frame.
  vec2 e = 0.25 / uRes;
  vec3 c = (texture(uHdr, vUv + vec2(-e.x, -e.y)).rgb + texture(uHdr, vUv + vec2(e.x, -e.y)).rgb
    + texture(uHdr, vUv + vec2(-e.x, e.y)).rgb + texture(uHdr, vUv + vec2(e.x, e.y)).rgb) * 0.25;
  c += texture(uBloom, vUv).rgb * uBloomK;
  c = film(c * 0.95);
  c *= gdVignette(vUv, uRes.x / uRes.y, 0.4, 0.4);
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  c += (gdHash(gl_FragCoord.xy + vec2(uFrame * 37.0, uFrame * 91.0)) - 0.5) * 0.014;
  o = vec4(c, 1.0);
}`;

export async function makeScene(gl) {
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) throw new Error('no float targets');
  const P = await linked(gl, {
    scene: program(gl, TRI_VS, SCENE),
    final: program(gl, TRI_VS, FINAL),
  });
  const empty = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 5 });
  let hdr = null, W = 0, H = 0, OW = 0, OH = 0;
  // ow, oh: the canvas. w, h: the march, up to twice as large.
  function resize(ow, oh, w, h) {
    OW = Math.max(2, ow); OH = Math.max(2, oh);
    W = Math.max(2, w); H = Math.max(2, h);
    gl.canvas.width = OW; gl.canvas.height = OH;
    free(gl, hdr);
    hdr = target(gl, W, H);
  }
  function frame(v, { frameNo = 0, bloomLevels = 5 } = {}) {
    if (!hdr) return;
    gl.disable(gl.BLEND);
    const s = P.scene;
    gl.useProgram(s.p);
    gl.uniform3fv(s.u.uCamPos, v.cam.pos);
    gl.uniformMatrix3fv(s.u.uCamRot, false, v.cam.rot);
    gl.uniform3fv(s.u.uLens, v.cam.lens);
    const u = v.u;
    gl.uniform4fv(s.u.uDrop, u.drop);
    gl.uniform4fv(s.u.uCrown, u.crown);
    gl.uniform4fv(s.u.uRim, u.rim);
    gl.uniform4fv(s.u.uPool, u.pool);
    gl.uniform4fv(s.u.uJet, u.jet);
    gl.uniform4fv(s.u.uJDrop, u.jdrop);
    gl.uniform4fv(s.u.uRings, u.rings);
    gl.uniform4fv(s.u.uFing, v.fing);
    gl.uniform4fv(s.u.uBead, v.bead);
    gl.uniform3fv(s.u.uBack, v.back);
    gl.uniform3fv(s.u.uSpot, v.spot);
    gl.uniform2fv(s.u.uBound, v.bound);
    gl.uniform1f(s.u.uPx, 2 * v.cam.lens[1] / H);
    gl.uniform1i(s.u.uZero, 0);
    tri(gl, hdr, empty);
    const bt = bloom.render(hdr.tex, W, H, { threshold: 1.1, cap: 8, levels: bloomLevels });
    const fp = P.final;
    gl.useProgram(fp.p);
    bind(gl, fp, 'uHdr', 0, hdr);
    bind(gl, fp, 'uBloom', 1, bt);
    gl.uniform1f(fp.u.uBloomK, 0.22);
    gl.uniform1f(fp.u.uFrame, frameNo % 64);
    gl.uniform2f(fp.u.uRes, OW, OH);
    gl.uniform2f(fp.u.uSrc, W, H);
    gl.viewport(0, 0, OW, OH);
    tri(gl, null, empty);
  }
  return { resize, frame };
}
