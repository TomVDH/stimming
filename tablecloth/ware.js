// Tablecloth yank: the tableware. Meshes and materials for each piece.
// Each piece's root sits at its centre of mass; its parts sit in the base frame below.
import * as THREE from 'three';
import { PLATE, WINE, TUMBLER, STICK, CANDLE, INNER } from './shapes.js';

const V2 = pts => pts.map(([r, y]) => new THREE.Vector2(r, y));

// Glass: reflections only, added on top; the glass dims what lies behind by its fresnel.
function glassMat(alpha0 = 0.05, alpha1 = 0.5, tint = [0, 0, 0]) {
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(...tint), roughness: 0.035, metalness: 0, ior: 1.5, specularIntensity: 1, envMapIntensity: 1.6,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  m.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
      {
        float fr = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.6);
        diffuseColor.a = mix(${alpha0.toFixed(3)}, ${alpha1.toFixed(3)}, fr);
        // The thick edge of glass reads faintly green.
        outgoingLight += vec3(0.004, 0.009, 0.008) * fr;
      }
      #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => `glass${alpha0}${alpha1}`;
  return m;
}

export function makeTableware(keep) {
  const own = [];
  const k = x => (own.push(x), x);

  /* ---------- materials ---------- */
  const china = k(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.9, 0.89, 0.86), roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.8 }));
  china.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vR;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvR = length(position.xz);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vR;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        // One slate line on the verge.
        float band = smoothstep(0.1178, 0.1183, vR) * (1.0 - smoothstep(0.1208, 0.1213, vR));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.07, 0.09, 0.15), band);`);
  };
  const chinaShard = k(china.clone());
  chinaShard.onBeforeCompile = china.onBeforeCompile;
  chinaShard.side = THREE.DoubleSide;
  const glass = k(glassMat(0.04, 0.5));
  const glassShard = k(glassMat(0.12, 0.6));
  const brass = k(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.78, 0.55, 0.24), metalness: 1, roughness: 0.3, envMapIntensity: 1.2 }));
  const steel = k(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.9, 0.91, 0.93), metalness: 1, roughness: 0.13, envMapIntensity: 1.6 }));
  const wax = k(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.94, 0.9, 0.82), roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color(1, 0.9, 0.75) }));
  wax.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvY = position.y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vY;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        // The flame lights the wax from inside near the top.
        totalEmissiveRadiance += vec3(1.0, 0.55, 0.2) * 0.55 * smoothstep(${(CANDLE.y1 - 0.05).toFixed(3)}, ${CANDLE.y1.toFixed(3)}, vY) * uLit;`)
      .replace('void main() {', 'uniform float uLit;\nvoid main() {');
    sh.uniforms.uLit = waxLit;
  };
  const waxLit = { value: 1 };
  const wick = k(new THREE.MeshStandardMaterial({ color: 0x0c0a08, roughness: 0.9 }));
  const wineDrop = k(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.3, 0.015, 0.035), roughness: 0.05, clearcoat: 1, emissive: new THREE.Color(0.04, 0, 0.004) }));
  const waterDrop = k(glassMat(0.15, 0.7));

  /* ---------- geometry ---------- */
  const G = {
    plate: k(new THREE.LatheGeometry(V2(PLATE), 72)),
    wine: k(new THREE.LatheGeometry(V2(WINE), 56)),
    tumbler: k(new THREE.LatheGeometry(V2(TUMBLER), 56)),
    stick: k(new THREE.LatheGeometry(V2(STICK), 48)),
    candle: k(new THREE.CylinderGeometry(CANDLE.r, CANDLE.r, CANDLE.y1 - CANDLE.y0, 40, 48, false).translate(0, (CANDLE.y0 + CANDLE.y1) / 2, 0)),
    wick: k(new THREE.CylinderGeometry(0.0009, 0.0011, 0.013, 6).translate(0, CANDLE.y1 + 0.005, 0)),
  };
  // A melt pool: the top of the candle dips a little at the wick.
  // Wax runs down the side in a few drips, thickest at the lip.
  {
    const p = G.candle.attributes.position;
    const DRIPS = [[0.4, 0.05], [1.5, 0.022], [2.3, 0.075], [3.6, 0.035], [4.9, 0.055], [5.6, 0.016]];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z);
      if (y > CANDLE.y1 - 1e-4 && r < CANDLE.r * 0.9) { p.setY(i, y - 0.003 * (1 - r / CANDLE.r)); continue; }
      if (r < CANDLE.r * 0.99) continue;
      const a = Math.atan2(x, z), down = CANDLE.y1 - y;
      let bump = 0.00035 * Math.exp(-down / 0.006);
      for (const [a0, len] of DRIPS) {
        let da = Math.abs(a - a0); da = Math.min(da, Math.PI * 2 - da);
        const w = 0.13 + 0.05 * Math.sin(down * 300 + a0);
        const along = down < len ? 1 - (down / len) ** 3 : 0;
        // A drip ends in a round bead.
        const bead = Math.exp(-(((down - len) / 0.003) ** 2)) * 0.6;
        bump += 0.0013 * Math.exp(-((da / w) ** 2)) * Math.max(along, bead);
      }
      const k2 = (r + bump) / r;
      p.setX(i, x * k2); p.setZ(i, z * k2);
    }
    G.candle.computeVertexNormals();
  }
  G.knifeHandle = k(knifeHandle());
  G.knifeBlade = k(knifeBlade());
  G.fork = k(fork());

  /* ---------- flame ---------- */
  const flameMat = k(new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uLean: { value: 0 }, uLife: { value: 1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uLean; uniform float uLife; varying vec2 vQ;
      void main() {
        vQ = uv;
        vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vec2 p = position.xy * mix(0.25, 1.0, uLife);
        // The flame bends from its root; its tip leans most.
        p.x += uLean * pow(max(uv.y, 0.0), 1.6) * 0.03;
        p.y *= 1.0 - abs(uLean) * 0.35;
        mv.xy += p;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform float uT; uniform float uLife; varying vec2 vQ;
      void main() {
        float y = vQ.y, x = (vQ.x - 0.5) * 2.0;
        // A tall drop: wide near the root, a fine tip, a short flicker.
        float fl = 1.0 + 0.06 * sin(uT * 17.0 + y * 6.0) + 0.04 * sin(uT * 29.0);
        float w = pow(sin(3.14159 * pow(clamp(y * fl, 0.0, 1.0), 0.62)), 1.2) * 0.62;
        float d = abs(x) / max(w, 1e-3);
        float body = smoothstep(1.0, 0.55, d) * smoothstep(0.0, 0.08, y);
        float core = smoothstep(0.7, 0.0, d) * smoothstep(0.08, 0.3, y) * smoothstep(0.85, 0.4, y);
        float blue = smoothstep(0.24, 0.04, y) * smoothstep(1.1, 0.4, d) * smoothstep(0.0, 0.05, y);
        vec3 c = vec3(1.0, 0.45, 0.12) * body * 1.6 + vec3(1.0, 0.85, 0.55) * core * 3.2 + vec3(0.15, 0.25, 1.0) * blue * 0.9;
        // A soft halo round it, for the bloom to take.
        float halo = exp(-dot(vec2(x * 0.6, (y - 0.4) * 1.6), vec2(x * 0.6, (y - 0.4) * 1.6)) * 3.0) * 0.12;
        c += vec3(1.0, 0.6, 0.25) * halo;
        gl_FragColor = vec4(c * uLife, 1.0);
      }`,
  }));
  const flameG = k(new THREE.PlaneGeometry(0.02, 0.05).translate(0, 0.019, 0));
  const flame = new THREE.Mesh(flameG, flameMat);
  flame.renderOrder = 10;
  flame.frustumCulled = false;

  /* ---------- pieces ---------- */
  function make(kind, c) {
    const root = new THREE.Group(), base = new THREE.Group();
    base.position.set(-c[0], -c[1], -c[2]);
    root.add(base);
    const add = (g, m, shadow = true) => { const x = new THREE.Mesh(g, m); x.castShadow = shadow; x.receiveShadow = true; base.add(x); return x; };
    let tip = null;
    switch (kind) {
      case 'plate': add(G.plate, china); break;
      case 'wine': add(G.wine, glass, false).renderOrder = 4; break;
      case 'tumbler': add(G.tumbler, glass, false).renderOrder = 4; break;
      case 'stick':
        add(G.stick, brass); add(G.candle, wax); add(G.wick, wick, false);
        tip = new THREE.Object3D(); tip.position.set(0, CANDLE.y1 + 0.004, 0); base.add(tip);
        break;
      case 'knife': add(G.knifeHandle, steel); add(G.knifeBlade, steel); break;
      case 'fork': add(G.fork, steel); break;
    }
    return { root, base, tip };
  }

  /* ---------- puddles ---------- */
  const puddleBase = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, clearcoat: 1, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  function puddleMat(i) {
    const m = k(puddleBase.clone());
    m.userData.u = { uSeed: { value: i * 7.3 }, uFade: { value: 1 } };
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, m.userData.u);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vPd;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPd = position.xz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vPd; uniform float uSeed; uniform float uFade;')
        .replace('#include <opaque_fragment>', `
          {
            // A ragged edge: a few lobes round the centre.
            float a = atan(vPd.y, vPd.x);
            float r = length(vPd) * (1.0 + 0.12 * sin(a * 3.0 + uSeed) + 0.07 * sin(a * 7.0 + uSeed * 1.7) + 0.04 * sin(a * 13.0 + uSeed * 0.3));
            diffuseColor.a *= smoothstep(1.0, 0.9, r) * uFade;
          }
          #include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => 'puddle';
    return m;
  }
  const PUD = { wine: [new THREE.Color(0.18, 0.008, 0.02), 0.92], tumbler: [new THREE.Color(0.02, 0.02, 0.022), 0.45] };
  function setPuddle(m, p) {
    const [c, a] = PUD[p.kind];
    m.color.copy(c); m.opacity = a;
    m.userData.u.uSeed.value = p.seed; m.userData.u.uFade.value = p.fade;
  }

  function dispose() { for (const x of own) x.dispose?.(); puddleBase.dispose(); }
  return { make, flame, flameMat, chinaShard, glassShard, wineDrop, waterDrop, puddleMat, setPuddle, waxLit, dispose };
}

/* ---------- liquid ---------- */
// The liquid: the inside of the glass cut by a level plane, and a cap on that plane.
const UP = new THREE.Vector3(0, 1, 0);
export function liquidMats(kind, keep) {
  const wine = kind === 'wine';
  const prof = INNER[kind];
  const u = {
    uPlane: { value: new THREE.Vector4(0, 1, 0, -10) },
    uO: { value: new THREE.Vector3() }, uU: { value: new THREE.Vector3(0, 1, 0) },
    uProf: { value: prof.map(([y, r]) => new THREE.Vector2(y, r)) },
  };
  const mk = cap => {
    const m = wine
      ? new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.14, 0.004, 0.018), roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.96, emissive: new THREE.Color(0.035, 0.0, 0.004), side: THREE.DoubleSide })
      : glassMat(cap ? 0.06 : 0.03, cap ? 0.55 : 0.25, [0.004, 0.006, 0.007]);
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      prev.call(m, sh, r);
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vWp; uniform vec4 uPlane; uniform vec3 uO; uniform vec3 uU; uniform vec2 uProf[8];
        float innerR(float y) {
          float r = 0.0;
          for (int i = 1; i < 8; i++) {
            vec2 a = uProf[i - 1], b = uProf[i];
            if (y >= a.x && y <= b.x) r = mix(a.y, b.y, (y - a.x) / max(b.x - a.x, 1e-5));
          }
          return r;
        }`)
        .replace('void main() {', `void main() {
          ${cap ? `{
            vec3 v = vWp - uO;
            float yl = dot(v, uU);
            if (length(v - uU * yl) > innerR(yl) * 0.985) discard;
          }` : 'if (dot(uPlane.xyz, vWp) - uPlane.w > 0.0) discard;'}`);
    };
    m.customProgramCacheKey = () => `liq-${kind}-${cap}`;
    return keep(m);
  };
  const bodyG = keep(new THREE.LatheGeometry(prof.map(([y, r]) => new THREE.Vector2(r * 0.985, y)), 40));
  const capG = keep(new THREE.CircleGeometry(0.06, 48).rotateX(-Math.PI / 2));
  const body = new THREE.Mesh(bodyG, mk(false));
  const capM = new THREE.Mesh(capG, mk(true));
  body.renderOrder = 2; capM.renderOrder = 3;
  body.matrixAutoUpdate = false;
  const O = new THREE.Vector3(), U = new THREE.Vector3(), n = new THREE.Vector3(), q = new THREE.Quaternion();
  function sync(b, root) {
    const L = b.liq, on = !b.gone && L.f > 0 && b.scale > 0.5;
    body.visible = capM.visible = on;
    if (!on) return;
    // The base sits below the root by the centre height, along the glass's axis.
    U.set(b.R[1], b.R[4], b.R[7]);
    O.set(b.x, b.y, b.z).addScaledVector(U, -b.c[1]);
    n.set(-L.sx, 1, -L.sz).normalize();
    const P = U.clone().multiplyScalar(L.f).add(O);
    u.uPlane.value.set(n.x, n.y, n.z, n.dot(P));
    u.uO.value.copy(O); u.uU.value.copy(U);
    body.matrix.copy(root.matrixWorld).multiply(new THREE.Matrix4().makeTranslation(0, -b.c[1], 0));
    body.matrixWorldNeedsUpdate = true;
    body.matrixWorld.copy(body.matrix);
    capM.position.copy(P);
    capM.quaternion.copy(q.setFromUnitVectors(UP, n));
  }
  return { body, cap: capM, sync };
}

/* ---------- cutlery ---------- */
// Built flat in the shape plane, then laid down: shape y runs along -z, depth along y.
function lay(g, y0) {
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  g.computeVertexNormals();
  return g;
}
function knifeHandle() {
  const s = new THREE.Shape();
  const w = 0.0095;
  s.moveTo(-w * 0.9, -0.012);
  s.lineTo(-w, -0.1);
  s.quadraticCurveTo(-w, -0.115, 0, -0.1155);
  s.quadraticCurveTo(w, -0.115, w, -0.1);
  s.lineTo(w * 0.9, -0.012);
  s.lineTo(-w * 0.9, -0.012);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.0022, bevelSize: 0.0022, bevelSegments: 3, curveSegments: 10 });
  return lay(g, 0.0022);
}
function knifeBlade() {
  const s = new THREE.Shape();
  s.moveTo(-0.0075, -0.014);
  s.lineTo(-0.0078, 0.09);
  s.quadraticCurveTo(-0.0072, 0.112, -0.002, 0.1155);
  s.quadraticCurveTo(0.009, 0.108, 0.0102, 0.07);
  s.lineTo(0.0095, -0.014);
  s.lineTo(-0.0075, -0.014);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.0012, bevelEnabled: true, bevelThickness: 0.0004, bevelSize: 0.0005, bevelSegments: 1, curveSegments: 10 });
  return lay(g, 0.0016);
}
function fork() {
  // One outline: handle, neck, head with four tines.
  const pts = [];
  const hw = v => v < -0.02 ? 0.0105 - (v + 0.1) * 0.02 : v < 0.025 ? 0.0045 + Math.max(0, v - 0.0) * 0.22 : 0.0125;
  for (let v = -0.098; v <= 0.05; v += 0.004) pts.push([-hw(v), v]);
  const tineL = 0.045, x0 = -0.0125, gap = 0.0035, tw = (0.025 - 3 * gap) / 4;
  for (let t = 0; t < 4; t++) {
    const a = x0 + t * (tw + gap), b = a + tw;
    pts.push([a, 0.05 + tineL - 0.001], [a + tw * 0.3, 0.05 + tineL], [b, 0.05 + tineL - 0.003]);
    if (t < 3) pts.push([b, 0.052], [b + gap, 0.052]);
  }
  for (let v = 0.05; v >= -0.098; v -= 0.004) pts.push([hw(v), v]);
  const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.0018, bevelEnabled: true, bevelThickness: 0.0005, bevelSize: 0.0005, bevelSegments: 1, curveSegments: 4 });
  lay(g, 0.0012);
  // The head and the handle end curve up off the cloth.
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i), v = -z;
    if (v > 0.03) p.setY(i, p.getY(i) + (v - 0.03) * (v - 0.03) * 2.2);
    if (v < -0.06) p.setY(i, p.getY(i) + (v + 0.06) * (v + 0.06) * 2.0);
  }
  g.computeVertexNormals();
  return g;
}
