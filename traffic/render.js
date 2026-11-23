// Traffic wave renderer: raw WebGL2, four small programs.
// Ground: the lot, the lane and every lamp's light on it.
// Cars: one instanced quad per car. Strip: the space-time plot.
// Then bloom and a grade.
import { program, linked, target, free, bind, tri, TRI_VS } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { RADIUS, MAX_CARS } from './sim.js';

export const COLS = 512, ROWS = 512;
const HEAD = `#version 300 es
precision highp float;
`;
// Car data, in ring order: car i follows car i + 1.
// A: x, y, heading x, heading y. B: half length, brake lamp, fade, paint.
// C: light from the car behind on this car, the leader's lamp, hover, spare.
const CARS = `
uniform vec4 uA[${MAX_CARS}];
uniform vec4 uB[${MAX_CARS}];
uniform vec4 uC[${MAX_CARS}];
uniform int uN;
`;
const NOISE = `
float hash(vec2 p) { vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float sdBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
`;

// The ground, per pixel, in metres. The ring's centre is the origin.
const GROUND = `${HEAD}${CARS}${NOISE}
const vec2 FLOOD = vec2(-78.0, 64.0);
in vec2 vUv;
out vec4 o;
uniform vec2 uRes, uC0;
uniform float uScale, uR, uPx;
void main() {
  vec2 p = (gl_FragCoord.xy - uC0) / uScale;
  float r = length(p);
  float dl = r - uR;
  // Asphalt: coarse stone, a slow patchwork, and wear along the lane.
  float grain = vnoise(p * 7.0) * 0.6 + vnoise(p * 23.0) * 0.4;
  float patchy = vnoise(p * 0.12) * 0.7 + vnoise(p * 0.6) * 0.3;
  vec3 alb = vec3(0.060, 0.061, 0.066) * (0.78 + 0.34 * grain) * (0.86 + 0.28 * patchy);
  // Two polished wheel tracks in the lane.
  float tracks = exp(-pow((abs(dl) - 0.78) / 0.32, 2.0));
  alb *= 1.0 - 0.18 * tracks;
  float gloss = 0.35 + 0.65 * tracks;
  // The island: a low concrete kerb, then rough dark grass.
  float isl = smoothstep(uR - 3.0 + uPx, uR - 3.0 - uPx, r);
  float kerb = smoothstep(uR - 3.25 - uPx, uR - 3.25 + uPx, r) * isl;
  vec3 grass = vec3(0.030, 0.046, 0.024) * (0.55 + 0.9 * vnoise(p * 3.1) * vnoise(p * 11.0 + 3.0)) * (0.8 + 0.4 * vnoise(p * 0.35));
  alb = mix(alb, grass, isl);
  alb = mix(alb, vec3(0.16, 0.16, 0.155) * (0.8 + 0.3 * grain), kerb);
  gloss *= 1.0 - isl;
  // The lane's edge lines, worn white paint.
  float wear = smoothstep(0.25, 0.6, vnoise(p * 2.3) * 0.7 + grain * 0.3);
  float line = 0.0;
  for (int k = 0; k < 2; k++) {
    float e = abs(dl - (k == 0 ? -2.05 : 2.05)) - 0.07;
    line = max(line, 1.0 - smoothstep(-uPx, uPx, e));
  }
  // The start line: a bar across the lane at six o'clock.
  float st = (1.0 - smoothstep(0.12 - uPx, 0.12 + uPx, abs(p.x))) * step(p.y, 0.0) * (1.0 - smoothstep(2.05 - uPx, 2.05 + uPx, abs(dl)));
  line = max(line, st * 0.85);
  alb = mix(alb, vec3(0.52, 0.52, 0.5), line * mix(0.55, 1.0, wear));

  // Moonlight, cool and dim.
  vec3 light = vec3(0.30, 0.38, 0.62) * 0.3;
  // The key light: a flood mast off the lot's top left corner.
  vec2 toMast = FLOOD - p;
  float flood = 1.25 / (1.0 + dot(toMast, toMast) / 2400.0);
  vec2 away = -normalize(toMast);
  float fsh = 1.0;
  vec3 air = vec3(0.0);
  float ao = 1.0;
  int n = uN;
  for (int i = 0; i < ${MAX_CARS}; i++) {
    if (i >= n) break;
    vec4 A = uA[i], B = uB[i];
    vec2 dir = A.zw, nrm = vec2(-dir.y, dir.x);
    vec2 d = p - A.xy;
    float u = dot(d, dir), w = dot(d, nrm);
    float hl = B.x, fade = B.z;
    // Soft contact shadow under the body.
    float sb = sdBox(vec2(u, w), vec2(hl - 0.15, 0.82), 0.4);
    ao *= 1.0 - 0.8 * fade * exp(-max(sb, 0.0) * 2.4) * (sb < 0.0 ? 1.0 : 0.9);
    // The body's shadow from the mast falls away from it.
    vec2 ds = d - away * 1.1;
    float ss = sdBox(vec2(dot(ds, dir), dot(ds, nrm)), vec2(hl - 0.1, 0.85), 0.5);
    fsh *= 1.0 - 0.85 * fade * (1.0 - smoothstep(-0.3, 0.7, ss));
    // Headlights: a cone along the heading from the front bumper.
    float uf = u - hl + 0.1;
    if (uf > 0.0 && uf < 26.0) {
      float spread = 0.55 + uf * 0.15;
      float beam = exp(-pow(w / spread, 2.0)) * smoothstep(0.0, 2.2, uf) * smoothstep(26.0, 14.0, uf) / (1.0 + pow(uf / 7.5, 2.0));
      // The car ahead blocks the beam: its shadow fans out behind it.
      int j = (i + 1) % n;
      vec4 L = uA[j];
      vec2 dL = L.xy - A.xy;
      float uL = dot(dL, dir) - hl, wL = dot(dL, nrm);
      if (n > 1 && uL > 0.5 && uf > uL - uB[j].x) {
        float k = uf / max(uL, 0.5);
        float sh = 1.0 - smoothstep(0.55 * k, 1.25 * k, abs(w - wL * k));
        beam *= 1.0 - 0.72 * sh * smoothstep(uL - uB[j].x, uL - uB[j].x + 0.6, uf) * uB[j].z;
      }
      light += vec3(1.0, 0.9, 0.76) * 1.7 * beam * fade;
      air += vec3(1.0, 0.92, 0.8) * 0.0015 * beam * fade;
    }
    // Tail lights: a small red pool; brake lights make it large and bright.
    float ub = -u - hl;
    if (ub > -0.6) {
      float lamp = B.y;
      float rr = length(vec2(max(ub, 0.0), max(abs(w) - 0.5, 0.0)));
      float pool = exp(-rr * (2.6 - 1.5 * lamp)) * smoothstep(-0.6, 0.2, ub);
      light += vec3(1.0, 0.07, 0.03) * (0.3 + 5.5 * lamp) * pool * fade;
      air += vec3(1.0, 0.08, 0.04) * 0.012 * lamp * pool * fade;
    }
  }
  light += vec3(0.9, 0.92, 1.0) * flood * fsh;
  vec3 c = alb * light * ao;
  // Polished stone shows a little sheen in the beams.
  c += alb * max(light - 0.2, 0.0) * gloss * 0.35 * grain;
  o = vec4(c + air, 1.0);
}`;

