// Interchange trails renderer: raw WebGL2.
// The plate: a float buffer that holds the long exposure. Each frame it fades a little,
// and every lamp adds a stroke from where it was to where it is.
// A slow car stays longer on each metre, so it burns brighter: jams show as knots.
// Then the map, the plate and the live cars go into one HDR frame, with bloom and a grade.
import { program, linked, target, free, bind, tri, TRI_VS } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { MAX_CARS } from './sim.js';

const HEAD = `#version 300 es
precision highp float;
`;

// One lamp stroke: a capsule in screen pixels, energy spread along its length.
const SEG_VS = `#version 300 es
in vec2 aCorner;
in vec4 aSeg;
in vec4 aCol;
uniform vec2 uRes, uC0;
uniform float uScale, uHw;
out vec2 vP;
out vec4 vCol;
flat out vec4 vSeg;
void main() {
  vec2 a = aSeg.xy * uScale + uC0, b = aSeg.zw * uScale + uC0;
  vec2 d = b - a;
  float L = length(d);
  vec2 t = L > 1e-3 ? d / L : vec2(1.0, 0.0), n = vec2(-t.y, t.x);
  float r = uHw * 2.6;
  vec2 p = mix(a, b, aCorner.x * 0.5 + 0.5) + t * aCorner.x * r + n * aCorner.y * r;
  vP = p;
  vSeg = vec4(a, b);
  // Energy per pixel: the lamp's time on this stretch, spread over its length.
  vCol = vec4(aCol.rgb * aCol.a / ((L + uHw) * uHw), 0.0);
  gl_Position = vec4(p / uRes * 2.0 - 1.0, 0.0, 1.0);
}`;
const SEG_FS = `${HEAD}
in vec2 vP;
in vec4 vCol;
flat in vec4 vSeg;
uniform float uHw;
out vec4 o;
void main() {
  vec2 a = vSeg.xy, b = vSeg.zw, pa = vP - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  float d = length(pa - ba * h) / uHw;
  o = vec4(vCol.rgb * exp(-d * d * 1.6), 1.0);
}`;

// The fade: the plate keeps exp(-dt / tau) of what it held.
const FADE = `${HEAD}
out vec4 o;
uniform float uKeep;
void main() { o = vec4(0.0, 0.0, 0.0, uKeep); }`;

// The ground: the map, lit dim, then the plate on top.
const COMPOSE = `${HEAD}
in vec2 vUv;
out vec4 o;
uniform sampler2D uMap, uOld, uPlate;
uniform float uMix, uMapK, uPlateK;
void main() {
  vec3 m = mix(texture(uOld, vUv).rgb, texture(uMap, vUv).rgb, uMix);
  m = pow(m, vec3(2.2)) * uMapK;
  vec3 p = texture(uPlate, vUv).rgb * uPlateK;
  o = vec4(m + p, 1.0);
}`;

