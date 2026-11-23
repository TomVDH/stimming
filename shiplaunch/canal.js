// Ship launch basin: a shallow-water sim on the GPU, the hull's draft, the water surface.
// The pipe model moves water between cells; it keeps mass and handles wet and dry,
// so the wave can run up the pier and sheet across it.
import * as THREE from 'three';
import { WATER } from '../shared/water.js';
import { bakeFoam } from './foam.js';
import { CANAL, PIER, wayTop } from './yard.js';

// The grid: 1 m cells, 512 m along the basin, 256 m across it.
export const CELL = 1, NX = 512, NZ = 256;
export const X0 = -240, Z0 = -30;
const G = 9.81;
// The hull's pressure head: water under her is pushed out this hard.
const KAPPA = 4;

const TRI = new THREE.BufferGeometry();
TRI.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
const VS = 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }';

const HEAD = /* glsl */`
precision highp float;
precision highp sampler2D;
uniform sampler2D tS, tF, tB, tH;
uniform float uDt;
const ivec2 R = ivec2(${NX}, ${NZ});
const float L = ${CELL.toFixed(2)};
bool inside(ivec2 c) { return c.x >= 0 && c.y >= 0 && c.x < R.x && c.y < R.y; }
float bedAt(ivec2 c) { return texelFetch(tB, c, 0).r; }
// The hull's lowest point over a cell; 1000 where there is none.
float hullAt(ivec2 c) { float r = texelFetch(tH, c, 0).r; return r > 1.0 ? r - 500.0 : 1000.0; }
// The sponge: the basin opens east to the outer harbour.
float sponge(ivec2 c) { float x = float(R.x - 1 - c.x) * L; return 1.0 - smoothstep(0.0, 50.0, x); }
`;

// Flux: each cell pushes water to its four neighbours by the head difference.
const FLUX_FS = HEAD + /* glsl */`
float head(ivec2 c, out float b, out float h) {
  b = bedAt(c); h = texelFetch(tS, c, 0).r;
  float s = b + h, H = hullAt(c);
  return s + ${KAPPA.toFixed(1)} * max(0.0, s - H);
}
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  float b0, h0;
  float e0 = head(c, b0, h0);
  // Light bed friction: the wave must cross 200 m of basin.
  vec4 f = texelFetch(tF, c, 0) * (1.0 - uDt * (0.03 + 2.5 * sponge(c)));
  ivec2 o[4] = ivec2[4](ivec2(-1, 0), ivec2(1, 0), ivec2(0, -1), ivec2(0, 1));
  float q[4] = float[4](f.x, f.y, f.z, f.w);
  for (int k = 0; k < 4; k++) {
    ivec2 m = c + o[k];
    if (!inside(m)) { q[k] = 0.0; continue; }
    float b1, h1;
    float e1 = head(m, b1, h1);
    // Depth of the pipe: the higher water surface over the higher bed.
    float he = max(0.0, max(b0 + h0, b1 + h1) - max(b0, b1));
    q[k] = max(0.0, q[k] + uDt * ${G} * he * (e0 - e1));
  }
  float tot = q[0] + q[1] + q[2] + q[3];
  float k = tot > 0.0 ? min(1.0, h0 * L * L / (tot * uDt)) : 1.0;
  gl_FragColor = vec4(q[0], q[1], q[2], q[3]) * k;
}`;

