// Terrarium: the toy's module, loaded by index.html.
// The jar and its wet glass are ray-marched; garden.js draws the garden in three.js.
import { initPage, whenVisible, reduced, stage as mark, pageReady } from '../shared/stim.js';
import { intro as playIntro } from '../shared/intro.js';
import { environment } from '../shared/environment.js';
import { createGarden } from './garden.js';
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
// The jar is one profile, a radius over height, turned round the axis.
// An apothecary jar: a belly, a round shoulder, a neck with a rolled lip,
// and a lid of solid glass: a flange, a low dome, a stem and a ball knob.
// The profile exists twice, in GLSL and in JS, and both must match.
// top: the knob's top. rmax: the belly. base: the radius at the floor.
// foot: the top of the solid base. lid: the bottom of the solid lid.
// neck: where the spray starts. shoulder: where condensation gathers.
const SHAPE = { top: 1.705, rmax: 0.62, base: 0.57, foot: 0.07, lid: 1.43, neck: 1.43, shoulder: 1.05 };
const JAR_GLSL = `
  float r = 0.34;
  if (y < 1.0) r = 0.62;
  else if (y < 1.3) { float e = (y - 1.0) / 0.3; r = 0.34 + 0.28 * sqrt(max(1.0 - e * e, 0.0)); }
  float l = (y - 1.405) / 0.025;
  if (abs(l) < 1.0) r = max(r, 0.34 + 0.03 * sqrt(1.0 - l * l));
  if (y > 1.43) {
    float fl = (y - 1.445) / 0.016, dm = (y - 1.46) / 0.1, kb = y - 1.65;
    r = abs(fl) < 1.0 ? 0.37 + 0.02 * sqrt(1.0 - fl * fl) : 0.37 * sqrt(max(1.0 - dm * dm, 0.0));
    r = max(r, y < 1.63 ? 0.035 : 0.0);
    r = max(r, sqrt(max(0.003025 - kb * kb, 0.0)));
  }`;
function jarShape(y) {
  let r = 0.34;
  if (y < 1.0) r = 0.62;
  else if (y < 1.3) { const e = (y - 1.0) / 0.3; r = 0.34 + 0.28 * Math.sqrt(Math.max(1 - e * e, 0)); }
  const l = (y - 1.405) / 0.025;
  if (Math.abs(l) < 1) r = Math.max(r, 0.34 + 0.03 * Math.sqrt(1 - l * l));
  if (y > 1.43) {
    const fl = (y - 1.445) / 0.016, dm = (y - 1.46) / 0.1, kb = y - 1.65;
    r = Math.abs(fl) < 1 ? 0.37 + 0.02 * Math.sqrt(1 - fl * fl) : 0.37 * Math.sqrt(Math.max(1 - dm * dm, 0));
    r = Math.max(r, y < 1.63 ? 0.035 : 0);
    r = Math.max(r, Math.sqrt(Math.max(0.003025 - kb * kb, 0)));
  }
  return r;
}
// The jar's radius at a height, with the base corner rounded; -1 off the glass.
const jarR = y => (y < 0 || y > SHAPE.top ? -1 : jarShape(y) - 0.05 * (1 - Math.min(1, y / 0.09)) ** 2);
// The grow light: a bar above and behind the jar.
const LY = 1.95, LZ = -0.9, LW = 0.7;
const FOC = 1.55;
// The camera: its height, the point it looks at, and its distance.
// A narrow frame steps the camera back, so the jar keeps its margin.
const CAM_Y = 1.35, AIM_Y = 0.86, CAM_D = 3.45, CAM_ASP = 0.7;
// Metres in one scene unit, and the top of the glass in units.
const METRE = 0.2, GLASS_TOP = SHAPE.top;
const f = x => x.toFixed(4);
// The camera, as statements. It needs uv and asp, and gives ro and rd.
const CAM = `
  float camD = ${f(CAM_D)} * max(1.0, ${f(CAM_ASP)} / asp);
  vec3 ro = vec3(0.0, ${f(CAM_Y)}, camD);
  vec3 fw = normalize(vec3(0.0, ${f(AIM_Y)}, 0.0) - ro);
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  vec2 sp = (uv - 0.5) * vec2(asp, 1.0);
  vec3 rd = normalize(fw * ${f(FOC)} + rt * sp.x + up * sp.y);`;

