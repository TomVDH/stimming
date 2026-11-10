// The near aircraft as three.js meshes, drawn into the outside target.
// The outside shader draws the sky, the land and the clouds there first.
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
  // Each cap zips the upper and lower skins together, inside the outline.
  // A centre fan would spill past thin, cambered sections.
  // The caps take their own vertices, so their normals stay off the skin.
  const axis = cen[cen.length - 1].clone().sub(cen[0]);
  const sideN = idx.length;
  [[0, axis.clone().negate()], [sections.length - 1, axis]].forEach(([j, out]) => {
    const c0 = pos.length / 3;
    sections[j].forEach(p => pos.push(p.x, p.y, p.z));
    let i = 0, k = M - 1, up = true;
    while (k - i > 1) {
      if (up) { tri(c0 + i, c0 + i + 1, c0 + k, out); i++; } else { tri(c0 + i, c0 + k - 1, c0 + k, out); k--; }
      up = !up;
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.userData.loft = true;
  // Group 0 is the skin; group 1 is the end caps, the seam faces.
  g.addGroup(0, sideN, 0); g.addGroup(sideN, idx.length - sideN, 1);
  g.computeVertexNormals();
  return g;
}

// Fog streaks and wing flex, shared by every aircraft material.
// The streak field is the outside pass's near fog, so the two meet seamlessly.
const FOG_U = {
  uFogN: { value: null }, uFogLvl: { value: 0 }, uFogWisp: { value: V(0, 0, 0) },
  uUpW: { value: V(0, 1, 0) }, uSpanW: { value: V(0, 0, 1) }, uFlex: { value: new THREE.Vector2() },
};
// The wing bends in its first two modes; s runs root to tip.
const BEND_GLSL = `
float bendAt(float span) {
  float s = clamp((span - 1.2) / 24.0, 0.0, 1.1);
  return uFlex.x * s * s + uFlex.y * s * s * (1.0 - s) * 4.0;
}`;
function fogFlex(m) {
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, FOG_U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
uniform vec3 uUpW, uSpanW; uniform vec2 uFlex;
varying vec3 vFogW;${BEND_GLSL}`)
      .replace('#include <project_vertex>', `vec4 wpos = modelMatrix * vec4(transformed, 1.0);
wpos.xyz += uUpW * bendAt(dot(wpos.xyz, uSpanW));
vFogW = wpos.xyz;
vec4 mvPosition = viewMatrix * wpos;
gl_Position = projectionMatrix * mvPosition;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform highp sampler3D uFogN; uniform float uFogLvl; uniform vec3 uFogWisp;
varying vec3 vFogW;`)
      .replace('#include <fog_fragment>', `#ifdef USE_FOG
  float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
  // Fog curtains between the eye and the skin hide stretches of the wing.
  // The field matches wispDens in shader.js.
  if (uFogLvl > 0.05) {
    float L = length(vFogW), T = 1.0, dt = L / 16.0;
    vec3 dir = vFogW / L;
    for (int i = 0; i < 16; i++) {
      vec3 p = dir * dt * (float(i) + 0.5) + uFogWisp;
      float n = texture(uFogN, p / vec3(136.0, 30.0, 9.0)).r * 0.78 + texture(uFogN, p / vec3(68.0, 10.0, 3.2) + 0.37).g * 0.22;
      float dn = smoothstep(0.64 - 0.16 * uFogLvl, 0.78 - 0.14 * uFogLvl, n) * smoothstep(0.05, 0.5, uFogLvl);
      T *= exp(-0.22 * dn * dt);
    }
    fogFactor = max(fogFactor, 1.0 - T);
  }
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
#endif`);
  };
}

export function createWing3({ renderer, ST, flex, WINGLET, NAC, FAIRS, noiseTex }) {
  FOG_U.uFogN.value = noiseTex;

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
  // A thin plate on the upper skin: a spoiler, or the fixed shroud.
  // Past the rear spar it overhangs the flap nose as the cove lip.
  const plate = (s0, s1, z0, z1) => loft(span(z0, z1).map(z => {
    const ss = Array.from({ length: 9 }, (_, k) => lerp(s0, s1, k / 8));
    const up = ss.map(s => at(s, z, 1).add(V(0, 0.003, 0)));
    return [...up, ...up.slice().reverse().map(p => p.clone().add(V(0, -0.014, 0)))];
  }));
  // A flap section: the wing's own skin aft of s0, with an elliptic nose.
  // The nose sits under the shroud lip, so the seam reads as a cove.
  const flapSection = (s0, z) => {
    const ss = Array.from({ length: N + 1 }, (_, k) => s0 + (1 - s0) * (1 - Math.cos(Math.PI * k / N)) / 2);
    const nose = (1 - s0) * 0.14;
    const pt = (s, side) => {
      const u = at(s, z, 1), l = at(s, z, -1), x = Math.min(1, (s - s0) / nose);
      return V(u.x, (u.y + l.y) / 2 - 0.016 + side * (u.y - l.y) / 2 * Math.sqrt(x * (2 - x)), z);
    };
    return [...ss.map(s => pt(s, 1)), ...ss.slice(1, -1).reverse().map(s => pt(s, -1))];
  };
  const flap = (s0, z0, z1) => loft(span(z0, z1).map(z => flapSection(s0, z)));

  // Grey satin paint: matte when dry, a glossy film of water in rain.
  const DRY = { roughness: 0.66, clearcoat: 0.1, clearcoatRoughness: 0.5 };
  const WET = { roughness: 0.38, clearcoat: 1.0, clearcoatRoughness: 0.06 };
  const paint = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.34, 0.35, 0.37), ...DRY });
  const flapPaint = paint.clone(); flapPaint.color.setRGB(0.3, 0.31, 0.33);
  const dark = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.6, metalness: 0.4 });
  const metal = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.7, 0.7, 0.72), roughness: 0.22, metalness: 1 });

  const air = new THREE.Group();
  // Seam faces sit in the gaps, out of the light.
  const seam = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.05, 0.05, 0.055), roughness: 0.8 });
  // Every material writes alpha 0: the cabin pass reads it as no sky.
  // The shadow pass draws front faces, as the mesh mirror flips them.
  [paint, flapPaint, dark, metal, seam].forEach(m => {
    Object.assign(m, {
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.ZeroFactor,
      blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.ZeroFactor, shadowSide: THREE.FrontSide,
    });
    fogFlex(m);
  });
  // The view's axes are left-handed, so the camera matrix mirrors.
  // Each mesh mirrors its geometry and its scale: the world stays put.
  // The negative scale tells three.js to flip the front face.
  const add = (geo, mat = paint, parent = air) => {
    geo.scale(1, 1, -1);
    const m = new THREE.Mesh(geo, geo.userData.loft ? [mat, seam] : mat);
    m.scale.z = -1;
    m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  };
  const Z0 = ST[0][2], ZT = ST[ST.length - 1][2];
  // Main box ahead of the rear spar, and the full-chord tip past the aileron.
  const SPAR = 0.7, LIP = 0.765, FLAP = 0.715, SPOIL = 0.6;
  add(part(0, SPAR, Z0, 23.4));
  add(part(0, 1, 23.4, ZT));
  // Each moving surface turns about its hinge line.
  // The role sets how it answers the bank.
  const hinged = [];
  const hinge = (geo, a, b, mat, role) => {
    const piv = new THREE.Group(); piv.position.copy(a); air.add(piv);
    geo.translate(-a.x, -a.y, -a.z);
    add(geo, mat, piv);
    hinged.push({ piv, axis: b.clone().sub(a).normalize(), role, ph: hinged.length * 2.39 });
  };
  // Flap hinges sit on the nose's centre line.
  const noseAt = z => at(FLAP + 0.02, z, 1).lerp(at(FLAP + 0.02, z, -1), 0.5);
  const flapPart = (z0, z1, role) => hinge(flap(FLAP, z0, z1), noseAt(z0), noseAt(z1), flapPaint, role);
  // Seams between surfaces are 3 cm wide.
  flapPart(Z0 + 0.3, 7.985, 'flap');
  flapPart(8.015, 9.785, 'flaperon');
  flapPart(9.815, 17.385, 'flap');
  flapPart(17.415, 23.3, 'aileron');
  // Seven spoilers form the cove lip over the flaps; fixed shroud elsewhere.
  const cuts = [2.0, 4.2, 6.4, 8.6, 10.8, 13.0, 15.2, 17.4];
  for (let i = 0; i < cuts.length - 1; i++) {
    const z0 = cuts[i] + 0.025, z1 = cuts[i + 1] - 0.025;
    hinge(plate(SPOIL, LIP, z0, z1), at(SPOIL, z0, 1), at(SPOIL, z1, 1), paint, 'spoiler');
  }
  add(plate(SPOIL, LIP, Z0, 1.975));
  add(plate(SPOIL, LIP, 17.425, 23.3));

  // The winglet: a blended curve out of the tip, then a swept, tapered blade.
  // Its root section starts inside the wing tip, so no seam shows.
  const ss = Array.from({ length: 13 }, (_, k) => (1 - Math.cos(Math.PI * k / 12)) / 2);
  add(loft(Array.from({ length: 16 }, (_, i) => {
    const w = WINGLET(i / 15);
    const le = V(w.le, w.y, w.z), te = V(w.le - w.c, w.y, w.z), nrm = V(0, w.ny, w.nz);
    const pt = (s, side) => le.clone().lerp(te, s).addScaledVector(nrm, side * 0.09 * naca(s) * w.c);
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

  // Flap-track fairings: round pods under the flaps, tapering aft.
  FAIRS.forEach(f => {
    const z = f.a[2], nose = at(0.55, z, -1), te = at(1, z, -1);
    const len = nose.x - te.x + 1.1, r0 = 0.3;
    const pts = Array.from({ length: 20 }, (_, i) => {
      const u = i / 19;
      // The body swells fast behind the nose and tapers to a point aft.
      const body = Math.pow(Math.sin(Math.PI / 2 * Math.min(1, u / 0.8)), 0.55);
      const tip = u > 0.8 ? Math.sqrt(Math.max(0, 1 - ((u - 0.8) / 0.2) ** 2)) : 1;
      return new THREE.Vector2(Math.max(0.004, r0 * body * tip), u * len);
    });
    const g = new THREE.LatheGeometry(pts, 28);
    g.rotateZ(-Math.PI / 2); g.scale(1, 1.15, 0.7);
    const m = add(g, flapPaint);
    // The pod's top meets the thin trailing edge, so it never pokes through.
    m.position.set(te.x - 1.1, te.y - r0 * 1.15 * 0.85, z);
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
  // The brightest bolt lights the skin from its own side.
  const boltL = new THREE.DirectionalLight(0xc8ccff, 0);
  scene.add(boltL, boltL.target);
  // A fog bank swallows the wing; the shader sets the bank's density.
  scene.fog = new THREE.FogExp2(0x000000, 0);
  // The tip strobe and the nav light light the skin near the tip.
  const strobeL = new THREE.PointLight(0xffffff, 0, 30, 2), navL = new THREE.PointLight(0xff2010, 0.4, 14, 2);
  scene.add(strobeL, navL);

  const cam = new THREE.PerspectiveCamera(50, 1, 0.3, 400);
  const mo = { t: null, bank: 0, rate: 0, shadowT: -1, wet: 0, f: [0, 0], fv: [0, 0] };
  cam.matrixAutoUpdate = false;
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
      // Grey paint keeps half the sky's colour.
      const y = 0.3 * c[0] + 0.5 * c[1] + 0.2 * c[2];
      for (let k = 0; k < 3; k++) data[o + k] = (y + c[k]) / 2 + sky.h.floor[k];
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

  return {
    scene, cam,
    // Poses the aircraft and the lights for this frame, in the outside pass's view.
    update({ basis, bank, sky, HOR, W, H, t, flash, strobe, tip, turb, bolt, fogLevel = 0, wet = 0, veil = 1, storm = 0, wisp = [0, 0, 0], shake = true, gust = 0, seatDx = 0, nav = [1, 0.1, 0.05] }) {
      if (envFor !== sky) { bakeEnv(sky, HOR); envFor = sky; }
      // The skin wets fast in rain and dries over about half a minute.
      const dtw = mo.t === null ? 1 : Math.min(1, Math.max(0, t - mo.t));
      mo.wet += (wet - mo.wet) * Math.min(1, dtw * (wet > mo.wet ? 0.5 : 0.08));
      for (const m of [paint, flapPaint]) for (const k in DRY) m[k] = DRY[k] + (WET[k] - DRY[k]) * mo.wet;
      air.rotation.x = bank;
      // An aft seat sees the whole aircraft further forward.
      air.position.x = seatDx;
      navL.color.setRGB(...nav);
      // The roll rate drives the controls; a low-pass keeps them smooth.
      const dt = mo.t === null ? 0 : t - mo.t;
      if (dt > 1e-4) mo.rate += ((bank - mo.bank) / dt - mo.rate) * Math.min(1, dt * 1.2);
      mo.t = t; mo.bank = bank;
      // The gust's lift bends the wing in its first two modes, 1.1 Hz and 3.2 Hz.
      // An updraft lifts the tip about 12 cm per m/s; a downdraft drops it.
      // Slow swells bend it smoothly; sharp chop sets it ringing.
      const sd = Math.min(dt, 0.05), g = shake ? gust : 0;
      [[1.1, 0.07, 0.12], [3.2, 0.1, 0.015]].forEach(([hz, z, perMs], j) => {
        const w = 2 * Math.PI * hz;
        mo.fv[j] += (w * w * (perMs * g - mo.f[j]) - 2 * z * w * mo.fv[j]) * sd;
        mo.f[j] = Math.max(-0.9, Math.min(0.9, mo.f[j] + mo.fv[j] * sd));
      });
      FOG_U.uFlex.value.set(mo.f[0], mo.f[1]);
      FOG_U.uUpW.value.set(0, 1, 0).applyAxisAngle(V(1, 0, 0), bank);
      FOG_U.uSpanW.value.set(0, 0, 1).applyAxisAngle(V(1, 0, 0), bank);
      FOG_U.uFogLvl.value = fogLevel;
      FOG_U.uFogWisp.value.set(...wisp);
      // Rolling left lifts our aileron and spoilers; a steady bank holds them still.
      // About 7 degrees of aileron hold a 3 degree-a-second roll; 12.6 at most.
      const ail = Math.max(-0.22, Math.min(0.22, -mo.rate * 2.5));
      // More bank asks for more lift, so the flaps trim down a little.
      const trim = Math.max(-0.035, Math.min(0.035, (bank - 6 * Math.PI / 180) * 0.15));
      hinged.forEach(h => {
        const n = turb * (Math.sin(t * 1.7 + h.ph) + 0.6 * Math.sin(t * 4.3 + h.ph * 2));
        const a = h.role === 'aileron' ? ail + n * 0.006
          : h.role === 'flaperon' ? ail * 0.35 + trim + n * 0.003
          // Spoilers rise only on the wing that drops, and only past a small roll.
          : h.role === 'spoiler' ? Math.min(0, (ail + 0.03) * 1.3) - Math.abs(n) * 0.002
          : trim + n * 0.002;
        h.piv.quaternion.setFromAxisAngle(h.axis, a);
      });
      // The camera sits at the eye with the outside pass's axes and focal length.
      // The shader's axes are left-handed: R cross U gives F.
      const R = V(...basis.R), U = V(...basis.U), F = V(...basis.F);
      cam.matrixWorld.makeBasis(R, U, F.clone().negate());
      cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
      cam.fov = 2 * Math.atan(H / 2 / basis.focal) * 180 / Math.PI; cam.aspect = W / H; cam.updateProjectionMatrix();
      // Lambert divides by pi; the shader's sun term is 0.012 on grey paint.
      const s = V(...sky.sun).normalize(), sl = sky.sunL, m = Math.max(...sl, 1e-6);
      sun.color.setRGB(sl[0] / m, sl[1] / m, sl[2] / m);
      // Towers, storm murk and fog veil the sun, so its glint and shadows fade.
      sun.intensity = m * 0.012 * Math.PI / 0.34 * veil;
      // Storm murk also dulls the sky the paint mirrors.
      scene.environmentIntensity = 1 - 0.6 * storm;
      const c = V(3 + seatDx, -3, 13).applyAxisAngle(V(1, 0, 0), bank);
      sun.target.position.copy(c); sun.position.copy(c).addScaledVector(s, 60);
      sun.target.updateMatrixWorld();
      if (t - mo.shadowT > 0.2 || t < mo.shadowT) { renderer.shadowMap.needsUpdate = true; mo.shadowT = t; }
      flashL.intensity = flash * 0.06;
      boltL.intensity = bolt ? Math.min(bolt.level, 2.5) * 0.3 : 0;
      if (bolt) boltL.position.copy(bolt.dir).multiplyScalar(50);
      // The bank's sight range, as the shader's fogAt sets it.
      const vis = 120000 * Math.exp(-11 * Math.pow(fogLevel, 1.3));
      scene.fog.density = fogLevel > 0.05 ? 1.2 / vis : 0;
      // The fog takes the outside pass's murk colour, so the wing sinks into the same grey.
      const hz = lookup(sky.b.L, HOR + 0.03, Math.acos(Math.max(-1, Math.min(1, sky.sunAz[1]))), HOR), zc = lookup(sky.b.L, Math.PI / 2, 0, HOR);
      const hc = hz.map((v, i) => 0.5 * (v + zc[i]) + sky.h.floor[i]), gy = 0.3 * hc[0] + 0.5 * hc[1] + 0.2 * hc[2];
      const k = (0.55 - 0.25 * storm) * 1.3;
      scene.fog.color.setRGB(...[0.9, 0.96, 1.06].map((m, i) => (gy + (hc[i] - gy) * 0.3) * m * k + [0.75, 0.77, 1][i] * flash * 0.004));
      // The tip lights ride the bent tip.
      const sT = Math.min(1.1, (V(...tip).dot(FOG_U.uSpanW.value) - 1.2) / 24);
      const bend = FOG_U.uUpW.value.clone().multiplyScalar(mo.f[0] * sT * sT + mo.f[1] * sT * sT * (1 - sT) * 4);
      const tw = V(...tip).add(bend);
      strobeL.position.copy(tw).add(V(-0.3, 0, 0)); strobeL.intensity = strobe * 40;
      navL.position.copy(tw).add(V(0.4, -0.5, 0));
      return [bend.x, bend.y, bend.z];
    },
  };
}