// Height: the net flow changes the depth; velocity and foam follow.
const HEIGHT_FS = HEAD + /* glsl */`
vec4 F(ivec2 c) { return inside(c) ? texelFetch(tF, c, 0) : vec4(0.0); }
float foamAt(vec2 p) {
  vec2 q = p - 0.5;
  ivec2 i = ivec2(floor(q));
  vec2 t = q - vec2(i);
  float a = texelFetch(tS, clamp(i, ivec2(0), R - 1), 0).a;
  float b = texelFetch(tS, clamp(i + ivec2(1, 0), ivec2(0), R - 1), 0).a;
  float d = texelFetch(tS, clamp(i + ivec2(0, 1), ivec2(0), R - 1), 0).a;
  float e = texelFetch(tS, clamp(i + ivec2(1, 1), ivec2(0), R - 1), 0).a;
  return mix(mix(a, b, t.x), mix(d, e, t.x), t.y);
}
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec4 s = texelFetch(tS, c, 0);
  vec4 f = F(c);
  float inL = F(c + ivec2(-1, 0)).y, inR = F(c + ivec2(1, 0)).x;
  float inB = F(c + ivec2(0, -1)).w, inT = F(c + ivec2(0, 1)).z;
  float h = max(0.0, s.r + uDt * (inL + inR + inB + inT - f.x - f.y - f.z - f.w) / (L * L));
  float b = bedAt(c);
  // The sponge eases the water back to rest at the ends.
  float sp = sponge(c);
  h = mix(h, max(0.0, -b), uDt * 1.5 * sp);
  // Velocity from the mean flow through the faces.
  float qx = 0.5 * ((inL - f.x) + (f.y - inR));
  float qz = 0.5 * ((inB - f.z) + (f.w - inT));
  float hm = max(0.08, 0.5 * (h + s.r));
  vec2 v = clamp(vec2(qx, qz) / (L * hm), -14.0, 14.0);
  if (h < 0.005) v = vec2(0.0);
  // Foam rides the flow back along the velocity.
  float foam = foamAt(gl_FragCoord.xy - v * uDt / L);
  float H = hullAt(c);
  float sp2 = length(v);
  // Foam: where the hull shoves water, at a steep front, in fast shallow flow.
  float e = b + h;
  // The slope counts wet neighbours only, so a quay wall makes no foam.
  ivec2 cr = min(c + ivec2(1, 0), R - 1), cl = max(c - ivec2(1, 0), ivec2(0));
  ivec2 cu = min(c + ivec2(0, 1), R - 1), cd = max(c - ivec2(0, 1), ivec2(0));
  float hr = texelFetch(tS, cr, 0).r, hl = texelFetch(tS, cl, 0).r, hu = texelFetch(tS, cu, 0).r, hd = texelFetch(tS, cd, 0).r;
  float ex = (hr > 0.05 ? bedAt(cr) + hr : e) - (hl > 0.05 ? bedAt(cl) + hl : e);
  float ez = (hu > 0.05 ? bedAt(cu) + hu : e) - (hd > 0.05 ? bedAt(cd) + hd : e);
  float steep = length(vec2(ex, ez)) / (2.0 * L);
  float make = 0.0;
  if (e > H - 0.3) make += 2.0 * max(0.0, sp2 - 1.2);
  if (h > 0.3) make += 5.0 * max(0.0, steep - 0.22);
  if (b > -1.0 && h > 0.005) make += 1.5 * max(0.0, sp2 - 1.2);
  foam = min(1.2, foam * exp(-uDt / 3.5) + uDt * make);
  if (h < 0.004) foam *= exp(-uDt / 0.6);
  gl_FragColor = vec4(h, v, foam);
}`;

// Surface: depth, the slope of the water and the foam, for the renderer.
const SURF_FS = HEAD + /* glsl */`
float eta(ivec2 c) { c = clamp(c, ivec2(0), R - 1); return bedAt(c) + texelFetch(tS, c, 0).r; }
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec4 s = texelFetch(tS, c, 0);
  // A dry neighbour does not tilt the surface.
  float e0 = eta(c);
  float l = texelFetch(tS, max(c - ivec2(1, 0), ivec2(0)), 0).r > 0.004 ? eta(c - ivec2(1, 0)) : e0;
  float r = texelFetch(tS, min(c + ivec2(1, 0), R - 1), 0).r > 0.004 ? eta(c + ivec2(1, 0)) : e0;
  float d = texelFetch(tS, max(c - ivec2(0, 1), ivec2(0)), 0).r > 0.004 ? eta(c - ivec2(0, 1)) : e0;
  float u = texelFetch(tS, min(c + ivec2(0, 1), R - 1), 0).r > 0.004 ? eta(c + ivec2(0, 1)) : e0;
  gl_FragColor = vec4(s.r, (r - l) / (2.0 * L), (u - d) / (2.0 * L), s.a);
}`;

// The hull's lowest point over each cell, seen from under the basin.
const DRAFT_VS = 'varying float vY; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vY = w.y; gl_Position = projectionMatrix * viewMatrix * w; }';
// The draft clears to 0 and stores y + 500, so an empty texel means no hull.
const DRAFT_FS = 'varying float vY; void main() { gl_FragColor = vec4(vY + 500.0, 0.0, 0.0, 1.0); }';

