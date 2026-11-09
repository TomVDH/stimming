// Spike: the near aircraft as three.js meshes, drawn into the outside buffer.
// The raw shader still draws the sky, the land, the clouds and the cabin.
import * as THREE from 'three';
import { lookup } from './sky.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// NACA 00xx half thickness at chord fraction s, for thickness ratio 1.
const naca = s => 5 * (0.2969 * Math.sqrt(s) - 0.126 * s - 0.3516 * s * s + 0.2843 * s ** 3 - 0.1036 * s ** 4);
const camber = s => 0.018 * 4 * s * (1 - s);
const lerp = (a, b, f) => a + (b - a) * f;

// Lofts closed sections into one mesh, with caps at both ends.
// Each triangle faces away from its section's centre.
function loft(sections) {
  const M = sections[0].length, pos = [], idx = [];
  const cen = sections.map(s => s.reduce((a, p) => a.add(p), V(0, 0, 0)).multiplyScalar(1 / M));
  sections.forEach(s => s.forEach(p => pos.push(p.x, p.y, p.z)));
  const P = i => V(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
  const tri = (a, b, c, out) => {
    const n = P(b).sub(P(a)).cross(P(c).sub(P(a)));
    idx.push(...(n.dot(out) >= 0 ? [a, b, c] : [a, c, b]));
  };
  for (let j = 0; j < sections.length - 1; j++) for (let k = 0; k < M; k++) {
    const a = j * M + k, b = j * M + (k + 1) % M, c = a + M, d = b + M;
    const mid = P(a).add(P(d)).multiplyScalar(0.5), out = mid.clone().sub(cen[j].clone().lerp(cen[j + 1], 0.5));
    tri(a, b, d, out); tri(a, d, c, out);
  }
  // The caps are fans round each end centre.
  const axis = cen[cen.length - 1].clone().sub(cen[0]);
  [[0, axis.clone().negate()], [sections.length - 1, axis]].forEach(([j, out]) => {
    const ci = pos.length / 3; pos.push(cen[j].x, cen[j].y, cen[j].z);
    for (let k = 0; k < M; k++) tri(ci, j * M + k, j * M + (k + 1) % M, out);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function createWing3({ gl, canvas, ST, flex, LET, NAC, FAIRS }) {
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: false });
  renderer.autoClear = true;
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Planform: leading and trailing edge x at span z.
  const edge = (z, col) => {
    for (let i = 1; i < ST.length; i++) if (z <= ST[i][2] + 1e-6) return lerp(ST[i - 1][col], ST[i][col], (z - ST[i - 1][2]) / (ST[i][2] - ST[i - 1][2]));
    return ST[ST.length - 1][col];
  };
  const T = z => lerp(0.13, 0.09, (z - ST[0][2]) / (ST[ST.length - 1][2] - ST[0][2]));
  // The upper skin peaks at the old flexed wing line.
  const frame = z => {
    const le = edge(z, 0), te = edge(z, 1), c = le - te;
    return { le, c, yc: flex(z) - T(z) * c * 0.5 - camber(0.3) * c, t: T(z) };
  };
  const at = (s, z, side) => {
    const f = frame(z);
    return V(f.le - s * f.c, f.yc + (camber(s) + side * f.t * naca(s)) * f.c, z);
  };
  // One airfoil section from chord s0 to s1, upper then lower.
  const N = 18;
  const section = (s0, s1, z) => {
    const ss = Array.from({ length: N + 1 }, (_, k) => s0 + (s1 - s0) * (1 - Math.cos(Math.PI * k / N)) / 2);
    return [...ss.map(s => at(s, z, 1)), ...ss.slice(1, -1).reverse().map(s => at(s, z, -1))];
  };
  const span = (z0, z1, step = 0.6) => {
    const n = Math.ceil((z1 - z0) / step);
    return Array.from({ length: n + 1 }, (_, i) => lerp(z0, z1, i / n));
  };
  const part = (s0, s1, z0, z1) => loft(span(z0, z1).map(z => section(s0, s1, z)));
  // A spoiler: a thin plate on the upper skin.
  const plate = (s0, s1, z0, z1) => loft(span(z0, z1).map(z => {
    const ss = Array.from({ length: 7 }, (_, k) => lerp(s0, s1, k / 6));
    const up = ss.map(s => at(s, z, 1).add(V(0, 0.004, 0)));
    return [...up, ...up.slice().reverse().map(p => p.clone().add(V(0, -0.02, 0)))];
  }));

  // Grey gloss paint with a clear coat.
  const paint = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.34, 0.35, 0.37), roughness: 0.45, clearcoat: 0.8, clearcoatRoughness: 0.14 });
  const flapPaint = paint.clone(); flapPaint.color.setRGB(0.3, 0.31, 0.33);
  const dark = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.6, metalness: 0.4 });
  const metal = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.7, 0.7, 0.72), roughness: 0.22, metalness: 1 });

  const air = new THREE.Group();
  const add = (geo, mat = paint, parent = air) => {
    const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  };
  const Z0 = ST[0][2], ZT = ST[ST.length - 1][2];
  // Main box ahead of the rear spar, and the full-chord tip past the aileron.
  add(part(0, 0.72, Z0, 23.4));
  add(part(0, 1, 23.4, ZT));
  // A hinged surface twitches about its forward edge.
  const hinged = [];
  const hinge = (geo, s0, z0, z1, mat, gain) => {
    const a = at(s0, z0, 1), b = at(s0, z1, 1);
    const piv = new THREE.Group(); piv.position.copy(a); air.add(piv);
    geo.translate(-a.x, -a.y, -a.z);
    add(geo, mat, piv);
    hinged.push({ piv, axis: b.sub(a).normalize(), gain, ph: Math.random() * 9 });
  };
  // Inboard flap, outboard flap and aileron; seams split them.
  hinge(part(0.745, 1, Z0 + 0.4, 7.8), 0.745, Z0 + 0.4, 7.8, flapPaint, 0);
  hinge(part(0.745, 1, 8.2, 17.4), 0.745, 8.2, 17.4, flapPaint, 0.15);
  hinge(part(0.745, 1, 17.8, 23.3), 0.745, 17.8, 23.3, flapPaint, 1);
  // Six spoiler panels ride the upper skin ahead of the flaps.
  [[3.2, 5.2], [5.3, 7.3], [8.6, 10.6], [10.7, 12.7], [12.8, 14.8], [14.9, 16.9]].forEach(([z0, z1]) =>
    hinge(plate(0.575, 0.715, z0, z1), 0.575, z0, z1, paint, 0.4));

  // The winglet: a thin foil that rises and sweeps back.
  const [l0, l1, l2, l3] = LET;
  add(loft(Array.from({ length: 7 }, (_, i) => {
    const f = i / 6, le = V(...l0).lerp(V(...l1), f), te = V(...l3).lerp(V(...l2), f);
    const ss = Array.from({ length: 13 }, (_, k) => (1 - Math.cos(Math.PI * k / 12)) / 2);
    const pt = (s, side) => le.clone().lerp(te, s).add(V(0, 0, side * 0.09 * naca(s) * le.distanceTo(te)));
    return [...ss.map(s => pt(s, 1)), ...ss.slice(1, -1).reverse().map(s => pt(s, -1))];
  })));

  // The nacelle hangs on a pylon, clear of the lower skin.
  const nz = NAC.a[2], low = at(0.15, nz, -1).y;
  const ny = low - 0.45 - NAC.r, L = NAC.b[0] - NAC.a[0] + 1.2, nx = NAC.a[0] + 0.6;
  const prof = [[0.55, 0], [0.75, 0.5], [1.15, 1.6], [1.4, 3.2], [1.45, L - 1], [1.42, L - 0.3], [1.3, L], [1.15, L - 0.15]];
  const nac = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r * NAC.r / 1.45, y)), 48);
  nac.rotateZ(-Math.PI / 2); nac.translate(nx, ny, nz);
  add(nac, paint);
  const fan = new THREE.CircleGeometry(NAC.r * 0.8, 40); fan.rotateY(Math.PI / 2); fan.translate(nx + L - 0.35, ny, nz);
  add(fan, dark);
  const spin = new THREE.ConeGeometry(0.35, 0.6, 24); spin.rotateZ(-Math.PI / 2); spin.translate(nx + L - 0.1, ny, nz);
  add(spin, metal);
  const nozzle = new THREE.ConeGeometry(0.42, 1.0, 24); nozzle.rotateZ(Math.PI / 2); nozzle.translate(nx - 0.45, ny, nz);
  add(nozzle, metal);
  const pyl = new THREE.BoxGeometry(5.4, low - ny + 0.3, 0.32); pyl.translate(nx + 1.6, (low + ny) / 2 + 0.1, nz);
  add(pyl, paint);

  // Flap-track fairings: canoes under the trailing edge, tails aft.
  FAIRS.forEach(f => {
    const a = V(f.a[0], f.a[1], f.a[2]), b = V(f.b[0], f.b[1], f.b[2]), len = a.distanceTo(b) + 0.8;
    const r0 = f.a[3] * 1.4;
    const pts = Array.from({ length: 14 }, (_, i) => {
      const u = i / 13;
      return new THREE.Vector2(Math.max(0.01, r0 * Math.sin(Math.PI * Math.min(1, u * 1.35 + 0.02) * 0.5) * (1 - 0.82 * (1 - u) ** 2)), u * len);
    });
    const g = new THREE.LatheGeometry(pts, 24);
    g.rotateZ(-Math.PI / 2); g.scale(1, 1.25, 0.8);
    const m = add(g, flapPaint);
    m.position.copy(b.clone().add(V(-0.4, -0.05, 0)));
    m.quaternion.setFromUnitVectors(V(1, 0, 0), a.clone().sub(b).normalize());
  });

  const scene = new THREE.Scene();
  scene.add(air);
  const sun = new THREE.DirectionalLight(0xffffff, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 120 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const flashL = new THREE.AmbientLight(0xb8bdff, 0);
  scene.add(flashL);
  // The tip strobe and the red nav light light the skin near the tip.
  const strobeL = new THREE.PointLight(0xffffff, 0, 30, 2), navL = new THREE.PointLight(0xff2010, 0.4, 14, 2);
  scene.add(strobeL, navL);

  // A debug handle for the spike only.
  window.__w3 = { scene, air, sun, paint, flapPaint, hinged, THREE };
  const cam = new THREE.PerspectiveCamera(50, 1, 0.3, 400);
  cam.matrixAutoUpdate = false;
  let rt = null;
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envFor = null, envRT = null;

  // The baked sky as an equirect map, so the paint mirrors the same sky.
  // It follows the shader's satin squash of the reflected ray.
  function bakeEnv(sky, HOR) {
    const W = 256, H = 128, data = new Float32Array(W * H * 4);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const phi = ((i + 0.5) / W - 0.5) * 2 * Math.PI, th = ((j + 0.5) / H - 0.5) * Math.PI;
      const dx = Math.cos(th) * Math.cos(phi), dz = Math.cos(th) * Math.sin(phi), lh = Math.hypot(dx, dz) || 1;
      const ph = Math.acos(Math.max(-1, Math.min(1, (dx * sky.sunAz[0] + dz * sky.sunAz[1]) / lh)));
      // Satin paint never mirrors the ground: it sees the sky just above.
      const c = lookup(sky.b.L, Math.max(th, 0) * 0.45 + 0.03, ph, HOR), o = (j * W + i) * 4;
      for (let k = 0; k < 3; k++) data[o + k] = c[k] + sky.h.floor[k];
      data[o + 3] = 1;
    }
    const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.FloatType);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.magFilter = tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    if (envRT) envRT.dispose();
    envRT = pmrem.fromEquirectangular(tex);
    tex.dispose();
    scene.environment = envRT.texture;
  }

  // Composite: premultiplied wing over the outside buffer; wing alpha clears sky alpha.
  const vs = `#version 300 es
in vec2 aPos; out vec2 vUv; void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;
  const fs = `#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uW; out vec4 o; void main() { o = texture(uW, vUv); }`;
  const prog = gl.createProgram();
  [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].forEach(([k, src]) => { const s = gl.createShader(k); gl.shaderSource(s, src); gl.compileShader(s); gl.attachShader(prog, s); });
  gl.bindAttribLocation(prog, 0, 'aPos'); gl.linkProgram(prog);
  const uW = gl.getUniformLocation(prog, 'uW');
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  return {
    // Draws the aircraft into the outside buffer, in the outside pass's view.
    render({ basis, bank, sky, HOR, out, W, H, t, flash, strobe, tip, turb }) {
      renderer.resetState();
      if (envFor !== sky) { bakeEnv(sky, HOR); envFor = sky; }
      if (!rt || rt.width !== out.w || rt.height !== out.h) {
        if (rt) rt.dispose();
        rt = new THREE.WebGLRenderTarget(out.w, out.h, { type: THREE.HalfFloatType, samples: 4, depthBuffer: true });
      }
      air.rotation.x = bank;
      hinged.forEach(h => h.piv.quaternion.setFromAxisAngle(h.axis, h.gain * turb * 0.02 * (Math.sin(t * 1.7 + h.ph) + 0.6 * Math.sin(t * 4.3 + h.ph * 2))));
      // The camera sits at the eye with the outside pass's axes and focal length.
      const R = V(...basis.R), U = V(...basis.U), F = V(...basis.F);
      cam.matrixWorld.makeBasis(R, U, F.clone().negate());
      cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
      cam.fov = 2 * Math.atan(H / 2 / basis.focal) * 180 / Math.PI; cam.aspect = W / H; cam.updateProjectionMatrix();
      // Lambert divides by pi; the shader's sun term is 0.012 on grey paint.
      const s = V(...sky.sun).normalize(), sl = sky.sunL, m = Math.max(...sl, 1e-6);
      sun.color.setRGB(sl[0] / m, sl[1] / m, sl[2] / m);
      sun.intensity = m * 0.012 * Math.PI / 0.34;
      const c = V(3, -3, 13).applyAxisAngle(V(1, 0, 0), bank);
      sun.target.position.copy(c); sun.position.copy(c).addScaledVector(s, 60);
      sun.target.updateMatrixWorld();
      flashL.intensity = flash * 0.06;
      const tw = V(...tip);
      strobeL.position.copy(tw).add(V(-0.3, 0, 0)); strobeL.intensity = strobe * 120;
      navL.position.copy(tw).add(V(0.4, -0.5, 0));
      renderer.setRenderTarget(rt);
      renderer.render(scene, cam);
      renderer.setRenderTarget(null);
      const tex = renderer.properties.get(rt.texture).__webglTexture;
      // Hand the context back in the state the raw passes expect.
      gl.bindFramebuffer(gl.FRAMEBUFFER, out.fb); gl.viewport(0, 0, out.w, out.h);
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.SCISSOR_TEST); gl.disable(gl.STENCIL_TEST);
      gl.colorMask(true, true, true, true); gl.depthMask(true);
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(prog);
      gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(uW, 5);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.disable(gl.BLEND);
      gl.bindVertexArray(null);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0); gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
    },
  };
}
