// Solar loop renderer: raw WebGL2, graded like film.
// Two light channels: red holds hot plasma, green holds cool plasma.
// Passes: the disk and corona, the strands (additive, optically thin), bloom, light rays, the final.
// The final pass bends the air at the limb, grades through the band's ramps and adds the lens.
import { TRI_VS, program, linked, target, free, bind, tri, to, uniforms } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { R, BCRIT, STRIDE, MAX_STRANDS, NR, MAX_FLARES, STARS } from './sun.js';
import { fluidPrograms, makeFluid } from './fluid.js';
import { FLARE } from '../shared/flare.js';

const HEAD = `#version 300 es
precision highp float;
`;
// Samples along each strand.
const NS = 56;
// Steps in the light ray march.
const RAY_N = 40;

/* ---------- colour ramps: two per star, hot then cool ---------- */
// Each stop is an sRGB colour and its place on the tone axis.
const LUTS = [
  // Sun: warm black, ember, amber, gold, white.
  [['000000', 0], ['0c0503', 0.08], ['2e1004', 0.22], ['7a2f06', 0.4], ['cf6a0c', 0.58], ['ffa22c', 0.74], ['ffd47a', 0.87], ['fff3d6', 0.96], ['ffffff', 1]],
  [['000000', 0], ['140402', 0.1], ['4a0e03', 0.28], ['a8300a', 0.48], ['f2661a', 0.66], ['ffa04a', 0.8], ['ffd9a8', 0.92], ['fff8f0', 1]],
  // Proxima: deep orange to a peach white; crimson prominences.
  [['000000', 0], ['120302', 0.1], ['3d0a03', 0.26], ['8a2205', 0.44], ['d64a0e', 0.62], ['ff8030', 0.78], ['ffc28a', 0.9], ['fff0e0', 1]],
  [['000000', 0], ['160104', 0.1], ['4c0410', 0.3], ['a00c1c', 0.5], ['e8302a', 0.68], ['ff7a62', 0.82], ['ffc8bc', 0.93], ['fff2ee', 1]],
  // Rigel: cold blue steel to white; lilac prominences.
  [['000000', 0], ['02060d', 0.1], ['0a1a33', 0.26], ['1f4a80', 0.44], ['5a8fd0', 0.62], ['a8ccf5', 0.78], ['e2f0ff', 0.9], ['ffffff', 1]],
  [['000000', 0], ['0a0710', 0.12], ['2a1f3d', 0.3], ['5e4e86', 0.5], ['9e93c8', 0.68], ['d8d2f0', 0.84], ['fbfaff', 1]],
  // Betelgeuse: rust, orange, a dusty peach.
  [['000000', 0], ['100302', 0.1], ['360b04', 0.26], ['7a1e06', 0.44], ['c2430c', 0.62], ['f07a2a', 0.78], ['ffbc7a', 0.9], ['fff0dc', 1]],
  [['000000', 0], ['120203', 0.1], ['3e0608', 0.3], ['8a1410', 0.5], ['d0401e', 0.68], ['f88a5a', 0.84], ['fff0e4', 1]],
  // VY Canis Majoris: blood red with brown shadows.
  [['000000', 0], ['0c0201', 0.1], ['2a0603', 0.28], ['5e1006', 0.46], ['a0240c', 0.64], ['d8501c', 0.8], ['ffa070', 0.92], ['ffe6d6', 1]],
  [['000000', 0], ['0e0304', 0.12], ['300a0c', 0.3], ['6a1a18', 0.5], ['a8402c', 0.68], ['e08050', 0.84], ['fff0e0', 1]],
  // Neutron star: electric blue to white; violet for cool light.
  [['000000', 0], ['03030c', 0.1], ['0e0f36', 0.26], ['2a2f8a', 0.44], ['5a6ff0', 0.62], ['a6b8ff', 0.78], ['e6ecff', 0.9], ['ffffff', 1]],
  [['000000', 0], ['0d0412', 0.12], ['32104a', 0.3], ['6a2a9a', 0.5], ['b070e0', 0.68], ['e8c8ff', 0.84], ['ffffff', 1]],
  // Sirius B: a white dwarf, cyan white.
  [['000000', 0], ['04080a', 0.1], ['10262c', 0.26], ['2f6470', 0.44], ['70b0bc', 0.62], ['b8e2ea', 0.78], ['ecfbff', 0.9], ['ffffff', 1]],
  [['000000', 0], ['08060e', 0.12], ['221c36', 0.3], ['4e4672', 0.5], ['9088b8', 0.68], ['d4d0ec', 0.84], ['ffffff', 1]],
  // Sirius: blue white, pale rose prominences.
  [['000000', 0], ['05070c', 0.1], ['141c30', 0.26], ['3a5078', 0.44], ['7e98c4', 0.62], ['c2d2f0', 0.78], ['f0f5ff', 0.9], ['ffffff', 1]],
  [['000000', 0], ['0e0608', 0.12], ['3a1a22', 0.3], ['7a4250', 0.5], ['c08a96', 0.68], ['ecd2d8', 0.84], ['ffffff', 1]],
  // Zeta Ophiuchi: violet blue to white; deep violet prominences.
  [['000000', 0], ['04030e', 0.1], ['10123c', 0.26], ['2c3696', 0.44], ['5c6ee6', 0.62], ['a4b2ff', 0.78], ['e4e8ff', 0.9], ['ffffff', 1]],
  [['000000', 0], ['0a0414', 0.12], ['281046', 0.3], ['563090', 0.5], ['9a74d4', 0.68], ['dccaf8', 0.84], ['ffffff', 1]],
  // Regulus: blue white; cool lilac.
  [['000000', 0], ['03070d', 0.1], ['0e2036', 0.26], ['2a5888', 0.44], ['6a9ed6', 0.62], ['b4d4f6', 0.78], ['eaf4ff', 0.9], ['ffffff', 1]],
  [['000000', 0], ['0a0810', 0.12], ['2c223c', 0.3], ['625482', 0.5], ['a698c8', 0.68], ['ded8f0', 0.84], ['ffffff', 1]],
  // Vega: near pure white, a breath of blue; pale blue prominences.
  [['000000', 0], ['06070a', 0.1], ['181c26', 0.26], ['46526a', 0.44], ['8e9cb8', 0.62], ['ccd6ea', 0.78], ['f4f7ff', 0.9], ['ffffff', 1]],
  [['000000', 0], ['06080e', 0.12], ['1c2438', 0.3], ['485a80', 0.5], ['8ea2c8', 0.68], ['d2dcf0', 0.84], ['ffffff', 1]],
  // Procyon: cream to white; salmon prominences.
  [['000000', 0], ['0a0805', 0.08], ['2a2010', 0.22], ['6e5426', 0.4], ['bc9a52', 0.58], ['ead08c', 0.74], ['fbeec6', 0.87], ['fffaee', 0.96], ['ffffff', 1]],
  [['000000', 0], ['120604', 0.1], ['40160c', 0.28], ['8c3e22', 0.48], ['d8784c', 0.66], ['f6ae88', 0.8], ['ffe0d0', 0.92], ['fff8f4', 1]],
  // Epsilon Eridani: deep orange; red orange prominences.
  [['000000', 0], ['0e0402', 0.1], ['361004', 0.24], ['80280a', 0.42], ['d05412', 0.6], ['fa8a36', 0.76], ['ffc68e', 0.89], ['fff2e4', 1]],
  [['000000', 0], ['140302', 0.1], ['460a04', 0.28], ['9c2408', 0.48], ['e8521c', 0.66], ['ff9058', 0.8], ['ffd0b4', 0.92], ['fff4ee', 1]],
  // Luhman 16: magenta brown, dim; deep wine.
  [['000000', 0], ['080204', 0.12], ['22080e', 0.3], ['4e1620', 0.48], ['82303a', 0.64], ['b45a5a', 0.78], ['e09a8e', 0.9], ['f8dcd2', 1]],
  [['000000', 0], ['0a0206', 0.12], ['260614', 0.3], ['54102a', 0.5], ['8a2a48', 0.68], ['c46a7e', 0.84], ['f4d0d8', 1]],
  // WISE 0855: dark maroon and slate; ice grey highlights.
  [['000000', 0], ['050304', 0.14], ['160c0e', 0.32], ['30191c', 0.5], ['54343a', 0.66], ['86686e', 0.8], ['c0b0b4', 0.92], ['ece6e8', 1]],
  [['000000', 0], ['040406', 0.14], ['121218', 0.32], ['2a2a36', 0.52], ['525466', 0.7], ['9496a8', 0.86], ['e2e4ec', 1]],
  // T Tauri: amber in dust; red prominences.
  [['000000', 0], ['0c0502', 0.08], ['2e1206', 0.22], ['72300c', 0.4], ['c46218', 0.58], ['f6982e', 0.74], ['ffcc80', 0.87], ['fff0d8', 0.96], ['ffffff', 1]],
  [['000000', 0], ['140302', 0.1], ['480c06', 0.28], ['a02810', 0.48], ['ec5a24', 0.66], ['ff9a62', 0.8], ['ffd6c0', 0.92], ['fff6f0', 1]],
  // Arcturus: orange giant; rose prominences.
  [['000000', 0], ['0e0502', 0.1], ['341406', 0.26], ['7a320e', 0.44], ['c66222', 0.62], ['f49a4a', 0.78], ['ffcc94', 0.9], ['fff2e2', 1]],
  [['000000', 0], ['120406', 0.1], ['3e0e16', 0.3], ['862a34', 0.5], ['cc5e60', 0.68], ['f4a09a', 0.84], ['fff0ee', 1]],
  // Sagittarius A*: ember to amber gold; the approaching side burns cream white.
  [['000000', 0], ['0e0402', 0.1], ['3a1204', 0.26], ['8a3206', 0.44], ['d66a10', 0.62], ['ffa834', 0.78], ['ffd88a', 0.9], ['fff6e6', 1]],
  [['000000', 0], ['0a0806', 0.12], ['2e2618', 0.3], ['70644a', 0.5], ['c0b08a', 0.68], ['f0e6cc', 0.84], ['ffffff', 1]],
  // Cygnus X-1: X-ray hot, lilac steel; the approaching side ice blue.
  [['000000', 0], ['06050c', 0.1], ['1a1836', 0.26], ['40467e', 0.44], ['7a88c8', 0.62], ['b8c4f2', 0.78], ['e8eeff', 0.9], ['ffffff', 1]],
  [['000000', 0], ['04080e', 0.12], ['10263c', 0.3], ['2c6a96', 0.5], ['70b4e0', 0.68], ['c4e8ff', 0.84], ['ffffff', 1]],
  // 3C 273: ember to amber white for the dust, the torus rim and the outer disc;
  // the hot inner disc, the clouds, the winds and the jet take the violet-white ramp.
  [['000000', 0], ['0c0402', 0.1], ['341006', 0.26], ['7a2e0e', 0.44], ['c8682a', 0.62], ['f4b070', 0.78], ['ffe6c4', 0.9], ['ffffff', 1]],
  [['000000', 0], ['08060e', 0.12], ['221a40', 0.3], ['56489a', 0.5], ['9c90dc', 0.68], ['dcd6fa', 0.84], ['ffffff', 1]],
  // WR 124: violet blue to white in its wind; the nebula glows hydrogen pink.
  [['000000', 0], ['05060e', 0.1], ['161c40', 0.26], ['3a4c9a', 0.44], ['7a8ee0', 0.6], ['bcc8ff', 0.74], ['eef1ff', 0.86], ['ffffff', 1]],
  [['000000', 0], ['0e0308', 0.12], ['3a0a22', 0.3], ['821e48', 0.5], ['d0507a', 0.68], ['f6a8c0', 0.84], ['fff0f4', 1]],
  // The Thorne-Zytkow object: deep crimson to a peach white where the core shows.
  [['000000', 0], ['0e0302', 0.1], ['300a04', 0.27], ['6c1a08', 0.45], ['b23a10', 0.62], ['e8702a', 0.78], ['ffb884', 0.9], ['fff2e6', 1]],
  [['000000', 0], ['120204', 0.1], ['3c0810', 0.3], ['801620', 0.5], ['c8402c', 0.68], ['f4906a', 0.84], ['fff0e6', 1]],
  // Fomalhaut: an A star, white with a breath of blue; its dust belt a warm grey glow.
  [['000000', 0], ['05070b', 0.1], ['161c28', 0.26], ['424e66', 0.44], ['8896b4', 0.62], ['c8d2e8', 0.78], ['f2f5ff', 0.9], ['ffffff', 1]],
  [['000000', 0], ['0a0806', 0.12], ['2a2420', 0.3], ['6a5e54', 0.5], ['b0a294', 0.68], ['e4dcd2', 0.84], ['fffaf4', 1]],
  // Beta Lyrae: a blue-white giant; the disc, the stream and the jets glow warm white.
  [['000000', 0], ['03070d', 0.1], ['0e2036', 0.26], ['2a5888', 0.44], ['6a9ed6', 0.62], ['b4d4f6', 0.78], ['eaf4ff', 0.9], ['ffffff', 1]],
  [['000000', 0], ['0c0806', 0.12], ['32241a', 0.3], ['7a5a40', 0.5], ['caa07a', 0.68], ['f2dcc0', 0.84], ['fffaf2', 1]],
  // Stephenson 2-18: oxblood, the coolest here; its brightest light stays a dull orange.
  [['000000', 0], ['0a0101', 0.1], ['220403', 0.28], ['4e0c05', 0.46], ['86180a', 0.64], ['c23a14', 0.8], ['f07a42', 0.92], ['ffcaa8', 1]],
  [['000000', 0], ['0c0203', 0.12], ['2a0709', 0.3], ['5a1412', 0.5], ['943222', 0.68], ['d0683e', 0.84], ['f8d8c4', 1]],
  // WOH G64: a dust-veiled glow, rust to amber gold; the torus burnt orange.
  [['000000', 0], ['0e0402', 0.1], ['341004', 0.26], ['782a06', 0.44], ['c45a12', 0.62], ['f09a2e', 0.78], ['ffd27a', 0.9], ['fff4d8', 1]],
  [['000000', 0], ['0e0402', 0.12], ['361204', 0.3], ['74300a', 0.5], ['b85818', 0.68], ['e89048', 0.84], ['fde2c0', 1]],
  // The quasi-star: a crimson envelope, the heart burning gold to white.
  [['000000', 0], ['100202', 0.1], ['3a0804', 0.26], ['821c08', 0.44], ['cc4a12', 0.6], ['f8922e', 0.75], ['ffd890', 0.88], ['fffaf0', 1]],
  [['000000', 0], ['100204', 0.12], ['3a0a12', 0.3], ['7a1e1c', 0.5], ['c04a30', 0.68], ['f09060', 0.84], ['fff0e4', 1]],
  // WR 140: a blue-white blaze; its soot shells glow warm cream.
  [['000000', 0], ['04060e', 0.1], ['121c3c', 0.26], ['32508e', 0.44], ['7092d8', 0.6], ['b6cbff', 0.74], ['ecf1ff', 0.86], ['ffffff', 1]],
  [['000000', 0], ['0a0804', 0.12], ['2a2412', 0.3], ['6a5a32', 0.5], ['b4a068', 0.68], ['e8dcae', 0.84], ['fffbea', 1]],
  // Mothra: a gold hypergiant; its blue supergiant partner takes the cool ramp.
  [['000000', 0], ['0e0802', 0.1], ['3a2006', 0.26], ['7e4a0c', 0.44], ['c88a1e', 0.62], ['f4c450', 0.78], ['ffe8a8', 0.9], ['fffaee', 1]],
  [['000000', 0], ['02060e', 0.12], ['0c2040', 0.3], ['2a5aa0', 0.5], ['6c9ce8', 0.68], ['b8d4ff', 0.84], ['f4f8ff', 1]],
  // Powehi: the EHT's ember ring, red to orange gold; the approaching side burns pale gold.
  [['000000', 0], ['0e0301', 0.1], ['3a0c02', 0.26], ['842806', 0.44], ['d0600e', 0.62], ['f8a030', 0.78], ['ffd88a', 0.9], ['fff6e0', 1]],
  [['000000', 0], ['0c0602', 0.12], ['36200a', 0.3], ['8a5a1c', 0.5], ['dca450', 0.68], ['fde2a4', 0.84], ['fffbf0', 1]],
  // R Leporis: soot filters out the blue; a drop of blood, never white.
  [['000000', 0], ['0a0001', 0.1], ['2a0105', 0.28], ['60030a', 0.46], ['9c0810', 0.62], ['d01212', 0.76], ['ee3018', 0.88], ['ff5e3c', 1]],
  [['000000', 0], ['080102', 0.12], ['1e0405', 0.3], ['44090a', 0.5], ['761612', 0.68], ['b0321e', 0.84], ['e0603e', 1]],
];
const LUT_W = 256;
function lutPixels() {
  const px = new Uint8Array(LUT_W * LUTS.length * 4);
  LUTS.forEach((stops, row) => {
    const rgb = stops.map(([h, at]) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), at]);
    for (let i = 0; i < LUT_W; i++) {
      const x = i / (LUT_W - 1);
      let k = 1;
      while (k < rgb.length - 1 && rgb[k][3] < x) k++;
      const a = rgb[k - 1], b = rgb[k];
      let t = (x - a[3]) / Math.max(1e-6, b[3] - a[3]);
      // Smooth steps between stops: no kinks in the gradient.
      t = t * t * (3 - 2 * t);
      const o = (row * LUT_W + i) * 4;
      for (let c = 0; c < 3; c++) px[o + c] = Math.round(a[c] + (b[c] - a[c]) * t);
      px[o + 3] = 255;
    }
  });
  return px;
}

const NOISE = `
float h13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vn(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h13(i), h13(i + vec3(1, 0, 0)), f.x), mix(h13(i + vec3(0, 1, 0)), h13(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(h13(i + vec3(0, 0, 1)), h13(i + vec3(1, 0, 1)), f.x), mix(h13(i + vec3(0, 1, 1)), h13(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
// Cell edges: 0 on the lanes between cells.
float cells(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  float d1 = 9.0, d2 = 9.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(x, y, z);
    vec3 o = vec3(h13(i + g), h13(i + g + 17.3), h13(i + g + 41.9));
    float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return d2 - d1;
}
`;