/* ---------- the water surface ---------- */
const WATER_VS = /* glsl */`
uniform sampler2D tSurf, tBed;
uniform vec4 uGrid;
varying vec3 vW;
varying vec2 vUv;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vec2 uv = (w.xz - uGrid.xy) / uGrid.zw;
  vUv = uv;
  bool ins = all(greaterThanEqual(uv, vec2(0.0))) && all(lessThanEqual(uv, vec2(1.0)));
  if (ins) {
    float h = texture2D(tSurf, uv).r, b = texture2D(tBed, uv).r;
    // A dry vertex sinks under the bed, so dry ground hides it.
    w.y = h > 0.004 ? b + h : b - 0.15;
  }
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const WATER_FS = /* glsl */`
uniform sampler2D tSurf, tMirror, tFoam;
uniform mat4 uMirror;
uniform vec4 uGrid;
uniform vec3 uCam, uSun, uSunCol, uFog;
uniform float uFogD, uT, uFocal;
varying vec3 vW;
varying vec2 vUv;
${WATER}
void main() {
  bool ins = all(greaterThanEqual(vUv, vec2(0.0))) && all(lessThanEqual(vUv, vec2(1.0)));
  vec4 s = ins ? texture2D(tSurf, vUv) : vec4(9.0, 0.0, 0.0, 0.0);
  if (s.r < 0.004) discard;
  vec3 d = normalize(vW - uCam);
  float dist = length(vW - uCam);
  // Fine chop over the sim's slope; it fades where a pixel cannot hold it.
  float sig2;
  float foot = wtFoot(dist, -d.y, uFocal);
  vec2 slope = s.gb + wtWaves(vW.xz, uT, foot, 0.002, 0.05, 0.6, sig2);
  vec3 n = wtNormal(slope);
  float F = wtFresnel(d, n);
  // The mirror: the scene above the water, nudged by the slope.
  vec4 mp = uMirror * vec4(vW.x, 0.0, vW.z, 1.0);
  vec2 muv = mp.xy / mp.w + slope * 0.06 * min(1.0, 30.0 / dist);
  vec3 refl = texture2D(tMirror, muv).rgb;
  // Murky harbour water: dark green-brown, lit a little by the sky.
  vec3 deep = vec3(0.028, 0.040, 0.032);
  // Low sun through a thin crest: the backlit water glows green.
  float thin = clamp(length(s.gb) * 3.0, 0.0, 1.0) * pow(max(0.0, dot(d, uSun * vec3(-1.0, 1.0, -1.0))), 2.0);
  vec3 col = mix(deep + vec3(0.05, 0.09, 0.05) * thin * uSunCol * 0.3, refl, F);
  vec3 r = reflect(d, n); r.y = abs(r.y);
  col += uSunCol * wtGlint(r, uSun, sig2 + 0.002, 0.02) * F;
  // Foam: a mat where it is fresh, thinning to lace as it ages (Ponlai's pattern).
  float fa = min(s.a, 1.2);
  vec4 P = texture2D(tFoam, vW.xz / 9.0);
  float mott = texture2D(tFoam, vW.xz / 31.0 + 0.37).b;
  float fresh = smoothstep(0.25, 0.9, fa);
  float tm = 1.12 - fa * 0.85 + (mott - 0.5) * 0.35;
  float fmat = smoothstep(tm, tm + 0.1, P.r);
  float tl = 1.0 - min(fa, 1.0) * 0.8;
  float lace = smoothstep(tl, tl + 0.05, P.g) * smoothstep(0.015, 0.1, fa);
  float fo = max(fmat * (0.45 + 0.55 * fresh), lace * 0.55);
  vec3 foamCol = vec3(0.6, 0.61, 0.6) + uSunCol * 0.16 * (0.5 + 0.5 * n.y);
  col = mix(col, foamCol, fo);
  // A thin sheet on the pier is clear and shows the paving through it.
  float a = smoothstep(0.004, 0.06, s.r);
  col = mix(col, uFog, 1.0 - exp(-uFogD * uFogD * dist * dist));
  gl_FragColor = vec4(col, a);
}`;

/**
 * Builds the basin sim and its water meshes.
 * @param {THREE.WebGLRenderer} renderer
 */
export function makeCanal(renderer, drop) {
  const float = renderer.extensions.has('EXT_color_buffer_float');
  const type = float ? THREE.FloatType : THREE.HalfFloatType;
  const rt = (w, h, t = type, filter = THREE.NearestFilter) => new THREE.WebGLRenderTarget(w, h, { type: t, format: THREE.RGBAFormat, minFilter: filter, magFilter: filter, depthBuffer: false });
  let S = [rt(NX, NZ), rt(NX, NZ)], Fl = [rt(NX, NZ), rt(NX, NZ)];
  const surf = rt(NX, NZ, THREE.HalfFloatType, THREE.LinearFilter);
  const draft = new THREE.WebGLRenderTarget(NX, NZ, { type, format: THREE.RGBAFormat, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  // The bed: one float per cell, and a half-float copy the renderer can filter.
  const bed = new Float32Array(NX * NZ * 4);
  const bedTex = new THREE.DataTexture(bed, NX, NZ, THREE.RGBAFormat, THREE.FloatType);
  bedTex.minFilter = bedTex.magFilter = THREE.NearestFilter;
  const bedHalf = new Uint16Array(NX * NZ * 4);
  const bedLin = new THREE.DataTexture(bedHalf, NX, NZ, THREE.RGBAFormat, THREE.HalfFloatType);
  bedLin.minFilter = bedLin.magFilter = THREE.LinearFilter;
  const init = new Float32Array(NX * NZ * 4);
  const initTex = new THREE.DataTexture(init, NX, NZ, THREE.RGBAFormat, THREE.FloatType);

  const U = { tS: { value: null }, tF: { value: null }, tB: { value: bedTex }, tH: { value: draft.texture }, uDt: { value: 1 / 240 } };
  const pass = fs => new THREE.Mesh(TRI, new THREE.RawShaderMaterial({ uniforms: U, vertexShader: 'in vec3 position;\n' + VS, fragmentShader: '#define gl_FragColor fc\nout highp vec4 fc;\n' + fs, glslVersion: THREE.GLSL3 }));
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const flux = pass(FLUX_FS), height = pass(HEIGHT_FS), surface = pass(SURF_FS);
  const copy = pass(HEAD + 'uniform sampler2D tInit; void main() { gl_FragColor = texelFetch(tInit, ivec2(gl_FragCoord.xy), 0); }');
  copy.material.uniforms = { ...U, tInit: { value: initTex } };
  const run = (m, target) => { scene.children.length = 0; scene.add(m); renderer.setRenderTarget(target); renderer.render(scene, cam); };

  // The draft pass looks up from under the basin.
  const dScene = new THREE.Scene();
  const dCam = new THREE.OrthographicCamera(X0, X0 + NX * CELL, Z0 + NZ * CELL, Z0, 0.1, 200);
  dCam.position.set(0, -60, 0);
  dCam.up.set(0, 0, 1);
  dCam.lookAt(0, 0, 0);
  // Its frame is centred on x = 0; the grid starts at X0, so shift the bounds.
  dCam.left = X0; dCam.right = X0 + NX * CELL; dCam.bottom = Z0; dCam.top = Z0 + NZ * CELL;
  dCam.position.set(0, -60, 0);
  dCam.updateProjectionMatrix();
  const draftMat = new THREE.ShaderMaterial({ vertexShader: DRAFT_VS, fragmentShader: DRAFT_FS, side: THREE.DoubleSide });
  let draftMesh = null;

  function setBed(d) {
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const x = X0 + (i + 0.5) * CELL, z = Z0 + (j + 0.5) * CELL;
      let b;
      if (z < CANAL.zYard) b = Math.abs(x) < 64 ? wayTop(z, d) - 0.55 : 1.7;
      else if (x < CANAL.xWest) b = CANAL.quayTop;
      else if (x > PIER.x0 && x < PIER.x1 && z > PIER.z0 && z <= CANAL.zQuay) b = PIER.top;
      else if (z <= CANAL.zQuay) b = -CANAL.depth;
      // The quay rises gently inland, so a sheet of water drains back.
      else b = CANAL.quayTop + (z - CANAL.zQuay) * 0.006;
      const k = (j * NX + i) * 4;
      bed[k] = b;
      bedHalf[k] = THREE.DataUtils.toHalfFloat(b);
      init[k] = Math.max(0, -b); init[k + 1] = init[k + 2] = init[k + 3] = 0;
    }
    bedTex.needsUpdate = bedLin.needsUpdate = initTex.needsUpdate = true;
  }

  function reset(d = drop) {
    drop = d;
    setBed(d);
    for (const t of S) run(copy, t);
    for (const t of Fl) { renderer.setRenderTarget(t); renderer.setClearColor(0x000000, 0); renderer.clear(); }
    clearDraft();
    U.tS.value = S[0].texture; U.tF.value = Fl[0].texture;
    run(surface, surf);
    renderer.setRenderTarget(null);
  }
  function clearDraft() {
    renderer.setRenderTarget(draft);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
  }

  /** Renders the hull's underside into the draft field. */
  function drawHull(mesh) {
    if (!draftMesh) { draftMesh = new THREE.Mesh(mesh.geometry, draftMat); draftMesh.matrixAutoUpdate = false; dScene.add(draftMesh); }
    draftMesh.matrix.copy(mesh.matrixWorld);
    draftMesh.matrixWorld.copy(mesh.matrixWorld);
    clearDraft();
    renderer.setRenderTarget(draft);
    renderer.render(dScene, dCam);
    renderer.setRenderTarget(null);
  }

  /** Runs n sub-steps of dt seconds. */
  function step(n, dt) {
    U.uDt.value = dt;
    for (let i = 0; i < n; i++) {
      U.tS.value = S[0].texture; U.tF.value = Fl[0].texture;
      run(flux, Fl[1]);
      Fl.reverse();
      U.tF.value = Fl[0].texture;
      run(height, S[1]);
      S.reverse();
    }
    U.tS.value = S[0].texture;
    run(surface, surf);
    renderer.setRenderTarget(null);
  }

  /* ---------- readback ---------- */
  // One column of the state at x = 0, for the hull's water line.
  const I0 = Math.round(-X0 / CELL - 0.5);
  const col = new Float32Array(NZ * 4);
  let colBusy = false;
  const level = { at: new Float32Array(NZ), ok: false };
  function readColumn() {
    if (colBusy || !float) return;
    colBusy = true;
    renderer.readRenderTargetPixelsAsync(S[0], I0, 0, 1, NZ, col).then(() => {
      for (let j = 0; j < NZ; j++) level.at[j] = bed[(j * NX + I0) * 4] + col[j * 4];
      level.ok = true;
    }).catch(() => {}).finally(() => { colBusy = false; });
  }
  /** Water level at z on the centre line, from the last read. */
  // Only basin water counts: the berth and the quay tops are ground.
  const levelAt = z => {
    if (!level.ok) return 0;
    const zc = Math.max(CANAL.zYard + 0.5, Math.min(CANAL.zQuay - 0.5, z));
    const j = Math.max(0, Math.min(NZ - 1, Math.round((zc - Z0) / CELL - 0.5)));
    return level.at[j];
  };
  // A patch around the pier head: the water at its faces and on its deck.
  const PI0 = Math.round((PIER.x0 - 10 - X0) / CELL), PJ0 = Math.round((PIER.z0 - 8 - Z0) / CELL);
  const PW = Math.round((PIER.x1 - PIER.x0 + 20) / CELL), PH = Math.round(40 / CELL);
  const pbuf = new Float32Array(PW * PH * 4);
  const patch = { h: new Float32Array(PW * PH), eta: new Float32Array(PW * PH).fill(-9), ok: false };
  let patchBusy = false;
  function readPatch() {
    if (patchBusy || !float) return;
    patchBusy = true;
    renderer.readRenderTargetPixelsAsync(S[0], PI0, PJ0, PW, PH, pbuf).then(() => {
      for (let j = 0; j < PH; j++) for (let i = 0; i < PW; i++) {
        const k = j * PW + i, h = pbuf[k * 4];
        patch.h[k] = h;
        patch.eta[k] = h > 0.004 ? bed[((PJ0 + j) * NX + PI0 + i) * 4] + h : -9;
      }
      patch.ok = true;
    }).catch(() => {}).finally(() => { patchBusy = false; });
  }
  // The patch cell at a world point, or -1 outside it.
  const patchAt = (x, z) => {
    const i = Math.floor((x - X0) / CELL) - PI0, j = Math.floor((z - Z0) / CELL) - PJ0;
    return i < 0 || j < 0 || i >= PW || j >= PH ? -1 : j * PW + i;
  };
  /** Water depth at x, z in the patch, from the last read. */
  const wetAt = (x, z) => { const k = patchAt(x, z); return k < 0 || !patch.ok ? 0 : patch.h[k]; };
  /** Water level at x, z in the patch; -9 where it is dry. */
  const etaAt = (x, z) => { const k = patchAt(x, z); return k < 0 || !patch.ok ? -9 : patch.eta[k]; };
  function clearPatch() { patch.h.fill(0); patch.eta.fill(-9); patch.ok = false; }

  /* ---------- meshes ---------- */
  const WU = {
    tSurf: { value: surf.texture }, tBed: { value: bedLin }, tMirror: { value: null }, tFoam: { value: bakeFoam(renderer) }, uMirror: { value: new THREE.Matrix4() },
    uGrid: { value: new THREE.Vector4(X0, Z0, NX * CELL, NZ * CELL) },
    uCam: { value: new THREE.Vector3() }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color(1, 0.8, 0.6) },
    uFog: { value: new THREE.Color() }, uFogD: { value: 0 }, uT: { value: 0 }, uFocal: { value: 800 },
  };
  const mat = new THREE.ShaderMaterial({ uniforms: WU, vertexShader: WATER_VS, fragmentShader: WATER_FS, transparent: true, depthWrite: true });
  const group = new THREE.Group();
  // The sim's field: one vertex a metre. The harbour runs on east of it, flat.
  const grid = new THREE.PlaneGeometry(NX * CELL, NZ * CELL, NX, NZ).rotateX(-Math.PI / 2);
  const sim = new THREE.Mesh(grid, mat);
  sim.position.set(X0 + (NX * CELL) / 2, 0, Z0 + (NZ * CELL) / 2);
  sim.frustumCulled = false;
  const W = CANAL.zQuay - CANAL.zYard;
  const far = new THREE.PlaneGeometry(3000, W, 1, 1).rotateX(-Math.PI / 2);
  const east = new THREE.Mesh(far, mat);
  east.position.set(X0 + NX * CELL + 1500, 0, (CANAL.zQuay + CANAL.zYard) / 2);
  group.add(sim, east);
  group.renderOrder = 2;

  /* ---------- the mirror ---------- */
  // Multisampled, so long near-flat edges in the mirror do not step.
  const mirror = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const mCam = new THREE.PerspectiveCamera();
  const clip = [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.02)];
  const bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  WU.tMirror.value = mirror.texture;
  function setMirrorSize(w, h) { mirror.setSize(Math.max(1, w >> 1), Math.max(1, h >> 1)); }
  /** Renders the scene seen in the water, from the camera mirrored in y = 0. */
  function drawMirror(sceneMain, camera) {
    mCam.copy(camera);
    mCam.position.y = -camera.position.y;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    fwd.y = -fwd.y;
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    up.y = -up.y;
    mCam.up.copy(up);
    mCam.lookAt(mCam.position.clone().add(fwd));
    mCam.updateMatrixWorld();
    mCam.projectionMatrix.copy(camera.projectionMatrix);
    WU.uMirror.value.multiplyMatrices(bias, mCam.projectionMatrix).multiply(mCam.matrixWorldInverse);
    group.visible = false;
    const old = renderer.clippingPlanes;
    renderer.clippingPlanes = clip;
    renderer.setRenderTarget(mirror);
    renderer.render(sceneMain, mCam);
    renderer.clippingPlanes = old;
    renderer.setRenderTarget(null);
    group.visible = true;
  }

  /** QA: the draft and the depth at a point, read back at once. */
  async function probe(x, z) {
    const i = Math.round((x - X0) / CELL - 0.5), j = Math.round((z - Z0) / CELL - 0.5);
    const a = new Float32Array(4), b = new Float32Array(4);
    await renderer.readRenderTargetPixelsAsync(draft, i, j, 1, 1, a);
    await renderer.readRenderTargetPixelsAsync(S[0], i, j, 1, 1, b);
    return { H: a[0] > 1 ? a[0] - 500 : 1000, h: b[0], u: b[1], w: b[2], foam: b[3], bed: bed[(j * NX + i) * 4] };
  }

  reset(drop);
  return { probe,
    group, WU, U, step, reset, drawHull, clearDraft, drawMirror, setMirrorSize, readColumn, readPatch, clearPatch, levelAt, wetAt, etaAt,
    get drop() { return drop; },
  };
}