// One live car: a body seen from above, glass, roof and lamps.
const CAR_VS = `#version 300 es
in vec2 aCorner;
in vec4 aA;
in vec4 aB;
uniform vec2 uRes, uC0;
uniform float uScale;
out vec2 vQ;
flat out vec4 vB;
void main() {
  vec2 dir = aA.zw, nrm = vec2(-dir.y, dir.x);
  // Below about four pixels a car grows a little, so it still reads.
  float grow = max(1.0, 4.0 / max(aB.x * 2.0 * uScale, 0.001));
  vec2 q = aCorner * vec2(aB.x + 0.8, 1.6) * min(grow, 1.6);
  vec2 p = aA.xy + dir * q.x + nrm * q.y;
  vQ = q / min(grow, 1.6);
  vB = aB;
  gl_Position = vec4((p * uScale + uC0) / uRes * 2.0 - 1.0, 0.0, 1.0);
}`;
const CAR_FS = `${HEAD}
in vec2 vQ;
flat in vec4 vB;
out vec4 o;
uniform float uPxM, uLive;
float sdBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
const vec3 PAINT[9] = vec3[9](
  vec3(0.62, 0.62, 0.6), vec3(0.34, 0.35, 0.37), vec3(0.05, 0.05, 0.055),
  vec3(0.03, 0.06, 0.16), vec3(0.32, 0.03, 0.03), vec3(0.04, 0.10, 0.07),
  vec3(0.42, 0.36, 0.26), vec3(0.18, 0.30, 0.42), vec3(0.14, 0.14, 0.15));
void main() {
  float hl = vB.x, lamp = fract(vB.y), fade = vB.z, z = floor(vB.y) * 0.5;
  vec2 q = vQ;
  float aa = max(uPxM, 0.08);
  float dBody = sdBox(q, vec2(hl, 0.9), 0.4);
  float cov = 1.0 - smoothstep(-aa, aa, dBody);
  float pw = vB.w;
  vec3 paint = pw >= 9.0 ? vec3(0.55, 0.56, 0.58) : PAINT[int(pw)];
  // Moonlight and the lamp posts' amber; a high deck sees more sky.
  vec3 light = vec3(0.30, 0.36, 0.55) * (0.32 + 0.04 * z) + vec3(1.0, 0.62, 0.3) * 0.18;
  float bevel = smoothstep(0.0, -0.35, dBody);
  vec3 col = paint * light * (0.5 + 0.5 * bevel);
  float dCab = sdBox(q - vec2(-0.1 * hl, 0.0), vec2(0.5 * hl, 0.74), 0.38);
  float glass = (1.0 - smoothstep(-aa, aa, dCab)) * step(pw, 8.5);
  col = mix(col, vec3(0.008, 0.01, 0.018), glass * 0.85);
  // Lamps: two warm heads, two tails that flare when braking.
  vec2 hq = vec2(q.x - (hl - 0.18), abs(q.y) - 0.62);
  float head = exp(-dot(hq / vec2(0.16, 0.24), hq / vec2(0.16, 0.24)));
  vec2 tq = vec2(q.x + (hl - 0.12), abs(q.y) - 0.62);
  float tail = exp(-dot(tq / vec2(0.14, 0.28), tq / vec2(0.14, 0.28)));
  vec3 emit = vec3(1.0, 0.9, 0.75) * head * 7.0 + vec3(1.0, 0.05, 0.02) * tail * (1.0 + 12.0 * lamp);
  float a = cov * fade * uLive;
  o = vec4(col * a + emit * fade * uLive, a);
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
  // Bright trails keep their hue: part of the curve acts on the brightest channel.
  float m = max(c.r, max(c.g, c.b));
  c = mix(film(c), c * film(vec3(m)).r / max(m, 1e-4), 0.5);
  c *= 1.0 - 0.55 * dot(v, v);
  c = pow(c, vec3(1.0 / 2.2));
  c += (hash(gl_FragCoord.xy + uFrame * 17.3) - 0.5) * 0.012;
  o = vec4(c, 1.0);
}`;

// Floats per lamp stroke and per car.
export const SEG_F = 8, CAR_F = 8;

