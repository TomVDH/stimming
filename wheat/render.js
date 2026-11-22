// Wheat storm renderer: raw WebGL2, five small programs, then bloom.
// The deck draws at half size; the field and the heads share a multisampled target.
import { TRI_VS, program, linked, target, msTarget, free, bind, tri, to } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { CLOUD_FS, BLUR_FS, FIELD_FS, HEAD_VS, HEAD_FS, BOLT_VS, BOLT_FS, FINAL_FS } from './shaders.js';

/* ---------- the noise volume ---------- */
// 64 cubed, tiling: value noise in red, puffy cells in green.
function noiseVolume(gl) {
  const S = 64, data = new Uint8Array(S * S * S * 2);
  let seed = 9;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const lat = n => Float32Array.from({ length: n * n * n }, rnd);
  const L1 = lat(8), L2 = lat(16);
  const sm = t => t * t * (3 - 2 * t);
  const value = (L, n, x, y, z) => {
    const fx = x * n / S, fy = y * n / S, fz = z * n / S;
    const ix = Math.floor(fx), iy = Math.floor(fy), iz = Math.floor(fz);
    const tx = sm(fx - ix), ty = sm(fy - iy), tz = sm(fz - iz);
    const at = (a, b, c) => L[((a % n) * n + (b % n)) * n + (c % n)];
    const l = (a, b) => at(ix + a, iy + b, iz) * (1 - tz) + at(ix + a, iy + b, iz + 1) * tz;
    const yz = a => l(a, 0) * (1 - ty) + l(a, 1) * ty;
    return yz(0) * (1 - tx) + yz(1) * tx;
  };
  // Cell points for the puffs: one per cell of an 8 cubed grid.
  const C = 8, pts = Float32Array.from({ length: C * C * C * 3 }, rnd);
  for (let z = 0; z < S; z++) for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (z * S + y) * S + x;
    data[i * 2] = Math.round(255 * (value(L1, 8, x, y, z) * 0.65 + value(L2, 16, x, y, z) * 0.35));
    const cx = x * C / S, cy = y * C / S, cz = z * C / S;
    const bx = Math.floor(cx), by = Math.floor(cy), bz = Math.floor(cz);
    let d2 = 9;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      const gx = bx + a, gy = by + b, gz = bz + c;
      const k = ((((gz + C) % C) * C + ((gy + C) % C)) * C + ((gx + C) % C)) * 3;
      const dx = gx + pts[k] - cx, dy = gy + pts[k + 1] - cy, dz = gz + pts[k + 2] - cz;
      d2 = Math.min(d2, dx * dx + dy * dy + dz * dz);
    }
    data[i * 2 + 1] = Math.round(255 * Math.max(0, 1 - Math.sqrt(d2) * 1.1));
  }
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_3D, tex);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RG8, S, S, S, 0, gl.RG, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  for (const w of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D, w, gl.REPEAT);
  return tex;
}

/* ---------- the near heads ---------- */
// Full density to 12 m, then thinning as one over the distance squared.
// The canopy shader fills the gaps far off.
export function plantField(count, { tanW, vy, hz }) {
  let seed = 31;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // The nearest heads stand just under the frame's foot.
  const D0 = Math.min(7.5, Math.max(2.5, 0.9 * (4 - 1.05) / (hz * vy))), D1 = 62, K = 12;
  const P = new Float32Array(count * 4), Q = new Float32Array(count * 4);
  const list = [];
  // Draws a distance with the density's share at each distance.
  const cdfMax = K * K * Math.log(D1 / K) + (K * K - D0 * D0) / 2;
  while (list.length < count) {
    const u = rnd() * cdfMax;
    const d = u < (K * K - D0 * D0) / 2 ? Math.sqrt(D0 * D0 + 2 * u) : K * Math.exp((u - (K * K - D0 * D0) / 2) / (K * K));
    // A margin past the frame edge: wind can lean heads in.
    const x = (rnd() * 2 - 1) * (d * tanW * 1.08 + 0.6);
    list.push([x, d]);
  }
  // Front to back, so early depth tests save the far heads.
  list.sort((a, b) => a[1] - b[1]);
  list.forEach(([x, z], i) => {
    const hi = rnd();
    P.set([x, z, rnd(), rnd()], i * 4);
    // Height in lumps a metre wide, a few tall stragglers.
    const H = 0.93 + 0.06 * Math.sin(x * 1.3 + z * 0.7) * Math.sin(z * 1.1 - x * 0.4) + 0.06 * (hi - 0.5) + (rnd() > 0.96 ? 0.07 : 0);
    Q.set([H, rnd(), rnd(), rnd()], i * 4);
  });
  return { P, Q, count };
}

