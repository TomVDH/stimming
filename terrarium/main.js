// Terrarium: the toy's module, loaded by index.html.
// Blockout: the jar, its plants and the grow light, simply shaded.
import { initPage, whenVisible, reduced, stage as mark, pageReady } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { environment } from '../shared/environment.js';
mark('libs');

const stage = document.getElementById('stage');

playIntro({ ready: pageReady(9000) });
mark('build');

/* ---------- bar ---------- */
const PLANTS = { fern: 0, moss: 1, bog: 2 };
// The handlers bind once the scene exists.
/** @type {{ plants: (v: string) => void, mist: () => void, light: (v: number) => void, fogBack: (v: number) => void }} */
const act = { plants() {}, mist() {}, light() {}, fogBack() {} };
const ui = initPage({ id: 'terrarium', bar: {
  choice: { label: 'Plants', value: 'fern', options: [
    { value: 'fern', label: 'Fern', key: '1' },
    { value: 'moss', label: 'Moss', key: '2' },
    { value: 'bog', label: 'Bog', key: '3' },
  ], onPick: v => act.plants(v) },
  actions: [{ verb: 'mist', key: 'M', onPress: () => act.mist() }],
  slider: { label: 'Light', min: 0, max: 1, step: 0.01, value: 0.6, onInput: v => act.light(v) },
  settings: [
    { type: 'slider', id: 'fogback', label: 'Fog return', min: 0, max: 1, step: 0.01, value: 0.5, persist: true, onInput: v => act.fogBack(v) },
  ],
  quality: true,
  keys: [['hold', 'mist'], ['drag', 'wipe'], ['click', 'poke']],
} });

/* ---------- the scene ---------- */
// One unit is about 20 cm. The jar stands on the floor at the origin.
// JR: jar radius. JH: top of the straight wall. The dome lid sits on it.
const JR = 0.5, JH = 1.2, JDC = 0.85, JDR = Math.hypot(JR, JH - JDC);
// The grow light: a bar above and behind the jar.
const LY = 2.2, LZ = -0.9, LW = 0.7;
const FOC = 1.55;
// Metres in one scene unit, and the top of the glass in units.
const METRE = 0.2, GLASS_TOP = JDC + JDR;
const f = x => x.toFixed(4);

// The camera, as statements. It needs uv and asp, and gives ro and rd.
// A narrow frame steps the camera back, so the jar keeps its margin.
const CAM = `
  float camD = 3.6 * max(1.0, 0.75 / asp);
  vec3 ro = vec3(0.0, 1.25, camD);
  vec3 fw = normalize(vec3(0.0, 0.92, 0.0) - ro);
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  vec2 sp = (uv - 0.5) * vec2(asp, 1.0);
  vec3 rd = normalize(fw * ${f(FOC)} + rt * sp.x + up * sp.y);`;

// The jar's outer skin, as statements. It gives jt (-1 for a miss) and jn.
// The scene pass and the glass pass both run it, so they agree to the pixel.
const JAR = `
  float jt = -1.0;
  vec3 jn = vec3(0.0);
  {
    float ja = dot(rd.xz, rd.xz), jb = dot(ro.xz, rd.xz), jc = dot(ro.xz, ro.xz) - ${f(JR * JR)};
    float jh = jb * jb - ja * jc;
    if (jh > 0.0) {
      float t = (-jb - sqrt(jh)) / ja;
      vec3 p = ro + rd * t;
      if (t > 0.0 && p.y >= 0.0 && p.y <= ${f(JH)}) { jt = t; jn = normalize(vec3(p.x, 0.0, p.z)); }
    }
    vec3 oc = ro - vec3(0.0, ${f(JDC)}, 0.0);
    float b = dot(oc, rd), h = b * b - dot(oc, oc) + ${f(JDR * JDR)};
    if (h > 0.0) {
      float t = -b - sqrt(h);
      vec3 p = ro + rd * t;
      if (t > 0.0 && p.y >= ${f(JH)} && (jt < 0.0 || t < jt)) { jt = t; jn = (p - vec3(0.0, ${f(JDC)}, 0.0)) / ${f(JDR)}; }
    }
  }`;

