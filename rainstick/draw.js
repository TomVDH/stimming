// Rain stick renderer: raw WebGL2 in five passes.
// 1. Stage and backlight. 2. Tube back glass. 3. Pins. 4. Beads. 5. Tube front and caps.
// Then a bloom chain and a grade with grain and a vignette.
import { TRI_VS, program, linked, target, free, bind, tri } from '../shared/gl.js';
import { TUBE, PIN_R, MAX_BEADS } from './sim.js';

/** The wall thickness and the cap length, in bead units. */
export const WALL = 0.9, CAP_LEN = 9;

// Shared GLSL: the tube frame, the backlight and the glass tints.
const COMMON = /* glsl */`
uniform vec2 uRes, uC, uAx, uLight;
uniform float uS, uLightR, uLightK;
// Tube frame to canvas pixels, y down.
vec2 toPx(vec2 p) { return uC + uS * vec2(p.x * uAx.x - p.y * uAx.y, p.x * uAx.y + p.y * uAx.x); }
vec4 toClip(vec2 px) { return vec4(px.x / uRes.x * 2.0 - 1.0, 1.0 - px.y / uRes.y * 2.0, 0.0, 1.0); }
// The warm backlight behind the tube, as seen at a pixel.
float backlight(vec2 px) {
  vec2 d = (px - uLight) / uLightR;
  float r2 = dot(d, d);
  return uLightK * (exp(-r2 * 2.2) * 0.9 + exp(-sqrt(r2) * 1.6) * 0.22);
}
const vec3 WARM = vec3(1.0, 0.56, 0.24);
`;

const BG_FS = /* glsl */`#version 300 es
precision highp float;
out vec4 o;
${COMMON}
void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float y = px.y / uRes.y;
  vec3 c = mix(vec3(0.004, 0.006, 0.014), vec3(0.008, 0.011, 0.024), y);
  c += WARM * backlight(px) * 0.07;
  o = vec4(c, 1.0);
}`;

// The tube quad: one strip over the tube and its caps, in the tube frame.
const TUBE_VS = /* glsl */`#version 300 es
${COMMON}
uniform vec2 uHalf;
out vec2 vL;
void main() {
  vec2 q = vec2(gl_VertexID & 1, gl_VertexID >> 1) * 2.0 - 1.0;
  vL = q * uHalf;
  gl_Position = toClip(toPx(vL));
}`;