export async function makeRenderer(gl, { heads }) {
  if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('no float targets');
  const P = await linked(gl, {
    cloud: program(gl, TRI_VS, CLOUD_FS),
    blur: program(gl, TRI_VS, BLUR_FS),
    field: program(gl, TRI_VS, FIELD_FS),
    head: program(gl, HEAD_VS, HEAD_FS, ['aP', 'aQ']),
    bolt: program(gl, BOLT_VS, BOLT_FS, ['aA', 'aB', 'aW']),
    final: program(gl, TRI_VS, FINAL_FS),
  });
  const empty = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 6 });
  const noise = noiseVolume(gl);

  // The heads: two attributes per instance.
  const headVao = gl.createVertexArray(), bufP = gl.createBuffer(), bufQ = gl.createBuffer();
  let headCount = 0;
  function setHeads(h) {
    gl.bindVertexArray(headVao);
    for (const [buf, data, loc] of [[bufP, h.P, 0], [bufQ, h.Q, 1]]) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(loc, 1);
    }
    gl.bindVertexArray(null);
    headCount = h.count;
  }
  setHeads(heads);

  // The channel: six vertices a segment, rebuilt per strike.
  const boltVao = gl.createVertexArray(), boltBuf = gl.createBuffer();
  let boltVerts = 0;
  function setBolt(segs) {
    // segs: [ax, ay, az, bx, by, bz, order, brightness] per segment.
    const n = segs.length / 8, f = new Float32Array(n * 6 * 10);
    const corners = [[0, 0], [1, 0], [0, 1], [0, 1], [1, 0], [1, 1]];
    for (let i = 0; i < n; i++) for (let c = 0; c < 6; c++) {
      const o = (i * 6 + c) * 10, s = i * 8;
      f.set([segs[s], segs[s + 1], segs[s + 2], segs[s + 3], segs[s + 4], segs[s + 5], corners[c][0], corners[c][1], segs[s + 6], segs[s + 7]], o);
    }
    gl.bindVertexArray(boltVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, boltBuf);
    gl.bufferData(gl.ARRAY_BUFFER, f, gl.DYNAMIC_DRAW);
    for (const [loc, size, off] of [[0, 3, 0], [1, 3, 12], [2, 4, 24]]) {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 40, off);
    }
    gl.bindVertexArray(null);
    boltVerts = n * 6;
  }

  let cloudA = null, cloudB = null, ms = null, hdr = null, W = 0, H = 0, msaa = false, cloudScale = 0.5;
  function resize(w, h, { cloud = 0.5 } = {}) {
    W = Math.max(2, w); H = Math.max(2, h); cloudScale = cloud;
    gl.canvas.width = W; gl.canvas.height = H;
    [cloudA, cloudB, ms, hdr].forEach(t => free(gl, t));
    const cw = Math.max(2, Math.round(W * cloud)), ch = Math.max(2, Math.round(H * cloud));
    cloudA = target(gl, cw, ch, { check: true });
    cloudB = target(gl, cw, ch);
    hdr = target(gl, W, H, { depth: true });
    ms = msTarget(gl, W, H, Math.min(4, gl.getParameter(gl.MAX_SAMPLES)));
    msaa = ms.ok;
    if (!msaa) { free(gl, ms); ms = null; }
  }

  // The lens and the wind: every scene pass reads them.
  function common(p, s) {
    const u = p.u;
    if (u.uTanW) gl.uniform1f(u.uTanW, s.tanW);
    if (u.uVy) gl.uniform1f(u.uVy, s.vy);
    if (u.uHz) gl.uniform1f(u.uHz, s.hz);
    if (u.uPxM) gl.uniform1f(u.uPxM, 2 * s.tanW / W);
    if (u.uPhase) gl.uniform1f(u.uPhase, s.phase);
    if (u.uWind) gl.uniform1f(u.uWind, s.wind);
    if (u.uT) gl.uniform1f(u.uT, s.t);
    if (u.uFront) gl.uniform4fv(u.uFront, s.fronts);
    if (u.uBolt) gl.uniform4fv(u.uBolt, s.bolt);
    if (u.uBoltC) gl.uniform3fv(u.uBoltC, s.boltC);
    if (u.uFlash) gl.uniform1f(u.uFlash, s.flash);
  }

  function frame(s) {
    if (!hdr) return;
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.bindVertexArray(empty);

    // The deck, then a blur across and down.
    const c = P.cloud;
    gl.useProgram(c.p);
    common(c, s);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_3D, noise);
    gl.uniform1i(c.u.uNoise, 0);
    gl.uniform1f(c.u.uDrift, s.drift);
    gl.uniform1f(c.u.uFrame, s.frameNo % 64);
    gl.uniform4fv(c.u.uBoltTop, s.boltTop);
    tri(gl, cloudA, empty);
    const b = P.blur;
    gl.useProgram(b.p);
    bind(gl, b, 'uSrc', 0, cloudA);
    gl.uniform2f(b.u.uStep, 1.5, 0);
    tri(gl, cloudB, empty);
    bind(gl, b, 'uSrc', 0, cloudB);
    gl.uniform2f(b.u.uStep, 0, 1.5);
    tri(gl, cloudA, empty);

    // The scene: sky and canopy write depth; the heads test against it.
    const dst = ms || hdr;
    to(gl, dst);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.ALWAYS);
    gl.depthMask(true);
    const f = P.field;
    gl.useProgram(f.p);
    common(f, s);
    bind(gl, f, 'uCloud', 0, cloudA);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.depthFunc(gl.LESS);
    const h = P.head;
    gl.useProgram(h.p);
    common(h, s);
    gl.uniform1f(h.u.uMsaa, msaa ? 1 : 0);
    if (msaa) gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
    gl.bindVertexArray(headVao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 28, Math.min(headCount, s.headCount ?? headCount));
    gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);

    // The channel: a wide violet halo, then the white core.
    if (s.channel > 0 && boltVerts) {
      const q = P.bolt;
      gl.useProgram(q.p);
      common(q, s);
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindVertexArray(boltVao);
      gl.uniform2f(q.u.uView, W, H);
      gl.uniform1f(q.u.uGrow, s.grow);
      gl.uniform1f(q.u.uMain, s.mainOnly);
      const px = W / 1280;
      for (const [wd, sharp, col] of [[22 * px, 2.2, [0.5, 0.42, 1.0].map(v => v * 0.25 * s.channel)], [2.6 * px + 0.6, 1.5, [1, 0.96, 1.0].map(v => v * 14 * s.channel)]]) {
        gl.uniform1f(q.u.uWidth, wd);
        gl.uniform1f(q.u.uSharp, sharp);
        gl.uniform3fv(q.u.uCol, col);
        gl.drawArrays(gl.TRIANGLES, 0, boltVerts);
      }
      gl.disable(gl.BLEND);
      gl.depthMask(true);
    }
    gl.disable(gl.DEPTH_TEST);

    if (ms) {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, ms.fb);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, hdr.fb);
      gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    }

    const bt = bloom.render(hdr.tex, W, H, { threshold: 1.4, cap: 60, levels: s.bloomLevels });
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

  return { resize, frame, setHeads, setBolt, get msaa() { return msaa; } };
}