// The jar's skin as GLSL functions. Both passes paste it, so they agree to the pixel.
const JAR_LIB = `
float jarR(float y) {
  if (y < 0.0 || y > ${f(SHAPE.top)}) return -1.0;
  ${JAR_GLSL}
  float b = 1.0 - min(1.0, y / 0.09);
  return r - 0.05 * b * b;
}
// Outside the glass this is positive; inside it is negative.
float jarF(vec3 p) {
  float r = jarR(p.y);
  if (r < 0.0) return max(abs(p.y - ${f(SHAPE.top / 2)}) - ${f(SHAPE.top / 2)}, 0.004);
  float s = (jarR(min(p.y + 0.004, ${f(SHAPE.top)})) - jarR(max(p.y - 0.004, 0.0))) / 0.008;
  return (length(p.xz) - r) / min(sqrt(1.0 + s * s), 8.0);
}
vec3 jarN(vec3 p) {
  float y0 = clamp(p.y - 0.003, 0.0, ${f(SHAPE.top)}), y1 = clamp(p.y + 0.003, 0.0, ${f(SHAPE.top)});
  float dr = (jarR(y1) - jarR(y0)) / max(y1 - y0, 1e-4);
  float rho = max(length(p.xz), 1e-4);
  return normalize(vec3(p.x / rho, -dr, p.z / rho));
}
// The first point where a ray meets the glass from outside, or -1.
float jarHit(vec3 ro, vec3 rd, out vec3 n) {
  n = vec3(0.0, 1.0, 0.0);
  float a = dot(rd.xz, rd.xz), b = dot(ro.xz, rd.xz), c = dot(ro.xz, ro.xz) - ${f(SHAPE.rmax * SHAPE.rmax)}, h = b * b - a * c;
  if (h <= 0.0) return -1.0;
  float sh = sqrt(h), t = max((-b - sh) / a, 0.0), t1 = (-b + sh) / a, tp = t;
  bool hit = false;
  for (int i = 0; i < 96; i++) {
    float fv = jarF(ro + rd * t);
    if (fv < 0.0) { hit = true; break; }
    tp = t;
    t += max(fv * 0.5, 0.002);
    if (t > t1) break;
  }
  if (!hit) return -1.0;
  for (int i = 0; i < 6; i++) { float tm = (tp + t) * 0.5; if (jarF(ro + rd * tm) < 0.0) t = tm; else tp = tm; }
  n = jarN(ro + rd * t);
  return t;
}
// Where a ray inside the jar leaves it again.
float jarExit(vec3 ro, vec3 rd, float t) {
  float tp = t;
  for (int i = 0; i < 96; i++) {
    float fv = jarF(ro + rd * t);
    if (fv > 0.0) break;
    tp = t;
    t += max(-fv * 0.5, 0.002);
  }
  for (int i = 0; i < 6; i++) { float tm = (tp + t) * 0.5; if (jarF(ro + rd * tm) > 0.0) t = tm; else tp = tm; }
  return t;
}`;

// The jar's outer skin, as statements. It gives jt (-1 for a miss) and jn.
const JAR = `
  vec3 jn;
  float jt = jarHit(ro, rd, jn);`;

