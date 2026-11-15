// Cliff: a grassy headland at dawn above a bay full of sea fog.
// The props live in cliff-props.js; the sky, fog and air in cliff-air.js.
// The camera looks east (-z) over the line; the sun rises behind the washing.
import * as THREE from 'three';
import { rng, col } from './kit.js';
import { airUniforms, airify, cliffSky, beams } from './cliff-air.js';
import { terrain, wall, posts, meadow, headland, lighthouse } from './cliff-props.js';
import { flyby } from './cliff-flyby.js';

const LINE_Z = 0;
const SEA = -60;
const EYE = [0, 1.3, 9];
const EYE_PHONE = [0, 1.3, 17];
// The lantern height comes from the headland under it.
const LAMP = [455, 0, -1300];
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// The cliff edge wanders across the headland, about 16 m past the line.
const edgeZ = x => -16 + 3 * Math.sin(x / 9) + 1.6 * Math.sin(x / 4.3 + 1);
// Headland height: a gentle rise of turf, then a steep fall to the sea.
function heightAt(x, z) {
  const turf = 0.35 * Math.sin(x / 7) * Math.sin(z / 9) + 0.25 * Math.sin(x / 3.1 + z / 4.7) - 0.02 * Math.max(0, z - 5);
  const past = edgeZ(x) - z;
  if (past <= 0) return turf;
  // A rounded lip, then a near-vertical face down to the sea.
  return turf - Math.min(-SEA, past * past * 1.8 + past * 6);
}
// The wall runs from behind the near post off to the left, toward the eye.
const WALL = { from: [-2.45, -0.95], to: [-14, 3] };
function wallDist(x, z) {
  const [ax, az] = WALL.from, dx = WALL.to[0] - ax, dz = WALL.to[1] - az;
  const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - t * dx, z - az - t * dz);
}

