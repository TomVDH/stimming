// Load order: clouds/bands runs first.
import '../clouds/bands.ts';
import * as THREE from 'three';
import { scene } from '../setup.ts';
import { U } from '../world/uniforms.ts';
import { HEAD } from './atmosphere.ts';
import { AIR } from './air.ts';
import { IMP_GLSL, IMP_U } from './impacts.ts';
import { SHAFT_GLSL, SHAFT_U } from '../clouds/shafts.ts';
import { BAND } from '../clouds/bands.ts';

/* ---------- sky dome ---------- */
export const sky = new THREE.Mesh(new THREE.SphereGeometry(150000, 48, 24), new THREE.ShaderMaterial({
  uniforms: { ...U, ...IMP_U, ...SHAFT_U, uVol: { value: null }, uCloudC: { value: 0 } }, side: THREE.BackSide, depthWrite: false,
  vertexShader: /* glsl */`varying vec3 vP; void main() { vP = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vP, 1.0); }`,
  fragmentShader: /* glsl */`#define CSHADE
  precision highp sampler3D;
  varying vec3 vP; ${HEAD} ${AIR} ${IMP_GLSL} ${SHAFT_GLSL}
  uniform sampler3D uVol;
  uniform float uCloudC, uDeck;
  // A thin deck of wisps five kilometres up, seen from below.
  // The wisps shrink toward the horizon, so the eye reads the depth.
  vec3 deck(vec3 d, vec3 col) {
    if (uDeck < 0.01 || d.y < 0.003) return col;
    float t = 5200.0 / d.y;
    // The deck's point in the world, for the blast, the bolt and the rock.
    vec3 Pc = cameraPosition + d * t;
    float rim; vec3 push;
    vec3 hl = cloudHit(Pc, 0.6, rim, push);
    // The heave nudges the cells outward; the void clears a ring.
    // The deck takes a third of the cirrus's push, so its cells keep their shape.
    float pack, hole;
    vec2 xz = mix(Pc.xz, voidWarp(Pc.xz - 0.35 * push.xz, pack, hole), 0.4) + vec2(uCloudC * 4.0, uCloudC * 1.5);
    // The wind combs the deck into wisps: the noise stretches along it.
    vec2 w = vec2(0.966, -0.259);
    vec2 q = vec2(dot(xz, w), dot(xz, vec2(-w.y, w.x)) * 3.0);
    // Patches of wisps with wide open sky between them.
    float cov = texture(uVol, vec3(q / 60000.0, 0.31)).r;
    float cel = texture(uVol, vec3(q / 9000.0, 0.63)).g;
    float fin = texture(uVol, vec3(q / 2300.0, 0.17)).g;
    // Far cells blur into their mean before they alias.
    float fd = smoothstep(25000.0, 110000.0, t);
    // Fine detail frays the edges into strands.
    float raw = mix(cel * 0.8 + fin * 0.2, 0.52, fd);
    // A wide ramp feathers each cell's edge into the sky.
    float dens = smoothstep(0.5, 1.0, raw + (cov - 0.62) * 1.2);
    // The deck thins out low down: the ranges stay clear.
    dens *= smoothstep(0.02, 0.12, d.y);
    // The heave clears the air it pushes; packed cells thicken round the hole.
    dens *= 1.0 - 0.4 * smoothstep(800.0, 5000.0, length(push));
    dens = min(dens * mix(1.0, pack, 0.5), 1.0) * (1.0 - hole) * (1.0 - 0.55 * smoothstep(4.0, 30.0, uVoidT) * smoothstep(1.0, 1.4, pack));
    if (dens < 0.003) return col;
    // The side of a cell toward the sun goes darker.
    // A soft, wide shade keeps the cells round, not flat discs.
    vec2 s2 = xz + uSunD.xz * 1100.0;
    float cel2 = texture(uVol, vec3(vec2(dot(s2, w), dot(s2, vec2(-w.y, w.x)) * 3.0) / 9000.0, 0.63)).g;
    float self = 1.0 - 0.35 * smoothstep(-0.1, 0.3, cel2 - cel);
    float body = smoothstep(0.0, 1.0, dens);
    // A low sun lights the cells from below; thin edges pass the most light.
    float cs = dot(d, uSunD);
    float ph = 0.6 + 1.6 * pow(max(cs, 0.0), 6.0);
    float low = 1.0 - smoothstep(0.05, 0.35, uSunD.y);
    vec3 amb = mix(uHorC, uZenC, 0.5) * 0.9 + uCloudAmb * 0.6;
    // The trail and the soot ball shade the cells.
    float shd = shadeAt(Pc);
    vec3 c = amb * (0.62 + 0.18 * (1.0 - body)) + uCloudSun * (0.26 + 0.38 * (1.0 - body)) * ph * self * mix(1.0, 1.6, low) * (1.0 - 0.75 * shd);
    // At night the deck takes the moon dimly.
    c *= mix(1.0, 0.45, uStars);
    // The passing bolt lights the cells round it, blue-white.
    if (uBolt.w > 0.001) { vec3 bd = Pc - uBolt.xyz; c += cloudBoltC() * uBolt.w * 0.45 / (1.0 + dot(bd, bd) / 2.0e7); }
    // The burning rock warms the cells near it, the thin ones most.
    if (uRockL.w > 0.001) { vec3 rb = uRockL.xyz - Pc; c += uAstC * uRockL.w * uRockR * uRockR / (dot(rb, rb) + uRockR * uRockR) * (0.6 + 0.4 * (1.0 - dens)) * mix(1.0, 0.6, uStars); }
    // The blast: its flash, its afterglow and the shock rim.
    // The shared air fills the far deck, as it fills the ranges.
    c = aerial(c, Pc);
    // The blast lands after the haze: its flash lights the air on the way.
    // The deck takes it harder than the cirrus, thin edges most.
    c += hl * (1.6 + 0.8 * (1.0 - body)) + rim * (uCloudSun * 0.3 + uCloudAmb * 1.2 + hl * 1.2 + 0.02);
    // A thin veil: the sky shows through even the densest wisp.
    return mix(col, c, min(1.0, dens * (0.45 + 0.35 * rim) * min(uDeck, 1.5)));
  }
  void main() { vec3 d = normalize(vP - cameraPosition); gl_FragColor = vec4(shaftSky(deck(d, k2sky(d)), d, uShaft.z) + impSky(d), 1.0); }`,
}));
sky.renderOrder = BAND.sky;
scene.add(sky);
