// Dichroic glass renderer: raw WebGL2, three programs, then bloom.
// MAP lights the table into three spectral targets, only when the lamp moves.
// SCENE traces the glass and reads the map; FINAL tones it.
import { TRI_VS, program, linked, target, free, bind, tri } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { MAP_FS, SCENE_FS, FINAL_FS } from './shaders.js';
import { PANES, MAP, LAMP_R, AIM, rgbWeights } from './glass.js';

const flat = (list, key) => new Float32Array(list.flatMap(p => p[key]));

export async function makeRenderer(gl) {
  if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('no float targets');
  const P = await linked(gl, {
    map: program(gl, TRI_VS, MAP_FS),
    scene: program(gl, TRI_VS, SCENE_FS),
    final: program(gl, TRI_VS, FINAL_FS),
  });
  const empty = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 6 });
  const W3 = rgbWeights().map(r => new Float32Array(r));

  // The light map: three RGBA16F targets on one framebuffer.
  let mapRes = 0, maps = [], mapFb = null;
  function makeMap(res) {
    if (res === mapRes) return;
    maps.forEach(m => free(gl, m));
    if (mapFb) gl.deleteFramebuffer(mapFb);
    mapRes = res;
    maps = [0, 1, 2].map(() => target(gl, res, res));
    mapFb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, mapFb);
    maps.forEach((m, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, m.tex, 0));
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('map target is not renderable');
  }
  makeMap(MAP.res);

  // Uniforms that every pass shares: the panes, the coating, the lamp.
  function glass(p, s) {
    gl.uniform3fv(p.u.uPo, flat(PANES, 'o'));
    gl.uniform3fv(p.u.uPu, flat(PANES, 'u'));
    gl.uniform3fv(p.u.uPn, flat(PANES, 'n'));
    gl.uniform2fv(p.u.uPl, new Float32Array(PANES.flatMap(q => [q.len, q.h])));
    gl.uniform2fv(p.u.uPx, new Float32Array(PANES.flatMap((q, k) => [k > 0 ? 1 : 0, k < PANES.length - 1 ? 1 : 0])));
    gl.uniform4fv(p.u.uCoat, s.coat);
    gl.uniform3fv(p.u.uL, s.lamp);
    gl.uniform1f(p.u.uLampR, LAMP_R);
    gl.uniform1i(p.u.uZero, 0);
    gl.uniform2f(p.u.uMap0, MAP.x0, MAP.y0);
    gl.uniform1f(p.u.uMapS, MAP.size);
  }

  let W = 0, H = 0, hdr = null;
  function resize(w, h) {
    W = Math.max(2, w); H = Math.max(2, h);
    gl.canvas.width = W; gl.canvas.height = H;
    free(gl, hdr);
    hdr = target(gl, W, H);
  }

  // Lights the table: run only when the lamp or the coating moves.
  function light(s) {
    makeMap(s.mapRes ?? MAP.res);
    const p = P.map;
    gl.useProgram(p.p);
    gl.disable(gl.BLEND);
    glass(p, s);
    const a = [AIM[0] - s.lamp[0], AIM[1] - s.lamp[1], AIM[2] - s.lamp[2]];
    const al = Math.hypot(...a);
    gl.uniform3f(p.u.uAim, a[0] / al, a[1] / al, a[2] / al);
    gl.uniform1f(p.u.uI, s.power);
    gl.bindFramebuffer(gl.FRAMEBUFFER, mapFb);
    gl.viewport(0, 0, mapRes, mapRes);
    gl.bindVertexArray(empty);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // s: the frame's state from main.js.
  function frame(s) {
    if (!hdr) return;
    if (s.relight) light(s);
    const p = P.scene;
    gl.useProgram(p.p);
    gl.disable(gl.BLEND);
    glass(p, s);
    maps.forEach((m, i) => bind(gl, p, `uM${i}`, i, m));
    gl.uniform3fv(p.u.uCam, s.cam.pos);
    gl.uniform3fv(p.u.uCamR, s.cam.r);
    gl.uniform3fv(p.u.uCamU, s.cam.u);
    gl.uniform3fv(p.u.uCamF, s.cam.f);
    gl.uniform1f(p.u.uTanH, s.cam.tanH);
    gl.uniform1f(p.u.uAsp, W / H);
    gl.uniform1f(p.u.uPix, s.cam.tanH * 2 / H);
    // The bulb's radiance: its power spread over its disc.
    gl.uniform1f(p.u.uLampL, s.power / (Math.PI * LAMP_R * LAMP_R) * 0.5);
    gl.uniform1f(p.u.uFill, s.fill);
    gl.uniform4fv(p.u.uWr, W3[0]);
    gl.uniform4fv(p.u.uWg, W3[1]);
    gl.uniform4fv(p.u.uWb, W3[2]);
    tri(gl, hdr, empty);

    const bt = bloom.render(hdr.tex, W, H, { threshold: 1.2, cap: 12, levels: s.bloomLevels });
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
