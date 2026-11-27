import * as THREE from 'three';
import { bedMesh, solidMaterial, beadMesh } from './half.js';
import { harvestShape } from './harvest-shapes.js';

const fuzz = (k = 0) => ({ k, root: [[0.08, 0.035, 0.012], [0.18, 0.09, 0.025]], tip: [0.32, 0.22, 0.1], trans: [0.5, 0.3, 0.12], len: 0.035, width: 0.6 });
const grain = /* glsl */`
float relief(vec2 f) {
  vec2 c = cellEdge(f * 48.0 + vn(vec3(f * 9.0, 1.0)) * 1.3);
  return 0.0016 * sqrt(clamp(c.x * 2.0, 0.0, 1.0)) + 0.002 * vn(vec3(f * 12.0, 3.0));
}
`;

function stem(U, g, mat, e) {
  if (e < 0) return;
  const geo = new THREE.CylinderGeometry(0.024, 0.04, 0.09, 12);
  geo.rotateZ(Math.PI / 2); geo.translate(-this.A - 0.02, 0, 0);
  g.add(new THREE.Mesh(geo, solidMaterial(U, { col: 'vec3(0.1, 0.08, 0.025)', rough: 0.7 })));
}

function face(bedCode, opts = {}, pit = null) {
  return function(U, g, R, e) {
    const bed = bedMesh(U, this, grain + bedCode, opts);
    const parts = [bed]; g.add(bed);
    if (this.id === 'papaya') {
      const cavityGeo = new THREE.SphereGeometry(1, 48, 28, 0, Math.PI*2, 0, Math.PI/2);
      cavityGeo.rotateZ(Math.PI/2);
      cavityGeo.scale(0.25, this.B*0.43, this.C*0.43);
      const cavity = new THREE.Mesh(cavityGeo, solidMaterial(U, {
        col: 'mix(vec3(0.075, 0.015, 0.004), vec3(0.3, 0.07, 0.015), smoothstep(-0.25, 0.0, vL.x))',
        rough: 0.4, side: THREE.BackSide,
      }));
      g.add(cavity); parts.push(cavity);
      const seeds = Array.from({ length: 85 }, () => {
        const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 0.3;
        return { p: [-0.18 * (1-r/0.3) + R()*0.035, Math.cos(a)*r, Math.sin(a)*r], ph: R()*6.28,
          s: [0.022, 0.026, 0.023], col: [0.018, 0.014, 0.009], sig: 4, seed: 0 };
      });
      const mesh = beadMesh(U, seeds, { wet: 0.55, scale: 15 });
      g.add(mesh); parts.push(mesh);
    }
    if (this.id === 'coconut') {
      const geo = new THREE.SphereGeometry(1, 48, 28, 0, Math.PI*2, 0, Math.PI/2);
      geo.rotateZ(Math.PI/2);
      geo.scale(0.48, this.B*0.66, this.C*0.66);
      const hollow = new THREE.Mesh(geo, solidMaterial(U, {
        col: 'vec3(0.58, 0.56, 0.49) * (0.55 + 0.45 * smoothstep(-0.5, 0.0, vL.x))',
        rough: 0.5, side: THREE.BackSide,
      }));
      g.add(hollow); parts.push(hollow);
    }
    if (pit && e < 0) {
      const geo = new THREE.SphereGeometry(1, 48, 32);
      geo.scale(...pit.scale);
      const stone = new THREE.Mesh(geo, solidMaterial(U, {
        col: pit.col, rough: 0.65, bump: 0.25, bumpScale: 60,
      }));
      stone.userData.ejectable = { radius: Math.max(...pit.scale) * 0.75 };
      g.add(stone); parts.push(stone);
    } else if (pit && e > 0) {
      const geo = new THREE.SphereGeometry(1, 48, 28, 0, Math.PI*2, 0, Math.PI/2);
      geo.rotateZ(Math.PI/2);
      geo.scale(pit.hollowDepth, pit.scale[1]*1.06, pit.scale[2]*1.06);
      const hollow = new THREE.Mesh(geo, solidMaterial(U, { col: pit.hollowCol, rough: 0.6, side: THREE.BackSide }));
      g.add(hollow); parts.push(hollow);
    }
    return { bed, parts };
  };
}

