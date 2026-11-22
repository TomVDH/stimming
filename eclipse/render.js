// Desert eclipse renderer: raw WebGL2, four passes, then bloom.
// The sun pass draws only a box round the sun.
import { TRI_VS, program, linked, target, free, bind, tri, to } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { SKY_FS, GROUND_FS, SUN_FS, FINAL_FS } from './shaders.js';

export async function makeRenderer(gl) {
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) throw new Error('no float targets');
  const P = await linked(gl, {
    sky: program(gl, TRI_VS, SKY_FS),
    ground: program(gl, TRI_VS, GROUND_FS),
    sun: program(gl, TRI_VS, SUN_FS),
    final: program(gl, TRI_VS, FINAL_FS),
  });
  const empty = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 6 });
  let sky = null, hdr = null, W = 0, H = 0;

  function resize(w, h) {
    W = Math.max(2, w); H = Math.max(2, h);
    gl.canvas.width = W; gl.canvas.height = H;
    free(gl, sky); free(gl, hdr);
    sky = target(gl, W, H, { check: true });
    hdr = target(gl, W, H);
  }

  // The view and umbra uniforms both scene passes share.
  function view(p, s) {
    gl.uniform1f(p.u.uTanW, s.tanW);
    gl.uniform1f(p.u.uHz, s.hz);
    gl.uniform1f(p.u.uAsp, s.asp);
    if (p.u.uUmb) gl.uniform3fv(p.u.uUmb, s.umb);
    if (p.u.uK) gl.uniform1f(p.u.uK, s.k);
    if (p.u.uSunDir) gl.uniform3fv(p.u.uSunDir, s.sunDir);
    if (p.u.uT) gl.uniform1f(p.u.uT, s.t);
    if (p.u.uAmb) gl.uniform1f(p.u.uAmb, s.amb);
    if (p.u.uRm) gl.uniform1f(p.u.uRm, s.calm ? 0 : 1);
  }

  // s: the frame state from main.js.
  function frame(s) {
    if (!hdr) return;
    gl.disable(gl.BLEND);
    gl.bindVertexArray(empty);
    const px = 2 * s.tanW / W;

    const a = P.sky;
    gl.useProgram(a.p);
    view(a, s);
    gl.uniform1f(a.u.uPx, px);
    gl.uniform1f(a.u.uStars, s.stars);
    gl.uniform1f(a.u.uGlow, s.glow);
    gl.uniform2fv(a.u.uLean, s.lean);
    gl.uniform3fv(a.u.uLightDir, s.lightDir);
    gl.uniform4fv(a.u.uStar, s.starList);
    tri(gl, sky, empty);

    const g = P.ground;
    gl.useProgram(g.p);
    view(g, s);
    bind(gl, g, 'uSky', 0, sky);
    gl.uniform1f(g.u.uF, s.F);
    gl.uniform1f(g.u.uHeat, s.heat);
    gl.uniform1f(g.u.uBands, s.bands);
    gl.uniform2fv(g.u.uBandDir, s.bandDir);
    tri(gl, hdr, empty);

    // The sun box: the corona reaches 4.4 sun radii.
    const c = P.sun;
    gl.useProgram(c.p);
    view(c, s);
    gl.uniform2f(c.u.uView, W, H);
    gl.uniform1f(c.u.uPx, px);
    gl.uniform1f(c.u.uRs, s.rs);
    gl.uniform2fv(c.u.uS, s.sun);
    gl.uniform2fv(c.u.uD, s.d);
    gl.uniform1f(c.u.uSunI, s.sunI);
    gl.uniform1f(c.u.uCor, s.cor);
    gl.uniform1f(c.u.uChr, s.chr);
    gl.uniform1f(c.u.uHint, s.hint);
    const cx = (s.sun[0] / s.tanW * 0.5 + 0.5) * W, cy = (s.sun[1] / (2 * s.tanW / s.asp) + s.hz) * H;
    // The box holds the moon too, wherever the hand put it.
    const mx = cx + s.d[0] * s.rs / px, my = cy + s.d[1] * s.rs / px;
    const R = 4.5 * s.rs / px, Rm = 1.2 * s.rs / px;
    const x0 = Math.max(0, Math.floor(Math.min(cx - R, mx - Rm))), y0 = Math.max(0, Math.floor(Math.min(cy - R, my - Rm)));
    const x1 = Math.min(W, Math.ceil(Math.max(cx + R, mx + Rm))), y1 = Math.min(H, Math.ceil(Math.max(cy + R, my + Rm)));
    if (x1 > x0 && y1 > y0) {
      to(gl, hdr);
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(x0, y0, x1 - x0, y1 - y0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disable(gl.BLEND);
      gl.disable(gl.SCISSOR_TEST);
    }

    const bt = bloom.render(hdr.tex, W, H, { threshold: 1.2 / s.expo, cap: 40 / s.expo, levels: s.bloomLevels });
    const f = P.final;
    gl.useProgram(f.p);
    gl.bindVertexArray(empty);
    bind(gl, f, 'uHdr', 0, hdr);
    bind(gl, f, 'uBloom', 1, bt);
    gl.uniform1f(f.u.uBloomK, s.bloomK);
    gl.uniform1f(f.u.uExpo, s.expo);
    gl.uniform1f(f.u.uAsp, s.asp);
    gl.uniform1f(f.u.uFrame, s.frameNo % 64);
    gl.uniform1f(f.u.uCool, s.cool);
    gl.uniform1f(f.u.uFlare, s.flare);
    gl.uniform1f(f.u.uRing, s.ring);
    gl.uniform2fv(f.u.uSrc, s.src);
    gl.uniform4fv(f.u.uMoon, s.moon);
    tri(gl, null, empty);
  }

  return { resize, frame };
}
