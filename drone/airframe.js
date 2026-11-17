// Heavy-lift X8 airframe, built in code. No model file.
// Port of the airframe in the hubspot-nightly intro, lettering removed.
// Units: metres. Nose at +x, up at +y, right at +z.

import {
  AdditiveBlending, BufferGeometry, CanvasTexture, CircleGeometry, Color, CylinderGeometry,
  DoubleSide, Euler, ExtrudeGeometry, Float32BufferAttribute, Group, LatheGeometry, Mesh,
  MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, Quaternion,
  SRGBColorSpace, Shape, SphereGeometry, Sprite, SpriteMaterial, TorusGeometry, Vector2, Vector3
} from 'three';

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function smooth(x, a, b) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function hash(i, j) { const h = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return h - Math.floor(h); }
function vnoise(x, y) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(i, j) + (hash(i + 1, j) - hash(i, j)) * u;
  const b = hash(i, j + 1) + (hash(i + 1, j + 1) - hash(i, j + 1)) * u;
  return a + (b - a) * v;
}
function hexRGB(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }

// ── sprite textures ─────────────────────────────────────────────────────
function canvasTex(n, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = n;
  draw(c.getContext('2d'), n / 2);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
// A Gaussian glow that reaches zero at the rim.
function gaussTex(sigma) {
  return canvasTex(128, (x, m) => {
    const n = 2 * m, img = x.createImageData(n, n), px = img.data;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const dx = (i + .5 - m) / m, dy = (j + .5 - m) / m, r = Math.min(1, Math.hypot(dx, dy));
        const w = 1 - r * r, a = Math.exp(-(r * r) / (2 * sigma * sigma)) * w * w, o = (j * n + i) * 4;
        px[o] = px[o + 1] = px[o + 2] = 255; px[o + 3] = Math.round(a * 255);
      }
    }
    x.putImageData(img, 0, 0);
  });
}
function streakTex() {
  return canvasTex(128, (x, m) => {
    const gx = x.createLinearGradient(0, 0, 2 * m, 0);
    gx.addColorStop(0, 'rgba(255,255,255,0)'); gx.addColorStop(.5, 'rgba(255,255,255,1)');
    gx.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gx; x.fillRect(0, m - 3, 2 * m, 6);
    const gy = x.createLinearGradient(0, 0, 0, 2 * m);
    gy.addColorStop(0, 'rgba(0,0,0,1)'); gy.addColorStop(.5, 'rgba(0,0,0,0)'); gy.addColorStop(1, 'rgba(0,0,0,1)');
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = gy; x.fillRect(0, 0, 2 * m, 2 * m);
  });
}
// A spinning prop as a shutter catches it: a disc and two smears.
function discTex() {
  return canvasTex(256, (x, m) => {
    const gr = x.createRadialGradient(m, m, 0, m, m, m);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(.14, 'rgba(255,255,255,0)');
    gr.addColorStop(.22, 'rgba(255,255,255,.2)');
    gr.addColorStop(.82, 'rgba(255,255,255,.14)');
    gr.addColorStop(.94, 'rgba(255,255,255,.32)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 2 * m, 2 * m);
    for (let i = 0; i < 2; i++) {
      x.save(); x.translate(m, m); x.rotate(i * Math.PI);
      x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, m * .96, -.2, .2); x.closePath();
      x.fillStyle = 'rgba(255,255,255,.13)'; x.fill(); x.restore();
    }
  });
}

// ── shape constants, in model units ─────────────────────────────────────
const LIVERY = {
  indigo: { paint: '#2c2296', ink: '#eef0fa' },
  black: { paint: '#0c0d10', ink: '#b9bcc4' },
  titanium: { paint: '#8a8472', ink: '#141517' }
};
const MAT = {
  body: { metalness: .33, roughness: .32, clearcoat: .45, clearcoatRoughness: .15,
    sheen: .2, sheenRoughness: .35, specularIntensity: .43, envMapIntensity: 1.25 },
  booms: { metalness: .36, roughness: .23, clearcoat: .16, clearcoatRoughness: .35,
    sheen: .63, sheenRoughness: .16, specularIntensity: 1, envMapIntensity: 1.56 },
  props: { metalness: 1, roughness: .14, clearcoat: 0, clearcoatRoughness: .5,
    sheen: 0, sheenRoughness: .6, specularIntensity: .5, envMapIntensity: .6 }
};
const R = .34;            // half-extent of the plate skin
const L = .84, W = .17;   // fuselage length and width
const CUT = .19;          // radius of the cutout between the lobes
const E0 = -.12;          // widest point, just aft of centre
const LOBE = .222;        // lobe centre and boom line, fore and aft
const BOOM = [.024 * 1.5, .024 * .7];
const PY = -.012;         // plate height