export const lemon = {
  id: 'lemon', label: 'Lemon', A: 1.03, B: 0.69, C: 0.69,
  shape: (t, ph, e) => harvestShape('lemon', t, ph, e),
  look: {
    skinA: [0.58, 0.36, 0.006], skinB: [0.85, 0.64, 0.012], mottle: 9,
    pores: 0.3, poreScale: 95, rough: 0.48, f0: 0.035,
    thru: [0.8, 0.52, 0.04], thruK: 4, tipDark: 0.1,
    glsl: `float gland = pow(vn(fp * 90.0), 4.0); base *= 0.94 + 0.08 * vn(fp * 18.0); roughAdd += gland * 0.12;`,
  }, fuzz: fuzz(), juice: [0.95, 0.87, 0.35], glow: 0.5, tip: stem,
  face: face(/* glsl */`
vec3 bed(vec2 f, float r, float a, inout float glow) {
  float segment = abs(sin(a * 5.0 + 0.035*sin(r*16.0))) * r;
  float membrane = 1.0 - smoothstep(0.004, 0.014, segment);
  vec2 q = vec2(a*r*28.0, r*15.0) + vec2(vn(vec3(f*8.0, 1.0))) * 1.2;
  vec2 sacs = cellEdge(q);
  vec2 deep = f - gPar * 0.07;
  vec2 under = cellEdge(vec2(atan(deep.y, deep.x)*length(deep)*28.0, length(deep)*15.0) + vec2(vn(vec3(deep*8.0, 1.0))) * 1.2);
  float pulp = (sacs.y * 0.12 + 0.1 * sqrt(clamp(sacs.x*2.0, 0.0, 1.0))) * 0.65 + under.y * 0.07;
  vec3 flesh = mix(vec3(0.56, 0.34, 0.02), vec3(0.87, 0.69, 0.18), pulp + 0.25);
  flesh = mix(flesh, vec3(0.89, 0.8, 0.49), membrane * 0.7);
  vec3 col = mix(flesh, vec3(0.9, 0.85, 0.62), smoothstep(0.83, 0.86, r));
  col = mix(col, vec3(0.7, 0.49, 0.008), smoothstep(0.96, 0.98, r));
  glow = (1.0 - smoothstep(0.82, 0.9, r)) * 0.4;
  return col;
}`, { bumpK: 1.1, wet: 0.8, scatter: 0.45, scatterDepth: 0.045 }),
};

