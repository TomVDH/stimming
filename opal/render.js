// Opal turn renderer: raw WebGL2, two programs, then bloom.
// SCENE ray-casts the tray; FINAL tones it. The domains live in two data textures.
import { TRI_VS, program, linked, target, free, bind, tri } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { SCENE_FS, FINAL_FS } from './shaders.js';
import { GRID, LAYERS } from './domains.js';

export async function makeRenderer(gl, { domains }) {
  if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('no float targets');
  const P = await linked(gl, {
    scene: program(gl, TRI_VS, SCENE_FS),
    final: program(gl, TRI_VS, FINAL_FS),
  });
  const empty = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 6 });

  // The domains: nearest filter, read by texelFetch.
  const dataTex = arr => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, GRID, GRID * LAYERS.length, 0, gl.RGBA, gl.FLOAT, arr);
    return { tex: t };
  };
  const domA = dataTex(domains.a), domB = dataTex(domains.b);

  let W = 0, H = 0, hdr = null;
  function resize(w, h) {
    W = Math.max(2, w); H = Math.max(2, h);
    gl.canvas.width = W; gl.canvas.height = H;
    free(gl, hdr);
    hdr = target(gl, W, H);
  }

  // s: the frame's state from main.js.
  function frame(s) {
    if (!hdr) return;
    const p = P.scene;
    gl.useProgram(p.p);
    gl.disable(gl.BLEND);
    bind(gl, p, 'uDomA', 0, domA);
    bind(gl, p, 'uDomB', 1, domB);
    gl.uniformMatrix3fv(p.u.uRinv, false, s.R);
    gl.uniform3fv(p.u.uCam, s.cam.pos);
    gl.uniform3fv(p.u.uCamR, s.cam.r);
    gl.uniform3fv(p.u.uCamU, s.cam.u);
    gl.uniform3fv(p.u.uCamF, s.cam.f);
    gl.uniform1f(p.u.uTanH, s.cam.tanH);
    gl.uniform1f(p.u.uAsp, W / H);
    gl.uniform1f(p.u.uPix, s.cam.tanH * 2 / H);
    gl.uniform3fv(p.u.uL, s.light.d);
    gl.uniform3fv(p.u.uLx, s.light.x);
    gl.uniform3fv(p.u.uLy, s.light.y);
    gl.uniform2f(p.u.uBox, 0.21, 0.13);
    gl.uniform1f(p.u.uKey, s.key);
    gl.uniform1f(p.u.uPlay, s.play ?? 1);
    gl.uniform1f(p.u.uPin, s.pin ?? 1);
    gl.uniform1f(p.u.uGlint, s.glint ?? 1);
    gl.uniform4fv(p.u.uLz, LAYERS.map(L => L.z));
    gl.uniform4fv(p.u.uLs, LAYERS.map(L => L.s));
    gl.uniform1i(p.u.uZero, 0);
    tri(gl, hdr, empty);

    const bt = bloom.render(hdr.tex, W, H, { threshold: 1.1, cap: 14, levels: s.bloomLevels });
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

  return { resize, frame };
}