// Fuselage radius at e, from -1 at the tail to +1 at the nose.
function radius(e) {
  const nose = e > E0, t = nose ? (e - E0) / (1 - E0) : (E0 - e) / (1 + E0);
  const p = nose ? 2.4 : 2.8;
  return Math.pow(Math.max(0, 1 - Math.pow(t, p)), 1 / p);
}

// Plate outline, nose at +x. One side is listed; the other mirrors it.
function plateShape() {
  let h = [[.3, 0], [.29, .07], [.27, .2], [.26, .255], [.245, .275], [.222, .282], [.2, .276]];
  for (let i = 0; i <= 16; i++) {
    const a = i / 16 * Math.PI;
    h.push([CUT * Math.cos(a), .27 - CUT * Math.sin(a)]);
  }
  h = h.concat([[-.2, .276], [-.222, .282], [-.245, .275], [-.26, .255], [-.27, .2], [-.29, .07], [-.3, 0]]);
  const pts = h.map(p => new Vector2(p[0], p[1]));
  for (let j = h.length - 2; j > 0; j--) pts.push(new Vector2(h[j][0], -h[j][1]));
  const s = new Shape();
  s.moveTo(pts[0].x, pts[0].y);
  s.splineThru(pts.slice(1).concat([pts[0]]));
  return s;
}

