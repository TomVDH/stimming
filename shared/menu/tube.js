// The tube: the toy in hand, as a picture in the middle of the Clock.
// It is a colour CRT: a slight bulge, an aperture grille, scan lines that burn wider where they are bright,
// halation, a weak hold that warbles, and the fine grain of an image tube.
// The oscilloscope's screen (scope/index.html) and the railgun sight's tube (nvg/tube.js) are its models.
// It has no hard edge: the picture fades out toward the toys.
// The toy's name and motto are part of the picture: the shader draws them, so they shade and change with it.
// A change of toy is quick: the new picture fades in from a little close up and settles, after a short flicker.
// A toy with a loop plays it in place of the still while the toy is in hand.
// The phosphor glows on for a moment: a moving part leaves a short trail.
import { TRI_VS, program, linked, tri, target, free, bind, onContextLoss } from '../gl.js';

// How bright the picture is at its middle, 0 to 1, in linear light.
const LEVEL = 0.19;
// The tube takes this long to open from a dot when the first toy comes, in seconds.
const POWER = 0.5;
// The tube switches off this fast: the raster shrinks to a line, then to a dot.
const OFF = 0.38;
// A change of toy takes this long, in seconds.
const CHANGE = 0.42;
// The cadence: the wordmark's own way with letters, each a little askew in its own weight.
// Tom keeps it off for the toy's name; it may return, so it stays behind this switch.
const CADENCE = false;
// The phosphor's afterglow: the time each colour takes to fade to a third, in seconds.
// Red fades last, so a dying trail warms a little.
const GLOW = [0.09, 0.07, 0.055];
// The caption is a square texture; it covers this share of the tube's width.
const CAP = 0.5, CAP_PX = 1024;

const FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uA, uB, uTA, uTB;
uniform vec2 uRes;
uniform float uPx, uMix, uKick, uPower, uTime, uHasA, uHasB, uLevel, uAim, uCut, uSnow;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
// An integer hash: it shows no pattern, so the grain has no grid in it.
uint pcg(uint v) { uint t = v * 747796405u + 2891336453u; uint w = ((t >> ((t >> 28u) + 4u)) ^ t) * 277803737u; return (w >> 22u) ^ w; }
float rnd(vec2 p, float f) { uvec2 u = uvec2(ivec2(p)); return float(pcg(u.x + pcg(u.y + pcg(uint(f))))) / 4294967295.0; }
// Smooth noise: soft blobs, not square cells.
float vn(vec2 x, float f) {
  vec2 i = floor(x), u = fract(x);
  u = u * u * (3.0 - 2.0 * u);
  return mix(mix(rnd(i, f), rnd(i + vec2(1.0, 0.0), f), u.x), mix(rnd(i + vec2(0.0, 1.0), f), rnd(i + vec2(1.0, 1.0), f), u.x), u.y);
}
// A still in linear light. Its three colours land a little apart; soft is the blur, in mip levels.
vec3 pic(sampler2D t, vec2 w, vec2 ca, float soft) {
  // The first texture row is the top of the still.
  vec2 s = vec2(w.x, -w.y) * 0.5 + 0.5;
  vec3 c = vec3(textureLod(t, s + ca, soft).r, textureLod(t, s, soft).g, textureLod(t, s - ca, soft).b);
  // Deep colour: a steeper curve, then more of each hue.
  c = pow(c, vec3(2.6));
  return max(mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, 1.85), 0.0);
}
// The wide glow round the bright parts of a still: two low mip levels.
vec3 halo(sampler2D t, vec2 w) {
  vec2 s = vec2(w.x, -w.y) * 0.5 + 0.5;
  vec3 c = pow(textureLod(t, s, 4.5).rgb, vec3(2.2)) * 0.6 + pow(textureLod(t, s, 6.5).rgb, vec3(2.2)) * 0.4;
  // The glow keeps the picture's hue, so it does not grey the colours.
  return max(mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, 1.6), 0.0);
}
// A caption: how much of a letter lies here, 0 to 1. lod blurs it into a soft band.
float words(sampler2D t, vec2 q, float lod) {
  vec2 s = vec2(q.x, -q.y) * 0.5 + 0.5;
  return textureLod(t, s, lod).a * step(abs(q.x), 1.0) * step(abs(q.y), 1.0);
}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  // The face bulges a little, as a tube's glass does; the raster follows the bulge.
  vec2 pc = p * (1.0 + 0.09 * r * r);
  float g = uMix, k = uKick;
  // The raster: one scan line each three CSS pixels, snapped to whole device pixels.
  // A line of a fraction of a pixel blurs and beats against the screen.
  vec2 pw = (pc * 0.5 + 0.5) * uRes;
  float rowPx = max(3.0, floor(3.0 * uPx + 0.5));
  float row = floor(pw.y / rowPx);
  // The warble of a weak hold. Each line sits a hair off, anew each field.
  float slip = (hash(vec2(row, floor(uTime * 24.0))) - 0.5) * 0.0011;
  // A tracking band climbs the face about every twelve seconds; its lines lean and shiver.
  float away = (pc.y * 0.5 + 0.5) - fract(uTime * 0.085) * 1.3 + 0.15;
  float band = exp(-away * away / 0.0016);
  slip += band * (0.0045 + 0.002 * sin(uTime * 37.0 + row * 1.9));
  // A change of toy shakes a few lines hard, for a moment.
  slip += k * 0.022 * (hash(vec2(floor(row / 3.0), floor(uTime * 30.0) + 5.0)) - 0.5);
  pc.x += slip;
  // Power on: a dot opens to a line, then the raster opens to its full height.
  vec2 open = vec2(max(0.004, smoothstep(0.0, 0.35, uPower)), max(0.004, smoothstep(0.25, 0.85, uPower)));
  vec2 pr = pc / open;
  // The opening raster has a soft edge: no square shape shows, ever.
  float lit = 1.0 - smoothstep(1.15, 1.7, length(pr));
  // The picture and the caption each have their own scale on the face.
  vec2 w = pr * 1.12, q = pr / ${CAP.toFixed(2)};
  // Each colour lands a little apart, more so away from the middle; a change parts them further.
  vec2 ca = pr * (0.0016 + 0.006 * k);
  // The picture goes soft toward the rim, as through an eyepiece.
  float soft = 2.4 * r * r * r + 1.5 * k;
  // The new picture comes from a little close up and settles back.
  float zoom = 1.0 - 0.06 * (1.0 - g);
  vec3 light = mix(pic(uA, w, ca, soft) * uHasA, pic(uB, w * zoom, ca, soft) * uHasB, g);
  vec3 glow = mix(halo(uA, w) * uHasA, halo(uB, w * zoom) * uHasB, g);
  light *= uLevel;
  glow *= uLevel;
  // The words burn in, after the railgun sight: a soft band round each letter works against the picture.
  // On a dark picture the band is the picture's negative, a faint glow; on a bright one it is a deep shade.
  // The core is always white, so the words never vanish and never change colour mid-line.
  float core = mix(words(uTA, q, 0.0) * uHasA, words(uTB, q * zoom, 0.0) * uHasB, g);
  float bandw = clamp(mix(words(uTA, q, 3.6) * uHasA, words(uTB, q * zoom, 3.6) * uHasB, g) * 2.1, 0.0, 1.0);
  float bright = smoothstep(0.12, 0.5, dot(glow, vec3(0.3, 0.6, 0.1)) / uLevel);
  vec3 neg = max(vec3(uLevel) - light, 0.0) * 0.55;
  light = mix(light, mix(neg, light * 0.08, bright), bandw * 0.9);
  light = mix(light, vec3(0.95), core);
  glow += core * 0.2;
  // Aperture grille: a red, a green and a blue stripe side by side.
  // Each stripe passes a little of the other colours, so white stays white.
  // The division keeps the mean light at 1.
  float m = floor(mod(pw.x / max(1.0, floor(uPx + 0.5)), 3.0));
  vec3 stripe = vec3(m == 0.0, m == 1.0, m == 2.0) * 0.8 + 0.3;
  vec3 grille = mix(vec3(1.0), stripe / 0.567, 0.38);
  // Scan lines with dark gaps; a bright line burns wider and fills its gap.
  float lum = clamp(dot(light, vec3(0.3, 0.6, 0.1)), 0.0, 1.0);
  float sy = fract(pw.y / rowPx) - 0.5, sw = mix(0.26, 0.55, sqrt(lum));
  light *= grille * mix(1.0, exp(-sy * sy / (sw * sw)) * 1.5, 0.7);
  // Blemishes: a few dead spots, fixed in the screen.
  for (int i = 0; i < 6; i++) {
    vec2 at = vec2(hash(vec2(float(i), 3.0)), hash(vec2(float(i), 7.0))) * 1.3 - 0.65;
    float rad = 0.006 + 0.012 * hash(vec2(float(i), 9.0));
    light *= 1.0 - (0.5 + 0.4 * hash(vec2(float(i), 1.0))) * smoothstep(rad, rad * 0.35, length(p - at));
  }
  // Unlit phosphor is a dim grey with the grille just visible.
  vec3 c = vec3(0.007, 0.008, 0.009) * grille;
  // A faint band of light rolls down the raster.
  float roll = exp(-pow((fract(vUv.y + uTime * 0.07) - 0.5) * 9.0, 2.0)) * 0.05;
  // Halation: the glass spreads the light of the bright parts.
  c += (light + glow * 0.45) * (1.0 + roll + band * 0.25) * lit;
  // Grain as in an image tube: fine, with no grid in it, and new each field.
  // It is not even: its strength drifts across the face in slow patches, and it is a little heavier at the rim.
  float field = floor(uTime * 24.0);
  // Single pixels, softened a little by a grain that lies askew to the raster.
  vec2 gp = mat2(0.89, 0.45, -0.45, 0.89) * gl_FragCoord.xy / uPx;
  float n = mix(rnd(gl_FragCoord.xy, field), vn(gp / 1.6, field + 7.0), 0.4) - 0.5;
  float lump = vn(p * 2.4 + vec2(uTime * 0.05, -uTime * 0.03), 3.0);
  float heavy = (0.65 + 0.7 * lump) * (1.0 + 0.5 * r * r);
  // The grain stays under the raster, so the scan lines read.
  c *= 1.0 + n * 0.55 * heavy * lit;
  c += n * (0.012 * heavy + 0.2 * k) * lit;
  // A rare spark flies.
  c += step(0.99993, rnd(floor(gl_FragCoord.xy / (2.0 * uPx)), field + 3.0)) * 0.5 * lit;
  // Snow: the set has no picture yet, as it warms up or switches off.
  c += uSnow * (0.03 + 0.2 * rnd(floor(gl_FragCoord.xy / (1.4 * uPx)), field + 11.0)) * lit;
  // Switching off, the raster ends as a bright dot that fades.
  c += uSnow * exp(-dot(p, p) * 900.0) * smoothstep(0.0, 0.04, uPower) * (1.0 - smoothstep(0.04, 0.3, uPower)) * 1.4;
  // The corners fall off; the whole face flickers a hair; a change is a touch bright.
  // The picture lies behind the clock: it is at its full strength in the middle only.
  c *= (1.0 - 0.52 * smoothstep(0.06, 0.62, r * r)) * (1.0 + 0.012 * sin(uTime * 113.0)) * (1.0 + 0.3 * k);
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  // No hard edge: the face fades out past the ring of toys.
  float a = pow(1.0 - smoothstep(0.38, 1.0, r), 1.2);
  // The selection: the picture is masked away in a soft wedge, from the middle out to the toy in hand.
  float off = atan(p.x, p.y) - uAim;
  off = abs(atan(sin(off), cos(off)));
  a *= 1.0 - uCut * 0.96 * (1.0 - smoothstep(0.08, 0.56, off)) * smoothstep(0.2, 0.58, r);
  o = vec4(c * a, a * 0.45);
}`;

// The afterglow pass: each pixel keeps the brighter of this frame and the last, faded.
// The tube's frame is premultiplied, so its alpha fades with its light.
const AFTER = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uNow, uWas;
uniform vec3 uKeep;
void main() {
  vec4 now = texture(uNow, vUv), was = texture(uWas, vUv);
  vec3 c = max(now.rgb, was.rgb * uKeep);
  o = vec4(c, max(now.a, was.a * uKeep.g));
}`;