/* ---------- a black hole: Event horizon's trace, seen from far away ---------- */
// Units: one Schwarzschild radius; the shadow's edge stands at R.
// Each pixel traces one ray backward, parallel to the others: a far observer.
// RK4 on x'' = -1.5 h^2 x / r^5, the bend of light near a Schwarzschild hole.
// The disc lies in y = 0 of the hole's frame, from the ISCO to ROUT.
// The quasar bakes' domains: radius from r0 to r1, height within y, d layers.
const QB = { r0: 23.4, r1: 39.8, y: 5.25, d: 32 }, QC = { r0: 8, r1: 28, y: 11, d: 48 };
const HOLE = `
const float BCRIT = ${BCRIT.toFixed(3)}, RIN = 3.0, ROUT = 20.0, REXIT = 40.0, SKYD = 40.0, TAU = 6.2831853;
// The swirl's cycle in seconds: the gas shears for one cycle, then a fresh copy fades in.
// The cycle starts later farther out, so no radius fades with all the others at once.
const float KCYC = 12.0;
// The view frame to the hole's frame: the star's turn, then the disc's tilt.
vec3 hFrame(vec3 v) {
  vec3 q = uToSun * v;
  float c = cos(uHole.y), s = sin(uHole.y);
  return vec3(q.x, c * q.y + s * q.z, -s * q.y + c * q.z);
}
vec3 vFrame(vec3 q) {
  float c = cos(uHole.y), s = sin(uHole.y);
  return transpose(uToSun) * vec3(q.x, c * q.y - s * q.z, s * q.y + c * q.z);
}
// Gas light where a ray crosses the disc: hot, cool, and the cover.
// p: the crossing. v: the ray's backward direction.
vec3 holeDisc(vec3 p, vec3 v, out float a) {
  float r = length(p.xz);
  float phi = atan(p.z, p.x);
  // Kepler: the inner gas turns faster; streaks shear and reset unseen.
  float om = sqrt(0.5 / (r * r * r));
  // One shared cycle for every radius keeps the shear bounded, so no ripples build up.
  float ca = uTime / KCYC + 1.7 * log(r), fa = fract(ca), fb = fract(ca + 0.5);
  float wa = 1.0 - abs(2.0 * fa - 1.0);
  float pa = phi - om * KCYC * fa + 2.3 * floor(ca), pb = phi - om * KCYC * fb + 2.3 * floor(ca + 0.5) + 1.7;
  float lr = log(r) * 9.0;
  // Noise round a circle has no seam where the angle wraps.
  // Fine across the radius, long along the orbit: streaks.
  float ta = fbm(vec3(cos(pa) * 2.2, sin(pa) * 2.2, lr));
  float tb = fbm(vec3(cos(pb) * 2.2, sin(pb) * 2.2, lr + 5.3));
  float tur = mix(tb, ta, wa);
  float dens = mix(0.4, 1.45, smoothstep(0.3, 0.7, tur));
  // Temperature after Novikov and Thorne, softened at the ISCO.
  float q = RIN / r;
  float f = pow(q, 0.75) * pow(max(1.0 - 0.94 * sqrt(q), 0.0), 0.25) / 0.52;
  float I = pow(f, 3.2) * dens;
  a = smoothstep(ROUT, ROUT - 5.0, r) * smoothstep(RIN - 0.35, RIN + 0.25, r) * clamp(0.5 + 0.55 * dens, 0.0, 0.97);
  // The cool outer gas is thinner, so it never reads as dark blots.
  a *= mix(0.4, 1.0, smoothstep(ROUT - 1.0, RIN + 4.0, r));
  // The gas moves on circles; gravity and Doppler shift its light.
  float beta = sqrt(0.5 / max(r - 1.0, 0.2));
  vec3 ph = vec3(-p.z, 0.0, p.x) / r;
  float g = sqrt(max(1.0 - 1.0 / r, 0.0)) * sqrt(max(1.0 - beta * beta, 0.0)) / (1.0 + beta * dot(ph, v));
  float L = I * g * g * g * g * uHole.z;
  // Hot, approaching gas takes the cool ramp: bluer and whiter.
  float blue = smoothstep(0.7, 1.6, pow(f, 1.5) * g * uHole.w);
  return vec3(L * (1.0 - blue), L * blue, 0.0);
}
// Point stars on a far plane behind the hole, in two scales that cross-fade with the zoom.
// s: the plane point; fw: one pixel's footprint there, so a lensed star spreads and keeps its flux.
vec2 holeStars(vec2 s, float fw) {
  float px = uHoleSky.x;
  float lev = log2(px * 40.0) * 0.5;
  float k0 = floor(lev), wt = fract(lev);
  float s0 = 0.7 * px, sw = max(s0, fw * 0.55), k = s0 * s0 / (sw * sw);
  vec2 acc = vec2(0.0);
  for (int l = 0; l < 2; l++) {
    float kl = k0 + float(l);
    float cell = exp2(2.0 * kl);
    float fade = l == 0 ? 1.0 - wt : wt;
    vec2 c0 = floor(s / cell - 0.5);
    for (int i = 0; i < 4; i++) {
      vec2 cc = c0 + vec2(float(i & 1), float(i >> 1));
      if (h13(vec3(cc, kl)) > 0.3) continue;
      vec2 sp = (cc + vec2(h13(vec3(cc, kl + 17.0)), h13(vec3(cc, kl + 31.0)))) * cell;
      // Most stars are faint; a few are bright.
      float br = 0.03 + 0.25 * pow(h13(vec3(cc, kl + 53.0)), 4.0) + 2.5 * pow(h13(vec3(cc, kl + 71.0)), 40.0);
      vec2 d = s - sp;
      float e = br * fade * k * exp(-dot(d, d) / (2.0 * sw * sw));
      acc += vec2(e, e * h13(vec3(cc, kl + 89.0)));
    }
  }
  return acc;
}
// A quasar's jet along the hole's spin axis: the near jet and the counter-jet.
// b2: the screen point in Schwarzschild radii. The cone opens about 5 degrees.
// Knots sit at even steps of log distance, so each zoom shows some; they travel out.
vec2 holeJet(vec2 b2) {
  vec3 a = vFrame(vec3(0.0, 1.0, 0.0));
  float l2 = max(length(a.xy), 0.05);
  vec2 ax = a.xy / l2;
  float along = dot(b2, ax), side = b2.x * ax.y - b2.y * ax.x, across = abs(side);
  // The true distance along the axis; the projection shortens it by l2.
  float d = abs(along) / l2;
  float w = 0.35 + 0.08 * d;
  float core = exp(-pow(across / (w * 0.3), 2.0)), sheath = exp(-pow(across / w, 2.0));
  float ld = log(max(d, 1e-3));
  float knots = 0.35 + 2.2 * pow(0.5 + 0.5 * sin(ld * 7.0 - uTime * 0.35), 10.0);
  // Two helical strands wind round the column, as Kelvin-Helmholtz modes twist real jets.
  // A strand on the near side of the column shines brighter, so the twist reads in depth.
  float hel = 0.0;
  for (int k = 0; k < 2; k++) {
    float ph = ld * 9.0 - uTime * 0.6 + float(k) * 3.14159;
    float off = w * 0.55 * sin(ph);
    hel += exp(-pow((side - off) / (w * 0.13), 2.0)) * (0.45 + 0.55 * max(cos(ph), 0.0));
  }
  float grain = 0.7 + 0.6 * fbm(vec3(ld * 6.0 - uTime * 0.3, across / w * 2.0, 3.0));
  // It leaves the hole a few radii out and fades slowly, so it reaches past any frame.
  float L = uJet * (1.1 * core + 0.3 * sheath + 0.9 * hel) * knots * grain * smoothstep(2.0, 6.0, d) * pow(1.0 + d / 8.0, -0.7);
  // Beaming: the jet toward the eye shines; the counter-jet keeps about a third (Tom, 2026-11-24).
  bool near = along * a.z * sign(dot(a.xy, ax)) >= 0.0;
  return near ? vec2(L, 0.0) : vec2(0.0, L * 0.35);
}
/* ---------- the cloud layer round a hole (Tom, 2026-11-24) ---------- */
// After MisterPrada's singularity: a thick, puffy volume round the disc, lit from within.
// The march follows the bent ray, so the clouds bend with the lensing.
// A quasar adds a dusty torus with a hot inner rim, broad-line clouds and winds off the disc.
// uHoleV: on, cloud density, cloud light, the quasar layer's outer bound in Schwarzschild radii.
// uHoleQ: on, torus, clouds, winds.
uniform vec4 uHoleV, uHoleQ;
uniform highp sampler3D uNoise3;
// The cloud bake: noise and its emboss in the disc's polar frame.
uniform highp sampler3D uHoleBake;
// Smooth texture noise: one texel is half a Schwarzschild radius at scale 1.
float hn(vec3 p) {
  vec3 x = p * 2.0, i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return texture(uNoise3, (i + f + 0.5) / 64.0).r;
}
float hn2(vec3 p) { return 0.65 * hn(p) + 0.35 * hn(p.zxy * 2.07 + 5.3); }
// The quasar's bakes, made once at load: the band's and the clouds' dust and self-shade.
// Each lies in its layer's own turning frame: angle, radius, height.
uniform highp sampler3D uBandBake, uBlrBake;
// The layers turn by rotating the lookup: whole turns per 9600 s clock wrap, so the wrap shows no jump.
// The band turns once in about 2.6 minutes; the clouds, inside it, once in about 73 s.
const float BAND_W = TAU * 61.0 / 9600.0, BLR_W = TAU * 131.0 / 9600.0;
// The cloud layer's reach: radii CB0 to CB1, heights to CREACH times the layer's height.
const float CB0 = 2.4, CB1 = 24.0, CREACH = 2.2;
// The layer's height: thin inside, flaring outward, as a disc does.
float holeH(float r) { return 0.3 + 0.06 * r; }
// A cloud point in the hole's frame: emission (hot, cool) per unit length, and extinction.
// v: the ray's backward direction, for the Doppler shift.
vec2 holeCloud(vec3 p, vec3 v, out float ext) {
  ext = 0.0;
  float r = length(p.xz), R3 = length(p);
  if (r < CB0 || r > CB1 || R3 < 1.05) return vec2(0.0);
  float H = holeH(r);
  float phi = atan(p.z, p.x);
  // The clouds shear at the Kepler rate and reset unseen, as the disc's streaks do.
  float om = sqrt(0.5 / (r * r * r));
  float ca = uTime / KCYC + 1.7 * log(r), fa = fract(ca), fb = fract(ca + 0.5), wa = 1.0 - abs(2.0 * fa - 1.0);
  float pa = phi - om * KCYC * fa + 2.3 * floor(ca), pb = phi - om * KCYC * fb + 2.3 * floor(ca + 0.5) + 1.7;
  float rho = log(r / CB0) / log(CB1 / CB0);
  float zeta = clamp(p.y / (CREACH * H) * 0.5 + 0.5, 0.0, 1.0);
  vec2 n = mix(texture(uHoleBake, vec3(pb / TAU, rho, zeta)).rg, texture(uHoleBake, vec3(pa / TAU, rho, zeta)).rg, wa);
  // A puffy top: the cloud's surface rises and falls with the noise.
  float top = H * (0.45 + 1.3 * n.x);
  // A soft edge: light diffuses through the cloud's skin.
  float puff = smoothstep(top, top * 0.35, abs(p.y));
  float env = smoothstep(RIN - 0.5, RIN + 1.0, r) * smoothstep(ROUT + 3.0, ROUT - 3.0, r);
  // Strata: thin sheets stacked over the height, wavering with the noise.
  float strata = 0.3 + 1.4 * pow(0.5 + 0.5 * cos(p.y / H * 4.0 + 0.8 - n.x * 3.0), 2.0);
  float d = env * puff * strata * (0.2 + 1.8 * n.x * n.x) * uHoleV.y;
  if (d < 1e-4) return vec2(0.0);
  float q = RIN / max(r, RIN);
  float f = pow(q, 0.75) * pow(max(1.0 - 0.94 * sqrt(q), 0.0), 0.25) / 0.52;
  float beta = sqrt(0.5 / max(r - 1.0, 0.5));
  vec3 ph = vec3(-p.z, 0.0, p.x) / max(r, 1e-3);
  float g = sqrt(max(1.0 - 1.0 / R3, 0.0)) * sqrt(max(1.0 - beta * beta, 0.0)) / (1.0 + beta * dot(ph, v));
  float blue = smoothstep(0.7, 1.6, pow(f, 1.5) * g * uHole.w);
  // Faces toward the hole catch more of the inner disc's light; the light scatters on through.
  float lit = clamp(0.45 + 4.5 * n.y, 0.12, 2.2);
  // Depth: cloud lying between this point and the hole shades it.
  float rho2 = log(r * 0.9 / CB0) / log(CB1 / CB0), rho3 = log(r * 0.8 / CB0) / log(CB1 / CB0);
  float n2 = texture(uHoleBake, vec3(pa / TAU, rho2, zeta)).r, n3 = texture(uHoleBake, vec3(pa / TAU, rho3, zeta)).r;
  float shade = exp(-1.6 * uHoleV.y * (smoothstep(0.35, 0.8, n2) + 0.7 * smoothstep(0.35, 0.8, n3)));
  // Tops catch the light; the interior and the gaps between strata sit darker.
  float tops = 0.5 + 0.5 * smoothstep(0.0, top, abs(p.y));
  lit *= (0.25 + 0.75 * shade) * tops * (0.6 + 0.3 * strata);
  // Translucent gas: it glows through its depth and dims what lies behind only a little.
  float lum = 1.4 * pow(f, 2.2) * lit * g * g * g * uHole.z * uHoleV.z;
  ext = d * 0.75;
  return vec2(lum * (1.0 - blue), lum * blue) * d;
}
// The clouds along one step of the ray, from ta to tb, where the step lies in the layer.
// s0: the path length at x0. Samples sit on one grid along the whole ray, 0.15 apart,
// so no seam shows where the steps meet.
void holeCloudSeg(vec3 x0, vec3 x1, vec3 v0, vec3 v1, float ta, float tb, float segL, float s0, inout float hot, inout float cool, inout float tr) {
  float ra = length(mix(x0, x1, ta).xz), rb = length(mix(x0, x1, tb).xz);
  if (max(ra, rb) < CB0 - 1.0 || min(ra, rb) > CB1 + 1.0) return;
  // The layer is tallest at the step's outer end: clip to that, so no cloud is cut.
  float hm = CREACH * holeH(max(ra, rb));
  // The height runs straight along the step: clip the step to the layer.
  float y0 = mix(x0.y, x1.y, ta), y1 = mix(x0.y, x1.y, tb), dy = y1 - y0;
  if (min(y0, y1) > hm || max(y0, y1) < -hm) return;
  float a = ta, b = tb;
  if (abs(dy) > 1e-5) {
    float ua = (-hm - y0) / dy, ub = (hm - y0) / dy;
    float lo = max(0.0, min(ua, ub)), hi = min(1.0, max(ua, ub));
    if (hi <= lo) return;
    a = mix(ta, tb, lo);
    b = mix(ta, tb, hi);
  }
  const float HS = 0.15;
  float sa = s0 + a * segL, sb = s0 + b * segL, ds = HS;
  float m = ceil(sa / HS - 0.5);
  for (int k = 0; k < 24; k++) {
    float sm = (m + float(k) + 0.5) * HS;
    if (sm >= sb) break;
    float t = (sm - s0) / segL;
    float ex;
    vec2 e = holeCloud(mix(x0, x1, t), normalize(mix(v0, v1, t)), ex);
    hot += tr * e.x * ds;
    cool += tr * e.y * ds;
    tr *= exp(-ex * ds);
    if (tr < 0.01) return;
  }
}
// A quasar's gas at a point in the hole's frame: emission (hot, cool) per unit length, and extinction.
// v: the ray's backward direction, for the Doppler shift.
vec2 holeVol(vec3 p, vec3 v, out float ext) {
  ext = 0.0;
  float r = length(p.xz), y = p.y, R3 = length(p);
  if (R3 < 1.05) return vec2(0.0);
  float phi = atan(p.z, p.x);
  // The disc's light at this radius, shifted as the disc's gas is: what lights the layer.
  float q = RIN / max(r, RIN);
  float f = pow(q, 0.75) * pow(max(1.0 - 0.94 * sqrt(q), 0.0), 0.25) / 0.52;
  float beta = sqrt(0.5 / max(r - 1.0, 0.5));
  vec3 ph = vec3(-p.z, 0.0, p.x) / max(r, 1e-3);
  float g = sqrt(max(1.0 - 1.0 / R3, 0.0)) * sqrt(max(1.0 - beta * beta, 0.0)) / (1.0 + beta * dot(ph, v));
  float blue = smoothstep(0.7, 1.6, pow(f, 1.5) * g * uHole.w);
  vec2 L = vec2(0.0);
  if (uHoleQ.x > 0.0) {
    // The dusty torus: thick, clumpy, dark; its inner rim glows hot where the disc lights it.
    // A flat band, 12 wide and 3 tall (Tom, 2026-11-24: "much less tall").
    float RT = 30.0, ar = 6.0;
    if (uHoleQ.y > 0.0 && r > ${QB.r0.toFixed(2)} && r < ${QB.r1.toFixed(2)} && abs(y) < ${QB.y.toFixed(2)}) {
      // The bake holds the Worley holes, the feather, the denser middle and the fanned fingers.
      vec2 t = texture(uBandBake, vec3((phi - uTime * BAND_W) / TAU, (r - ${QB.r0.toFixed(2)}) / ${(QB.r1 - QB.r0).toFixed(1)}, y / ${(2 * QB.y).toFixed(1)} + 0.5)).rg;
      float dd = t.x * uHoleQ.y;
      if (dd > 1e-3) {
        // The disc's light falls across the band's face; its inner edge burns.
        // The fanned streaks keep enough light to show.
        float taper = smoothstep(RT, 39.0, r);
        float lit = (0.25 + 0.3 * taper) * pow((RT - ar) / r, 2.0) + 0.75 * exp(-0.6 * max(r - (RT - ar), 0.0));
        // A billow shades its own far side: dust a step toward the hole blocks the light.
        lit *= exp(-1.2 * t.y);
        // The billows block light; the holes between them let it through.
        ext += dd * 0.7;
        L.x += dd * (0.03 + lit) * 0.6;
      }
    }
    // Broad-line clouds: a cloud layer above the disc and one below (Tom, 2026-11-24).
    // Worley billows give it structure; its edges fray into separate masses.
    if (uHoleQ.z > 0.0 && r > ${QC.r0.toFixed(2)} && r < ${QC.r1.toFixed(2)} && abs(y) > 0.5 && abs(y) < ${QC.y.toFixed(2)}) {
      vec2 t = texture(uBlrBake, vec3((phi - uTime * BLR_W) / TAU, (r - ${QC.r0.toFixed(2)}) / ${(QC.r1 - QC.r0).toFixed(1)}, y / ${(2 * QC.y).toFixed(1)} + 0.5)).rg;
      float cl = t.x * uHoleQ.z;
      if (cl > 1e-3) {
        // Cloud a step toward the hole shades this point: the near side catches the light.
        float lit = 0.12 + exp(-1.8 * t.y);
        L.y += cl * lit * 0.22 * 14.0 / R3;
        ext += cl * 0.45;
      }
    }
    // Some clumps ride among the layers (Tom, 2026-11-24: the dots back, some of them).
    // Cells 5 apart in shells, 7 along the orbit; each shell turns whole at its own Kepler rate.
    // A clump stays inside its cell, so no cell edge cuts it.
    if (uHoleQ.z > 0.0 && r > 10.5 && r < 25.5 && abs(y) < 10.0) {
      float k = floor((r - 10.5) / 5.0), rk = 13.0 + 5.0 * k;
      // Whole turns per 9600 s clock wrap, so the wrap shows no jump.
      float om = TAU / 9600.0 * floor(sqrt(0.5 / (rk * rk * rk)) * 0.5 * 9600.0 / TAU + 0.5);
      float nc = floor(TAU * rk / 7.0);
      float u = (phi - uTime * om) / TAU * nc;
      float jy = floor((y + 10.0) / 5.0), yc = -7.5 + 5.0 * jy;
      vec3 id = vec3(k, mod(floor(u), nc), jy);
      float h = h13(id + 3.1);
      // More clumps near the disc, fewer high above it.
      if (h < 0.28 * exp(-yc * yc / 80.0)) {
        float hr = h13(id + 11.7), hs = h13(id + 23.9);
        vec3 o = vec3(r - rk - 0.4 * (hr - 0.5), y - yc - 0.4 * (hs - 0.5), (fract(u) - 0.5) * TAU * rk / nc);
        // Sizes vary about 2.5 times; the orbit draws each clump out a little.
        float rad = 0.8 + 1.2 * pow(h13(id + 37.3), 1.5);
        vec3 oq = o * vec3(1.0, 1.0, 1.0 / 1.4);
        // A puffy edge, still inside the cell.
        float dq = length(oq) / rad + 0.25 * (hn(o * 0.9 + id * 7.3) - 0.5);
        float s = pow(max(1.0 - dq * dq, 0.0), 2.0);
        // The side toward the hole catches the disc's light.
        float lit = 0.35 + 0.65 * smoothstep(0.7, -0.7, dot(oq / rad, normalize(vec3(rk, yc, 0.0))));
        float cl = s * (0.4 + h13(id + 51.1)) * smoothstep(10.5, 12.5, r) * uHoleQ.z;
        L.y += cl * lit * 0.5 * 14.0 / R3;
        ext += cl * 0.25;
      }
    }
    // Winds: streaks blown off the disc's faces, rising at 30 to 60 degrees and streaming out.
    // The noise reads the direction, so no seam shows at the back.
    float el = atan(abs(y), r);
    if (uHoleQ.w > 0.0 && r > 4.0 && R3 < 40.0 && el > 0.35 && el < 1.2) {
      vec3 dn = p / R3;
      float n = hn(vec3(dn.x * 5.0, dn.z * 5.0 + sign(y) * 7.0, log(R3) * 1.6 - uTime * 0.25));
      float w = smoothstep(0.5, 0.85, n) * smoothstep(0.35, 0.6, el) * smoothstep(1.2, 0.9, el);
      w *= smoothstep(4.0, 8.0, r) * smoothstep(36.0, 14.0, R3) * 6.0 / R3 * uHoleQ.w;
      L.y += w * 0.04;
      ext += w * 0.01;
    }
  }
  return L;
}
// 1 / r^5 without pow: the trace's inner loop calls it four times a step.
float ip5(vec3 x) { float r2 = dot(x, x); return 1.0 / (r2 * r2 * sqrt(r2)); }
// hot, cool, starlight, the stars' warmth.
vec4 holeTrace(vec2 P) {
  vec2 b2 = P * BCRIT / R;
  float b = length(b2);
  vec3 v = hFrame(vec3(0.0, 0.0, -1.0));
  // Inside the exit sphere the ray starts on it; outside it passes straight by.
  vec3 x = hFrame(vec3(b2, b < REXIT ? sqrt(REXIT * REXIT - b * b) : 0.0));
  // The bend from far away up to the start: the weak-field term.
  vec3 pp = x - dot(x, v) * v;
  float a0 = (1.0 + dot(normalize(x), v)) / max(b, 1e-3);
  v = normalize(v * cos(a0) - normalize(pp + 1e-6) * sin(a0));
  float hot = 0.0, cool = 0.0, tr = 1.0, gone = 0.0;
  // The path length from the plane in front of the exit sphere: the cloud samples' grid.
  // A start on the sphere itself would lay the grid in rings round the hole.
  float sPath = b < REXIT ? REXIT - sqrt(REXIT * REXIT - b * b) : 0.0;
  // A still offset per pixel, up to one sample apart: the slices break into fine noise, not ladders.
  sPath += 0.15 * h13(vec3(gl_FragCoord.xy, 7.0));
  // Interleaved gradient noise, fixed in time: a still offset for the quasar's samples.
  float jq = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  if (b < REXIT) {
    vec3 hv = cross(x, v);
    float h2 = dot(hv, hv);
    for (int i = uZero; i < 300; i++) {
      float r = length(x);
      if (r < 1.0) { gone = 1.0; break; }
      if (r > REXIT && dot(x, v) > 0.0) break;
      // Small steps near the photon sphere; long ones far out.
      float dt = clamp(0.045 * r * r, 0.025, min(0.3 * r, 2.4));
      vec3 x0 = x, v0 = v;
      vec3 k1 = v, a1 = -1.5 * h2 * x * ip5(x);
      vec3 xb = x + 0.5 * dt * k1;
      vec3 k2 = v + 0.5 * dt * a1, a2 = -1.5 * h2 * xb * ip5(xb);
      vec3 xc = x + 0.5 * dt * k2;
      vec3 k3 = v + 0.5 * dt * a2, a3 = -1.5 * h2 * xc * ip5(xc);
      vec3 xd = x + dt * k3;
      vec3 k4 = v + dt * a3, a4 = -1.5 * h2 * xd * ip5(xd);
      x += dt / 6.0 * (k1 + 2.0 * k2 + 2.0 * k3 + k4);
      v += dt / 6.0 * (a1 + 2.0 * a2 + 2.0 * a3 + a4);
      // The cloud layer: the part of this step in front of the disc's plane comes first.
      float tc = x0.y * x.y < 0.0 ? x0.y / (x0.y - x.y) : 1.0;
      float segL = dt * length(mix(v0, v, 0.5));
      if (uHoleV.x > 0.0) {
        holeCloudSeg(x0, x, v0, v, 0.0, tc, segL, sPath, hot, cool, tr);
        // A quasar's torus, clouds and winds: four samples a step where they live.
        // A fixed per-pixel offset breaks step bands into a still, fine dither: no flicker.
        // The torus and clouds lie low; the winds rise in a cone above and below.
        vec3 xm = mix(x0, x, 0.5);
        float rm = length(xm), ym = abs(xm.y);
        if (uHoleQ.x > 0.0 && rm < uHoleV.w && rm > 4.0 && (ym < 12.0 || ym > 0.3 * length(xm.xz))) {
          // The torus band takes eight samples a step: its Worley holes are fine.
          float ns = abs(length(xm.xz) - 30.0) < 9.0 && ym < 6.0 ? 8.0 : 4.0;
          float seg = dt * length(mix(v0, v, 0.5)) / ns;
          for (int k = 0; k < 8; k++) {
            if (float(k) >= ns) break;
            float tt = (float(k) + jq) / ns;
            float ex;
            vec2 e = holeVol(mix(x0, x, tt), normalize(mix(v0, v, tt)), ex);
            hot += tr * e.x * seg;
            cool += tr * e.y * seg;
            tr *= exp(-ex * seg);
          }
        }
        if (tr < 0.01) break;
      }
      // Each crossing of the disc adds light; many crossings make the photon ring.
      if (x0.y * x.y < 0.0) {
        float t = x0.y / (x0.y - x.y);
        vec3 p = mix(x0, x, t);
        float rp = length(p.xz);
        if (rp > RIN - 0.4 && rp < ROUT) {
          float a;
          vec3 c = holeDisc(p, normalize(mix(v0, v, t)), a);
          // Within the cloud layer the plane is thinner, so the two never fight at one depth.
          if (uHoleV.x > 0.0) a *= 0.55;
          hot += tr * c.x * a;
          cool += tr * c.y * a;
          tr *= 1.0 - a;
          if (tr < 0.01) break;
        }
      }
      // The cloud layer behind the disc's plane.
      if (uHoleV.x > 0.0 && tc < 1.0) {
        holeCloudSeg(x0, x, v0, v, tc, 1.0, segL, sPath, hot, cool, tr);
        if (tr < 0.01) break;
      }
      sPath += segL;
    }
  }
  // Past the exit sphere: the weak-field rest of the bend.
  vec3 vn = normalize(v);
  float bb = length(cross(x, vn));
  float al = (1.0 - dot(normalize(x), vn)) / max(bb, 1e-3);
  vec3 perp = x - dot(x, vn) * vn;
  vec3 dir = vFrame(normalize(vn * cos(al) - normalize(perp + 1e-6) * sin(al)));
  // The far plane: the lens equation, then a stereographic map for rays bent far round.
  vec2 s = b2 + SKYD * 2.0 * dir.xy / max(1.0 - dir.z, 1e-3);
  vec2 st = holeStars(s, length(fwidth(s))) * uHoleSky.y * tr * (1.0 - gone);
  if (uJet > 0.0) {
    vec2 j = holeJet(b2);
    // The jet toward the eye stands in front; the counter-jet hides behind the hole.
    hot += j.x * 0.35 + j.y * 0.35 * tr * (1.0 - gone);
    cool += j.x + j.y * tr * (1.0 - gone);
  }
  return vec4(hot, cool, st.x, st.y / max(st.x, 1e-6));
}
`;