const SCENE = `
uniform vec3 uLampC;
uniform float uPlants, uSpray;
const vec3 LP = vec3(0.0, ${f(LY)}, ${f(LZ)});

float teH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float teN(vec2 p) {
  vec2 i = floor(p), u = fract(p);
  u = u * u * (3.0 - 2.0 * u);
  return mix(mix(teH(i), teH(i + vec2(1.0, 0.0)), u.x), mix(teH(i + vec2(0.0, 1.0)), teH(i + vec2(1.0, 1.0)), u.x), u.y);
}
float teBump(vec2 q, vec2 c, float k) { vec2 d = q - c; return exp(-dot(d, d) * k); }

// The top of the bed: moss over soil, in low mounds.
float teFloor(vec2 q) {
  float moss = uPlants > 0.5 && uPlants < 1.5 ? 1.0 : 0.0;
  float h = 0.23 + (0.05 + 0.05 * moss) * teBump(q, vec2(-0.14, -0.12), 14.0) + (0.035 + 0.04 * moss) * teBump(q, vec2(0.2, 0.04), 22.0);
  h += moss * 0.045 * teBump(q, vec2(0.02, 0.24), 30.0);
  h += 0.012 * teN(q * 18.0) + 0.006 * teN(q * 47.0);
  return h;
}

// One fern frond. q is relative to the crown; the frond arches out along yaw.
// R sets its reach; lift stretches it upward. lift must stay at 1 or more.
float teFrond(vec3 q, float yaw, float R, float lift) {
  float c = cos(yaw), s = sin(yaw);
  vec2 uw = vec2(c * q.x + s * q.z, c * q.z - s * q.x);
  vec2 a = vec2(uw.x, q.y / lift);
  vec2 cc = vec2(R, 0.15 * R);
  const float th0 = 3.29, th1 = 0.3;
  vec2 d = a - cc;
  float th = atan(d.y, d.x);
  if (th < th1 - 0.8) th += 6.28318;
  float sN = clamp((th0 - th) / (th0 - th1), 0.0, 1.0);
  float ts = th0 - sN * (th0 - th1);
  float e = length(a - cc - R * vec2(cos(ts), sin(ts)));
  // Leaflets stand out from the stem, in a comb that sweeps toward the tip.
  float wl = 0.55 * R * pow(max(sin(3.1416 * clamp((sN - 0.18) / 0.82, 0.0, 1.0)), 0.0), 0.8);
  float k = fract(sN * 15.0 - abs(uw.y) / R * 1.4);
  float pin = 0.25 + 0.75 * (1.0 - smoothstep(0.15, 0.45, abs(k - 0.5)));
  float blade = max(e - 0.004, abs(uw.y) - wl * pin);
  float stem = length(vec2(e, uw.y)) - 0.006 * (1.0 - 0.6 * sN);
  return min(blade, stem);
}
// A fern: n fronds round one crown, inside a cheap bounding sphere.
float teFern(vec3 p, vec3 base, float n, float yaw0, float R) {
  vec3 q = p - base;
  float bs = length(q - vec3(0.0, R * 1.2, 0.0)) - R * 2.1;
  if (bs > 0.05) return bs;
  float d = 1e3;
  for (int j = 0; j < 5; j++) {
    if (float(j) >= n) break;
    float fj = float(j);
    d = min(d, teFrond(q, yaw0 + fj * 6.28318 / n + 0.4 * sin(fj * 2.3), R * (0.85 + 0.25 * teH(vec2(fj, R))), 1.5));
  }
  return d;
}
// One mushroom: a stem and a flat cap.
float teShroom(vec3 p, vec3 base, float h, float rc, out float cap) {
  vec3 q = p - base;
  q.x -= q.y * 0.15;
  float stem = length(vec2(length(q.xz), max(abs(q.y - h * 0.5) - h * 0.5, 0.0))) - rc * 0.22;
  vec3 c = q - vec3(0.0, h, 0.0);
  float dc = max((length(c * vec3(1.0, 1.9, 1.0)) - rc) / 1.9, -c.y - 0.003);
  cap = dc < stem ? 1.0 : 0.0;
  return min(stem, dc);
}
// One pitcher plant: an open tube that flares at the top.
float tePitcher(vec3 p, vec3 base, float H) {
  vec3 q = p - base;
  q.xz -= vec2(0.08, 0.05) * q.y;
  float y = clamp(q.y / H, 0.0, 1.0);
  float r = mix(0.01, 0.04, pow(y, 1.5));
  return max(abs(length(q.xz) - r) - 0.004, max(-q.y, q.y - H)) * 0.8;
}

// The jar's contents. x: distance; y: material.
// 1 bed, 2 fern, 3 mushroom stem, 4 mushroom cap, 5 pitcher.
vec2 teMap(vec3 p) {
  vec2 r = vec2(max((p.y - teFloor(p.xz)) * 0.6, length(p.xz) - ${f(JR - 0.015)}), 1.0);
  if (p.y > 0.15) {
    if (uPlants < 0.5) {
      float fe = min(teFern(p, vec3(-0.17, 0.27, -0.1), 5.0, 0.3, 0.22), teFern(p, vec3(0.17, 0.25, -0.2), 4.0, 1.2, 0.18));
      fe = min(fe, teFern(p, vec3(-0.02, 0.24, 0.22), 3.0, 2.0, 0.12));
      if (fe < r.x) r = vec2(fe, 2.0);
    } else if (uPlants < 1.5) {
      float fe = teFern(p, vec3(0.2, 0.28, -0.18), 3.0, 0.8, 0.13);
      if (fe < r.x) r = vec2(fe, 2.0);
    } else {
      float pi = min(tePitcher(p, vec3(-0.12, 0.22, -0.08), 0.42), tePitcher(p, vec3(0.05, 0.22, -0.2), 0.36));
      pi = min(pi, min(tePitcher(p, vec3(-0.22, 0.22, 0.12), 0.3), tePitcher(p, vec3(0.16, 0.22, 0.02), 0.26)));
      if (pi < r.x) r = vec2(pi, 5.0);
    }
    if (uPlants < 1.5 && length(p - vec3(0.2, 0.3, 0.2)) < 0.22) {
      float cap, cap2, cap3;
      float m = teShroom(p, vec3(0.2, 0.24, 0.2), 0.1, 0.045, cap);
      float m2 = teShroom(p, vec3(0.26, 0.24, 0.14), 0.07, 0.034, cap2);
      float m3 = teShroom(p, vec3(0.14, 0.24, 0.25), 0.055, 0.028, cap3);
      if (m2 < m) { m = m2; cap = cap2; }
      if (m3 < m) { m = m3; cap = cap3; }
      if (m < r.x) r = vec2(m, 3.0 + cap);
    }
  }
  return r;
}
vec3 teNormal(vec3 p) {
  const vec2 k = vec2(1.0, -1.0);
  const float e = 0.0015;
  return normalize(k.xyy * teMap(p + k.xyy * e).x + k.yyx * teMap(p + k.yyx * e).x + k.yxy * teMap(p + k.yxy * e).x + k.xxx * teMap(p + k.xxx * e).x);
}

// The grow light at a point: its colour over the square of the distance.
vec3 teLamp(vec3 p) { vec3 d = LP - p; return uLampC * 3.0 / dot(d, d); }

// The room: the floor, the far wall, and the grow light's bar.
vec3 teBack(vec3 o, vec3 d) {
  float tg = d.y < -1e-4 ? -o.y / d.y : 1e9;
  float tw = d.z < -1e-4 ? (-2.6 - o.z) / d.z : 1e9;
  vec3 c = vec3(0.003, 0.005, 0.004);
  float tHit = min(tg, tw);
  if (tg < tw) {
    vec3 P = o + d * tg;
    vec3 L = normalize(LP - P);
    float lit = max(L.y, 0.0);
    // The jar's shadow falls forward, tinted green by the glass and the plants.
    vec3 dl = LP - P;
    float tt = clamp(-dot(P.xz, dl.xz) / dot(dl.xz, dl.xz), 0.0, 1.0);
    float rr = length(P.xz + dl.xz * tt), yy = P.y + dl.y * tt;
    float sh = (1.0 - smoothstep(0.38, 0.6, rr)) * (1.0 - smoothstep(1.3, 1.5, yy));
    float contact = smoothstep(0.48, 0.75, length(P.xz));
    vec3 base = vec3(0.016, 0.022, 0.017) * (0.8 + 0.4 * teN(P.xz * 3.0));
    c = base * (teLamp(P) * lit * mix(vec3(1.0), vec3(0.25, 0.55, 0.3), sh) + vec3(0.03, 0.045, 0.035)) * (0.35 + 0.65 * contact);
  } else if (tw < 1e8) {
    vec3 P = o + d * tw;
    vec2 g = P.xy - vec2(0.0, ${f(LY)});
    c = vec3(0.006, 0.016, 0.011) + uLampC * 0.022 * exp(-length(g * vec2(0.6, 1.0)) * 1.3);
  }
  // The bar: a dark housing over a glowing strip, and a soft halo.
  if (d.z < -1e-4) {
    float tl = (${f(LZ)} - o.z) / d.z;
    if (tl > 0.0 && tl < tHit) {
      vec3 P = o + d * tl;
      vec2 q = vec2(max(abs(P.x) - ${f(LW)}, 0.0), P.y - ${f(LY)});
      float dl = length(q);
      if (dl < 0.02) c = uLampC * 5.0;
      else if (q.x < 0.001 && q.y > 0.0 && q.y < 0.07) c = vec3(0.012, 0.013, 0.012);
      c += uLampC * 0.09 * exp(-dl * 10.0);
    }
  }
  return c;
}

// The lit colour of a point in the jar.
vec3 teShade(vec3 p, vec3 rd, float m) {
  vec3 n = teNormal(p);
  vec3 L = normalize(LP - p), lc = teLamp(p);
  float ao = clamp(teMap(p + n * 0.035).x / 0.035, 0.25, 1.0);
  vec3 amb = vec3(0.02, 0.035, 0.026);
  float dif = max(dot(n, L), 0.0), leaf = 0.0;
  vec3 base;
  if (m < 1.5) {
    float r = length(p.xz), top = teFloor(p.xz);
    if (r > ${f(JR - 0.03)} && p.y < top - 0.03) {
      // The cut face on the glass: pebbles under soil.
      float cell = teH(floor(vec2(atan(p.x, p.z) * 26.0, p.y * 34.0)));
      base = p.y < 0.075 ? vec3(0.09, 0.085, 0.08) * (0.5 + cell) : vec3(0.03, 0.019, 0.012) * (0.7 + 0.5 * cell);
      dif = 0.25;
    } else {
      float t = teN(p.xz * 24.0) * 0.6 + teN(p.xz * 70.0) * 0.4;
      base = mix(vec3(0.02, 0.06, 0.01), vec3(0.09, 0.2, 0.025), t);
      leaf = 0.3;
    }
  } else if (m < 2.5) {
    base = vec3(0.05, 0.17, 0.03);
    dif = abs(dot(n, L));
    leaf = 1.0;
  } else if (m < 3.5) base = vec3(0.4, 0.36, 0.3);
  else if (m < 4.5) base = vec3(0.38, 0.2, 0.09);
  else {
    base = mix(vec3(0.07, 0.2, 0.04), vec3(0.32, 0.05, 0.06), smoothstep(0.32, 0.55, p.y));
    dif = abs(dot(n, L));
    leaf = 0.7;
  }
  vec3 c = base * (lc * dif + amb) * ao;
  // Light through a leaf from behind, and a bright edge.
  float back = pow(max(dot(rd, L) + 0.2, 0.0), 2.0);
  c += base * lc * leaf * back * 1.4;
  c += lc * base * leaf * 2.0 * pow(1.0 - abs(dot(n, rd)), 3.0) * back;
  return c;
}

vec3 envScene(vec2 uv) {
  float asp = uRes.x / uRes.y;
  ${CAM}
  // The glass knob on the lid.
  vec3 ok = ro - vec3(0.0, 1.5, 0.0);
  float kb = dot(ok, rd), kh = kb * kb - dot(ok, ok) + 0.0025;
  ${JAR}
  if (kh > 0.0 && (jt < 0.0 || -kb - sqrt(kh) < jt)) {
    vec3 kp = ro + rd * (-kb - sqrt(kh)), kn = normalize(kp - vec3(0.0, 1.5, 0.0));
    return teBack(kp, reflect(rd, kn)) * 0.7 + uLampC * 0.08 * pow(1.0 - abs(dot(kn, rd)), 2.0);
  }
  if (jt < 0.0) return teBack(ro, rd);
  vec3 p = ro + rd * jt;
  float cv = max(dot(jn, -rd), 0.0);
  float F = 0.04 + 0.96 * pow(1.0 - cv, 5.0);
  // The far wall of the jar: the cylinder's far root, or the dome's.
  float ja = dot(rd.xz, rd.xz), jb = dot(ro.xz, rd.xz), jc = dot(ro.xz, ro.xz) - ${f(JR * JR)};
  float tE = (-jb + sqrt(max(jb * jb - ja * jc, 0.0))) / ja;
  if (ro.y + rd.y * tE > ${f(JH)}) {
    vec3 oc = ro - vec3(0.0, ${f(JDC)}, 0.0);
    float b = dot(oc, rd);
    tE = -b + sqrt(max(b * b - dot(oc, oc) + ${f(JDR * JDR)}, 0.0));
  }
  // March the contents.
  float t = jt + 0.002, hitM = 0.0;
  for (int i = 0; i < 90; i++) {
    vec2 h = teMap(ro + rd * t);
    if (h.x < 0.0007 * t) { hitM = h.y; break; }
    t += h.x * 0.75;
    if (t > tE) break;
  }
  vec3 inside;
  if (hitM > 0.0) inside = teShade(ro + rd * t, rd, hitM);
  else {
    // Through the back wall to the room, with the wall's own faint sheen.
    vec3 pb = ro + rd * tE, nb = -normalize(pb.y > ${f(JH)} ? pb - vec3(0.0, ${f(JDC)}, 0.0) : vec3(pb.x, 0.0, pb.z));
    inside = teBack(pb, rd) * 0.85 + uLampC * 0.03 * pow(1.0 - abs(dot(nb, rd)), 3.0);
    t = tE;
  }
  // The spray: a fine cone of mist from the lid, lit by the grow light.
  if (uSpray > 0.002) {
    float mist = 0.0, len = t - jt;
    for (int i = 0; i < 8; i++) {
      vec3 q = ro + rd * (jt + len * (float(i) + 0.5) / 8.0);
      float drop = ${f(JH + 0.15)} - q.y, w = 0.03 + 0.22 * max(drop, 0.0);
      float grain = 0.6 + 0.8 * teN(vec2(length(q.xz) * 30.0, q.y * 12.0 + uTime * 6.0));
      mist += exp(-dot(q.xz, q.xz) / (w * w)) * smoothstep(-0.1, 0.1, drop) * smoothstep(1.3, 0.2, drop) * grain / (1.0 + 8.0 * w);
    }
    inside += (vec3(0.04, 0.05, 0.05) + uLampC * 0.05) * mist * len * uSpray * 2.2;
  }
  // Damp air in the jar softens what lies deep in it.
  vec3 damp = vec3(0.012, 0.024, 0.018) + uLampC * 0.012;
  inside = mix(inside, damp, 1.0 - exp(-(t - jt) * 0.35));
  vec3 c = inside * (1.0 - F) * vec3(0.9, 0.97, 0.92) + teBack(p, reflect(rd, jn)) * F;
  // The grow light comes through the glass at its edges: a long bright rim.
  c += uLampC * 0.06 * pow(1.0 - cv, 3.0) * smoothstep(-0.2, 1.4, p.y);
  // The seam where the lid meets the wall, and the thick glass of the base.
  float seam = smoothstep(0.016, 0.004, abs(p.y - ${f(JH)})), foot = smoothstep(0.05, 0.03, p.y);
  c = mix(c, vec3(0.02, 0.04, 0.03) + uLampC * 0.05, max(seam, foot) * 0.6);
  return c;
}`;