// One car: a body seen from above, glass, roof and lamps.
const CAR_VS = `#version 300 es
in vec2 aCorner;
${CARS}
uniform vec2 uRes, uC0;
uniform float uScale;
out vec2 vQ;
flat out int vI;
void main() {
  int i = gl_InstanceID;
  vec4 A = uA[i], B = uB[i];
  vec2 dir = A.zw, nrm = vec2(-dir.y, dir.x);
  vec2 q = aCorner * vec2(B.x + 0.6, 1.5);
  vec2 p = A.xy + dir * q.x + nrm * q.y;
  vQ = q;
  vI = i;
  gl_Position = vec4((p * uScale + uC0) / uRes * 2.0 - 1.0, 0.0, 1.0);
}`;
const CAR_FS = `${HEAD}${CARS}${NOISE}
in vec2 vQ;
flat in int vI;
out vec4 o;
uniform float uPxM;
const vec3 PAINT[9] = vec3[9](
  vec3(0.62, 0.62, 0.6), vec3(0.34, 0.35, 0.37), vec3(0.05, 0.05, 0.055),
  vec3(0.03, 0.06, 0.16), vec3(0.32, 0.03, 0.03), vec3(0.04, 0.10, 0.07),
  vec3(0.42, 0.36, 0.26), vec3(0.18, 0.30, 0.42), vec3(0.14, 0.14, 0.15));
void main() {
  vec4 B = uB[vI], C = uC[vI];
  float hl = B.x, lamp = B.y, fade = B.z;
  vec2 q = vQ;
  float aa = uPxM * 0.75;
  float dBody = sdBox(q, vec2(hl, 0.9), 0.45);
  float cov = 1.0 - smoothstep(-aa, aa, dBody);
  // The glasshouse and the roof inside it.
  float dCab = sdBox(q - vec2(-0.1 * hl, 0.0), vec2(0.5 * hl, 0.74), 0.38);
  float dRoof = sdBox(q - vec2(-0.16 * hl, 0.0), vec2(0.29 * hl, 0.64), 0.3);
  vec3 paint = PAINT[int(B.w) % 9];
  // Ambient moonlight, the beams of the car behind on the boot, own glow.
  float behind = C.x * smoothstep(0.2 * hl, -hl, q.x);
  vec3 light = vec3(0.30, 0.38, 0.62) * 0.3 + vec3(1.0, 0.9, 0.76) * behind * 2.2 + vec3(0.9, 0.92, 1.0) * C.w;
  light += vec3(1.0, 0.07, 0.03) * C.y * 1.2 * smoothstep(-0.2 * hl, hl, q.x);
  // The body rounds off at its edges.
  float bevel = smoothstep(0.0, -0.35, dBody);
  vec3 col = paint * light * (0.45 + 0.55 * bevel);
  // A clear-coat streak along the bonnet and boot catches the light.
  float streak = exp(-pow(q.y / 0.35, 2.0)) * (0.5 + 0.5 * vnoise(q * 3.0));
  col += (light * 0.05 + vec3(0.02, 0.025, 0.04)) * streak * bevel;
  float glass = 1.0 - smoothstep(-aa, aa, dCab);
  float roof = 1.0 - smoothstep(-aa, aa, dRoof);
  // Glass: near black, with a cool sky sheen across it.
  vec3 gcol = vec3(0.006, 0.008, 0.014) + vec3(0.02, 0.028, 0.05) * smoothstep(-0.8, 0.8, q.y + q.x * 0.3);
  col = mix(col, gcol + light * 0.01, glass * (1.0 - roof));
  col = mix(col, paint * light * (0.6 + 0.4 * smoothstep(0.0, -0.3, dRoof)) + streak * 0.01, roof);
  // The hover halo: a pale rim.
  col += vec3(0.5, 0.55, 0.6) * C.z * 0.35 * (1.0 - smoothstep(0.0, 0.18, abs(dBody + 0.06)));
  // Lamps: two warm headlights, two tail lights that flare when braking.
  vec2 hq = vec2(q.x - (hl - 0.16), abs(q.y) - 0.6);
  float head = exp(-dot(hq / vec2(0.12, 0.2), hq / vec2(0.12, 0.2)));
  vec2 tq = vec2(q.x + (hl - 0.1), abs(q.y) - 0.6);
  float tail = exp(-dot(tq / vec2(0.1, 0.24), tq / vec2(0.1, 0.24)));
  vec3 emit = vec3(1.0, 0.93, 0.82) * head * 9.0 + vec3(1.0, 0.05, 0.02) * tail * (0.9 + 16.0 * lamp);
  // A soft glare round each lamp spills past the body.
  float glareH = exp(-length(hq) * 3.5) * 0.45, glareT = exp(-length(tq) * 3.8) * (0.08 + 0.7 * lamp);
  emit += vec3(1.0, 0.9, 0.78) * glareH + vec3(1.0, 0.06, 0.03) * glareT;
  float a = cov * fade;
  o = vec4(col * a + emit * fade * max(cov, 0.0) + (vec3(1.0, 0.9, 0.78) * glareH + vec3(1.0, 0.06, 0.03) * glareT) * fade * (1.0 - cov), a);
}`;

