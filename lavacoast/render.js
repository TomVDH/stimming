// Lava coast renderer: raw WebGL2, six small programs, then bloom.
// The steam draws at half size; the sea pass lays it over the scene.
import { TRI_VS, program, linked, target, free, bind, tri, to } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { SKY_FS, LAND_VS, LAND_FS, SPARK_VS, SPARK_FS, STEAM_FS, BLUR_FS, SEA_FS, FINAL_FS } from './shaders.js';
import { GRID, NEAR, FAR, heights } from './land.js';

// Fountain clots, and spatter for six bursts of 64.
export const NF = 4200, NB = 6 * 64;

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
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  return tex;
}

// A float texture with no mips. Float32 data goes into the given format.
function dataTex(gl, w, h, fmt, src, data, { filter = gl.NEAREST, wrapS = gl.CLAMP_TO_EDGE } = {}) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, fmt, w, h, 0, src, gl.FLOAT, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

// A grid mesh of n by n cells over [0, 1] squared.
function gridMesh(gl, n) {
  const v = new Float32Array((n + 1) * (n + 1) * 2);
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) v.set([i / n, j / n], (j * (n + 1) + i) * 2);
  const idx = new Uint32Array(n * n * 6);
  let k = 0;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1;
    idx.set([a, c, b, b, c, d], k); k += 6;
  }
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const vb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vb);
  gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const ib = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return { vao, count: idx.length };
}

