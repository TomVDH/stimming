// Solar loop renderer: raw WebGL2, graded like film.
// Two light channels: red holds hot plasma, green holds cool plasma.
// Passes: the disk and corona, the strands (additive, optically thin), bloom, light rays, the final.
// The final pass bends the air at the limb, grades through the band's ramps and adds the lens.
import { TRI_VS, program, linked, target, free, bind, tri, to } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { R, STRIDE, MAX_STRANDS, NR } from './sun.js';
import { fluidPrograms, makeFluid } from './fluid.js';

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

/* ---------- the disk and the corona ---------- */
const SKY = `${HEAD}
uniform vec4 uView;
uniform mat3 uToSun;
uniform float uTime;
uniform vec4 uDisk, uDisk2, uTex, uBeam, uSpin, uGrav, uCloud, uYso;
uniform float uDust;
uniform vec4 uReg[${NR}];
uniform vec4 uFl[2], uFlW[2], uFlB[2];
in vec2 vUv;
out vec4 o;
const float R = ${R.toFixed(1)};
${NOISE}
void main() {
  vec2 P = uView.xy + (vUv * 2.0 - 1.0) * uView.zw;
  float r = length(P);
  float hot = 0.0, cool = 0.0;
  float tb = uTime * 0.02;
  if (r < R) {
    float mu = sqrt(max(1.0 - r * r / (R * R), 0.0));
    vec3 n = vec3(P / R, mu);
    vec3 q = uToSun * n;
    // Granules boil: bright cells, dark lanes, drifting through time.
    // Noise bends the cells and blurs the lanes, so they never read as hexagons.
    vec3 gq = q * uTex.x + vec3(0.0, 0.0, tb * 2.0);
    gq += 0.45 * vec3(vn(gq * 0.7), vn(gq * 0.7 + 3.1), vn(gq * 0.7 + 6.3));
    float gran = smoothstep(-0.05, 0.9, cells(gq)) * (0.7 + 0.3 * vn(gq * 2.3));
    // Swirls of plasma: noise bent by noise, slowly turning.
    vec3 wq = q * uTex.y * 1.6;
    vec3 warp = vec3(fbm(wq + tb * 0.1), fbm(wq + 5.1), fbm(wq + 9.3));
    float turb = fbm(q * uTex.y + warp * 1.7 + vec3(0.0, 0.0, tb * 0.25));
    // The supergranule network, warped so it never reads as tiles.
    vec3 w = q * 22.0 + 0.8 * vec3(vn(q * 9.0), vn(q * 9.0 + 5.2), vn(q * 9.0 + 9.7));
    float net = smoothstep(0.25, 0.0, cells(w + tb * 0.2));
    float mot = fbm(q * 14.0 + vec3(0.0, tb * 0.3, 0.0));
    // Filaments: dark sinuous lanes of cool plasma seen from above.
    float fil = smoothstep(0.035, 0.0, abs(fbm(q * 5.0 + 3.1) - 0.5)) * smoothstep(0.45, 0.65, fbm(q * 3.0 + 8.0));
    float tex = 1.0 + uDisk.y * ((gran - 0.6) * 0.35 + (turb - 0.5) * 1.6 + (mot - 0.5) * 0.5 + net * uTex.z) - 0.55 * fil * min(uDisk2.y, 1.0);
    // A brown dwarf: a cloud deck in bands round its spin axis, no granules.
    if (uCloud.x > 0.0) {
      float lat = q.y;
      float lon = atan(q.z, q.x);
      // Neighbour bands run opposite ways, so the edges between them shear.
      float spd = sin(lat * uCloud.y * 3.14159 + 0.7);
      float lo = lon + uTime * 0.012 * uCloud.w * spd;
      vec3 cq = vec3(cos(lo), lat * 2.2, sin(lo));
      // Eddies curl the band edges.
      vec3 ew = vec3(fbm(cq * 3.0 + 1.0), fbm(cq * 3.0 + 4.0), fbm(cq * 3.0 + 7.0));
      // Uneven band widths: the latitude itself is warped.
      float wl = lat + 0.18 * (vn(vec3(lat * 2.6, 1.0, 3.0)) - 0.5);
      float edge = wl + uCloud.z * 0.14 * (fbm(cq * 4.0 + ew * 2.5) - 0.5);
      float band = 0.5 + 0.5 * sin(edge * uCloud.y * 3.14159);
      band = mix(band, smoothstep(0.2, 0.8, band), 0.5);
      float fine = fbm(vec3(cq.x * 7.0, cq.y * 16.0, cq.z * 7.0) + ew * 1.6);
      // A few dark storm ovals ride the bands.
      float storm = smoothstep(0.78, 0.9, fbm(cq * 2.2 + 11.0));
      float deck = 0.6 + 0.42 * band + 0.75 * (fine - 0.5) - 0.4 * storm;
      tex = mix(tex, deck, uCloud.x);
    }
    // The photosphere darkens to the limb; the corona brightens.
    float dark = pow(max(mu, 0.02), uTex.w);
    float bright = 1.0 + 0.6 * (inversesqrt(max(mu, 0.04)) - 1.0);
    hot = uDisk.x * max(tex, 0.08) * mix(dark, bright, uDisk.z);
    for (int k = 0; k < ${NR}; k++) {
      float dd = 2.0 - 2.0 * dot(n, uReg[k].xyz);
      float m = exp(-dd / 0.006) * uReg[k].w;
      hot += uDisk2.z * uDisk.x * m * (0.4 + 1.2 * net + 0.6 * gran);
    }
    for (int k = 0; k < 2; k++) {
      if (uFlW[k].y <= 0.0) continue;
      float a = acos(clamp(dot(n, uFl[k].xyz), -1.0, 1.0));
      float front = exp(-pow((a - uFlW[k].x) / 0.016, 2.0)) * smoothstep(uFlW[k].x + 0.02, uFlW[k].x - 0.12, a);
      hot += uFlW[k].y * front * (1.0 + gran) * uDisk.x * 0.5;
      // Behind the wave the corona dims.
      hot *= 1.0 - 0.3 * uFlW[k].y * smoothstep(uFlW[k].x, 0.0, a);
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
  // A haze over each region: unresolved loops.
  for (int k = 0; k < ${NR}; k++) {
    vec3 c = uReg[k].xyz * (R + 50.0);
    vec2 d = P - c.xy;
    float vis = r < R ? smoothstep(-60.0, 60.0, c.z) : 1.0;
    hot += uDisk2.w * uReg[k].w * vis * exp(-dot(d, d) / (2.0 * 70.0 * 70.0));
  }
  // A pulsar's two beams: narrow cones from its magnetic poles, swept by the spin.
  if (uBeam.w > 0.0) {
    for (int k = 0; k < 2; k++) {
      vec3 b = k == 0 ? uBeam.xyz : -uBeam.xyz;
      float l2 = length(b.xy);
      // The star hides the half of a cone that points away behind it.
      float behind = b.z < 0.0 && r < R ? 0.0 : 1.0;
      if (l2 > 0.02) {
        vec2 bd = b.xy / l2;
        float along = dot(P, bd);
        if (along > 0.0) {
          // Depth along the cone: the projection shortens it by l2.
          float s3 = along / l2;
          float across = abs(P.x * bd.y - P.y * bd.x);
          float wid = R * 0.06 + s3 * 0.09 * l2 + s3 * 0.18 * (1.0 - l2);
          float core = exp(-pow(across / (wid * 0.25), 2.0));
          float sheath = exp(-pow(across / wid, 2.0));
          // Bunches of charge stream out along the beam.
          float grain = 0.6 + 0.8 * fbm(vec3(s3 * 0.003 - uTime * 3.0, across * 0.01, float(k) * 3.0));
          // The cone starts at the pole, where the axis leaves the surface.
          float fall = exp(-s3 / 2600.0) * smoothstep(R * l2 * 0.8, R * l2 + 20.0, along);
          hot += uBeam.w * (1.6 * core + 0.5 * sheath) * grain * fall * behind;
        }
      }
      // A beam aimed at the eye: the pole flares in a tight burst.
      float face = pow(max(b.z, 0.0), 60.0);
      hot += uBeam.w * face * (6.0 * exp(-dot(P - b.xy * R, P - b.xy * R) / (2.0 * 140.0 * 140.0)) + 0.6 * exp(-max(r - R, 0.0) / 260.0));
    }
  }
  // The wind nebula: a torus round the spin equator, and a jet from each spin pole.
  if (uSpin.w > 0.0 && r > R) {
    vec2 sp = length(uSpin.xy) > 1e-3 ? normalize(uSpin.xy) : vec2(0.0, 1.0);
    vec2 e1 = vec2(sp.y, -sp.x);
    float x = dot(P, e1), y = dot(P, sp);
    float tilt = max(abs(uSpin.z), 0.12);
    // The ring seen at a slant: an ellipse, short along the spin axis.
    float rho = length(vec2(x, y / tilt));
    float RT = R * 2.3;
    float tex = 0.5 + fbm(vec3(atan(y / tilt, x) * 3.0, rho * 0.004, uTime * 0.03));
    // The near half of the torus is brighter: relativistic flow toward the eye.
    float near = 0.7 + 0.3 * sign(y) * sign(uSpin.z);
    cool += uSpin.w * 0.4 * exp(-pow((rho - RT) / (RT * 0.16), 2.0)) * tex * near;
    cool += uSpin.w * 0.12 * exp(-pow((rho - RT * 1.5) / (RT * 0.3), 2.0)) * tex;
    // The jets wander like a hose under pressure.
    float wig = 60.0 * sin(abs(y) * 0.004 - uTime * 0.6) * smoothstep(0.0, R * 2.0, abs(y));
    float jet = exp(-pow((x - wig) / (R * 0.08 + abs(y) * 0.04), 2.0)) * exp(-abs(y) / (R * 3.5)) * smoothstep(R * 0.9, R * 1.5, abs(y));
    hot += uSpin.w * 0.35 * jet * (0.6 + 0.8 * fbm(vec3(y * 0.004 - uTime * 0.8 * sign(y), x * 0.01, 2.0)));
  }
  // A young star: a ringed dust disk at a slant, and a jet from each pole.
  if (uYso.w > 0.0) {
    vec3 a = uYso.xyz;
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
  for (int k = 0; k < 2; k++) {
    if (uFlB[k].z <= 0.0) continue;
    vec3 c = uFl[k].xyz * (R + uFlB[k].x);
    float d = length(P - c.xy) / uFlB[k].y;
    float shell = exp(-pow((d - 1.0) / 0.06, 2.0)) * pow(fbm(vec3(P * 0.012, 1.7)), 2.0) * 2.4;
    float vis = r < R && c.z < 0.0 ? 0.0 : 1.0;
    // The cavity: plasma swept out behind the front.
    hot *= 1.0 - 0.6 * min(uFlB[k].z, 1.0) * vis * smoothstep(1.0, 0.55, d);
    hot += uFlB[k].z * shell * vis;
  }
  o = vec4(max(hot, 0.0), max(cool, 0.0), 0.0, 1.0);
}`;

