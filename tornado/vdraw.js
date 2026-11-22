// Tornado alley: the vehicles drawn as meshes, into the toy's own targets.
// Each group (far, near) draws twice: its share behind the funnels, then its share in front.
// The layer passes passCarsFar and passCarsNear lay the pictures in (main.js).
// Every program here has one output: D3D11 compiles a multi-output program twice.
import { ENV_UNIFORMS } from '../shared/environment.js';
import { GLASS_RAIN } from '../shared/glassrain.js';
import { WATER } from '../shared/water.js';
import { SKY, skyAt } from '../shared/sky.js';
import { PRECIP } from '../shared/precip.js';
import { GLOW } from '../shared/glow.js';
import { pruneGLSL } from '../shared/glsl-prune.js';
import { program, linked, target, msTarget, free } from '../shared/gl.js';
import { HULLS } from './vshape.js';
import { vehicleMesh, hullPlanes } from './vmesh.js';

// The vehicle's frame from its uniforms: x, z, heading, kind; seed, brake, speed, age.
// The shutter's offset in metres, spin, group (1 far), 0; base pitch and roll.
const VEH_U = /* glsl */`
uniform vec4 uVA, uVB, uVC, uVD;
mat2 vRollM() {
  float r = 0.008 * sin(uVB.w * 2.3 + uVB.x * 6.0) + 0.004 * sin(uVB.w * 5.1) + uVD.y;
  return mat2(cos(r), sin(r), -sin(r), cos(r));
}
mat2 vPitchM() {
  float p = 0.004 * sin(uVB.w * 3.1 + uVB.x * 3.0) + uVD.x;
  return mat2(cos(p), -sin(p), sin(p), cos(p));
}
// A point in the body's frame, back to the unrotated frame: pitch then roll undone.
vec3 vUnrot(vec3 q) {
  q.yz = transpose(vPitchM()) * (q.yz - vec2(0.8, 0.0)) + vec2(0.8, 0.0);
  q.xy = transpose(vRollM()) * (q.xy - vec2(0.0, 0.8)) + vec2(0.0, 0.8);
  return q;
}
// A cup turns round its hub: aCup holds its offset at spin 0, and 1.
vec3 vCupSpin(vec3 p, vec3 cup) {
  if (cup.z < 0.5) return p;
  float s = sin(uVC.y), c = cos(uVC.y);
  p.xz += vec2(cup.x * c - cup.y * s, cup.x * s + cup.y * c) - cup.xy;
  return p;
}
`;
// The camera, as main.js's SHARED has it: the eye at CAMH, turned by uYaw.
const CAM_VS = /* glsl */`
uniform float uYaw, uFoc, uHz, uCamH;
uniform vec2 uRes;
vec3 toCamV(vec3 w) { float s = sin(uYaw), k = cos(uYaw); return vec3(w.x * k - w.z * s, w.y, w.x * s + w.z * k); }
// A world point to clip space: the scene's screen point s = (c.x, c.y - CAMH) / -c.z * uFoc.
vec4 clipOf(vec3 w) {
  vec3 c = toCamV(w);
  float asp = uRes.x / uRes.y, d = -c.z, n = 0.2, f = 30000.0;
  return vec4(2.0 * uFoc * c.x / asp, 2.0 * uFoc * (c.y - uCamH) + (2.0 * uHz - 1.0) * d, (f + n) / (f - n) * d - 2.0 * f * n / (f - n), d);
}
// True when this vehicle belongs to the group being drawn, and stands before the eye.
bool inGroup() {
  float z = -toCamV(vec3(uVA.x, 1.0, uVA.y)).z;
  return z >= 0.3 && (z > 60.0) == (uVC.z > 0.5);
}
`;
const BODY_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNrm;
layout(location = 2) in float aId;
layout(location = 3) in vec3 aCup;
${VEH_U}${CAM_VS}
out vec3 vH, vN, vW;
flat out float vId;
void main() {
  vec3 f = vec3(sin(uVA.z), 0.0, cos(uVA.z)), rt = vec3(-f.z, 0.0, f.x);
  vec3 p = vCupSpin(aPos, aCup), q = vUnrot(p);
  vW = vec3(uVA.x, 0.0, uVA.y) + f * uVC.x + rt * q.x + vec3(0.0, q.y, 0.0) + f * q.z;
  vH = p; vN = aNrm; vId = aId;
  gl_Position = inGroup() ? clipOf(vW) : vec4(2.0, 2.0, 2.0, 1.0);
}`;
// The body's shading: vPart(), vBend() and vShade() from traffic.js, per fragment.
const BODY_MAIN = /* glsl */`
in vec3 vH, vN, vW;
flat in float vId;
${VEH_U}
// 1 lays the share behind the funnels, 0 the share in front.
uniform float uShare;
// The cab's planes, for the glass's exit point, as vHit() keeps it in gExT.
uniform vec4 uCab[32];
uniform int uCabN;
${'${SM_FS}'}
void main() {
  vec2 s; vec3 rc, rd; float px;
  pixStart(gl_FragCoord.xy / uRes, s, rc, rd, px);
  objInit(s);
  int kind = int(uVA.w + 0.5);
  float seed = uVB.x, brake = uVB.y, spd = uVB.z, age = uVB.w;
  vec3 C = vec3(uVA.x, 0.0, uVA.y), f = vec3(sin(uVA.z), 0.0, cos(uVA.z)), rt = vec3(-f.z, 0.0, f.x);
  float z = depthOf(C + vec3(0.0, 1.0, 0.0));
  mat2 mr = vRollM(), mp = vPitchM();
  vec3 eye = vec3(0.0, CAMH, 0.0), Ck = C + f * uVC.x;
  vec3 rw = normalize(vW - eye), o = eye - Ck;
  vec3 lo = vec3(dot(o, rt), o.y, dot(o, f)), ld = vec3(dot(rw, rt), rw.y, dot(rw, f));
  lo.xy = mr * (lo.xy - vec2(0.0, 0.8)) + vec2(0.0, 0.8); ld.xy = mr * ld.xy;
  lo.yz = mp * (lo.yz - vec2(0.8, 0.0)) + vec2(0.8, 0.0); ld.yz = mp * ld.yz;
  vec3 hl = vH, n = normalize(vN);
  int id = vPart(int(vId + 0.5), kind, hl, n);
  // The body shades its own parts: the sun's shadow map in place of the sun ray.
  vec3 L = normalize(uSun + vec3(0.0, 1e-3, 0.0)), ls = vec3(dot(L, rt), L.y, dot(L, f));
  ls.xy = mr * ls.xy; ls.yz = mp * ls.yz;
  float sv = 1.0;
  if (dot(n, ls) <= 0.0) sv = 0.0;
  else if (uVC.z < 0.5 && id != 6 && id != 7 && z <= 40.0) sv = smLight(hl + n * 0.004);
  gSh = sv; gSpd = spd; gAge = age;
  vec3 nl = vBend(hl, n, id, kind), nb = nl;
  nb.yz = transpose(mp) * nb.yz; nb.xy = transpose(mr) * nb.xy;
  vec3 N = normalize(rt * nb.x + vec3(0.0, nb.y, 0.0) + f * nb.z);
  vec3 P = Ck + rt * hl.x + vec3(0.0, hl.y, 0.0) + f * hl.z;
  // Glass in a cab with windows all round shows the world through the far window.
  float see = 0.0;
  if (id == 2 && kind != 2) {
    float tf = 1e9;
    vec3 nf = vec3(0.0, 1.0, 0.0);
    for (int i = 0; i < 32; i++) {
      if (i >= uCabN) break;
      float dn = dot(uCab[i].xyz, ld), t = (uCab[i].w - dot(uCab[i].xyz, lo)) / dn;
      if (dn > 1e-7 && t < tf) { tf = t; nf = uCab[i].xyz; }
    }
    vec3 xp = lo + ld * tf;
    see = float(vPart(2, kind, xp, nf) == 2);
    // Seat backs with rounded shoulders, and a rounded headrest over each, block the lower window.
    float bx = abs(abs(xp.x) - 0.42), by = xp.y - vBelt(kind);
    float back = step(by, 0.16 - 0.5 * max(bx - 0.18, 0.0));
    float rest = step(length(vec2(bx / 0.12, (by - 0.3) / 0.09)), 1.0);
    see *= 1.0 - max(back, rest);
  }
  vec3 col = vShade(id, kind, P, N, -rw, hl, nl, seed, brake, see);
  // The amber bar flashes, left and right in turn.
  if (id == 4) col = vec3(1.0, 0.45, 0.05) * (0.2 + 7.0 * step(0.5, fract(uT * 1.6 + (hl.x > 0.0 ? 0.5 : 0.0))));
  float zHit = depthOf(P);
  col = hazed(col, rd, zHit);
  float b = behindF(zHit), share = uShare > 0.5 ? b : 1.0 - b;
  // Four moments in the shutter add up to one.
  outC = vec4(col, 1.0) * share * 0.25;
}`;
// The sun's shadow map, in the body's frame: an orthographic view along the sun.
// tSMD holds depth; tSMF is 1 where the nearest part is the cab (its glass lets 0.45 through).
const SM_FS = /* glsl */`
uniform highp sampler2D tSMD, tSMF;
uniform vec3 uLX, uLY, uLZ;
// The view's centre on the sun's plane, its half size, and the depth's centre and half range.
uniform vec4 uLB;
vec3 smAt(vec3 p) {
  return vec3((vec2(dot(p, uLX), dot(p, uLY)) - uLB.xy) / uLB.z * 0.5 + 0.5, 0.5 - (dot(p, uLZ) - uLB.w) / 10.0);
}
// The sun's share at a body point: 1 open, 0.45 behind the cab, 0 behind another part.
// Four texels, so the edge is soft.
float smLight(vec3 p) {
  vec3 q = smAt(p);
  if (any(lessThan(q.xy, vec2(0.0))) || any(greaterThan(q.xy, vec2(1.0)))) return 1.0;
  ivec2 sz = textureSize(tSMD, 0), c = ivec2(q.xy * vec2(sz) - 0.5);
  float v = 0.0;
  for (int k = 0; k < 4; k++) {
    ivec2 t = clamp(c + ivec2(k & 1, k >> 1), ivec2(0), sz - 1);
    bool hid = texelFetch(tSMD, t, 0).r < min(q.z, 1.0) - 0.003;
    v += hid ? (texelFetch(tSMF, t, 0).r > 0.5 ? 0.45 : 0.0) : 1.0;
  }
  return v * 0.25;
}
// True when a body point stands in the vehicle's shadow.
bool smHid(vec3 p) {
  vec3 q = smAt(p);
  if (any(lessThan(q.xy, vec2(0.0))) || any(greaterThan(q.xy, vec2(1.0)))) return false;
  return texture(tSMD, q.xy).r < min(q.z, 1.0) - 0.003;
}
`;
const SMAP_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPos;
layout(location = 2) in float aId;
layout(location = 3) in vec3 aCup;
${VEH_U}
uniform vec3 uLX, uLY, uLZ;
uniform vec4 uLB;
flat out float vId;
void main() {
  vec3 p = vCupSpin(aPos, aCup);
  vId = aId;
  gl_Position = vec4((vec2(dot(p, uLX), dot(p, uLY)) - uLB.xy) / uLB.z, (0.5 - (dot(p, uLZ) - uLB.w) / 10.0) * 2.0 - 1.0, 1.0);
}`;
const SMAP_FS = `#version 300 es
precision highp float;
flat in float vId;
out vec4 outC;
void main() { outC = vec4(abs(vId - 2.0) < 0.5 ? 1.0 : 0.0); }`;
// The road under a vehicle, and its shadow's reach away from the sun; the fragment does the work.
// A 3.8 m roof under a sun 1 degree up casts about 220 m: the strip runs 400 m at most.
const GND_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aQ;
uniform vec3 uSun;
${VEH_U}${CAM_VS}
void main() {
  vec2 g = length(uSun.xz) > 1e-4 ? -normalize(uSun.xz) : vec2(0.0, 1.0), side = vec2(-g.y, g.x);
  float len = min(4.0 / max(uSun.y, 0.01), 400.0);
  vec2 xz = vec2(uVA.x, uVA.y) + g * mix(-8.0, len + 8.0, aQ.x * 0.5 + 0.5) + side * aQ.y * 8.0;
  gl_Position = inGroup() ? clipOf(vec3(xz.x, 0.0, xz.y)) : vec4(2.0, 2.0, 2.0, 1.0);
}`;
// The contact shadow and the sun's shadow on the road, as vehicle()'s shadow phase lays them.
const GND_MAIN = /* glsl */`
${VEH_U}
uniform float uShare;
${'${SM_FS}'}
void main() {
  vec2 s; vec3 rc, rd; float px;
  pixStart(gl_FragCoord.xy / uRes, s, rc, rd, px);
  objInit(s);
  if (rd.y >= 0.0) discard;
  int kind = int(uVA.w + 0.5);
  vec3 C = vec3(uVA.x, 0.0, uVA.y), f = vec3(sin(uVA.z), 0.0, cos(uVA.z)), rt = vec3(-f.z, 0.0, f.x);
  float fr = vFront(kind), rr = vRear(kind), hw = vHW(kind), top = kind == 2 ? 3.8 : 2.8;
  vec3 eye = vec3(0.0, CAMH, 0.0);
  float tg = CAMH / max(-rd.y, 1e-4);
  vec3 G = eye + rd * tg - C;
  vec2 q = vec2(dot(G, rt), dot(G, f) - (fr + rr) * 0.5) / vec2(hw + 0.2, (fr - rr) * 0.5 + 0.15);
  float k = (1.0 - smoothstep(0.55, 1.0, length(q))) * 0.45;
  if (k > 0.0) put(vec3(0.004), k, depthOf(C));
  if (uSun.y > 0.0) {
    vec3 Lw = normalize(uSun), ls = vec3(dot(Lw, rt), Lw.y, dot(Lw, f));
    vec3 gl = vec3(dot(G, rt), 0.0, dot(G, f));
    vec3 inv = 1.0 / ls, ta = (vec3(-hw - 0.32, 0.0, rr - 0.15) - gl) * inv, tb = (vec3(hw + 0.32, top, fr + 0.15) - gl) * inv;
    vec3 mn = min(ta, tb), mx = max(ta, tb);
    if (min(min(mx.x, mx.y), mx.z) > max(max(max(mn.x, mn.y), mn.z), 0.0)) {
      float zg = depthOf(G + C), fp = px * zg / uFoc / max(-rd.y, 0.05), sh = 0.0;
      mat2 mr = vRollM(), mp = vPitchM();
      // Four points over the pixel's footprint: a soft, smooth edge.
      for (int j = 0; j < 4; j++) {
        vec2 o = (vec2(float(j & 1), float(j >> 1)) - 0.5) * 0.5;
        vec3 p = gl + vec3(o.x, 0.0, o.y) * fp;
        p.xy = mr * (p.xy - vec2(0.0, 0.8)) + vec2(0.0, 0.8);
        p.yz = mp * (p.yz - vec2(0.8, 0.0)) + vec2(0.8, 0.0);
        sh += smHid(p) ? 1.0 : 0.0;
      }
      float sunL = dot(uSunCol, vec3(0.3, 0.6, 0.1)) * 0.55, ambL = dot(uAmb, vec3(0.3, 0.6, 0.1)) * 0.6;
      float ks = sh * 0.25 * sunL / max(sunL + ambL, 1e-4) * (1.0 - sunCover((G + C) * 0.001)) * smoothstep(0.006, 0.02, -rd.y);
      if (ks > 0.0) put(vec3(0.0), ks, zg);
    }
  }
  outC = uShare > 0.5 ? gOB : gOF;
}`;
const FS_HEAD = '#version 300 es\nprecision highp float;\nout vec4 outC;\n';
const BUNDLES = [GLASS_RAIN, WATER, SKY, PRECIP, GLOW].join('\n');
// The shadow map's size in texels; the view is 9 m across.
const SM = 512;
const SM_R = 4.5;

/**
 * The vehicles' mesh renderer.
 * @param {WebGL2RenderingContext} gl
 * @param {{ scene: string, uniforms: Record<string, () => number | ArrayLike<number>>, textures: Record<string, () => WebGLTexture | null>, hour: () => number }} opts
 */
export function vehDraw(gl, { scene, uniforms, textures, hour }) {
  const fs = main => pruneGLSL(FS_HEAD + ENV_UNIFORMS + BUNDLES + scene + main.replace('${SM_FS}', SM_FS));
  const set = { body: program(gl, BODY_VS, fs(BODY_MAIN)), smap: program(gl, SMAP_VS, SMAP_FS), gnd: program(gl, GND_VS, fs(GND_MAIN)) };
  const st = { ready: false, failed: null };
  linked(gl, set, { wait: () => new Promise(r => setTimeout(r, 30)) })
    .then(() => { st.ready = true; })
    .catch(err => { st.failed = err; console.error('vehicle meshes:', err); });
  // One VAO per kind; the road's square.
  const vaos = [0, 1, 2].map(kind => {
    const m = vehicleMesh(kind), vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    [[m.pos, 3], [m.nrm, 3], [m.id, 1], [m.cup, 3]].forEach(([data, n], i) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, n, gl.FLOAT, false, 0, 0);
    });
    return { vao, count: m.pos.length / 3 };
  });
  const quad = gl.createVertexArray();
  gl.bindVertexArray(quad);
  const qb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, qb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  // The cab's planes per kind: the hull with id 2.
  const cab = [0, 1, 2].map(k => { const h = HULLS[k].find(x => x.id === 2); return hullPlanes(h.c, h.h, h.e, h.pl).flat(); });
  // A shadow map per vehicle slot: depth, and the cab's flag.
  const smaps = [0, 1, 2].map(() => {
    const d = gl.createTexture(), c = gl.createTexture(), fb = gl.createFramebuffer();
    gl.bindTexture(gl.TEXTURE_2D, d);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SM, SM);
    for (const t of [d, c]) {
      gl.bindTexture(gl.TEXTURE_2D, t);
      if (t === c) gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R8, SM, SM);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, c, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, d, 0);
    return { d, c, fb };
  });
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  // The groups' pictures: far and near, each behind and in front.
  const out = { far: [null, null], near: [null, null] };
  let ms = null, w0 = 0, h0 = 0;
  const blank = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, blank);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  gl.bindTexture(gl.TEXTURE_2D, null);

  // A program's active 2D samplers, read once.
  const samplers2D = P => P.s2 || (P.s2 = Array.from({ length: gl.getProgramParameter(P.p, gl.ACTIVE_UNIFORMS) }, (_, i) => gl.getActiveUniform(P.p, i))
    .filter(a => a.type === gl.SAMPLER_2D).map(a => a.name));
  // The scene's uniforms and pictures on one program: the toy's, the sky's, and every sampler.
  function sceneUniforms(P, w, h) {
    const u = P.u, sk = skyAt(hour());
    gl.useProgram(P.p);
    gl.uniform2f(u.uRes, w, h);
    gl.uniform3fv(u.uZen, sk.zen); gl.uniform3fv(u.uMid, sk.mid); gl.uniform3fv(u.uBand, sk.band); gl.uniform3fv(u.uAnti, sk.anti); gl.uniform3fv(u.uSunD, sk.sun);
    for (const [name, get] of Object.entries(uniforms)) {
      const v = get(), at = u[name];
      if (at == null) continue;
      if (typeof v === 'number') gl.uniform1f(at, v);
      else if (v.length === 2) gl.uniform2fv(at, v);
      else if (v.length === 3) gl.uniform3fv(at, v);
      else gl.uniform4fv(at, v);
    }
    // Units 10 to 15 are the meshes': the toy's pictures, the shadow map, then a blank for the rest.
    let unit = 10;
    for (const [name, get] of Object.entries(textures)) {
      if (u[name] == null) continue;
      gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, get() || blank); gl.uniform1i(u[name], unit++);
    }
    // Every other 2D sampler reads a blank: on unit 0 it would clash with the 3D noise.
    gl.activeTexture(gl.TEXTURE15); gl.bindTexture(gl.TEXTURE_2D, blank);
    for (const name of samplers2D(P)) if (!(name in textures) && name !== 'tSMD' && name !== 'tSMF') gl.uniform1i(u[name], 15);
    gl.activeTexture(gl.TEXTURE0);
  }
  // One vehicle's uniforms from traffic.js's packed arrays; false when the slot is empty.
  function vehUniforms(P, traf, i, shut, spin, far) {
    const a = traf.u, b = traf.uB, c = traf.uC, k = i * 4;
    if (b[k] <= 0) return false;
    const u = P.u;
    gl.uniform4f(u.uVA, a[k], a[k + 1], b[k + 3], a[k + 3]);
    gl.uniform4f(u.uVB, b[k + 1], c[k], Math.abs(a[k + 2]), b[k + 2]);
    gl.uniform4f(u.uVC, Math.abs(a[k + 2]) * shut / 40, spin(b[k + 1]), far ? 1 : 0, 0);
    gl.uniform4f(u.uVD, c[k + 1], c[k + 2], 0, 0);
    return true;
  }
  // The sun's view of one vehicle, in its body frame; sets the light uniforms on P.
  function lightBasis(traf, i) {
    const a = traf.u, b = traf.uB, c = traf.uC, k = i * 4, sun = uniforms.uSun();
    const hd = b[k + 3], f = [Math.sin(hd), 0, Math.cos(hd)], rt = [-f[2], 0, f[0]];
    const l = Math.hypot(sun[0], sun[1] + 1e-3, sun[2]), L = [sun[0] / l, (sun[1] + 1e-3) / l, sun[2] / l];
    let ls = [L[0] * rt[0] + L[2] * rt[2], L[1], L[0] * f[0] + L[2] * f[2]];
    // Roll then pitch, as the body's frame has them.
    const seed = b[k + 1], age = b[k + 2];
    const roll = 0.008 * Math.sin(age * 2.3 + seed * 6) + 0.004 * Math.sin(age * 5.1) + c[k + 2];
    const pitch = 0.004 * Math.sin(age * 3.1 + seed * 3) + c[k + 1];
    ls = [Math.cos(roll) * ls[0] - Math.sin(roll) * ls[1], Math.sin(roll) * ls[0] + Math.cos(roll) * ls[1], ls[2]];
    ls = [ls[0], Math.cos(pitch) * ls[1] + Math.sin(pitch) * ls[2], -Math.sin(pitch) * ls[1] + Math.cos(pitch) * ls[2]];
    const lz = ls, up = Math.abs(lz[1]) < 0.99 ? [0, 1, 0] : [1, 0, 0];
    const cr = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
    const n = v => { const m = Math.hypot(...v); return v.map(x => x / m); };
    const lx = n(cr(up, lz)), ly = cr(lz, lx), ctr = [0, 1.5, 0];
    const d = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
    return { lx, ly, lz, lb: [d(ctr, lx), d(ctr, ly), SM_R, d(ctr, lz)] };
  }
  const setLight = (P, Lb) => { gl.uniform3fv(P.u.uLX, Lb.lx); gl.uniform3fv(P.u.uLY, Lb.ly); gl.uniform3fv(P.u.uLZ, Lb.lz); gl.uniform4fv(P.u.uLB, Lb.lb); };
  const bindSmap = (P, i) => {
    gl.activeTexture(gl.TEXTURE13); gl.bindTexture(gl.TEXTURE_2D, smaps[i].d); gl.uniform1i(P.u.tSMD, 13);
    gl.activeTexture(gl.TEXTURE14); gl.bindTexture(gl.TEXTURE_2D, smaps[i].c); gl.uniform1i(P.u.tSMF, 14);
    gl.activeTexture(gl.TEXTURE0);
  };

  /**
   * Draws both groups. Call it in before(), after the funnel pass; it leaves the context in its default state.
   * @param {number} w @param {number} h @param {{ u: Float32Array, uB: Float32Array, uC: Float32Array }} traf @param {number} simT
   */
  function draw(w, h, traf, simT) {
    if (!st.ready) return;
    const n = traf.u.length / 4, kinds = Array.from({ length: n }, (_, i) => Math.round(traf.u[i * 4 + 3]));
    const live = kinds.map((_, i) => traf.uB[i * 4] > 0);
    const spin = seed => simT * 9 + seed * 6;
    if (w !== w0 || h !== h0) {
      free(gl, ms); for (const g of ['far', 'near']) out[g].forEach(t => free(gl, t));
      // The resolve keeps the multisampled format: a blit cannot change it.
      let fmt = gl.RGBA16F;
      ms = msTarget(gl, w, h, 4);
      if (!ms.ok) { free(gl, ms); fmt = gl.RGBA8; ms = msTarget(gl, w, h, 4, { format: fmt }); }
      for (const g of ['far', 'near']) out[g] = [0, 1].map(() => target(gl, w, h, { format: fmt, filter: gl.NEAREST }));
      w0 = w; h0 = h;
    }
    gl.disable(gl.BLEND);
    // The shadow maps: one per live vehicle, from the sun.
    const lights = [];
    gl.useProgram(set.smap.p);
    gl.enable(gl.DEPTH_TEST);
    gl.viewport(0, 0, SM, SM);
    for (let i = 0; i < n; i++) {
      if (!live[i]) continue;
      lights[i] = lightBasis(traf, i);
      gl.bindFramebuffer(gl.FRAMEBUFFER, smaps[i].fb);
      gl.clearColor(0, 0, 0, 0); gl.clearDepth(1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      vehUniforms(set.smap, traf, i, 0, spin, false);
      setLight(set.smap, lights[i]);
      gl.bindVertexArray(vaos[kinds[i]].vao);
      gl.drawArrays(gl.TRIANGLES, 0, vaos[kinds[i]].count);
    }
    sceneUniforms(set.body, w, h);
    sceneUniforms(set.gnd, w, h);
    gl.viewport(0, 0, w, h);
    for (const [g, far] of [['far', true], ['near', false]]) {
      for (let share = 0; share < 2; share++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, ms.fb);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // The bodies: four moments in the shutter, each depth-sorted, summed.
        gl.useProgram(set.body.p);
        gl.uniform1f(set.body.u.uShare, share === 0 ? 1 : 0);
        // The vehicle's frame (right, up, forward) is left-handed: its outward faces wind clockwise.
        gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.frontFace(gl.CW);
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
        for (let s = 0; s < 4; s++) {
          gl.clear(gl.DEPTH_BUFFER_BIT);
          for (let i = 0; i < n; i++) {
            if (!live[i] || !vehUniforms(set.body, traf, i, (s + 0.5) / 4 - 0.5, spin, far)) continue;
            gl.uniform4fv(set.body.u.uCab, cab[kinds[i]]); gl.uniform1i(set.body.u.uCabN, cab[kinds[i]].length / 4);
            setLight(set.body, lights[i]); bindSmap(set.body, i);
            gl.bindVertexArray(vaos[kinds[i]].vao);
            gl.drawArrays(gl.TRIANGLES, 0, vaos[kinds[i]].count);
          }
        }
        // The road's shadows lie under the bodies.
        gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.frontFace(gl.CCW);
        gl.blendFunc(gl.ONE_MINUS_DST_ALPHA, gl.ONE);
        gl.useProgram(set.gnd.p);
        gl.uniform1f(set.gnd.u.uShare, share === 0 ? 1 : 0);
        gl.bindVertexArray(quad);
        for (let i = 0; i < n; i++) {
          if (!live[i] || !vehUniforms(set.gnd, traf, i, 0, spin, far)) continue;
          setLight(set.gnd, lights[i]); bindSmap(set.gnd, i);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
        gl.disable(gl.BLEND);
        // The multisampled picture into its texture.
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, ms.fb);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, out[g][share].fb);
        gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
      }
    }
    // The runner wants the context in its default state.
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND); gl.frontFace(gl.CCW);
    gl.bindVertexArray(null);
    for (const u of [10, 11, 12, 13, 14, 15]) { gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, null); }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  return {
    st, draw,
    /** The group's picture: far or near, behind (0) or in front (1). @param {'far' | 'near'} g @param {0 | 1} share */
    tex: (g, share) => (out[g][share] ? out[g][share].tex : null),
  };
}