const SCENE = `
uniform vec3 uLampC;
uniform float uSpray;
// The garden, drawn by three.js from this same eye: linear light, alpha for cover.
uniform sampler2D tGarden;
const vec3 LP = vec3(0.0, ${f(LY)}, ${f(LZ)});
// Green glass: red and blue fade first, per unit of glass crossed.
const vec3 GLASS_ABS = vec3(5.0, 1.4, 3.6);
${JAR_LIB}

float teH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float teN(vec2 p) {
  vec2 i = floor(p), u = fract(p);
  u = u * u * (3.0 - 2.0 * u);
  return mix(mix(teH(i), teH(i + vec2(1.0, 0.0)), u.x), mix(teH(i + vec2(0.0, 1.0)), teH(i + vec2(1.0, 1.0)), u.x), u.y);
}
// The grow light at a point: its colour over the square of the distance.
vec3 teLamp(vec3 p) { vec3 d = LP - p; return uLampC * 3.0 / dot(d, d); }

// Reflections see the bar wider and dimmer, so a thin highlight cannot alias.
float gSoft = 0.0;
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
    float sh = (1.0 - smoothstep(${f(SHAPE.rmax * 0.75)}, ${f(SHAPE.rmax * 1.2)}, rr)) * (1.0 - smoothstep(${f(SHAPE.top - 0.2)}, ${f(SHAPE.top)}, yy));
    float contact = smoothstep(${f(SHAPE.base - 0.02)}, ${f(SHAPE.base + 0.25)}, length(P.xz));
    vec3 base = vec3(0.016, 0.022, 0.017) * (0.8 + 0.4 * teN(P.xz * 3.0));
    c = base * (teLamp(P) * lit * mix(vec3(1.0), vec3(0.25, 0.55, 0.3), sh) + vec3(0.03, 0.045, 0.035)) * (0.35 + 0.65 * contact);
  } else if (tw < 1e8) {
    vec3 P = o + d * tw;
    vec2 g = P.xy - vec2(0.0, ${f(LY)});
    c = vec3(0.006, 0.016, 0.011) + uLampC * 0.022 * exp(-length(g * vec2(0.6, 1.0)) * 1.3);
  }
  // Two soft panels stand out of frame, left and right.
  // The glass reflects them as tall strips down the belly.
  if (abs(d.x) > 1e-3) {
    float tx = (sign(d.x) * 2.6 - o.x) / d.x;
    if (tx > 0.0 && tx < tHit) {
      vec3 P = o + d * tx;
      float k = smoothstep(0.0, 0.5, P.y - 0.1) * smoothstep(0.0, 0.5, 2.3 - P.y) * smoothstep(0.0, 0.6, P.z - 0.4) * smoothstep(0.0, 0.6, 3.2 - P.z);
      c = mix(c, vec3(0.2, 0.21, 0.2), k);
      tHit = tx;
    }
  }
  // The bar: a dark housing over a glowing strip, and a soft halo.
  if (d.z < -1e-4) {
    float tl = (${f(LZ)} - o.z) / d.z;
    if (tl > 0.0 && tl < tHit) {
      vec3 P = o + d * tl;
      vec2 q = vec2(max(abs(P.x) - ${f(LW)}, 0.0), P.y - ${f(LY)});
      float dl = length(q);
      if (q.x < 0.001 && q.y > 0.02 && q.y < 0.07) c = vec3(0.012, 0.013, 0.012);
      // A soft edge on the strip keeps its reflections in the glass from breaking up.
      c = mix(c, uLampC * 5.0 * 0.034 / (0.034 + gSoft), smoothstep(0.034 + gSoft, 0.012, dl));
      c += uLampC * 0.09 * exp(-dl * 10.0);
    }
  }
  return c;
}

// Solid glass: the lid, its knob and the base. The view bends hard through it.
vec3 teSolid(vec3 p, vec3 rd, vec3 n, float cv, float F, vec3 refl, vec4 gd) {
  vec3 rr = refract(rd, n, 0.667);
  vec3 through = teBack(p, normalize(rr * 1.6 - rd * 0.6));
  // Through the base, the soil above darkens the view.
  if (p.y < ${f(SHAPE.foot)}) through = mix(mix(through, vec3(0.012, 0.01, 0.008), 0.6), gd.rgb * 0.5, gd.a * 0.8);
  vec3 c = through * exp(-GLASS_ABS * (0.08 + 0.25 * (1.0 - cv))) * (1.0 - F) + refl * F;
  // Light caught inside the glass glows along its edges.
  return c + uLampC * vec3(0.6, 1.0, 0.75) * 0.05 * pow(1.0 - cv, 2.0);
}

vec3 envScene(vec2 uv) {
  float asp = uRes.x / uRes.y;
  ${CAM}
  ${JAR}
  if (jt < 0.0) return teBack(ro, rd);
  vec3 p = ro + rd * jt;
  float cv = max(dot(jn, -rd), 0.0);
  float F = 0.04 + 0.96 * pow(1.0 - cv, 5.0);
  gSoft = 0.06;
  vec3 refl = teBack(p, reflect(rd, jn));
  gSoft = 0.0;
  // The garden through the wall: the wall bends the view a hair.
  vec4 gd = texture(tGarden, uv - vec2(dot(jn, rt) / asp, dot(jn, up)) * 0.004);
  if (p.y > ${f(SHAPE.lid)} || p.y < ${f(SHAPE.foot)}) return teSolid(p, rd, jn, cv, F, refl, gd);
  // The far wall of the jar, seen where the garden leaves the view clear.
  float tE = jarExit(ro, rd, jt + 0.004);
  vec3 pb = ro + rd * tE, nb = -jarN(pb);
  vec3 inside = mix(teBack(pb, rd) * 0.85 + uLampC * 0.03 * pow(1.0 - abs(dot(nb, rd)), 3.0), gd.rgb, gd.a);
  // The garden lies about halfway through the jar; damp air softens the back wall more.
  float t = mix(tE, jt + 0.35 * (tE - jt), gd.a);
  // The spray: a fine cone of mist from the lid, lit by the grow light.
  if (uSpray > 0.002) {
    float mist = 0.0, len = t - jt;
    for (int i = 0; i < 8; i++) {
      vec3 q = ro + rd * (jt + len * (float(i) + 0.5) / 8.0);
      float drop = ${f(SHAPE.neck)} - q.y, w = 0.03 + 0.22 * max(drop, 0.0);
      float grain = 0.6 + 0.8 * teN(vec2(length(q.xz) * 30.0, q.y * 12.0 + uTime * 6.0));
      mist += exp(-dot(q.xz, q.xz) / (w * w)) * smoothstep(-0.1, 0.1, drop) * smoothstep(1.3, 0.2, drop) * grain / (1.0 + 8.0 * w);
    }
    inside += (vec3(0.04, 0.05, 0.05) + uLampC * 0.05) * mist * len * uSpray * 2.2;
  }
  // Damp air in the jar softens what lies deep in it.
  vec3 damp = vec3(0.012, 0.024, 0.018) + uLampC * 0.012;
  inside = mix(inside, damp, 1.0 - exp(-(t - jt) * 0.35));
  // The wall is 5 mm of glass. Near the edge the eye looks along it,
  // so the light crosses far more glass and the rim turns deep green.
  float r = max(jarR(p.y), 0.05), b = r * sqrt(1.0 - cv * cv), ri = r - 0.025;
  float cross1 = sqrt(max(r * r - b * b, 0.0)) - sqrt(max(ri * ri - b * b, 0.0));
  if (b > ri) cross1 = 2.0 * sqrt(max(r * r - b * b, 0.0));
  vec3 c = inside * (1.0 - F) * exp(-GLASS_ABS * cross1 * 2.0) + refl * F;
  // The grow light comes through the glass at its edges: a long bright rim.
  c += uLampC * vec3(0.7, 1.0, 0.8) * 0.05 * pow(1.0 - cv, 4.0) * smoothstep(-0.2, 1.4, p.y);
  return c;
}`;