// The jar's glass step for the runner's pane pass: shared/wetglass.js on the curved skin.
// tWipe holds the finger's clear stripes, unrolled round the jar.
const PANE_HEAD = `
uniform sampler2D tWipe;
uniform float uMistFog, uFront;`;
// jq unrolls the glass: arc length round the jar, then height, in metres.
const GLASS = `
    ${CAM}
    ${JAR}
    if (jt > 0.0) {
      vec3 jp = ro + rd * jt;
      float jcos = max(dot(jn, -rd), 0.0), ang = atan(jp.x, jp.z);
      vec2 jq = vec2(ang * ${f(JR)}, jp.y) * ${f(METRE)};
      float wipe = texture(tWipe, vec2(ang / 6.28318 + 0.5, jp.y / ${f(GLASS_TOP)})).r;
      // Rest fog comes back down from the lid; the mist fogs it all.
      float jfog = max(uMistFog, uFog * smoothstep(uFront - 0.06, uFront + 0.18, ${f(GLASS_TOP)} - jp.y));
      float jwet = uWet * (1.0 - wipe);
      WgPane g = wgPane(jq, uZoom, uM, uFlow, jwet, uWind, 1.0, jfog * (1.0 - wipe), uPatch, (jp.y - 1.32) * 0.25);
      // A second, finer layer of beads: condensation is mostly tiny drops.
      vec2 off2 = vec2(0.0);
      float r2 = 0.0, s2 = 0.0, c2 = 0.0;
      grBeads(jq * 2.4 / uZoom + 3.1, jwet, 1.0, 1.6, vec3(0.28, 0.5, 0.82), off2, r2, s2, c2);
      g.off += off2 * uZoom / 2.4;
      g.rim = max(g.rim, r2 * 0.8); g.spec = max(g.spec, s2); g.cover = max(g.cover, c2);
      g.fog *= 1.0 - 0.6 * c2;
      // Metres on the glass to frame heights, at the jar's distance.
      vec2 su = uv + g.off * ${f(FOC)} / (camD * ${f(METRE)}) / vec2(asp, 1.0);
      vec3 jveil = uLampCol * 0.008 + vec3(0.006, 0.014, 0.01);
      vec3 v = wgView(g, texture(tScene, su).rgb, texture(tBok, su).rgb, uScatter, vec3(1.0), jveil, glint);
      float jm = smoothstep(0.0, 0.2, jcos);
      col = mix(col, v, jm);
      rim = g.rim * jm; cover = g.cover * jm; fog = g.fog * jm;
    }`;

