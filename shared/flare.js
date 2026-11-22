// Shared GLSL: lens flare, after Buoy Business and Beach walker.
// A veil and orb, an anamorphic streak, and ghosts through the frame centre.
// Paste FLARE into a fragment shader. It declares no uniforms.
// It compiles in raw WebGL2 and in a three.js ShaderMaterial.
//
// One call, the Look rule's flare:
//   vec3 add = flFlare(uv, src, asp, col, size, vec3(veil, streak, ghosts));
//   c = flScreen(c, add * gain * cover);
// uv and src are 0 to 1 on the frame. asp is width over height.
// size 1 is the full flare; a small light takes about 0.3.
// cover is the toy's own test: is the light behind something?
//
// The parts, for a flare with its own numbers:
//   vec2 d = flOffset(uv, src, asp, size);
//   flVeil(d, FL_VEIL)                  the haze veil and the orb
//   flStreak(d, amp, fall, len)         three nested bands across the frame
//   flGhosts(uv, src, asp, size, spread, back)
//   flWarm(col, warmth)                 pull a colour to orange or to cream
// Each part returns a weight. Multiply it by a colour and a gain.
// fxlab/ shows each toy's copy against these parts.
//
// The Buoy Business flare (Havoc lensflare.js and orbNode), in one call:
//   c += flBuoy(uv, src, asp, col, size, vec3(orb, streak, ghost), FL_BB, warmth);
// It adds light in linear colour, before bloom and tone mapping.
// orb, streak and ghost are Buoy Business panel values times the master.
// size widens the orb only.
// FL_BB holds thinness, length, orb fall and spread.
// flLine(d, thin, len) is its streak; flOrb(d, fall) is its orb.
// flRingTap() gives the nine depth taps for the toy's own cover test.
// flarePass() is the same flare as a three.js ShaderPass, for many lights.