/* ---------- strands: one camera-facing ribbon per thread ---------- */
// Kinds: 0 loop, 1 ribbon, 2 rope, 3 prominence, 4 erupting prominence.
const STRAND_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec4 aA;
layout(location = 1) in vec4 aB;
layout(location = 2) in vec4 aC;
layout(location = 3) in vec4 aD;
uniform mat3 uRot;
uniform vec4 uView;
uniform vec2 uRes;
out float vV, vS, vI, vDrain, vPh, vKind, vHgt;
out vec3 vP;
const float R = ${R.toFixed(1)};
const int N = ${NS};
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
    if (aD.w == 2.0 || aD.w == 4.0) p -= tng * sin(6.2832 * s) * 0.3 * max(aA.w - 30.0, 0.0);
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
  vec3 p = uRot * c;
  vec3 p1 = uRot * curve(min(s + ds, 1.0)), p0 = uRot * curve(max(s - ds, 0.0));
  vec2 sp = px(p);
  vec2 t2 = px(p1) - px(p0);
  vec2 tn = length(t2) > 1e-4 ? normalize(t2) : vec2(1.0, 0.0);
  vec2 nr = vec2(-tn.y, tn.x);
  float ppm = uRes.y / (2.0 * uView.w);
  float wpx = aC.x * ppm;
  float wq = max(wpx, 1.5);
  // A thread seen along its length looks brighter: a longer path.
  vec3 t3 = normalize(p1 - p0 + vec3(1e-6));
  float los = 1.0 / max(length(t3.xy), 0.3);
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
in float vV, vS, vI, vDrain, vPh, vKind, vHgt;
in vec3 vP;
out vec4 o;
const float R = ${R.toFixed(1)};
float n1(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(fract(sin(i * 91.3) * 43758.5), fract(sin((i + 1.0) * 91.3) * 43758.5), f); }
void main() {
  float prof = exp(-5.12 * vV * vV);
  // The sun hides what stands behind it.
  float r = length(vP.xy);
  float zs = sqrt(max(R * R - r * r, 0.0));
  float vis = max(smoothstep(R - 0.8, R + 0.8, r), smoothstep(-1.5, 0.8, vP.z - zs));
  // The cool chromosphere dims the feet, except on the ribbons.
  float feet = vKind == 1.0 ? 1.0 : mix(0.35, 1.0, smoothstep(0.0, 6.0, vHgt));
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
  // Prominences: knots of cool plasma slide down toward the feet.
  if (vKind >= 3.0) {
    float fl = foot * 40.0 + uTime * 0.6 + vPh * 13.0;
    float kn = n1(fl) * 0.7 + n1(fl * 2.7 + 5.0) * 0.5;
    I *= 0.35 + 1.1 * kn * kn;
  }
  float cf = vKind >= 3.0 ? 1.0 : vKind == 2.0 ? 0.8 : vKind == 1.0 ? 0.5 : 0.0;
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
const VOL = `${HEAD}
precision highp sampler3D;
uniform sampler3D uNoise;
uniform vec4 uView;
uniform mat3 uToSun;
uniform float uTime, uDens, uDust, uLight, uCorona, uBend;
in vec2 vUv;
out vec4 o;
const float R = ${R.toFixed(1)};
const float SIG = 0.0022;
float nz(vec3 p) { return texture(uNoise, p).r; }
float fbm3(vec3 p) { return nz(p) * 0.5 + nz(p * 2.03 + 0.31) * 0.25 + nz(p * 4.01 + 0.67) * 0.125 + nz(p * 8.03 + 0.13) * 0.0625; }
// The density: a shell of haze round the star, and clouds of dust in it.
float dens(vec3 p, bool lite) {
  float r = length(p);
  if (r < R) return 0.0;
  // One noise cell is about 90 units; the texture repeats every 64 cells.
  // The haze sits in the star's frame, so it turns with the star.
  vec3 q = (uToSun * p) / 5800.0 + vec3(uTime * 0.00012, 0.0, uTime * 0.00006);
  vec3 w = vec3(nz(q * 0.6), nz(q * 0.6 + 0.37), nz(q * 0.6 + 0.71)) - 0.5;
  float f = lite ? nz(q + w * 0.6) * 0.7 + nz(q * 2.03 + w + 0.31) * 0.3 : fbm3(q + w * 0.6);
  float h = r - R;
  float shell = exp(-h / (320.0 + 160.0 * uDust));
  float cl = smoothstep(0.48 - 0.04 * uDust, 0.76, f);
  // Less haze straight in front of the disk, so the star's face stays clear.
  float face = 1.0 - 0.5 * smoothstep(0.2 * R, 1.2 * R, p.z) * smoothstep(1.1 * R, 0.6 * R, length(p.xy));
  return uDens * face * (shell * (0.08 + 2.4 * cl) + uDust * 0.15 * cl * smoothstep(3.5 * R, R, r));
}
// The corona in 3D, in the star's own frame: optically thin, it scatters the star's light.
// Streamers gather on a warped sheet round the magnetic equator and narrow as they climb.
// They bend in a slow spiral with height; polar plumes stand at the poles; fine rays run radially.
float corona(vec3 p) {
  vec3 q = uToSun * p;
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
float lightT(vec3 p) {
  vec3 k = -normalize(p);
  float sum = dens(p + k * 40.0, true) * 40.0 + dens(p + k * 110.0, true) * 70.0 + dens(p + k * 260.0, true) * 150.0;
  float tau = sum * SIG * ABSORB * 0.5;
  float beer = exp(-tau);
  float ms = exp(-tau * 0.25) * 0.5;
  float base = mix(beer, beer + ms, MULTI);
  float powder = 1.0 - exp(-tau * 2.0);
  float fin = mix(base, base * powder, POWDER);
  return clamp(fin + AMBIENT, 0.0, 1.0);
}
/* ---------- end K3 lighting ---------- */
void main() {
  vec2 P = uView.xy + (vUv * 2.0 - 1.0) * uView.zw;
  float r = length(P);
  // The corona reaches far, so the march does too when it shows.
  float reach = uCorona > 0.0 ? 3.4 * R : 2.2 * R;
  float z1 = r < R ? sqrt(R * R - r * r) : -reach;
  float z0 = reach;
  const int N = 32;
  float dt = (z0 - z1) / float(N);
  // Interleaved gradient noise, stepped each frame so no pattern holds still.
  float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))) + 0.618034 * floor(uTime * 30.0));
  float T = 1.0;
  float acc = 0.0;
  for (int i = 0; i < N; i++) {
    vec3 p = vec3(P, z0 - dt * (float(i) + j));
    if (uCorona > 0.0) {
      // Thomson scattering: brightest seen side on, a cos squared lobe toward the eye.
      float cz = normalize(p).z;
      acc += T * corona(p) * (0.75 * (1.0 + cz * cz)) * dt * 0.0009 * uCorona;
    }
    float d = dens(p, false);
    if (d < 0.002) continue;
    float rr = length(p);
    // The light falls with the square of the distance; it travels outward from the star.
    float Ls = uLight * R * R / (rr * rr);
    float ph = hg(normalize(p).z, G_HG) * 12.56637;
    float al = 1.0 - exp(-d * SIG * dt);
    // Dust absorbs as well as scatters: an albedo below one, so lanes darken the light.
    acc += T * al * 0.6 * Ls * lightT(p) * ph;
    T *= 1.0 - al;
    if (T < 0.02) break;
  }
  o = vec4(acc, 0.0, 0.0, T);
}`;

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
uniform vec4 uSat[2];
uniform vec4 uView, uMix, uBodyA, uBodyB, uCam, uFilm, uFx1, uFx2, uFx3;
uniform vec2 uBodyK;
uniform vec3 uHal, uStreak;
uniform vec2 uRes, uC;
uniform float uFrame, uTime, uExpo, uSc, uRow, uLens, uHaze, uFull;
in vec2 vUv;
out vec4 o;
const float R = ${R.toFixed(1)};
${NOISE}
float hash(vec2 p) { p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
// The kernel's white core, added to the hot light before the grade.
float kern(vec2 fc) {
  float s = 0.0;
  for (int k = 0; k < 2; k++) {
    float S = uSat[k].z;
    if (S <= 0.0) continue;
    vec2 d = (fc - uSat[k].xy) / uSc;
    s += S * (6.0 * exp(-dot(d, d) / 90.0) + 1.2 * exp(-dot(d, d) / 2400.0));
  }
  return s;
}
vec2 sig(vec2 uv, float kx) {
  vec4 v = texture(uVol, uv);
  // No haze over the disk, save on dusty stars: it read as blobs on every star.
  float off = smoothstep(R * 0.97, R * 1.03, length(uView.xy + (uv * 2.0 - 1.0) * uView.zw));
  v = mix(vec4(0.0, 0.0, 0.0, 1.0), v, max(off, min(uFilm.w, 1.0)));
  // The volume dims what lies behind it and adds the star light it scatters.
  vec3 h = (texture(uHdr, uv).rgb + texture(uRays, uv).rgb * uMix.x * uFx1.y) * v.a + texture(uBloom, uv).rgb * 0.38 * uFx1.x;
  return vec2(h.r * uMix.y + kx + v.r, h.g * uMix.z + v.r * 0.15);
}
vec3 grade(vec2 s) {
  float I = s.x + s.y;
  // The full view shows the whole bright disk, so it takes less exposure.
  float t = 1.0 - exp(-I * uExpo * uFx3.y * (1.0 - 0.15 * uLens) * (1.0 - 0.5 * uFull));
  // The long lens presses the tones: a slightly darker, harder curve.
  t = pow(t, 1.0 + 0.15 * uLens);
  float fr = s.y / max(I, 1e-5);
  vec3 a = texture(uLut, vec2(t, (uRow * 2.0 + 0.5) / ${LUTS.length.toFixed(1)})).rgb;
  vec3 b = texture(uLut, vec2(t, (uRow * 2.0 + 1.5) / ${LUTS.length.toFixed(1)})).rgb;
  return mix(a, b, fr);
}
// The star's own light at a point: full on the disk, falling off above it.
float starLight(vec2 P) {
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
void main() {
  // Gate weave: the frame drifts a fraction of a pixel, as film does in a gate.
  vec2 weave = (vec2(vn(vec3(uFrame * 0.37, 1.0, 0.0)), vn(vec3(uFrame * 0.37, 5.0, 0.0))) - 0.5) * uFilm.y / uRes;
  vec2 uv = vUv + weave;
  vec2 P = uView.xy + (uv * 2.0 - 1.0) * uView.zw;
  float r = length(P);
  // Gravity bends the light round a neutron star: the sky slides outward at the limb.
  // The shift never reaches into the disk, so the limb stays single.
  if (uCam.z > 0.0 && r > R) uv -= normalize(P) * min(uCam.z * 0.08 * R * R / r, (r - R) * 0.75) / uView.zw * 0.5;
  // Heat bends the air above the limb.
  float hr = r - R;
  float hz = exp(-abs(hr) / 25.0) + 0.3 * exp(-max(hr, 0.0) / 120.0);
  vec2 wob = vec2(vn(vec3(P * 0.05, uTime * 0.3)), vn(vec3(P * 0.05 + 7.7, uTime * 0.3))) - 0.5;
  uv += wob * hz * uMix.w * uFx3.z / uRes;
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
  // The lens: an anamorphic streak and ghosts from each saturated core.
  vec2 cs = uRes * 0.5;
  for (int k = 0; k < 2; k++) {
    float S = uSat[k].z;
    if (S <= 0.0) continue;
    vec2 d = (gl_FragCoord.xy - uSat[k].xy) / uSc;
    float st = exp(-d.y * d.y / 10.0) * exp(-abs(d.x) / (260.0 * (0.4 + S))) * 0.9
             + exp(-d.y * d.y / 160.0) * exp(-abs(d.x) / 500.0) * 0.25;
    c += uStreak * st * min(S, 1.5) * uFx2.x;
    for (int g = 0; g < 3; g++) {
      float m = g == 0 ? -0.45 : g == 1 ? -0.95 : -1.6;
      float rad = (g == 0 ? 18.0 : g == 1 ? 42.0 : 10.0) * uSc;
      vec2 gp = cs + (uSat[k].xy - cs) * m;
      float dist = length(gl_FragCoord.xy - gp);
      float disc = smoothstep(rad, rad * 0.75, dist) * (0.6 + 0.4 * smoothstep(rad * 0.5, rad, dist));
      vec3 tint = g == 1 ? uStreak.bgr : uStreak;
      c += tint * disc * 0.05 * S * uFx2.x;
    }
  }
  // The scale bodies.
  vec2 fc = uv * uRes;
  c = body(c, fc, uBodyA, uBodyK.x);
  c = body(c, fc, uBodyB, uBodyK.y);
  float sl = starLight(P);
  vec3 hc = grade(vec2(0.5 + 1.6 * sl + bll * 0.6, 0.1 + 0.3 * sl));
  // Lens dirt: smudges on the glass that glow where bright light falls.
  float dirt = smoothstep(0.55, 0.85, fbm(vec3(vUv * vec2(uRes.x / uRes.y, 1.0) * 3.0, 11.0))) * 0.7
             + smoothstep(0.8, 0.95, fbm(vec3(vUv * 18.0, 13.0)));
  // No dirt over the disk: it sat in the same place on every star.
  dirt *= smoothstep(R * 1.0, R * 1.15, r);
  c += hc * dirt * (1.0 - exp(-bll * 0.6)) * 0.35 * uFilm.z * uFx2.y;
  // Highlights roll off to white, as on film.
  float lum = dot(c, vec3(0.3, 0.55, 0.15));
  c = mix(c, vec3(1.0, 0.98, 0.94), smoothstep(0.85, 1.05, lum) * 0.35 * uFx2.z);
  vec2 v = vUv - 0.5;
  c *= clamp(1.0 - (0.6 + 0.25 * uLens) * uFx2.w * pow(length(v * vec2(1.0, 0.9)) * 1.35, 2.2), 0.15, 1.0);
  // Fine film grain, strongest in the mid tones: a light touch.
  float l = dot(c, vec3(0.3, 0.55, 0.15));
  vec2 g2 = floor(gl_FragCoord.xy / max(1.0, uRes.y / 900.0));
  float gr = hash(g2 + uFrame * 17.0) + hash(g2 * 1.7 + uFrame * 5.0) - 1.0;
  c += gr * uFilm.x * uFx3.x * (0.3 + 3.0 * l * (1.0 - l));
  o = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

// opts.fluid: the fluid probe (?fluid) builds its programs and grid.
export async function makeRender(gl, opts = {}) {
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) throw new Error('no float targets');
  const P = await linked(gl, {
    sky: program(gl, TRI_VS, SKY),
    strand: program(gl, STRAND_VS, STRAND_FS),
    rays: program(gl, TRI_VS, RAYS),
    vol: program(gl, TRI_VS, VOL),
    blur: program(gl, TRI_VS, BLUR),
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

  let hdr = null, rays = null, volA = null, volB = null, W = 0, H = 0;
  // shift: the volume's size as a power of two below the frame; 1 is half size.
  function resize(w, h, shift = 1) {
    W = Math.max(2, w); H = Math.max(2, h);
    gl.canvas.width = W; gl.canvas.height = H;
    free(gl, hdr); free(gl, rays); free(gl, volA); free(gl, volB);
    hdr = target(gl, W, H);
    rays = target(gl, Math.max(2, W >> 1), Math.max(2, H >> 1));
    // The volume marches at half size, a quarter on slow machines; the blur hides the dither.
    volA = target(gl, Math.max(2, W >> shift), Math.max(2, H >> shift));
    volB = target(gl, Math.max(2, W >> shift), Math.max(2, H >> shift));
  }
  // v: view, rot, toSun, time, band (the star), regs, flares, sat, count, bloom, frame, centre, bodies, lens.
  function frame(v) {
    if (!hdr) return;
    gl.disable(gl.BLEND);
    if (fluid && v.fluid) fluid.step(v.fluid.step);
    const s = P.sky;
    gl.useProgram(s.p);
    gl.uniform4fv(s.u.uView, v.view);
    gl.uniformMatrix3fv(s.u.uToSun, false, v.toSun);
    gl.uniform1f(s.u.uTime, v.time % 4000);
    gl.uniform4fv(s.u.uDisk, v.band.disk);
    gl.uniform4fv(s.u.uDisk2, v.band.disk2);
    gl.uniform4fv(s.u.uTex, v.band.tex);
    gl.uniform1f(s.u.uDust, v.band.dust);
    gl.uniform1f(s.u.uFull, v.full);
    gl.uniform4fv(s.u.uBeam, v.beam);
    gl.uniform4fv(s.u.uSpin, v.spin);
    gl.uniform4fv(s.u.uGrav, v.band.grav);
    gl.uniform4fv(s.u.uCloud, v.band.clouds);
    gl.uniform4fv(s.u.uYso, v.yso);
    gl.uniform4fv(s.u.uReg, v.regs);
    gl.uniform4fv(s.u.uFl, v.fl);
    gl.uniform4fv(s.u.uFlW, v.flW);
    gl.uniform4fv(s.u.uFlB, v.flB);
    tri(gl, hdr, empty);

    if (v.count > 0) {
      const p = P.strand;
      gl.useProgram(p.p);
      gl.uniformMatrix3fv(p.u.uRot, false, v.rot);
      gl.uniform4fv(p.u.uView, v.view);
      gl.uniform2f(p.u.uRes, W, H);
      gl.uniform1f(p.u.uTime, v.time % 4000);
      gl.uniform1f(p.u.uRain, v.band.rain);
      gl.uniform1f(p.u.uGain, 1 + 0.9 * v.lens);
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
    const r = P.rays;
    gl.useProgram(r.p);
    bind(gl, r, 'uSrc', 0, hdr);
    gl.uniform2fv(r.u.uC, v.centre);
    gl.uniform1f(r.u.uThr, 0.45);
    tri(gl, rays, empty);

    const vp = P.vol;
    gl.useProgram(vp.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_3D, noise);
    gl.uniform1i(vp.u.uNoise, 0);
    gl.uniform4fv(vp.u.uView, v.view);
    gl.uniform1f(vp.u.uTime, v.time % 4000);
    gl.uniform1f(vp.u.uDens, v.volDens);
    gl.uniform1f(vp.u.uDust, v.band.dust);
    gl.uniform1f(vp.u.uLight, v.volLight);
    gl.uniformMatrix3fv(vp.u.uToSun, false, v.toSun);
    gl.uniform1f(vp.u.uCorona, v.corona);
    gl.uniform1f(vp.u.uBend, v.bend);
    tri(gl, volA, empty);
    const bp = P.blur;
    gl.useProgram(bp.p);
    bind(gl, bp, 'uSrc', 0, volA);
    gl.uniform2f(bp.u.uStep, 1, 0);
    tri(gl, volB, empty);
    bind(gl, bp, 'uSrc', 0, volB);
    gl.uniform2f(bp.u.uStep, 0, 1);
    tri(gl, volA, empty);

    const f = P.final;
    gl.useProgram(f.p);
    bind(gl, f, 'uHdr', 0, hdr);
    bind(gl, f, 'uBloom', 1, bt);
    bind(gl, f, 'uRays', 2, rays);
    bind(gl, f, 'uLut', 3, lutT);
    bind(gl, f, 'uVol', 4, volA);
    const B = v.band;
    gl.uniform4fv(f.u.uSat, v.sat);
    gl.uniform4fv(f.u.uView, v.view);
    gl.uniform4f(f.u.uMix, B.rays, B.hotW, B.coolW, v.shimmer);
    gl.uniform4fv(f.u.uBodyA, v.bodyA);
    gl.uniform4fv(f.u.uBodyB, v.bodyB);
    gl.uniform2fv(f.u.uBodyK, v.bodyK);
    gl.uniform1f(f.u.uLens, v.lens);
    gl.uniform1f(f.u.uFull, v.full);
    gl.uniform4fv(f.u.uCam, v.cam);
    gl.uniform4fv(f.u.uFilm, v.film);
    gl.uniform4fv(f.u.uFx1, v.fx1);
    gl.uniform4fv(f.u.uFx2, v.fx2);
    gl.uniform4fv(f.u.uFx3, v.fx3);
    gl.uniform1f(f.u.uHaze, Math.min(1, 0.4 + 0.6 * v.lens + 0.3 * v.band.dust));
    gl.uniform3fv(f.u.uHal, B.hal);
    gl.uniform3fv(f.u.uStreak, B.streak);
    gl.uniform2f(f.u.uRes, W, H);
    gl.uniform2fv(f.u.uC, v.centre);
    gl.uniform1f(f.u.uFrame, v.frameNo % 64);
    gl.uniform1f(f.u.uTime, v.time % 4000);
    gl.uniform1f(f.u.uExpo, B.expo);
    gl.uniform1f(f.u.uSc, v.sc);
    gl.uniform1f(f.u.uRow, B.row);
    tri(gl, null, empty);
  }
  return { resize, frame, data };
}