export const mango = {
  id: 'mango', label: 'Mango', A: 1.08, B: 0.8, C: 0.64,
  shape: (t, ph, e) => harvestShape('mango', t, ph, e),
  look: {
    skinA: [0.45, 0.24, 0.006], skinB: [0.76, 0.48, 0.015], mottle: 4,
    blush: [0.48, 0.025, 0.018], blushK: 0.8, blushDir: [0.2, 0.8, 0.4],
    speck: [0.76, 95, 0.45], speckCol: [0.18, 0.11, 0.015], pores: 0.04, poreScale: 70,
    thru: [0.8, 0.34, 0.01], thruK: 4, rough: 0.48,
    glsl: `float freckle = smoothstep(0.74, 0.83, vn(fp * 110.0)); base = mix(base, vec3(0.21, 0.12, 0.015), freckle * 0.45); roughAdd += freckle * 0.1;`,
  }, fuzz: fuzz(), juice: [0.98, 0.56, 0.06], glow: 0.45, tip: stem,
  face: face(/* glsl */`
vec3 bed(vec2 f, float r, float a, inout float glow) {
  vec2 deep = f - gPar * 0.045;
  float fibre = vn(vec3(f.x * 15.0, f.y * 100.0, 2.0)) * 0.6 + vn(vec3(deep.x * 15.0, deep.y * 100.0, 3.0)) * 0.4;
  vec3 flesh = mix(vec3(0.72, 0.22, 0.004), vec3(0.95, 0.49, 0.012), fibre * 0.35 + r * 0.3);
  float stone = length(f / vec2(0.48, 0.24));
  flesh = mix(flesh, vec3(0.63, 0.41, 0.11), (1.0 - smoothstep(0.9, 1.1, stone)) * 0.65);
  glow = (1.0 - smoothstep(0.92, 0.98, r)) * 0.3;
  return mix(flesh, vec3(0.2, 0.21, 0.012), smoothstep(0.97, 0.99, r));
}`, { wet: 1.0, bumpK: 0.8, hole: [0.49, 0.25], scatter: 0.32, scatterDepth: 0.04 }, { scale: [0.11, 0.37, 0.14], hollowDepth: 0.16, hollowCol: 'vec3(0.57, 0.32, 0.06) * (0.7 + 0.3 * vn(vL * vec3(20.0, 80.0, 40.0)))', col: 'vec3(0.65, 0.43, 0.12) * (0.8 + 0.2 * vn(vL * vec3(30.0, 80.0, 30.0)))' }),
};

export const avocado = {
  id: 'avocado', label: 'Avocado', A: 1.0, B: 0.8, C: 0.76,
  shape: (t, ph, e) => harvestShape('avocado', t, ph, e),
  look: {
    skinA: [0.012, 0.024, 0.005], skinB: [0.05, 0.075, 0.018], mottle: 12,
    pores: 0.35, poreScale: 45, rough: 0.7, thruK: 12, thru: [0.08, 0.1, 0.01],
    glsl: `float pebble = smoothstep(0.28, 0.68, vn(fp * 42.0)); base *= 0.62 + pebble * 0.48; base = mix(base, vec3(0.016, 0.009, 0.012), smoothstep(0.55, 0.8, vn(fp * 5.0)) * 0.45); roughAdd += (1.0-pebble) * 0.12;`,
  }, fuzz: fuzz(), juice: [0.68, 0.77, 0.3], glow: 0.12, tip: stem,
  face: face(/* glsl */`
vec3 bed(vec2 f, float r, float a, inout float glow) {
  vec3 col = mix(vec3(0.77, 0.69, 0.29), vec3(0.18, 0.34, 0.035), smoothstep(0.6, 0.96, r));
  vec2 deep = f - gPar * 0.025;
  float cells = vn(vec3(f * 48.0, 1.0)) * 0.6 + vn(vec3(deep * 38.0, 2.0)) * 0.4;
  col *= 0.92 + 0.1 * cells;
  col = mix(vec3(0.24, 0.14, 0.045), col, smoothstep(0.32, 0.4, r));
  glow = (1.0 - smoothstep(0.9, 0.98, r)) * 0.2;
  return mix(col, vec3(0.025, 0.04, 0.008), smoothstep(0.97, 0.99, r));
}`, { wet: 0.35, rough: 0.65, hole: [0.4, 0.4], scatter: 0.16, scatterDepth: 0.025 }, { scale: [0.24, 0.3, 0.29], hollowDepth: 0.24, hollowCol: 'vec3(0.55, 0.55, 0.2) * (0.62 + 0.38 * smoothstep(-0.24, 0.0, vL.x))', col: 'mix(vec3(0.14, 0.045, 0.012), vec3(0.37, 0.15, 0.045), vn(vL * 35.0))' }),
};