const TUBE_FS = /* glsl */`#version 300 es
precision highp float;
in vec2 vL;
out vec4 o;
${COMMON}
uniform float uR, uWall, uLen, uCap, uFront;
float hash(vec2 p) { vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
void main() {
  float aa = fwidth(vL.y) * 1.2;
  float R2 = uR + uWall;
  float ax = abs(vL.x), ay = abs(vL.y);
  vec2 px = toPx(vL);
  float bl = backlight(px);
  // Screen normal of the near tube side, and where the light lies.
  vec2 side = sign(vL.y) * vec2(-uAx.y, uAx.x);
  vec2 toL = normalize(uLight - px);
  float facing = clamp(dot(side, toL) * 0.5 + 0.5, 0.0, 1.0);
  // Up on screen, for the sky reflection stripe.
  float up = clamp(-side.y, 0.0, 1.0);
  vec4 col = vec4(0.0);
  if (ax < uLen) {
    float inGlass = 1.0 - smoothstep(R2 - aa, R2 + aa, ay);
    float yn = vL.y / R2;
    float th = 1.0 / sqrt(max(0.06, 1.0 - yn * yn));
    if (uFront < 0.5) {
      // Back pass: the far wall dims the stage and takes a little warm light.
      vec3 c = vec3(0.004, 0.007, 0.012) * th + WARM * bl * 0.08 * th;
      col = vec4(c, 0.28 + 0.1 * th) * inGlass;
    } else {
      float wall = smoothstep(uR - aa, uR + aa, ay) * inGlass;
      // Glass seen edge on is thick: it tints and catches the backlight.
      vec3 c = vec3(0.05, 0.08, 0.09) * wall;
      float rim = exp(-pow((ay - (uR + uWall * 0.4)) / (uWall * 0.32), 2.0));
      c += WARM * rim * bl * (0.25 + 1.5 * facing * facing) * inGlass;
      // The inner face of the far side glows faintly along its length.
      c += WARM * exp(-pow((ay - uR * 0.86) / 0.5, 2.0)) * bl * facing * 0.5 * inGlass;
      // A soft window reflection on the upper face.
      float stripe = exp(-pow((ay / R2 - 0.6) / 0.09, 2.0)) * up;
      c += vec3(0.75, 0.82, 0.9) * stripe * 0.07 * inGlass;
      float a = wall * 0.55 + stripe * 0.04 * inGlass;
      col = vec4(c, a);
    }
  }
  if (uFront > 0.5) {
    // Walnut caps: turned wood with rounded ends and a brass ring.
    float x = ax - uLen;
    float rc = R2 + 0.5, r0 = 2.6;
    vec2 q = vec2(x - (uCap - r0), ay - (rc - r0));
    float d = (x < uCap - r0 || ay < rc - r0) ? max(x - uCap, ay - rc) : length(q) - r0;
    d = max(d, -x);
    float inside = 1.0 - smoothstep(-aa, aa, d);
    if (inside > 0.0) {
      float yn = clamp(vL.y / rc, -1.0, 1.0);
      vec3 n = vec3(0.0, yn, sqrt(1.0 - yn * yn));
      // Light the cap from the backlight side and from a soft key above.
      vec2 ns = n.y * vec2(-uAx.y, uAx.x);
      float key = clamp(0.35 + 0.65 * dot(normalize(vec3(ns, n.z)), normalize(vec3(-0.35, -0.75, 0.55))), 0.0, 1.0);
      // Turned walnut: soft rings across the cap, a slow figure along it.
      float fig = sin(vL.y * 1.7 + sin(vL.x * 0.35 + vL.y * 0.4) * 1.6);
      float grain = 0.86 + 0.1 * fig + 0.04 * hash(floor(vec2(vL.x * 0.5, vL.y * 6.0)));
      vec3 wood = vec3(0.06, 0.026, 0.012) * grain * (0.3 + 0.95 * key);
      float edge = pow(1.0 - n.z, 2.0);
      wood += WARM * edge * bl * (0.3 + 2.2 * clamp(dot(ns, toL), 0.0, 1.0));
      // The brass ring where the cap meets the glass.
      float ring = 1.0 - smoothstep(0.5 - aa, 0.5 + aa, abs(x - 0.55));
      vec3 brass = vec3(0.2, 0.12, 0.035) * (0.35 + 1.2 * key * key) + WARM * edge * bl * 1.4;
      wood = mix(wood, brass, ring);
      col = vec4(wood * inside, inside) + col * (1.0 - inside);
    }
  }
  o = col;
}`;

// Pins and beads: a screen-aligned quad per instance.
const DOT_VS = /* glsl */`#version 300 es
${COMMON}
layout(location = 0) in vec4 aI;
uniform float uSize, uBead;
out vec2 vUv;
out vec4 vI;
out vec2 vPx;
void main() {
  vec2 q = vec2(gl_VertexID & 1, gl_VertexID >> 1) * 2.0 - 1.0;
  float r = uBead > 0.5 ? aI.z : uSize;
  vec2 c = toPx(aI.xy);
  vUv = q;
  vI = aI;
  vPx = c;
  gl_Position = toClip(c + q * r * uS);
}`;

