// The tube: the toy in hand, as a picture in the middle of the Clock.
// It looks like a 1950s picture tube, seen from inside: a concave warp, scan lines and grain.
// It has no hard edge: the picture fades out toward the toys.
// The toy's name and motto are part of the picture: the shader draws them, so they shade and change with it.
// A change of toy is quick: the new picture fades in from a little close up and settles, after a short flicker.
// A toy with a loop plays it in place of the still while the toy is in hand.
import { TRI_VS, program, linked, tri, onContextLoss } from '../gl.js';

// How bright the picture is at its middle, 0 to 1.
const LEVEL = 0.46;
// A change of toy takes this long, in seconds.
const CHANGE = 0.42;
// The cadence: the wordmark's own way with letters, each a little askew in its own weight.
// Tom keeps it off for the toy's name; it may return, so it stays behind this switch.
const CADENCE = false;
// The caption is a square texture; it covers this share of the tube's width.
const CAP = 0.5, CAP_PX = 1024;

const FS = `#version 300 es
precision mediump float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uA, uB, uTA, uTB;
uniform float uPx, uMix, uKick, uTime, uHasA, uHasB, uLevel;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
// A still. Its colours part a little, as on a worn tube; f is how far.
vec3 pic(sampler2D t, vec2 w, float f) {
  // The first texture row is the top of the still.
  vec2 s = vec2(w.x, -w.y) * 0.5 + 0.5;
  return vec3(texture(t, s + vec2(f, 0.0)).r, texture(t, s).g, texture(t, s - vec2(f, 0.0)).b);
}
// A caption: white words with a dark shade round them, alpha premultiplied.
vec4 words(sampler2D t, vec2 q) {
  vec2 s = vec2(q.x, -q.y) * 0.5 + 0.5;
  return texture(t, s) * step(abs(q.x), 1.0) * step(abs(q.y), 1.0);
}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  // The warp is concave: the middle sinks back and the rim pulls outward.
  // Past r = 0.84 the picture folds; the fade hides that part.
  vec2 w = p * (1.7 - 0.8 * r * r);
  // The caption has a milder warp, so the words stay easy to read.
  float cr = min(r / ${CAP.toFixed(2)}, 1.0);
  vec2 q = (p / ${CAP.toFixed(2)}) * (1.08 - 0.2 * cr * cr);
  // The change: at 0 picture A stands; at 1 picture B stands.
  float g = uMix, k = uKick;
  // The warble: the lines sway sideways in two slow waves, as on a tube with a weak hold.
  // It runs only while a toy is in hand, and swells in a change.
  float sway = (0.007 * sin(w.y * 9.0 + uTime * 2.6) + 0.004 * sin(w.y * 31.0 - uTime * 6.1)) * (1.0 + 3.0 * k);
  w.x += sway;
  q.x += sway * 1.4;
  // A hum bar: a faint band of light climbs the picture.
  float hum = 0.05 * smoothstep(0.3, 0.0, abs(fract(vUv.y * 0.9 - uTime * 0.11) - 0.5));
  // The flicker at the start of a change: a few lines slip sideways and the colours part.
  float slip = k * 0.03 * (hash(vec2(floor(vUv.y * 46.0), floor(uTime * 30.0) + 5.0)) - 0.5);
  w.x += slip;
  q.x += slip;
  float f = 0.003 + 0.012 * k;
  // The new picture comes from a little close up and settles back.
  float zoom = 1.0 - 0.06 * (1.0 - g);
  vec3 c = mix(pic(uA, w, f) * uHasA, pic(uB, w * zoom, f) * uHasB, g);
  // The shade: a dim picture that goes darker toward the rim.
  c *= uLevel * (1.0 - 0.78 * smoothstep(0.12, 0.86, r));
  // The words lie on the picture and change with it.
  vec4 t = mix(words(uTA, q) * uHasA, words(uTB, q * zoom) * uHasB, g);
  c = c * (1.0 - t.a) + t.rgb * 0.94;
  float n = hash(gl_FragCoord.xy + floor(uTime * 20.0) * 17.0);
  // The flicker is a touch bright, with a burst of grain.
  c = c * (1.0 + 0.3 * k + hum) + (n - 0.5) * 0.16 * k;
  // Scan lines: one line each three CSS pixels.
  float line = 0.5 + 0.5 * sin(gl_FragCoord.y / uPx * 2.0944);
  c *= 0.7 + 0.3 * line;
  // Grain lies on the whole face, also where the picture is dark.
  c += n * 0.035;
  // No hard edge: the face fades out at the ring of toys.
  float a = pow(1.0 - smoothstep(0.38, 1.0, r), 1.2);
  // The dark lines and the grain reach wider than the picture.
  o = vec4(max(c, 0.0) * a, a * (0.26 + 0.3 * (1.0 - line)));
}`;