// The jar's glass step for the runner's pane pass: shared/wetglass.js on the curved skin.
// tWipe holds the finger's clear stripes, unrolled round the jar.
const PANE_HEAD = `
uniform sampler2D tWipe;
uniform float uMistFog, uFront;
${JAR_LIB}`;
// jq unrolls the glass: arc length round the jar, then height, in metres.
const GLASS = `
    ${CAM}
    ${JAR}
    if (jt > 0.0) {
      vec3 jp = ro + rd * jt;
      float jcos = max(dot(jn, -rd), 0.0), ang = atan(jp.x, jp.z);
      vec2 jq = vec2(ang * max(jarR(jp.y), 0.05), jp.y) * ${f(METRE)};
      float wipe = texture(tWipe, vec2(ang / 6.28318 + 0.5, jp.y / ${f(GLASS_TOP)})).r;
      // Rest fog comes back down from the lid; the mist fogs it all.
      float jfog = max(uMistFog, uFog * smoothstep(uFront - 0.06, uFront + 0.18, ${f(GLASS_TOP)} - jp.y));
      float jwet = uWet * (1.0 - wipe);
      WgPane g = wgPane(jq, uZoom, uM, uFlow, jwet, uWind, 1.0, jfog * (1.0 - wipe), uPatch, (jp.y - ${f(SHAPE.shoulder)}) * 0.25);
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
      float jm = smoothstep(0.0, 0.2, jcos) * smoothstep(${f(SHAPE.lid)}, ${f(SHAPE.lid - 0.03)}, jp.y) * smoothstep(${f(SHAPE.foot)}, ${f(SHAPE.foot + 0.03)}, jp.y);
      col = mix(col, v, jm);
      rim = g.rim * jm; cover = g.cover * jm; fog = g.fog * jm;
    }`;

