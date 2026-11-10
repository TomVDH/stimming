// Shared: the environment runner. Every bundle, wired into one frame.
// A toy gives one GLSL function for its scene and gets the rest:
// sky, water helpers, rain in the air, the wet pane, flare, bloom, grade, output,
// one weather value, the hour of the day, and the site quality with a slow-frame watch.
// Raw WebGL2 only. fxlab/ runs on it.
//
// Use:
//   const env = environment(canvas, { scene: `vec3 envScene(vec2 uv) { ... }` });
//   env.state.hour = 19.5;            // any value in ENV_DEFAULTS
//   env.state.on.glass = false;       // switch a bundle off
//   env.weather(0.7);                 // dry (0) to storm (1)
//   env.touch();                      // after a change
// The scene returns linear light for a frame point; uv is 0 to 1.
// It can call every bundle (sk*, wt*, pp*, gw*, gr*) and read ENV_UNIFORMS.
// Its own uniforms go in the scene text and in `uniforms`: { uName: () => value }.
// state.light is the key light's place on the frame: it flares and lights rain and drops.

import { GLASS_RAIN } from './glassrain.js';
import { BOKEH } from './bokeh.js';
import { WET_GLASS, wetGlassMotion, wetGlassDetail } from './wetglass.js';
import { WATER, waterDetail } from './water.js';
import { SKY, skyAt, skyDetail } from './sky.js';
import { PRECIP, precipDir, precipDetail } from './precip.js';
import { FLARE } from './flare.js';
import { GLOW, bloomChain, glowDetail } from './glow.js';
import { GRADE } from './grade.js';
import { OUTPUT } from './output.js';
import { weather } from './weather.js';
import { detail } from './detail.js';

// What a scene can read. The runner sets each one every frame.
export const ENV_UNIFORMS = /* glsl */`
uniform vec2 uRes, uLamp;
uniform float uTime, uWaterOn, uSwell, uChop, uSets, uRings, uSkyOn, uStars, uHazeD, uDay;
uniform int uOct, uRingN, uTapN, uAirN;
uniform float uAir, uSnow, uOrbs;
uniform vec2 uFall;
uniform vec3 uLampCol, uZen, uMid, uBand, uAnti, uSunD, uCloudLit, uCloudShade;
uniform float uCloud;
uniform int uCloudOct;`;

// Every value a toy or a control can set, with its start value.
export const ENV_DEFAULTS = { wet: 1, wind: 3, zoom: 1, fog: 0.4, patch: 0.4, defocus: 0, rad: 1, swell: 0.012, chop: 0.16, sets: 0.5, rings: 0.6, hour: 21.5, stars: 1, haze: 0.4, expo: 1, air: 0.6, snow: 0, clouds: 0.4, bloom: 0.5, thr: 0.9, orbs: 1, flGain: 0.6, flSize: 0.7, vig: 0.5, grain: 0.04, tintK: 1 };

// The bundles a runner can switch.
export const ENV_PARTS = ['glass', 'water', 'air', 'sky', 'flare', 'glow', 'grade', 'out'];
// The grade's tint at tintK 1: the night-scene toys' haze lift.
const TINT = [0.0008, 0.0009, 0.0014];

