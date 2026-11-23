// Rose window renderer: raw WebGL2, seven small programs, then bloom.
// Once: the glass bake. Per size: the G-buffer. Per sun move: the light map.
// Each frame: haze at half size, shade, motes, bloom, grade.
import { TRI_VS, program, linked, target, free, bind, tri, to } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { GLASS_FS, GBUF_FS, LIGHT_FS, HAZE_FS, SHADE_FS, MOTE_VS, MOTE_FS, FINAL_FS } from './shaders.js';

const GLASS_N = 1024, LIGHT_N = 512, NOISE_N = 32;
// The light map spans the glass map: 2 x 4.59 m.
const LIGHT_TEXEL = 2 * 4.59 / LIGHT_N;

// Tileable value noise, two octaves, in a 32-cube.
function noiseCube() {
  const N = NOISE_N, out = new Uint8Array(N * N * N);
  const lat = (P, seed) => { const a = new Float32Array(P * P * P); let s = seed; for (let i = 0; i < a.length; i++) { s = (s * 16807) % 2147483647; a[i] = s / 2147483647; } return a; };
  const oct = [[8, lat(8, 91), 0.62], [16, lat(16, 517), 0.38]];
  const sm = t => t * t * (3 - 2 * t);
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let v = 0;
    for (const [P, L, w] of oct) {
      const f = P / N, fx = x * f, fy = y * f, fz = z * f;
      const ix = Math.floor(fx), iy = Math.floor(fy), iz = Math.floor(fz);
      const tx = sm(fx - ix), ty = sm(fy - iy), tz = sm(fz - iz);
      const g = (a, b, c) => L[((c % P) * P + (b % P)) * P + (a % P)];
      const l = (a, b, t) => a + (b - a) * t;
      v += w * l(
        l(l(g(ix, iy, iz), g(ix + 1, iy, iz), tx), l(g(ix, iy + 1, iz), g(ix + 1, iy + 1, iz), tx), ty),
        l(l(g(ix, iy, iz + 1), g(ix + 1, iy, iz + 1), tx), l(g(ix, iy + 1, iz + 1), g(ix + 1, iy + 1, iz + 1), tx), ty), tz);
    }
    out[(z * N + y) * N + x] = Math.round(v * 255);
  }
  return out;
}

// Two float targets on one framebuffer: normal and depth, albedo and occlusion.
function gTarget(gl, w, h) {
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  const tex = [0, 1].map(i => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, w, h);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0);
    return t;
  });
  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
  return { fb, tex, w, h };
}
function freeG(gl, g) { if (!g) return; g.tex.forEach(t => gl.deleteTexture(t)); gl.deleteFramebuffer(g.fb); }