/**
 * @typedef {{ name: string, tag: string }} Words  The toy's name and its motto.
 */

/**
 * Builds the tube inside a host element; the canvas fills it.
 * @param {HTMLElement} host
 * @param {() => number} span  The width of the clock face, in CSS pixels.
 * @returns {Promise<{ show: (url: string, loop: string | null, words: Words) => void, caption: (words: Words) => void, live: (on: boolean) => void, aim: (deg: number, snap?: boolean) => void, blink: (hold?: number) => Promise<void>, clear: () => void } | null>}  Null without WebGL2.
 */
export async function tube(host, span) {
  const canvas = Object.assign(document.createElement('canvas'), { className: 'clock-tube' });
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) return null;
  host.append(canvas);

  const still = matchMedia('(prefers-reduced-motion: reduce)');
  // A timer, not a frame: a hidden tab gets no frames.
  const tick = () => new Promise(r => setTimeout(r, 16));
  // The words are drawn on a 2D canvas, then given to the shader as a texture.
  const pen = Object.assign(document.createElement('canvas'), { width: CAP_PX, height: CAP_PX }).getContext('2d');
  let P, A, vao, pics, caps, has = [0, 0];
  // The afterglow's targets: this frame, and the last result and the next.
  /** @type {any[]} */
  let glow = [];
  async function build() {
    const progs = await linked(gl, { tube: program(gl, TRI_VS, FS), after: program(gl, TRI_VS, AFTER) }, { limit: 500, wait: tick });
    P = progs.tube;
    A = progs.after;
    glow = [];
    vao = gl.createVertexArray();
    const blank = () => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      // The low mip levels give the halo and the soft rim.
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      // One clear pixel, so an empty texture is still complete.
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
      return t;
    };
    pics = [blank(), blank()];
    caps = [blank(), blank()];
    has = [0, 0];
  }
  await build();
  // The words need their fonts; the menu loads both.
  const fonts = Promise.all([document.fonts.load('700 32px B612'), document.fonts.load('400 32px B612'), document.fonts.load('500 12px "Iosevka Term Slab"')]).catch(() => {});

  // Breaks a line of words to fit a width; the rows come out near one length.
  function wrap(text, width) {
    const fit = max => {
      const rows = [];
      let row = '';
      for (const word of text.split(/\s+/)) {
        const next = row ? row + ' ' + word : word;
        if (row && pen.measureText(next).width > max) { rows.push(row); row = word; } else row = next;
      }
      if (row) rows.push(row);
      return rows;
    };
    let rows = fit(width);
    // A narrower fit with the same row count is better balanced.
    for (let cut = 0.94; rows.length > 1 && cut > 0.5; cut -= 0.06) {
      const tight = fit(width * cut);
      if (tight.length !== rows.length) break;
      rows = tight;
    }
    return rows;
  }
  // With the cadence on, the name's letters stand askew in mixed weights. The same name always falls the same way.
  // A trial (Tom, 2026-11-16): the name is in B612, the wordmark's face. B612 has two weights.
  const WEIGHTS = [700, 700, 400, 700];
  const font = (weight, size) => `${weight} ${size}px B612, Gabarito, system-ui, sans-serif`;
  /** @param {string} row @param {number} size @param {number} seed */
  function letters(row, size, seed) {
    let h = seed >>> 0;
    // A small fixed shuffle: no Math.random, so a redraw gives the same letters.
    const rand = () => { h = Math.imul(h ^ (h >>> 15), 2246822507) + 0x9e3779b9 >>> 0; return (h >>> 8) / 16777216; };
    const out = [];
    let width = 0;
    for (const ch of row) {
      const weight = CADENCE ? WEIGHTS[Math.floor(rand() * WEIGHTS.length)] : 700, turn = CADENCE ? (rand() - 0.5) * 0.2 : 0, lift = CADENCE ? (rand() - 0.5) * 0.1 * size : 0;
      pen.font = font(weight, size);
      const w = pen.measureText(ch).width - 0.03 * size;
      out.push({ ch, weight, turn: ch === ' ' ? 0 : turn, lift, w, x: width });
      width += w;
    }
    return { out, width };
  }
  // Draws the name, a hairline and the motto, then puts them in a caption texture.
  /** @param {Words | null} words @param {number} slot */
  function write(words, slot) {
    const face = span() || 660, k = CAP_PX / (CAP * host.clientWidth || 400) * 1.08, mid = CAP_PX / 2;
    const nameSize = Math.min(32, Math.max(17, face * 0.05)) * k, tagSize = Math.min(12.5, Math.max(10.5, face * 0.019)) * k;
    pen.clearRect(0, 0, CAP_PX, CAP_PX);
    if (words && words.name) {
      pen.textAlign = 'center';
      pen.textBaseline = 'alphabetic';
      pen.font = font(700, nameSize);
      if ('letterSpacing' in pen) pen.letterSpacing = '0px';
      const names = wrap(words.name, face * 0.44 * k);
      let seed = 7;
      for (const ch of words.name) seed = Math.imul(seed, 31) + ch.codePointAt(0) | 0;
      const rows = names.map((row, i) => letters(row, nameSize, seed + i * 101));
      pen.font = `500 ${tagSize}px "Iosevka Term Slab", ui-monospace, monospace`;
      if ('letterSpacing' in pen) pen.letterSpacing = `${0.02 * tagSize}px`;
      const tags = words.tag ? wrap(words.tag, face * 0.38 * k) : [];
      const nameStep = nameSize * 1.1, tagStep = tagSize * 1.45, gap = tags.length ? tagSize * 2.1 : 0;
      // Plain white letters: the shader makes their band and their core.
      {
        // The name's last line sits on a fixed line above the middle (Tom).
        // A longer name grows up; the motto hangs below.
        let y = mid - nameSize * 0.3 - names.length * nameStep;
        pen.fillStyle = '#fff';
        if ('letterSpacing' in pen) pen.letterSpacing = '0px';
        for (const row of rows) {
          y += nameStep;
          for (const l of row.out) {
            pen.save();
            pen.translate(mid - row.width / 2 + l.x + l.w / 2, y - nameSize * 0.2 + l.lift);
            pen.rotate(l.turn);
            pen.font = font(l.weight, nameSize);
            pen.fillText(l.ch, 0, 0);
            pen.restore();
          }
        }
        if (tags.length) {
          // A short hairline parts the name from the motto.
          pen.fillRect(mid - 11 * k, y + gap * 0.42, 22 * k, Math.max(1.5, 1.5 * k));
          y += gap;
          pen.font = `500 ${tagSize}px "Iosevka Term Slab", ui-monospace, monospace`;
          if ('letterSpacing' in pen) pen.letterSpacing = `${0.02 * tagSize}px`;
          for (const row of tags) { y += tagStep; pen.fillText(row, mid, y - tagSize * 0.45); }
        }
      }
    }
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, caps[slot]);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pen.canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  }

  // The wedge: where it points now and where it must point, in radians; and how open it is.
  let aimNow = 0, aimTo = 0, cut = 0;
  // The power: where it is and where it goes, 0 off to 1 on. Snow is a set with no picture.
  let powerTo = 0, snow = 0, /** @type {(() => void) | null} */ done = null;
  let mix = 0, power = 0, time = 0, hot = false, raf = 0, last = 0, drawn = 0, src = '', gone = false;
  // moved: when the picture last moved. fresh: the next frame drops the trail.
  let moved = 0, fresh = true;
  /** @type {Words | null} */
  let said = null;
  /** @type {HTMLVideoElement | null} */
  let vid = null;
  // A dropped loop frees its decoder.
  const drop = () => { if (!vid) return; vid.pause(); vid.removeAttribute('src'); vid.load(); vid = null; };
  // The change starts at once and lands softly: that gives it its weight.
  const ease = t => 1 - Math.pow(1 - t, 4);
  function draw() {
    if (gone) return;
    // The picture is soft and the face is wide, so the canvas stays at 1.5x at most.
    const k = Math.min(devicePixelRatio || 1, 1.5), w = Math.max(1, Math.round(host.clientWidth * k)), h = w;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    // The afterglow's targets match the canvas; a new size drops the trail.
    if (!glow.length || glow[0].w !== w || glow[0].h !== h) {
      glow.forEach(t => free(gl, t));
      glow = [0, 1, 2].map(() => target(gl, w, h, { format: gl.RGBA8 }));
      fresh = true;
    }
    gl.useProgram(P.p);
    [[pics[0], P.u.uA], [pics[1], P.u.uB], [caps[0], P.u.uTA], [caps[1], P.u.uTB]].forEach(([t, u], i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.uniform1i(u, i);
    });
    gl.uniform1f(P.u.uPx, k);
    gl.uniform2f(P.u.uRes, w, h);
    // The tube opens fast, then eases to its full size.
    gl.uniform1f(P.u.uPower, 1 - Math.pow(1 - power, 3));
    gl.uniform1f(P.u.uMix, ease(mix));
    // The flicker is over in the first third of the change.
    gl.uniform1f(P.u.uKick, has[1] ? Math.pow(Math.max(0, 1 - mix / 0.36), 2) : 0);
    gl.uniform1f(P.u.uTime, time);
    gl.uniform1f(P.u.uHasA, has[0]);
    gl.uniform1f(P.u.uHasB, has[1]);
    gl.uniform1f(P.u.uLevel, LEVEL);
    gl.uniform1f(P.u.uAim, aimNow);
    gl.uniform1f(P.u.uCut, cut);
    gl.uniform1f(P.u.uSnow, snow);
    const now = performance.now(), gap = Math.min((now - drawn) / 1000, 0.1);
    gl.bindFramebuffer(gl.FRAMEBUFFER, glow[0].fb);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    tri(gl, glow[0], vao);
    // The afterglow: the last result fades by the time since it was drawn.
    // Reduced motion and a fresh start keep no trail.
    const off = fresh || still.matches;
    gl.useProgram(A.p);
    bind(gl, A, 'uNow', 0, glow[0]);
    bind(gl, A, 'uWas', 1, glow[1]);
    gl.uniform3f(A.u.uKeep, .../** @type {[number, number, number]} */ (GLOW.map(t => off ? 0 : Math.exp(-gap / t))));
    tri(gl, glow[2], vao);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, glow[2].fb);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // The new result is the last one for the next frame.
    [glow[1], glow[2]] = [glow[2], glow[1]];
    fresh = false;
    drawn = now;
  }
  // The new picture is B; when its change ends it becomes A.
  const settle = () => { pics.reverse(); caps.reverse(); has = [1, 0]; mix = 0; };
  const wake = () => { if (!raf && !gone) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  function frame(now) {
    raf = 0;
    const dt = Math.min((now - last) / 1000, 0.1), rolling = has[1] === 1;
    last = now;
    if (rolling) mix = Math.min(1, mix + dt / CHANGE);
    const opening = power !== powerTo;
    if (opening) power = powerTo > power ? Math.min(powerTo, power + dt / POWER) : Math.max(powerTo, power - dt / OFF);
    // A blink ends when the set is fully off.
    if (snow && powerTo === 0 && power === 0) { snow = 0; done?.(); done = null; }
    // The wedge turns the short way and opens with a soft start and a soft stop.
    const gap = Math.atan2(Math.sin(aimTo - aimNow), Math.cos(aimTo - aimNow)), want = hot ? 1 : 0;
    const turning = Math.abs(gap) > 0.002 || Math.abs(want - cut) > 0.004;
    aimNow += gap * (1 - Math.exp(-dt * 9));
    cut += (want - cut) * (1 - Math.exp(-dt * 7));
    if ((hot || snow) && !still.matches) time += dt;
    // A loop in play puts its present frame in the newest picture.
    const playing = vid !== null && hot && vid.readyState >= 2;
    if (playing) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, pics[has[1] ? 1 : 0]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vid);
      gl.generateMipmap(gl.TEXTURE_2D);
    }
    if (rolling || opening || turning || playing) moved = now;
    // A trail fades for a third of a second after the picture stops.
    const fading = !still.matches && now - moved < 350;
    // The grain alone needs twenty pictures a second, not sixty.
    if (rolling || opening || turning || playing || fading || now - drawn > 48) draw();
    if (rolling && mix >= 1) settle();
    if (has[1] || power !== powerTo || snow || turning || fading || (hot && !still.matches)) raf = requestAnimationFrame(frame);
  }

  // Loads a still, then fades it in with its words.
  function show(url, loop, words) {
    if (url === src) return;
    src = url;
    said = words;
    drop();
    const im = new Image();
    im.onload = async () => {
      await fonts;
      // A newer toy or a lost context makes this still stale.
      if (url !== src || gone) return;
      // A change past its middle ends at once, so the next one starts clean.
      if (has[1] && ease(mix) > 0.5) settle();
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, pics[1]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
      gl.generateMipmap(gl.TEXTURE_2D);
      // The first toy on an empty face powers the tube on.
      if (!has[0] && !has[1]) { power = still.matches || snow ? Math.max(power, still.matches ? 1 : 0) : 0; powerTo = 1; }
      // A picture ends a blink: the snow gives way to it.
      if (snow) { snow = 0; done?.(); done = null; }
      write(words, 1);
      has[1] = 1;
      mix = 0;
      if (still.matches) { mix = 1; draw(); settle(); return; }
      wake();
      if (loop) film(url, loop);
    };
    im.src = url;
  }
  // New words for the toy on show, for example when its motto arrives.
  function caption(words) {
    said = words;
    if (!has[0] && !has[1]) return;
    write(words, has[1] ? 1 : 0);
    draw();
  }
  // The loop loads after the still, so the picture never waits for it.
  function film(url, loop) {
    const v = document.createElement('video');
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.addEventListener('loadeddata', () => {
      if (url !== src || gone) return;
      vid = v;
      if (hot) { v.play().catch(() => {}); wake(); }
    }, { once: true });
    v.src = loop;
  }
  // A loop plays only while its toy is in hand; else it rests on one frame.
  function live(on) {
    hot = on;
    if (vid) { if (on) vid.play().catch(() => {}); else vid.pause(); }
    // The wedge closes too, so the loop runs on until it is shut.
    wake();
  }
  // Points the wedge at a bearing: degrees clockwise from the top. snap puts it there at once.
  function aim(deg, snap = false) {
    aimTo = deg * Math.PI / 180;
    if (snap || still.matches) aimNow = aimTo;
    wake();
  }
  // With no toy in hand the face is empty; the next toy fades in over dark.
  function clear() {
    src = '';
    said = null;
    drop();
    has = [0, 0];
    mix = 0;
    power = 0;
    powerTo = 0;
    fresh = true;
    draw();
  }
  // The set warms up to snow, holds a moment, then switches off to a dot.
  /** @returns {Promise<void>} */
  function blink(hold = 600) {
    if (still.matches || gone || has[0] || has[1]) return Promise.resolve();
    snow = 1;
    power = 0;
    powerTo = 1;
    wake();
    setTimeout(() => { if (snow) { powerTo = 0; wake(); } }, POWER * 1000 + hold);
    return new Promise(res => { done = () => res(); });
  }

  // A new size needs the words drawn again at that size.
  new ResizeObserver(() => { if (said && (has[0] || has[1])) write(said, has[1] ? 1 : 0); draw(); }).observe(host);
  onContextLoss(canvas, {
    lost() { gone = true; cancelAnimationFrame(raf); raf = 0; drop(); },
    async restored() {
      await build();
      gone = false;
      const again = src, words = said;
      src = '';
      if (again) show(again, null, words);
    },
  });
  return { show, caption, live, aim, blink, clear };
}
