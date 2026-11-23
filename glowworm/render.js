// Glowworm cave renderer: raw WebGL2.
// Rock at half size, then worms, threads and drops as sprites, each twice (direct and mirrored).
// Then the water, bloom and the film curve.
import { TRI_VS, program, linked, target, free, bind, tri, to } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { ROCK_FS, PTS_VS, PTS_FS, THR_VS, THR_FS, COMP_FS, FINAL_FS } from './shaders.js';

export const MAX_DROPS = 4;

export async function makeRenderer(gl, colony) {
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) throw new Error('no float targets');
  const P = await linked(gl, {
    rock: program(gl, TRI_VS, ROCK_FS),
    pts: program(gl, PTS_VS, PTS_FS),
    thr: program(gl, THR_VS, THR_FS),
    comp: program(gl, TRI_VS, COMP_FS),
    final: program(gl, TRI_VS, FINAL_FS),
  });
  const empty = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 5 });

  // One instanced vertex array: two vec4 attributes per instance.
  function instanced(data, usage = gl.STATIC_DRAW) {
    const vao = gl.createVertexArray(), buf = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    for (let i = 0; i < 2; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, 4, gl.FLOAT, false, 32, i * 16);
      gl.vertexAttribDivisor(i, 1);
    }
    gl.bindVertexArray(null);
    return { vao, buf };
  }
  const worms = instanced(colony.worms);
  const threads = instanced(colony.threads);
  const drops = instanced(new Float32Array(MAX_DROPS * 8), gl.DYNAMIC_DRAW);

  let rock = null, pts = null, hdr = null, W = 0, H = 0;
  function resize(w, h, rockScale) {
    W = Math.max(2, w); H = Math.max(2, h);
    gl.canvas.width = W; gl.canvas.height = H;
    free(gl, rock); free(gl, pts); free(gl, hdr);
    rock = target(gl, Math.max(8, Math.round(W * rockScale)), Math.max(8, Math.round(H * rockScale)), { check: true });
    pts = target(gl, W, H);
    hdr = target(gl, W, H);
  }

  function camera(p, s) {
    gl.uniform3fv(p.u.uEye, s.eye);
    gl.uniform3fv(p.u.uF, s.F);
    gl.uniform3fv(p.u.uR, s.R);
    gl.uniform3fv(p.u.uU, s.U);
    gl.uniform2f(p.u.uTan, s.tanX, s.tanY);
  }
  function sprites(p, s) {
    camera(p, s);
    bind(gl, p, 'uRock', 0, rock);
    gl.uniform2f(p.u.uRes, W, H);
    gl.uniform1f(p.u.uT, s.t);
    gl.uniform1f(p.u.uTa, s.ta);
    gl.uniform1f(p.u.uFocal, H / (2 * s.tanY));
    gl.uniform4fv(p.u.uEv, s.ev);
    gl.uniform4fv(p.u.uEvK, s.evK);
  }

  // s: the frame state from main.js.
  function frame(s) {
    if (!hdr) return;
    gl.disable(gl.BLEND);
    const r = P.rock;
    gl.useProgram(r.p);
    camera(r, s);
    gl.uniform1f(r.u.uSteps, s.steps);
    gl.uniform1f(r.u.uZero, 0);
    gl.uniform1f(r.u.uLight, s.rockLight);
    gl.uniform1f(r.u.uT, s.t);
    gl.uniform4fv(r.u.uEv, s.ev);
    gl.uniform4fv(r.u.uEvK, s.evK);
    tri(gl, rock, empty);

    // Worms, threads and drops add their light; each draws direct, then mirrored.
    to(gl, pts);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    const q = P.pts;
    gl.useProgram(q.p);
    sprites(q, s);
    gl.uniform1f(q.u.uGain, s.gain);
    gl.bindVertexArray(worms.vao);
    for (const flip of [1, -1]) {
      gl.uniform1f(q.u.uFlip, flip);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, colony.wormCount);
    }
    const t = P.thr;
    gl.useProgram(t.p);
    sprites(t, s);
    gl.uniform1f(t.u.uSway, s.sway);
    gl.uniform1f(t.u.uThrGain, s.thrGain);
    gl.uniform1f(t.u.uDropGain, s.dropGain);
    gl.uniform1f(t.u.uGl, s.glint);
    const nThr = Math.min(colony.threadCount, s.threadCount);
    for (const flip of [1, -1]) {
      gl.uniform1f(t.u.uFlip, flip);
      gl.bindVertexArray(threads.vao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nThr);
      if (s.dropCount) {
        gl.bindVertexArray(drops.vao);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, s.dropCount);
      }
    }
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);

    const c = P.comp;
    gl.useProgram(c.p);
    camera(c, s);
    bind(gl, c, 'uRock', 0, rock);
    bind(gl, c, 'uPts', 1, pts);
    gl.uniform1f(c.u.uT, s.t);
    gl.uniform1f(c.u.uTa, s.ta);
    gl.uniform1f(c.u.uPx, 2 * s.tanY / H);
    gl.uniform1f(c.u.uStill, s.still);
    gl.uniform1f(c.u.uRefl, s.refl);
    gl.uniform4fv(c.u.uRip, s.rip);
    tri(gl, hdr, empty);

    const bt = bloom.render(hdr.tex, W, H, { threshold: 0.35, cap: 8, levels: s.bloomLevels });
    const f = P.final;
    gl.useProgram(f.p);
    bind(gl, f, 'uHdr', 0, hdr);
    bind(gl, f, 'uBloom', 1, bt);
    gl.uniform1f(f.u.uBloomK, s.bloomK);
    gl.uniform1f(f.u.uExpo, s.expo);
    gl.uniform1f(f.u.uAsp, W / H);
    gl.uniform1f(f.u.uFrame, s.frameNo % 64);
    tri(gl, null, empty);
  }

  // Drops: up to four short streaks. data holds 8 floats each.
  function setDrops(data) {
    gl.bindBuffer(gl.ARRAY_BUFFER, drops.buf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
  }

  return { resize, frame, setDrops };
}