export async function makeRenderer(gl) {
  if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('no float targets');
  const P = await linked(gl, {
    glass: program(gl, TRI_VS, GLASS_FS),
    gbuf: program(gl, TRI_VS, GBUF_FS),
    light: program(gl, TRI_VS, LIGHT_FS),
    haze: program(gl, TRI_VS, HAZE_FS),
    shade: program(gl, TRI_VS, SHADE_FS),
    mote: program(gl, MOTE_VS, MOTE_FS),
    final: program(gl, TRI_VS, FINAL_FS),
  });
  const empty = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 6 });

  const noise = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_3D, noise);
  gl.texStorage3D(gl.TEXTURE_3D, 1, gl.R8, NOISE_N, NOISE_N, NOISE_N);
  gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, NOISE_N, NOISE_N, NOISE_N, gl.RED, gl.UNSIGNED_BYTE, noiseCube());
  for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D, k, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const bindNoise = (prog, unit) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_3D, noise);
    gl.uniform1i(prog.u.uNoise, unit);
  };

  // The rose bakes once, with mips for the blur by distance.
  const glass = target(gl, GLASS_N, GLASS_N, { mips: true });
  gl.useProgram(P.glass.p);
  gl.disable(gl.BLEND);
  tri(gl, glass, empty);
  gl.bindTexture(gl.TEXTURE_2D, glass.tex);
  gl.generateMipmap(gl.TEXTURE_2D);
  const light = target(gl, LIGHT_N, LIGHT_N, { mips: true });

  let W = 0, H = 0, cam = null, G = null, hdr = null, haze = null;
  const camU = (prog) => {
    gl.uniform3fv(prog.u.uCam, cam.pos);
    gl.uniform3fv(prog.u.uR, cam.R);
    gl.uniform3fv(prog.u.uU, cam.U);
    gl.uniform3fv(prog.u.uF, cam.F);
    gl.uniform2f(prog.u.uTan, cam.tanX, cam.tanY);
  };

  // w, h: canvas pixels. c: the camera. Marches the stone once.
  function resize(w, h, c) {
    W = Math.max(2, w); H = Math.max(2, h); cam = c;
    gl.canvas.width = W; gl.canvas.height = H;
    freeG(gl, G); free(gl, hdr); free(gl, haze);
    G = gTarget(gl, W, H);
    hdr = target(gl, W, H);
    haze = target(gl, Math.max(1, W >> 1), Math.max(1, H >> 1));
    const g = P.gbuf;
    gl.useProgram(g.p);
    camU(g);
    gl.uniform1i(g.u.uZero, 0);
    bindNoise(g, 0);
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, G.fb);
    gl.viewport(0, 0, W, H);
    gl.bindVertexArray(empty);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // The light map: run when the sun moves.
  function relight(sun) {
    const l = P.light;
    gl.useProgram(l.p);
    gl.uniform1i(l.u.uZero, 0);
    gl.uniform3fv(l.u.uSun, sun);
    bind(gl, l, 'uGlass', 0, glass);
    gl.disable(gl.BLEND);
    tri(gl, light, empty);
    gl.bindTexture(gl.TEXTURE_2D, light.tex);
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  const sunU = (prog, s, unit) => {
    gl.uniform3fv(prog.u.uSun, s.sun);
    gl.uniform1f(prog.u.uTexel, LIGHT_TEXEL);
    bind(gl, prog, 'uLight', unit, light);
  };

  function frame(s) {
    if (!hdr) return;
    gl.disable(gl.BLEND);
    gl.bindVertexArray(empty);

    // Haze, at half size.
    const z = P.haze;
    gl.useProgram(z.p);
    camU(z);
    sunU(z, s, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, G.tex[0]);
    gl.uniform1i(z.u.uG0, 1);
    bindNoise(z, 2);
    gl.uniform1i(z.u.uZero, 0);
    gl.uniform1i(z.u.uSteps, s.steps);
    gl.uniform3fv(z.u.uSunC, s.sunC);
    gl.uniform3fv(z.u.uWin, s.win);
    gl.uniform3fv(z.u.uAmb, s.amb);
    gl.uniform3fv(z.u.uDrift, s.drift);
    gl.uniform1f(z.u.uDens, s.dens);
    gl.uniform4fv(z.u.uStir, s.stir);
    tri(gl, haze);

    // Shade the stone and the glass.
    const h = P.shade;
    gl.useProgram(h.p);
    camU(h);
    sunU(h, s, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, G.tex[0]);
    gl.uniform1i(h.u.uG0, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, G.tex[1]);
    gl.uniform1i(h.u.uG1, 2);
    bind(gl, h, 'uGlass', 3, glass);
    bind(gl, h, 'uHaze', 4, haze);
    bindNoise(h, 5);
    gl.uniform3fv(h.u.uSunC, s.sunC);
    gl.uniform3fv(h.u.uSky, s.sky);
    gl.uniform3fv(h.u.uAmb, s.amb);
    gl.uniform3fv(h.u.uWin, s.win);
    gl.uniform3fv(h.u.uBounceP, s.bounceP);
    gl.uniform3fv(h.u.uBounceC, s.bounceC);
    gl.uniform2f(h.u.uHazeTexel, 1 / haze.w, 1 / haze.h);
    tri(gl, hdr);

    // Motes, added on top; each tests its depth against the G-buffer.
    if (s.motes > 0) {
      const m = P.mote;
      gl.useProgram(m.p);
      camU(m);
      sunU(m, s, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, G.tex[0]);
      gl.uniform1i(m.u.uG0, 1);
      gl.uniform1f(m.u.uTime, s.time);
      gl.uniform1f(m.u.uPx, H / (2 * cam.tanY));
      gl.uniform1f(m.u.uDpr, s.dpr);
      gl.uniform4fv(m.u.uStir, s.stir);
      gl.uniform3fv(m.u.uSunC, s.sunC);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      to(gl, hdr);
      gl.drawArrays(gl.POINTS, 0, s.motes);
      gl.disable(gl.BLEND);
    }

    const bt = bloom.render(hdr.tex, W, H, { threshold: 1.1, cap: 24, levels: s.bloomLevels });
    const o = P.final;
    gl.useProgram(o.p);
    gl.bindVertexArray(empty);
    bind(gl, o, 'uHdr', 0, hdr);
    bind(gl, o, 'uBloom', 1, bt);
    gl.uniform1f(o.u.uBloomK, s.bloomK);
    gl.uniform1f(o.u.uExpo, s.expo);
    gl.uniform1f(o.u.uAsp, W / H);
    gl.uniform1f(o.u.uFrame, s.frameNo % 64);
    tri(gl, null, empty);
  }

  return { resize, relight, frame };
}