const PIN_FS = /* glsl */`#version 300 es
precision highp float;
in vec2 vUv;
in vec4 vI;
in vec2 vPx;
out vec4 o;
${COMMON}
uniform float uSize, uPinR, uGlowK;
void main() {
  float r = length(vUv) * uSize;
  float aa = uSize / max(1.0, uSize * uS) * 1.5;
  float disc = 1.0 - smoothstep(uPinR - aa, uPinR + aa, r);
  vec2 toL = normalize(uLight - vPx);
  vec2 n2 = vUv * uSize / uPinR;
  float bl = backlight(vPx);
  float g = vI.z * uGlowK;
  // Brass head: dark, lit on its light side, glinting top left.
  vec3 brass = vec3(0.07, 0.045, 0.016);
  brass += WARM * bl * 0.9 * clamp(dot(n2, toL), 0.0, 1.0);
  brass += vec3(0.5, 0.42, 0.28) * pow(clamp(1.0 - length(n2 - vec2(-0.35, -0.4)) * 1.6, 0.0, 1.0), 3.0) * 0.5;
  // A struck pin glows hot white at its core.
  brass += vec3(1.0, 0.82, 0.52) * g * 5.0;
  float halo = exp(-r * r / (0.55 + 0.9 * min(g, 1.0))) * g * 0.9 + exp(-r / 1.4) * g * 0.12;
  vec3 hc = vec3(1.0, 0.7, 0.36) * halo;
  o = vec4(brass * disc + hc * (1.0 - disc), disc);
}`;

const BEAD_FS = /* glsl */`#version 300 es
precision highp float;
in vec2 vUv;
in vec4 vI;
in vec2 vPx;
out vec4 o;
${COMMON}
// Glass tints: clear, amber, teal, coral.
vec3 tint(float t) {
  if (t < 0.36) return vec3(0.62, 0.7, 0.72);
  if (t < 0.62) return vec3(0.95, 0.42, 0.06);
  if (t < 0.82) return vec3(0.06, 0.52, 0.5);
  return vec3(0.9, 0.16, 0.12);
}
void main() {
  float r2 = dot(vUv, vUv);
  float aa = 2.0 / max(2.0, vI.z * uS);
  float a = 1.0 - smoothstep(1.0 - aa * 2.0, 1.0, r2);
  if (a <= 0.0) discard;
  vec3 n = vec3(vUv, sqrt(max(0.0, 1.0 - r2)));
  vec2 toL = normalize(uLight - vPx);
  float bl = backlight(vPx);
  vec3 t = tint(vI.w);
  float clear = step(vI.w, 0.36);
  // Coloured glass absorbs more through its thick middle.
  vec3 body = t * mix(vec3(0.035), vec3(0.06), clear) * (0.5 + n.z);
  body += t * WARM * bl * 0.25 * exp(-2.0 * n.z);
  // The sphere is a lens: the backlight shows as a hot spot on the far side.
  vec2 spot = vUv + toL * 0.52;
  body += mix(t, vec3(1.0), 0.35) * bl * 2.6 * exp(-dot(spot, spot) / 0.07);
  // Fresnel rim, brighter where it faces the light.
  float F = pow(1.0 - n.z, 3.0);
  body += WARM * bl * F * (0.2 + 1.8 * clamp(dot(vUv, toL), 0.0, 1.0));
  body += vec3(0.04, 0.05, 0.07) * F;
  // A small hard glint from a key light, top left.
  float spec = pow(clamp(dot(n, normalize(vec3(-0.45, -0.55, 0.7))), 0.0, 1.0), 70.0);
  body += vec3(1.0, 0.96, 0.9) * spec * 0.9;
  o = vec4(body * a, a);
}`;

// Bloom: a bright pass, then down and up a chain of halves.
const BRIGHT_FS = /* glsl */`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uSrc;
uniform vec2 uTexel;
void main() {
  vec3 c = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    vec2 off = vec2(i & 1, i >> 1) - 0.5;
    c += texture(uSrc, vUv + off * uTexel).rgb;
  }
  c *= 0.25;
  float l = max(c.r, max(c.g, c.b));
  float k = clamp((l - 0.6) / 0.9, 0.0, 1.0);
  o = vec4(c * k * k, 1.0);
}`;

const DOWN_FS = /* glsl */`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uSrc;
uniform vec2 uTexel;
void main() {
  vec3 c = texture(uSrc, vUv).rgb * 4.0;
  c += texture(uSrc, vUv + vec2(-1, -1) * uTexel).rgb;
  c += texture(uSrc, vUv + vec2(1, -1) * uTexel).rgb;
  c += texture(uSrc, vUv + vec2(-1, 1) * uTexel).rgb;
  c += texture(uSrc, vUv + vec2(1, 1) * uTexel).rgb;
  o = vec4(c / 8.0, 1.0);
}`;

