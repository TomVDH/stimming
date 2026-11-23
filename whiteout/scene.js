// Whiteout renderer: raw WebGL2.
// Passes: the surfaces once per size, then each frame the haze, the light, the snow, bloom and grade.
import { TRI_VS, program, linked, target, free, bind, tri, to } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { GBUF, VOL, BLUR, LIGHT, FLAKE_VS, FLAKE_FS, FINAL } from './shaders.js';

// The gust texture holds this many samples, newest first.
export const GUST_N = 256;
const NOISE_N = 64;

// Tileable value noise in red, soft cells in green.
function makeNoise() {
  const N = NOISE_N, out = new Uint8Array(N * N * N * 2);
  let seed = 9277;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const sm = t => t * t * (3 - 2 * t);
  // One octave of value noise with a period of p cells.
  const octave = p => {
    const lat = new Float32Array(p * p * p).map(() => rnd());
    const at = (x, y, z) => lat[((z % p) * p + (y % p)) * p + (x % p)];
    const f = new Float32Array(N * N * N);
    const s = p / N;
    let i = 0;
    for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const gx = x * s, gy = y * s, gz = z * s;
      const x0 = Math.floor(gx), y0 = Math.floor(gy), z0 = Math.floor(gz);
      const u = sm(gx - x0), v = sm(gy - y0), w = sm(gz - z0);
      const a = at(x0, y0, z0) + (at(x0 + 1, y0, z0) - at(x0, y0, z0)) * u;
      const b = at(x0, y0 + 1, z0) + (at(x0 + 1, y0 + 1, z0) - at(x0, y0 + 1, z0)) * u;
      const c = at(x0, y0, z0 + 1) + (at(x0 + 1, y0, z0 + 1) - at(x0, y0, z0 + 1)) * u;
      const d = at(x0, y0 + 1, z0 + 1) + (at(x0 + 1, y0 + 1, z0 + 1) - at(x0, y0 + 1, z0 + 1)) * u;
      const e = a + (b - a) * v, g = c + (d - c) * v;
      f[i++] = e + (g - e) * w;
    }
    return f;
  };
  const o1 = octave(4), o2 = octave(8), o3 = octave(16);
  // Cells: one point per cell, distance to the nearest, with wrap.
  const C = 6, pts = new Float32Array(C * C * C * 3).map(() => rnd());
  const cell = N / C;
  let i = 0;
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++, i++) {
    const v = o1[i] * 0.55 + o2[i] * 0.3 + o3[i] * 0.15;
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
    let best = 9;
    for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const ax = cx + dx, ay = cy + dy, az = cz + dz;
      const k = ((((az + C) % C) * C + ((ay + C) % C)) * C + ((ax + C) % C)) * 3;
      const px = (ax + pts[k]) * cell - x, py = (ay + pts[k + 1]) * cell - y, pz = (az + pts[k + 2]) * cell - z;
      const dd = px * px + py * py + pz * pz;
      if (dd < best * best * cell * cell) best = Math.sqrt(dd) / cell;
    }
    const puff = Math.max(0, 1 - best) * 0.7 + o3[i] * 0.3;
    out[i * 2] = Math.round(Math.min(1, Math.max(0, (v - 0.2) / 0.6)) * 255);
    out[i * 2 + 1] = Math.round(Math.min(1, puff) * 255);
  }
  return out;
}