export async function makeRenderer(gl) {
  const P = await linked(gl, {
    seg: program(gl, SEG_VS, SEG_FS, ['aCorner', 'aSeg', 'aCol']),
    fade: program(gl, TRI_VS, FADE),
    compose: program(gl, TRI_VS, COMPOSE),
    car: program(gl, CAR_VS, CAR_FS, ['aCorner', 'aA', 'aB']),
    final: program(gl, TRI_VS, FINAL),
  });
  const empty = gl.createVertexArray();
  const bloom = bloomChain(gl, { max: 6 });

  const corners = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, corners);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  // An instanced quad with two vec4 attributes per instance.
  function quadVao(buf, a1, a2) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, corners);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(a1);
    gl.vertexAttribPointer(a1, 4, gl.FLOAT, false, 32, 0);
    gl.vertexAttribDivisor(a1, 1);
    gl.enableVertexAttribArray(a2);
    gl.vertexAttribPointer(a2, 4, gl.FLOAT, false, 32, 16);
    gl.vertexAttribDivisor(a2, 1);
    gl.bindVertexArray(null);
    return vao;
  }
  const segBuf = gl.createBuffer(), carBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, segBuf);
  gl.bufferData(gl.ARRAY_BUFFER, MAX_CARS * 4 * SEG_F * 4, gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, carBuf);
  gl.bufferData(gl.ARRAY_BUFFER, MAX_CARS * CAR_F * 4, gl.DYNAMIC_DRAW);
  const segVao = quadVao(segBuf, 1, 2), carVao = quadVao(carBuf, 1, 2);

  // The map: two textures, so a new design can fade in over the old.
  const mapTex = () => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([11, 13, 12, 255]));
    return { tex: t };
  };
  let map = mapTex(), old = mapTex();

  let hdr = null, plate = null, W = 0, H = 0;
  function resize(w, h) {
    W = Math.max(2, w); H = Math.max(2, h);
    gl.canvas.width = W; gl.canvas.height = H;
    free(gl, hdr); free(gl, plate);
    hdr = target(gl, W, H, { clear: true, check: true });
    plate = target(gl, W, H, { clear: true, check: true });
  }
  // Uploads a fresh map; keep moves the current one to the old slot first.
  function setMap(canvas, keep) {
    if (keep) [map, old] = [old, map];
    gl.bindTexture(gl.TEXTURE_2D, map.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    if (!keep) {
      gl.bindTexture(gl.TEXTURE_2D, old.tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    }
  }
  function clearPlate() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, plate.fb);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  /**
   * Exposes the plate: fades it by keep, then adds n lamp strokes.
   * @param {Float32Array} segs SEG_F floats per stroke: x0 y0 x1 y1 r g b energy, in metres.
   */
  function expose(segs, n, keep, view) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, plate.fb);
    gl.viewport(0, 0, W, H);
    gl.enable(gl.BLEND);
    if (keep < 1) {
      gl.blendFunc(gl.ZERO, gl.SRC_ALPHA);
      gl.useProgram(P.fade.p);
      gl.uniform1f(P.fade.u.uKeep, keep);
      gl.bindVertexArray(empty);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    if (n > 0) {
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindBuffer(gl.ARRAY_BUFFER, segBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, segs, 0, n * SEG_F);
      const s = P.seg;
      gl.useProgram(s.p);
      gl.uniform2f(s.u.uRes, W, H);
      gl.uniform2f(s.u.uC0, view.cx, view.cy);
      gl.uniform1f(s.u.uScale, view.scale);
      gl.uniform1f(s.u.uHw, view.hw);
      gl.bindVertexArray(segVao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
    }
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  }

  // o: view, cars, mix of the maps, gains, live alpha, bloom levels, frame.
  function draw(o) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, hdr.fb);
    gl.viewport(0, 0, W, H);
    gl.disable(gl.BLEND);
    const c0 = P.compose;
    gl.useProgram(c0.p);
    bind(gl, c0, 'uMap', 0, map.tex);
    bind(gl, c0, 'uOld', 1, old.tex);
    bind(gl, c0, 'uPlate', 2, plate);
    gl.uniform1f(c0.u.uMix, o.mix);
    gl.uniform1f(c0.u.uMapK, o.mapK);
    gl.uniform1f(c0.u.uPlateK, o.plateK);
    gl.bindVertexArray(empty);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (o.n > 0 && o.live > 0) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindBuffer(gl.ARRAY_BUFFER, carBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, o.cars, 0, o.n * CAR_F);
      const c = P.car;
      gl.useProgram(c.p);
      gl.uniform2f(c.u.uRes, W, H);
      gl.uniform2f(c.u.uC0, o.view.cx, o.view.cy);
      gl.uniform1f(c.u.uScale, o.view.scale);
      gl.uniform1f(c.u.uPxM, 1 / o.view.scale);
      gl.uniform1f(c.u.uLive, o.live);
      gl.bindVertexArray(carVao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, o.n);
      gl.disable(gl.BLEND);
    }
    gl.bindVertexArray(null);
    const bt = bloom.render(hdr.tex, W, H, { threshold: 0.9, cap: 8, levels: o.bloomLevels });
    const f = P.final;
    gl.useProgram(f.p);
    bind(gl, f, 'uHdr', 0, hdr);
    bind(gl, f, 'uBloom', 1, bt);
    gl.uniform1f(f.u.uBloomK, 0.6);
    gl.uniform1f(f.u.uExp, o.exposure);
    gl.uniform1f(f.u.uFrame, o.frameNo % 64);
    tri(gl, null, empty);
  }

  return { resize, setMap, clearPlate, expose, draw };
}