export default {
  id: 'cliff',
  name: 'Cliff',
  anchors: { a: [-3.5, 2.05, LINE_Z], b: [3.5, 1.95, LINE_Z] },
  windDir: [0.25, 0.97],
  // Left end: the sun 4° under the sea; right end: 3° up behind the washing.
  sun: { front: [0.06, -0.07, -0.996], back: [0.06, 0.052, -0.997] },
  sky: { zen: [0.42, 0.09, 255], hor: [0.84, 0.07, 55], haze: [0.78, 0.05, 60], clouds: 0, warm: 1 },
  amb: { hi: [0.75, 0.04, 250], lo: [0.5, 0.04, 120] },
  cord: [0.05, 0.05, 0.05],
  hangFrom: 0.5,
  start: 3,
  // Three's own fog stays off; the air shader does this work.
  fog: [1e6, 2e6],
  fill: 1.3,
  wash: [
    { w: 1.4, h: 1.1, c: [0.95, 0.01, 90] },
    { w: 0.75, h: 1.0, c: [0.55, 0.1, 250] },
    { w: 0.9, h: 0.65, c: [0.75, 0.1, 30] },
    { w: 0.6, h: 0.45, c: [0.85, 0.08, 95] },
  ],
  palette: [[0.95, 0.01, 90], [0.55, 0.1, 250], [0.75, 0.1, 30], [0.85, 0.08, 95], [0.6, 0.08, 150], [0.4, 0.03, 250]],

  // Under the line, so the washing stands against the dawn sky.
  frame(cam, aspect) {
    const phone = aspect < 1, eye = phone ? EYE_PHONE : EYE;
    cam.fov = phone ? 64 : 38;
    cam.near = 0.1;
    cam.far = 45000;
    cam.aspect = aspect;
    cam.position.set(...eye);
    cam.lookAt(0, eye[1] + (phone ? 4 : 7), -200);
    cam.updateProjectionMatrix();
  },

  // Light on the near scene follows the sun over the horizon.
  light(sun, { sunLight, hemi, renderer, bloom }) {
    const y = sun.dir.y;
    sunLight.intensity = 3.4 * sm(-0.012, 0.035, y);
    hemi.intensity = 0.6 + 0.7 * sm(-0.08, 0.04, y);
    // The eye adapts to the dark before dawn.
    renderer.toneMappingExposure = 1.4 - 0.85 * sm(-0.07, 0.05, y);
    bloom.strength = 0.22 + 0.1 * sm(-0.02, 0.05, y);
    // Only the sun and the lantern bloom, not the bright sky around them.
    bloom.threshold = 3;
  },

  build(scene) {
    const R = rng(29);
    const group = new THREE.Group();
    scene.add(group);
    const u = airUniforms(-SEA);

    /* ---------- the near headland ---------- */
    const { turf, rock } = terrain(group, u, heightAt);
    // The fog hides the sea; it runs out to the horizon under the fog.
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(90000, 43000), airify(new THREE.MeshStandardMaterial({ color: col([0.2, 0.02, 240]), roughness: 0.3 }), u));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, SEA, -20500);
    group.add(sea);
    wall(group, u, R, heightAt, WALL);
    posts(group, u, R, this.anchors, { p: [-15, heightAt(-15, 4.6) + 0.6, 4.6], ry: -0.9 });
    const winds = meadow(group, u, R, heightAt, edgeZ, wallDist);

    /* ---------- far headlands and the lighthouse ---------- */
    // Each rises out of the sea; the fog buries their feet.
    const near = headland(group, [turf, rock], R, { x: 420, z: -1300, w: 380, d: 230, h: 62, sea: SEA });
    // Sea stacks stand off the lighthouse point.
    for (const [x, z, w, h] of [[-20, -1290, 26, 38], [-55, -1250, 14, 24], [-5, -1230, 9, 15]]) headland(group, [turf, rock], R, { x, z, w, d: w * 0.8, h, sea: SEA, seg: [40, 32] });
    headland(group, [turf, rock], R, { x: -1100, z: -3300, w: 1150, d: 520, h: 120, sea: SEA });
    headland(group, [turf, rock], R, { x: 2200, z: -7200, w: 2700, d: 950, h: 220, sea: SEA });
    const base = near(LAMP[0], LAMP[2]) - 0.5;
    LAMP[1] = base + 29.7;
    const lantern = lighthouse(group, u, base, [LAMP[0], LAMP[2]]);

    /* ---------- sky and beam ---------- */
    const dome = cliffSky(group, u);
    const beam = beams(group, LAMP);
    const pair = flyby(group, u, rng(7));
    const toCam = new THREE.Vector3();
    const W = new THREE.Vector3(this.windDir[0], 0, this.windDir[1]).normalize();
    group.userData.tick = (t, sun, cam, viewH, sky, wind) => {
      u.uSunDir.value.copy(sun.dir);
      // Grass bends with the line's wind; low sun glows through the blades.
      const push = (wind ? wind.u * wind.scale : 1.3) * 0.08;
      const glow = 0.08 * sm(-0.01, 0.04, sun.dir.y);
      for (const w of winds) { w.uWind.value.copy(W).multiplyScalar(push); w.uTrans.value.copy(sun.col).multiplyScalar(glow); }
      u.uT.value = t;
      pair.tick(t, sun);
      dome.position.copy(cam.position);
      // Before dawn the beam turns; at sunrise it fades out.
      const k = 1 - sm(-0.03, 0.02, sun.dir.y);
      const a = t * 0.5;
      beam.turn.rotation.y = a;
      beam.turn.visible = k > 0.001;
      beam.u.uK.value = 4 * k;
      // The lantern flashes when a beam sweeps past the eye.
      toCam.set(cam.position.x - LAMP[0], 0, cam.position.z - LAMP[2]).normalize();
      const f = Math.abs(Math.cos(a) * toCam.x - Math.sin(a) * toCam.z) ** 60;
      lantern.material.emissiveIntensity = (1.5 + 60 * f) * Math.max(k, 0.35);
    };
    return group;
  },
};
