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
`;

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
