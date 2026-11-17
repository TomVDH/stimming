// @ts-nocheck
// Load order: world/farcountry runs first.
import '../world/farcountry.ts';
import * as THREE from 'three';
import { STORM_K, STORM_SOFT, STORMS, GIANT_RANGE } from '../../storms.js';
import { rad, scene } from '../setup.ts';
import { U } from '../world/uniforms.ts';
import { HEAD } from '../sky/atmosphere.ts';
import { AIR } from '../sky/air.ts';
import { IMP_GLSL, IMP_U } from '../sky/impacts.ts';
import { SHAFT_GLSL, SHAFT_U } from './shafts.ts';
import { BAND } from './bands.ts';
import { sky } from '../sky/dome.ts';
import { CURVE, PLANET_R } from '../world/ground.ts';
import { polar } from '../world/farcountry.ts';

/* ---------- clouds: low heaps far out, one storm tower beyond ---------- */
// Each cloud is one card that turns about the vertical to face the eye.
// The shader shapes a lumpy body and fakes its normal from a pillow depth.
// aC: base centre and half width. aS: height, kind (0 heap, 1 tower), seed.
// uCloudC: the clouds' own slow clock, in sim seconds.
// uFl: four lightning flashes in the storms: world place, light level.
// uFlR: each flash's reach in metres.
export const CLOUD_U = { uVol: { value: null }, uCloudT: { value: 0 }, uCloudC: { value: 0 }, uStormK: { value: new THREE.Vector4(...STORM_K) }, uStormSoft: { value: STORM_SOFT }, uFl: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] }, uFlR: { value: new THREE.Vector4(4000, 4000, 4000, 4000) }, ...IMP_U };
// The sky's deck shares the clouds' volume and clock.
sky.material.uniforms.uVol = CLOUD_U.uVol;
sky.material.uniforms.uCloudC = CLOUD_U.uCloudC;
const CLOUD_FS = /* glsl */`precision highp sampler3D;
uniform sampler3D uVol;
varying vec2 vUv;
varying vec3 vP, vR, vF;
// The card's size, kind and seed do not interpolate.
// An interpolated seed wobbles one ulp per pixel.
// The sin hash turns that wobble into new turrets, and the tops flicker.
flat varying vec4 vS;
#define CSHADE
${HEAD}
${AIR}
${IMP_GLSL}
${SHAFT_GLSL}
// Billows from the baked volume: R is Perlin-Worley, G is fine Worley.
// uCloudT runs the reset timelapse; uCloudC boils each cloud at its own rate.
uniform float uCloudT, uCloudC;
uniform vec4 uFl[4];
uniform vec4 uFlR;
// Lightning lights a storm from inside, after Window seat.
// A hot core round the flash; a wide glow fills the tower.
// Thick body glows deep in; thin edges let the light out.
// Lightning's colour inside cloud, as Window seat's: a cold, slightly violet blue-white.
#define FLASH_C vec3(0.64, 0.72, 1.0)
vec3 flashIn(vec3 P, float F, float H) {
  vec3 L = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    if (uFl[i].w < 0.001) continue;
    float fd = length(P - uFl[i].xyz), r = uFlR[i];
    L += FLASH_C * uFl[i].w * (1.8 * exp(-fd * fd / (r * r)) + 0.5 * exp(-fd / (2.2 * r)));
  }
  // A bright sky needs a stronger flash to show.
  return L * (0.35 + 0.65 * smoothstep(0.0, 0.25 * H, F)) * mix(3.0, 1.0, uStars);
}
varying float vLife;
float bt(float sd) { return uCloudT + uCloudC * 0.0012 * (0.6 + fract(sd * 0.73)); }
float bil(vec2 p, float sd) { float t = bt(sd); return texture(uVol, vec3(p + vec2(t * 0.4, 0.0), sd * 0.37 + t * 0.06)).r; }
float cell(vec2 p, float sd) { float t = bt(sd); return texture(uVol, vec3(p + vec2(t * 0.4, 0.0), sd * 0.61 + 0.5 + t * 0.06)).g; }
float hsh(float n, float sd) { return fract(sin(n * 91.7 + sd * 13.13) * 43758.5453); }
// The body: positive inside, in metres from the edge.
float body(vec2 X) {
  float W = vS.x, H = vS.y, sd = vS.w;
  float x = X.x, y = X.y;
  float F;
  if (vS.z < 0.5) {
    // A heap: five turrets of mixed height on one flat base.
    // The middle turrets stand tallest.
    float lump = bil(X / (H * 0.9), sd);
    float fine = cell(X / (H * 0.3), sd);
    float top = 0.0;
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float c = W * (-0.6 + 0.3 * fi + 0.14 * (hsh(fi, sd) - 0.5));
      float r = W * (0.24 + 0.16 * hsh(fi + 7.0, sd));
      float hh = H * (0.5 + 0.5 * hsh(fi + 13.0, sd)) * (1.0 - 0.22 * abs(fi - 2.0));
      float t = (x - c) / r;
      top = max(top, hh * sqrt(max(1.0 - t * t, 0.0)));
    }
    F = min(top - y + (lump - 0.45) * 0.4 * H + (fine - 0.5) * 0.12 * H, y + 40.0 - 160.0 * bil(X / 2500.0, sd + 3.0));
    F = min(F, W * 1.18 - abs(x));
    // A heap at the end of its cycle frays into wisps and goes.
    F -= (1.0 - smoothstep(0.0, 0.4, vLife)) * H * (0.9 - 0.4 * lump);
  } else {
    // A thunderhead: a broad, boiling column under a flat anvil.
    // The anvil runs downwind to the right and thins at its far end.
    float k = y / H;
    // Each storm has its own build: girth, lean, anvil reach and age.
    // About one in three is still a towering cumulus, with no anvil yet.
    float vGirth = mix(0.65, 1.25, hsh(21.0, sd)), vReach = mix(0.45, 1.15, hsh(22.0, sd));
    // A giant is always a mature storm.
    float vAnv = max(step(0.33, hsh(23.0, sd)), step(60000.0, H)), vTop = mix(0.72, 0.9, hsh(24.0, sd));
    float lean = W * mix(-0.04, 0.16, hsh(25.0, sd)) * k * k;
    float cx = x - lean;
    float lump = bil(X / (W * 0.5), sd);
    float fine = cell(X / (W * 0.22), sd);
    // The column widens as it climbs; its sides boil in turrets.
    float colHalf = W * mix(0.17, 0.36, smoothstep(0.0, 0.7, k)) * vGirth;
    // A young tower ends in a big boiling dome; a mature one feeds its anvil.
    float colTop = mix(H * vTop, H * 0.84, vAnv);
    float colF = min(colHalf - abs(cx), colTop - y);
    colF = min(colF, y + 150.0) + (lump - 0.45) * W * 0.26 + (fine - 0.5) * W * 0.06;
    // The overshooting top: a dome above the column's core.
    float od = (cx + W * 0.04) / (W * 0.24);
    float domeF = colTop - H * 0.04 + H * 0.2 * sqrt(max(1.0 - od * od, 0.0)) - y + (lump - 0.5) * H * 0.06;
    domeF = min(min(domeF, y - colTop * 0.7), W * 0.24 * vGirth - abs(cx + W * 0.04));
    // The anvil: a lens under the tropopause, long downwind.
    // It is thickest over the column and thins toward both ends.
    float ax = (cx - W * 0.3 * vReach) / (W * 0.68 * vReach);
    float far_ = smoothstep(0.0, W, cx);
    float envA = sqrt(max(1.0 - ax * ax, 0.0));
    float thick = H * 0.085 * envA * (1.0 - 0.45 * far_) * vAnv;
    float mid = H * (0.83 + 0.03 * far_);
    // The noise only works inside the lens.
    float anvF = thick - abs(y - mid) + ((lump - 0.5) * H * 0.07 + (fine - 0.5) * H * 0.025) * envA - (1.0 - envA) * H * 0.05 - (1.0 - vAnv) * H;
    F = max(max(colF, anvF), domeF);
    // Keep the whole shape inside the card.
    F = min(F, W * 0.99 - abs(x));
  }
  return F;
}
// The ship's impacts glow through a heap's underside from beyond it.
// The glow rises softly off the floor.
// It fades up into the body.
vec3 impCloud(vec3 P, vec3 N, vec3 V, vec2 X, float F) {
  float on = 0.0;
  for (int i = 0; i < 5; i++) on += uImp[i].w;
  if (on < 0.001) return vec3(0.0);
  float H = vS.y, yk = X.y / H;
  float band = smoothstep(0.0, 0.3, yk) * (1.0 - smoothstep(0.3, 0.75, yk));
  // The light fades in from every edge.
  // The flat floor then shows no line.
  band *= smoothstep(0.0, 0.12 * H, F);
  if (band < 0.001) return vec3(0.0);
  // Thick body swallows the light.
  // Thin parts let it through.
  float trans = exp(-sqrt(max(F, 0.0) * H) / (0.25 * H));
  float s = 0.0;
  for (int i = 0; i < 5; i++) {
    float w = uImp[i].w;
    if (w < 0.001) continue;
    vec3 b = uImp[i].xyz - P, Ls = normalize(b);
    // A site behind the heap shines through it toward the eye.
    float back = pow(max(dot(V, Ls), 0.0), 3.0);
    float face = 0.1 + 0.4 * max(dot(N, Ls), 0.0);
    s += w * 9.0e8 / (dot(b.xz, b.xz) + 9.0e8) * (0.3 * face + back);
  }
  // The air between dims the glow, as it dims the cloud.
  return uImpC * s * band * trans * mix(5.0, 2.5, uStars) * airT(P) * (1.0 - 0.5 * k2hazeAmount(P));
}
void main() {
  float W = vS.x, H = vS.y;
  vec2 X = vec2(vUv.x * W, vUv.y * H);
  // The blast pushes the cloud's pattern outward.
  float rim; vec3 push;
  vec3 hl0 = cloudHit(vP, 0.5, rim, push);
  X -= vec2(dot(push, vR), push.y);
  // A tower leans away as the blast wave rolls through it, slow and heavy.
  if (vS.z > 0.5) {
    float tw = uStarT - uHitP.w, rw = length(vP - uHitP.xyz);
    // The wave front reaches the tower and passes; the push stays, easing back over a minute.
    float front = uBk > 0.0 && tw > 0.0 ? smoothstep(-25000.0, 5000.0, 7000.0 * tw - rw) : 0.0;
    float wave = front * exp(-max(tw - rw / 7000.0, 0.0) / 60.0);
    // The top shears hard away from the hit and the anvil slumps; a slow swell runs up the column.
    float away = sign(dot(vP - uHitP.xyz, vR));
    X.x -= wave * away * 0.14 * X.y;
    X.y += wave * 0.08 * X.y;
    X += wave * H * vec2(0.012 * sin(X.y / H * 3.0 + tw * 0.35), 0.008 * sin(X.x / H * 2.5 - tw * 0.3));
  }
  float F = body(X);
  float soft = H * 0.05;
  // The base melts into the haze, so the blast's push never shows a hard bottom edge.
  // The blast's push clears the heap instead of shoving a hard tuft.
  float tc = uStarT - uHitP.w;
  float a = smoothstep(0.0, soft, F) * smoothstep(-0.02 * H, 0.18 * H, vUv.y * H) * (1.0 - 0.7 * smoothstep(600.0, 4000.0, length(push)) * smoothstep(1.0, 9.0, tc));
  // The void blows the cloud away where it reaches; idle until a hit.
  a *= 1.0 - voidIn(vP);
  if (a < 0.004) discard;
  // Pillow depth toward the eye gives a normal.
  float e = H * 0.03;
  float pd = sqrt(max(F, 0.0) * H) ;
  float px = sqrt(max(body(X + vec2(e, 0.0)), 0.0) * H);
  float py = sqrt(max(body(X + vec2(0.0, e)), 0.0) * H);
  vec3 N = normalize(vR * (pd - px) / e + vec3(0.0, (pd - py) / e, 0.0) - vF * 1.2);
  vec3 P = vP - vF * pd * 0.3;
  // Three taps toward the key light give a self shadow.
  // The sun shapes the cloud until it is well down; then the moon does.
  // At blue hour the key light is the moon, but the tops still see the sun.
  vec3 Ls = uSunD.y > -0.12 ? uSunD : uSun;
  vec2 l2 = vec2(dot(Ls, vR), Ls.y);
  l2 = length(l2) > 1e-3 ? normalize(l2) : vec2(0.0, 1.0);
  float occ = max(body(X + l2 * H * 0.12), 0.0) + max(body(X + l2 * H * 0.3), 0.0) + 0.5 * max(body(X + l2 * H * 0.6), 0.0);
  float sh = exp(-occ / (H * 0.35));
  // High tops keep the sun after it sets.
  // A high top sees the sun after the ground has lost it, as on the storms.
  // The sun's height at the cloud: the planet's curve tilts its ground toward or away from the sun.
  float sEl = asin(clamp(uSunD.y + dot(uSunD.xz, P.xz - cameraPosition.xz) / ${PLANET_R.toFixed(1)}, -1.0, 1.0)), sDip = sqrt(2.0 * max(P.y, 0.0) / ${PLANET_R.toFixed(1)});
  float litTop = smoothstep(-sDip - 0.006, -sDip + 0.006, sEl) * (1.0 - smoothstep(-0.026, 0.026, sEl));
  vec3 sunC = mix(uSunC, uCloudSun, smoothstep(1500.0, 11000.0, P.y)) + uGlowC * vec3(1.0, 0.5, 0.28) * 1.6 * litTop;
  // The trail, the blast cloud and the other clouds shade this one.
  sunC *= 1.0 - 0.8 * shadeAt(P);
  float thin = 1.0 - smoothstep(0.0, soft * 10.0, F);
  vec3 V = normalize(P - cameraPosition);
  // Light through the cloud, as the comet tail takes it: Beer for the beam,
  // a soft term for light scattered many times, a forward and a back lobe, powder edges.
  float mu = dot(V, Ls);
  float ph = 0.5 * (1.0 - 0.36) / pow(1.0 + 0.36 - 1.2 * mu, 1.5) + 0.5 * (1.0 - 0.04) / pow(1.0 + 0.04 + 0.4 * mu, 1.5);
  float od = occ / (H * 0.3), Tl = exp(-od), Tm = exp(-0.18 * od);
  float powder = mix(1.0, 1.0 - exp(-6.0 * pd / H), 0.5 * (1.0 - max(mu, 0.0)));
  float wrap = max(dot(N, Ls) * 0.6 + 0.4, 0.0);
  // The side away from the light stays dark, as on the comet's smoke.
  // Light scattered many times keeps the shaded side warm and soft.
  vec3 col = sunC * (Tl * 0.75 + Tm * 0.28) * ph * powder * (0.5 + 0.5 * wrap) * 1.5;
  // Backlit cloud glows through its whole body, its thin rim most.
  float back = max(dot(V, Ls), 0.0);
  col += sunC * (0.15 * back * back + 0.35 * thin * pow(back, 6.0));
  // A soft sky term: noisy normals must not swing between horizon and zenith light.
  vec3 amb = mix(uHorC * 0.85, uZenC * 1.1, 0.4 + 0.2 * N.y) * 1.05 + uCloudAmb * 0.5;
  col += amb * (0.3 + 0.4 * smoothstep(0.0, 0.35 * H, X.y));
  // The tower keeps some body through seventy kilometres of air.
  // At night the heaps take the moon dimly; they never glow.
  col *= mix(1.0, 0.45, uStars) * (0.55 + 0.45 * smoothstep(0.0, 0.5 * H, X.y));
  // Moonlit tops: the upper faces and thin crowns turn silver, like the tail's upper side.
  col += uSunC * uStars * uMoonK * (0.5 * max(dot(N, uSun), 0.0) + 0.9 * thin) * smoothstep(0.35 * H, 0.9 * H, X.y) * sh;
  // The same air as the ranges: a cloud and a ridge at one distance share one tint.
  col = aerial(col, P);
  // Far cloud sinks further into that air, foot first, crown last (Far haze).
  // Near heaps stay crisp; far towers turn pale and flat.
  float cdk = length(P.xz - cameraPosition.xz);
  col = mix(col, aerialIn(V), uLayer.x * (1.0 - exp(-cdk / 32000.0)) * mix(0.9, 0.5, smoothstep(0.0, 20000.0, P.y)));
  // The blast: its light, thin parts brightest, and the shock rim.
  // It lands after the haze: the flash lights the air on the way too.
  // Faces turned to the hit take it; the far side stays in shadow.
  vec3 hl = cloudHit(P, thin, rim, push);
  vec3 Lh = normalize(uHitP.xyz - P);
  vec2 h2 = vec2(dot(Lh, vR), Lh.y);
  h2 = length(h2) > 1e-3 ? normalize(h2) : vec2(0.0, 1.0);
  float occH = max(body(X + h2 * H * 0.15), 0.0) + max(body(X + h2 * H * 0.4), 0.0);
  float shH = exp(-occH / (H * 0.3));
  // The passing bolt lights the cloud faces near its path.
  if (uBolt.w > 0.001) { vec3 bd = P - uBolt.xyz; col += cloudBoltC() * uBolt.w * 0.35 * (0.3 + 0.7 * max(dot(N, -normalize(bd)), 0.0)) / (1.0 + dot(bd, bd) / 4.0e7); }
  // The burning rock lights the faces turned to it, the nearest most.
  // Thin edges between the eye and the rock glow through.
  if (uRockL.w > 0.001) {
    vec3 rb = uRockL.xyz - P, Lr = normalize(rb);
    vec2 r2 = vec2(dot(Lr, vR), Lr.y);
    r2 = length(r2) > 1e-3 ? normalize(r2) : vec2(0.0, 1.0);
    float occR = max(body(X + r2 * H * 0.15), 0.0) + max(body(X + r2 * H * 0.4), 0.0);
    // A storm takes the rock's light four times further, as the volumes do.
    float rR = uRockR * (vS.z > 0.5 ? 4.0 : 1.0), fall = rR * rR / (dot(rb, rb) + rR * rR);
    float face = (0.08 + 0.92 * max(dot(N, Lr), 0.0)) * (0.25 + 0.75 * exp(-occR / (H * 0.3)));
    float glow = 0.6 * thin * pow(max(dot(V, Lr), 0.0), 4.0);
    col += uAstC * uRockL.w * fall * (face + glow) * (vS.z > 0.5 ? 1.6 : 1.0) * mix(1.0, 0.6, uStars);
  }
  // The rock's glowing sky fills the cloud warm; thin parts toward it glow.
  if (uFill > 0.001) {
    float bk = pow(max(dot(V, normalize(uRockL.xyz - P)), 0.0), 4.0);
    col += uAstC * uFill * (0.12 + 0.45 * bk * (0.4 + 0.6 * thin));
  }
  // Lightning inside the storms punches through the haze.
  if (vS.z > 0.5) col += flashIn(P, F, H);
  // The ship's impacts light the cloud bases from beyond the horizon.
  col += impCloud(P, N, V, X, F) * uImpCK;
  // Towers are tall and catch the blast hardest.
  col += 0.8 * (vS.z > 0.5 ? 2.2 : 1.0) * hl * (0.06 + 0.94 * max(dot(N, Lh), 0.0)) * (0.2 + 0.8 * shH) + rim * (sunC * 0.12 + amb * 0.45 + hl * 0.6 + 0.01);
  gl_FragColor = vec4(col, a * (1.0 - (vS.z > 0.5 ? 0.0 : 0.25) * thin));
}`;
export const CLOUD_VS = /* glsl */`
attribute vec4 aC, aS;
${CURVE}
uniform float uCloudC;
varying vec2 vUv;
varying vec3 vP, vR, vF;
// Flat: the fragment shader hashes the seed.
flat varying vec4 vS;
varying float vLife;
float hs(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
void main() {
  // Each heap drifts on its own clock, thins away, then forms again.
  float sd = aS.z, heap = 1.0 - step(0.5, aS.y);
  float ph = fract(uCloudC * (0.6 + 0.8 * hs(sd)) / 360.0 + hs(sd + 1.0));
  // Heaps drift round the horizon; towers drift at a fifth of that rate.
  float a = (ph - 0.5) * radians(16.0) * mix(0.2, 1.0, heap);
  vec3 C = vec3(aC.x * cos(a) - aC.z * sin(a), aC.y, aC.x * sin(a) + aC.z * cos(a));
  vLife = mix(1.0, sin(3.14159 * ph), heap);
  vec3 f = C - cameraPosition;
  f.y = 0.0;
  f = normalize(f);
  vec3 R = normalize(cross(f, vec3(0.0, 1.0, 0.0)));
  // The card is wider and taller than the body, so nothing clips.
  vec2 uv = position.xy * vec2(1.2, 1.5);
  // The card stands along the camera's own up, not the world's.
  // Then a tall card stays upright on screen, even at the frame's edge.
  vec3 camUp = normalize(vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]));
  vec3 P = C + R * uv.x * aC.w + camUp * uv.y * aS.x;
  vUv = uv; vP = P; vR = R; vF = f;
  vS = vec4(aC.w, aS.x, aS.y, aS.z);
  // The clouds ride the planet's curve too.
  gl_Position = projectionMatrix * viewMatrix * vec4(curved(P), 1.0);
}`;
// list: [angle in degrees, range m, base m, half width m, height m, kind].
// pick keeps a subset; each card keeps the seed it has in the whole list.
export function cloudLayer(list, order, pick = () => true) {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, 0, 1, 0, 0, 1, 1, 0, -1, 1, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  // Far cards draw first.
  const s = [...list].sort((a, b) => b[1] - a[1]).map((c, i) => [c, 13.7 * i + c[0]]).filter(([c]) => pick(c));
  const aC = new Float32Array(s.length * 4), aS = new Float32Array(s.length * 4);
  s.forEach(([c, sd], i) => {
    const p = polar(rad(c[0]), c[1]);
    aC.set([p.x, c[2], p.z, c[3]], i * 4);
    aS.set([c[4], c[5], sd, 0], i * 4);
  });
  g.setAttribute('aC', new THREE.InstancedBufferAttribute(aC, 4));
  g.setAttribute('aS', new THREE.InstancedBufferAttribute(aS, 4));
  g.instanceCount = s.length;
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { ...U, ...CLOUD_U, ...SHAFT_U }, vertexShader: CLOUD_VS, fragmentShader: CLOUD_FS, transparent: true, depthWrite: false }));
  m.frustumCulled = false;
  m.renderOrder = order;
  scene.add(m);
  return m;
}
// Heaps stand in front of the rock's track: they draw after its smoke.
// Every heap's base stands more than 9 degrees up, so the ranges show clear.
// A near ring 11 to 17 km out, then a ring 22 to 27 km out, with open gaps.
export const HEAPS = [
  [-18, 14000, 2300, 1900, 1300, 0], [-4, 17000, 3100, 2300, 1500, 0], [7, 11000, 2000, 1600, 1100, 0], [19, 15000, 2900, 2100, 1400, 0],
  [33, 12500, 2100, 1800, 1200, 0], [45, 16500, 3000, 2400, 1600, 0], [58, 13000, 2200, 1700, 1150, 0], [71, 15500, 2700, 2200, 1450, 0],
  [-11, 24000, 3700, 2200, 1300, 0], [12, 27000, 4200, 2600, 1500, 0], [27, 23000, 3700, 2000, 1200, 0], [51, 26000, 4100, 2400, 1400, 0], [64, 22000, 3600, 1800, 1100, 0],
];
const heaps = cloudLayer(HEAPS, BAND.heaps);
// Towers stand far out: one behind the gun, one on each flank.
// They draw before the smoke.
// Storm towers far out, scattered: different sizes and distances, uneven gaps.
// Storm towers stand among the far ranges, as tall as their peaks.
// Three towers of different builds: fewer reads truer than a row.
// Storm bases sit kilometres up: the columns float clear of the horizon.
export const TOWERS = STORMS.filter(c => c[1] <= GIANT_RANGE);
export const tower = cloudLayer(TOWERS, BAND.deep);
// One giant: a colossal storm far beyond the ranges.
// Beside it the gun and the towers look small.
export const GIANTS = STORMS.filter(c => c[1] > GIANT_RANGE);
export const giants = cloudLayer(GIANTS, BAND.giants);