/* ---------- state ---------- */
const REST_FOG = 0.14;
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
  const ro = [0, CAM_Y, CAM_D * Math.max(1, CAM_ASP / asp)];
  const fw = norm(sub([0, AIM_Y, 0], ro)), rt = norm(cross(fw, [0, 1, 0])), up = cross(rt, fw);
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
  // March to the glass, as jarHit does.
  const F = p => { const r = jarR(p[1]); return r < 0 ? Math.max(Math.abs(p[1] - GLASS_TOP / 2) - GLASS_TOP / 2, 0.004) : Math.hypot(p[0], p[2]) - r; };
  const at = t => ro.map((x, i) => x + rd[i] * t);
  let t = 0, tp = 0, hit = false;
  for (let i = 0; i < 200 && t < 12; i++) {
    const v = F(at(t));
    if (v < 0) { hit = true; break; }
    tp = t;
    t += Math.max(v * 0.5, 0.002);
  }
  if (!hit) t = -1;
  else for (let i = 0; i < 8; i++) { const m = (tp + t) / 2; if (F(at(m)) < 0) t = m; else tp = m; }
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
const G = { held: false, dose: 0, mistFog: 0, front: 0, spray: 0, wake: 0 };
// grow: what the jar keeps between visits. Each mist adds a little.
const GROW_KEY = 'stimming.terrarium.grow';
let grow = 0;
try { grow = Math.min(1, Math.max(0, +localStorage.getItem(GROW_KEY) || 0)); } catch (err) { /* Storage is off. */ }
function saveGrow() { try { localStorage.setItem(GROW_KEY, grow.toFixed(3)); } catch (err) { /* Storage is off. */ } }
// A poke sets a fern swinging: each value is [phase time, strength].
const sway = [[0, 0], [0, 0], [0, 0]], swayNow = [0, 0, 0];