/* ---------- state ---------- */
const REST_FOG = 0.2;
let plants = 0, light = 0.6, fogBack = 0.5, visible = true;
// The grow light, from dusk amber to noon white.
function lampColour() {
  const a = [1.0, 0.55, 0.28], b = [1.0, 0.93, 0.86], k = light;
  const i = 0.55 + 1.6 * k;
  return a.map((x, n) => (x + (b[n] - x) * k) * i);
}
const sub = (a, b) => a.map((x, i) => x - b[i]), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = a => { const l = Math.hypot(...a); return a.map(x => x / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// The camera of the CAM statements, in JS.
function camera(asp) {
  const ro = [0, 1.25, 3.6 * Math.max(1, 0.75 / asp)];
  const fw = norm(sub([0, 0.92, 0], ro)), rt = norm(cross(fw, [0, 1, 0])), up = cross(rt, fw);
  return { ro, fw, rt, up };
}
// Where the lamp falls on the frame: the pane pass lights drops and fog near it.
function lampOnFrame(asp) {
  const { ro, fw, rt, up } = camera(asp), v = sub([0, LY, LZ], ro), z = dot(v, fw);
  return [0.5 + dot(v, rt) / z * FOC / asp, 0.5 + dot(v, up) / z * FOC];
}
// The point on the glass under a client point, as wipe-map coordinates, or null.
function glassAt(cx, cy) {
  const r = canvas.getBoundingClientRect(), asp = r.width / Math.max(1, r.height);
  const { ro, fw, rt, up } = camera(asp);
  const sx = ((cx - r.left) / r.width - 0.5) * asp, sy = 0.5 - (cy - r.top) / r.height;
  const rd = norm(fw.map((x, i) => x * FOC + rt[i] * sx + up[i] * sy));
  let t = -1;
  const a = rd[0] * rd[0] + rd[2] * rd[2], b = ro[0] * rd[0] + ro[2] * rd[2], c = ro[0] * ro[0] + ro[2] * ro[2] - JR * JR, h = b * b - a * c;
  if (h > 0) { const tc = (-b - Math.sqrt(h)) / a, y = ro[1] + rd[1] * tc; if (tc > 0 && y >= 0 && y <= JH) t = tc; }
  const oc = sub(ro, [0, JDC, 0]), bd = dot(oc, rd), hd = bd * bd - dot(oc, oc) + JDR * JDR;
  if (hd > 0) { const td = -bd - Math.sqrt(hd); if (td > 0 && ro[1] + rd[1] * td >= JH && (t < 0 || td < t)) t = td; }
  if (t < 0) return null;
  const p = ro.map((x, i) => x + rd[i] * t);
  return { u: Math.atan2(p[0], p[2]) / (2 * Math.PI) + 0.5, v: p[1] / GLASS_TOP };
}

/* ---------- the wipe map ---------- */
// One value per cell, 1 where a finger cleared the glass.
const WW = 256, WH = 96;
const wipeK = new Float32Array(WW * WH), wipeB = new Uint8Array(WW * WH);
let wipeLive = false, wipeTex = null, wipeDirty = true;
// A soft round dab, about 1.2 cm across on the glass.
function dab(u, v) {
  const cx = u * WW, cy = v * WH, rx = 5, ry = 4;
  for (let y = Math.max(0, Math.floor(cy - ry * 2)); y <= Math.min(WH - 1, Math.ceil(cy + ry * 2)); y++) {
    for (let x = Math.floor(cx - rx * 2); x <= Math.ceil(cx + rx * 2); x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry, k = Math.exp(-(dx * dx + dy * dy) * 1.2);
      const i = y * WW + ((x % WW) + WW) % WW;
      wipeK[i] = Math.max(wipeK[i], k);
    }
  }
  wipeLive = wipeDirty = true;
}
function wipeTexture() {
  const gl = env.gl;
  if (!wipeTex) {
    wipeTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, wipeTex);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.REPEAT], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  }
  if (wipeDirty) {
    for (let i = 0; i < wipeK.length; i++) wipeB[i] = wipeK[i] * 255;
    gl.bindTexture(gl.TEXTURE_2D, wipeTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, WW, WH, 0, gl.RED, gl.UNSIGNED_BYTE, wipeB);
    wipeDirty = false;
  }
  return wipeTex;
}
// The fog creeps back into a stripe; Fog return sets how fast.
function healWipe(dt) {
  const k = Math.exp(-dt / (5 + 15 * (1 - fogBack)));
  let any = false;
  for (let i = 0; i < wipeK.length; i++) { const w = wipeK[i] > 0.004 ? wipeK[i] * k : 0; wipeK[i] = w; any ||= w > 0; }
  wipeLive = any;
  wipeDirty = true;
}

