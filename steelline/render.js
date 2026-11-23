// Steel line renderer: raw WebGL2. Sky, the static works, the goods, haze, bloom, grade.
// Sprites blend premultiplied: an alpha of 0 adds light, an alpha of 1 covers.
import { TRI_VS, program, linked, target, free, bind, tri, to } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { SKY_FS, SCENE_VS, SCENE_FS, SPRITE_VS, SPRITE_FS, HAZE_FS, FINAL_FS, NL, PLUMES } from './shaders.js';

export const MAX_SPRITES = 4096;
// Floats per sprite: three vec4 attributes.
export const SF = 12;

export async function makeRenderer(gl, works) {
  if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('no float targets');
  const P = await linked(gl, {
    sky: program(gl, TRI_VS, SKY_FS),
    scene: program(gl, SCENE_VS, SCENE_FS),
    sprite: program(gl, SPRITE_VS, SPRITE_FS),
    haze: program(gl, TRI_VS, HAZE_FS),
    final: program(gl, TRI_VS, FINAL_FS),
  });
  const empty = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 5 });

  // The static works: one buffer behind the goods, one in front.
  function staticVao(data) {
    const vao = gl.createVertexArray(), buf = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    for (let i = 0; i < 3; i++) { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, 4, gl.FLOAT, false, 48, i * 16); }
    gl.bindVertexArray(null);
    return { vao, buf, n: data.length / 12 };
  }
  const back = staticVao(works.back), front = staticVao(works.front);

  // The goods: instanced quads from a strip of four vertices.
  const sVao = gl.createVertexArray(), sBuf = gl.createBuffer();
  gl.bindVertexArray(sVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, sBuf);
  gl.bufferData(gl.ARRAY_BUFFER, MAX_SPRITES * SF * 4, gl.DYNAMIC_DRAW);
  for (let i = 0; i < 3; i++) { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, 4, gl.FLOAT, false, SF * 4, i * 16); gl.vertexAttribDivisor(i, 1); }
  gl.bindVertexArray(null);

  let W = 0, H = 0, hdr = null, haze = null, hazeScale = 0.5;
  function resize(w, h, hs = 0.5) {
    W = Math.max(2, w); H = Math.max(2, h); hazeScale = hs;
    gl.canvas.width = W; gl.canvas.height = H;
    free(gl, hdr); free(gl, haze);
    hdr = target(gl, W, H);
    haze = target(gl, Math.max(2, Math.round(W * hs)), Math.max(2, Math.round(H * hs)));
  }

  const lp = new Float32Array(NL * 4), lc = new Float32Array(NL * 4);
  function lights(prog, L) {
    const n = Math.min(NL, L.length / 8);
    for (let i = 0; i < n; i++) { for (let j = 0; j < 4; j++) { lp[i * 4 + j] = L[i * 8 + j]; lc[i * 4 + j] = L[i * 8 + 4 + j]; } }
    gl.uniform4fv(prog.u.uLP, lp);
    gl.uniform4fv(prog.u.uLC, lc);
    gl.uniform1i(prog.u.uLN, n);
    return n;
  }

  // s: view, time, day, ambient, lights, sprites, plumes, belt, bloom settings.
  function frame(s) {
    if (!hdr) return;
    const v = s.view, px = v.w / W;
    to(gl, hdr);
    gl.disable(gl.BLEND);
    // The sky first, then the works over it.
    let p = P.sky;
    gl.useProgram(p.p);
    gl.uniform4f(p.u.uView, v.x, v.y, v.w, v.h);
    gl.uniform1f(p.u.uDay, s.day);
    gl.uniform1f(p.u.uT, s.t);
    tri(gl, hdr, empty);

    p = P.scene;
    gl.useProgram(p.p);
    gl.uniform4f(p.u.uView, v.x, v.y, v.w, v.h);
    gl.uniform1f(p.u.uT, s.t);
    gl.uniform1f(p.u.uBelt, s.belt);
    if (p.u.uPx) gl.uniform1f(p.u.uPx, px);
    gl.uniform3fv(p.u.uAmb, s.amb);
    lights(p, s.lights);
    gl.bindVertexArray(back.vao);
    gl.drawArrays(gl.TRIANGLES, 0, back.n);

    // The goods, in list order, blended.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    p = P.sprite;
    gl.useProgram(p.p);
    gl.uniform4f(p.u.uView, v.x, v.y, v.w, v.h);
    gl.uniform1f(p.u.uT, s.t);
    gl.uniform1f(p.u.uPx, px);
    gl.uniform3fv(p.u.uAmb, s.amb);
    lights(p, s.lights);
    gl.bindVertexArray(sVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, sBuf);
    const n = Math.min(MAX_SPRITES, s.nSprites);
    if (n) {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, s.sprites, 0, n * SF);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
    }
    gl.disable(gl.BLEND);
    if (front.n) {
      p = P.scene;
      gl.useProgram(p.p);
      gl.bindVertexArray(front.vao);
      gl.drawArrays(gl.TRIANGLES, 0, front.n);
    }

    // Haze at a part size.
    p = P.haze;
    gl.useProgram(p.p);
    gl.uniform4f(p.u.uView, v.x, v.y, v.w, v.h);
    gl.uniform1f(p.u.uT, s.t);
    gl.uniform1f(p.u.uDay, s.day);
    gl.uniform3fv(p.u.uAmb, s.amb);
    gl.uniform4fv(p.u.uPl, s.plumes);
    gl.uniform4fv(p.u.uPlC, s.plumeC);
    lights(p, s.lights);
    tri(gl, haze, empty);

    const bt = bloom.render(hdr.tex, W, H, { threshold: 1.0, cap: 14, levels: s.bloomLevels });
    p = P.final;
    gl.useProgram(p.p);
    gl.bindVertexArray(empty);
    bind(gl, p, 'uHdr', 0, hdr);
    bind(gl, p, 'uBloom', 1, bt);
    bind(gl, p, 'uHaze', 2, haze);
    gl.uniform1f(p.u.uBloomK, s.bloomK);
    gl.uniform1f(p.u.uExpo, s.expo);
    gl.uniform1f(p.u.uAsp, W / H);
    gl.uniform1f(p.u.uFrame, s.frameNo % 64);
    tri(gl, null, empty);
  }

  return { resize, frame, PLUMES };
}