/**
 * @typedef {{ name: string, tag: string }} Words  The toy's name and its motto.
 */

/**
 * Builds the tube inside a host element; the canvas fills it.
 * @param {HTMLElement} host
 * @param {() => number} span  The width of the clock face, in CSS pixels.
 * @returns {Promise<{ show: (url: string, loop: string | null, words: Words) => void, caption: (words: Words) => void, live: (on: boolean) => void, clear: () => void } | null>}  Null without WebGL2.
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
  let P, vao, pics, caps, has = [0, 0];
  async function build() {
    P = (await linked(gl, { tube: program(gl, TRI_VS, FS) }, { limit: 500, wait: tick })).tube;
    vao = gl.createVertexArray();
    const blank = () => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
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
      const tall = names.length * nameStep + gap + tags.length * tagStep;
      // Two passes: a dark shade keeps the words clear, then a soft white glow.
      /** @type {[string, number][]} */
      const passes = [['rgb(8 9 14 / 0.95)', 16 * k], ['rgb(255 255 255 / 0.3)', 5 * k]];
      for (const [shade, blur] of passes) {
        let y = mid - tall / 2;
        pen.shadowColor = shade;
        pen.shadowBlur = blur;
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
          pen.fillStyle = 'rgb(255 255 255 / 0.45)';
          pen.fillRect(mid - 11 * k, y + gap * 0.42, 22 * k, Math.max(1, k));
          y += gap;
          pen.fillStyle = 'rgb(255 255 255 / 0.82)';
          pen.font = `500 ${tagSize}px "Iosevka Term Slab", ui-monospace, monospace`;
          if ('letterSpacing' in pen) pen.letterSpacing = `${0.02 * tagSize}px`;
          for (const row of tags) { y += tagStep; pen.fillText(row, mid, y - tagSize * 0.45); }
        }
      }
      pen.shadowBlur = 0;
    }
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, caps[slot]);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pen.canvas);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  }

  let mix = 0, time = 0, hot = false, raf = 0, last = 0, drawn = 0, src = '', gone = false;
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
    gl.useProgram(P.p);
    [[pics[0], P.u.uA], [pics[1], P.u.uB], [caps[0], P.u.uTA], [caps[1], P.u.uTB]].forEach(([t, u], i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.uniform1i(u, i);
    });
    gl.uniform1f(P.u.uPx, k);
    gl.uniform1f(P.u.uMix, ease(mix));
    // The flicker is over in the first third of the change.
    gl.uniform1f(P.u.uKick, has[1] ? Math.pow(Math.max(0, 1 - mix / 0.36), 2) : 0);
    gl.uniform1f(P.u.uTime, time);
    gl.uniform1f(P.u.uHasA, has[0]);
    gl.uniform1f(P.u.uHasB, has[1]);
    gl.uniform1f(P.u.uLevel, LEVEL);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    tri(gl, null, vao);
    drawn = performance.now();
  }
  // The new picture is B; when its change ends it becomes A.
  const settle = () => { pics.reverse(); caps.reverse(); has = [1, 0]; mix = 0; };
  const wake = () => { if (!raf && !gone) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  function frame(now) {
    raf = 0;
    const dt = Math.min((now - last) / 1000, 0.1), rolling = has[1] === 1;
    last = now;
    if (rolling) mix = Math.min(1, mix + dt / CHANGE);
    if (hot && !still.matches) time += dt;
    // A loop in play puts its present frame in the newest picture.
    const playing = vid !== null && hot && vid.readyState >= 2;
    if (playing) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, pics[has[1] ? 1 : 0]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vid);
    }
    // The grain alone needs twenty pictures a second, not sixty.
    if (rolling || playing || now - drawn > 48) draw();
    if (rolling && mix >= 1) settle();
    if (has[1] || (hot && !still.matches)) raf = requestAnimationFrame(frame);
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
    if (on) wake();
  }
  // With no toy in hand the face is empty; the next toy fades in over dark.
  function clear() {
    src = '';
    said = null;
    drop();
    has = [0, 0];
    mix = 0;
    draw();
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
  return { show, caption, live, clear };
}
