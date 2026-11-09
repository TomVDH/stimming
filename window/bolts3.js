// Lightning bolts as fat lines, drawn into the outside target after the shader.
// Units are km from the eye, in the world frame of the outside pass.
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

const R_EARTH2 = 12742;

// Midpoint displacement: each split moves the middle off the line.
// The kick shrinks with the segment, so the channel stays jagged at every scale.
function jag(a, b, depth, rough, rnd) {
  if (depth === 0) return [a, b];
  const m = a.clone().lerp(b, 0.5), len = a.distanceTo(b);
  m.add(new THREE.Vector3(rnd() - 0.5, (rnd() - 0.5) * 0.4, rnd() - 0.5).multiplyScalar(len * rough));
  return [...jag(a, m, depth - 1, rough, rnd).slice(0, -1), ...jag(m, b, depth - 1, rough, rnd)];
}

export function createBolts() {
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(50, 1, 0.5, 800);
  cam.matrixAutoUpdate = false;
  // Additive light; the sky alpha in the target stays as the shader wrote it.
  const mat = (color, width, glow) => {
    const m = new LineMaterial({ color, linewidth: width, worldUnits: false, transparent: true, depthWrite: false, depthTest: true, depthFunc: THREE.LessEqualDepth });
    Object.assign(m, { blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor });
    // The line sits on the far plane: the wing's depth hides it.
    m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <fog_vertex>', '#include <fog_vertex>\n\tgl_Position.z = gl_Position.w;'); };
    m.userData.glow = glow; m.userData.hex = color;
    return m;
  };
  const live = new Map();

  // One bolt per flash: a main channel and a few forks.
  function build(f, H, cover) {
    // A seeded stream from the flash's place: the same flash, the same bolt.
    let s = (Math.floor(f.x * 1000) ^ Math.floor(f.z * 7919)) >>> 0;
    const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const g = f.cell ? f.cell : null;
    // Cloud to ground below a thin deck; otherwise a crawler in the anvil.
    const ground = f.kind ? f.kind === 'ground' : g && rnd() < 0.55 * (1 - cover);
    const top = g ? g.top : 11, ax = g ? [Math.cos(g.shear), Math.sin(g.shear)] : [1, 0];
    let a, b;
    if (ground) {
      a = new THREE.Vector3(f.x, 2.3, f.z);
      b = new THREE.Vector3(f.x + (rnd() - 0.5) * 4, 0, f.z + (rnd() - 0.5) * 4);
    } else {
      const y = Math.max(top - 1.2, 6), len = 6 + rnd() * 10;
      a = new THREE.Vector3(f.x - ax[0] * len * 0.3, y, f.z - ax[1] * len * 0.3);
      b = new THREE.Vector3(f.x + ax[0] * len, y - 0.4 - rnd(), f.z + ax[1] * len);
    }
    const main = jag(a, b, 6, 0.32, rnd);
    const chains = [{ pts: main, w: 1 }];
    // Forks leave the main channel and die out partway.
    const forks = 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < forks; i++) {
      const at = main[Math.floor((0.15 + rnd() * 0.6) * (main.length - 1))];
      const dir = b.clone().sub(a).normalize().add(new THREE.Vector3(rnd() - 0.5, -0.3 * rnd(), rnd() - 0.5).multiplyScalar(1.4)).normalize();
      const end = at.clone().addScaledVector(dir, a.distanceTo(b) * (0.15 + rnd() * 0.25));
      chains.push({ pts: jag(at, end, 4, 0.35, rnd), w: 0.45 });
    }
    const group = new THREE.Group(), lines = [];
    for (const ch of chains) {
      const geo = new LineGeometry();
      geo.setPositions(ch.pts.flatMap(p => [p.x, p.y, p.z]));
      // A white-violet core inside a wide blue halo.
      for (const [color, width, glow] of [[0xe4e6ff, 1.1 * ch.w + 0.5, 1], [0x6f78ff, 3.5 * ch.w + 1.5, 0.12]]) {
        const l = new Line2(geo, mat(color, width, glow * ch.w));
        l.frustumCulled = false;
        group.add(l); lines.push(l);
      }
    }
    scene.add(group);
    return { group, lines, ground, base: chains.map(c => c.pts) };
  }

  return {
    scene, cam,
    // Poses the bolts for this frame and reports the brightest, for the wing.
    update({ flashes, camXZ, H, wingCam, outW, outH, cover, haze }) {
      cam.matrixWorld.copy(wingCam.matrixWorld);
      cam.matrixWorldInverse.copy(wingCam.matrixWorldInverse);
      cam.fov = wingCam.fov; cam.aspect = wingCam.aspect; cam.updateProjectionMatrix();
      const seen = new Set();
      let best = null;
      for (const f of flashes) {
        if (!f.cell || f.level < 0.02) continue;
        let b = live.get(f);
        if (!b) { b = build(f, H, cover); live.set(f, b); }
        seen.add(f);
        // World positions: relative to the eye, dropped by the ground's curve at the flash.
        const dx = f.x - camXZ[0], dz = f.z - camXZ[1];
        b.group.position.set(-camXZ[0], -H - (dx * dx + dz * dz) / R_EARTH2, -camXZ[1]);
        b.group.children.forEach(l => {
          const k = l.material.userData.glow * Math.min(f.level, 2.5) * (b.ground ? 1 - 0.85 * cover : 1);
          l.material.color.setHex(l.material.userData.hex).multiplyScalar(k * 2.5 * (1 - haze));
          l.material.resolution.set(outW, outH);
        });
        if (!best || f.level > best.level) best = { level: f.level, dir: new THREE.Vector3(dx, (f.y ?? 4) - H - (dx * dx + dz * dz) / R_EARTH2, dz).normalize() };
      }
      // Bolts whose flash has gone are dropped.
      for (const [f, b] of live) if (!seen.has(f)) {
        scene.remove(b.group);
        b.group.children.forEach(l => { l.material.dispose(); });
        new Set(b.group.children.map(l => l.geometry)).forEach(g => g.dispose());
        live.delete(f);
      }
      return best;
    },
  };
}