/* ---------- the condensation cycle ---------- */
// dose: the water a mist put in the jar; it dries over about a minute.
// mistFog: the fog a mist lays on the glass; it condenses into beads.
// front: how far down from the lid the rest fog is still missing, in units.
const G = { held: false, dose: 0, mistFog: 0, front: 0, spray: 0 };

const canvas = document.createElement('canvas');
stage.prepend(canvas);
let env = null;
try {
  env = environment(canvas, {
    scene: SCENE,
    glass: GLASS,
    pane: {
      head: PANE_HEAD,
      uniforms: { uMistFog: () => G.mistFog, uFront: () => G.front },
      textures: { tWipe: () => wipeTexture() },
    },
    active: () => visible,
    uniforms: {
      uLampC: () => lampColour(),
      uPlants: () => plants,
      uSpray: () => G.spray,
    },
  });
} catch (err) {
  /** @type {HTMLElement} */ (stage.querySelector('.fail')).hidden = false;
  ui.hideControls?.();
  mark('first-frame');
  throw err;
}
const S = env.state;
// Only the glass, the glow, the grade and the output run here.
Object.assign(S.on, { water: false, sky: false, air: false, flare: false });
Object.assign(S, { wet: 0, wind: 0, fog: REST_FOG, patch: 0.15, defocus: 0, zoom: 0.9, bloom: 0.55, thr: 0.8, orbs: 0, vig: 0.55, grain: 0.035, expo: 1.2, flGain: 0, tintK: 0.3 });
S.frame = false;
function relight() {
  const c = lampColour(), m = Math.max(...c);
  S.lightColor = c.map(x => x / m * 0.6);
  S.light = lampOnFrame(canvas.clientWidth / Math.max(1, canvas.clientHeight));
  env.touch();
}
new ResizeObserver(relight).observe(canvas);