export const FLARE = /* glsl */`
const vec3 FL_VEIL = vec3(0.025, 0.08, 0.4);
const vec3 FL_ORANGE = vec3(1.0, 0.42, 0.1);
const vec3 FL_CREAM = vec3(1.0, 0.93, 0.8);
const vec3 FL_COOL = vec3(0.85, 0.8, 1.0);

// The offset from the light: x in height units, both over the size.
vec2 flOffset(vec2 uv, vec2 src, float asp, float size) {
  vec2 d = (uv - src) / size;
  return vec2(d.x * asp, d.y);
}
// Veil, glow and orb, squashed sideways. amp holds the three strengths.
float flVeil(vec2 d, vec3 amp) {
  float r = length(vec2(d.x * 0.6, d.y));
  return amp.x * exp(-r * 1.5) + amp.y * exp(-r * 5.0) + amp.z * exp(-r * 22.0);
}
// The streak: three bands, each amp at its own falloff, tapered over len.
// A band with amp 0 costs nothing visible; give it any falloff.
float flStreak(vec2 d, vec3 amp, vec3 fall, float len) {
  float ay = abs(d.y);
  float line = amp.x * exp(-ay * fall.x) + amp.y * exp(-ay * fall.y) + amp.z * exp(-ay * fall.z);
  return line * exp(-abs(d.x) / len);
}
// One ghost: a soft disc of radius r at a frame point.
float flGhost(vec2 uv, vec2 at, float asp, float r) {
  vec2 g = (uv - at) * vec2(asp, 1.0);
  return exp(-dot(g, g) / (r * r));
}
// Ghosts sit on the line from the light through the frame centre.
// Three lie past the centre. back adds a small one behind the light.
// spread pushes them along the line.
float flGhosts(vec2 uv, vec2 src, float asp, float size, float spread, float back) {
  vec2 toC = (vec2(0.5) - src) * spread;
  float g = 0.9 * flGhost(uv, src + toC * 0.7, asp, 0.05 * size);
  g += 0.6 * flGhost(uv, src + toC * 1.4, asp, 0.09 * size);
  g += 0.4 * flGhost(uv, src + toC * 2.2, asp, 0.15 * size);
  g += 0.5 * back * flGhost(uv, src - toC * 0.45, asp, 0.03 * size);
  return g;
}
// Warmth above 0 pulls to deep orange; below 0, to cream.
// The result stays warm: blue never exceeds green, green never exceeds red.
vec3 flWarm(vec3 col, float warmth) {
  vec3 t = max(mix(col, warmth > 0.0 ? FL_ORANGE : FL_CREAM, clamp(abs(warmth), 0.0, 1.0)), 0.0);
  float g = min(t.g, t.r);
  return vec3(t.r, g, min(t.b, g));
}
// Screen blend: the flare washes the frame instead of clipping it.
vec3 flScreen(vec3 base, vec3 add) {
  return 1.0 - (1.0 - base) * (1.0 - min(add, 1.0));
}
// The Look rule's flare. k holds the veil, streak and ghost gains.
vec3 flFlare(vec2 uv, vec2 src, float asp, vec3 col, float size, vec3 k) {
  vec2 d = flOffset(uv, src, asp, size);
  vec3 add = col * flVeil(d, FL_VEIL) * k.x;
  add += mix(col, FL_COOL, 0.25) * flStreak(d, vec3(0.9, 0.3, 0.07), vec3(34.0, 9.0, 2.6), 1.4) * k.y;
  add += mix(col, col * FL_ORANGE, 0.4) * flGhosts(uv, src, asp, size, 1.0, 1.0) * 0.12 * k.z;
  return add;
}

// Buoy Business: streak thinness, streak length, orb fall, ghost spread.
// Orb fall 20 is the panel's Orb size 0.05.
const vec4 FL_BB = vec4(209.0, 0.22, 20.0, 1.0);
// Havoc's streak gain: its look's 1.4 times its pass's 4.
const float FL_BB_STREAK = 5.6;
// Havoc's ghost gain: its look's 2.2 times its pass's 1.5.
const float FL_BB_GHOST = 3.3;
// The depth ring's radius, in frame heights.
const float FL_RING = 0.012;

// The orb: one soft glow, squashed sideways. A low fall is a wide orb.
float flOrb(vec2 d, float fall) {
  return exp(-length(vec2(d.x * 0.6, d.y)) * fall);
}
// The thin streak: a bright line in a soft sheath, tapered over len.
float flLine(vec2 d, float thin, float len) {
  float ay = abs(d.y);
  return (exp(-ay * thin) + 0.3 * exp(-ay * thin * 0.08)) * exp(-abs(d.x) / len);
}
// Depth tap k of nine: 0 is the light, 1 to 8 a ring round it.
// The toy counts the taps that see the light; cover is that share.
vec2 flRingTap(vec2 src, float asp, int k) {
  if (k == 0) return clamp(src, 0.0, 1.0);
  float a = float(k - 1) * 0.7853982;
  return clamp(src + vec2(cos(a), sin(a)) * FL_RING / vec2(asp, 1.0), 0.0, 1.0);
}
// The Buoy Business flare. k holds the orb, streak and ghost strengths.
// look is FL_BB, or the toy's own four values in that order.
// The orb keeps the light's colour; streak and ghosts stay warm.
vec3 flBuoy(vec2 uv, vec2 src, float asp, vec3 col, float size, vec3 k, vec4 look, float warmth) {
  vec2 d = flOffset(uv, src, asp, 1.0);
  vec3 w = flWarm(col, warmth);
  vec3 add = col * flOrb(d, look.z / max(size, 1e-3)) * k.x;
  add += w * flLine(d, look.x, look.y) * FL_BB_STREAK * k.y;
  add += w * flGhosts(uv, src, asp, 1.0, look.w, 0.0) * FL_BB_GHOST * k.z;
  return add;
}
`;

// Buoy Business's tuned values (Havoc lab/ocean/panel-schema.js).
// master multiplies every lamp. reach is the fade distance in metres.
// halo is the lamp halo's opacity at night.
// Lamp strengths scale by the halo too.
// Each lamp holds its orb, streak and ghost strengths.
// The sun takes no halo, a gain over a bright sky, and a wide orb.
export const FLARE_BUOY = Object.freeze({
  thin: 209, length: 0.22, orbSize: 0.05, master: 3, reach: 370, halo: 0.34,
  searchlight: Object.freeze({ orb: 2, streak: 0.69, ghost: 0.81 }),
  nav: Object.freeze({ orb: 0.37, streak: 0, ghost: 0 }),
  buoy: Object.freeze({ orb: 0.4, streak: 0.06, ghost: 0 }),
  sun: Object.freeze({ orb: 0.5, streak: 0.4, ghost: 0.3, gain: 6, size: 2.5 }),
});

/**
 * Distance fade: bold up close, faint far off.
 * @param {number} dist Metres from the camera to the light.
 * @param {number} [reach] Fade distance in metres.
 * @returns {number} 0 to 1.
 */
export function flareFade(dist, reach = FLARE_BUOY.reach) {
  return Math.exp(-dist / Math.max(5, reach));
}

/**
 * Edge fade for a light near the frame edge, as Buoy Business does it.
 * @param {number} u Frame place, 0 to 1.
 * @param {number} v Frame place, 0 to 1.
 * @returns {number} 1 well inside the frame, 0 past 10 % outside.
 */
export function flareEdge(u, v) {
  const e = Math.max(Math.abs(u * 2 - 1), Math.abs(v * 2 - 1));
  const t = Math.min(1, Math.max(0, (e - 1.2) / (0.95 - 1.2)));
  return t * t * (3 - 2 * t);
}

