// The depth icon: one picture and one depth map, drawn by a small shader.
// Each pixel shifts by its depth as the icon tilts, so the scene has real relief.
// The tilt rides a spring: it overshoots and wobbles back. A press gives it a kick.
// Raw WebGL2. It draws only while the spring moves; at rest it does no work.

const HEX = [[50, 2], [91.57, 26], [91.57, 74], [50, 98], [8.43, 74], [8.43, 26]];
const grow = (pts, k) => pts.map(([x, y]) => [50 + (x - 50) * k, 50 + (y - 50) * k]);
// A polygon path with every corner rounded by r.
const soft = (pts, r) => pts.map((q, i) => {
  const a = pts[(i + pts.length - 1) % pts.length], b = pts[(i + 1) % pts.length];
  const la = Math.hypot(a[0] - q[0], a[1] - q[1]), lb = Math.hypot(b[0] - q[0], b[1] - q[1]);
  const A = [q[0] + (a[0] - q[0]) / la * r, q[1] + (a[1] - q[1]) / la * r], B = [q[0] + (b[0] - q[0]) / lb * r, q[1] + (b[1] - q[1]) / lb * r];
  return `${i ? 'L' : 'M'}${A[0].toFixed(2)} ${A[1].toFixed(2)}Q${q[0].toFixed(2)} ${q[1].toFixed(2)} ${B[0].toFixed(2)} ${B[1].toFixed(2)}`;
}).join('') + 'Z';

// --- The Vista scene ----------------------------------------------------------
// Each layer has a depth: 0 is the sky, 1 is the lens. A pair [top, foot] makes
// the layer lean toward the viewer. `f(colour)` paints in colour, or in the
// layer's grey when the scene draws as a depth map.
const INK = 'oklch(0.2 0.045 282)';
const LAYERS = [
  [[0, 0.1], f => `<rect x="-10" y="-10" width="120" height="120" fill="${f('url(#sky)')}"/>`],
  [0.04, f => `<circle cx="58" cy="57" r="8.5" fill="${f('#fff6d8')}"/>`],
  [[0.2, 0.34], f => `<path d="M-10 64L10 50L24 58L40 42L56 56L70 46L86 60L110 46V110H-10Z" fill="${f('oklch(0.56 0.11 322)')}"/>
    <path d="M40 42L45 48L41 47.4L38 50.6L35.6 47Z" fill="${f('oklch(0.9 0.06 60)')}"/>`],
  [0.4, f => `<path d="M70 30q2.4 -2.8 4.8 0q2.4 -2.8 4.8 0M82 38q2 -2.4 4 0q2 -2.4 4 0" stroke="${f(INK)}" stroke-width="0.9" fill="none" stroke-linecap="round"/>`],
  [[0.46, 0.62], f => `<path d="M-10 82L10 68L30 78L50 66L70 80L90 68L110 80V110H-10Z" fill="${f('oklch(0.36 0.1 302)')}"/>`],
  [0.68, f => `<g fill="none" stroke="${f(INK)}" stroke-linecap="round"><path d="M-10 71H110" stroke-width="2.4"/>${Array.from({ length: 9 }, (_, i) => `<path d="M${-6 + i * 14} 72V110" stroke-width="1.8"/><path d="M${-6 + i * 14} 80a7 7 0 0 1 14 0" stroke-width="1.1"/>`).join('')}</g>
    <path d="M22 66.4h8v3.6h-8zM31 66.4h8v3.6h-8zM40 66.4h8v3.6h-8zM49 65.6h9.6l1.8 2.2v2.2H49z" fill="${f(INK)}"/>
    <path d="M23.4 67.2h2v1.2h-2zM27 67.2h2v1.2h-2zM32.4 67.2h2v1.2h-2zM36 67.2h2v1.2h-2zM41.4 67.2h2v1.2h-2zM45 67.2h2v1.2h-2zM51 67h2.4v1.2H51z" fill="${f('oklch(0.95 0.14 90)')}"/>`],
  [[0.9, 1], f => `<path d="M-14 110L0 82L-5 84L7 62L2 64L12 40L22 64L17 62L29 84L24 82L38 110Z" fill="${f(INK)}"/><path d="M62 110L77 76L71 79L85 52L79 54.6L92 26L105 54.6L99 52L113 79L107 76L122 110Z" fill="${f(INK)}"/>`],
];
const grey = d => { const v = Math.round(d * 255); return `rgb(${v},${v},${v})`; };

