// Fjord aurora renderer: raw WebGL2, three passes, then bloom.
// The aurora pass covers only the sky above the horizon, at reduced size.
import { TRI_VS, program, linked, target, free, bind, tri } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { AURORA_FS, SCENE_FS, FINAL_FS } from './shaders.js';

export async function makeRenderer(gl) {
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) throw new Error('no float targets');
  const P = await linked(gl, {
    aur: program(gl, TRI_VS, AURORA_FS),
    scene: program(gl, TRI_VS, SCENE_FS),
    final: program(gl, TRI_VS, FINAL_FS),
  });
  const empty = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 5 });
  let aur = null, hdr = null, W = 0, H = 0;

  // lens: { tanW, hz, asp }. scale sizes the aurora pass.
  function resize(w, h, lens, scale) {
    W = Math.max(2, w); H = Math.max(2, h);
    gl.canvas.width = W; gl.canvas.height = H;
    free(gl, aur); free(gl, hdr);
    const aw = Math.max(16, Math.round(W * scale)), ah = Math.max(16, Math.round(H * (1 - lens.hz) * scale));
    aur = target(gl, aw, ah, { mips: true, check: true });
    hdr = target(gl, W, H);
  }

  // s: the frame state from main.js.
  function frame(s) {
    if (!hdr) return;
    gl.disable(gl.BLEND);
    const yTop = (1 - s.hz) * 2 * s.tanW / s.asp;
    const a = P.aur;
    gl.useProgram(a.p);
    gl.uniform1f(a.u.uTanW, s.tanW);
    gl.uniform1f(a.u.uYTop, yTop);
    gl.uniform1f(a.u.uT, s.t);
    gl.uniform1f(a.u.uAct, s.act);
    gl.uniform1f(a.u.uHem, s.hem);
    gl.uniform1f(a.u.uRed, s.red);
    gl.uniform1f(a.u.uJit, s.frameNo % 64);
    gl.uniform1f(a.u.uSteps, s.steps);
    gl.uniform3fv(a.u.uZ0, s.z0);
    gl.uniform3fv(a.u.uAmp, s.amp);
    gl.uniform3fv(a.u.uGain, s.gain);
    gl.uniform3fv(a.u.uYaw, s.yaw);
    gl.uniform4fv(a.u.uSurge, s.surge);
    gl.uniform4fv(a.u.uGust, s.gusts);
    tri(gl, aur, empty);
    gl.bindTexture(gl.TEXTURE_2D, aur.tex);
    gl.generateMipmap(gl.TEXTURE_2D);

    const c = P.scene;
    gl.useProgram(c.p);
    bind(gl, c, 'uAur', 0, aur);
    gl.uniform1f(c.u.uTanW, s.tanW);
    gl.uniform1f(c.u.uYTop, yTop);
    gl.uniform1f(c.u.uHz, s.hz);
    gl.uniform1f(c.u.uAsp, s.asp);
    gl.uniform1f(c.u.uT, s.water);
    gl.uniform1f(c.u.uTw, s.twinkle);
    gl.uniform1f(c.u.uPx, 2 * s.tanW / W);
    gl.uniform1f(c.u.uAct, s.act);
    gl.uniform1f(c.u.uRm, s.calm ? 0 : 1);
    gl.uniform2fv(c.u.uMtn, s.mtn);
    tri(gl, hdr, empty);

    const bt = bloom.render(hdr.tex, W, H, { threshold: 0.5, cap: 6, levels: s.bloomLevels });
    const f = P.final;
    gl.useProgram(f.p);
    bind(gl, f, 'uHdr', 0, hdr);
    bind(gl, f, 'uBloom', 1, bt);
    gl.uniform1f(f.u.uBloomK, 0.42);
    gl.uniform1f(f.u.uExpo, s.expo);
    gl.uniform1f(f.u.uAsp, s.asp);
    gl.uniform1f(f.u.uFrame, s.frameNo % 64);
    tri(gl, null, empty);
  }

  return { resize, frame };
}
