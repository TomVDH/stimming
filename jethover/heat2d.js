// Jet hover: the hot air as a 2D sim in the nozzle plane, after Schlieren candle.
// The velocity grid is coarse; the heat grid is four times finer.
// MacCormack transport keeps the heat filaments sharp.
// The slope of the heat bends the frame.

/**
 * @param {object} o
 * @param {typeof import('three/webgpu')} o.THREE
 * @param {typeof import('three/tsl')} o.TSL
 * @param {import('three/webgpu').WebGPURenderer} o.renderer
 * @param {[number, number]} o.size Plane width and height in metres.
 * @param {[number, number]} o.origin World x and y of the lower left corner.
 * @param {number} o.z World z of the plane.
 * @param {[number, number]} o.grid Velocity cells across and up.
 * @param {number} [o.fine] Heat cells per velocity cell, per axis.
 * @param {number} [o.iters] Pressure passes per step.
 */
export function createHeat2D({ THREE, TSL, renderer, size, origin, z, grid, fine = 4, iters = 24 }) {
  const {
    Fn, vec2, vec4, float, uvec2, uniform, texture, textureStore, instanceIndex,
    smoothstep, mix, min, max, abs, exp, floor, If, uv,
  } = TSL;
  const [W, H] = size, [VX, VY] = grid, TX = VX * fine, TY = VY * fine;
  // Cell size in metres; cells are square.
  const h = W / VX;

  const u = {
    dt: uniform(1 / 60),
    // Per jet: nozzle x, y; axis x, y.
    jetN: [0, 1].map(() => uniform(new THREE.Vector4(0, -100, 0, -1))),
    // Per jet: driven length, core radius, speed, heat.
    jetK: [0, 1].map(() => uniform(new THREE.Vector4(0, 0.4, 0, 0))),
    // Vorticity confinement keeps the eddies alive.
    curlK: uniform(6.0),
    // Hot air rises.
    lift: uniform(14.0),
    // The air slows a little each step.
    damp: uniform(0.15),
    // The air loses heat, per second.
    cool: uniform(0.5),
  };

  function tex2D(w, hh, name) {
    const t = new THREE.StorageTexture(w, hh);
    t.name = name;
    t.format = THREE.RGBAFormat;
    t.type = THREE.HalfFloatType;
    t.minFilter = t.magFilter = THREE.LinearFilter;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  }
  const vel = [tex2D(VX, VY, 'heat2d vel A'), tex2D(VX, VY, 'heat2d vel B')];
  const prs = [tex2D(VX, VY, 'heat2d prs A'), tex2D(VX, VY, 'heat2d prs B')];
  const curlT = tex2D(VX, VY, 'heat2d curl');
  const divT = tex2D(VX, VY, 'heat2d div');
  const heat = [tex2D(TX, TY, 'heat2d T A'), tex2D(TX, TY, 'heat2d T B')];
  const hatT = tex2D(TX, TY, 'heat2d T hat');
  const backT = tex2D(TX, TY, 'heat2d T back');

  const SZ = vec2(W, H);
  const cellOf = (nx, ny) => {
    const id = instanceIndex;
    return uvec2(id.mod(nx), id.div(nx));
  };
  const uvOf = (c, nx, ny) => vec2(c).add(0.5).div(vec2(nx, ny));
  const S = (t, p) => texture(t, p, 0);
  // World place of a uv on the plane, in metres.
  const world = p => p.mul(SZ).add(vec2(origin[0], origin[1]));

  // The jet core: 1 on the axis near the nozzle, 0 outside.
  function core(p, j, wide = 1) {
    const N = u.jetN[j], K = u.jetK[j];
    const w = p.sub(N.xy);
    const s0 = w.dot(N.zw);
    const s = s0.clamp(0.0, K.x);
    const r = w.sub(N.zw.mul(s)).length();
    const R = K.y.mul(wide).add(s.mul(0.06));
    return float(1.0).sub(smoothstep(R.mul(0.5), R, r)).mul(smoothstep(0.0, 0.2, s0)).mul(float(1.0).sub(smoothstep(K.x.sub(0.4), K.x, s0)));
  }

  /* ---------- the air ---------- */
  // A semi-Lagrangian step with a midpoint trace.
  const advVel = (src, dst) => Fn(() => {
    const c = cellOf(VX, VY), p = uvOf(c, VX, VY);
    const v = S(src, p).xy;
    const m = S(src, p.sub(v.mul(u.dt).mul(0.5).div(SZ))).xy;
    const o = S(src, p.sub(m.mul(u.dt).div(SZ))).xy.div(u.damp.mul(u.dt).add(1.0));
    textureStore(dst, c, vec4(o, 0, 1)).toWriteOnly();
  })().compute(VX * VY);

  const curlPass = (src) => Fn(() => {
    const c = cellOf(VX, VY), p = uvOf(c, VX, VY), e = vec2(1 / VX, 1 / VY);
    const l = S(src, p.sub(vec2(e.x, 0))).y, r = S(src, p.add(vec2(e.x, 0))).y;
    const b = S(src, p.sub(vec2(0, e.y))).x, t = S(src, p.add(vec2(0, e.y))).x;
    textureStore(curlT, c, vec4(r.sub(l).sub(t).add(b).div(2 * h), 0, 0, 1)).toWriteOnly();
  })().compute(VX * VY);

  // Curl, buoyancy and the jets.
  const force = (src, dst, T) => Fn(() => {
    const c = cellOf(VX, VY), p = uvOf(c, VX, VY), e = vec2(1 / VX, 1 / VY);
    const v = S(src, p).xy.toVar();
    const cl = abs(S(curlT, p.sub(vec2(e.x, 0))).x), cr = abs(S(curlT, p.add(vec2(e.x, 0))).x);
    const cb = abs(S(curlT, p.sub(vec2(0, e.y))).x), ct = abs(S(curlT, p.add(vec2(0, e.y))).x);
    const w = S(curlT, p).x;
    const g = vec2(cr.sub(cl), ct.sub(cb));
    v.addAssign(vec2(g.y, g.x.negate()).div(g.length().add(1e-5)).mul(w).mul(u.curlK).mul(h).mul(u.dt));
    // The heat grid is finer; a filtered read averages it over this cell.
    v.y.addAssign(S(T, p).x.mul(u.lift).mul(u.dt));
    const wp = world(p);
    for (let j = 0; j < 2; j++) {
      const N = u.jetN[j], K = u.jetK[j];
      // The jet holds its speed near the nozzle and frees it further down.
      const s = wp.sub(N.xy).dot(N.zw).clamp(0.0, K.x);
      const hold = mix(0.8, 0.25, smoothstep(0.5, 3.0, s));
      v.assign(mix(v, N.zw.mul(K.z), core(wp, j).mul(hold)));
    }
    // The floor is solid.
    If(c.y.equal(0), () => { v.y.assign(max(v.y, 0.0)); });
    textureStore(dst, c, vec4(v, 0, 1)).toWriteOnly();
  })().compute(VX * VY);

  // Divergence times h squared, as the Jacobi pass wants it.
  // The floor is closed.
  const divPass = (src) => Fn(() => {
    const c = cellOf(VX, VY), p = uvOf(c, VX, VY), e = vec2(1 / VX, 1 / VY);
    const m = S(src, p).xy;
    const l = S(src, p.sub(vec2(e.x, 0))).x, r = S(src, p.add(vec2(e.x, 0))).x;
    const t = S(src, p.add(vec2(0, e.y))).y;
    const b = c.y.equal(0).select(m.y.negate(), S(src, p.sub(vec2(0, e.y))).y);
    textureStore(divT, c, vec4(r.sub(l).add(t).sub(b).mul(0.5 * h), 0, 0, 1)).toWriteOnly();
  })().compute(VX * VY);

  // The sides and the top are open: pressure is zero past them.
  const nbrs = (P, c, p) => {
    const e = vec2(1 / VX, 1 / VY);
    const m = S(P, p).x;
    const l = c.x.equal(0).select(float(0), S(P, p.sub(vec2(e.x, 0))).x);
    const r = c.x.equal(VX - 1).select(float(0), S(P, p.add(vec2(e.x, 0))).x);
    const t = c.y.equal(VY - 1).select(float(0), S(P, p.add(vec2(0, e.y))).x);
    const b = c.y.equal(0).select(m, S(P, p.sub(vec2(0, e.y))).x);
    return { l, r, t, b };
  };
  const jacobi = (src, dst) => Fn(() => {
    const c = cellOf(VX, VY), p = uvOf(c, VX, VY);
    const { l, r, t, b } = nbrs(src, c, p);
    textureStore(dst, c, vec4(l.add(r).add(t).add(b).sub(S(divT, p).x).mul(0.25), 0, 0, 1)).toWriteOnly();
  })().compute(VX * VY);

  const project = (P, src, dst) => Fn(() => {
    const c = cellOf(VX, VY), p = uvOf(c, VX, VY);
    const { l, r, t, b } = nbrs(P, c, p);
    const v = S(src, p).xy.sub(vec2(r.sub(l), t.sub(b)).div(2 * h)).toVar();
    If(c.y.equal(0), () => { v.y.assign(max(v.y, 0.0)); });
    textureStore(dst, c, vec4(v, 0, 1)).toWriteOnly();
  })().compute(VX * VY);

  /* ---------- the heat ---------- */
  // MacCormack: forward, back, then a bounded correction.
  const advT = (V, src) => Fn(() => {
    const c = cellOf(TX, TY), p = uvOf(c, TX, TY);
    const v = S(V, p).xy;
    const m = S(V, p.sub(v.mul(u.dt).mul(0.5).div(SZ))).xy;
    textureStore(hatT, c, vec4(S(src, p.sub(m.mul(u.dt).div(SZ))).x, 0, 0, 1)).toWriteOnly();
  })().compute(TX * TY);
  const backPass = (V) => Fn(() => {
    const c = cellOf(TX, TY), p = uvOf(c, TX, TY);
    const v = S(V, p).xy;
    const m = S(V, p.add(v.mul(u.dt).mul(0.5).div(SZ))).xy;
    textureStore(backT, c, vec4(S(hatT, p.add(m.mul(u.dt).div(SZ))).x, 0, 0, 1)).toWriteOnly();
  })().compute(TX * TY);
  const heatPass = (V, src, dst) => Fn(() => {
    const c = cellOf(TX, TY), p = uvOf(c, TX, TY);
    const v = S(V, p).xy;
    const m = S(V, p.sub(v.mul(u.dt).mul(0.5).div(SZ))).xy;
    // The four texels round the departure point bound the result.
    const q = p.sub(m.mul(u.dt).div(SZ)).mul(vec2(TX, TY)).sub(0.5);
    const i0 = floor(q).add(0.5).div(vec2(TX, TY));
    const ex = vec2(1 / TX, 0), ey = vec2(0, 1 / TY);
    const a = S(src, i0).x, b = S(src, i0.add(ex)).x, cc = S(src, i0.add(ey)).x, d = S(src, i0.add(ex).add(ey)).x;
    const T = S(hatT, p).x.add(S(src, p).x.sub(S(backT, p).x).mul(0.5)).clamp(min(min(a, b), min(cc, d)), max(max(a, b), max(cc, d))).toVar();
    T.mulAssign(exp(u.cool.negate().mul(u.dt)));
    // The top and side edges let the heat out.
    const edge = min(min(p.x, float(1).sub(p.x)), float(1).sub(p.y));
    T.mulAssign(smoothstep(0.0, 0.05, edge));
    // Each jet core feeds heat.
    const wp = world(p);
    for (let j = 0; j < 2; j++) {
      const k = core(wp, j, 0.8);
      T.assign(mix(T, max(T, u.jetK[j].w), k.mul(u.dt).mul(40.0).clamp(0, 1)));
    }
    textureStore(dst, c, vec4(T, 0, 0, 1)).toWriteOnly();
  })().compute(TX * TY);

  // One step reads vel[0] and heat[0] and leaves the result there again.
  const passes = [
    advVel(vel[0], vel[1]),
    curlPass(vel[1]),
    force(vel[1], vel[0], heat[0]),
    divPass(vel[0]),
  ];
  for (let i = 0; i < iters; i++) passes.push(i % 2 === 0 ? jacobi(prs[0], prs[1]) : jacobi(prs[1], prs[0]));
  const P = iters % 2 === 0 ? prs[0] : prs[1];
  passes.push(project(P, vel[0], vel[1]));
  passes.push(advT(vel[1], heat[0]), backPass(vel[1]), heatPass(vel[1], heat[0], heat[1]));
  // The step ends in vel[1] and heat[1]; two copies bring them home.
  const copyV = Fn(() => {
    const c = cellOf(VX, VY);
    textureStore(vel[0], c, S(vel[1], uvOf(c, VX, VY))).toWriteOnly();
  })().compute(VX * VY);
  const copyT = Fn(() => {
    const c = cellOf(TX, TY);
    textureStore(heat[0], c, S(heat[1], uvOf(c, TX, TY))).toWriteOnly();
  })().compute(TX * TY);
  passes.push(copyV, copyT);

  // The plane that shows the heat to the bend pass.
  const mat = new THREE.MeshBasicNodeMaterial({ fog: false, depthWrite: false, depthTest: false });
  mat.colorNode = Fn(() => vec4(texture(heat[0], uv()).x, 0, 0, 1))();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat);
  mesh.position.set(origin[0] + W / 2, origin[1] + H / 2, z);
  mesh.frustumCulled = false;

  return {
    u,
    mesh,
    async compile() { await renderer.compileComputeAsync(passes); },
    step(dt) { u.dt.value = dt; renderer.compute(passes); },
    /**
     * Sets one jet from world nozzle place and axis.
     * @param {number} j @param {{x:number,y:number}} n @param {{x:number,y:number}} a
     * @param {number} len Driven length, m. @param {number} speed m/s. @param {number} T Core heat, 0 to 1.
     */
    setJet(j, n, a, len, speed, T) {
      const l = Math.hypot(a.x, a.y) || 1;
      u.jetN[j].value.set(n.x, n.y, a.x / l, a.y / l);
      u.jetK[j].value.set(len, 0.42, speed, T);
    },
  };
}