/* ---------- the tick ---------- */
// It runs while the glass changes, then stops.
let tickRaf = 0, tickT = 0;
const busy = () => G.held || G.spray > 0 || G.dose > 0 || G.mistFog > 0.003 || G.front > 0 || wipeLive || S.wet > 0;
function step(dt) {
  // Fog return speeds the whole cycle up or slows it down.
  const pace = 0.4 + 1.6 * fogBack;
  if (G.held) {
    G.dose = Math.min(1, G.dose + dt * 0.45);
    G.mistFog += (0.85 - G.mistFog) * (1 - Math.exp(-dt / 0.35));
    G.front = GLASS_TOP;
  } else {
    G.mistFog = G.mistFog > 0.003 ? G.mistFog * Math.exp(-dt * pace / 14) : 0;
    G.dose = Math.max(0, G.dose - dt * pace / 60);
    // The rest fog comes back from the lid once the drops thin out.
    if (G.dose < 0.5) G.front = Math.max(0, G.front - dt * pace * GLASS_TOP / 40);
  }
  // The spray opens fast and dies away soon after the release.
  G.spray += ((G.held ? 1 : 0) - G.spray) * (1 - Math.exp(-dt / (G.held ? 0.15 : 0.5)));
  if (!G.held && G.spray < 0.003) G.spray = 0;
  // Beads follow the fog, a little late.
  const want = Math.min(1, G.dose * 1.6);
  S.wet += (want - S.wet) * (1 - Math.exp(-dt / (G.held ? 1.4 : 0.8)));
  if (want === 0 && S.wet < 0.003) S.wet = 0;
  if (wipeLive) healWipe(dt);
}
function tick(t) {
  const dt = tickT ? Math.min(0.05, (t - tickT) / 1000) : 0.016;
  tickT = t;
  step(dt);
  env.touch();
  tickRaf = busy() && visible && !reduced() ? requestAnimationFrame(tick) : 0;
  if (!tickRaf) tickT = 0;
}
function wake() {
  if (reduced()) { env.touch(); return; }
  if (!tickRaf && visible) { tickT = 0; tickRaf = requestAnimationFrame(tick); }
}