const canvas = document.createElement('canvas');
stage.prepend(canvas);
let env = null;
/** @type {ReturnType<typeof createGarden> | null} */
let garden = null;
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
    textures: { tGarden: () => garden?.texture() ?? null },
    // The garden draws first, on the same context, when it changed.
    before: (w, h) => garden?.render(w, h),
    uniforms: {
      uLampC: () => lampColour(),
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
// The garden shares the runner's context and its eye.
garden = createGarden(canvas, env.gl, {
  fov: 2 * Math.atan(0.5 / FOC) * 180 / Math.PI,
  eye: asp => [0, CAM_Y, CAM_D * Math.max(1, CAM_ASP / asp)],
  aim: [0, AIM_Y, 0],
  lamp: [0, LY, LZ],
});
// Hands the garden what it shows; it redraws only on a change.
// Wake goes in steps of 0.02, so a wake redraws the garden ten times a second, not sixty.
const feed = () => garden.set({ wake: Math.round(G.wake * 50) / 50, grow, plants, lamp: lampColour(), sway: swayNow });
// Only the glass, the glow, the grade and the output run here.
Object.assign(S.on, { water: false, sky: false, air: false, flare: false });
Object.assign(S, { wet: 0, wind: 0, fog: REST_FOG, patch: 0.15, defocus: 0, zoom: 0.9, bloom: 0.55, thr: 0.8, orbs: 0, vig: 0.55, grain: 0.035, expo: 1.2, flGain: 0, tintK: 0.3 });
S.frame = false;
function relight() {
  feed();
  const c = lampColour(), m = Math.max(...c);
  S.lightColor = c.map(x => x / m * 0.6);
  S.light = lampOnFrame(canvas.clientWidth / Math.max(1, canvas.clientHeight));
  env.touch();
}
new ResizeObserver(relight).observe(canvas);

/* ---------- the tick ---------- */
// It runs while the glass changes, then stops.
let tickRaf = 0, tickT = 0;
const wakeWant = () => Math.min(1, G.dose * 1.4);
const busy = () => G.held || G.spray > 0 || Math.abs(wakeWant() - G.wake) > 0.002 || sway.some(w => w[1] > 0) || G.dose > 0 || G.mistFog > 0.003 || G.front > 0 || wipeLive || S.wet > 0;
function step(dt) {
  // Fog return speeds the whole cycle up or slows it down.
  const pace = 0.4 + 1.6 * fogBack;
  if (G.held) {
    G.dose = Math.min(1, G.dose + dt * 0.45);
    G.mistFog += (0.65 - G.mistFog) * (1 - Math.exp(-dt / 0.35));
    G.front = GLASS_TOP;
  } else {
    G.mistFog = G.mistFog > 0.003 ? G.mistFog * Math.exp(-dt * pace / 8) : 0;
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
  // The green wakes in about five seconds, and dozes off slowly as the jar dries.
  const ww = wakeWant();
  G.wake += (ww - G.wake) * (1 - Math.exp(-dt / (ww > G.wake ? 1.6 : 12)));
  if (Math.abs(ww - G.wake) <= 0.002) G.wake = ww;
  // A poked fern swings and settles.
  sway.forEach((w, i) => {
    if (w[1] <= 0) { swayNow[i] = 0; return; }
    w[0] += dt;
    w[1] = w[1] * Math.exp(-dt / 0.7);
    if (w[1] < 0.004) w[1] = 0;
    swayNow[i] = w[1] * Math.sin(w[0] * 16);
  });
}
function tick(t) {
  const dt = tickT ? Math.min(0.05, (t - tickT) / 1000) : 0.016;
  tickT = t;
  step(dt);
  feed();
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
  Object.assign(G, { dose: 1, mistFog: 0, front: 0, wake: 1 });
  S.wet = 1;
  feed();
  env.touch();
  clearTimeout(dryTimer);
  dryTimer = setTimeout(() => { Object.assign(G, { dose: 0, wake: 0 }); S.wet = 0; wipeK.fill(0); wipeLive = false; wipeDirty = true; feed(); env.touch(); }, 40000);
}
function holdMist(on) {
  if (on) { grow = Math.min(1, grow + 0.05); saveGrow(); }
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
act.plants = v => { plants = PLANTS[v] ?? 0; feed(); env.touch(); };
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
// The fern nearest a tap swings, if the tap lands within reach of it.
function poke(cx, cy) {
  const r = canvas.getBoundingClientRect(), asp = r.width / Math.max(1, r.height);
  const { ro, fw, rt, up } = camera(asp);
  let best = -1, bd = 1e9;
  for (const { i, at } of garden.crowns()) {
    const v = sub(at, ro), z = dot(v, fw);
    const x = r.left + (0.5 + dot(v, rt) / z * FOC / asp) * r.width, y = r.top + (0.5 - dot(v, up) / z * FOC) * r.height;
    const dd = Math.hypot(x - cx, y - cy);
    if (dd < bd) { bd = dd; best = i; }
  }
  if (best < 0 || bd > r.height * 0.14) return;
  sway[best] = [0, reduced() ? 0 : 0.12];
  wake();
}
function endPress(e) {
  if (!press) return;
  clearTimeout(press.timer);
  if (press.kind === 'hold') holdMist(false);
  if (press.kind === 'press' && e?.type === 'pointerup') poke(e.clientX, e.clientY);
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
Object.assign(window, { __terrarium: { env, S, G, sway, mist, holdMist, dab, poke, setPlants: act.plants, setLight: act.light, setGrow: v => { grow = v; feed(); env.touch(); } } });