/* ---------- the disk and the corona ---------- */
const SKY = `${HEAD}
uniform vec4 uView;
uniform mat3 uToSun;
uniform float uTime;
uniform vec4 uDisk, uDisk2, uTex, uBeam, uGrav, uCloud, uYso;
// A cool giant's giant cells: limb heave, lobe scale, churn phase, cell light.
uniform vec4 uLump;
// A pulsing star's beat: radius swell, light swell, unused, on.
uniform vec4 uBeat;
// far: 0 on the full star, 1 at the farthest zoom; the star reads as one light.
uniform float uFar;
// off: the weight of light round the disk against the disk's own light.
uniform float uOff;
uniform float uDust;
uniform vec4 uReg[${NR}];
// Each region's bipole axis in the view frame, and its sunspot size.
uniform vec4 uSpot[${NR}];
uniform vec4 uFl[${MAX_FLARES}], uFlB[${MAX_FLARES}];
uniform vec4 uEgg[4], uDim[2];
// A Wolf-Rayet wind: its glow, its clumps, the nebula's light, the nebula's radius in R.
uniform vec4 uWind;
// The camera's turn, from the view back to the frame far things hang in.
uniform mat3 uCamM;
// A buried neutron star shown in cutaway through the disk.
uniform float uCore;
// A neutron star's true physics: on, compactness, the striped wind's light, the light cylinder in R.
// uNsU, uNsV: the spin's in-plane axes in the view frame; uNsV.w is the magnetic tilt.
uniform vec4 uNs, uNsU, uNsV;
// How hard a pulsar's flashes may flash: 1 at its true rate, near 0.2 when fast enough to flicker.
uniform float uFlashW;
// A giant ring system: opacity, centre in R (x, y), axis ratio; tilt, glow.
uniform vec4 uRing, uRing2, uRing3;
// WR 140's dust shells: their light, their spacing in R, the orbits counted.
uniform vec4 uShell;
// A partner star: its centre in R in the view, its z sign the near side; w on.
// uPair2: its radius over R, a contact neck (1) or none, the cool channel (1) or the hot.
uniform vec4 uPair, uPair2;
// Giant starspots: weight, the caps' edge latitude, the big spot's latitude and longitude.
uniform vec4 uStarspot;
// A dark disc in front, edge on: light, its centre in R, its half width and half thickness in R.
uniform vec4 uDiscE;
// A binary partner in its disc: centre in R and depth, on; disc radius, thickness, jet, light.
// uBinN: the disc's axis in the view frame.
uniform vec4 uBin, uBinD, uBinN;
// A black hole: on, the disc's tilt toward the eye, disc light, disc heat.
uniform vec4 uHole;
// One pixel in Schwarzschild radii, and the lensed stars' gain.
uniform vec2 uHoleSky;
// A quasar's jet: its light.
uniform float uJet;
// A uniform zero keeps D3D from unrolling the trace.
uniform int uZero;
in vec2 vUv;
out vec4 o;
const float R = ${R.toFixed(1)};
${NOISE}
${HOLE}
// The cells as slow lobes on the sphere, from about -0.3 to 0.3.
float lumpAt(vec3 d) {
  vec3 p = d * uLump.y + vec3(0.0, 0.0, uLump.z);
  return 0.65 * vn(p) + 0.35 * vn(p * 2.1 + vec3(5.2, 1.3, uLump.z * 0.6)) - 0.5;
}
// One band of a brown dwarf's deck: its cloud at longitude lon and warped latitude wl.
// b is the band coordinate; the band's middle sits at id + 0.5.
// The band drifts at one speed, so it never smears into streaks.
float bandTau(float id, float lon, float wl, float b) {
  float h = h13(vec3(id, 7.0, 3.0));
  // Neighbour bands run opposite ways.
  float odd = mod(id, 2.0);
  float lo = lon + uTime * 0.012 * uCloud.w * (odd * 2.0 - 1.0) * (0.5 + h);
  // One storm oval rides some bands; it twists the cloud round its eye.
  float c = h * 40.0 + uTime * 0.004 * uCloud.w;
  vec2 v = vec2(atan(sin(lo - c), cos(lo - c)), (b - id - 0.5) * 3.1416 / uCloud.y);
  float e = h > 0.45 ? length(v / vec2(0.34, 0.6 * 3.1416 / uCloud.y)) : 9.0;
  float sw = 2.6 * exp(-e * e * 1.6);
  vec2 v2 = mat2(cos(sw), sin(sw), -sin(sw), cos(sw)) * v;
  lo += v2.x - v.x;
  wl += (v2.y - v.y) * 0.64;
  vec3 bq = vec3(cos(lo), wl * 1.4, sin(lo)) + id * 3.7;
  // Belts are thinner and hotter than zones.
  float base = odd > 0.5 ? 0.6 + 0.4 * h : 1.1 + 0.5 * h;
  vec3 w = vec3(fbm(bq * 3.0 + 1.0), fbm(bq * 3.0 + 4.0), 0.0);
  float lump = fbm(bq * 2.2 + w * 1.8);
  // Fine turbulence, a little longer along the band than across it, in two sizes.
  float fine = 0.7 * fbm(vec3(bq.x * 8.0, bq.y * 11.0, bq.z * 8.0) + w * 2.2) + 0.3 * fbm(bq * 26.0 + w * 3.0);
  float tau = base * (0.5 + 1.0 * lump) * (0.4 + 1.2 * smoothstep(0.2, 0.8, fine));
  // A storm's eye is clearer than its wall.
  return tau * mix(1.0, 0.65 + 0.8 * smoothstep(0.3, 0.9, e), exp(-e * e * 0.8));
}
// Zero at run time, unknown to D3D: a loop from it keeps one copy of its body.
#define ROLL0 int(min(gl_FragCoord.x, 0.0))
// A brown dwarf's cloud deck: its optical depth at the unit point q, about 0 to 3.
// Bands sit in latitude, so seen side-on they crowd toward the poles.
float deckTau(vec3 q) {
  float lat = asin(clamp(q.y, -1.0, 1.0)) / 1.5708;
  float lon = atan(q.z, q.x);
  // Slow weather bends the band edges in a frame that does not shear.
  float wl = lat + 0.1 * uCloud.z * (fbm(q * 3.0 + vec3(0.0, 0.0, uTime * 0.006)) - 0.5) + 0.1 * (vn(vec3(lat * 2.6, 1.0, 3.0)) - 0.5);
  float b = (wl * 0.5 + 0.5) * uCloud.y;
  // Two neighbour bands blend across a soft shear zone at their edge.
  float i0 = floor(b - 0.5), fr = fract(b - 0.5);
  float s = smoothstep(0.3, 0.7, fr);
  // One copy of the band code, run twice: D3D cannot count a loop that starts at ROLL0.
  float tau = 0.0;
  for (int i = ROLL0; i < 2; i++) {
    float j = float(i);
    tau += mix(1.0 - s, s, j) * bandTau(i0 + j, lon, wl, b);
  }
  // The shear zone churns: its cloud is a little thicker.
  tau += 0.35 * (1.0 - abs(2.0 * s - 1.0));
  // An L dwarf's mottle: soft round blotches of rising and sinking gas, in two sizes.
  float mottle = 0.6 * fbm(q * 5.0 + vec3(0.0, 0.0, uTime * 0.01)) + 0.4 * fbm(q * 12.0 + vec3(0.0, uTime * 0.017, 0.0));
  tau *= 0.45 + 1.1 * mottle;
  // Large patches thin and thicken over hours, as on Luhman 16B's map.
  tau *= 0.5 + 1.0 * fbm(q * 1.3 + vec3(5.0, 0.0, uTime * 0.003));
  // The poles lose their bands to a chaos of small storms.
  float pole = smoothstep(0.62, 0.86, abs(lat));
  float chaos = (0.6 + 1.4 * fbm(q * 6.0 + 2.0 * mottle)) * (0.55 + 0.9 * mottle);
  return mix(tau, chaos, pole);
}
void main() {
  vec2 P = uView.xy + (vUv * 2.0 - 1.0) * uView.zw;
  if (uHole.x > 0.0) { o = holeTrace(P); return; }
  // A red supergiant heaves: its giant cells push the limb in and out (Tom, 2026-11-24).
  // The plane warps along each ray from the centre, so the disk and its glow move as one.
  if (uLump.x > 0.0) {
    vec2 dl = P / max(length(P), 1e-4);
    P /= 1.0 + 2.0 * uLump.x * lumpAt(uToSun * vec3(dl, 0.0));
  }
  // A pulsing star swells and shrinks: the plane scales, so the glow moves with the disk.
  if (uBeat.w > 0.0) P /= 1.0 + uBeat.x;
  float r = length(P);
  float hot = 0.0, cool = 0.0;
  // The sunspots' shade, applied last so no later light fills them.
  float shade = 1.0;
  float tb = uTime * 0.02;
  if (r < R) {
    float mu = sqrt(max(1.0 - r * r / (R * R), 0.0));
    vec3 n = vec3(P / R, mu);
    // A neutron star bends its own light: a ray leaving at angle a from the normal reaches the eye
    // from a point psi round the star, with 1 - cos a = (1 - cos psi)(1 - u) (Beloborodov 2002).
    // So the eye sees past the limb, about 121 degrees round: both hot caps at once.
    if (uNs.x > 0.0) {
      float cpsi = 1.0 - (1.0 - mu) / (1.0 - uNs.y);
      n = vec3(P / max(r, 1e-4) * sqrt(max(1.0 - cpsi * cpsi, 0.0)), cpsi);
    }
    vec3 q = uToSun * n;
    // Granules boil: bright cells, dark lanes; each cell lives about 7 s.
    // Noise bends the cells and blurs the lanes, so they never read as hexagons.
    vec3 gq = q * uTex.x + vec3(0.0, 0.0, tb * 7.5);
    gq += 0.45 * vec3(vn(gq * 0.7), vn(gq * 0.7 + 3.1), vn(gq * 0.7 + 6.3));
    float gran = smoothstep(-0.05, 0.9, cells(gq)) * (0.7 + 0.3 * vn(gq * 2.3));
    // Swirls of plasma: noise bent by noise; they writhe over about a minute.
    vec3 wq = q * uTex.y * 1.6;
    vec3 warp = vec3(fbm(wq + tb * 0.8), fbm(wq + 5.1), fbm(wq + 9.3));
    float turb = fbm(q * uTex.y + warp * 1.7 + vec3(0.0, 0.0, tb * 1.2));
    // The supergranule network, warped so it never reads as tiles.
    vec3 w = q * 22.0 + 0.8 * vec3(vn(q * 9.0), vn(q * 9.0 + 5.2), vn(q * 9.0 + 9.7));
    float net = smoothstep(0.25, 0.0, cells(w + tb * 0.5));
    float mot = fbm(q * 14.0 + vec3(0.0, tb * 1.0, 0.0));
    // Filaments: dark sinuous lanes of cool plasma seen from above.
    float fil = smoothstep(0.035, 0.0, abs(fbm(q * 5.0 + 3.1) - 0.5)) * smoothstep(0.45, 0.65, fbm(q * 3.0 + 8.0));
    float tex = 1.0 + uDisk.y * ((gran - 0.6) * 0.35 + (turb - 0.5) * 1.6 + (mot - 0.5) * 0.5 + net * uTex.z) - 0.55 * fil * min(uDisk2.y, 1.0);
    // A rising giant cell is hot and bulges; a sinking one is cool and falls back.
    tex *= 1.0 + 2.0 * uLump.w * lumpAt(q);
    // A brown dwarf glows from inside; its clouds are cool blankets on top.
    // Thin cloud lets the hot deep light through; thick cloud shows its dull top.
    if (uCloud.x > 0.0) {
      float m = max(mu, 0.1);
      // Deeper along the view ray, the point under the eye slides toward the limb.
      vec3 sink = uToSun * (n * mu - vec3(0.0, 0.0, 1.0));
      // The deck at the surface point and deeper along the ray: one copy of the deck code, run twice.
      float tt = 0.0;
      for (int i = ROLL0; i < 2; i++) {
        float j = float(i);
        tt += mix(0.35, 0.65, j) * deckTau(normalize(q + j * sink * min(0.04 / m, 0.09)));
      }
      // The slant path through the deck grows as 1 / mu, so the limb dims by itself.
      float tr = exp(-tt / m);
      // A high haze glows at the limb, lit from below.
      float deck = mix(0.4, 1.8, tr) + 0.9 * pow(1.0 - mu, 3.0);
      tex = mix(tex, deck, uCloud.x);
    }
    // From far away the surface detail melts into one even glow.
    tex = mix(tex, 1.0, 0.85 * uFar);
    // The photosphere darkens to the limb; the corona brightens.
    float dark = pow(max(mu, 0.02), uTex.w);
    float bright = 1.0 + 0.6 * (inversesqrt(max(mu, 0.04)) - 1.0);
    hot = uDisk.x * max(tex, 0.08) * mix(dark, bright, uDisk.z);
    // An egg's sunspots: a dark umbra in a ragged penumbra.
    for (int k = 0; k < 2; k++) {
      if (uEgg[k].w <= 0.0) continue;
      float a = acos(clamp(dot(n, uEgg[k].xyz), -1.0, 1.0));
      float sz = 0.4 + 0.6 * uEgg[k].w;
      float rag = vn((n - uEgg[k].xyz) * 900.0 + 4.0);
      float pen = smoothstep(0.042 * sz * (0.8 + 0.4 * rag), 0.03 * sz, a);
      float umb = smoothstep(0.019 * sz, 0.013 * sz, a);
      hot *= 1.0 - min(uEgg[k].w, 1.0) * (0.62 * pen + 0.35 * umb);
    }
    // An egg's white-light kernels: they burn through to white.
    for (int k = 2; k < 4; k++) {
      if (uEgg[k].w <= 0.0) continue;
      float a = acos(clamp(dot(n, uEgg[k].xyz), -1.0, 1.0));
      hot += uEgg[k].w * uDisk.x * (14.0 * exp(-pow(a / 0.0045, 2.0)) + 0.8 * exp(-a / 0.008));
    }
    // Moss: bright plage under each region; the spots darken it after.
    for (int k = 0; k < ${NR}; k++) {
      float dd = 2.0 - 2.0 * dot(n, uReg[k].xyz);
      float m = exp(-dd / 0.006) * uReg[k].w;
      hot += uDisk2.z * uDisk.x * m * (0.4 + 1.2 * net + 0.6 * gran);
    }
    // Sunspots: a bipole along each region's axis; the leader whole, the follower broken.
    for (int k = 0; k < ${NR}; k++) {
      float sz = uSpot[k].w;
      if (sz <= 0.0) continue;
      vec3 rc = uReg[k].xyz, re = uSpot[k].xyz, rf = cross(rc, re);
      // Faculae: bright plage round the group, strongest toward the limb.
      vec3 dc = n - rc;
      hot *= 1.0 + 0.35 * sz * (1.0 - mu) * exp(-dot(dc, dc) / 0.004);
      for (int j = 0; j < 3; j++) {
        float part = j == 0 ? 1.0 : j == 1 ? 0.7 : 0.45;
        vec3 at = normalize(rc + re * (j == 0 ? 0.045 : j == 1 ? -0.05 : -0.075) + rf * (j == 2 ? 0.018 : 0.0));
        float a = length(n - at) / (sz * part);
        float rag = vn((n - at) * 900.0 + float(k * 3 + j));
        // A full-size leader: a penumbra about 30 Mm across its radius.
        float pen = smoothstep(0.045 * (0.8 + 0.4 * rag), 0.032, a);
        float umb = smoothstep(0.02, 0.014, a);
        shade *= 1.0 - 0.62 * pen - 0.33 * umb;
      }
    }
    // A Wolf-Rayet wind veils the disk: clumps drift outward across its face.
    if (uWind.x > 0.0) hot *= 0.82 + 0.36 * fbm(q * 11.0 + vec3(0.0, 0.0, 2.2 * log(1.03 - mu) - uTime * 0.05));
    // A Thorne-Zytkow object in cutaway: the envelope thins toward the middle, so the inside shows.
    // Within: a white-gold core zone, a ragged burning shell, the neutron star at the heart.
    // The neutron star is drawn far larger than its true 20 km.
    // uCore 2 is a quasi-star: a black hole at the heart, and no burning shell.
    // Drawn as artists show it: a thin, torn envelope with the hole's disc glowing through (Tom, 2026-11-24).
    if (uCore > 1.5) {
      float x = r / R;
      float pulse = 0.8 + 0.2 * sin(uTime * 0.5) * sin(uTime * 0.17 + 2.0);
      // Rifts open in the envelope, wider toward the middle.
      float rift = smoothstep(0.4, 0.7, fbm(q * 2.6 + vec3(0.0, 0.0, tb * 1.5)));
      float veil = mix(1.0, 0.14, smoothstep(0.95, 0.15, x)) * (1.0 - 0.85 * rift * smoothstep(1.0, 0.4, x));
      hot *= veil;
      // Gas falling in heats the inside; it shows most through the rifts.
      float heat = exp(-x * x / 0.2) * (0.5 + 0.9 * fbm(q * 4.0 + vec3(0.0, 0.0, tb * 2.0)));
      hot += uDisk.x * 0.9 * heat * (0.35 + 0.65 * rift) * pulse;
      // The hole's disc, tilted near edge on: a thin ellipse round the shadow.
      vec2 hp = P / R;
      vec2 he = vec2(0.94 * hp.x + 0.34 * hp.y, -0.34 * hp.x + 0.94 * hp.y);
      float rho = length(vec2(he.x, he.y / 0.3)), phi = atan(he.y / 0.3, he.x);
      float swirl = 0.55 + 0.9 * fbm(vec3(cos(phi - uTime * 0.3) * 3.0, sin(phi - uTime * 0.3) * 3.0, rho * 12.0));
      // The side that comes toward the eye beams brighter.
      float disc = smoothstep(0.075, 0.1, rho) * exp(-max(rho - 0.1, 0.0) / 0.12) * swirl * (1.0 + 0.55 * cos(phi));
      // The shadow hides the disc's far half; the near half crosses in front.
      float hs = length(hp), shadow = smoothstep(0.06, 0.07, hs);
      float ring = 3.0 * exp(-pow((hs - 0.072) / 0.006, 2.0));
      hot = hot * shadow + uDisk.x * pulse * (ring + 2.2 * disc * (he.y < 0.0 ? 1.0 : shadow));
    } else if (uCore > 0.0) {
      float x = r / R;
      float pulse = 0.75 + 0.25 * sin(uTime * 0.7) * sin(uTime * 0.23 + 1.0);
      hot *= 1.0 - uCore * 0.7 * smoothstep(0.9, 0.15, x);
      // The burning shell, seen through: brightest where its rim stands edge-on.
      float S = 0.34;
      float rag = fbm(q * 7.0 + vec3(0.0, 0.0, tb * 2.0));
      float rim = exp(-pow((x - S * (0.82 + 0.36 * rag)) / 0.04, 2.0)) * (0.25 + 1.6 * rag * rag);
      float shell = rim + 0.3 * S / sqrt(max(S * S - x * x, 0.004)) * smoothstep(S * 1.05, S * 0.8, x) * (0.4 + 1.2 * rag * rag);
      // The core zone: hot gas round the neutron star.
      float zone = exp(-x * x / 0.018) * (0.7 + 0.6 * fbm(q * 12.0 + vec3(tb * 3.0)));
      // The neutron star: a white-hot point and its halo.
      float ns = exp(-x * x / 0.00012) * 6.0 + exp(-x * x / 0.0025) * 1.2;
      hot += uCore * uDisk.x * (0.75 * shell + 0.9 * zone * pulse + ns * pulse);
    }
    // XX Trianguli: dark caps round the poles and one spot wider than the Sun.
    // They sit in the star's frame, so they turn with it.
    if (uStarspot.x > 0.0) {
      float lat = asin(clamp(dot(q, uGrav.xyz), -1.0, 1.0));
      float rag = 0.12 * (fbm(q * 6.0 + 2.0) - 0.5);
      float cap = smoothstep(uStarspot.y - 0.1, uStarspot.y + 0.05, abs(lat) + rag);
      vec3 sc = vec3(cos(uStarspot.z) * cos(uStarspot.w), sin(uStarspot.z), cos(uStarspot.z) * sin(uStarspot.w));
      float sa = acos(clamp(dot(q, sc), -1.0, 1.0)) + 0.15 * (fbm(q * 9.0 + 5.0) - 0.5);
      // A dark umbra in a ragged penumbra.
      float spot = max(0.9 * smoothstep(0.3, 0.22, sa), 0.5 * smoothstep(0.5, 0.36, sa));
      shade *= 1.0 - uStarspot.x * max(0.9 * cap, spot);
    }
    // A fast spinner is hotter at its poles than at its equator.
    if (uGrav.w > 0.0) { float c = dot(q, uGrav.xyz); hot *= mix(1.0 - uGrav.w, 1.0 + 0.35 * uGrav.w, c * c); }
    // A neutron star's magnetic poles burn hot: a white cap in a soft ring.
    if (uBeam.w > 0.0) {
      float pc = 1.0 - abs(dot(n, uBeam.xyz));
      hot += uBeam.w * (5.0 * exp(-pc / 0.006) + 1.2 * exp(-pc / 0.05));
    }
    // The chromosphere glows red at the very edge.
    cool += uDisk2.y * 0.5 * smoothstep(0.2, 0.0, mu);
    // Dust in front of the disk dims it in slow patches.
    hot *= 1.0 - uDust * 0.55 * smoothstep(0.4, 0.75, fbm(q * 4.2 + vec3(5.0, 0.0, tb * 0.05)));
    // The Great Dimming: a cool patch spreads over the south, then dust veils it.
    if (uDim[0].w + uDim[1].x > 0.0) {
      float s = dot(n, uDim[0].xyz);
      // The noise lives on the star, so the veil turns with it.
      float rag = fbm(q * 2.8 + 2.0) - 0.5;
      hot *= 1.0 - 0.4 * uDim[1].x * smoothstep(-0.1, 0.6, s + 0.5 * rag);
      float veil = smoothstep(-0.25, 0.45, s + 0.7 * rag) * (0.75 + 0.5 * fbm(q * 6.3 + 6.0));
      hot *= (1.0 - 0.85 * uDim[0].w * veil) * (1.0 - 0.15 * uDim[0].w);
      cool += 0.08 * uDim[0].w * veil * uDisk2.y;
    }
  } else {
    float h = r - R;
    // The direction of this point in the star's frame: the sky turns with the star.
    // Noise on a 3D direction has no seam where a 2D angle would wrap.
    vec3 sp = uToSun * vec3(P, 0.0);
    vec3 u = sp / max(length(sp), 1.0);
    // Streamers: broad rays in the corona, and fine ones.
    float st = fbm(u * 1.1 + vec3(0.0, 0.0, h * 0.002 - tb * 0.1 + 1.3));
    float fine = fbm(u * 7.6 + vec3(0.0, 0.0, h * 0.006 - tb * 0.3 + 4.1));
    hot = uDisk.w * (exp(-h / uDisk2.x) * (0.6 + 0.8 * fine) + 0.3 * exp(-h / 360.0) * (0.4 + 1.2 * st * st));
    // The chromosphere: a thin bright rim, and a ragged fringe of spicules.
    // A Wolf-Rayet wind: no edge, a thick glow; clumps stream out, about 700 km/s.
    // The noise is fine across the sky and long along each radius: streaks.
    if (uWind.x > 0.0) {
      float lh = log(h / R + 0.03);
      float cl = fbm(u * 11.0 + vec3(0.0, 0.0, lh * 2.2 - uTime * 0.05));
      float fall = pow(R / r, 2.5);
      hot += uWind.x * uDisk.x * 0.55 * fall * (0.7 + 0.6 * cl);
      hot += uWind.y * uDisk.x * 0.9 * fall * pow(smoothstep(0.5, 0.85, cl), 2.0);
    }
    float sh = 3.0 + 9.0 * pow(vn(u * 48.0 + vec3(0.0, 0.0, uTime * 0.05 + 0.5)), 2.0);
    cool += uDisk2.y * (exp(-h / sh) * (0.6 + 0.6 * vn(u * 143.0 + vec3(0.0, 2.0, uTime * 0.08))) + 0.8 * exp(-h / 2.5));
    if (uDust > 0.0) {
      // The envelope: arcs and knots of ejected dust, lit by the star.
      float warp = fbm(sp * 0.006 + vec3(0.0, 0.0, 1.0));
      float arcs = fbm(u * 0.8 + vec3(0.0, 0.0, h * 0.006 + 7.0) + 0.6 * warp);
      float knots = pow(fbm(sp * 0.012 + vec3(0.0, 0.0, 3.0 + tb * 0.05)), 3.0);
      float env = exp(-h / 260.0);
      cool += uDust * env * (0.15 * smoothstep(0.45, 0.8, arcs) + 0.3 * knots);
      hot += uDust * 0.1 * exp(-h / 500.0) * (0.5 + warp);
    }
  }
  // The dimming's dust cloud reaches past the southern limb.
  if (uDim[0].w > 0.0 && r >= R) {
    float s = dot(P / r, normalize(uDim[0].xy + 1e-5));
    // The cloud's noise lives in the star's frame, so it turns with the star.
    vec3 cq = uToSun * vec3(P / R, 0.0);
    float cloud = smoothstep(0.0, 0.7, s + 0.6 * (fbm(cq * 3.5 + 3.0) - 0.5)) * exp(-(r - R) / 420.0);
    hot *= 1.0 - 0.7 * uDim[0].w * cloud;
    cool += 0.18 * uDim[0].w * cloud * fbm(cq * 8.4 + 8.0);
  }
  // A haze over each region: unresolved loops.
  for (int k = 0; k < ${NR}; k++) {
    vec3 c = uReg[k].xyz * (R + 50.0);
    vec2 d = P - c.xy;
    float vis = r < R ? smoothstep(-60.0, 60.0, c.z) : 1.0;
    hot += uDisk2.w * uReg[k].w * vis * exp(-dot(d, d) / (2.0 * 70.0 * 70.0));
  }
  // A pulsar's caps: a pole whose beam faces the eye flares.
  // The beams themselves light dust in the volume pass, as a lighthouse.
  if (uBeam.w > 0.0) {
    for (int k = 0; k < 2; k++) {
      vec3 b = k == 0 ? uBeam.xyz : -uBeam.xyz;
      // A beam aimed at the eye: the pole flares in a tight burst.
      // Above 2.5 flashes a second this blends to a steady glow: no photosensitive flicker.
      float face = pow(max(b.z, 0.0), 60.0) * uFlashW;
      hot += uBeam.w * face * (6.0 * exp(-dot(P - b.xy * R, P - b.xy * R) / (2.0 * 140.0 * 140.0)) + 0.6 * exp(-max(r - R, 0.0) / 260.0));
    }
  }
  // The striped wind: past the light cylinder the field's current sheet winds into a spiral,
  // a wavy skirt round the spin equator, tilted by the magnetic axis; it leaves at near light speed.
  // The sheet lies where the field flips: tan(lat) = -tan(chi) cos(phi - spin phase + winding).
  if (uNs.x > 0.0 && uNs.z > 0.0 && r > R) {
    vec3 s = cross(uNsU.xyz, uNsV.xyz);
    float rl = uNs.w, sw = 0.0;
    float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    for (int i = 0; i < 24; i++) {
      float z = (-1.0 + (float(i) + j) / 12.0) * 7.0 * R;
      vec3 x = vec3(P, z);
      float r3 = length(x) / R;
      // The star hides the sheet behind it.
      if (r3 < 1.0 || (z < 0.0 && r < R)) continue;
      vec3 xn = x / (r3 * R);
      float lat = asin(clamp(dot(xn, s), -1.0, 1.0));
      float phi = atan(dot(xn, uNsV.xyz), dot(xn, uNsU.xyz));
      float wind = (r3 - rl) / rl;
      float latS = atan(-tan(uNsV.w) * cos(phi + wind));
      float w = 0.14 + 0.02 * r3;
      sw += exp(-pow((lat - latS) / w, 2.0)) * smoothstep(rl * 0.85, rl * 1.4, r3) * pow(rl / r3, 1.6) * (0.5 + vn(vec3(r3 * 2.0 - uTime * 0.8, phi * 3.0, 3.0)));
    }
    cool += uNs.z * uDisk.x * 1.6 * sw / 24.0 * 7.0;
  }
  // A young star: a ringed dust disk at a slant, and a jet from each pole.
  if (uYso.w > 0.0) {
    // The axis's sign is free: flipping it keeps the plane and the near half in front.
    vec3 a = uYso.z < 0.0 ? -uYso.xyz : uYso.xyz;
    // The disk plane under this pixel; the eye looks along z.
    float z = -(P.x * a.x + P.y * a.y) / max(a.z, 0.15);
    vec3 X = vec3(P, z);
    float rho = length(X);
    vec3 e1 = normalize(cross(a, vec3(0.0, 0.0, 1.0)) + 1e-5);
    vec3 e2 = cross(a, e1);
    // The disk turns faster near the star, as orbits do.
    float phi = atan(dot(X, e2), dot(X, e1)) + uTime * 0.02 * pow(R / max(rho, R), 1.5);
    float x = rho / R;
    // Dust from an inner rim at 1.3 radii; dark gaps where young planets clear lanes.
    float sig = smoothstep(1.2, 1.5, x) * exp(-(x - 1.3) / 2.2);
    sig *= 1.0 - 0.75 * exp(-pow((x - 2.05) / 0.08, 2.0)) - 0.6 * exp(-pow((x - 2.9) / 0.12, 2.0));
    sig *= 0.65 + 0.7 * fbm(vec3(cos(phi) * x * 2.0, sin(phi) * x * 2.0, x * 0.5));
    float tau = sig * 1.4 / max(a.z, 0.2);
    // The near half of the disk crosses the star and dims it.
    if (r < R && z > 0.0) hot *= exp(-tau);
    float seen = r < R && z < 0.0 ? 0.0 : 1.0;
    // Starlight scatters off the dust; the inner rim glows hottest.
    cool += uYso.w * seen * sig * (1.6 * pow(1.3 / max(x, 1.3), 1.5) + 1.2 * exp(-pow((x - 1.32) / 0.08, 2.0)));
    hot += uYso.w * seen * sig * 0.35 * pow(1.3 / max(x, 1.3), 2.0);
    // The jets: a thin flow with bright knots that travel outward.
    vec2 ax = length(a.xy) > 1e-3 ? normalize(a.xy) : vec2(0.0, 1.0);
    float s = dot(P, ax), c = P.x * ax.y - P.y * ax.x;
    float d = abs(s) / R;
    float jw = R * (0.05 + 0.035 * d);
    float jet = exp(-pow(c / jw, 2.0)) * smoothstep(0.9, 1.4, d) * exp(-d / 5.0);
    float knots = 0.35 + 1.6 * pow(0.5 + 0.5 * sin(d * 5.0 - uTime * 0.25), 6.0);
    float jvis = r < R ? 0.0 : 1.0;
    cool += uYso.w * jvis * jet * knots * 2.0;
    hot += uYso.w * jvis * jet * knots * 0.5;
  }
  // The erupting bubble: a faint shell, dim inside.
  for (int k = 0; k < ${MAX_FLARES}; k++) {
    if (uFlB[k].z <= 0.0) continue;
    vec3 c = uFl[k].xyz * (R + uFlB[k].x);
    float d = length(P - c.xy) / uFlB[k].y;
    float shell = exp(-pow((d - 1.0) / 0.06, 2.0)) * pow(fbm(vec3(P * 0.012, 1.7)), 2.0) * 2.4;
    float vis = r < R && c.z < 0.0 ? 0.0 : 1.0;
    // The cavity: plasma swept out behind the front.
    hot *= 1.0 - 0.6 * min(uFlB[k].z, 1.0) * vis * smoothstep(1.0, 0.55, d);
    hot += uFlB[k].z * shell * vis;
  }
  // Real light: the corona and everything round the disk lose weight to the disk.
  if (r >= R) { hot *= uOff; cool *= uOff; }
  // M1-67: knots of shed gas round a Wolf-Rayet star, not to scale.
  // The true nebula is 45 million times the star's width; it shows as the view pulls back.
  if (uWind.z > 0.0 && r > R) {
    // The nebula hangs in space: a drag turns it with the camera.
    vec2 Pc = (uCamM * vec3(P, 0.0)).xy;
    float rr = length(Pc) / (R * uWind.w);
    // The knots crowd along one axis, as in the JWST picture.
    float ang = atan(Pc.y, Pc.x);
    float axis = 0.45 + 0.55 * pow(cos(ang - 0.9), 2.0);
    vec3 nq = vec3(Pc / (R * uWind.w) * 2.6, 1.3 + uTime * 0.002);
    vec3 nw = vec3(fbm(nq * 0.7 + 3.0), fbm(nq * 0.7 + 7.0), 0.0);
    float kn = smoothstep(0.42, 0.72, fbm(nq + 0.7 * nw));
    float env = smoothstep(0.2, 0.65, rr) * exp(-pow(max(rr - 0.85, 0.0) / 0.4, 2.0));
    float neb = env * axis * uWind.z;
    cool += neb * (0.16 + 1.0 * kn * kn);
    hot += neb * 0.15 * kn;
  }
  // WR 140: each close pass of the pair puffs out a soot shell, every 7.9 years.
  // The shells nest at even steps and drift out; JWST counts more than 17.
  // The dust forms on a cone round the wind collision, so only two fans of each shell show.
  // The fans follow the JWST MIRI picture: a wide one up and right, a narrow one down and left.
  if (uShell.x > 0.0 && r > R) {
    // The shells hang in space: a drag turns them with the camera.
    vec2 Pc = (uCamM * vec3(P, 0.0)).xy / R;
    float ang = atan(Pc.y, Pc.x);
    float du = mod(ang - 1.3 + 3.14159, 6.28318) - 3.14159;
    float dl = mod(ang - 3.72 + 3.14159, 6.28318) - 3.14159;
    float fan = max(smoothstep(1.0, 0.4, abs(du)), smoothstep(0.62, 0.22, abs(dl)));
    // A broad plume of old dust trails up and left.
    float dp = mod(ang - 2.6 + 3.14159, 6.28318) - 3.14159;
    float plume = 0.1 * smoothstep(1.1, 0.2, abs(dp));
    if (fan + plume > 0.0) {
      // Each fan in its own frame: x along the fan's axis.
      float lower = step(abs(dl), abs(du));
      float axa = mix(1.3, 3.72, lower);
      vec2 lc = abs(vec2(dot(Pc, vec2(cos(axa), sin(axa))), dot(Pc, vec2(-sin(axa), cos(axa)))));
      // A cone's section is flatter than a circle: a superellipse gives the boxy arcs.
      float pw = mix(3.0, 2.3, lower);
      float rad = pow(pow(lc.x, pw) + pow(lc.y, pw), 1.0 / pw) / (uShell.y * mix(1.0, 0.82, lower));
      // Each shell is a thin sheet: the eye sums the dust along its line of sight.
      // The column peaks at the sheet's inner edge and fades inward, so haze fills the gaps.
      float base = fract(uShell.z), k0 = ceil(rad - base), dens = 0.0;
      for (int j = 0; j < 4; j++) {
        float a = k0 + float(j) + base, b = a - 0.16, e = 0.02 * a;
        float c = sqrt(max(a * a - rad * rad, 0.0) + e) - sqrt(max(b * b - rad * rad, 0.0) + e);
        dens += c / sqrt(0.32 * a) * exp(-a / 7.0) * smoothstep(1.4, 2.4, a) * smoothstep(19.0, 13.0, a);
      }
      // Each shell keeps its own clumps as it drifts out.
      float clump = 0.55 + 0.8 * fbm(vec3(cos(ang) * 5.0, sin(ang) * 5.0, (k0 - floor(uShell.z)) * 1.7));
      float haze = plume * exp(-rad / 9.0) * smoothstep(1.5, 3.0, rad);
      cool += uShell.x * uDisk.x * (dens * fan * clump + haze) * (0.5 * uOff + 0.25 + 0.3 * uFar);
    }
  }
  // Fomalhaut's dust belts (Tom, 2026-11-24: a real ringed star), scaled from 133 AU to a few radii.
  // A narrow main belt with a sharp inner edge, its centre a little off the star; a faint inner belt;
  // and the dust cloud once called Fomalhaut b. The dust is thin: it glows with scattered starlight
  // and barely dims the star. Tilted, so an ellipse; the star hides the far half.
  // uRing.yz: the belt's centre in R; uRing.w: the minor ratio, its sign the near half.
  // uRing2: the major axis's angle, the glow, the inner belt's radius, the main belt's radius.
  // uRing3: the dust cloud's weight, the belt's outer width, the clump strength.
  if (uRing.x > 0.0) {
    vec2 d = P / R - uRing.yz;
    float ca = cos(uRing2.x), sa = sin(uRing2.x), k = abs(uRing.w);
    vec2 e = vec2(ca * d.x + sa * d.y, -sa * d.x + ca * d.y);
    // Back in the belt's own plane, undoing the tilt.
    vec2 pl = vec2(e.x, e.y / k);
    float rho = length(pl), rb = uRing2.w;
    float ang = atan(pl.y, pl.x);
    // Clumps along the belt, as Hubble and JWST show it.
    float clump = 0.55 + uRing3.z * fbm(vec3(cos(ang) * 3.0, sin(ang) * 3.0, rho * 1.5));
    float belt = smoothstep(rb * 0.9, rb * 0.97, rho) * exp(-max(rho - rb * 0.97, 0.0) / (rb * uRing3.y));
    float inner = uRing2.z <= 0.0 ? 0.0 : 0.22 * exp(-pow((rho - uRing2.z) / (0.08 * rb), 2.0));
    vec2 cp = vec2(-0.45, 0.72) * rb;
    float cloud = 0.45 * uRing3.x * exp(-dot(pl - cp, pl - cp) / (0.03 * rb * rb));
    float hide = e.y * sign(uRing.w) > 0.0 && r < R ? 0.0 : 1.0;
    // Dust scatters forward: the near half glows a little brighter.
    float fwd = 0.75 + 0.5 * smoothstep(0.0, -0.8 * rb * k, e.y * sign(uRing.w));
    float L = ((belt + inner) * clump + cloud) * fwd * hide;
    cool += uRing.x * uRing2.y * uDisk.x * L * (0.5 * uOff + 0.25 + 0.3 * uFar);
    // The thin dust over the disk dims it only faintly.
    hot *= 1.0 - 0.08 * belt * hide * step(r, R);
  }
  hot *= shade;
  // Beta Lyrae's partner: its disc and stream are gas in the volume pass.
  // Here only the jets: thin flows from the disc's faces, with knots that travel out.
  if (uBin.w > 0.0) {
    vec2 dq = P / R - uBin.xy;
    vec2 nx = length(uBinN.xy) > 1e-3 ? normalize(uBinN.xy) : vec2(0.0, 1.0);
    float u = dot(dq, vec2(nx.y, -nx.x)), jy = abs(dot(dq, nx));
    // The donor hides the jets behind it.
    float vis = uBin.z > 0.0 ? 1.0 : step(R, r);
    float jet = exp(-pow(u / (0.05 + 0.05 * jy), 2.0)) * smoothstep(uBinD.y, uBinD.y + 0.5, jy) * exp(-jy / 2.5);
    cool += uBinD.z * uDisk.x * uOff * 0.7 * jet * vis * (0.5 + fbm(vec3(jy * 2.0 - uTime * 0.5, u * 5.0, 1.0)));
    // The hidden star shows only as a soft glow through the gas: no hard disc of its own.
    float dd = length(dq);
    cool += vis * uDisk.x * uOff * 0.5 * exp(-dd * dd / 0.3);
  }
  // Epsilon Aurigae: a vast dusty disc round a hidden B star crosses the supergiant.
  // It is edge on and blocks about 70 percent of the light: the toy holds it mid-eclipse.
  if (uDiscE.x > 0.0) {
    // The disc hangs in space: a drag turns it with the camera.
    vec2 e = (uCamM * vec3(P, 0.0)).xy / R - vec2(uDiscE.y, -0.08);
    e = vec2(0.9988 * e.x + 0.05 * e.y, -0.05 * e.x + 0.9988 * e.y);
    // The disc flares: it thickens toward its rim.
    float th = uDiscE.w * (0.65 + 0.35 * smoothstep(0.2, 1.0, abs(e.x) / uDiscE.z));
    float edge = length(vec2(e.x / uDiscE.z, e.y / th));
    float inD = smoothstep(1.0, 0.92, edge);
    float block = 0.7 * inD * (0.8 + 0.4 * fbm(vec3(e * 4.0, 4.0)));
    hot *= 1.0 - block;
    cool *= 1.0 - block;
    // Starlight scatters forward through the dust and lights the rim.
    cool += uDiscE.x * uDisk.x * 0.1 * exp(-pow((edge - 0.97) / 0.05, 2.0));
    // The hidden B star glows faintly at the disc's heart.
    cool += uDiscE.x * uDisk.x * 0.2 * exp(-dot(e, e) / 0.015);
  }
  // A partner star. VFTS 352: a twin O star in contact; the envelopes merge in a neck.
  // A smooth union of the two disks draws the peanut; side on it shows, end on it hides.
  // Mothra: a small blue supergiant apart from the gold one, in the cool channel.
  if (uPair.w > 0.0) {
    vec2 c2 = uPair.xy * R;
    float r2 = length(P - c2);
    float Rt = R * uPair2.x;
    // The blend reaches across the gap between the twins, so a narrow waist forms.
    float k = 1.1 * R;
    float hm = clamp(0.5 + 0.5 * (r2 - r) / k, 0.0, 1.0);
    float du = mix(r2 - Rt, r - R, hm) - k * hm * (1.0 - hm);
    bool inTwin = r2 < Rt;
    bool inNeck = uPair2.y > 0.0 && du < 0.0 && r >= R && !inTwin;
    // The primary hides the partner behind it; the partner in front covers the primary.
    if ((inTwin && (uPair.z > 0.0 || r >= R)) || inNeck) {
      float mu2 = inTwin ? sqrt(max(1.0 - r2 * r2 / (Rt * Rt), 0.0)) : clamp(-du / (0.6 * R), 0.0, 1.0);
      float tex2 = 1.0 + uDisk.y * 0.6 * (fbm(vec3((P - c2) / Rt * 6.0, tb * 3.0)) - 0.5);
      // Gravity darkens the neck, where the two stars meet.
      float neck = inTwin ? 1.0 : 0.85;
      float L2 = uDisk.x * tex2 * pow(max(mu2, 0.02), uTex.w) * neck;
      if (uPair2.z > 0.0) { cool = 1.3 * L2; hot = 0.0; } else { hot = L2; cool *= 0.2; }
    }
  }
  o = vec4(max(hot, 0.0), max(cool, 0.0), 0.0, 1.0) * vec4(vec3(1.0 + uBeat.y), 1.0);
}`;

