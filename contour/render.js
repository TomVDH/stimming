// Contour map renderer: raw WebGL2, one full-screen program.
// The height grid is sampled as a smooth B-spline surface.
// Tints, hill shading, contour lines, water and labels' gaps follow in one pass.
import { program, linked, TRI_VS } from '../shared/gl.js';
import { N, CELL, STEP, INDEX, H_MIN, H_MAX } from './terrain.js';

export const MAX_LABELS = 40;

const SHEET = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uH, uW, uLut, uL;
uniform vec2 uRes, uOrg;
uniform float uPx, uDpr, uFrame, uRelief;
uniform vec4 uLabA[${MAX_LABELS}];
uniform vec4 uLabB[${MAX_LABELS}];
uniform int uLabN;
const float NN = ${N}.0;
const float CELLM = ${CELL}.0;
const float STEPM = ${STEP}.0;
const float INDEXM = ${INDEX}.0;
const float HMIN = ${H_MIN}.0, HMAX = ${H_MAX}.0;

// A cubic B-spline sample from four bilinear reads.
// p is in cells; cell i has its centre at p = i.
float bsp(vec2 p) {
  vec2 i = floor(p), f = p - i;
  vec2 f2 = f * f, f3 = f2 * f;
  vec2 w0 = (1.0 - 3.0 * f + 3.0 * f2 - f3) / 6.0;
  vec2 w1 = (4.0 - 6.0 * f2 + 3.0 * f3) / 6.0;
  vec2 w2 = (1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3) / 6.0;
  vec2 w3 = f3 / 6.0;
  vec2 g0 = w0 + w1, g1 = w2 + w3;
  vec2 h0 = (i - 1.0 + w1 / g0 + 0.5) / NN;
  vec2 h1 = (i + 1.0 + w3 / g1 + 0.5) / NN;
  float a = texture(uH, vec2(h0.x, h0.y)).r, b = texture(uH, vec2(h1.x, h0.y)).r;
  float c = texture(uH, vec2(h0.x, h1.y)).r, d = texture(uH, vec2(h1.x, h1.y)).r;
  return g0.y * (g0.x * a + g1.x * b) + g1.y * (g0.x * c + g1.x * d);
}
float hash(vec2 p) { vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = p - i;
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
// The tint table holds gamma sRGB, so the dark sea does not band.
// Row 0 is the land, 0 to HMAX; row 1 is the sea, HMIN to 0.
vec3 tint(float h) {
  vec2 uv = h >= 0.0 ? vec2(h / HMAX, 0.25) : vec2(h / HMIN, 0.75);
  return pow(texture(uLut, vec2(uv.x * 255.0 / 256.0 + 0.5 / 256.0, uv.y)).rgb, vec3(2.2));
}
// Distance in pixels to the nearest line of a spacing, and the line spacing in pixels.
float lineA(float h, float spacing, float gpx, float halfW) {
  float d = abs(fract(h / spacing + 0.5) - 0.5) * spacing / max(gpx, 1e-5);
  return 1.0 - smoothstep(halfW - 0.6, halfW + 0.6, d);
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 p = uOrg + px * uPx;
  float h = bsp(p);
  // The gradient in metres per cell.
  const float E = 0.5;
  vec2 g = vec2(bsp(p + vec2(E, 0.0)) - bsp(p - vec2(E, 0.0)), bsp(p + vec2(0.0, E)) - bsp(p - vec2(0.0, E))) / (2.0 * E);
  // Metres per device pixel, for line widths.
  float gpx = length(g) * uPx;
  float wetS = texture(uW, (p + 0.5) / NN).r;
  vec2 v = vUv - 0.5;

  /* land: tint and hill shade */
  // Shading uses a raised relief, so low hills still read.
  vec3 n = normalize(vec3(-g * uRelief / CELLM, 1.0));
  vec3 L = normalize(vec3(-0.62, -0.78, 0.9));
  float flat_ = L.z;
  float sh = dot(n, L) - flat_;
  // Dry ground below zero keeps the lowland tint, a shade darker.
  vec3 land = tint(max(h, 0.0)) * (1.0 - 0.18 * smoothstep(0.0, -60.0, h));
  // Shade falls cool blue-grey; lit slopes take a warm cream.
  vec3 shadeC = vec3(0.16, 0.19, 0.27);
  float dark = clamp(-sh * 1.25, 0.0, 0.85);
  float lit = clamp(sh * 1.4, 0.0, 0.6);
  // High ground takes more contrast, as in Swiss relief.
  float alt = clamp(h / 1400.0, 0.0, 1.0);
  dark *= 0.8 + 0.45 * alt;
  land = mix(land, land * shadeC * 2.2, dark);
  land += vec3(0.26, 0.21, 0.12) * lit * (0.6 + 0.6 * alt);
  // Paper grain: fibres and a little tooth.
  float fib = vnoise(px / uDpr * vec2(0.9, 0.22)) * 0.6 + vnoise(px / uDpr * 0.45) * 0.4;
  land *= 0.97 + 0.05 * fib;

  /* water: the sea and the lakes */
  // Pixels from the coast, by the first-order distance h / |grad h|.
  float coastPx = h / max(gpx, 1e-5);
  float landA = smoothstep(-0.75, 0.75, coastPx / uDpr);
  float wetA = smoothstep(0.08, 0.3, wetS);
  float seaA = wetA * (1.0 - landA);
  // A lake: its level over each cell and the pale edge of rising water.
  vec2 lk = texture(uL, (p + 0.5) / NN).rg;
  float near = step(-5000.0, lk.r);
  float dL = lk.r - h;
  float shorePx = dL / max(gpx, 1e-5);
  float lakeA = near * smoothstep(-0.75, 0.75, shorePx / uDpr);
  float isLake = step(seaA, lakeA);
  float waterA = max(seaA, lakeA);
  // Depth under the surface, and CSS pixels out from the shore.
  float depth = mix(-h, dL, isLake);
  float dist = mix(-coastPx, shorePx, isLake) / uDpr;
  vec3 sea = tint(-max(depth, 0.01));
  // A soft swell of light on the water, fixed in place.
  sea *= 0.96 + 0.06 * vnoise(px / uDpr * 0.05 + 3.0);
  float grain = 0.55 + 0.45 * vnoise(px / uDpr * 0.35);
  // The new sea: a pale front that clears as it settles.
  float fresh = (1.0 - smoothstep(0.35, 1.0, wetS)) * (1.0 - isLake);
  // A rising lake: a pale band at its shore and a lighter skin of new water.
  float rise = lk.g * isLake;
  float edge = rise * (1.0 - smoothstep(0.5, 6.0, dist)) * (0.6 + 0.4 * vnoise(px / uDpr * 0.6 + uFrame * 0.07));
  float foam = max(fresh * grain, edge);
  sea = mix(sea, vec3(0.8, 0.91, 0.96), clamp(foam * 0.75 + rise * 0.12, 0.0, 0.8));

  vec3 col = mix(land, sea, waterA);

  /* label gaps */
  float gap = 0.0;
  for (int i = 0; i < ${MAX_LABELS}; i++) {
    if (i >= uLabN) break;
    vec4 A = uLabA[i], B = uLabB[i];
    vec2 d = px - A.xy;
    vec2 q = vec2(dot(d, A.zw), dot(d, vec2(-A.w, A.z)));
    vec2 e = abs(q) - B.xy;
    float inside = 1.0 - smoothstep(-1.0, 1.0, max(e.x, e.y));
    gap = max(gap, inside * B.z);
  }
  float keep = 1.0 - gap;

  /* contour lines on land */
  float dens = INDEXM / STEPM;
  float spacingPx = STEPM / max(gpx, 1e-5);
  float thin = lineA(h, STEPM, gpx, 0.42 * uDpr) * smoothstep(2.0 * uDpr, 4.2 * uDpr, spacingPx);
  float idx = lineA(h, INDEXM, gpx, 0.8 * uDpr);
  vec3 brown = vec3(0.34, 0.16, 0.06);
  float onLand = 1.0 - waterA;
  float la = max(thin * 0.62, idx * 0.9) * onLand * keep;
  col = mix(col, brown * (0.75 + 0.25 * fib), la);

  /* lines in the water */
  vec3 blue = vec3(0.04, 0.2, 0.42);
  // Depth lines every 50 m, faint.
  float depthL = lineA(depth, 50.0, gpx, 0.4 * uDpr) * smoothstep(2.5 * uDpr, 5.0 * uDpr, 50.0 / max(gpx, 1e-5));
  // Water-lines follow the shore at growing gaps, as on old survey sheets.
  float wl = 0.0;
  wl = max(wl, (1.0 - smoothstep(0.35, 0.95, abs(dist - 3.6))) * 0.55);
  wl = max(wl, (1.0 - smoothstep(0.35, 0.95, abs(dist - 8.2))) * 0.36);
  wl = max(wl, (1.0 - smoothstep(0.35, 0.95, abs(dist - 14.5))) * 0.2);
  // The first-order distance holds only near a clear slope.
  wl *= smoothstep(0.0, 0.004, gpx / max(depth, 1.0)) * step(dist, 18.0);
  float sa = max(depthL * 0.32, wl) * waterA * keep * (1.0 - foam * 0.8);
  col = mix(col, blue, sa);
  // The shore: a dark blue line where the water meets the land.
  float seaLine = (1.0 - smoothstep(0.55 * uDpr - 0.6, 0.55 * uDpr + 0.6, abs(coastPx))) * wetA;
  float lakeLine = (1.0 - smoothstep(0.55 * uDpr - 0.6, 0.55 * uDpr + 0.6, abs(shorePx))) * near;
  col = mix(col, blue * 0.8, max(seaLine, lakeLine) * 0.92);

  /* the sheet's edge falls into the dark stage */
  col *= 1.0 - 0.55 * pow(clamp(dot(v * vec2(1.05, 1.2), v * vec2(1.05, 1.2)) * 1.9, 0.0, 1.0), 1.6);
  col = pow(max(col, 0.0), vec3(1.0 / 2.2));
  col += (hash(gl_FragCoord.xy + uFrame * 7.1) - 0.5) * 0.008;
  o = vec4(col, 1.0);
}`;

export async function makeRenderer(gl) {
  const P = await linked(gl, { sheet: program(gl, TRI_VS, SHEET) });
  const vao = gl.createVertexArray();
  const tex = (fmt, w, h, filt) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texStorage2D(gl.TEXTURE_2D, 1, fmt, w, h);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, filt], [gl.TEXTURE_MAG_FILTER, filt], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    return t;
  };
  // Heights as half floats: filterable on every WebGL2 device.
  const hTex = tex(gl.R16F, N, N, gl.LINEAR);
  const wTex = tex(gl.R8, N, N, gl.LINEAR);
  const lutTex = tex(gl.RGBA8, 256, 2, gl.LINEAR);
  // Lakes: the level and the rising edge, as half floats.
  const lTex = tex(gl.RG16F, N, N, gl.LINEAR);
  const lhalf = new Uint16Array(N * N * 2);
  const half = new Uint16Array(N * N);
  // Float to half float, round to nearest.
  const f32 = new Float32Array(1), u32 = new Uint32Array(f32.buffer);
  const toHalf = v => {
    f32[0] = v;
    const x = u32[0], s = (x >>> 16) & 0x8000;
    let e = ((x >>> 23) & 0xff) - 112, m = x & 0x7fffff;
    if (e <= 0) return s;
    if (e >= 31) return s | 0x7c00;
    m += 0x1000;
    if (m & 0x800000) { m = 0; e++; }
    return s | (e << 10) | (m >>> 13);
  };

  let W = 2, H = 2;
  return {
    resize(w, h) { W = Math.max(2, w); H = Math.max(2, h); gl.canvas.width = W; gl.canvas.height = H; },
    // Uploads the box of heights that changed.
    upHeights(hs, box) {
      if (!box) return;
      const [x0, y0, x1, y1] = box, w = x1 - x0 + 1;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) half[y * N + x] = toHalf(hs[y * N + x]);
      gl.bindTexture(gl.TEXTURE_2D, hTex);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 2);
      gl.pixelStorei(gl.UNPACK_ROW_LENGTH, N);
      gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, x0);
      gl.pixelStorei(gl.UNPACK_SKIP_ROWS, y0);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, x0, y0, w, y1 - y0 + 1, gl.RED, gl.HALF_FLOAT, half);
      gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0); gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    },
    // Uploads the box of lake levels that changed.
    upLakes(lv, fm, box) {
      if (!box) return;
      const [x0, y0, x1, y1] = box, w = x1 - x0 + 1;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = y * N + x; lhalf[2 * c] = toHalf(lv[c]); lhalf[2 * c + 1] = toHalf(fm[c]); }
      gl.bindTexture(gl.TEXTURE_2D, lTex);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 2);
      gl.pixelStorei(gl.UNPACK_ROW_LENGTH, N);
      gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, x0);
      gl.pixelStorei(gl.UNPACK_SKIP_ROWS, y0);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, x0, y0, w, y1 - y0 + 1, gl.RG, gl.HALF_FLOAT, lhalf);
      gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0); gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    },
    upWet(wet, box) {
      if (!box) return;
      const [x0, y0, x1, y1] = box;
      gl.bindTexture(gl.TEXTURE_2D, wTex);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.pixelStorei(gl.UNPACK_ROW_LENGTH, N);
      gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, x0);
      gl.pixelStorei(gl.UNPACK_SKIP_ROWS, y0);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1, gl.RED, gl.UNSIGNED_BYTE, wet);
      gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0); gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    },
    // The tints: two rows of 256 gamma sRGB colours, land then sea.
    setLut(rgb) {
      const d = new Uint8Array(512 * 4);
      for (let i = 0; i < 512; i++) for (let k = 0; k < 3; k++) d[i * 4 + k] = Math.round(Math.min(1, Math.max(0, rgb[i][k])) * 255);
      gl.bindTexture(gl.TEXTURE_2D, lutTex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, 2, gl.RGBA, gl.UNSIGNED_BYTE, d);
    },
    // org: the cell at the top-left pixel; px: cells per device pixel.
    draw({ org, px, dpr, frame, relief, labA, labB, labN }) {
      const p = P.sheet;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W, H);
      gl.useProgram(p.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, hTex); gl.uniform1i(p.u.uH, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, wTex); gl.uniform1i(p.u.uW, 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, lutTex); gl.uniform1i(p.u.uLut, 2);
      gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, lTex); gl.uniform1i(p.u.uL, 3);
      gl.uniform2f(p.u.uRes, W, H);
      gl.uniform2f(p.u.uOrg, org[0], org[1]);
      gl.uniform1f(p.u.uPx, px);
      gl.uniform1f(p.u.uDpr, dpr);
      gl.uniform1f(p.u.uFrame, frame);
      gl.uniform1f(p.u.uRelief, relief);
      if (labN > 0) {
        gl.uniform4fv(p.u.uLabA, labA, 0, labN * 4);
        gl.uniform4fv(p.u.uLabB, labB, 0, labN * 4);
      }
      gl.uniform1i(p.u.uLabN, labN);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