export async function makeScene(gl) {
  if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('no float targets');
  const P = await linked(gl, {
    gbuf: program(gl, TRI_VS, GBUF),
    vol: program(gl, TRI_VS, VOL),
    blur: program(gl, TRI_VS, BLUR),
    light: program(gl, TRI_VS, LIGHT),
    flake: program(gl, FLAKE_VS, FLAKE_FS),
    final: program(gl, TRI_VS, FINAL),
  });
  const empty = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 5 });

  const noise = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_3D, noise);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RG8, NOISE_N, NOISE_N, NOISE_N, 0, gl.RG, gl.UNSIGNED_BYTE, makeNoise());
  for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D, k, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.bindTexture(gl.TEXTURE_3D, null);

  const gust = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, gust);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R16F, GUST_N, 1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  let gA = null, gB = null, gFb = null, vol = null, volB = null, hdr = null;
  let W = 0, H = 0, OW = 0, OH = 0, VW = 0, VH = 0, dirty = true;
  // ow, oh: the canvas. w, h: the surfaces and the light, up to 1.5 times larger.
  function resize(ow, oh, w, h) {
    OW = Math.max(2, ow); OH = Math.max(2, oh);
    W = Math.max(2, w); H = Math.max(2, h);
    VW = Math.max(2, Math.round(OW / 2)); VH = Math.max(2, Math.round(OH / 2));
    gl.canvas.width = OW; gl.canvas.height = OH;
    free(gl, gA); free(gl, gB); free(gl, vol); free(gl, volB); free(gl, hdr);
    if (gFb) gl.deleteFramebuffer(gFb);
    // The surfaces keep their texels exact: depth tests read them one to one.
    gA = target(gl, W, H, { filter: gl.NEAREST });
    gB = target(gl, W, H, { filter: gl.NEAREST });
    gFb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, gFb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, gA.tex, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, gB.tex, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    vol = target(gl, VW, VH);
    volB = target(gl, VW, VH);
    hdr = target(gl, W, H);
    dirty = true;
  }

  function camU(s, v) {
    gl.uniform3fv(s.u.uCamPos, v.cam.pos);
    gl.uniformMatrix3fv(s.u.uCamRot, false, v.cam.rot);
    gl.uniform3fv(s.u.uLens, v.cam.lens);
  }
  function surfaces(v) {
    const s = P.gbuf;
    gl.useProgram(s.p);
    camU(s, v);
    gl.uniform1i(s.u.uZero, 0);
    gl.uniform1f(s.u.uPx, 2 * v.cam.lens[1] / H);
    gl.bindFramebuffer(gl.FRAMEBUFFER, gFb);
    gl.viewport(0, 0, W, H);
    gl.bindVertexArray(empty);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    dirty = false;
  }
  function noiseAt(unit, s) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_3D, noise);
    gl.uniform1i(s.u.uNoise, unit);
  }
  function stormU(s, v) {
    const set = (n, fn, ...a) => { if (s.u[n] != null) gl[fn](s.u[n], ...a); };
    set('uSig', 'uniform1f', v.sig);
    set('uGustK', 'uniform1f', v.gustK);
    set('uDrift', 'uniform1f', v.drift);
    set('uWindS', 'uniform1f', v.windS);
    set('uGustAll', 'uniform1f', v.gustAll);
    set('uGustSpan', 'uniform1f', v.gustSpan);
    set('uAmb', 'uniform3fv', v.amb);
    set('uMoonCol', 'uniform3fv', v.moon);
    set('uLampCol', 'uniform3fv', v.lamp);
    set('uSigNow', 'uniform1f', v.sigNow);
    set('uT', 'uniform1f', v.t);
  }

  function frame(v, { frameNo = 0, bloomLevels = 5, flakes = 6000 } = {}) {
    if (!hdr) return;
    gl.disable(gl.BLEND);
    if (dirty) surfaces(v);
    gl.bindTexture(gl.TEXTURE_2D, gust);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, GUST_N, 1, gl.RED, gl.FLOAT, v.gust);

    // The haze, at half size, then blurred on both axes.
    const vp = P.vol;
    gl.useProgram(vp.p);
    camU(vp, v);
    stormU(vp, v);
    gl.uniform1i(vp.u.uZero, 0);
    gl.uniform1f(vp.u.uFrame, frameNo % 64);
    bind(gl, vp, 'uA', 0, gA);
    bind(gl, vp, 'uGust', 1, gust);
    noiseAt(2, vp);
    tri(gl, vol, empty);
    const bp = P.blur;
    gl.useProgram(bp.p);
    bind(gl, bp, 'uSrc', 0, vol);
    gl.uniform2f(bp.u.uStep, 1, 0);
    tri(gl, volB, empty);
    bind(gl, bp, 'uSrc', 0, volB);
    gl.uniform2f(bp.u.uStep, 0, 1);
    tri(gl, vol, empty);

    // The surfaces lit, under the haze.
    const lp = P.light;
    gl.useProgram(lp.p);
    camU(lp, v);
    stormU(lp, v);
    gl.uniform1f(lp.u.uPx, 2 * v.cam.lens[1] / H);
    gl.uniform1f(lp.u.uWinGlow, v.winGlow);
    bind(gl, lp, 'uA', 0, gA);
    bind(gl, lp, 'uB', 1, gB);
    bind(gl, lp, 'uVol', 2, vol);
    noiseAt(3, lp);
    tri(gl, hdr, empty);

    // The snow: additive streaks over the lit frame.
    if (flakes > 0) {
      const fp = P.flake;
      gl.useProgram(fp.p);
      camU(fp, v);
      stormU(fp, v);
      gl.uniform1f(fp.u.uFallS, v.fallS);
      gl.uniform1f(fp.u.uVel, v.vel);
      gl.uniform1f(fp.u.uExpo, v.expo);
      gl.uniform1f(fp.u.uFocus, 24);
      gl.uniform1f(fp.u.uAper, 0.012);
      gl.uniform1f(fp.u.uCount, flakes);
      gl.uniform2f(fp.u.uRes, W, H);
      bind(gl, fp, 'uA', 0, gA);
      to(gl, hdr);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindVertexArray(empty);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, flakes);
      gl.disable(gl.BLEND);
    }

    const bt = bloom.render(hdr.tex, W, H, { threshold: 0.9, cap: 10, levels: bloomLevels });
    const f = P.final;
    gl.useProgram(f.p);
    bind(gl, f, 'uHdr', 0, hdr);
    bind(gl, f, 'uBloom', 1, bt);
    gl.uniform1f(f.u.uBloomK, 0.3);
    gl.uniform1f(f.u.uExpo, v.expoGrade);
    gl.uniform1f(f.u.uFrame, frameNo % 64);
    gl.uniform2f(f.u.uRes, OW, OH);
    gl.uniform3fv(f.u.uFlare, v.flare);
    gl.uniform3fv(f.u.uFlareCol, v.flareCol);
    gl.uniform2fv(f.u.uLampUv, v.lampUv);
    gl.viewport(0, 0, OW, OH);
    tri(gl, null, empty);
  }
  return { resize, frame };
}