const UP_FS = /* glsl */`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uSrc;
uniform vec2 uTexel;
void main() {
  vec3 c = vec3(0.0);
  c += texture(uSrc, vUv + vec2(-1, 0) * uTexel).rgb * 2.0;
  c += texture(uSrc, vUv + vec2(1, 0) * uTexel).rgb * 2.0;
  c += texture(uSrc, vUv + vec2(0, -1) * uTexel).rgb * 2.0;
  c += texture(uSrc, vUv + vec2(0, 1) * uTexel).rgb * 2.0;
  c += texture(uSrc, vUv + vec2(-1, -1) * uTexel).rgb;
  c += texture(uSrc, vUv + vec2(1, -1) * uTexel).rgb;
  c += texture(uSrc, vUv + vec2(-1, 1) * uTexel).rgb;
  c += texture(uSrc, vUv + vec2(1, 1) * uTexel).rgb;
  o = vec4(c / 12.0, 1.0);
}`;

const FINAL_FS = /* glsl */`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uScene, uBloom;
uniform float uBloomK, uSeed;
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
float hash(vec2 p) { vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
void main() {
  vec3 c = texture(uScene, vUv).rgb + texture(uBloom, vUv).rgb * uBloomK;
  c = aces(c * 1.25);
  vec2 v = vUv - 0.5;
  c *= 1.0 - dot(v, v) * 0.7;
  c = pow(c, vec3(1.0 / 2.2));
  // Fine grain also dithers the dark gradient.
  c += (hash(gl_FragCoord.xy + uSeed) - 0.5) * (1.6 / 255.0);
  o = vec4(c, 1.0);
}`;

/**
 * Builds the renderer.
 * @param {WebGL2RenderingContext} gl
 * @param {{ n: number }} pins
 */