/* ---------- the disk pass in versions (Tom, 2026-11-25: it crashed Edge and Zen) ---------- */
// D3D's compiler took 45 s on SKY with every feature in it, and the GPU process died.
// Each version holds only its star's features: an unused feature uniform becomes a zero constant,
// so its branch is dead code and D3D drops it. A plain star's version compiles in about 5 s.
// Each entry: the uniform, its type, on in this frame's data, on for a star's data.
const SKY_FEATURES = [
  ['uHole', 'vec4', v => v.hole[0] > 0, B => !!B.hole],
  ['uBeam', 'vec4', v => v.beam[3] > 0, B => B.beam > 0],
  ['uCloud', 'vec4', v => v.band.clouds[0] > 0, B => B.clouds?.[0] > 0],
  ['uYso', 'vec4', v => v.yso[3] > 0, B => B.yso?.[3] > 0],
  ['uLump', 'vec4', v => v.lump[0] > 0, B => B.lump?.[0] > 0],
  ['uBeat', 'vec4', v => v.beat[3] > 0, B => !!B.beat],
  ['uWind', 'vec4', v => v.band.wind[0] > 0 || v.band.wind[2] > 0, B => B.wind?.[0] > 0 || B.wind?.[2] > 0],
  ['uCore', 'float', v => v.band.core > 0, B => B.core > 0],
  ['uNs', 'vec4', v => v.ns[0] > 0, B => !!B.ns],
  ['uRing', 'vec4', v => v.ring[0] > 0, B => !!B.ring],
  ['uShell', 'vec4', v => v.shell[0] > 0, B => !!B.shells],
  ['uPair', 'vec4', v => v.pair[3] > 0, B => !!B.pair],
  ['uStarspot', 'vec4', v => v.band.starspot[0] > 0, B => B.starspot?.[0] > 0],
  ['uDiscE', 'vec4', v => v.band.discE[0] > 0, B => B.discE?.[0] > 0],
  ['uBin', 'vec4', v => v.bin[3] > 0, B => !!B.bin],
];
// The SKY source for one set of features that are on.
function skySource(on) {
  // One uniform a line, so each can turn into a constant on its own.
  let src = SKY.replace(/^uniform (vec4|float) ([^;[]+);/gm, (m, t, names) => names.split(',').map(n => `uniform ${t} ${n.trim()};`).join('\n'));
  for (const [u, t] of SKY_FEATURES) if (!on.has(u)) src = src.replace(`uniform ${t} ${u};`, `const ${t} ${u} = ${t}(0.0);`);
  // A hole's version draws only the hole: the star's code after it is dead.
  if (on.has('uHole')) src = src.replace('if (uHole.x > 0.0) { o = holeTrace(P); return; }', 'o = holeTrace(P); return;');
  return src;
}
// The features a star's data turns on.
const starOn = B => new Set(SKY_FEATURES.filter(f => f[3](B)).map(f => f[0]));
const skyKey = on => SKY_FEATURES.filter(f => on.has(f[0])).map(f => f[0]).join(',');

/* ---------- strands: one camera-facing ribbon per thread ---------- */
// Kinds: 0 loop, 1 ribbon, 2 rope, 3 prominence, 4 erupting prominence.
const STRAND_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec4 aA;
layout(location = 1) in vec4 aB;
layout(location = 2) in vec4 aC;
layout(location = 3) in vec4 aD;
uniform mat3 uRot;
// A pulsar's bent light: on, and its compactness; the crust bends the same way in the disk pass.
uniform vec2 uBend;
vec3 bendP(vec3 p) {
  if (uBend.x <= 0.0) return p;
  float rho = length(p), q = length(p.xy);
  if (q < 1e-4) return p;
  float ca = 1.0 - (1.0 - p.z / rho) * (1.0 - uBend.y);
  return vec3(p.xy * rho * sqrt(max(1.0 - ca * ca, 0.0)) / q, ca * rho);
}
uniform vec4 uView;
uniform vec2 uRes;
out float vV, vS, vI, vDrain, vPh, vKind, vHgt, vU;
out vec3 vP;
const float R = ${R.toFixed(1)};
const int N = ${NS};
float hv(float i) { i = fract(i * 0.1031); i *= i + 33.33; return fract(i * (i + i)); }
float nv(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hv(i), hv(i + 1.0), f); }
vec3 curve(float s) {
  vec3 A = aA.xyz, B = aB.xyz;
  float om = acos(clamp(dot(A, B), -1.0, 1.0));
  vec3 base = om < 1e-4 ? A : (sin((1.0 - s) * om) * A + sin(s * om) * B) / sin(om);
  vec3 side = normalize(cross(A, B) + vec3(1e-6));
  vec3 up = normalize(base * cos(aB.w) + side * sin(aB.w));
  // Steep legs, a round top: a semi-ellipse.
  float lift = aA.w * sqrt(max(4.0 * s * (1.0 - s), 0.0));
  vec3 p = base * R + up * lift;
  if (aD.x > 0.0) {
    vec3 tng = normalize(B - A + vec3(1e-6));
    // An erupting rope swells into a bulb: its upper legs bow outward.
    if (aD.w == 2.0 || aD.w == 4.0 || aD.w == 6.0) p -= tng * sin(6.2832 * s) * 0.3 * max(aA.w - 30.0, 0.0);
    vec3 ax2 = normalize(cross(up, tng));
    float a = aD.y * 6.2832 * s + aD.z;
    p += aD.x * sqrt(sin(3.14159 * s)) * (cos(a) * up + sin(a) * ax2);
  }
  return p;
}
vec2 px(vec3 p) { return ((p.xy - uView.xy) / uView.zw * 0.5 + 0.5) * uRes; }
void main() {
  int i = gl_VertexID >> 1;
  float side = (gl_VertexID & 1) == 0 ? -1.0 : 1.0;
  float s = float(i) / float(N - 1);
  float ds = 0.5 / float(N - 1);
  vec3 c = curve(s);
  vec3 p = bendP(uRot * c);
  vec3 p1 = bendP(uRot * curve(min(s + ds, 1.0))), p0 = bendP(uRot * curve(max(s - ds, 0.0)));
  vec2 sp = px(p);
  vec2 t2 = px(p1) - px(p0);
  vec2 tn = length(t2) > 1e-4 ? normalize(t2) : vec2(1.0, 0.0);
  vec2 nr = vec2(-tn.y, tn.x);
  float ppm = uRes.y / (2.0 * uView.w);
  float wpx = aC.x * ppm;
  // A plasma tube: its along coordinate counts in tube widths.
  float om = acos(clamp(dot(aA.xyz, aB.xyz), -1.0, 1.0));
  vU = s * (om * R + 1.6 * aA.w) / max(aC.x, 0.5);
  // A tube swells and pinches along its length, and thins at its feet.
  if (aD.w >= 5.0) wpx *= (0.6 + 0.75 * nv(vU * 0.35 + aC.z * 5.3)) * mix(0.55, 1.0, smoothstep(0.0, 0.18, min(s, 1.0 - s)));
  float wq = max(wpx, 1.5);
  // A thread seen along its length looks brighter: a longer path.
  vec3 t3 = normalize(p1 - p0 + vec3(1e-6));
  // Ribbons lie in the dense chromosphere, so they get no path boost.
  float los = aD.w == 1.0 || aD.w == 7.0 ? 1.0 : 1.0 / max(length(t3.xy), 0.3);
  vI = aC.y * (wpx / wq) * los;
  vV = side;
  vS = s;
  vDrain = aC.w;
  vPh = aC.z;
  vKind = aD.w;
  vHgt = length(c) - R;
  vP = p;
  vec2 q = sp + nr * side * wq * 1.6;
  gl_Position = vec4(q / uRes * 2.0 - 1.0, 0.0, 1.0);
}`;

const STRAND_FS = `${HEAD}
uniform float uTime, uRain, uGain;
in float vV, vS, vI, vDrain, vPh, vKind, vHgt, vU;
in vec3 vP;
out vec4 o;
const float R = ${R.toFixed(1)};
// A fract hash: sin of large numbers loses precision on some mobile GPUs.
float hh(float i) { i = fract(i * 0.1031); i *= i + 33.33; return fract(i * (i + i)); }
float n1(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hh(i), hh(i + 1.0), f); }
float n2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hh(i.x + 57.0 * i.y), b = hh(i.x + 1.0 + 57.0 * i.y);
  float c = hh(i.x + 57.0 * (i.y + 1.0)), d = hh(i.x + 1.0 + 57.0 * (i.y + 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
// A plasma tube's light across and along it: braided threads, knots, a ragged edge.
float tube(float v, float u, float sd) {
  // The tube wanders sideways, and its edge frays.
  float x = v * 1.6 + 0.45 * (n1(u * 0.5 + sd * 3.1) - 0.5);
  x *= 1.0 + 0.35 * (n2(vec2(x * 2.0, u * 0.9 + sd)) - 0.5);
  float body = exp(-2.2 * x * x);
  // Two thread layers wind opposite ways, so the threads cross and merge.
  float a = n2(vec2(x * 2.6 + u * 0.32, u * 0.22 + sd * 7.0));
  float b = n2(vec2(x * 3.4 - u * 0.27, u * 0.3 + sd * 11.0));
  float th = a * b * 2.4;
  // Knots: bright blobs that ride along the tube.
  float kn = n1(u * 0.45 - uTime * 0.12 + sd * 13.0);
  return body * (0.3 + th * th) * (0.45 + 1.1 * kn * kn);
}
void main() {
  float prof = vKind >= 5.0 ? tube(vV, vU, vPh) : exp(-5.12 * vV * vV);
  // The sun hides what stands behind it.
  float r = length(vP.xy);
  float zs = sqrt(max(R * R - r * r, 0.0));
  float vis = max(smoothstep(R - 0.8, R + 0.8, r), smoothstep(-1.5, 0.8, vP.z - zs));
  // The cool chromosphere dims the feet, except on the ribbons.
  float feet = vKind == 1.0 || vKind == 7.0 ? 1.0 : mix(0.35, 1.0, smoothstep(0.0, 6.0, vHgt));
  float foot = min(vS, 1.0 - vS);
  // Upflows: faint ripples that climb from the feet.
  float rip = 1.0 + 0.22 * sin(6.2832 * (foot * 7.0 - uTime * 0.32 + vPh)) * (1.0 - smoothstep(0.08, 0.4, foot));
  float I = vI * rip * (1.0 - 0.72 * vDrain * smoothstep(0.0, 0.5, foot + 0.25 * vDrain));
  // Rain: knots fall down both legs as the loop drains.
  if (vDrain > 0.0) {
    float k = 0.0;
    for (int j = 0; j < 3; j++) {
      float u = clamp(vDrain * 1.5 - float(j) * 0.25, 0.0, 1.0);
      if (u <= 0.0 || u >= 1.0) continue;
      float at = 0.48 * u * u;
      float w = 0.012 + 0.01 * u;
      k += exp(-pow((foot - (0.5 - at)) / w, 2.0)) * (1.0 - u * 0.6);
    }
    I += vI * uRain * k * 1.6;
  }
  // An erupting rope: knots of cool plasma ride its fibres, so it reads as torn plasma, not a hose.
  if (vKind == 2.0) {
    float fr = vS * 26.0 + vPh * 7.3 - uTime * 0.15;
    float kr = n1(fr) * 0.6 + n1(fr * 2.3 + 3.0) * 0.6;
    I *= 0.25 + 1.3 * kr * kr;
  }
  // Prominences: knots of cool plasma slide down toward the feet.
  if (vKind >= 3.0 && vKind < 5.0) {
    float fl = foot * 40.0 + uTime * 0.6 + vPh * 13.0;
    float kn = n1(fl) * 0.7 + n1(fl * 2.7 + 5.0) * 0.5;
    I *= 0.35 + 1.1 * kn * kn;
  }
  float cf = vKind == 5.0 ? 0.0 : vKind == 2.0 || vKind == 6.0 ? 0.8 : vKind == 1.0 || vKind == 7.0 ? 0.5 : vKind >= 3.0 ? 1.0 : 0.0;
  float L = I * prof * vis * feet * uGain;
  o = vec4(L * (1.0 - cf), L * cf, 0.0, 1.0);
}`;

/* ---------- light rays: a march toward the sun's centre ---------- */
const RAYS = `${HEAD}
uniform sampler2D uSrc;
uniform vec2 uC;
uniform float uThr;
in vec2 vUv;
out vec4 o;
void main() {
  vec2 dir = uC - vUv;
  float len = min(length(dir) * 0.5, 0.45);
  vec2 d = normalize(dir + 1e-6) * len / float(${RAY_N});
  vec2 uv = vUv;
  vec3 s = vec3(0.0);
  float w = 1.0;
  for (int i = 0; i < ${RAY_N}; i++) {
    vec3 c = texture(uSrc, clamp(uv, 0.0, 1.0)).rgb;
    s += max(c - uThr, 0.0) * w;
    w *= 0.955;
    uv += d;
  }
  // A smooth glow only: no screen-fixed spokes; the volumes carry the structure.
  // 0.7 holds the mean light the spokes gave.
  o = vec4(s / float(${RAY_N}) * 0.7, 1.0);
}`;

/* ---------- volume: raymarched dust and haze round the star ---------- */
// Orthographic rays run toward the star from in front of it.
// The march stops at the star's surface, or far behind it.
const NOISE_N = 64;
// The bake's grid: longitude, colatitude and radius in the star's frame.
const BK_W = 384, BK_H = 192, BK_D = 96;
// The haze and the corona in the star's frame, shared by the march and the bake.
// Uniforms the caller declares: uNoise, uDust, uBend, uTime.
const VOLFN = `
const float R = ${R.toFixed(1)};
const float SIG = 0.0022;
const float PI = 3.14159265, TAU = 6.2831853;
// The bake reaches 3.5 radii: past the corona's march and the giants' dust.
const float RB = 3.5 * R;
float nz(vec3 p) { return texture(uNoise, p).r; }
float fbm3(vec3 p) { return nz(p) * 0.5 + nz(p * 2.03 + 0.31) * 0.25 + nz(p * 4.01 + 0.67) * 0.125 + nz(p * 8.03 + 0.13) * 0.0625; }
// The haze's noise at q in the star's frame: the full sum, or the lite one for shadows.
// drift: the noise's slow flow; the bake holds it still.
float hazeN(vec3 q, vec3 drift, bool lite) {
  // One noise cell is about 90 units; the texture repeats every 64 cells.
  vec3 n = q / 5800.0 + drift;
  vec3 w = vec3(nz(n * 0.6), nz(n * 0.6 + 0.37), nz(n * 0.6 + 0.71)) - 0.5;
  return lite ? nz(n + w * 0.6) * 0.7 + nz(n * 2.03 + w + 0.31) * 0.3 : fbm3(n + w * 0.6);
}
// The haze's shape from its noise f at radius r: a shell, and the star's dust clouds.
float hazeF(float f, float r) {
  float h = r - R;
  float shell = exp(-h / (320.0 + 160.0 * uDust));
  float cl = smoothstep(0.48 - 0.04 * uDust, 0.76, f);
  return shell * (0.08 + 2.4 * cl) + uDust * 0.15 * cl * smoothstep(3.5 * R, R, r);
}
// The haze's shape at q, before its strength and the face cut.
float hazeQ(vec3 q, vec3 drift, bool lite) {
  float r = length(q);
  if (r < R) return 0.0;
  return hazeF(hazeN(q, drift, lite), r);
}
// The corona in 3D at q in the star's frame: optically thin, it scatters the star's light.
// Streamers gather on a warped sheet round the magnetic equator and narrow as they climb.
// They bend in a slow spiral with height; polar plumes stand at the poles; fine rays run radially.
float coronaQ(vec3 q) {
  float r = length(q);
  if (r < R) return 0.0;
  vec3 u = q / r;
  float lx = log(r / R);
  float tw = uBend * 0.5 * lx;
  float cs = cos(tw), sn = sin(tw);
  u = vec3(cs * u.x + sn * u.z, u.y, -sn * u.x + cs * u.z);
  float phi = atan(u.x, u.z);
  float sheetLat = 0.3 * sin(2.0 * phi + 0.7) + 0.12 * sin(3.0 * phi - 1.3 + uTime * 0.003);
  float w = 0.36 * pow(R / r, 0.6);
  float dl = (u.y - sheetLat) / w;
  float sheet = exp(-dl * dl);
  // Fine rays: noise on the direction alone, so it holds along each radius.
  float rays = fbm3(u * 0.45 + 0.5);
  rays = 0.15 + 2.6 * rays * rays * rays;
  // Sample round a circle, so the lumps wrap with no seam at phi = pi.
  float lumps = 0.45 + 1.1 * nz(vec3(cos(phi) * 0.12, sin(phi) * 0.12, 0.7));
  float polar = smoothstep(0.72, 0.95, abs(u.y)) * rays;
  return pow(R / r, 2.2) * (sheet * lumps * (0.5 + 0.7 * rays) + 0.1 * rays + 0.3 * polar);
}
/* ---------- K3 lighting: Fire's smoke shading (shared/fire.js, volume()) ---------- */
// A short self-shadow march toward the key, Beer plus a multiple-scatter lobe,
// the powder term, an ambient floor, and a Henyey-Greenstein phase times 4 pi.
// The key is the star itself: at each point the light comes from its centre.
const float ABSORB = 2.0, AMBIENT = 0.12, POWDER = 0.59, MULTI = 1.0, G_HG = 0.55;
float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5) * 0.079577; }
// The light that reaches a point through an optical depth tau.
// pw: the powder term's weight; it fades near the surface, where it left a dark band.
float k3(float tau, float pw) {
  float beer = exp(-tau);
  float ms = exp(-tau * 0.25) * 0.5;
  float base = mix(beer, beer + ms, MULTI);
  float powder = 1.0 - exp(-tau * 2.0);
  float fin = mix(base, base * powder, POWDER * pw);
  return clamp(fin + AMBIENT, 0.0, 1.0);
}
/* ---------- end K3 lighting ---------- */
`;

// The bake: one layer of the spherical grid per draw.
// It holds nothing a star changes, so it runs once at load.
// A change of the Dev row Corona bend bakes again.
const BAKE = `${HEAD}
precision highp sampler3D;
uniform sampler3D uNoise;
uniform float uTime, uDust, uBend;
// This layer's radial place: 0 at the surface, 1 at the bake's edge.
uniform float uS;
out vec4 o;
${VOLFN}
void main() {
  // Texel centres: longitude round the spin axis, colatitude from the north pole.
  float ph = gl_FragCoord.x / ${BK_W}.0 * TAU - PI, th = gl_FragCoord.y / ${BK_H}.0 * PI;
  vec3 u = vec3(sin(th) * sin(ph), cos(th), sin(th) * cos(ph));
  // Radius on a square curve: fine layers near the surface, where the haze is dense.
  vec3 q = u * (R + (RB - R) * uS * uS);
  o = vec4(hazeN(q, vec3(0.0), false), hazeN(q, vec3(0.0), true), coronaQ(q), 0.0);
}`;

// The quasar's bakes: the band's and the clouds' dust and self-shade in their turning frames.
// Angle along x, radius along y, height along the layers; made once at load.
const QB_W = 512, QB_H = 96;
const QBAKE = `${HEAD}
precision highp sampler3D;
uniform sampler3D uNoise3;
// 0 bakes the band, 1 the broad-line clouds.
uniform int uWhich;
// This layer's height place, 0 at the bottom, 1 at the top.
uniform float uLayer;
out vec4 o;
const float TAU = 6.2831853;
${NOISE}
// Smooth texture noise, as the trace's hn.
float hn(vec3 p) {
  vec3 x = p * 2.0, i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return texture(uNoise3, (i + f + 0.5) / 64.0).r;
}
// Worley F1: the distance to the nearest point, over all 27 neighbour cells.
// A smaller search leaves straight seams.
float wor(vec3 p) {
  vec3 i = floor(p), f = p - i;
  float d = 9.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(x, y, z);
    vec3 o = vec3(h13(i + g), h13(i + g + 17.3), h13(i + g + 41.9));
    d = min(d, dot(g + o - f, g + o - f));
  }
  return sqrt(d);
}
// The torus's dust: Worley billows, with clear gaps between them.
// Texture noise erodes their edges; a second Worley scale costs too much.
// fill: 0 at the band's edges, 1 in its middle, where the gaps close.
float torusDust(vec3 q, float fill) {
  float w = 0.75 * wor(q * 0.45) + 0.25 * hn(q * 0.9 + 5.1);
  return smoothstep(0.6 + 0.3 * fill, 0.36 + 0.3 * fill, w);
}
// A band point in the dust's frame, before its turn: the trace turns the lookup.
// The radius stretches, so each billow draws out along the orbit.
// Inner gas runs ahead, so the billows lean back as trailing chevrons.
vec3 bandQ(float r, float phi, float y) {
  // Past the middle the swirl winds tighter and draws out longer, so the edge fans out.
  float ro = max(r - 30.0, 0.0);
  float pt = phi + 0.3 * (r - 30.0) + 0.01 * ro * ro;
  float rs = 30.0 + 2.2 * (r - 30.0) + 0.05 * ro * ro;
  return vec3(cos(pt) * rs, y, sin(pt) * rs);
}
// A cloud point in the broad-line layers' frame, as bandQ.
// The layer above and the layer below take different billows.
vec3 blrQ(float r, float phi, float y) {
  float pt = phi + 0.2 * (r - 18.0);
  float rs = 18.0 + 1.6 * (r - 18.0);
  return vec3(cos(pt) * rs, y + sign(y) * 37.0, sin(pt) * rs);
}
// The broad-line clouds' density: Worley billows, eroded by texture noise.
// env: the layer's shape; where it thins, the clouds break into masses.
float blrDust(vec3 q, float env) {
  float w = 0.7 * wor(q * 0.3) + 0.3 * hn(q * 0.8 + 2.7);
  return smoothstep(0.56, 0.34, w + 0.55 * (1.0 - env)) * env;
}
void main() {
  float a = gl_FragCoord.x / ${QB_W}.0 * TAU, fy = gl_FragCoord.y / ${QB_H}.0;
  if (uWhich == 0) {
    float r = ${QB.r0.toFixed(1)} + fy * ${(QB.r1 - QB.r0).toFixed(1)}, y = (uLayer - 0.5) * ${(2 * QB.y).toFixed(2)};
    float RT = 30.0, ar = 6.0, ay = 1.5;
    vec3 q = bandQ(r, a, y);
    // Outward the band tapers to a third of its height and frays (Tom, 2026-11-24).
    float taper = smoothstep(RT, 39.0, r);
    float ayr = ay * (1.0 - 0.65 * taper);
    // The top and bottom feather off as volume (Tom, 2026-11-24).
    float feather = exp(-0.5 * y * y / (ayr * ayr));
    // The middle of the band is denser; toward the end the dust breaks into separate streaks.
    float fill = exp(-pow((r - RT) / (ar * 0.5), 2.0)) * feather - 0.9 * taper;
    float edge = smoothstep(RT - ar * 1.1, RT - ar * 0.85, r) * smoothstep(39.8, 36.0, r);
    // Past the middle the dust splits into spiral fingers that fan out and trail.
    float fing = smoothstep(0.35, 0.85, 0.5 + 0.5 * sin(14.0 * atan(q.z, q.x) + 4.0 * hn(q * 0.3)));
    float dd = torusDust(q, fill) * mix(1.0, fing, taper) * edge * feather;
    // The shade: dust a step toward the hole.
    float sh = smoothstep(0.55, 0.3, wor(bandQ(r - 0.9, a, y) * 0.45));
    o = vec4(dd, sh, 0.0, 1.0);
  } else {
    float r = ${QC.r0.toFixed(1)} + fy * ${(QC.r1 - QC.r0).toFixed(1)}, y = (uLayer - 0.5) * ${(2 * QC.y).toFixed(2)};
    // The layer rises as the disc flares.
    float hc = 2.5 + 0.15 * r;
    float env = smoothstep(8.0, 12.0, r) * smoothstep(28.0, 22.0, r) * exp(-pow((abs(y) - hc) / 2.4, 2.0));
    float cd = blrDust(blrQ(r, a, y), env);
    // The shade: cloud a step toward the hole, along the line to it.
    float k = 1.0 - 1.4 / length(vec2(r, y));
    float sh = blrDust(blrQ(r * k, a, y * k), env);
    o = vec4(cd, sh, 0.0, 1.0);
  }
}`;

// The black holes' sky pass at a lower size comes back up through Catmull-Rom.
// Nine bilinear taps keep the photon ring thin.
const UP = `${HEAD}
uniform sampler2D uSrc;
in vec2 vUv;
out vec4 o;
void main() {
  vec2 sz = vec2(textureSize(uSrc, 0));
  vec2 p = vUv * sz - 0.5, f = fract(p), t = floor(p) + 0.5;
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
  vec2 w3 = f * f * (-0.5 + 0.5 * f);
  vec2 w12 = w1 + w2, o12 = w2 / w12;
  vec2 a = (t - 1.0) / sz, b = (t + o12) / sz, c = (t + 2.0) / sz;
  vec4 s = texture(uSrc, vec2(a.x, a.y)) * w0.x * w0.y + texture(uSrc, vec2(b.x, a.y)) * w12.x * w0.y + texture(uSrc, vec2(c.x, a.y)) * w3.x * w0.y
    + texture(uSrc, vec2(a.x, b.y)) * w0.x * w12.y + texture(uSrc, b) * w12.x * w12.y + texture(uSrc, vec2(c.x, b.y)) * w3.x * w12.y
    + texture(uSrc, vec2(a.x, c.y)) * w0.x * w3.y + texture(uSrc, vec2(b.x, c.y)) * w12.x * w3.y + texture(uSrc, vec2(c.x, c.y)) * w3.x * w3.y;
  // Catmull-Rom can ring below zero at the shadow's edge.
  o = max(s, 0.0);
}`;

// The holes' cloud bake: longitude, log radius and height in the disc's frame.
const HB_W = 512, HB_H = 128, HB_D = 32;
// The noise has five octaves; one bake at load serves every hole.
const HBAKE = `${HEAD}
precision highp sampler3D;
uniform sampler3D uNoise;
// This layer's height place: 0 at the layer's foot, 1 at its top.
uniform float uLayer;
out vec4 o;
const float TAU = 6.2831853, CB0 = 2.4, CB1 = 24.0, CREACH = 2.2;
float holeH(float r) { return 0.3 + 0.06 * r; }
// Smooth value noise: the lookup snaps to texel centres and blends on a smooth curve.
float sn(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return texture(uNoise, (i + f + 0.5) / ${NOISE_N.toFixed(1)}).r;
}
// Five octaves, each turned, so no grid lines up.
float fb5(vec3 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 5; i++) { s += a * sn(p); p = p.yzx * 2.03 + 1.7; a *= 0.5; }
  return s / 0.96875;
}
// The cloud noise at a longitude, radius and height: long along the orbit, fine across it.
float cloudN(float phi, float r, float y) {
  float lr = log(r);
  float a = fb5(vec3(cos(phi) * 3.2, sin(phi) * 3.2, lr * 7.0 + y * 0.9));
  float b = fb5(vec3(cos(phi) * 4.1 + y * 1.1, lr * 6.0 + 9.3, sin(phi) * 4.1));
  // Two lookups break each one's lines of sameness; the stretch restores the contrast.
  return clamp((0.5 * (a + b) - 0.5) * 2.2 + 0.5, 0.0, 1.0);
}
void main() {
  float phi = gl_FragCoord.x / ${HB_W}.0 * TAU;
  float r = CB0 * pow(CB1 / CB0, gl_FragCoord.y / ${HB_H}.0);
  float y = (uLayer * 2.0 - 1.0) * CREACH * holeH(r);
  float n = cloudN(phi, r, y);
  // The emboss: how much denser the cloud is a little farther out, so inner faces show.
  o = vec4(n, cloudN(phi, r * 1.03, y) - n, 0.0, 0.0);
}`;

const VOL = `${HEAD}
precision highp sampler3D;
uniform sampler3D uNoise;
// The haze and corona bake; uBaked is 1 once it holds the current star.
uniform sampler3D uBake;
uniform float uBaked;
uniform vec4 uView;
uniform mat3 uToSun;
uniform float uTime, uDens, uDust, uLight, uCorona, uBend;
// A binary's gas: the partner (centre in R, on), its disc, its axis, and the stream's path.
// uGas: on, scattered light, own heat. uPath: 12 points in R and the stream's width.
uniform vec4 uBin, uBinD, uBinN, uGas, uPath[12];
// A pulsar's beams through dust: the magnetic axis in the view frame, and the beams' light.
uniform vec4 uLh;
// The same flash weight: a fast spin may not strobe the forward lobe.
uniform float uFlashW;
in vec2 vUv;
out vec4 o;
${VOLFN}
// Less haze straight in front of the disk, so the star's face stays clear.
float face(vec3 p) { return 1.0 - 0.5 * smoothstep(0.2 * R, 1.2 * R, p.z) * smoothstep(1.1 * R, 0.6 * R, length(p.xy)); }
// The density: a shell of haze round the star, and clouds of dust in it.
float dens(vec3 p, bool lite) {
  // No haze: skip the seven noise taps.
  if (uDens <= 0.0) return 0.0;
  // The haze sits in the star's frame, so it turns with the star.
  return uDens * face(p) * hazeQ(uToSun * p, vec3(uTime * 0.00012, 0.0, uTime * 0.00006), lite);
}
float corona(vec3 p) { return coronaQ(uToSun * p); }
// The bake's place for a direction in the star's frame: longitude and colatitude.
vec2 bakeDir(vec3 q, float r) { return vec2(atan(q.x, q.z) / TAU + 0.5, acos(clamp(q.y / r, -1.0, 1.0)) / PI); }
// The bake's texel on that direction at radius r: full noise, lite noise, corona.
vec4 bakeAt(vec2 dir, float r) {
  if (r < R || r > RB) return vec4(0.0);
  return texture(uBake, vec3(dir, sqrt((r - R) / (RB - R))));
}
// The self-shadow on the bake: lite taps at 40, 110 and 260 units toward the star.
// p: the point in the view frame; r: its radius.
float lightB(vec3 p, vec2 dir, float r) {
  vec3 k = -p / r;
  float sum = 0.0;
  sum += face(p + k * 40.0) * hazeF(bakeAt(dir, r - 40.0).g, r - 40.0) * step(R, r - 40.0) * 40.0;
  sum += face(p + k * 110.0) * hazeF(bakeAt(dir, r - 110.0).g, r - 110.0) * step(R, r - 110.0) * 70.0;
  sum += face(p + k * 260.0) * hazeF(bakeAt(dir, r - 260.0).g, r - 260.0) * step(R, r - 260.0) * 150.0;
  return k3(uDens * sum * SIG * ABSORB * 0.5, smoothstep(R + 40.0, R + 300.0, r));
}
// A binary's gas, in donor radii: the partner's flared disc and the stream that feeds it.
// One noise cell is a quarter radius. Plain trilinear blending shows its cells as boxes,
// so the lookup snaps to texel centres and blends them on a smooth curve.
float gn1(vec3 p) {
  vec3 x = p * 4.0, i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return texture(uNoise, (i + f + 0.5) / ${NOISE_N.toFixed(1)}).r;
}
// Two octaves, the second turned, so no grid lines up.
float gn(vec3 p) { return 0.65 * gn1(p) + 0.35 * gn1(p.zxy * 2.07 + 5.3); }
// The disc's own frame: height h over the plane, radius s, and the angle phi from the donor.
// phi starts on the line to the donor, so the tidal arms hold still in the pair's frame.
vec3 discAt(vec3 p) {
  vec3 q = p - uBin.xyz, n = uBinN.xyz;
  float h = dot(q, n);
  vec3 pl = q - h * n;
  vec3 d0 = -uBin.xyz - dot(-uBin.xyz, n) * n;
  vec3 e1 = normalize(d0 + vec3(1e-4, 0.0, 0.0));
  return vec3(h, length(pl), atan(dot(pl, cross(n, e1)), dot(pl, e1)));
}
// Two tidal spiral arms, raised by the donor's pull, winding in toward the hidden star.
float arms(float s, float phi) {
  return pow(0.5 + 0.5 * cos(2.0 * (phi + 2.2 * log(max(s, 0.05) / uBinD.x))), 2.0);
}
// The band between the stars: a tube along the path gravity traced, broadest at the donor's neck.
// Clumps flow down it toward the disc.
float stream(vec3 p) {
  // A cheap bound: far from the line from the donor to the rim, nothing lies.
  vec3 a0 = uPath[0].xyz, ab0 = uPath[11].xyz - a0;
  vec3 d0 = p - a0 - ab0 * clamp(dot(p - a0, ab0) / dot(ab0, ab0), 0.0, 1.0);
  if (dot(d0, d0) > 1.2) return 0.0;
  float st = 0.0;
  for (int i = 0; i < 11; i++) {
    vec3 a = uPath[i].xyz, ab = uPath[i + 1].xyz - a;
    float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
    float w = mix(uPath[i].w, uPath[i + 1].w, t);
    vec3 dd = p - a - ab * t;
    st = max(st, exp(-dot(dd, dd) / (w * w)));
  }
  return st * (0.6 + 0.8 * gn(p * 6.0 - vec3(uTime * 0.6, 0.0, 0.0)));
}
float gas(vec3 p) {
  vec3 g = discAt(p);
  float h = g.x, s = g.y, phi = g.z, rd = uBinD.x;
  // Thin inside, flaring toward the rim, as an accretion disc does.
  float H = uBinD.y * 0.16 * (0.35 + 0.65 * pow(min(s / rd, 1.0), 1.2));
  float disc = smoothstep(rd * 1.05, rd * 0.5, s) * smoothstep(0.04, 0.2, s) * exp(-h * h / (2.0 * H * H));
  // Gas turns at the Kepler rate in streaks that shear and reset unseen.
  float x = uTime * 0.35 * pow(max(s, 0.2), -1.5) / 1.5708;
  float fa = fract(x), fb = fract(x + 0.5), wa = 1.0 - abs(2.0 * fa - 1.0);
  float pa = phi - 1.5708 * fa + 2.3 * floor(x), pb = phi - 1.5708 * fb + 2.3 * floor(x + 0.5) + 1.7;
  float ta = gn(vec3(cos(pa) * 3.0, sin(pa) * 3.0, s * 5.0 + h * 2.0));
  float tb = gn(vec3(cos(pb) * 3.0, sin(pb) * 3.0, s * 5.0 + h * 2.0 + 21.0));
  float tur = mix(tb, ta, wa);
  disc *= (0.2 + 1.6 * tur * tur) * (0.45 + 1.1 * arms(s, phi));
  // A raised rim where the stream piles in: thicker and denser near the edge.
  float rim = exp(-pow((s - 0.86 * rd) / (0.1 * rd), 2.0)) * exp(-h * h / (2.0 * pow(H * 1.3, 2.0))) * (0.5 + tur);
  return disc + 0.35 * rim + 1.3 * stream(p);
}
// The gas's own heat: the inner disc burns hotter, brightest along the arms;
// the band glows along its length; the hot spot where it strikes the rim.
float gasHeat(vec3 p) {
  vec3 g = discAt(p);
  vec3 e = p - uPath[11].xyz;
  float inner = exp(-g.y / (0.28 * uBinD.x)) * (0.5 + arms(g.y, g.z));
  // The hot spot spreads along the rim: a brightening, not a glob.
  return 0.9 * inner + 0.7 * stream(p) + 0.45 * exp(-dot(e, e) / 0.18);
}