export const papaya = {
  id: 'papaya', label: 'Papaya', A: 1.15, B: 0.76, C: 0.73,
  shape: (t, ph, e) => harvestShape('papaya', t, ph, e),
  look: {
    skinA: [0.18, 0.25, 0.015], skinB: [0.76, 0.42, 0.01], mottle: 3,
    pores: 0.05, poreScale: 80, rough: 0.5, thruK: 5, thru: [0.6, 0.29, 0.02],
    glsl: `float ripeness = smoothstep(0.35, 0.7, vn(fp * 3.2)); base = mix(base, vec3(0.16, 0.23, 0.018), (1.0-ripeness)*0.38); roughAdd += 0.08 * vn(fp * 30.0);`,
  }, fuzz: fuzz(), juice: [0.98, 0.39, 0.1], glow: 0.3, tip: stem,
  bits: { s: [0.028, 0.032, 0.027], color: () => [0.018, 0.014, 0.009], sig: 4, seed: 0, seedCol: [0, 0, 0], scale: 15, n: 25 },
  face: face(/* glsl */`
vec3 bed(vec2 f, float r, float a, inout float glow) {
  vec2 deep = f - gPar * 0.05;
  float cloud = vn(vec3(f * 15.0, 1.0))*0.55 + vn(vec3(deep * 18.0, 2.0))*0.45;
  vec3 col = mix(vec3(0.65, 0.12, 0.025), vec3(0.92, 0.35, 0.08), 0.3 + 0.35*cloud + 0.25*r);
  float cavity = 1.0 - smoothstep(0.4, 0.47, r);
  vec2 ce = cells(f * 26.0);
  vec3 seeds = mix(vec3(0.012, 0.008, 0.005), vec3(0.065, 0.045, 0.025), 1.0-smoothstep(0.1, 0.26, ce.x));
  col = mix(col, seeds, cavity);
  glow = (1.0-cavity) * 0.4;
  return mix(col, vec3(0.22, 0.3, 0.015), smoothstep(0.97, 0.99, r));
}`, { wet: 0.9, bumpK: 1.2, hole: [0.43, 0.43], scatter: 0.3, scatterDepth: 0.045 }),
};

export const coconut = {
  id: 'coconut', label: 'Coconut', A: 0.93, B: 0.83, C: 0.8,
  shape: (t, ph, e) => harvestShape('coconut', t, ph, e),
  look: {
    skinA: [0.04, 0.015, 0.004], skinB: [0.17, 0.075, 0.02], mottle: 12,
    pores: 0.3, poreScale: 30, rough: 0.9, thruK: 20, thru: [0.08, 0.03, 0.01],
    glsl: `float fibre = vn(fp * vec3(12.0, 110.0, 110.0)); base *= 0.72 + 0.5*fibre; roughAdd += 0.12*(1.0-fibre);`,
  }, fuzz: fuzz(0.24), juice: [0.82, 0.85, 0.8], glow: 0.1,
  face: face(/* glsl */`
vec3 bed(vec2 f, float r, float a, inout float glow) {
  vec3 shell = mix(vec3(0.08, 0.025, 0.006), vec3(0.22, 0.11, 0.035), vn(vec3(f*60.0, 1.0)));
  vec2 deep = f - gPar * 0.018;
  vec3 flesh = vec3(0.83, 0.81, 0.73) * (0.88 + 0.07*vn(vec3(f*65.0, 2.0)) + 0.05*vn(vec3(deep*48.0, 3.0)));
  flesh *= 0.94 + 0.06 * vn(vec3(a*24.0, r*60.0, 3.0));
  vec3 col = mix(flesh, shell, smoothstep(0.9, 0.94, r));
  vec3 cavity = vec3(0.025, 0.034, 0.028) + vec3(0.02) * vn(vec3(f*4.0, 1.0));
  glow = smoothstep(0.66, 0.7, r) * (1.0 - smoothstep(0.88, 0.94, r)) * 0.12;
  return mix(cavity, col, smoothstep(0.66, 0.69, r));
}`, { wet: 0.25, rough: 0.65, bumpK: 0.6, hole: [0.66, 0.66], scatter: 0.1, scatterDepth: 0.018 }),
};