export async function makeView(gl, pins) {
  if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('no float targets');
  const P = await linked(gl, {
    bg: program(gl, TRI_VS, BG_FS),
    tube: program(gl, TUBE_VS, TUBE_FS),
    pin: program(gl, DOT_VS, PIN_FS),
    bead: program(gl, DOT_VS, BEAD_FS),
    bright: program(gl, TRI_VS, BRIGHT_FS),
    down: program(gl, TRI_VS, DOWN_FS),
    up: program(gl, TRI_VS, UP_FS),
    fin: program(gl, TRI_VS, FINAL_FS),
  });
  const triVao = gl.createVertexArray();
  // One instance buffer each for pins and beads: x, y, size or glow, tint.
  const inst = n => {
    const vao = gl.createVertexArray(), buf = gl.createBuffer(), data = new Float32Array(n * 4);
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);
    gl.vertexAttribDivisor(0, 1);
    gl.bindVertexArray(null);
    return { vao, buf, data };
  };
  const pinI = inst(pins.n), beadI = inst(MAX_BEADS);

  let W = 0, H = 0, scene = null, chain = [], levels = 4;
  function resize(w, h, lv = levels) {
    if (w === W && h === H && lv === levels && scene) return;
    W = w; H = h; levels = lv;
    if (scene) free(gl, scene);
    chain.forEach(t => free(gl, t));
    scene = target(gl, W, H);
    chain = [];
    let cw = W, ch = H;
    for (let i = 0; i <= levels; i++) {
      cw = Math.max(1, cw >> 1); ch = Math.max(1, ch >> 1);
      chain.push(target(gl, cw, ch));
    }
  }

  function common(p, v) {
    const u = p.u;
    gl.uniform2f(u.uRes, W, H);
    gl.uniform2f(u.uC, v.cx, v.cy);
    gl.uniform2f(u.uAx, Math.cos(v.angle), Math.sin(v.angle));
    gl.uniform1f(u.uS, v.s);
    gl.uniform2f(u.uLight, v.lx, v.ly);
    gl.uniform1f(u.uLightR, v.lr);
    gl.uniform1f(u.uLightK, 1);
  }

  function tube(v, front) {
    const p = P.tube;
    gl.useProgram(p.p);
    common(p, v);
    gl.uniform2f(p.u.uHalf, TUBE.half + CAP_LEN + 0.5, TUBE.R + WALL + 1.5);
    gl.uniform1f(p.u.uR, TUBE.R);
    gl.uniform1f(p.u.uWall, WALL);
    gl.uniform1f(p.u.uLen, TUBE.half);
    gl.uniform1f(p.u.uCap, CAP_LEN);
    gl.uniform1f(p.u.uFront, front ? 1 : 0);
    gl.bindVertexArray(triVao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Draws one frame.
   * @param {object} v View: centre, scale, angle, light, glow, beads, pins.
   */
  function render(v) {
    const { sim, glow } = v;
    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.fb);
    gl.viewport(0, 0, W, H);
    gl.disable(gl.BLEND);
    gl.useProgram(P.bg.p);
    common(P.bg, v);
    gl.bindVertexArray(triVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    tube(v, false);

    // Pins: x, y, glow.
    const pd = pinI.data, pins = sim.pins;
    for (let i = 0; i < pins.n; i++) { pd[i * 4] = pins.x[i]; pd[i * 4 + 1] = pins.y[i]; pd[i * 4 + 2] = glow[i]; pd[i * 4 + 3] = 0; }
    gl.bindBuffer(gl.ARRAY_BUFFER, pinI.buf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, pd, 0, pins.n * 4);
    gl.useProgram(P.pin.p);
    common(P.pin, v);
    gl.uniform1f(P.pin.u.uSize, PIN_R * 6);
    gl.uniform1f(P.pin.u.uBead, 0);
    gl.uniform1f(P.pin.u.uPinR, PIN_R * 1.2);
    gl.uniform1f(P.pin.u.uGlowK, v.glowK);
    gl.bindVertexArray(pinI.vao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, pins.n);

    // Beads: x, y, radius, tint.
    const b = sim.beads, bd = beadI.data;
    for (let i = 0; i < b.n; i++) { bd[i * 4] = b.x[i] + v.jolt; bd[i * 4 + 1] = b.y[i]; bd[i * 4 + 2] = b.r[i]; bd[i * 4 + 3] = b.tint[i]; }
    gl.bindBuffer(gl.ARRAY_BUFFER, beadI.buf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, bd, 0, b.n * 4);
    gl.useProgram(P.bead.p);
    common(P.bead, v);
    gl.uniform1f(P.bead.u.uBead, 1);
    gl.uniform1f(P.bead.u.uSize, 1);
    gl.bindVertexArray(beadI.vao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, b.n);

    tube(v, true);
    gl.disable(gl.BLEND);

    // Bloom chain.
    gl.bindVertexArray(triVao);
    gl.useProgram(P.bright.p);
    gl.uniform2f(P.bright.u.uTexel, 1 / W, 1 / H);
    bind(gl, P.bright, 'uSrc', 0, scene);
    tri(gl, chain[0], triVao);
    gl.useProgram(P.down.p);
    for (let i = 1; i < chain.length; i++) {
      gl.uniform2f(P.down.u.uTexel, 1 / chain[i - 1].w, 1 / chain[i - 1].h);
      bind(gl, P.down, 'uSrc', 0, chain[i - 1]);
      tri(gl, chain[i], triVao);
    }
    gl.useProgram(P.up.p);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = chain.length - 1; i > 0; i--) {
      gl.uniform2f(P.up.u.uTexel, 1 / chain[i].w, 1 / chain[i].h);
      bind(gl, P.up, 'uSrc', 0, chain[i]);
      tri(gl, chain[i - 1], triVao);
    }
    gl.disable(gl.BLEND);

    gl.useProgram(P.fin.p);
    bind(gl, P.fin, 'uScene', 0, scene);
    bind(gl, P.fin, 'uBloom', 1, chain[0]);
    gl.uniform1f(P.fin.u.uBloomK, v.bloomK);
    gl.uniform1f(P.fin.u.uSeed, (v.seed * 97.13) % 1000);
    tri(gl, null, triVao);
  }

  return { resize, render };
}