// The self-shadow toward the star: three lite taps, then the K3 shading.
float lightT(vec3 p) {
  vec3 k = -normalize(p);
  float sum = dens(p + k * 40.0, true) * 40.0 + dens(p + k * 110.0, true) * 70.0 + dens(p + k * 260.0, true) * 150.0;
  return k3(sum * SIG * ABSORB * 0.5, smoothstep(R + 40.0, R + 300.0, length(p)));
}
void main() {
  vec2 P = uView.xy + (vUv * 2.0 - 1.0) * uView.zw;
  float r = length(P);
  // The corona reaches far, so the march does too when it shows.
  // A binary's gas reaches past its partner, so the march does too, in more steps.
  bool bin = uGas.x > 0.0, lh = uLh.w > 0.0;
  float reach = bin ? 7.6 * R : lh ? 6.5 * R : uCorona > 0.0 ? 3.4 * R : 2.2 * R;
  float z1 = r < R ? sqrt(R * R - r * r) : -reach;
  float z0 = reach;
  // The bake carries the haze and the corona: more steps, and no dither to hide.
  // A binary's gas and a pulsar's beams still march live, with the dither.
  bool bk = uBaked > 0.0 && !bin && !lh;
  int N = bk ? 72 : bin || lh ? 48 : 32;
  // A ray that passes outside the reach meets nothing.
  if (r > reach) { o = vec4(0.0, 0.0, 0.0, 1.0); return; }
  float dt = (z0 - z1) / float(N);
  // Interleaved gradient noise, stepped each frame so no pattern holds still.
  float j = bk ? 0.5 : fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))) + 0.618034 * floor(uTime * 30.0));
  float T = 1.0;
  float acc = 0.0, accG = 0.0, accL = 0.0;
  for (int i = 0; i < 72; i++) {
    if (i >= N) break;
    vec3 p = vec3(P, z0 - dt * (float(i) + j));
    // A pulsar's lighthouse: two narrow beams sweep through a faint fog of dust and light it.
    // A beam aimed near the eye scatters forward hardest, so its sweep past the eye flashes.
    if (lh) {
      vec3 pr = p / R;
      float rr = length(pr);
      if (rr > 1.05) {
        vec3 u = pr / rr;
        float c = dot(u, uLh.xyz);
        float th = sqrt(max(2.0 * (1.0 - abs(c)), 0.0));
        float cone = exp(-pow(th / 0.09, 2.0)) + 0.2 * exp(-pow(th / 0.28, 2.0));
        float fog = 0.2 + 1.6 * pow(gn(pr * 2.5 + vec3(0.0, 0.0, uTime * 0.05)), 2.0);
        float fwd = mix(1.0, hg(u.z, 0.55) * 12.56637, uFlashW);
        accL += T * uLh.w * cone * fog * fwd * exp(-(rr - 1.0) / 3.5) * dt / R * 0.28;
      }
    }
    // A binary's gas: lit by the donor with the K3 shading, and glowing with its own heat.
    if (bin) {
      vec3 pr = p / R;
      float g = gas(pr);
      if (g > 0.004) {
        float rr = length(pr);
        vec3 k = -pr / rr;
        // Self-shadow: two taps toward the donor, then Beer, the scatter lobe and the powder term.
        float tau = (gas(pr + k * 0.25) * 0.25 + gas(pr + k * 0.7) * 0.45) * ABSORB * 1.3;
        float base = exp(-tau) + exp(-tau * 0.25) * 0.5;
        float lit = clamp(mix(base, base * (1.0 - exp(-tau * 2.0)), POWDER) + AMBIENT, 0.0, 1.0);
        float al = 1.0 - exp(-g * 2.6 * dt / R);
        // The donor lights the gas only a little, so the cloud stays dark.
        acc += T * al * uGas.y * lit * hg(normalize(p).z, G_HG) * 12.56637 / (rr * rr);
        // The hidden star inside lights the gas from within: its light diffuses out through the cloud.
        vec3 tc = uBin.xyz - pr;
        float dc = length(tc);
        vec3 kc = tc / max(dc, 1e-3);
        float tauC = (gas(pr + kc * min(0.2, dc * 0.4)) * min(0.2, dc * 0.4) + gas(pr + kc * dc * 0.7) * dc * 0.5) * ABSORB;
        float inner = exp(-tauC) + 0.35 * exp(-tauC * 0.3);
        // A soft falloff, so the heart glows without burning to a flat white.
        accG += T * al * (uGas.w * inner / (dc * dc + 0.35) * hg(-kc.z, 0.3) * 12.56637 + uGas.z * gasHeat(pr));
        T *= 1.0 - al;
        if (T < 0.02) break;
      }
    }
    // On the bake: the point's direction and radius in the star's frame, and its texel.
    vec3 q = uToSun * p;
    float rq = length(q);
    vec2 dir = bk ? bakeDir(q, rq) : vec2(0.0);
    vec4 b = bk ? bakeAt(dir, rq) : vec4(0.0);
    if (uCorona > 0.0) {
      // Thomson scattering: brightest seen side on, a cos squared lobe toward the eye.
      float cz = normalize(p).z;
      acc += T * (bk ? b.b : corona(p)) * (0.75 * (1.0 + cz * cz)) * dt * 0.0009 * uCorona;
    }
    float d = bk ? (rq > R && rq < RB ? uDens * face(p) * hazeF(b.r, rq) : 0.0) : dens(p, false);
    if (d < 0.002) continue;
    float rr = length(p);
    // The light falls with the square of the distance; it travels outward from the star.
    float Ls = uLight * R * R / (rr * rr);
    float ph = hg(normalize(p).z, G_HG) * 12.56637;
    float al = 1.0 - exp(-d * SIG * dt);
    // Dust absorbs as well as scatters: an albedo below one, so lanes darken the light.
    float lt = bk ? lightB(p, dir, rq) : lightT(p);
    acc += T * al * 0.6 * Ls * lt * ph;
    T *= 1.0 - al;
    if (T < 0.02) break;
  }
  // Blue holds the lighthouse: the final pass keeps it over the disk, where its flash peaks.
  o = vec4(acc, accG, accL, T);
}`;

// The haze keeps a running blend of its frames, so the march's moving dither averages out (Tom, 2026-11-24).
// uW is the history's weight: high while the view rests, low while it moves.
const ACC = `${HEAD}
uniform sampler2D uCur, uHist;
uniform float uW;
in vec2 vUv;
out vec4 o;
void main() { o = mix(texture(uCur, vUv), texture(uHist, vUv), uW); }`;

// Dev picture options (Tom, 2026-11-24): motion blur from the camera's move, then frame blending.
// uMv maps this frame's uv to where that point stood last frame: uv * xy + zw.
// uBlur: the shutter, 0 to 1 of the move. uBlend: the last frame's share.
const POST = `${HEAD}
uniform sampler2D uSrc, uPrev;
uniform vec4 uMv;
uniform float uBlur, uBlend;
in vec2 vUv;
out vec4 o;
void main() {
  vec2 back = (vUv * uMv.xy + uMv.zw - vUv) * uBlur;
  // Eight taps across the move, centred on this frame; with no blur, one.
  vec3 c = texture(uSrc, vUv).rgb;
  if (uBlur > 0.0) {
    c = vec3(0.0);
    for (int i = 0; i < 8; i++) c += texture(uSrc, vUv + back * (float(i) / 7.0 - 0.5)).rgb;
    c /= 8.0;
  }
  o = vec4(mix(c, texture(uPrev, vUv).rgb, uBlend), 1.0);
}`;
// Copies a texture to the screen.
const COPY = `${HEAD}
uniform sampler2D uSrc;
in vec2 vUv;
out vec4 o;
void main() { o = texture(uSrc, vUv); }`;

// A three-tap blur along one axis: it hides the march dither, as in Fire.
const BLUR = `${HEAD}
uniform sampler2D uSrc;
uniform vec2 uStep;
in vec2 vUv;
out vec4 o;
void main() {
  vec2 s = uStep / vec2(textureSize(uSrc, 0));
  o = texture(uSrc, vUv) * 0.4 + (texture(uSrc, vUv + s) + texture(uSrc, vUv - s)) * 0.2 + (texture(uSrc, vUv + 2.0 * s) + texture(uSrc, vUv - 2.0 * s)) * 0.1;
}`;

// A tiling value-noise volume, smoothed once so its cells do not show.
function noiseVolume(n) {
  const raw = new Float32Array(n * n * n);
  let seed = 1234567;
  for (let i = 0; i < raw.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; raw[i] = seed / 4294967296; }
  const out = new Uint8Array(n * n * n);
  const at = (x, y, z) => raw[((z + n) % n) * n * n + ((y + n) % n) * n + ((x + n) % n)];
  for (let z = 0; z < n; z++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let sum = 0;
    for (let c = -1; c <= 1; c++) for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) sum += at(x + a, y + b, z + c);
    // Stretch the smoothed values back toward the full range.
    out[z * n * n + y * n + x] = Math.max(0, Math.min(255, Math.round((sum / 27 - 0.5) * 3.2 * 255 + 127.5)));
  }
  return out;
}

/* ---------- final: heat bend, grade, volume, bodies, lens, film ---------- */
const FINAL = `${HEAD}
uniform sampler2D uHdr, uBloom, uRays, uLut, uVol;
uniform vec4 uSat[${MAX_FLARES}];
uniform vec4 uView, uMix, uBodyA, uBodyB, uCam, uFilm, uFx1, uFx2, uFx3, uFx4, uFx5;
uniform vec2 uBodyK;
// The Sun's egg: the ship's x, y and size in pixels and weight; heading, shield slant, glint.
uniform vec4 uShip, uShip2;
// The pale blue dot: its x and y in pixels, the ray's weight, the dot's weight.
uniform vec4 uDot;
uniform vec3 uHal, uStreak;
// The far lens's sway with the mouse, -1 to 1 on each axis.
uniform vec2 uSway;
// A black hole: on, and the lensed stars' gain.
uniform vec2 uHoleF;
// A runaway: on, heading, size in R, kind (0 bow shock, 1 wake); and its colour.
uniform vec4 uBow;
uniform vec3 uBowC;
// A pulsar's pulse: 1 while a beam crosses the eye, 0 between; below 0 for any other star.
uniform float uPulse;
// A magnetar's giant flare: the flash, the fireball's radius in R, its light, the pulsing tail.
uniform vec4 uQuake;
uniform vec2 uRes, uC;
uniform float uFrame, uTime, uExpo, uSc, uRow, uLens, uHaze, uFull;
// Device pixels per CSS pixel: screen-fixed effects keep their size in CSS pixels.
uniform float uDpr;
// The star switch's fade: 1 is full light, 0 is black.
uniform float uDip;
in vec2 vUv;
out vec4 o;
const float R = ${R.toFixed(1)};
${NOISE}
float hash(vec2 p) { p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
// PCG3D (Jarzynski and Olano 2020): three independent 32-bit draws.
uvec3 pcg3(uvec3 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  return v;
}
// The kernel's white core, added to the hot light before the grade.
float kern(vec2 fc) {
  float s = 0.0;
  for (int k = 0; k < ${MAX_FLARES}; k++) {
    float S = uSat[k].z;
    if (S <= 0.0) continue;
    vec2 d = (fc - uSat[k].xy) / uSc;
    s += S * (6.0 * exp(-dot(d, d) / 90.0) + 1.2 * exp(-dot(d, d) / 2400.0));
  }
  return s;
}
vec2 sig(vec2 uv, float kx) {
  vec4 v = texture(uVol, uv);
  float lb = v.b;
  // No haze over the disk, save on dusty stars: it read as blobs on every star.
  float off = smoothstep(R * 0.97, R * 1.03, length(uView.xy + (uv * 2.0 - 1.0) * uView.zw));
  v = mix(vec4(0.0, 0.0, 0.0, 1.0), v, max(off, min(uFilm.w, 1.0)));
  // The volume dims what lies behind it and adds the star light it scatters.
  vec3 h = (texture(uHdr, uv).rgb + texture(uRays, uv).rgb * uMix.x * uFx1.y) * v.a + texture(uBloom, uv).rgb * 0.38 * uFx1.x;
  // The volume's green holds a binary's glowing gas: it takes the cool ramp.
  return vec2(h.r * uMix.y + kx + v.r + lb, h.g * uMix.z + v.r * 0.15 + v.g);
}
// Tone curves on the scene light x; each returns a place on the ramp, 0 to 1.
// ACES: the Narkowicz fit, then display gamma.
// ACES, the house curve (Tom, 2026-11-24): its exposure and gamma are fitted to Film's shadows and mids.
// The colour ramps carry the display response, so the gamma is 1.4, not 2.2; the highlights keep ACES's roll-off.
float toneAces(float x) { x *= 0.4; return pow(clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0), 1.0 / 1.4); }
// AgX: a log2 encoding, then its default contrast curve.
float toneAgx(float x) {
  float e = clamp((log2(max(x, 1e-6)) + 12.47393) / 16.5, 0.0, 1.0);
  float e2 = e * e, e4 = e2 * e2;
  return clamp(15.5 * e4 * e2 - 40.14 * e4 * e + 31.96 * e4 - 6.868 * e2 * e + 0.4298 * e2 + 0.1191 * e - 0.00232, 0.0, 1.0);
}
vec3 grade(vec2 s) {
  float I = s.x + s.y;
  // The full view shows the whole bright disk, so it takes less exposure.
  float x = I * uExpo * uFx3.y * (1.0 - 0.15 * uLens) * (1.0 - 0.5 * uFull);
  // Real light: the exposure rises as the view pulls back, so the disk burns white.
  x *= uFx3.w;
  // uFx4.x picks the curve: 0 film, 1 ACES, 2 AgX.
  float t = uFx4.x < 0.5 ? 1.0 - exp(-x) : uFx4.x < 1.5 ? toneAces(x) : toneAgx(x);
  // The long lens presses the tones: a slightly darker, harder curve.
  t = pow(t, 1.0 + 0.15 * uLens);
  float fr = s.y / max(I, 1e-5);
  vec3 a = texture(uLut, vec2(t, (uRow * 2.0 + 0.5) / ${LUTS.length.toFixed(1)})).rgb;
  vec3 b = texture(uLut, vec2(t, (uRow * 2.0 + 1.5) / ${LUTS.length.toFixed(1)})).rgb;
  return mix(a, b, fr);
}
// The look: a sun-glare preset, then contrast, saturation and warmth.
// uFx4.y: 0 none, 1 furnace, 2 viewing glass, 3 bleach, 4 gold haze.
vec3 look(vec3 c) {
  float k = uFx4.y;
  float con = uFx4.z, sat = uFx4.w, warm = uFx5.x;
  if (k > 0.5 && k < 1.5) {
    // Furnace: highlights burn gold to white, warm blacks crush.
    float l = dot(c, vec3(0.3, 0.55, 0.15));
    c = mix(c, vec3(1.0, 0.86, 0.55), smoothstep(0.45, 0.95, l) * 0.45);
    c = pow(c, vec3(1.15, 1.25, 1.45));
    con *= 1.25; warm += 0.35;
  } else if (k > 1.5 && k < 2.5) {
    // Viewing glass: a dark welder's filter; only the bright star shows, crisp.
    float l = dot(c, vec3(0.3, 0.55, 0.15));
    c *= smoothstep(0.35, 1.0, l) * 1.6;
    c *= vec3(1.0, 0.72, 0.38);
    con *= 1.4;
  } else if (k > 2.5 && k < 3.5) {
    // Bleach: the silver kept; colour drops, contrast climbs.
    sat *= 0.45; con *= 1.45;
  } else if (k > 3.5) {
    // Gold haze: blacks lift, the frame softens into gold.
    c = mix(vec3(0.07, 0.05, 0.02), vec3(1.0), c);
    con *= 0.8; warm += 0.45;
  }
  c = clamp((c - 0.5) * con + 0.5, 0.0, 1.0);
  float g = dot(c, vec3(0.3, 0.55, 0.15));
  c = mix(vec3(g), c, sat);
  c *= vec3(1.0 + 0.12 * warm, 1.0 + 0.02 * warm, 1.0 - 0.16 * warm);
  return c;
}
${FLARE}
// The Buoy Business anamorphic flare, in the star's own colour (Tom, 2026-11-24).
// The parts replace flBuoy: its warm pull turns blue streaks grey.
// The toy's gains: orb, streak, ghosts, on the graded frame.
const vec3 SL_FLARE = vec3(0.32, 0.55, 0.18);
// One ghost: a soft disc with a brighter rim, as an aperture ghost shows.
float ringGhost(vec2 uv, vec2 at, float asp, float r) {
  return max(flGhost(uv, at, asp, r) - 0.55 * flGhost(uv, at, asp, r * 0.7), 0.0);
}
// src is in pixels; g scales the whole flare; fall sets the orb's width.
// len sets the streak's falloff; reach, in frame heights, is where it ends.
vec3 lensFlare(vec2 src, float g, float fall, float len, float reach) {
  vec2 uv = gl_FragCoord.xy / uRes, s = src / uRes;
  float asp = uRes.x / uRes.y;
  vec2 d = flOffset(uv, s, asp, 1.0);
  vec3 orb = mix(uStreak, vec3(1.0), 0.45) * flOrb(d, fall) * SL_FLARE.x * uFx5.y;
  // The streak tapers out before the frame's edge, as a real lens streak does.
  float cut = smoothstep(reach, reach * 0.45, abs(d.x));
  vec3 line = uStreak * flLine(d, FL_BB.x, len) * cut * SL_FLARE.y * uFx2.x;
  // Ghosts lie on the line through the frame's centre.
  // A light near the centre still throws them a little off axis.
  // The mouse sway moves the lens's optical centre, so the ghosts swing.
  vec2 toC = vec2(0.5) + uSway * vec2(0.025, 0.02) - s;
  toC = mix(vec2(-0.16, 0.11), toC, smoothstep(0.0, 0.15, length(toC)));
  float gh = 0.9 * ringGhost(uv, s + toC * 0.7, asp, 0.04) + 0.5 * ringGhost(uv, s + toC * 2.2, asp, 0.13);
  float gc = 0.7 * ringGhost(uv, s + toC * 1.4, asp, 0.08) + 0.4 * flGhost(uv, s - toC * 0.45, asp, 0.025);
  vec3 ghost = (mix(uStreak, uStreak * FL_ORANGE, 0.4) * gh + mix(uStreak.bgr, vec3(0.6, 0.9, 0.8), 0.5) * gc) * SL_FLARE.z * uFx5.z;
  return (orb + line + ghost) * g;
}
// A sparse starfield in two layers, most stars faint; yaw and pitch slide it.
vec3 starfield(vec2 fc) {
  vec3 acc = vec3(0.0);
  for (int l = 0; l < 2; l++) {
    float fine = l == 0 ? 1.0 : 0.0;
    float cell = mix(26.0, 9.0, fine) * uSc;
    // The sway slides the near layer more than the far one: a little depth.
    vec2 q = (fc - uSway * uRes.y * mix(0.008, 0.003, fine)) / cell + vec2(17.3, 5.1) * float(l) + uCam.xy * vec2(-30.0, 30.0) * mix(1.0, 0.6, fine);
    vec2 id = floor(q), f = fract(q) - 0.5;
    if (hash(id + float(l) * 13.1) > mix(0.22, 0.07, fine)) continue;
    vec2 at = (vec2(hash(id + 3.7), hash(id + 9.1)) - 0.5) * 0.8;
    float dd = length((f - at) * cell) / uSc;
    float b = mix(0.9, 0.35, fine) * pow(hash(id + 21.3), 3.0) + 0.04;
    vec3 col = mix(vec3(1.0, 0.8, 0.62), vec3(0.72, 0.84, 1.0), hash(id + 5.5));
    acc += col * b * exp(-dd * dd / mix(1.1, 0.5, fine));
  }
  return acc;
}
// Hash without Sine, 2 in and 4 out (Dave Hoskins, MIT).
vec4 hash42(vec2 p) {
  vec4 q = fract(vec4(p.xyxy) * vec4(0.1031, 0.1030, 0.0973, 0.1099));
  q += dot(q, q.wzxy + 33.33);
  return fract((q.xxyz + q.yzzw) * q.zywx);
}
// One galaxy: an exponential profile of scale s, axis ratio e, turned by a.
float galaxy(vec2 q, float s, float e, float a) {
  vec2 r = vec2(cos(a) * q.x + sin(a) * q.y, -sin(a) * q.x + cos(a) * q.y);
  r.y /= e;
  return exp(-length(r) / s);
}
// The deep field behind the lens, in the source plane, in R: two layers of hashed galaxies.
// Far galaxies redden; nearer ones are blue spirals and pale ellipticals.
// k scales the cells to the lens: specks, small galaxies and a few large ones.
vec3 deepField(vec2 b, float k) {
  vec3 col = vec3(0.0);
  for (int L = 0; L < 3; L++) {
    float cell = k * (L == 0 ? 0.011 : L == 1 ? 0.04 : 0.15);
    vec2 g = floor(b / cell);
    for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) {
      vec2 id = g + vec2(dx, dy);
      vec4 h = hash42(id + float(L) * 71.3);
      if (h.w < (L == 0 ? 0.2 : L == 1 ? 0.5 : 0.8)) continue;
      vec2 c = (id + h.xy) * cell;
      float sz = cell * (L == 0 ? 0.03 + 0.04 * h.z : L == 1 ? 0.04 + 0.05 * h.z : 0.03 + 0.05 * h.z);
      float I = galaxy(b - c, sz, 0.25 + 0.75 * fract(h.z * 7.0), h.x * 6.283);
      vec3 tint = mix(vec3(0.55, 0.68, 1.0), vec3(1.0, 0.42, 0.28), fract(h.y * 13.0));
      col += tint * I * (L == 0 ? 0.1 + 0.25 * fract(h.w * 31.0) : 0.15 + 0.4 * fract(h.w * 31.0));
    }
  }
  return col;
}
// A point of light: a hard core in a soft glow that falls off slowly, no spikes (Tom, 2026-11-24).
// len sets how far the glow reaches, in R.
float pip(vec2 d, float pw, float len) {
  float r = length(d);
  return exp(-r * r / (pw * pw * 2.0)) + 0.5 * exp(-r / (pw * 2.5)) + 0.12 * exp(-r / len);
}
// A strong lens round a far star (Tom, 2026-11-24): the light is traced, not drawn.
// q: the view in R, turned so the lens lies along +x; Pv: the same point unturned.
// The lens is a singular isothermal sphere uBow.z radii off, its Einstein radius 0.86 of that:
// so the star sits by the critical curve, hugely magnified, and shows twice.
// Each pixel looks back through the lens to the source plane: b = t - tE t/|t|.
vec3 lensScene(vec2 q, vec2 Pv) {
  float D = uBow.z, tE = 0.86 * D;
  // The mouse sway slides the layers by depth: the foreground stars most, the cluster less, the deep field least.
  // The lens is traced from the shifted places, so the arcs flow and re-form as the view sways.
  vec2 ax = vec2(cos(uBow.y), sin(uBow.y));
  vec2 sw = vec2(dot(uSway, ax), ax.x * uSway.y - ax.y * uSway.x) * D * 0.07;
  vec2 lens = vec2(D, 0.0) + sw * 0.5;
  vec2 t = q - lens;
  float tl = max(length(t), 1e-3);
  vec2 b = t - tE * t / tl + sw * 0.35;
  float pw = max(length(fwidth(q)), 1e-3);
  // The host galaxy, round the star's own source position: a clumpy disc in uBowC with blue knots.
  vec2 bs = vec2(-(D - tE), 0.0) + sw * 0.35;
  vec2 hq = b - bs - vec2(0.004, 0.006) * D;
  float host = galaxy(hq, 0.011 * D, 0.7, 0.8);
  float knots = 0.0;
  for (int k = 0; k < 7; k++) {
    vec4 h = hash42(vec2(float(k), 3.7));
    knots += galaxy(hq - (h.xy - 0.5) * 0.03 * D, (0.0016 + 0.002 * h.z) * D, 1.0, 0.0);
  }
  vec3 col = uBowC * host * 0.9 + vec3(0.7, 0.8, 1.0) * knots * 0.6;
  // Every galaxy behind the cluster is bent too: arcs and arclets ring it.
  col += deepField(b + vec2(13.7, -5.1) * D * 0.01, D);
  // The cluster in front: a giant elliptical at the centre in its own halo, members round it, gold.
  vec3 gold = vec3(1.0, 0.8, 0.52);
  col += gold * (1.6 * galaxy(t, 0.016 * D, 0.72, 0.4) + 0.16 * exp(-tl / (0.35 * tE)));
  for (int k = 0; k < 48; k++) {
    vec4 h = hash42(vec2(float(k) * 1.37, 9.1));
    vec2 c = (h.xy - 0.5) * 2.6 * tE * sqrt(h.z);
    col += gold * galaxy(t - c, (0.0025 + 0.008 * h.w * h.w) * D, 0.45 + 0.5 * h.z, h.x * 6.283) * (0.5 + 0.8 * h.w);
  }
  // A few foreground stars of our own galaxy.
  for (int k = 0; k < 3; k++) {
    vec4 h = hash42(vec2(float(k) + 41.0, 2.3));
    vec2 c = vec2((h.x - 0.2) * 2.2 * D, (h.y - 0.5) * 1.6 * D);
    col += vec3(0.85, 0.9, 1.0) * pip(q - c - sw, pw, (0.004 + 0.008 * h.z) * D) * 0.5 * h.w;
  }
  // The star itself, twice: here, burning, and its fainter counter-image past the cluster.
  // The counter-image follows the lens: it stands at b - tE b/|b| from the lens centre, b the star's source place.
  vec2 sb = -lens - tE * normalize(-lens) + sw * 0.35;
  vec2 ci = lens + sb - tE * sb / max(length(sb), 1e-3);
  col += vec3(1.0) * pip(Pv, pw, 0.012 * D) * 1.4;
  col += vec3(1.0) * pip(q - ci, pw, 0.007 * D) * 0.45;
  return col;
}
// The Crab Nebula, in R along its long axis; not to scale: the true nebula is 11 light years wide.
// A blue synchrotron glow from the pulsar's wind fills an oval cage of red and gold filaments.
// The helium torus crosses the pulsar; a faint jet leaves along its axis.
vec3 crabNeb(vec2 q) {
  float S = uBow.z;
  vec2 u = q / (S * vec2(1.0, 0.68));
  // The rim is ragged: the shell's edge wanders by about a tenth.
  float a = atan(u.y, u.x);
  float e = length(u) / (1.0 + 0.24 * (fbm(vec3(cos(a) * 2.0, sin(a) * 2.0, 5.0)) - 0.5));
  if (e > 1.4) return vec3(0.0);
  float syn = exp(-e * e * 1.7) * (0.55 + 0.8 * fbm(vec3(u * 3.0, 1.3 + uTime * 0.004)));
  // The filaments: ridges of two noise layers, brightest in the outer half of the cage.
  vec3 p = vec3(u * 4.5, 2.0);
  float r1 = pow(1.0 - abs(fbm(p) - 0.5) * 2.0, 16.0);
  float r2 = pow(1.0 - abs(fbm(p * 2.3 + 3.0) - 0.5) * 2.0, 20.0);
  // A soft haze of the same gas lies between the ridges.
  float haze = 0.35 * fbm(p * 0.7 + 9.0);
  float fil = (r1 + 0.7 * r2 + haze) * smoothstep(0.25, 0.75, e) * smoothstep(1.1, 0.9, e);
  vec3 filC = mix(vec3(1.0, 0.2, 0.1), vec3(1.0, 0.7, 0.36), smoothstep(0.3, 0.7, fbm(vec3(u * 1.5, 8.0))));
  // The inner torus and the jet, round the pulsar.
  float tor = exp(-pow((length(u / vec2(1.0, 0.4)) - 0.09) / 0.025, 2.0)) * 0.5;
  float jet = exp(-pow(u.x / 0.012, 2.0)) * smoothstep(0.22, 0.02, abs(u.y)) * 0.25;
  return vec3(0.55, 0.7, 1.0) * (syn * 0.85 + tor + jet) + filC * fil * 0.6;
}
// Mira's bow shock and tail, in R along its heading; not to scale.
// The true tail is 13 light years long; uBow.z is the bow's stand-off.
vec3 miraTail(vec2 q) {
  float s = uBow.z, d = length(q);
  // The bow: Wilkin's shape again, its apex s ahead of the star.
  float t = max(acos(clamp(q.x / max(d, 1e-4), -1.0, 1.0)), 0.02);
  float rb = s * sqrt(max(3.0 * (1.0 - t / tan(t)), 0.0)) / sin(t);
  float bw = s * (0.05 + 0.08 * t);
  float fil = 0.4 + 1.2 * fbm(vec3(q * 5.0 / s, 2.0));
  float bow = exp(-pow((d - rb) / bw, 2.0)) * exp(-t * 0.9) * fil * smoothstep(2.0, 1.2, t);
  // The tail: gas the bow sweeps back, a stream that widens and breaks into eddies.
  float back = -q.x;
  float bk = max(back, 0.0) / s;
  // The stream sways slowly as its eddies shed.
  float yc = q.y - 0.18 * s * sqrt(bk) * sin(bk * 0.5 - uTime * 0.03);
  float w = s * (0.45 + 0.05 * bk);
  float core = exp(-pow(yc / w, 2.0)) * smoothstep(-0.3, 1.2, bk) * exp(-bk / 22.0);
  // Knots drift back with the gas, very slowly; they grow as the stream ages.
  float kn = fbm(vec3(bk * 0.9 / (1.0 + 0.04 * bk) + uTime * 0.02, yc * 2.0 / s, 7.0));
  kn = 0.25 + 2.2 * kn * kn * (0.6 + 0.8 * fbm(vec3(bk * 2.5, yc * 4.0 / s, 3.0)));
  return uBowC * (bow * 1.2 + core * kn * 0.9);
}
// A runaway star's bow shock or wake, not to scale: the true arc stands millions of radii out.
// The bow shock takes Wilkin's shape: r(t) = R0 sqrt(3 (1 - t cot t)) / sin t, t from the apex.
vec3 runaway(vec2 P) {
  vec2 ax = vec2(cos(uBow.y), sin(uBow.y));
  vec2 q = vec2(dot(P, ax), ax.x * P.y - ax.y * P.x) / R;
  float d = length(q);
  if (uBow.w < 0.5) {
    float t = acos(clamp(q.x / max(d, 1e-4), -1.0, 1.0));
    float t2 = max(t, 0.02);
    float rb = uBow.z * sqrt(max(3.0 * (1.0 - t2 / tan(t2)), 0.0)) / sin(t2);
    float w = uBow.z * (0.05 + 0.08 * t);
    float shell = exp(-pow((d - rb) / w, 2.0));
    // Brightest at the apex; the wings fade as they sweep back. Filaments ripple it.
    float fil = 0.55 + 0.9 * fbm(vec3(q * 6.0 / uBow.z, 2.0));
    return uBowC * shell * exp(-t * 0.8) * fil * smoothstep(2.5, 1.3, t);
  }
  // The Crab Nebula: the pulsar's wind nebula in its cage of filaments.
  if (uBow.w > 3.5) return crabNeb(q);
  // Mira: a bow shock ahead and a long turbulent tail behind, as GALEX saw it in 2007.
  if (uBow.w > 2.5) return miraTail(q);
  // A lensed far star (Tom, 2026-11-24: far more cosmic): a foreground galaxy cluster bends a deep field.
  if (uBow.w > 1.5) return lensScene(q, P / R);
  // A wake: a long faint trail behind, widening, its knots streaming away.
  float back = -q.x;
  float w = 0.35 + 0.035 * back;
  float tail = exp(-pow(q.y / w, 2.0)) * smoothstep(0.8, 2.5, back) * exp(-back / uBow.z);
  float kn = 0.5 + 0.9 * fbm(vec3(back * 0.15 - uTime * 0.5, q.y * 0.5, 4.0));
  return uBowC * tail * kn;
}
// A magnetar's giant flare (SGR 1806-20, 2004): a hard flash, a fireball shell
// thrown out through the field, and a tail that pulses with the spin.
vec3 quake(vec2 P, float r) {
  vec3 hot = vec3(0.78, 0.82, 1.0);
  float flash = uQuake.x * (0.25 + 1.6 * exp(-r / (8.0 * R)));
  float rs = uQuake.y * R, w = 0.05 * rs + 0.08 * R;
  float a = atan(P.y, P.x);
  // The fireball tears as it goes: knots and gaps, brighter on one side.
  float n = fbm(vec3(cos(a) * 4.0, sin(a) * 4.0, uQuake.y * 0.6));
  float clump = 2.2 * n * n * (0.55 + 0.45 * cos(a - 2.6));
  // A thin shell seen in projection: a bright rim and a faint fill inside.
  float fill = r < rs ? 0.12 * rs / sqrt(max(rs * rs - r * r, 0.0) + w * rs) : 0.0;
  float shell = (exp(-pow((r - rs) / w, 2.0)) + fill) * uQuake.z * clump;
  float tail = uQuake.w * exp(-max(r - R, 0.0) / (3.0 * R));
  return hot * (flash + shell * 0.8) + vec3(0.7, 0.62, 1.0) * tail;
}
// The star's own light at a point: full on the disk, falling off above it.
float starLight(vec2 P) {
  // A black hole's shadow gives no light; its disc, round the shadow, lights the glass.
  if (uHoleF.x > 0.0) return 0.6 * exp(-max(length(P) - R, 0.0) / (3.0 * R));
  float h = length(P) - R;
  return h < 0.0 ? 1.0 : exp(-h / 240.0) * 0.8 + 0.05;
}
// One scale body: b is x, y, radius in pixels, and weight.
// Kind 0: bare rock, the only kind left.
vec3 body(vec3 c, vec2 fc, vec4 b, float kind) {
  if (b.w <= 0.0) return c;
  vec2 e = fc - b.xy;
  float r = max(b.z, 0.7);
  float d = length(e) / r;
  float disc = smoothstep(1.0, 1.0 - 1.5 / r, d);
  // The star stands behind the body: a crescent of light on its near side.
  vec2 to = normalize(uC * uRes - b.xy + 1e-4);
  vec3 L = normalize(vec3(to * 0.95, -0.28));
  vec3 n = vec3(e / r, sqrt(max(1.0 - d * d, 0.0)));
  float lam = max(dot(n, L), 0.0);
  vec3 q = vec3(e / r * 3.0, 0.0);
  // Mercury: grey rock, pitted.
  vec3 alb = vec3(0.17) * (0.75 + 0.5 * fbm(q * 3.0));
  vec3 light = grade(vec2(2.5, 0.0)) * 1.3;
  vec3 lit = alb * light * lam;
  // Bare rock has only its sunlit edge.
  float rim = exp(-pow((d - 0.98) / 0.025, 2.0)) * pow(0.5 + 0.5 * dot(normalize(e + 1e-4), to), 3.0);
  vec3 rimC = light * 0.6;
  return c * (1.0 - disc * b.w) + (lit * disc + rimC * rim * 0.8) * b.w;
}
float sdBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float sdSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }
// A ship in transit, black on the disk: a slanted sunshield, a spine, modules and a payload block.
// The shield's rim catches the light round its edge; a glint flashes as it turns.
vec3 ship(vec3 c, vec2 fc) {
  if (uShip.w <= 0.0) return c;
  float s = uShip.z;
  vec2 e = (fc - uShip.xy) / s;
  float ca = cos(uShip2.x), sa = sin(uShip2.x);
  vec2 p = vec2(ca * e.x + sa * e.y, -sa * e.x + ca * e.y);
  // The shield is a disc seen at a slant: an ellipse, its long axis across the heading.
  float tl = uShip2.y;
  float dS = (length(p / vec2(tl, 1.0)) - 1.0) * tl;
  // The spine trails behind the shield; two modules ride it; the payload is the block at its end.
  float dP = sdSeg(p, vec2(0.0), vec2(3.4, 0.0)) - 0.045;
  dP = min(dP, sdBox(p - vec2(1.1, 0.0), vec2(0.12, 0.18)));
  dP = min(dP, sdBox(p - vec2(1.8, 0.0), vec2(0.08, 0.3)));
  dP = min(dP, sdBox(p - vec2(3.05, 0.0), vec2(0.42, 0.34)) - 0.03);
  float d = min(dS, dP);
  float aa = 1.0 / s;
  float cov = smoothstep(aa, -aa, d);
  vec3 gold = grade(vec2(2.5, 0.0)) * vec3(1.25, 1.0, 0.6);
  float rim = exp(-pow(dS / (1.6 / s + 0.015), 2.0)) * (0.35 + 6.0 * uShip2.z);
  // The glint throws a short cross of light off the rim.
  float star4 = uShip2.z * (exp(-abs(e.y) * 40.0) * exp(-abs(e.x) * 1.5) + exp(-abs(e.x) * 40.0) * exp(-abs(e.y) * 1.5));
  return c * (1.0 - cov * uShip.w) + gold * (rim * 0.5 + star4 * 1.5) * uShip.w;
}
// The pale blue dot: a long, soft band of scattered light at a slant, and one pale blue pixel in it.
vec3 blueDot(vec3 c, vec2 fc) {
  if (uDot.z <= 0.0) return c;
  const float A = -0.36;
  vec2 d = vec2(cos(A), sin(A)), n = vec2(-d.y, d.x);
  vec2 e = (fc - uDot.xy) / uRes.y;
  float across = dot(e, n), along = dot(e, d);
  // Wide and soft across, faintly banded along its length, fading toward the frame's ends.
  float band = exp(-pow(across / 0.045, 2.0)) * (0.75 + 0.25 * vn(vec3(along * 9.0, across * 40.0, 3.0)));
  band *= smoothstep(1.1, 0.2, abs(along + 0.1));
  c += grade(vec2(0.9, 0.1)) * band * 0.11 * uDot.z * max(1.0 - c, 0.0);
  // One CSS pixel, pale blue, with a breath of glow.
  vec2 q = (fc - uDot.xy) / max(1.0, uDpr);
  float px = step(abs(q.x), 0.5) * step(abs(q.y), 0.5);
  float glow = exp(-dot(q, q) / 4.0) * 0.7;
  return c + vec3(0.55, 0.72, 1.0) * (px * 1.6 + glow) * uDot.w;
}
void main() {
  // Gate weave: the frame drifts a fraction of a pixel, as film does in a gate.
  vec2 weave = (vec2(vn(vec3(uFrame * 0.37, 1.0, 0.0)), vn(vec3(uFrame * 0.37, 5.0, 0.0))) - 0.5) * uFilm.y / uRes;
  vec2 uv = vUv + weave;
  vec2 P = uView.xy + (uv * 2.0 - 1.0) * uView.zw;
  float r = length(P);
  // Heat bends the air above the limb.
  float hr = r - R;
  float hz = exp(-abs(hr) / 25.0) + 0.3 * exp(-max(hr, 0.0) / 120.0);
  // Its ripples ride the star, so a zoom never drags the limb through a still pattern.
  // Two ripple sizes cross-fade with the zoom; a ripple stays near 22 CSS pixels.
  // Far out the shimmer fades: heat haze has no place at that scale (Tom, 2026-11-24).
  float lev = log2(22.0 * uDpr * 2.0 * uView.z / uRes.x);
  float k0 = floor(lev), kw = fract(lev);
  vec2 s0 = P / exp2(k0), s1 = P / exp2(k0 + 1.0) + 3.1;
  vec2 w0 = vec2(vn(vec3(s0, uTime * 0.3)), vn(vec3(s0 + 7.7, uTime * 0.3))) - 0.5;
  vec2 w1 = vec2(vn(vec3(s1, uTime * 0.3)), vn(vec3(s1 + 7.7, uTime * 0.3))) - 0.5;
  // The blend keeps the ripples' strength through the cross-fade.
  vec2 wob = (w0 * (1.0 - kw) + w1 * kw) / sqrt((1.0 - kw) * (1.0 - kw) + kw * kw);
  uv += wob * hz * uMix.w * uFx3.z * (1.0 - uCam.w) / uRes;
  // The lens splits colour toward the frame's edge.
  vec2 ca = (uv - 0.5) * (0.0025 + 0.0015 * uLens) * uFx1.z;
  float kx = kern(gl_FragCoord.xy);
  vec3 c;
  c.r = grade(sig(uv + ca, kx)).r;
  c.g = grade(sig(uv, kx)).g;
  c.b = grade(sig(uv - ca * 1.4, kx)).b;
  vec3 bl = texture(uBloom, uv).rgb;
  float bll = bl.r * uMix.y + bl.g * uMix.z;
  // Halation: the film's red glow round bright light.
  c += uHal * (1.0 - exp(-bll * 0.8)) * 0.45 * uFx1.w;
  // The disk's centre and radius on screen, in pixels.
  vec2 src = uC * uRes;
  float rp = R / uView.w * 0.5 * uRes.y;
  float dl = length(gl_FragCoord.xy - src);
  // Zoomed out, the stars come through behind the star; never over its disk.
  // Round a black hole the stars come from the trace, bent by its pull.
  if (uHoleF.x > 0.0) {
    vec4 hs = texture(uHdr, uv);
    c += mix(vec3(0.72, 0.84, 1.0), vec3(1.0, 0.8, 0.62), clamp(hs.a, 0.0, 1.0)) * hs.b;
  } else if (uCam.w > 0.0) c += starfield(gl_FragCoord.xy) * uCam.w * smoothstep(R, R * 1.04, r);
  // A runaway's bow shock grows in as the view pulls back; a wake shows from the full star.
  // A lensed arc shows at every zoom: the far star is a pip on it (Tom, 2026-11-24).
  // A lensed far star's scene comes in as the star shrinks to a pip, and draws over it with no seam.
  if (uBow.x > 0.0) c += runaway(P) * (uBow.w > 3.5 ? smoothstep(R, R * 1.5, r) : uBow.w > 1.5 && uBow.w < 2.5 ? 0.9 * smoothstep(24.0 * uSc, 5.0 * uSc, rp) : (uBow.w < 0.5 || uBow.w > 2.5 ? smoothstep(0.0, 0.35, uCam.w) * 0.8 : 0.25 + 0.35 * uCam.w) * smoothstep(R, R * 1.1, r));
  if (uQuake.x + uQuake.z + uQuake.w > 0.0) c += quake(P, r);
  // The lens: each saturated core throws the anamorphic flare.
  vec3 fl = vec3(0.0);
  for (int k = 0; k < ${MAX_FLARES}; k++) {
    float S = uSat[k].z;
    if (S <= 0.0) continue;
    // A stronger core throws a longer streak.
    fl += lensFlare(uSat[k].xy, min(S, 1.5), FL_BB.z, FL_BB.y * (1.2 + 1.6 * min(S, 1.5)), 0.3 + 0.2 * min(S, 1.5));
  }
  // The glare is white at its heart and takes the star's own colour farther out.
  vec3 gc = grade(vec2(3.0, 0.2)), gw = grade(vec2(0.9, 0.15));
  // Real light: the star's glare spreads past the limb and covers the corona.
  if (uFx5.w > 0.0) {
    float past = max(dl - rp, 0.0);
    fl += (gc * 0.6 * exp(-past / (rp * 0.35 + 8.0 * uSc)) + gw * 0.45 * exp(-past / (rp * 1.5 + 40.0 * uSc))) * uFx5.w;
  }
  // The far star: the disk shrinks to a hard core; the flare grows in round it.
  if (uCam.w > 0.0) {
    // A black hole's glow stays off its shadow until the shadow is a few pixels wide.
    float hm = uHoleF.x > 0.0 ? mix(smoothstep(rp * 0.9, rp * 1.6, dl), 1.0, smoothstep(24.0 * uSc, 6.0 * uSc, rp)) : 1.0;
    // A pulsar strobes far out: dim between beams, a blinding burst as one crosses the eye.
    hm *= uPulse < 0.0 ? 1.0 : 0.12 + 5.0 * uPulse;
    // A round, globular glow, the eye's bloom on a point of light.
    fl += hm * (gc * 0.8 * exp(-dl / (rp * 1.6 + 14.0 * uSc)) + gw * 0.5 * exp(-dl / (rp * 6.0 + 70.0 * uSc))) * uCam.w;
    // The orb spans about twice the disk.
    float fall = uRes.y / (rp * 2.2 + 10.0 * uSc);
    // The streak reaches farther as the disk grows on screen; it still ends inside the frame.
    float grow = min(0.35, rp / uRes.y * 0.9);
    fl += hm * lensFlare(src, 1.6 * uCam.w, fall, FL_BB.y * (1.0 + 2.6 * uCam.w) * (1.0 + 2.0 * grow), 0.42 + 0.2 * uCam.w + grow);
  }
  // Screen blend: the flare washes the frame; light past white stays as it is.
  c += min(fl, vec3(1.0)) * max(1.0 - c, 0.0);
  // The scale bodies.
  vec2 fc = uv * uRes;
  c = body(c, fc, uBodyA, uBodyK.x);
  c = body(c, fc, uBodyB, uBodyK.y);
  c = ship(c, fc);
  c = blueDot(c, fc);
  float sl = starLight(P);
  vec3 hc = grade(vec2(0.5 + 1.6 * sl + bll * 0.6, 0.1 + 0.3 * sl));
  // Lens dirt: smudges on the glass that catch the star's light, strongest near it.
  float dirt = smoothstep(0.5, 0.8, fbm(vec3(vUv * vec2(uRes.x / uRes.y, 1.0) * 3.0, 11.0))) * 0.7
             + smoothstep(0.78, 0.95, fbm(vec3(vUv * 18.0, 13.0)));
  // Over the disk the smudges stay faint: they sat in the same place on every star.
  dirt *= 0.25 + 0.75 * smoothstep(R * 1.0, R * 1.15, r);
  c += hc * dirt * (1.0 - exp(-(bll * 0.6 + sl * 0.8))) * 0.35 * uFilm.z * uFx2.y;
  // Highlights roll off to white, as on film.
  float lum = dot(c, vec3(0.3, 0.55, 0.15));
  c = mix(c, vec3(1.0, 0.98, 0.94), smoothstep(0.75, 1.02, lum) * 0.35 * uFx2.z);
  vec2 v = vUv - 0.5;
  c *= clamp(1.0 - (0.6 + 0.25 * uLens) * uFx2.w * pow(length(v * vec2(1.0, 0.9)) * 1.35, 2.2), 0.15, 1.0);
  c = look(c);
  // Film grain: even gaussian noise, one CSS pixel per grain, one strength over the whole frame (Tom, 2026-11-24).
  // A new frame of it 24 times a second; it holds still while the toy sleeps.
  vec2 gi = floor(gl_FragCoord.xy / max(1.0, uDpr));
  // An integer hash per grain and frame keeps full precision, so no pattern repeats.
  uvec3 gh = pcg3(uvec3(uvec2(gi), uint(floor(uTime * 24.0))));
  // Box-Muller turns two uniform draws into one true gaussian of unit spread.
  vec2 gu = (vec2(gh.xy >> 8u) + 0.5) / 16777216.0;
  float gr = clamp(sqrt(-2.0 * log(gu.x)) * cos(6.2831853 * gu.y), -4.0, 4.0);
  c += gr * uFilm.x * 0.9 * uFx3.x;
  o = vec4(clamp(c, 0.0, 1.0) * uDip, 1.0);
}`;

// opts.fluid: the fluid probe (?fluid) builds its programs and grid.
export async function makeRender(gl, opts = {}) {
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) throw new Error('no float targets');
  // The disk pass's versions: compiled on demand, the first star's before the first frame.
  const par = gl.getExtension('KHR_parallel_shader_compile');
  const skies = new Map();
  function skyStart(on) {
    const k = skyKey(on);
    if (!skies.has(k)) skies.set(k, { q: program(gl, TRI_VS, skySource(on)), ready: false });
    return skies.get(k);
  }
  // True once a version links; it never blocks while the driver still compiles.
  function skyReady(e) {
    if (e.ready) return true;
    if (par && !gl.getProgramParameter(e.q.p, par.COMPLETION_STATUS_KHR)) return false;
    if (!gl.getProgramParameter(e.q.p, gl.LINK_STATUS)) throw new Error(gl.getShaderInfoLog(e.q.f) || gl.getProgramInfoLog(e.q.p) || 'sky link failed');
    uniforms(gl, e.q);
    return (e.ready = true);
  }
  // Each star's features; a feature its frame data turns on joins them for good.
  const bandOn = new WeakMap();
  const lastSky = new WeakMap();
  function skyFor(v) {
    let on = bandOn.get(v.band);
    if (!on) bandOn.set(v.band, (on = starOn(v.band)));
    for (const f of SKY_FEATURES) if (!on.has(f[0]) && f[2](v)) on.add(f[0]);
    const e = skyStart(on);
    if (skyReady(e)) { lastSky.set(v.band, e); return e.q; }
    // While a new feature's version compiles, the star keeps its last one.
    const was = lastSky.get(v.band);
    return was && skyReady(was) ? was.q : null;
  }
  // Compiles the versions for these stars in idle time, one at a time.
  let warming = Promise.resolve();
  function warm(ids) {
    for (const id of ids) {
      const B = STARS[id];
      if (!B) continue;
      warming = warming.then(async () => {
        const e = skyStart(bandOn.get(B) || starOn(B));
        while (!gl.isContextLost() && !skyReady(e)) await new Promise(r => setTimeout(r, 120));
      });
    }
    return warming;
  }
  const first = skyStart(starOn(STARS[opts.star] || STARS.sun));
  const P = await linked(gl, {
    strand: program(gl, STRAND_VS, STRAND_FS),
    rays: program(gl, TRI_VS, RAYS),
    vol: program(gl, TRI_VS, VOL),
    up: program(gl, TRI_VS, UP),
    bake: program(gl, TRI_VS, BAKE),
    hbake: program(gl, TRI_VS, HBAKE),
    qbake: program(gl, TRI_VS, QBAKE),
    blur: program(gl, TRI_VS, BLUR),
    acc: program(gl, TRI_VS, ACC),
    final: program(gl, TRI_VS, FINAL),
    ...(opts.fluid ? fluidPrograms(gl) : {}),
  });
  const empty = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 5 });
  const fluid = opts.fluid ? makeFluid(gl, P, empty) : null;
  // The strand data: four vec4 per instance.
  const data = new Float32Array(MAX_STRANDS * STRIDE);
  const vbo = gl.createBuffer();
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
  for (let i = 0; i < 4; i++) {
    gl.enableVertexAttribArray(i);
    gl.vertexAttribPointer(i, 4, gl.FLOAT, false, STRIDE * 4, i * 16);
    gl.vertexAttribDivisor(i, 1);
  }
  gl.bindVertexArray(null);
  // The colour ramps: one row per band and channel.
  const lut = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, lut);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, LUT_W, LUTS.length, 0, gl.RGBA, gl.UNSIGNED_BYTE, lutPixels());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const lutT = { tex: lut };
  // The noise volume the march samples.
  const noise = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_3D, noise);
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.R8, NOISE_N, NOISE_N, NOISE_N, 0, gl.RED, gl.UNSIGNED_BYTE, noiseVolume(NOISE_N));
  for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D, k, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  // The haze and corona bake: a spherical grid in the star's frame, in half floats.
  // Longitude wraps; colatitude and radius stop at their ends.
  const bakeT = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_3D, bakeT);
  gl.texStorage3D(gl.TEXTURE_3D, 1, gl.RGBA16F, BK_W, BK_H, BK_D);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const bakeFb = gl.createFramebuffer();
  // The corona's bend is the one value the bake holds that can change.
  let bakedBend = NaN;
  function rebake(v) {
    if (v.bend === bakedBend) return;
    bakedBend = v.bend;
    const b = P.bake;
    gl.useProgram(b.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_3D, noise);
    gl.uniform1i(b.u.uNoise, 0);
    // The bake holds the haze's slow drift and the sheet's slow warp still.
    gl.uniform1f(b.u.uTime, 0);
    gl.uniform1f(b.u.uBend, v.bend);
    gl.bindFramebuffer(gl.FRAMEBUFFER, bakeFb);
    gl.viewport(0, 0, BK_W, BK_H);
    gl.bindVertexArray(empty);
    for (let k = 0; k < BK_D; k++) {
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, bakeT, 0, k);
      gl.uniform1f(b.u.uS, (k + 0.5) / BK_D);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, null, 0, 0);
  }
  // The bake runs during the load, at the house bend, so no star waits for it.
  rebake({ bend: 1 });
  // The holes' cloud bake: made once at load; no hole changes it.
  const holeB = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_3D, holeB);
  gl.texStorage3D(gl.TEXTURE_3D, 1, gl.RG16F, HB_W, HB_H, HB_D);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  {
    const b = P.hbake;
    gl.useProgram(b.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_3D, noise);
    gl.uniform1i(b.u.uNoise, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, bakeFb);
    gl.viewport(0, 0, HB_W, HB_H);
    gl.bindVertexArray(empty);
    for (let k = 0; k < HB_D; k++) {
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, holeB, 0, k);
      gl.uniform1f(b.u.uLayer, (k + 0.5) / HB_D);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, null, 0, 0);
  }

  // The quasar's bakes: the band and the clouds, each made once at load.
  function qbakeTex(depth, which) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_3D, t);
    gl.texStorage3D(gl.TEXTURE_3D, 1, gl.RG8, QB_W, QB_H, depth);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const b = P.qbake;
    gl.useProgram(b.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_3D, noise);
    gl.uniform1i(b.u.uNoise3, 0);
    gl.uniform1i(b.u.uWhich, which);
    gl.bindFramebuffer(gl.FRAMEBUFFER, bakeFb);
    gl.viewport(0, 0, QB_W, QB_H);
    gl.bindVertexArray(empty);
    for (let k = 0; k < depth; k++) {
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, t, 0, k);
      gl.uniform1f(b.u.uLayer, (k + 0.5) / depth);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, null, 0, 0);
    return t;
  }
  const bandB = qbakeTex(QB.d, 0), blrB = qbakeTex(QC.d, 1);

  let hdr = null, rays = null, volA = null, volB = null, volH = null, volO = null, W = 0, H = 0;
  // Black hole detail: below 1 the holes' sky pass draws to holeT, made on first use.
  let holeS = 1, holeT = null;
  // The haze history is empty until a first frame fills it.
  let histOk = false;
  // The post targets: the final picture and two history frames, made only while a post option is on.
  let post = null;
  // The post programs compile on first use: an option at 0 costs nothing, not even a compile.
  let postP = null;
  function postProgs() {
    if (!postP) {
      postP = { post: program(gl, TRI_VS, POST), copy: program(gl, TRI_VS, COPY) };
      uniforms(gl, postP.post); uniforms(gl, postP.copy);
    }
    return postP;
  }
  function freePost() { if (post) { free(gl, post.src); free(gl, post.h[0]); free(gl, post.h[1]); post = null; } }
  function postTargets() {
    if (!post) {
      const mk = () => target(gl, W, H, { format: gl.RGBA8, clear: true });
      post = { src: mk(), h: [mk(), mk()], i: 0, fresh: true };
    }
    return post;
  }
  // shift: the volume's size as a power of two below the frame; 1 is half size.
  // hs: the holes' sky pass size against the frame; 1 draws straight to the frame.
  function resize(w, h, shift = 1, hs = 1) {
    W = Math.max(2, w); H = Math.max(2, h);
    holeS = hs;
    free(gl, holeT);
    holeT = null;
    gl.canvas.width = W; gl.canvas.height = H;
    freePost();
    free(gl, hdr); free(gl, rays); free(gl, volA); free(gl, volB); free(gl, volH); free(gl, volO);
    hdr = target(gl, W, H);
    rays = target(gl, Math.max(2, W >> 1), Math.max(2, H >> 1));
    // The volume marches at half size, a quarter on slow machines; the blur hides the dither.
    volA = target(gl, Math.max(2, W >> shift), Math.max(2, H >> shift));
    volB = target(gl, Math.max(2, W >> shift), Math.max(2, H >> shift));
    volH = target(gl, Math.max(2, W >> shift), Math.max(2, H >> shift));
    volO = target(gl, Math.max(2, W >> shift), Math.max(2, H >> shift));
    histOk = false;
  }
  // Clears a target to one colour: a skipped pass leaves it neutral.
  function clearTo(t, r, g, b, a) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
    gl.viewport(0, 0, t.w ?? W, t.h ?? H);
    gl.clearColor(r, g, b, a);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  // v: view, rot, toSun, time, band (the star), regs, flares, sat, count, bloom, frame, centre, bodies, lens.
  function frame(v) {
    if (!hdr) return;
    gl.disable(gl.BLEND);
    if (fluid && v.fluid) fluid.step(v.fluid.step);
    // The star's disk version; a frame waits while it still compiles.
    const s = skyFor(v);
    if (!s) return false;
    gl.useProgram(s.p);
    gl.uniform4fv(s.u.uView, v.view);
    gl.uniformMatrix3fv(s.u.uToSun, false, v.toSun);
    gl.uniform1f(s.u.uTime, v.time % 9600);
    gl.uniform4fv(s.u.uDisk, v.band.disk);
    gl.uniform4fv(s.u.uDisk2, v.band.disk2);
    gl.uniform4fv(s.u.uTex, v.band.tex);
    gl.uniform1f(s.u.uDust, v.band.dust);
    gl.uniform1f(s.u.uFull, v.full);
    gl.uniform4fv(s.u.uBeam, v.beam);
    gl.uniform4fv(s.u.uGrav, v.band.grav);
    gl.uniform4fv(s.u.uStarspot, v.band.starspot);
    gl.uniform4fv(s.u.uDiscE, v.band.discE);
    gl.uniform4fv(s.u.uCloud, v.band.clouds);
    gl.uniform4fv(s.u.uYso, v.yso);
    gl.uniform4fv(s.u.uLump, v.lump);
    gl.uniform4fv(s.u.uBeat, v.beat);
    gl.uniform1f(s.u.uFar, v.far);
    gl.uniform1f(s.u.uOff, v.off);
    gl.uniform4fv(s.u.uReg, v.regs);
    gl.uniform4fv(s.u.uSpot, v.spots);
    gl.uniform4fv(s.u.uFl, v.fl);
    gl.uniform4fv(s.u.uFlB, v.flB);
    gl.uniform4fv(s.u.uEgg, v.egg);
    gl.uniform4fv(s.u.uDim, v.dim);
    gl.uniform4fv(s.u.uHole, v.hole);
    gl.uniform4fv(s.u.uHoleV, v.holeV);
    gl.uniform4fv(s.u.uHoleQ, v.holeQ);
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_3D, noise);
    gl.uniform1i(s.u.uNoise3, 5);
    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_3D, holeB);
    gl.uniform1i(s.u.uHoleBake, 6);
    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_3D, bandB);
    gl.uniform1i(s.u.uBandBake, 7);
    gl.activeTexture(gl.TEXTURE8);
    gl.bindTexture(gl.TEXTURE_3D, blrB);
    gl.uniform1i(s.u.uBlrBake, 8);
    gl.uniform4fv(s.u.uWind, v.band.wind);
    gl.uniformMatrix3fv(s.u.uCamM, false, v.camM);
    gl.uniform1f(s.u.uCore, v.band.core);
    gl.uniform4fv(s.u.uNs, v.ns);
    gl.uniform4fv(s.u.uNsU, v.nsU);
    gl.uniform4fv(s.u.uNsV, v.nsV);
    gl.uniform1f(s.u.uFlashW, v.flashW);
    gl.uniform4fv(s.u.uRing, v.ring);
    gl.uniform4fv(s.u.uRing2, v.ring2);
    gl.uniform4fv(s.u.uRing3, v.ring3);
    gl.uniform4fv(s.u.uShell, v.shell);
    gl.uniform4fv(s.u.uPair, v.pair);
    gl.uniform4fv(s.u.uPair2, v.pair2);
    gl.uniform4fv(s.u.uBin, v.bin);
    gl.uniform4fv(s.u.uBinD, v.binD);
    gl.uniform4fv(s.u.uBinN, v.binN);
    gl.uniform2fv(s.u.uHoleSky, v.holeSky);
    gl.uniform1f(s.u.uJet, v.jet);
    gl.uniform1i(s.u.uZero, 0);
    // A hole below full detail draws small, then comes up sharp; a star never does.
    if (v.hole[0] > 0 && holeS < 1) {
      holeT ??= target(gl, Math.max(2, Math.round(W * holeS)), Math.max(2, Math.round(H * holeS)));
      // The lensed stars keep their screen size: a pixel is wider here.
      gl.uniform2f(s.u.uHoleSky, v.holeSky[0] / holeS, v.holeSky[1]);
      tri(gl, holeT, empty);
      gl.useProgram(P.up.p);
      bind(gl, P.up, 'uSrc', 0, holeT);
      tri(gl, hdr, empty);
    } else {
      // Off a hole, the small target goes, so it holds no memory.
      if (holeT) { free(gl, holeT); holeT = null; }
      tri(gl, hdr, empty);
    }

    if (v.count > 0) {
      const p = P.strand;
      gl.useProgram(p.p);
      gl.uniformMatrix3fv(p.u.uRot, false, v.rot);
      gl.uniform4fv(p.u.uView, v.view);
      gl.uniform2f(p.u.uRes, W, H);
      gl.uniform1f(p.u.uTime, v.time % 9600);
      gl.uniform2fv(p.u.uBend, v.nsBend);
      gl.uniform1f(p.u.uRain, v.band.rain);
      gl.uniform1f(p.u.uGain, (1 + 0.9 * v.lens) * v.off);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, v.data, 0, v.count * STRIDE);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindVertexArray(vao);
      to(gl, hdr);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, NS * 2, v.count);
      gl.bindVertexArray(null);
      gl.disable(gl.BLEND);
    }

    // The fluid probe's plasma joins the light before bloom, so it glows.
    if (fluid && v.fluid) fluid.draw(v.fluid, W, H, hdr);
    const bt = bloom.render(hdr.tex, W, H, { threshold: 0.9, cap: 6, levels: v.bloomLevels });
    // Light rays only where the star has them; else the target holds black.
    const r = P.rays;
    if (v.band.rays > 0) {
      gl.useProgram(r.p);
      bind(gl, r, 'uSrc', 0, hdr);
      gl.uniform2fv(r.u.uC, v.centre);
      gl.uniform1f(r.u.uThr, 0.45);
      tri(gl, rays, empty);
    } else clearTo(rays, 0, 0, 0, 0);

    // The volume only when something lives in it: haze, corona, gas or beams.
    const volOn = v.volDens > 0 || v.corona > 0 || v.gas[0] > 0 || v.lh[3] > 0;
    const vp = P.vol;
    if (volOn) {
    rebake(v);
    gl.useProgram(vp.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_3D, noise);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_3D, bakeT);
    gl.uniform1i(vp.u.uBake, 1);
    gl.uniform1f(vp.u.uBaked, 1);
    gl.uniform1i(vp.u.uNoise, 0);
    gl.uniform4fv(vp.u.uView, v.view);
    gl.uniform1f(vp.u.uTime, v.time % 9600);
    gl.uniform1f(vp.u.uDens, v.volDens);
    gl.uniform1f(vp.u.uDust, v.band.dust);
    gl.uniform1f(vp.u.uLight, v.volLight);
    gl.uniformMatrix3fv(vp.u.uToSun, false, v.toSun);
    gl.uniform1f(vp.u.uCorona, v.corona);
    gl.uniform1f(vp.u.uBend, v.bend);
    gl.uniform4fv(vp.u.uBin, v.bin);
    gl.uniform4fv(vp.u.uBinD, v.binD);
    gl.uniform4fv(vp.u.uBinN, v.binN);
    gl.uniform4fv(vp.u.uGas, v.gas);
    gl.uniform4fv(vp.u.uPath, v.path);
    gl.uniform4fv(vp.u.uLh, v.lh);
    gl.uniform1f(vp.u.uFlashW, v.flashW);
    tri(gl, volA, empty);
    const bp = P.blur;
    gl.useProgram(bp.p);
    bind(gl, bp, 'uSrc', 0, volA);
    gl.uniform2f(bp.u.uStep, 1, 0);
    tri(gl, volB, empty);
    bind(gl, bp, 'uSrc', 0, volB);
    gl.uniform2f(bp.u.uStep, 0, 1);
    tri(gl, volA, empty);
    // Blend this frame with the haze's history; the result becomes the new history.
    const ap = P.acc;
    gl.useProgram(ap.p);
    bind(gl, ap, 'uCur', 0, volA);
    bind(gl, ap, 'uHist', 1, volH);
    gl.uniform1f(ap.u.uW, histOk ? v.volHold ?? 0 : 0);
    tri(gl, volO, empty);
    [volH, volO] = [volO, volH];
    histOk = true;
    } else { clearTo(volH, 0, 0, 0, 1); histOk = false; }

    const f = P.final;
    gl.useProgram(f.p);
    bind(gl, f, 'uHdr', 0, hdr);
    bind(gl, f, 'uBloom', 1, bt);
    bind(gl, f, 'uRays', 2, rays);
    bind(gl, f, 'uLut', 3, lutT);
    bind(gl, f, 'uVol', 4, volH);
    const B = v.band;
    gl.uniform4fv(f.u.uSat, v.sat);
    gl.uniform4fv(f.u.uView, v.view);
    gl.uniform4f(f.u.uMix, B.rays, B.hotW, B.coolW, v.shimmer);
    gl.uniform4fv(f.u.uBodyA, v.bodyA);
    gl.uniform4fv(f.u.uBodyB, v.bodyB);
    gl.uniform2fv(f.u.uBodyK, v.bodyK);
    if (v.ship) { gl.uniform4fv(f.u.uShip, v.ship); gl.uniform4fv(f.u.uShip2, v.ship2); }
    if (v.dot) gl.uniform4fv(f.u.uDot, v.dot);
    gl.uniform1f(f.u.uLens, v.lens);
    gl.uniform1f(f.u.uFull, v.full);
    gl.uniform4fv(f.u.uCam, v.cam);
    gl.uniform2fv(f.u.uSway, v.sway);
    gl.uniform2fv(f.u.uHoleF, v.holeF);
    gl.uniform4fv(f.u.uBow, v.bow);
    gl.uniform3fv(f.u.uBowC, v.bowC);
    gl.uniform1f(f.u.uPulse, v.pulse);
    gl.uniform4fv(f.u.uQuake, v.quake);
    gl.uniform4fv(f.u.uFilm, v.film);
    gl.uniform4fv(f.u.uFx1, v.fx1);
    gl.uniform4fv(f.u.uFx2, v.fx2);
    gl.uniform4fv(f.u.uFx3, v.fx3);
    gl.uniform4fv(f.u.uFx4, v.fx4);
    gl.uniform4fv(f.u.uFx5, v.fx5);
    gl.uniform1f(f.u.uHaze, Math.min(1, 0.4 + 0.6 * v.lens + 0.3 * v.band.dust));
    gl.uniform3fv(f.u.uHal, B.hal);
    gl.uniform3fv(f.u.uStreak, B.streak);
    gl.uniform2f(f.u.uRes, W, H);
    gl.uniform2fv(f.u.uC, v.centre);
    gl.uniform1f(f.u.uFrame, v.frameNo % 64);
    gl.uniform1f(f.u.uTime, v.time % 9600);
    gl.uniform1f(f.u.uExpo, B.expo);
    gl.uniform1f(f.u.uSc, v.sc);
    gl.uniform1f(f.u.uDpr, v.dpr);
    gl.uniform1f(f.u.uDip, v.dip ?? 1);
    gl.uniform1f(f.u.uRow, B.row);
    // v.post: blur, blend and the move map; with both off the final pass draws to the screen.
    // With both options at 0, main sends no post: no pass, no target, no program.
    if (!v.post && post) freePost();
    const pp = v.post ? postTargets() : null;
    tri(gl, pp ? pp.src : null, empty);
    if (!pp) return;
    const PP = postProgs(), q = PP.post, prev = pp.h[pp.i], next = pp.h[1 - pp.i];
    gl.useProgram(q.p);
    bind(gl, q, 'uSrc', 0, pp.src);
    bind(gl, q, 'uPrev', 1, prev);
    gl.uniform4fv(q.u.uMv, v.post.mv);
    gl.uniform1f(q.u.uBlur, v.post.blur);
    // The first frame has no history to blend.
    gl.uniform1f(q.u.uBlend, pp.fresh ? 0 : v.post.blend);
    tri(gl, next, empty);
    const c = PP.copy;
    gl.useProgram(c.p);
    bind(gl, c, 'uSrc', 0, next);
    tri(gl, null, empty);
    pp.i = 1 - pp.i;
    pp.fresh = false;
  }
  return { resize, frame, data, warm, ready: () => skyReady(first) };
}
