// Desire paths renderer: raw WebGL2, four small programs, then bloom.
// Prints draw into a deposit target; the wear pass adds them to the field.
// The lawn pass lights the turf, the earth and the flags from the field.
import { TRI_VS, program, linked, target, free, bind, tri, to } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { STAMP_VS, STAMP_FS, WEAR_FS, LAWN_FS, FINAL_FS } from './shaders.js';
import { FIELD, SUN } from './lawn.js';

const MAX_PRINTS = 4096;

export async function makeRenderer(gl) {
  if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('no float targets');
  const P = await linked(gl, {
    stamp: program(gl, STAMP_VS, STAMP_FS, ['aP', 'aQ']),
    wear: program(gl, TRI_VS, WEAR_FS),
    lawn: program(gl, TRI_VS, LAWN_FS),
    final: program(gl, TRI_VS, FINAL_FS),
  });
  const empty = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 5 });

  // Prints: eight floats each, two attributes.
  const vao = gl.createVertexArray(), buf = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, MAX_PRINTS * 32, gl.DYNAMIC_DRAW);
  for (let i = 0; i < 2; i++) {
    gl.enableVertexAttribArray(i);
    gl.vertexAttribPointer(i, 4, gl.FLOAT, false, 32, i * 16);
    gl.vertexAttribDivisor(i, 1);
  }
  gl.bindVertexArray(null);

  const FW = Math.round(FIELD.w / FIELD.cell), FH = Math.round(FIELD.h / FIELD.cell);
  const fieldT = () => target(gl, FW, FH, { clear: true });
  let A = fieldT(), B = fieldT();
  const dep = target(gl, FW, FH, { clear: true });
  let depDirty = false;

  let W = 0, H = 0, view = null, hdr = null;
  function resize(w, h, v) {
    W = Math.max(2, w); H = Math.max(2, h); view = v;
    gl.canvas.width = W; gl.canvas.height = H;
    free(gl, hdr);
    hdr = target(gl, W, H);
  }

  // Draws a list of prints into the deposit target.
  function stamp(prints) {
    to(gl, dep);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    depDirty = false;
    if (!prints.length) return;
    const s = P.stamp;
    gl.useProgram(s.p);
    gl.uniform4f(s.u.uField, FIELD.x, FIELD.y, FIELD.w, FIELD.h);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    for (let i = 0; i < prints.length; i += MAX_PRINTS * 8) {
      const part = new Float32Array(prints.slice(i, i + MAX_PRINTS * 8));
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, part);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, part.length / 8);
    }
    gl.disable(gl.BLEND);
    depDirty = true;
  }

  // One wear step: add the prints, spring back, heal.
  function step({ prints = [], dt = 0, heal = 0, gain = 1, regrow = 0 }) {
    if (prints.length || depDirty) stamp(prints);
    const w = P.wear;
    gl.useProgram(w.p);
    bind(gl, w, 'uField', 0, A);
    bind(gl, w, 'uDep', 1, dep);
    gl.uniform4f(w.u.uField4, FIELD.x, FIELD.y, FIELD.w, FIELD.h);
    gl.uniform1f(w.u.uDt, dt);
    gl.uniform1f(w.u.uHeal, heal);
    gl.uniform1f(w.u.uGain, gain);
    gl.uniform1f(w.u.uRegrow, regrow);
    tri(gl, B, empty);
    [A, B] = [B, A];
  }

  function clear() {
    for (const t of [A, B, dep]) { to(gl, t); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
    depDirty = false;
  }

  function frame(s) {
    if (!hdr) return;
    const l = P.lawn;
    gl.useProgram(l.p);
    bind(gl, l, 'uField', 0, A);
    gl.uniform4f(l.u.uField4, FIELD.x, FIELD.y, FIELD.w, FIELD.h);
    gl.uniform4f(l.u.uView, view.x, view.y, view.w, view.h);
    gl.uniform3fv(l.u.uSun, SUN);
    gl.uniform3fv(l.u.uSunC, s.sunC);
    gl.uniform3fv(l.u.uSkyC, s.skyC);
    gl.uniform1f(l.u.uPx, view.w / W);
    gl.uniform1f(l.u.uT, s.t);
    gl.uniform1f(l.u.uWind, s.wind);
    gl.uniform1f(l.u.uCloud, s.cloud);
    tri(gl, hdr, empty);

    const bt = bloom.render(hdr.tex, W, H, { threshold: 1.4, cap: 12, levels: s.bloomLevels });
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

  return { resize, step, clear, frame };
}