// The strip: time along one axis, the place on the ring along the other.
// Texel: R path, G speed, B brake, A the speed field between cars.
const STRIP_FS = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uTex;
uniform vec4 uRect;
uniform float uMode, uHead, uFrac, uCols, uWin, uNow, uPx, uAlpha;
uniform vec4 uMarks[6];
float sdBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  vec2 f = gl_FragCoord.xy - uRect.xy;
  vec2 sz = uRect.zw;
  // age: 0 at now, 1 at the oldest; pos: 0 to 1 round the ring.
  float age, pos;
  vec2 ext;
  if (uMode < 0.5) { age = f.x / sz.x; pos = f.y / sz.y; ext = sz; }
  else { age = 1.0 - f.y / sz.y; pos = f.x / sz.x; ext = sz.yx; }
  float inside = 1.0 - smoothstep(-1.0, 1.0, sdBox(f - sz * 0.5, sz * 0.5, 2.0));
  if (inside <= 0.0) { o = vec4(0.0); return; }
  float col = uHead - age * (uCols - 2.0) + uFrac;
  vec4 t = texture(uTex, vec2((col + 0.5) / uCols, pos));
  // The field: a deep red where cars crawl, a faint blue where they flow.
  vec3 c = vec3(0.004, 0.006, 0.012);
  c += vec3(0.30, 0.025, 0.012) * smoothstep(0.55, 0.05, t.a) * 0.4 + vec3(0.006, 0.014, 0.034) * smoothstep(0.4, 0.8, t.a);
  // Grid: a hairline each 10 s, scrolling with the data.
  float secs = age * uWin + uNow;
  float gx = abs(fract(secs / 10.0 + 0.5) - 0.5) * 10.0 / uWin * ext.x;
  c += vec3(0.02, 0.024, 0.032) * (1.0 - smoothstep(0.0, 1.0, gx));
  // Each path: cool white in flow, amber when slow, red under brakes.
  vec3 flow = vec3(0.5, 0.68, 1.0), crawl = vec3(1.0, 0.45, 0.1), brake = vec3(1.0, 0.06, 0.03);
  vec3 pc = mix(crawl, flow, smoothstep(0.15, 0.75, t.g));
  pc = mix(pc, brake * 2.2, t.b);
  // The newest columns burn brighter, then settle.
  float fresh = 1.0 + 1.4 * exp(-age * 30.0);
  c += pc * t.r * 0.26 * fresh;
  // Brake taps: a white ring where the press began.
  for (int k = 0; k < 6; k++) {
    vec4 m = uMarks[k];
    if (m.w <= 0.0) continue;
    float ma = (uNow - m.x) / uWin;
    if (ma < 0.0 || ma > 1.0) continue;
    vec2 at = uMode < 0.5 ? vec2(ma, m.y) * sz : vec2(m.y, 1.0 - ma) * sz;
    float dd = length(f - at);
    c += vec3(1.0, 0.95, 0.9) * m.w * (1.0 - smoothstep(0.6 * uPx, 1.6 * uPx, abs(dd - 6.0 * uPx))) * 0.8;
  }
  // The now edge: a thin bright seam beside the ring.
  float nowE = uMode < 0.5 ? f.x : sz.y - f.y;
  c += vec3(0.5, 0.6, 0.8) * 0.25 * (1.0 - smoothstep(0.0, 1.5 * uPx, nowE));
  // Fade toward the oldest end.
  c *= mix(1.0, 0.35, smoothstep(0.6, 1.0, age));
  o = vec4(c * inside * uAlpha, inside * 0.9 * uAlpha);
}`;
const STRIP_VS = `#version 300 es
uniform vec4 uRect;
uniform vec2 uRes;
out vec2 vUv;
void main() {
  // One triangle covers the rect; the fragment cuts it to shape.
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  vec2 px = uRect.xy + p * uRect.zw;
  gl_Position = vec4(px / uRes * 2.0 - 1.0, 0.0, 1.0);
}`;

// The grade: bloom, a filmic curve, a vignette and grain.
const FINAL = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uHdr, uBloom;
uniform float uFrame, uBloomK, uExp;
float hash(vec2 p) { vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec3 film(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec2 v = vUv - 0.5;
  vec3 c = (texture(uHdr, vUv).rgb + texture(uBloom, vUv).rgb * uBloomK) * uExp;
  // Bright lamps keep their hue: part of the curve acts on the brightest channel.
  float m = max(c.r, max(c.g, c.b));
  c = mix(film(c), c * film(vec3(m)).r / max(m, 1e-4), 0.45);
  c *= 1.0 - 0.5 * dot(v, v);
  c = pow(c, vec3(1.0 / 2.2));
  c += (hash(gl_FragCoord.xy + uFrame * 17.3) - 0.5) * 0.012;
  o = vec4(c, 1.0);
}`;