/**
 * Slots for Buoy Business flares, as flat arrays for vec4 uniform arrays.
 * pos holds u, v, size, spread. k holds orb, streak, ghost, warmth.
 * col holds r, g, b and 0.
 * @param {number} n Slot count.
 */
export function buoySlots(n) {
  const pos = new Float32Array(n * 4), k = new Float32Array(n * 4), col = new Float32Array(n * 4);
  return {
    n, pos, k, col, used: 0,
    clear() { pos.fill(0); k.fill(0); col.fill(0); this.used = 0; },
    /**
     * Returns false when every slot is taken.
     * @param {number} u @param {number} v
     * @param {ArrayLike<number> | {r: number, g: number, b: number}} rgb Light colour, linear: an array or a three.js Color.
     * @param {{orb?: number, streak?: number, ghost?: number, size?: number, spread?: number, warmth?: number}} s
     */
    add(u, v, rgb, { orb = 0, streak = 0, ghost = 0, size = 1, spread = 1, warmth = 0 } = {}) {
      if (this.used >= n) return false;
      const i = this.used++ * 4;
      pos[i] = u; pos[i + 1] = v; pos[i + 2] = size; pos[i + 3] = spread;
      k[i] = orb; k[i + 1] = streak; k[i + 2] = ghost; k[i + 3] = warmth;
      col[i] = rgb.r ?? rgb[0]; col[i + 1] = rgb.g ?? rgb[1]; col[i + 2] = rgb.b ?? rgb[2]; col[i + 3] = 0;
      return true;
    },
  };
}

/**
 * The Buoy Business flare as a three.js pass: give it to `new ShaderPass()`.
 * Run it before bloom. It adds light; it does not screen.
 * The pass reads the slot arrays live: fill them each frame.
 * A ShaderPass keeps typed arrays by reference.
 * Set uniforms.uAsp.value to width over height on each resize.
 * @param {{ slots: ReturnType<typeof buoySlots>, look?: number[] }} o
 * look is thinness, length, orb fall, as FL_BB.
 */
export function flarePass({ slots, look = [FLARE_BUOY.thin, FLARE_BUOY.length, 1 / FLARE_BUOY.orbSize] }) {
  if (slots.n < 1) throw new Error('flarePass needs one slot or more');
  const n = slots.n;
  return {
    uniforms: {
      tDiffuse: { value: null }, uAsp: { value: 1 }, uLook: { value: look },
      uFP: { value: slots.pos }, uFK: { value: slots.k }, uFC: { value: slots.col },
    },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uAsp; uniform vec3 uLook;
uniform vec4 uFP[${n}], uFK[${n}], uFC[${n}]; varying vec2 vUv;
${FLARE}
void main() {
  vec3 c = texture(tDiffuse, vUv).rgb;
  for (int i = 0; i < ${n}; i++) {
    if (uFK[i].x + uFK[i].y + uFK[i].z <= 0.0) continue;
    c += flBuoy(vUv, uFP[i].xy, uAsp, uFC[i].rgb, uFP[i].z, uFK[i].xyz, vec4(uLook, uFP[i].w), uFK[i].w);
  }
  gl_FragColor = vec4(c, 1.0);
}`,
  };
}

// Slots for several lights, as two flat arrays for vec4 uniform arrays.
// pos holds u, v, gain, size. col holds r, g, b and the streak share.
// Pass them to gl.uniform4fv, or as a three.js uniform value.
export function flareSlots(n) {
  const pos = new Float32Array(n * 4), col = new Float32Array(n * 4);
  return {
    n, pos, col, used: 0,
    clear() { pos.fill(0); col.fill(0); this.used = 0; },
    // Returns false when every slot is taken.
    add(u, v, gain, size, r, g, b, streak = 1) {
      if (this.used >= n) return false;
      const i = this.used++ * 4;
      pos[i] = u; pos[i + 1] = v; pos[i + 2] = gain; pos[i + 3] = size;
      col[i] = r; col[i + 1] = g; col[i + 2] = b; col[i + 3] = streak;
      return true;
    },
  };
}

// The frame place of a world point, written to out as u, v.
// m is the view-projection matrix: 16 numbers, column-major.
// Returns false behind the camera, or past the frame edge by more than pad.
export function flareAt(m, x, y, z, out, pad = 0.05) {
  const w = m[3] * x + m[7] * y + m[11] * z + m[15];
  if (w <= 0) return false;
  const u = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w * 0.5 + 0.5;
  const v = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w * 0.5 + 0.5;
  out[0] = u; out[1] = v;
  return u >= -pad && u <= 1 + pad && v >= -pad && v <= 1 + pad;
}