const VS = `#version 300 es
out vec2 vUv;
void main() { vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); vUv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
const HEAD = '#version 300 es\nprecision highp float;\nout vec4 outC;\n';
// The scene pass: the toy's scene, then rain or snow in the air.
const sceneFS = scene => HEAD + ENV_UNIFORMS + `
${GLASS_RAIN}
${WATER}
${SKY}
${PRECIP}
${GLOW}
${scene}
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec3 c = envScene(uv);
  // precip.js: rain or snow in the air, lit by the sky and by the lamp.
  if (uAir > 0.0) {
    float w = uSnow > 0.5 ? ppSnow(uv, asp, uTime, uAir, uFall, uAirN) : ppRain(uv, asp, uTime, uAir, uFall, uAirN);
    float nearL = length(vec2((uv.x - uLamp.x) * asp, uv.y - uLamp.y));
    vec3 lit = mix(vec3(0.02, 0.022, 0.03), vec3(0.3, 0.32, 0.36), uDay) + uLampCol * 0.5 * exp(-nearL * 5.0);
    c += lit * w * (uSnow > 0.5 ? 1.8 : 0.7);
  }
  outC = vec4(c, 1.0);
}`;
const DOWN_FS = HEAD + `
uniform sampler2D tSrc;
uniform vec2 uTx, uDst;
void main() {
  vec2 uv = gl_FragCoord.xy / uDst;
  outC = vec4(0.25 * (texture(tSrc, uv + uTx * vec2(-1.0, -1.0)).rgb + texture(tSrc, uv + uTx * vec2(1.0, -1.0)).rgb
    + texture(tSrc, uv + uTx * vec2(-1.0, 1.0)).rgb + texture(tSrc, uv + uTx * vec2(1.0, 1.0)).rgb), 1.0);
}`;
const BOK_FS = HEAD + `
uniform sampler2D tSrc;
uniform vec2 uRad, uDst;
uniform float uBlades, uRimB;
${BOKEH}
void main() { outC = vec4(bokeh(tSrc, gl_FragCoord.xy / uDst, uRad, uBlades, 0.015, 500.0, uRimB), 1.0); }`;
// The pane's glass step. A test can pass other lines in its place.
const GLASS_MOD = `
    WgPane g = wgPane(pane, uZoom, uM, uFlow, uWet, uWind, 0.4, uFog, uPatch, edge);
    vec2 su = uv + g.off / vec2(asp, 1.0);
    col = wgView(g, texture(tScene, su).rgb, texture(tBok, su).rgb, uScatter, vec3(0.8, 0.84, 0.81), veil, glint);
    rim = g.rim; cover = g.cover; fog = g.fog;`;
// The pane pass: wet glass, then flare.
const paneFS = glass => HEAD + `
uniform sampler2D tScene, tBok;
uniform vec2 uRes, uM, uLamp;
uniform vec3 uLampCol, uTint;
uniform float uDay, uFlow, uWet, uWind, uZoom, uFog, uPatch, uScatter, uFlGain, uFlSize, uVig, uGrain, uSeed;
uniform float uGlassOn, uFlareOn, uGradeOn, uOutOn, uExpo;
${GLASS_RAIN}
${WET_GLASS}
${FLARE}
${GRADE}
${OUTPUT}
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y, day = uDay;
  // The pane is one unit tall; its frame is the edge of the view.
  vec2 pane = (uv - 0.5) * vec2(asp, 1.0);
  float edge = max(abs(pane.x) - 0.5 * asp, abs(pane.y) - 0.5);
  vec3 warm = vec3(1.0, 0.85, 0.7);
  vec3 veil = warm * 0.02 * (1.0 - day) + vec3(0.03) * day;
  vec3 glint = mix(warm * 0.3, vec3(0.6, 0.63, 0.66), day);
  vec3 col = texture(tScene, uv).rgb;
  float rim = 0.0, cover = 0.0, fog = 0.0;
  // wetglass.js: beads, runs, fog and the scattered view, together.
  if (uGlassOn > 0.5) {${glass}
  }
  // The near lamp lights the drops and the fog it passes.
  float near = length(vec2((uv.x - uLamp.x) * asp, uv.y - uLamp.y));
  col += uLampCol * ((cover * 0.5 + rim * 0.9) * exp(-near * 7.0) + fog * 0.6 * exp(-near * 5.0));
  // flare.js: the lamp flares the lens.
  if (uFlareOn > 0.5) col = flScreen(col, flFlare(uv, uLamp, asp, uLampCol, uFlSize, vec3(1.0)) * uFlGain);
  // The pane keeps linear light; the last pass finishes the frame.
  outC = vec4(col, 1.0);
}`;
// The last pass: bloom, then grade, then output.
const FINAL_FS = HEAD + `
uniform sampler2D tPane, tBloom;
uniform vec2 uRes;
uniform vec3 uTint;
uniform float uBloomK, uVig, uGrain, uSeed, uGradeOn, uOutOn, uExpo;
${GRADE}
${OUTPUT}
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 col = texture(tPane, uv).rgb;
  // glow.js: the bloom chain's light goes back onto the frame.
  if (uBloomK > 0.0) col += texture(tBloom, uv).rgb * uBloomK;
  // grade.js: tint, vignette and grain.
  if (uGradeOn > 0.5) col = gdGrade(col, uv, uRes.x / uRes.y, gl_FragCoord.xy + vec2(uSeed * 37.0, uSeed * 91.0), uTint, uVig, 0.4, uGrain);
  // output.js: exposure, the film curve, sRGB and dither. Off, bright light clips.
  outC = vec4(uOutOn > 0.5 ? ouFilm(col, uExpo, gl_FragCoord.xy) : ouSrgb(clamp(col, 0.0, 1.0)), 1.0);
}`;

// Options:
//   scene     GLSL with vec3 envScene(vec2 uv). Required.
//   uniforms  the scene's own uniforms: { uName: () => number or array }.
//   animated  true when the scene moves with no bundle on. Default false.
//   active    () => false stops the loop, for a page with other modes.
//   onFrame   called with the frame time in seconds, each loop frame.
//   onLevel   called when the detail level changes.
//   glass     other GLSL for the pane's glass step: for tests.
//   share     another runner: this one uses its state, clock, motion and detail.
export function environment(canvas, { scene, uniforms = {}, animated = false, active = () => true, onFrame = null, onLevel = null, glass = GLASS_MOD, share = null, maxDpr = 2, budget = 2.6e6 } = {}) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
  const hdr = !!gl.getExtension('EXT_color_buffer_float');
  function compile(fs) {
    const p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const locs = new Map();
    return { p, loc: n => (locs.has(n) ? locs.get(n) : (locs.set(n, gl.getUniformLocation(p, n)), locs.get(n))) };
  }
  // Half-float targets keep bright lights; without them the frame clips early.
  function target() {
    const tex = gl.createTexture(), fbo = gl.createFramebuffer();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const t = { tex, fbo, w: 0, h: 0, size(w, h) {
      if (t.w === w && t.h === h) return;
      t.w = w; t.h = h;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      if (hdr) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    } };
    return t;
  }
  const rtScene = target(), rt4 = target(), rt8 = target(), rtBok = target(), rtPane = target();
  const progScene = compile(sceneFS(scene)), progDown = compile(DOWN_FS), progBok = compile(BOK_FS), progPane = compile(paneFS(glass)), progFinal = compile(FINAL_FS);
  const bloom = bloomChain(gl);

  const S = share ? share.state : { on: Object.fromEntries(ENV_PARTS.map(k => [k, true])), ...ENV_DEFAULTS, light: [0.32, 0.52], lightColor: null };
  // The clock: time in seconds, and the grain's seed.
  const clock = share ? share.clock : { time: 0, seed: 0, frame: 0 };
  const motion = share ? share.motion : wetGlassMotion();
  const size = { w: 1, h: 1 };
  let looping = false, paused = false, dirty = false, lastT = 0;
  const D = share ? share.detail : detail({ maxDpr, budget, onChange: () => { onLevel?.(); touch(); } });
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  // The loop runs only while something moves and someone can see it.
  const moving = () => active() && !paused && !document.hidden && !still.matches && (animated || (S.on.glass && S.wet > 0.001) || S.on.water || S.on.sky || S.on.air);
  function kick() {
    if (looping || !moving()) return;
    looping = true;
    lastT = 0;
    requestAnimationFrame(loop);
  }
  function loop(t) {
    if (!moving()) { looping = false; touch(); return; }
    const raw = lastT ? (t - lastT) / 1000 : 0.016, dt = Math.min(0.05, raw);
    lastT = t;
    // The watch steps the level down after two slow seconds.
    D.frame(raw);
    onFrame?.(raw);
    motion.step(dt, S.wind);
    clock.time += dt;
    if (++clock.frame & 1) clock.seed = clock.seed % 997 + 1;
    draw();
    requestAnimationFrame(loop);
  }
  // Asks for a frame: the loop if something moves, one still frame if not.
  function touch() {
    if (!active()) return;
    kick();
    if (looping || dirty) return;
    dirty = true;
    requestAnimationFrame(() => draw());
  }
  document.addEventListener('visibilitychange', touch);
  new ResizeObserver(touch).observe(canvas);

  // Draws one frame. fw and fh force a frame size, for a check or a still.
  function draw(fw, fh) {
    dirty = false;
    if (!looping) motion.step(0, S.wind, true);
    // detail.js sets the pixel ratio; each bundle maps the level to its budget.
    const cw = Math.max(1, canvas.clientWidth), ch = Math.max(1, canvas.clientHeight), dpr = D.dpr(cw, ch);
    const wq = waterDetail(D.level), gq = wetGlassDetail(D.level);
    const w = fw || Math.max(1, Math.round(cw * dpr)), h = fh || Math.max(1, Math.round(ch * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    if (!fw) { size.w = w; size.h = h; }
    // Size every target here: a resize binds its texture, which must not happen between passes.
    rtScene.size(w, h); rt4.size(Math.ceil(w / 4), Math.ceil(h / 4)); rt8.size(Math.ceil(w / 8), Math.ceil(h / 8)); rtBok.size(Math.ceil(w * gq.bokehScale), Math.ceil(h * gq.bokehScale));
    rtPane.size(w, h);
    // sky.js: the hour sets the palette, the sun and the daylight.
    const sk = skyAt(S.hour), day = S.on.sky ? sk.day : 0;
    // By day the key light is a pale sun, unless the toy sets its colour.
    const lamp = S.lightColor || (day > 0.5 ? [1.0, 0.93, 0.8] : [1.0, 0.8, 0.55]);
    const run = (pr, rt) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, rt ? rt.fbo : null);
      gl.viewport(0, 0, rt ? rt.w : w, rt ? rt.h : h);
      gl.useProgram(pr.p);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
    gl.activeTexture(gl.TEXTURE0);
    let u = progScene.loc;
    gl.useProgram(progScene.p);
    gl.uniform2f(u('uRes'), w, h); gl.uniform2f(u('uLamp'), S.light[0], S.light[1]); gl.uniform3fv(u('uLampCol'), lamp);
    gl.uniform1f(u('uSkyOn'), S.on.sky ? 1 : 0); gl.uniform1f(u('uStars'), sk.stars * S.stars); gl.uniform1f(u('uHazeD'), S.haze * 0.0008); gl.uniform1f(u('uDay'), day);
    gl.uniform1f(u('uCloud'), S.clouds); gl.uniform3fv(u('uCloudLit'), sk.cloudLit); gl.uniform3fv(u('uCloudShade'), sk.cloudShade); gl.uniform1i(u('uCloudOct'), skyDetail(D.level).cloudOctaves);
    gl.uniform3fv(u('uZen'), sk.zen); gl.uniform3fv(u('uMid'), sk.mid); gl.uniform3fv(u('uBand'), sk.band); gl.uniform3fv(u('uAnti'), sk.anti); gl.uniform3fv(u('uSunD'), sk.sun);
    const fall = precipDir(motion.speed, S.snow > 0.5), aq = precipDetail(D.level);
    gl.uniform1f(u('uAir'), S.on.air ? S.air : 0); gl.uniform1f(u('uSnow'), S.snow); gl.uniform2f(u('uFall'), fall[0], fall[1]); gl.uniform1i(u('uAirN'), S.snow > 0.5 ? aq.snow : aq.rain);
    gl.uniform1f(u('uOrbs'), S.on.glow ? S.orbs : 0);
    gl.uniform1i(u('uOct'), wq.octaves); gl.uniform1i(u('uRingN'), wq.ringLayers); gl.uniform1i(u('uTapN'), D.level > 0 ? 3 : 2);
    gl.uniform1f(u('uTime'), clock.time); gl.uniform1f(u('uWaterOn'), S.on.water ? 1 : 0);
    gl.uniform1f(u('uSwell'), S.swell); gl.uniform1f(u('uChop'), S.chop); gl.uniform1f(u('uSets'), S.sets); gl.uniform1f(u('uRings'), S.rings);
    // The scene's own uniforms: a number, or an array of two to four.
    for (const [name, get] of Object.entries(uniforms)) {
      const v = typeof get === 'function' ? get() : get, at = u(name);
      if (typeof v === 'number') gl.uniform1f(at, v);
      else if (v.length === 2) gl.uniform2fv(at, v);
      else if (v.length === 3) gl.uniform3fv(at, v);
      else gl.uniform4fv(at, v);
    }
    run(progScene, rtScene);
    if (S.on.glass) {
      // bokeh.js: two 4x4 box steps to an eighth, then the disc gather at half size.
      u = progDown.loc;
      gl.useProgram(progDown.p);
      gl.uniform1i(u('tSrc'), 0);
      gl.bindTexture(gl.TEXTURE_2D, rtScene.tex); gl.uniform2f(u('uTx'), 1 / w, 1 / h); gl.uniform2f(u('uDst'), rt4.w, rt4.h);
      run(progDown, rt4);
      gl.bindTexture(gl.TEXTURE_2D, rt4.tex); gl.uniform2f(u('uTx'), 1 / rt4.w, 1 / rt4.h); gl.uniform2f(u('uDst'), rt8.w, rt8.h);
      run(progDown, rt8);
      u = progBok.loc;
      gl.useProgram(progBok.p);
      gl.bindTexture(gl.TEXTURE_2D, rt8.tex);
      gl.uniform1i(u('tSrc'), 0);
      // Scatter sets the disc size; fog alone keeps a fair disc.
      const rad = 0.024 * S.rad * Math.max(S.defocus, S.fog > 0 || S.patch > 0 ? 0.6 : 0);
      gl.uniform2f(u('uRad'), rad * h / w, rad); gl.uniform2f(u('uDst'), rtBok.w, rtBok.h);
      gl.uniform1f(u('uBlades'), 0); gl.uniform1f(u('uRimB'), 0.3);
      run(progBok, rtBok);
    }
    u = progPane.loc;
    gl.useProgram(progPane.p);
    gl.bindTexture(gl.TEXTURE_2D, rtScene.tex);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, rtBok.tex);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(u('tScene'), 0); gl.uniform1i(u('tBok'), 1);
    gl.uniform2f(u('uRes'), w, h); gl.uniform2f(u('uM'), motion.m[0], motion.m[1]); gl.uniform2f(u('uLamp'), S.light[0], S.light[1]);
    gl.uniform3fv(u('uLampCol'), lamp); gl.uniform3fv(u('uTint'), TINT.map(x => x * S.tintK));
    gl.uniform1f(u('uDay'), day); gl.uniform1f(u('uFlow'), motion.flow); gl.uniform1f(u('uWind'), motion.speed); gl.uniform1f(u('uSeed'), clock.seed);
    gl.uniform1f(u('uScatter'), Math.min(1, S.defocus / 0.15));
    for (const [name, k] of [['uWet', 'wet'], ['uZoom', 'zoom'], ['uFog', 'fog'], ['uPatch', 'patch'], ['uFlGain', 'flGain'], ['uFlSize', 'flSize'], ['uVig', 'vig'], ['uGrain', 'grain'], ['uExpo', 'expo']]) gl.uniform1f(u(name), S[k]);
    for (const [name, k] of [['uGlassOn', 'glass'], ['uFlareOn', 'flare']]) gl.uniform1f(u(name), S.on[k] ? 1 : 0);
    run(progPane, rtPane);
    // glow.js: the chain halves the frame down, then tents it back up.
    const glowTex = S.on.glow && S.bloom > 0 ? bloom.render(rtPane.tex, w, h, { threshold: S.thr, levels: glowDetail(D.level).levels }) : null;
    u = progFinal.loc;
    gl.useProgram(progFinal.p);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, glowTex || rtPane.tex);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, rtPane.tex);
    gl.uniform1i(u('tPane'), 0); gl.uniform1i(u('tBloom'), 1);
    gl.uniform2f(u('uRes'), w, h); gl.uniform3fv(u('uTint'), TINT.map(x => x * S.tintK));
    gl.uniform1f(u('uBloomK'), glowTex ? S.bloom : 0); gl.uniform1f(u('uSeed'), clock.seed);
    for (const [name, k] of [['uVig', 'vig'], ['uGrain', 'grain'], ['uExpo', 'expo']]) gl.uniform1f(u(name), S[k]);
    for (const [name, k] of [['uGradeOn', 'grade'], ['uOutOn', 'out']]) gl.uniform1f(u(name), S.on[k] ? 1 : 0);
    run(progFinal, null);
  }

  return {
    gl, state: S, clock, motion, detail: D, size, draw, touch,
    get paused() { return paused; },
    set paused(v) { paused = !!v; touch(); },
    // weather.js: one value, dry (0) to storm (1), sets every weather value in the state.
    weather(k) {
      const w = weather(k);
      Object.assign(S, { wet: w.rain, wind: w.wind, fog: w.fog, patch: w.patches, rings: w.rings, chop: w.chop, swell: w.swell, sets: w.sets, haze: w.haze, air: w.air, clouds: w.clouds });
      touch();
      return w;
    },
  };
}