export async function makeRenderer(gl, { simN, glowN }) {
  if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('no float targets');
  const P = await linked(gl, {
    sky: program(gl, TRI_VS, SKY_FS),
    land: program(gl, LAND_VS, LAND_FS, ['aG']),
    spark: program(gl, SPARK_VS, SPARK_FS),
    steam: program(gl, TRI_VS, STEAM_FS),
    blur: program(gl, TRI_VS, BLUR_FS),
    sea: program(gl, TRI_VS, SEA_FS),
    final: program(gl, TRI_VS, FINAL_FS),
  });
  const empty = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 6 });
  const noise = noiseVolume(gl);
  const near = gridMesh(gl, NEAR.n), far = gridMesh(gl, 256);
  const bNear = dataTex(gl, NEAR.n, NEAR.n, gl.R32F, gl.RED, heights(NEAR));
  const bFar = dataTex(gl, FAR.n, FAR.n, gl.R32F, gl.RED, heights(FAR));
  // The sea reads depth from a filtered copy of the slope's heights.
  const bSea = dataTex(gl, NEAR.n, NEAR.n, gl.R16F, gl.RED, heights(NEAR), { filter: gl.LINEAR });
  const lavaTex = dataTex(gl, simN, simN, gl.RGBA32F, gl.RGBA, new Float32Array(simN * simN * 4));
  const glowTex = dataTex(gl, glowN, glowN, gl.R16F, gl.RED, new Float32Array(glowN * glowN), { filter: gl.LINEAR });
  // Five rows of steam history, 128 columns of 0.5 s; the columns wrap.
  const histTex = dataTex(gl, 128, 5, gl.R16F, gl.RED, new Float32Array(128 * 5), { filter: gl.LINEAR, wrapS: gl.REPEAT });

  function setLava(data) {
    gl.bindTexture(gl.TEXTURE_2D, lavaTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, simN, simN, gl.RGBA, gl.FLOAT, data);
  }
  function setGlow(data) {
    gl.bindTexture(gl.TEXTURE_2D, glowTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, glowN, glowN, gl.RED, gl.FLOAT, data);
  }
  // One column of the history: five values, one per tower.
  const col = new Float32Array(5);
  function setHist(column, values) {
    col.set(values);
    gl.bindTexture(gl.TEXTURE_2D, histTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, column, 0, 1, 5, gl.RED, gl.FLOAT, col);
  }

  let A = null, sa = null, sb = null, C = null, W = 0, H = 0;
  function resize(w, h, { steam = 0.5 } = {}) {
    W = Math.max(2, w); H = Math.max(2, h);
    gl.canvas.width = W; gl.canvas.height = H;
    [A, sa, sb, C].forEach(t => free(gl, t));
    A = target(gl, W, H, { depth: true, check: true });
    C = target(gl, W, H);
    const sw = Math.max(2, Math.round(W * steam)), sh = Math.max(2, Math.round(H * steam));
    sa = target(gl, sw, sh);
    sb = target(gl, sw, sh);
  }

  function common(p, s) {
    const u = p.u;
    if (u.uTanW) gl.uniform1f(u.uTanW, s.tanW);
    if (u.uVy) gl.uniform1f(u.uVy, s.vy);
    if (u.uHz) gl.uniform1f(u.uHz, s.hz);
    if (u.uT) gl.uniform1f(u.uT, s.t);
    if (u.uVentL) gl.uniform4fv(u.uVentL, s.ventL);
    if (u.uSlot) gl.uniform4fv(u.uSlot, s.slots);
    if (u.uSim) gl.uniform3f(u.uSim, GRID.x0, GRID.z0, GRID.size);
  }

  function frame(s) {
    if (!A) return;
    gl.disable(gl.BLEND);
    gl.bindVertexArray(empty);

    // The sky, then the land over it with depth.
    to(gl, A);
    gl.clearDepth(1);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    const k = P.sky;
    gl.useProgram(k.p);
    common(k, s);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
    const l = P.land;
    gl.useProgram(l.p);
    common(l, s);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, lavaTex);
    gl.uniform1i(l.u.uL, 1);
    bind(gl, l, 'uGlow', 2, glowTex);
    gl.uniform1f(l.u.uCs, GRID.size / simN);
    gl.uniform1f(l.u.uVentHeat, s.ventHeat);
    gl.uniform2f(l.u.uVent, s.vent[0], s.vent[2]);
    gl.uniform4f(l.u.uHole, NEAR.x0 + 8, NEAR.z0 + 8, NEAR.x0 + NEAR.size - 8, NEAR.z0 + NEAR.size - 8);
    for (const [mesh, g, tex, mode] of [[far, FAR, bFar, 1], [near, NEAR, bNear, 0]]) {
      bind(gl, l, 'uB', 0, tex);
      gl.uniform3f(l.u.uGrid, g.x0, g.z0, g.size);
      gl.uniform1f(l.u.uMode, mode);
      gl.bindVertexArray(mesh.vao);
      gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_INT, 0);
    }

    // The clots and the spatter add light; the scene's depth hides them.
    if (s.sparks) {
      const q = P.spark;
      gl.useProgram(q.p);
      common(q, s);
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE);
      gl.bindVertexArray(empty);
      gl.uniform3fv(q.u.uVentP, s.vent);
      gl.uniform1fv(q.u.uFount, s.fount);
      gl.uniform1f(q.u.uFountH, s.fountH);
      gl.uniform1f(q.u.uExpo, 0.05);
      gl.uniform1f(q.u.uWindX, s.windX);
      gl.uniform4fv(q.u.uBurst, s.bursts);
      gl.uniform2f(q.u.uView, W, H);
      gl.uniform1i(q.u.uNF, NF);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, NF + NB);
      gl.disable(gl.BLEND);
      gl.depthMask(true);
    }
    gl.disable(gl.DEPTH_TEST);
    gl.bindVertexArray(empty);

    // The steam, at half size, then a blur across and down.
    const st = P.steam;
    gl.useProgram(st.p);
    common(st, s);
    bind(gl, st, 'uScene', 0, A);
    bind(gl, st, 'uHist', 1, histTex);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_3D, noise);
    gl.uniform1i(st.u.uNoise, 2);
    bind(gl, st, 'uGlow', 3, glowTex);
    gl.uniform1f(st.u.uFrame, s.frameNo % 64);
    gl.uniform1f(st.u.uHead, s.head);
    gl.uniform1f(st.u.uSteps, s.steps);
    gl.uniform2f(st.u.uWindV, s.windX, 0);
    tri(gl, sa, empty);
    const b = P.blur;
    gl.useProgram(b.p);
    bind(gl, b, 'uSrc', 0, sa);
    gl.uniform2f(b.u.uStep, 1.5, 0);
    tri(gl, sb, empty);
    bind(gl, b, 'uSrc', 0, sb);
    gl.uniform2f(b.u.uStep, 0, 1.5);
    tri(gl, sa, empty);

    // The sea and the steam over all.
    const se = P.sea;
    gl.useProgram(se.p);
    common(se, s);
    bind(gl, se, 'uScene', 0, A);
    bind(gl, se, 'uSteam', 1, sa);
    bind(gl, se, 'uGlow', 2, glowTex);
    bind(gl, se, 'uB', 3, bSea);
    gl.uniform3f(se.u.uGrid, NEAR.x0, NEAR.z0, NEAR.size);
    gl.uniform1f(se.u.uSwell, s.swell);
    tri(gl, C, empty);

    const bt = bloom.render(C.tex, W, H, { threshold: 1.1, cap: 40, levels: s.bloomLevels });
    const o = P.final;
    gl.useProgram(o.p);
    gl.bindVertexArray(empty);
    bind(gl, o, 'uHdr', 0, C);
    bind(gl, o, 'uBloom', 1, bt);
    gl.uniform1f(o.u.uBloomK, s.bloomK);
    gl.uniform1f(o.u.uExpo, s.expo);
    gl.uniform1f(o.u.uAsp, W / H);
    gl.uniform1f(o.u.uFrame, s.frameNo % 64);
    tri(gl, null, empty);
  }

  return { resize, frame, setLava, setGlow, setHist };
}