// The Vista as two pictures of one scene: the colour and the depth.
export function vista(size = 512) {
  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">`;
  const color = head + `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0.05" stop-color="#27275e"/><stop offset="0.44" stop-color="#b5527e"/><stop offset="0.62" stop-color="#f6c57c"/></linearGradient>
    <radialGradient id="glow"><stop offset="0" stop-color="#fff0c0" stop-opacity="0.75"/><stop offset="1" stop-color="#fff0c0" stop-opacity="0"/></radialGradient></defs>` +
    LAYERS.map(([, body], i) => body(c => c) + (i === 0 ? `<circle cx="58" cy="57" r="26" fill="url(#glow)"/><g fill="#fff" fill-opacity="0.85"><circle cx="18" cy="16" r="0.7"/><circle cx="34" cy="8" r="0.5"/><circle cx="80" cy="12" r="0.7"/><circle cx="66" cy="22" r="0.5"/></g>` : '')).join('') + '</svg>';
  // The depth map: every layer in its grey, then a soft blur, so no edge tears.
  const depth = head + `<defs><filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="0.9"/></filter>` +
    LAYERS.map(([d], i) => Array.isArray(d) ? `<linearGradient id="d${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0.3" stop-color="${grey(d[0])}"/><stop offset="1" stop-color="${grey(d[1])}"/></linearGradient>` : '').join('') + `</defs><g filter="url(#soft)">` +
    LAYERS.map(([d, body], i) => body(() => Array.isArray(d) ? `url(#d${i})` : grey(d))).join('') + '</g></svg>';
  return { color, depth };
}

// --- The renderer -------------------------------------------------------------
const VERT = `#version 300 es
in vec2 p; out vec2 vUv;
void main() { vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uCol, uDep; uniform vec2 uTilt;
in vec2 vUv; out vec4 o;
void main() {
  // A small zoom keeps the picture's edges out of the frame.
  vec2 base = (vUv - 0.5) * 0.88 + 0.5, uv = base;
  // Step toward the shifted sample: near pixels move with the tilt, far ones against it.
  for (int i = 0; i < 6; i++) uv = base - (texture(uDep, uv).r - 0.42) * uTilt * 0.075;
  // The depth map's slope gives a soft light that slides over the relief.
  float e = 1.0 / 256.0;
  vec2 g = vec2(texture(uDep, uv + vec2(e, 0.0)).r - texture(uDep, uv - vec2(e, 0.0)).r, texture(uDep, uv + vec2(0.0, e)).r - texture(uDep, uv - vec2(0.0, e)).r);
  float lit = dot(normalize(vec3(-g * 5.0, 1.0)), normalize(vec3(uTilt * 0.8, 1.0)));
  vec3 c = texture(uCol, uv).rgb * (0.82 + 0.26 * lit);
  // A sheen crosses the glass with the tilt.
  float band = smoothstep(0.1, 0.0, abs(vUv.x + vUv.y * 0.4 - 0.7 - uTilt.x * 0.55));
  o = vec4(c + band * 0.09, 1.0);
}`;

const picture = (win, svg) => new Promise((ok, no) => {
  const img = new win.Image();
  img.onload = () => ok(img);
  img.onerror = no;
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
});