/* ---------- mist ---------- */
// Reduced motion puts the drops on at once; they dry in one step later.
let dryTimer = 0;
function stillMist() {
  Object.assign(G, { dose: 1, mistFog: 0, front: 0 });
  S.wet = 1;
  env.touch();
  clearTimeout(dryTimer);
  dryTimer = setTimeout(() => { Object.assign(G, { dose: 0 }); S.wet = 0; wipeK.fill(0); wipeLive = false; wipeDirty = true; env.touch(); }, 40000);
}
function holdMist(on) {
  if (reduced()) { if (on) stillMist(); return; }
  G.held = on;
  wake();
}
// One press of Mist is a short burst.
let burst = 0;
function mist() {
  holdMist(true);
  clearTimeout(burst);
  burst = setTimeout(() => holdMist(false), 700);
}

act.mist = mist;
act.plants = v => { plants = PLANTS[v] ?? 0; env.touch(); };
act.light = v => { light = v; relight(); };
act.fogBack = v => { fogBack = v; };
fogBack = ui.setting('fogback')?.value ?? fogBack;

/* ---------- pointer ---------- */
// A press becomes a drag after 8 px, or a hold after 260 ms; else it is a tap.
let press = null;
// A drag on the glass wipes a stripe, dab by dab along the path.
function wipeTo(x, y) {
  const g = glassAt(x, y);
  if (g && press.last) {
    let du = g.u - press.last.u;
    du -= Math.round(du);
    const n = Math.max(1, Math.ceil(Math.hypot(du * WW, (g.v - press.last.v) * WH) / 2));
    for (let i = 1; i <= n; i++) dab(press.last.u + du * i / n, press.last.v + (g.v - press.last.v) * i / n);
  } else if (g) dab(g.u, g.v);
  press.last = g;
  if (reduced()) {
    clearTimeout(dryTimer);
    dryTimer = setTimeout(() => { wipeK.fill(0); wipeLive = false; wipeDirty = true; env.touch(); }, 12000);
  }
  wake();
}
canvas.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  canvas.setPointerCapture(e.pointerId);
  press = { x: e.clientX, y: e.clientY, kind: 'press', last: null };
  press.timer = setTimeout(() => { if (press?.kind === 'press') { press.kind = 'hold'; holdMist(true); } }, 260);
});
canvas.addEventListener('pointermove', e => {
  if (!press) return;
  if (press.kind === 'press' && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) {
    press.kind = 'drag';
    press.last = glassAt(press.x, press.y);
  }
  if (press.kind === 'drag') wipeTo(e.clientX, e.clientY);
});
function endPress() {
  if (!press) return;
  clearTimeout(press.timer);
  if (press.kind === 'hold') holdMist(false);
  // Task 3 makes a tap poke a frond.
  press = null;
}
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(ev, endPress);

/* ---------- start ---------- */
relight();
env.draw();
canvas.classList.add('on');
mark('first-frame');
// A hidden tab stops every frame.
whenVisible(stage, v => {
  visible = v;
  if (v) wake();
});
// QA reads and drives the state here.
Object.assign(window, { __terrarium: { env, S, G, mist, holdMist, dab, setPlants: act.plants, setLight: act.light } });