export async function makeRenderer(gl) {
  const P = await linked(gl, {
    ground: program(gl, TRI_VS, GROUND),
    car: program(gl, CAR_VS, CAR_FS, ['aCorner']),
    strip: program(gl, STRIP_VS, STRIP_FS),
    final: program(gl, TRI_VS, FINAL),
  });
  const empty = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 6 });

  const quad = gl.createVertexArray();
  gl.bindVertexArray(quad);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  // The strip's ring of columns: RGBA8, wraps along time.
  const strip = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, strip);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, COLS, ROWS);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.REPEAT], [gl.TEXTURE_WRAP_T, gl.REPEAT]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, COLS, ROWS, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(COLS * ROWS * 4));

  let hdr = null, W = 0, H = 0;
  function resize(w, h) {
    W = Math.max(2, w); H = Math.max(2, h);
    gl.canvas.width = W; gl.canvas.height = H;
    free(gl, hdr);
    hdr = target(gl, W, H, { clear: true, check: true });
  }

  // Writes one column of the strip: ROWS texels of RGBA.
  function writeColumn(col, data) {
    gl.bindTexture(gl.TEXTURE_2D, strip);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, col, 0, 1, ROWS, gl.RGBA, gl.UNSIGNED_BYTE, data);
  }
  function clearStrip() {
    gl.bindTexture(gl.TEXTURE_2D, strip);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, COLS, ROWS, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(COLS * ROWS * 4).fill(0));
  }

  const setCars = (p, o) => {
    gl.uniform4fv(p.u.uA, o.A);
    gl.uniform4fv(p.u.uB, o.B);
    gl.uniform4fv(p.u.uC, o.C);
    gl.uniform1i(p.u.uN, o.n);
  };

  // o: cars (A, B, C, n), view (cx, cy, scale), strip rect and state, levels.
  function draw(o) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, hdr.fb);
    gl.viewport(0, 0, W, H);
    gl.disable(gl.BLEND);
    const g = P.ground;
    gl.useProgram(g.p);
    setCars(g, o);
    gl.uniform2f(g.u.uRes, W, H);
    gl.uniform2f(g.u.uC0, o.cx, o.cy);
    gl.uniform1f(g.u.uScale, o.scale);
    gl.uniform1f(g.u.uR, RADIUS);
    gl.uniform1f(g.u.uPx, 1 / o.scale);
    gl.bindVertexArray(empty);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    if (o.n > 0) {
      const c = P.car;
      gl.useProgram(c.p);
      setCars(c, o);
      gl.uniform2f(c.u.uRes, W, H);
      gl.uniform2f(c.u.uC0, o.cx, o.cy);
      gl.uniform1f(c.u.uScale, o.scale);
      gl.uniform1f(c.u.uPxM, 1 / o.scale);
      gl.bindVertexArray(quad);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, o.n);
    }
    if (o.strip) {
      const s = P.strip, st = o.strip;
      gl.useProgram(s.p);
      gl.uniform2f(s.u.uRes, W, H);
      gl.uniform4f(s.u.uRect, st.x, st.y, st.w, st.h);
      gl.uniform1f(s.u.uMode, st.mode);
      gl.uniform1f(s.u.uHead, st.head);
      gl.uniform1f(s.u.uFrac, st.frac);
      gl.uniform1f(s.u.uCols, COLS);
      gl.uniform1f(s.u.uWin, st.win);
      gl.uniform1f(s.u.uNow, st.now);
      gl.uniform1f(s.u.uPx, st.px);
      gl.uniform1f(s.u.uAlpha, st.alpha);
      gl.uniform4fv(s.u.uMarks, st.marks);
      bind(gl, s, 'uTex', 0, strip);
      gl.bindVertexArray(empty);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
    const bt = bloom.render(hdr.tex, W, H, { threshold: 1.0, cap: 8, levels: o.bloomLevels });
    const f = P.final;
    gl.useProgram(f.p);
    bind(gl, f, 'uHdr', 0, hdr);
    bind(gl, f, 'uBloom', 1, bt);
    gl.uniform1f(f.u.uBloomK, 0.55);
    gl.uniform1f(f.u.uExp, o.exposure);
    gl.uniform1f(f.u.uFrame, o.frameNo % 64);
    tri(gl, null, empty);
  }

  return { resize, draw, writeColumn, clearStrip };
}
