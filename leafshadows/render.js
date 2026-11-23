// Leaf shadows renderer: raw WebGL2, five small programs, then bloom.
// Each layer of leaves draws into a mask; the far masks blur by the sun's disc.
// The wall pass lights the plaster through the masks and the hand.
import { TRI_VS, program, linked, target, free, bind, tri, to } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { LEAF_VS, LEAF_FS, BLUR_FS, BAKE_FS, WALL_FS, FINAL_FS } from './shaders.js';
import { LAYERS, SUN, SLANT, LEAF_TAU, discAt } from './tree.js';

// The masks reach past the view, so a blur at the edge reads leaves.
const MARGIN = 0.16;

export async function makeRenderer(gl, { tree }) {
  if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('no float targets');
  const P = await linked(gl, {
    leaf: program(gl, LEAF_VS, LEAF_FS, ['aA', 'aB', 'aC']),
    blur: program(gl, TRI_VS, BLUR_FS),
    bake: program(gl, TRI_VS, BAKE_FS),
    wall: program(gl, TRI_VS, WALL_FS),
    final: program(gl, TRI_VS, FINAL_FS),
  });
  const empty = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 6 });

  // One vertex array a layer: twelve floats an instance.
  const vaos = tree.layers.map(({ data, count }) => {
    const vao = gl.createVertexArray(), buf = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    for (let i = 0; i < 3; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, 4, gl.FLOAT, false, 48, i * 16);
      gl.vertexAttribDivisor(i, 1);
    }
    gl.bindVertexArray(null);
    return { vao, buf, count };
  });

  let W = 0, H = 0, view = null, mask = null, masks = [], blurs = [], bake = null, hdr = null;
  // w, h: canvas pixels. v: the visible wall, { x, y, w, h } in metres from its lower-left corner.
  function resize(w, h, v) {
    W = Math.max(2, w); H = Math.max(2, h); view = v;
    gl.canvas.width = W; gl.canvas.height = H;
    [...masks, ...blurs, bake, hdr].forEach(t => free(gl, t));
    mask = { x: v.x - MARGIN, y: v.y - MARGIN, w: v.w + 2 * MARGIN, h: v.h + 2 * MARGIN };
    const pxM = v.w / W;
    masks = LAYERS.map(L => {
      const mw = Math.max(4, Math.round(mask.w / pxM * L.scale)), mh = Math.max(4, Math.round(mask.h / pxM * L.scale));
      return target(gl, mw, mh, { format: gl.RGBA8 });
    });
    blurs = LAYERS.slice(0, 3).map((L, i) => target(gl, masks[i].w, masks[i].h, { format: gl.RGBA8 }));
    bake = target(gl, W, H, { filter: gl.NEAREST });
    hdr = target(gl, W, H);
    // The plaster bakes once per size.
    const b = P.bake;
    gl.useProgram(b.p);
    gl.uniform4f(b.u.uWall, v.x, v.y, v.w, v.h);
    gl.uniform1f(b.u.uPxM, pxM);
    gl.disable(gl.BLEND);
    tri(gl, bake, empty);
  }

  function frame(s) {
    if (!hdr) return;
    const pxM = view.w / W;

    // The masks: clear to full light, then multiply each leaf in.
    const l = P.leaf;
    gl.useProgram(l.p);
    gl.uniform4fv(l.u.uBr, s.br);
    gl.uniform4f(l.u.uView, mask.x, mask.y, mask.w, mask.h);
    gl.uniform1f(l.u.uPt, s.pt);
    gl.uniform1f(l.u.uPf, s.pf);
    gl.uniform3fv(l.u.uTau, LEAF_TAU);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ZERO, gl.SRC_COLOR);
    LAYERS.forEach((L, i) => {
      const t = masks[i];
      to(gl, t);
      gl.clearColor(1, 1, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const px = mask.w / t.w;
      // The near layer draws its own penumbra; the others blur later.
      const soft = L.taps ? 0 : discAt(L.d)[0];
      gl.uniform1f(l.u.uAA, px * 0.75 + soft);
      gl.uniform1f(l.u.uPad, px * 1.5 + soft);
      if (s.only !== undefined && s.only !== i) return;
      gl.bindVertexArray(vaos[i].vao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, vaos[i].count);
    });
    gl.disable(gl.BLEND);

    // The far layers: each blurs by its disc, times the one before.
    const b = P.blur;
    gl.useProgram(b.p);
    gl.bindVertexArray(empty);
    for (let i = 0; i < 3; i++) {
      const [rn, rj] = discAt(LAYERS[i].d);
      bind(gl, b, 'uSrc', 0, masks[i]);
      bind(gl, b, 'uPrev', 1, i ? blurs[i - 1] : masks[i]);
      gl.uniform1f(b.u.uPrevK, i ? 1 : 0);
      gl.uniform2f(b.u.uMaj, SLANT[0] * rj / mask.w, SLANT[1] * rj / mask.h);
      gl.uniform2f(b.u.uMin, -SLANT[1] * rn / mask.w, SLANT[0] * rn / mask.h);
      gl.uniform1i(b.u.uN, Math.max(8, Math.round(LAYERS[i].taps * (s.taps ?? 1))));
      tri(gl, blurs[i]);
    }

    // The wall.
    const w = P.wall;
    gl.useProgram(w.p);
    bind(gl, w, 'uBake', 0, bake);
    bind(gl, w, 'uT', 1, blurs[2]);
    bind(gl, w, 'uNear', 2, masks[3]);
    gl.uniform4f(w.u.uWall, view.x, view.y, view.w, view.h);
    gl.uniform4f(w.u.uMask, mask.x, mask.y, mask.w, mask.h);
    gl.uniform3fv(w.u.uSun, SUN);
    gl.uniform3fv(w.u.uSunC, s.sunC);
    gl.uniform3fv(w.u.uSkyC, s.skyC);
    gl.uniform3fv(w.u.uBounce, s.bounce);
    gl.uniform1f(w.u.uPxM, pxM);
    gl.uniform1f(w.u.uBump, s.bump);
    gl.uniform4fv(w.u.uHand, s.hand);
    gl.uniform1f(w.u.uSplay, s.splay);
    // The hand stands 0.6 m from the wall.
    gl.uniform1f(w.u.uHandSoft, discAt(0.6)[0] * 1.2 + pxM);
    tri(gl, hdr, empty);

    const bt = bloom.render(hdr.tex, W, H, { threshold: 1.6, cap: 20, levels: s.bloomLevels });
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