// Builds the icon inside `host` (give the host a size). `scene` is { color, depth }.
// Returns a function that stops it, or null where WebGL2 is not there.
export async function mountDepth(host, scene = vista()) {
  const doc = host.ownerDocument, win = doc.defaultView;
  const canvas = doc.createElement('canvas'), gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
  if (!gl) return null;
  const crop = soft(grow(HEX, 0.84), 4.5), mask = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${crop}"/></svg>`)}") center / 100% 100% no-repeat`;
  host.style.cssText += ';position:relative;display:inline-block;transform-style:preserve-3d;cursor:grab;touch-action:none';
  canvas.style.cssText = `position:absolute;inset:0;width:100%;height:100%;-webkit-mask:${mask};mask:${mask}`;
  const spark = (x, y, r) => `<path d="M${x} ${y - r}l${r * 0.24} ${r * 0.76}l${r * 0.76} ${r * 0.24}l${-r * 0.76} ${r * 0.24}l${-r * 0.24} ${r * 0.76}l${-r * 0.24} ${-r * 0.76}l${-r * 0.76} ${-r * 0.24}l${r * 0.76} ${-r * 0.24}z" fill="#fffbe6"/>`;
  // The gold double ring and the sparks sit over the glass.
  host.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none"><defs><linearGradient id="au" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset="0.5" stop-color="#e2b04a"/><stop offset="1" stop-color="#a8742a"/></linearGradient></defs>
    <path d="${soft(HEX, 5)}" fill="none" stroke="url(#au)" stroke-width="2.4" stroke-linejoin="round"/><path d="${soft(grow(HEX, 0.905), 4.6)}" fill="none" stroke="url(#au)" stroke-width="0.6" stroke-linejoin="round"/>${spark(91.6, 26, 5)}${spark(8.4, 74, 3.6)}${spark(50, 2, 2.6)}</svg>`;
  host.prepend(canvas);

  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const [col, dep] = await Promise.all([picture(win, scene.color), picture(win, scene.depth)]);
  [col, dep].forEach((img, i) => {
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  });
  gl.uniform1i(gl.getUniformLocation(prog, 'uCol'), 0);
  gl.uniform1i(gl.getUniformLocation(prog, 'uDep'), 1);
  const uTilt = gl.getUniformLocation(prog, 'uTilt');

  // The spring: x, y is the tilt; tx, ty is where the pointer asks it to go.
  const s = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };
  const still = win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0, last = 0;
  const draw = () => {
    const w = Math.max(2, Math.round(host.clientWidth * Math.min(2, win.devicePixelRatio || 1)));
    if (canvas.width !== w) canvas.width = canvas.height = w;
    gl.viewport(0, 0, w, w);
    gl.uniform2f(uTilt, s.x, -s.y);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    host.style.transform = `perspective(520px) rotateY(${(s.x * 20).toFixed(2)}deg) rotateX(${(-s.y * 20).toFixed(2)}deg)`;
  };
  const step = t => {
    const dt = Math.min(0.033, (t - last) / 1000 || 0.016);
    last = t;
    // An underdamped spring: stiff enough to follow, loose enough to wobble.
    for (const [p, v, g] of [['x', 'vx', 'tx'], ['y', 'vy', 'ty']]) { s[v] += ((s[g] - s[p]) * 150 - s[v] * 7.5) * dt; s[p] += s[v] * dt; }
    draw();
    const live = Math.abs(s.vx) + Math.abs(s.vy) > 0.004 || Math.abs(s.tx - s.x) + Math.abs(s.ty - s.y) > 0.002;
    raf = live ? win.requestAnimationFrame(step) : 0;
  };
  const wake = () => { if (!raf && !still) { last = win.performance.now(); raf = win.requestAnimationFrame(step); } };
  const lim = n => Math.max(-1, Math.min(1, n));
  const move = e => { const r = host.getBoundingClientRect(); s.tx = lim((e.clientX - r.left - r.width / 2) / 180); s.ty = lim((e.clientY - r.top - r.height / 2) / 180); wake(); };
  const rest = () => { s.tx = s.ty = 0; wake(); };
  // A press kicks the spring away from the pointer.
  const kick = e => { const r = host.getBoundingClientRect(); s.vx += lim((r.left + r.width / 2 - e.clientX) / 30) * 9 || 6; s.vy += lim((r.top + r.height / 2 - e.clientY) / 30) * 9; wake(); };
  if (!still) {
    doc.addEventListener('pointermove', move, { passive: true });
    doc.documentElement.addEventListener('pointerleave', rest);
    host.addEventListener('pointerdown', kick);
  }
  draw();
  return () => { win.cancelAnimationFrame(raf); doc.removeEventListener('pointermove', move); doc.documentElement.removeEventListener('pointerleave', rest); host.removeEventListener('pointerdown', kick); };
}