// The camo: contour bands of layered noise, on the lobes only.
function plateTex(Lv) {
  const n = 1024, c = document.createElement('canvas');
  c.width = c.height = n;
  const x = c.getContext('2d'), img = x.createImageData(n, n), px = img.data;
  const paint = hexRGB(Lv.paint), ink = hexRGB(Lv.ink);
  for (let py = 0; py < n; py++) {
    for (let qx = 0; qx < n; qx++) {
      const X = (qx / n * 2 - 1) * R, Y = (1 - py / n * 2) * R;
      // Keep the camo clear of the fuselage root.
      const mask = smooth(Math.abs(X), .08, .11) * smooth(Math.abs(Y), .1, .13);
      const t = vnoise(X * 22, Y * 22) * .6 + vnoise(X * 46, Y * 46) * .3 + vnoise(X * 95, Y * 95) * .1;
      const col = (t * 4.2) % 1 < .4 ? paint : ink, o = (py * n + qx) * 4;
      for (let k = 0; k < 3; k++) px[o + k] = paint[k] + (col[k] - paint[k]) * mask;
      px[o + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

// A capsule: a tapered nose and a blunt tail, lathed, laid along +x.
function fuselage(det) {
  const pts = [], n = 20 * det;
  for (let i = 0; i <= 2 * n; i++) {
    const e = i / n - 1;
    pts.push(new Vector2(Math.max(radius(e), 1e-4), e * L / 2));
  }
  const g = new LatheGeometry(pts, 44 * det);
  g.rotateZ(-Math.PI / 2);
  g.scale(1, .072, W / 2);
  return g;
}

// The lobe's edges at depth z, cut at the spine.
function lobeEdges(pts, z, cx) {
  const xs = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    if (a.y === b.y || (a.y - z) * (b.y - z) > 0) continue;
    xs.push(a.x + (b.x - a.x) * (z - a.y) / (b.y - a.y));
  }
  xs.sort((u, v) => u - v);
  for (let k = 0; k + 1 < xs.length; k += 2) {
    if (xs[k] <= cx && cx <= xs[k + 1]) {
      return cx > 0 ? [Math.max(0, xs[k]), xs[k + 1]] : [xs[k], Math.min(0, xs[k + 1])];
    }
  }
  return null;
}

// One lobe as a loft from inside the fuselage to the boom.
// Each section is an oval; the tip eases into the boom's section.
function lobe(pts, cx, side, det) {
  const NZ = 32 * det, NA = 24 * det, K = 2 * det, z0 = .03, z1 = .282, zs = [];
  let lo = [], hi = [];
  for (let i = 0; i <= NZ; i++) {
    const z = z0 + (z1 - z0) * i / NZ, e = lobeEdges(pts, z, cx) || [cx, cx];
    zs.push(z); lo.push(e[0]); hi.push(e[1]);
  }
  const pass = (a, rad, f) => a.map((_, k) => {
    const v = [];
    for (let m = -rad; m <= rad; m++) v.push(a[clamp(k + m, 0, NZ)]);
    return f(v);
  });
  const mean = v => v.reduce((t, u) => t + u, 0) / v.length;
  const max = v => Math.max(...v), min = v => Math.min(...v);
  // Close the edges inward, then blur them.
  lo = pass(pass(pass(lo, 2 * K, max), K, mean), K, mean);
  hi = pass(pass(pass(hi, 2 * K, min), K, mean), K, mean);
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= NZ; i++) {
    let a = Math.max(.0004, (hi[i] - lo[i]) / 2), xc = (hi[i] + lo[i]) / 2;
    const s = clamp((zs[i] - .07) / (.27 - .07), 0, 1);
    const br = Math.min(.042, .8 * .072 * radius(cx / (L / 2)));
    let b = .017 + (br - .017) * Math.pow(1 - s, 1.6);
    const cy = PY * smooth(zs[i], .06, .16);
    const w = smooth(zs[i], z1 - .05, z1);
    a += (BOOM[0] - a) * w; b += (BOOM[1] - b) * w; xc += (cx - xc) * w;
    for (let j = 0; j <= NA; j++) {
      const q = j / NA * 2 * Math.PI, x = xc + a * Math.cos(q), y = cy + b * Math.sin(q), zw = -side * zs[i];
      pos.push(x, y, zw);
      uv.push(x, -zw);
    }
  }
  for (let r = 0; r < NZ; r++) {
    for (let c = 0; c < NA; c++) {
      const k = r * (NA + 1) + c, l = k + NA + 1;
      if (side > 0) idx.push(k, l, k + 1, l, l + 1, k + 1);
      else idx.push(k, k + 1, l, l, k + 1, l + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Merge static parts into one non-indexed geometry.
function mergeParts(parts) {
  const pos = [], nor = [], uv = [];
  for (const q of parts) {
    const g = q.g.index ? q.g.toNonIndexed() : q.g.clone();
    g.applyMatrix4(q.m);
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
    for (let i = 0; i < P.count; i++) {
      pos.push(P.getX(i), P.getY(i), P.getZ(i));
      nor.push(N.getX(i), N.getY(i), N.getZ(i));
      uv.push(U ? U.getX(i) : 0, U ? U.getY(i) : 0);
    }
    g.dispose();
  }
  const out = new BufferGeometry();
  out.setAttribute('position', new Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  out.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  return out;
}
function placed(g, x, y, z, q) {
  const o = new Object3D();
  o.position.set(x, y, z);
  if (q) o.quaternion.copy(q);
  o.updateMatrix();
  return { g, m: o.matrix.clone() };
}

// One prop blade: a tapered planform along +x.
function blade() {
  const s = new Shape();
  s.moveTo(.015, -.012); s.lineTo(.06, -.018); s.lineTo(.14, -.012);
  s.quadraticCurveTo(.176, -.006, .174, .004);
  s.lineTo(.14, .012); s.lineTo(.06, .02); s.lineTo(.015, .014); s.lineTo(.015, -.012);
  const g = new ExtrudeGeometry(s, { depth: .004, bevelEnabled: false });
  g.scale(1.15, 1, 1);
  g.rotateX(-Math.PI / 2);
  return g;
}
// The boom narrows from the lobe tip into the motor pod.
function boom(len, det) {
  const r0 = .024, r1 = .017, pts = [], n = 12 * det;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(new Vector2(r1 + (r0 - r1) * Math.pow(1 - t, 1.8), t * len));
  }
  const g = new LatheGeometry(pts, 18 * det);
  g.scale(1.5, 1, .7);
  return g;
}
// Landing sled: two skids, two cross tubes, four struts.
const SLED_Y = -.125;
function sled(parts, det) {
  const up = new Vector3(0, 1, 0), V = (x, y, z) => new Vector3(x, y, z);
  const tube = (a, b, r) => {
    const d = new Vector3().subVectors(b, a), m = a.clone().add(b).multiplyScalar(.5);
    const q = new Quaternion().setFromUnitVectors(up, d.clone().normalize());
    parts.push(placed(new CylinderGeometry(r, r, d.length(), 8 * det), m.x, m.y, m.z, q));
  };
  for (const z of [-.13, .13]) tube(V(-.25, SLED_Y, z), V(.25, SLED_Y, z), .006);
  for (const x of [-.25, .25]) tube(V(x, SLED_Y, -.13), V(x, SLED_Y, .13), .005);
  for (const x of [-.13, .13]) for (const s of [-1, 1]) tube(V(x, -.035, s * .045), V(x * 1.2, SLED_Y, s * .13), .0045);
}

const LED = { b: 0x2f7dff, r: 0xff2a55 };

/**
 * Build the airframe.
 * @param {{ livery?: string, tone?: 'b'|'r', det?: number, scale?: number }} [o]
 * @returns {import('three').Group} userData holds props, hubs, contacts, sprites, strobes, dispose.
 */
export function airframe(o = {}) {
  const Lv = LIVERY[o.livery] || LIVERY.indigo, led = LED[o.tone] || LED.b;
  const det = clamp(Math.round(o.det || 1), 1, 4), S = o.scale || 1;
  const d = new Group(), body = new Group(), props = [], strobes = [], owned = [];
  d.add(body);
  const keep = x => { owned.push(x); return x; };
  const tex = { plate: keep(plateTex(Lv)), disc: keep(discTex()), glow: keep(gaussTex(.18)),
    bloom: keep(gaussTex(.26)), streak: keep(streakTex()) };
  tex.plate.repeat.set(1 / (2 * R), 1 / (2 * R));
  tex.plate.offset.set(.5, .5);
  tex.plate.anisotropy = 8;

  const part = (slot, opt) => {
    const m = keep(new MeshPhysicalMaterial(opt));
    m.sheenColor.set(0xffffff);
    Object.assign(m, MAT[slot]);
    return m;
  };
  const paint = part('body', { color: Lv.paint });
  const skin = part('body', { color: 0xffffff, map: tex.plate });
  const black = part('booms', { color: 0x07080b });
  const carbon = part('props', { color: 0x0b0c10, transparent: true });
  const metal = keep(new MeshStandardMaterial({ color: 0x8e97a2, metalness: 1, roughness: .28 }));
  const glass = keep(new MeshPhysicalMaterial({ color: 0x030407, metalness: 0, roughness: .03, clearcoat: 1 }));
  const feetM = keep(new MeshStandardMaterial({ color: 0xe9ebef, roughness: .5 }));
  const discM = keep(new MeshBasicMaterial({ map: tex.disc, color: 0xc9d0d8, transparent: true, opacity: 0,
    depthWrite: false, side: DoubleSide, forceSinglePass: true, blending: AdditiveBlending, toneMapped: false }));
  const ringM = keep(new MeshBasicMaterial({ color: new Color(led).multiplyScalar(1.6), toneMapped: false }));

  const add = (mesh, x, y, z) => {
    mesh.position.set(x, y, z);
    if (mesh.isMesh) { mesh.castShadow = true; keep(mesh.geometry); }
    body.add(mesh);
    return mesh;
  };
  const V = (x, y, z) => new Vector3(x, y, z);

  add(new Mesh((() => {
    const g = new ExtrudeGeometry(plateShape(), { depth: .006, bevelEnabled: true,
      bevelThickness: .012, bevelSize: .012, bevelSegments: 3 * det, curveSegments: 5 * det });
    g.rotateX(-Math.PI / 2);
    g.translate(0, -.003, 0);
    return g;
  })(), [skin, paint]), 0, PY, 0);

  add(new Mesh((() => {
    const outline = plateShape().getSpacedPoints(480), parts = [];
    for (const cx of [LOBE, -LOBE]) for (const side of [1, -1]) parts.push(placed(lobe(outline, cx, side, det), 0, 0, 0));
    return mergeParts(parts);
  })(), skin), 0, 0, 0);

  add(new Mesh(fuselage(det), paint), 0, 0, 0);
  const dome = add(new Mesh(new SphereGeometry(.04, 24 * det, 16 * det), glass), L / 2 - .035, 0, 0);
  dome.scale.y = .9;

  const up = V(0, 1, 0), hubs = [];
  [LOBE, -LOBE].forEach((bx, row) => {
    [1, -1].forEach((side, j) => hubs.push({ row, j, from: V(bx, PY, -side * .27), to: V(bx, PY, -side * .5) }));
  });

  add(new Mesh((() => {
    const parts = [], pod = new CylinderGeometry(.03, .03, .11, 20 * det);
    for (const h of hubs) {
      const q = new Quaternion().setFromUnitVectors(up, h.to.clone().sub(h.from).normalize());
      parts.push(placed(boom(h.to.distanceTo(h.from), det), h.from.x, h.from.y, h.from.z, q));
      parts.push(placed(pod, h.to.x, h.to.y, h.to.z));
    }
    // GPS puck and two whip antennas on the spine.
    parts.push(placed(new CylinderGeometry(.018, .02, .012, 18 * det), -.19, .066, 0));
    for (const z of [-.03, .03]) parts.push(placed(new CylinderGeometry(.0018, .0022, .07, 6), -.06, .1, z));
    sled(parts, det);
    return mergeParts(parts);
  })(), black), 0, 0, 0);

  add(new Mesh((() => {
    const parts = [], foot = new SphereGeometry(.011, 12 * det, 8 * det);
    for (const x of [-.25, .25]) for (const z of [-.13, .13]) parts.push(placed(foot, x, SLED_Y, z));
    return mergeParts(parts);
  })(), feetM), 0, 0, 0);

  add(new Mesh((() => {
    const parts = [], cap = new CylinderGeometry(.014, .016, .012, 14 * det);
    for (const h of hubs) for (const l of [1, -1]) parts.push(placed(cap, h.to.x, h.to.y + l * .061, h.to.z));
    return mergeParts(parts);
  })(), metal), 0, 0, 0);

  add(new Mesh((() => {
    const parts = [], ring = new TorusGeometry(.031, .0045, 6 * det, 28 * det);
    ring.rotateX(Math.PI / 2);
    for (const h of hubs) for (const l of [1, -1]) parts.push(placed(ring, h.to.x, h.to.y + l * .055, h.to.z));
    return mergeParts(parts);
  })(), ringM), 0, 0, 0);

  // Lights skip tone mapping, so exposure never dims them.
  const spriteM = (hex, map, over) => keep(new SpriteMaterial({ map, color: hex, transparent: true, opacity: 1,
    depthWrite: false, depthTest: !over, blending: AdditiveBlending, toneMapped: false }));
  const sprites = { core: spriteM(new Color(led).lerp(new Color(0xffffff), .55), tex.glow),
    bloom: spriteM(led, tex.bloom, false), flare: spriteM(led, tex.streak, false),
    strobe: spriteM(0xffffff, tex.bloom, false) };
  const halo = (kind, size) => {
    const sp = new Sprite(sprites[kind]);
    sp.scale.setScalar(size);
    sp.userData.kind = kind;
    return sp;
  };

  const bladeGeo = keep(mergeParts([0, Math.PI].map(r =>
    placed(blade(), 0, 0, 0, new Quaternion().setFromEuler(new Euler(.16, r, 0))))));
  const discGeo = keep(new CircleGeometry(.2, 40));
  discGeo.rotateX(-Math.PI / 2);

  // Eight rotors: an upper and a lower prop at each hub.
  // The lower prop turns against the upper one.
  hubs.forEach(h => {
    const { to, row, j } = h;
    for (const lvl of [1, -1]) {
      const prop = new Group();
      prop.position.set(to.x, to.y + lvl * .069, to.z);
      body.add(prop);
      const bl = new Mesh(bladeGeo, carbon);
      bl.castShadow = true;
      prop.add(bl);
      if (lvl > 0) prop.add(new Mesh(discGeo, discM));
      prop.rotation.y = row + j + lvl;
      // +1 turns counter-clockwise, seen from above.
      prop.userData.dir = (row === j ? 1 : -1) * lvl;
      prop.userData.at = new Vector3(to.x * S, (to.y + lvl * .069) * S, to.z * S);
      prop.userData.lower = lvl < 0;
      props.push(prop);
      const co = halo('core', .13);
      co.position.set(to.x, to.y + lvl * .056, to.z);
      body.add(co);
      const fl = halo('flare', 1);
      fl.position.set(to.x, to.y + lvl * .056, to.z);
      fl.scale.set(1.6, .085, 1);
      body.add(fl);
    }
    const bl = halo('bloom', 1.4);
    bl.position.copy(to);
    body.add(bl);
    if (row === 0) {
      const st = halo('strobe', .5);
      st.position.set(to.x, to.y - .06, to.z);
      body.add(st);
      strobes.push(st);
    }
  });

  body.scale.setScalar(S);

  // Points that touch the ground: feet, pods, nose, tail, spine.
  const contacts = [];
  for (const x of [-.25, .25]) for (const z of [-.13, .13]) contacts.push(V(x, SLED_Y - .011, z));
  for (const h of hubs) contacts.push(V(h.to.x, h.to.y - .1, h.to.z), V(h.to.x, h.to.y + .1, h.to.z));
  contacts.push(V(L / 2, 0, 0), V(-L / 2, 0, 0), V(-.06, .14, 0));
  for (const c of contacts) c.multiplyScalar(S);

  d.userData = {
    props, strobes, sprites, carbon, discM,
    hubs: hubs.map(h => h.to.clone().multiplyScalar(S)),
    contacts,
    camera: new Vector3((L / 2 - .035) * S, -.02 * S, 0),
    dispose() { for (const x of owned) x.dispose(); }
  };
  return d;
}
