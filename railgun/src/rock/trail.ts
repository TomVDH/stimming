// Load order: fx/volnoise runs first.
import '../fx/volnoise.ts';
import * as THREE from 'three';
import { linFit } from '../../../shared/stim.js';
import { state } from '../state.ts';
import { scene } from '../setup.ts';
import { U } from '../world/uniforms.ts';
import { HEAD } from '../sky/atmosphere.ts';
import { AIR } from '../sky/air.ts';
import { BAND } from '../clouds/bands.ts';
import { EMBER, WHITE, ast, astMat } from './asteroid.ts';
import { volRT } from '../fx/volnoise.ts';

/* ---------- trail: a raymarched smoke train across the sky ---------- */
// A cone runs from the rock along ast.away, 160 km long.
// The fragment shader marches the view ray through the cone.
// u counts local radii along the cone; the noise keeps one scale.
export const PU = {
  uAstP: { value: ast.pos }, uAstRad: { value: 1 }, uAway: { value: ast.away }, uSide: { value: ast.side }, uUpv: { value: ast.upv },
  uBurn: astMat.uniforms.uBurn, uVol: { value: volRT.texture },
  // Long enough that the tip lies past the frame, even at the wide lens.
  // uK: the column's spread; it widens slowly as the smoke ages.
  uLen: { value: 480000 }, uK: { value: 0.11 },
  // uTrail fades the smoke.
  // uSolid: the rock's blocking radius in rock radii; 0 when no rock.
  uTrail: { value: 1 }, uSolid: { value: 1 }, uFlow: { value: 0 }, uSteps: { value: 72 }, uLSteps: { value: 4 },
  // uEatK: how much the impact cloud eats this train; the main trail only.
  // uJoin: 1 keeps a debris train full to its far end, where it meets the main trail.
  uEatK: { value: 1 }, uJoin: { value: 0 },
  // uBreak erodes the train after the hit; at 0 it changes nothing.
  uBreak: { value: 0 },
  // After the hit the tail fades from its tip, metres along: uCut.
  // uDrift carries the old smoke on the wind. Both idle before the hit.
  uCut: { value: 1e9 }, uDrift: { value: new THREE.Vector3() },
  // A chain segment starts uX0 metres down the trail and runs uSeg metres.
  uX0: { value: 0 }, uSeg: { value: 0 },
  // The blast shoves the head of the trail aside: direction, amount.
  uSwipe: { value: new THREE.Vector3() },
  uHot: { value: new THREE.Vector3(...WHITE) }, uFireC: { value: new THREE.Vector3(...linFit(0.7, 0.18, 45)) }, uEmberC: { value: new THREE.Vector3(...EMBER) },
  uSoot: { value: new THREE.Vector3(...linFit(0.26, 0.02, 50)) }, uAsh: { value: new THREE.Vector3(...linFit(0.93, 0.012, 80)) },
};
// One train per uniform set: the rock's own, and smaller ones for debris.
const TRAIN_GEO = new THREE.CylinderGeometry(1, 1, 1, 20, 1);
export function makeTrain(pu: Record<string, THREE.IUniform>) {
  return new THREE.Mesh(TRAIN_GEO, new THREE.ShaderMaterial({
  uniforms: { ...U, ...pu }, transparent: true, depthWrite: false,
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  vertexShader: /* glsl */`uniform vec3 uAstP, uAway, uSide, uUpv, uDrift; uniform float uAstRad, uLen, uK, uX0, uSeg;
  varying vec3 vP;
  void main() {
    // The proxy is the cone, padded by half its radius.
    // A chain segment covers only its own stretch, with a small overlap.
    float x = mix(uX0 > 0.0 ? -0.03 * uSeg : -1.6 * uAstRad, uSeg > 0.0 ? uSeg : uLen, position.y + 0.5);
    float r = 1.56 * (1.05 * uAstRad + uK * max(x + uX0, 0.0));
    vP = uAstP + uDrift + uAway * x + (uSide * position.x + uUpv * position.z) * r;
    gl_Position = projectionMatrix * viewMatrix * vec4(vP, 1.0);
  }`,
  fragmentShader: /* glsl */`precision highp sampler3D;
// The noise has no mipmaps: level 0 always.
// An explicit level needs no derivatives, so samples after a discard or in a branch stay stable on Direct3D.
#define texture(s, p) textureLod(s, p, 0.0)
  varying vec3 vP;
  uniform sampler3D uVol;
  uniform vec3 uAstP, uAway, uSide, uUpv, uHot, uFireC, uEmberC, uSoot, uAsh;
  uniform float uAstRad, uLen, uK, uBurn, uTrail, uSolid, uTime, uFlow, uBreak, uCut, uX0, uSeg, uEatK, uJoin;
  uniform vec3 uDrift, uSwipe;
  // uLift: a fade floor in metres along, and its weight.
  // A landed hulk's streak fades from the ground up.
  uniform vec2 uLift;
  uniform int uSteps, uLSteps;
  ${HEAD}
  ${AIR}
  float c01(float x) { return clamp(x, 0.0, 1.0); }
  float rmp(float x, float a, float b) { return c01((x - a) / (b - a)); }
  // gFine: the share of fine lobes the march step can sample, 0 to 1.
  float gFine = 1.0;
  // The smoke's density at q, a point measured from the rock.
  // g: metres along, radii along, local radius, radial place.
  float trail(vec3 q, bool fine, out vec4 g, out float e) {
    float r0 = 1.05 * uAstRad;
    // x counts metres down the whole trail, past earlier segments.
    float x = dot(q, uAway) + uX0;
    float rr = r0 + uK * max(x, 0.0);
    float u = x > 0.0 ? log(1.0 + uK * x / r0) / uK : x / r0;
    vec2 v = vec2(dot(q, uSide), dot(q, uUpv)) / rr;
    // Wind shear bends the old smoke off its line.
    // A little curl, and a steady lean downwind as the smoke ages.
    v -= smoothstep(1.0, 9.0, u) * 0.45 * vec2(0.26 * sin(u * 0.83 + 1.3) + 0.16 * sin(u * 0.31), 0.22 * sin(u * 0.61 + 4.0) + 0.14 * cos(u * 0.27 + 2.0));
    v -= smoothstep(1.0, 20.0, u) * vec2(0.35, -0.08);
    // The blast shoves the young smoke sideways; the old smoke barely moves.
    v -= uSwipe.xy * uSwipe.z * exp(-max(u, 0.0) / 5.0);
    float rv = length(v);
    g = vec4(x, u, rr, rv); e = 0.0;
    if (rv > 1.0 || u < -0.7) return 0.0;
    // Coverage: a full core, a ragged rim, thinner with age.
    float cov = (1.0 - smoothstep(0.3, 1.0, rv)) * mix(1.0, 0.62, smoothstep(2.0, 16.0, u)) * smoothstep(-0.6, 0.8, u) * mix(1.0 - smoothstep(0.55, 1.0, x / uLen), 1.0, uJoin);
    // After the hit: the tail goes from its tip back, the head end softens.
    cov *= 1.0 - smoothstep(uCut - 0.25 * uLen, uCut, x);
    cov *= mix(1.0, smoothstep(uLift.x, uLift.x + 0.25 * uLen, x), uLift.y);
    // The tail's end dissolves into the impact cloud.
    if (uEat.w > 0.0 && uEatK > 0.0) cov *= mix(1.0, smoothstep(0.2, 1.35, length(uAstP + q - uEat.xyz) / uEat.w), uEatK);
    cov *= mix(1.0, smoothstep(-0.5, 4.0, u), min(uBreak * 20.0, 1.0));
    // Smoke that sinks far out goes over the horizon into the haze.
    cov *= hzFade(uAstP + q);
    if (cov < 0.002) return 0.0;
    // A skew along u hides the tile repeat.
    vec3 p = vec3(u - uFlow, v.x + 0.37 * u, v.y + 0.19 * u) * 0.36;
    float d = c01(rmp(texture(uVol, p).r, 1.0 - cov, 1.0) * 3.0);
    if (uBreak > 0.0) d = c01(rmp(d, uBreak * 0.85, 1.0));
    if (fine && d > 0.0) {
      // Fine cells carve the rim into small lobes.
      e = texture(uVol, p * 3.1 + vec3(uTime * 0.017, 0.0, 0.0)).g;
      // Old smoke frays into wisps toward the tail's end.
      // Lobes finer than the step alias into a comb; they fade out.
      d = rmp(d, (1.0 - e) * mix(0.55, 0.85, smoothstep(0.35, 1.0, x / uLen)) * gFine, 1.0);
    }
    return d;
  }
  float hg(float c, float k) { return (1.0 - k * k) / pow(1.0 + k * k - 2.0 * k * c, 1.5); }
  void main() {
    vec3 rd = normalize(vP - cameraPosition), qo = cameraPosition - uAstP - uDrift;
    float R = uAstRad;
    // The ray meets the padded cone at the roots of a quadratic.
    float xo = dot(qo, uAway), da = dot(rd, uAway);
    float kp = 1.5 * uK, m = 1.78 * R + kp * (xo + uX0), n = kp * da;
    float A = 1.0 - da * da - n * n, B = dot(qo, rd) - xo * da - m * n, C = dot(qo, qo) - xo * xo - m * m;
    if (abs(A) < 1e-5) A = 1e-5;
    float disc = B * B - A * C;
    if (disc <= 0.0) discard;
    float sq = sqrt(disc);
    float t0 = (-B - sq) / A, t1 = A > 0.0 ? (-B + sq) / A : 1e9;
    // A negative radius marks the mirror cone.
    if (m + n * t0 < 0.0) discard;
    // The cone ends in front of the rock and at its far tip.
    float xa = uX0 > 0.0 ? -0.03 * uSeg : -1.6 * R, xb = uSeg > 0.0 ? uSeg : uLen;
    if (abs(da) > 1e-5) {
      float s0 = (xa - xo) / da, s1 = (xb - xo) / da;
      t0 = max(t0, min(s0, s1)); t1 = min(t1, max(s0, s1));
    } else if (xo < xa || xo > xb) discard;
    t0 = max(t0, 0.0);
    // The rock stops the ray.
    float bs = dot(qo, rd), ds = bs * bs - dot(qo, qo) + uSolid * uSolid * R * R;
    if (uSolid > 0.05 && ds > 0.0) t1 = min(t1, -bs - sqrt(ds));
    if (t1 <= t0) discard;
    float dt = (t1 - t0) / float(uSteps);
    // Each pixel starts its march at its own offset.
    // The offset turns each frame, so the step pattern reads as grain.
    float t = t0 + dt * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))) + 0.618034 * floor(uTime * 30.0));
    float cs = dot(rd, uSun);
    float ph = 0.5 * hg(cs, 0.6) + 0.5 * hg(cs, -0.2);
    float T = 1.0, wsum = 0.0, tsum = 0.0;
    vec3 col = vec3(0.0);
    for (int i = 0; i < 96; i++) {
      if (i >= uSteps || T < 0.02) break;
      vec3 q = qo + rd * t;
      // The step against the local smoke radius sets the fine detail.
      float rrq = 1.05 * R + uK * max(dot(q, uAway) + uX0, 0.0);
      gFine = c01(2.2 - dt / (0.035 * rrq));
      vec4 g; float e;
      float d = trail(q, true, g, e);
      float x = g.x, rr = g.z;
      // Chain pieces overlap at each joint.
      // Their ends cross-fade there, so a joint shows no dark band.
      if (uSeg > 0.0) {
        float xl = x - uX0;
        d *= (uX0 > 0.0 ? smoothstep(-0.03 * uSeg, 0.03 * uSeg, xl) : 1.0) * (1.0 - smoothstep(0.94 * uSeg, uSeg, xl));
      }
      // A plasma sheath wraps the whole rock, its lumps included.
      float rq = length(q);
      if (uX0 == 0.0 && rq < 2.6 * R) {
        float sh = exp(-max(rq - 1.1 * R, 0.0) / (0.25 * R)) * smoothstep(0.5, -0.6, x / R) * uBurn;
        col += T * (uHot * 5.0 * sh * sh + uFireC * 3.0 * sh) * (dt / R) * 0.45;
      }
      if (d > 0.0) {
        // Old smoke is thinner than young smoke.
        float kap = 11.0 * mix(1.0, 0.38, smoothstep(3.0, 22.0, g.y)) * uTrail;
        // A short march toward the sun finds the shadow.
        float tl = 0.0, ls = 0.13 * rr;
        vec3 ql = q;
        for (int j = 0; j < 6; j++) {
          if (j >= uLSteps) break;
          ql += uSun * ls;
          vec4 g2; float e2;
          tl += trail(ql, false, g2, e2) * kap / g2.z * ls;
          ls *= 1.8;
        }
        // The second term stands in for light that scatters many times.
        vec3 Ls = sunAt(uAstP.y + q.y) * (exp(-tl) * 0.8 + exp(-tl * 0.18) * 0.2) * ph * 1.25;
        float hgt = c01(0.5 + 0.5 * (q.y - uAway.y * x) / rr);
        vec3 La = mix(uHorC, uZenC, hgt) * 0.3 * (1.0 - 0.6 * d);
        // The fireball lights the smoke near it.
        vec3 Lf = uAstC * uBurn * 6.0 * R * R / (dot(q, q) + R * R);
        // The blast lights the smoke for many radii.
        // Thick smoke swallows the blast light; thin edges and creases catch it.
        float bsh = 0.35 + 0.65 * exp(-2.0 * d);
        Lf += uAstC * uHit.w * 60.0 * R * R / (dot(q, q) + 9.0 * R * R) * bsh;
        // The afterglow reaches far up the tail.
        // The tail takes the light all at once; a sweep up it reads as a crawl.
        float tb = uStarT - uHitP.w;
        if (tb > 0.0 && tb < 18.0) {
          float gl = uBk * (1.6 * exp(-tb / 0.6) + 0.8 * exp(-tb / 5.0)) * (1.0 - smoothstep(9.0, 18.0, tb)) * bsh;
          vec3 qh = uAstP + q - uHitP.xyz;
          // The tail takes the fire far down its length.
          Lf += uAstC * gl * (20.0 * R * R / (dot(qh, qh) + 9.0 * R * R) + 2.5 * 3000.0 * R * R / (dot(qh, qh) + 3000.0 * R * R));
        }
        // Debris trains far from their own head still see the blast.
        Lf += blastLight(uAstP + q) * 2.0 * (1.0 - step(590.0, uAstRad));
        vec3 S = mix(uSoot, uAsh, smoothstep(0.3, 8.0, g.y)) * (Ls + La + Lf);
        // Burning air and rock vapour fill the wake for many radii.
        // The core runs hottest; the rim and the far wake cool to red.
        float wake = exp(-max(x, 0.0) / (11.0 * R)) * (1.0 - smoothstep(0.2, 1.0, g.w));
        float heat = c01((0.35 + 0.65 * d) * wake * uBurn * (0.55 + 0.9 * e) * 1.3);
        vec3 fire = mix(uEmberC * 2.5, uFireC * 6.0, smoothstep(0.1, 0.45, heat));
        fire = mix(fire, uHot * 10.0, smoothstep(0.55, 0.95, heat));
        S += fire * smoothstep(0.03, 0.3, heat);
        float a = 1.0 - exp(-d * kap / rr * dt);
        col += T * S * a;
        wsum += T * a; tsum += T * a * t;
        T *= 1.0 - a;
      }
      t += dt;
    }
    float al = 1.0 - T;
    if (al < 0.002 && max(col.r, col.b) < 0.002) discard;
    // The air acts once, at the smoke's mean depth.
    vec3 Pm = cameraPosition + rd * (wsum > 0.0 ? tsum / wsum : 0.5 * (t0 + t1));
    // The shared air, as on the ranges and the clouds; the plain's low dust on top.
    vec3 Ta = aerialT(Pm) * (1.0 - 0.45 * k2hazeAmount(Pm));
    col = col * Ta + aerialIn(rd) * (1.0 - Ta) * al;
    // Smoke behind the soot ball hides in it.
    float sT = sootT(Pm);
    gl_FragColor = vec4(col * sT, al * sT);
  }`,
  }));
}
export const smoke = makeTrain(PU);
// Mini trains: smaller, darker copies of the comet trail for debris.
export const SOOT_D = linFit(0.15, 0.015, 50), ASH_D = linFit(0.5, 0.01, 70);
export function makeMini() {
  const pu = {
    uAstP: { value: new THREE.Vector3() }, uAstRad: { value: 100 }, uAway: { value: new THREE.Vector3(0, 1, 0) }, uSide: { value: new THREE.Vector3(1, 0, 0) }, uUpv: { value: new THREE.Vector3(0, 0, 1) },
    uBurn: { value: 0.6 }, uVol: PU.uVol, uLen: { value: 4000 }, uK: { value: 0.11 }, uTrail: { value: 0 }, uSolid: { value: 0 }, uFlow: { value: 0 },
    uSteps: { value: 24 }, uLSteps: { value: 2 }, uBreak: { value: 0 }, uEatK: { value: 0 }, uJoin: { value: 0 }, uCut: { value: 1e9 }, uDrift: { value: new THREE.Vector3() }, uX0: { value: 0 }, uSeg: { value: 0 }, uSwipe: { value: new THREE.Vector3() },
    uHot: PU.uHot, uFireC: PU.uFireC, uEmberC: PU.uEmberC, uSoot: { value: new THREE.Vector3(...linFit(0.34, 0.014, 50)) }, uAsh: { value: new THREE.Vector3(...ASH_D) },
  };
  const m = makeTrain(pu);
  // Debris trains draw after the main trail: they fly nearer the eye.
  m.frustumCulled = false; m.renderOrder = BAND.debris; m.visible = false;
  scene.add(m);
  return { m, pu };
}
// Point a mini train: head at pos, streaming along away.
export type Mini = ReturnType<typeof makeMini>;
export function aimMini(t: Mini, pos: THREE.Vector3, away: THREE.Vector3, R: number, len: number, on: number, burn: number) {
  const u = t.pu;
  u.uAstP.value.copy(pos); u.uAway.value.copy(away).normalize();
  u.uSide.value.set(0, 1, 0).cross(u.uAway.value).negate().normalize(); u.uUpv.value.crossVectors(u.uSide.value, u.uAway.value);
  u.uAstRad.value = R; u.uLen.value = len; u.uTrail.value = on; u.uBurn.value = burn; u.uFlow.value = state.simT * 0.5;
  u.uSteps.value = state.rung >= 2 ? 14 : 24;
  t.m.visible = on > 0.01;
}
smoke.frustumCulled = false;
smoke.renderOrder = BAND.smoke;
scene.add(smoke);
