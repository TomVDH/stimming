// Flat figures for Frietkot at night, as GLSL signed-distance shapes in metres.
// The toy page and the sheet (people.html) both use this one source.
// Origin: the feet, on the ground. +x faces the way the figure moves.

export const FIG_GLSL = /* glsl */`
const float PI = 3.14159;
float cap(vec2 p, vec2 a, vec2 b, float r) {
  vec2 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)) - r;
}
// A capsule that narrows from ra at a to rb at b.
float taper(vec2 p, vec2 a, vec2 b, float ra, float rb) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - mix(ra, rb, h);
}
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float rbox(vec2 p, vec2 c, vec2 h, float r) { vec2 q = abs(p - c) - h + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
// Angles run from straight down; forward is positive.
vec2 dir(float a) { return vec2(sin(a), -cos(a)); }
// A two-bone limb; tip returns the end point.
float limb(vec2 p, vec2 a, float a1, float l1, float a2, float l2, float r1, float r2, out vec2 tip) {
  vec2 k = a + l1 * dir(a1);
  tip = k + l2 * dir(a2);
  return min(taper(p, a, k, r1, r2 * 1.05), taper(p, k, tip, r2, r2 * 0.8));
}
float fhash(float n) { return fract(sin(n * 91.7) * 43758.5); }

// On foot.
// build: 0 average, 1 tall and thin, 2 short and broad, 3 a child, 4 old with a stick,
//        5 long coat and a hat, 6 hood up, 7 a cap, 8 long hair, 9 staff in an apron.
// pose: 0 free, 1 hands in pockets, 2 arms crossed, 3 phone at the ear, 4 a can,
//       5 a wave, 6 pointing, 7 eating fries, 8 scooping, 9 handing over,
//       10 dancing, 11 sitting on a rail, 12 kicking a can, 13 kick-starting a moped,
//       14 an embrace, 15 pushing a trolley.
// gait above 1 is a run: a longer stride and a forward lean.
// hold: 1 a cone, 2 an umbrella. smoke: below 0 none; 0 hand low, 1 at the mouth.
// t: seconds, for the small idle motions. seed: varies them per figure.
float walker(vec2 p, float ph, float gait, float hold, float smoke, float build, float pose, float t, float seed, out vec2 hand) {
  vec2 sc = build < 0.5 ? vec2(1.0) : build < 1.5 ? vec2(0.86, 1.08) : build < 2.5 ? vec2(1.2, 0.93)
          : build < 3.5 ? vec2(0.8, 0.64) : vec2(1.0, 0.97);
  vec2 q = p / sc;
  // The old stoop forward; everyone breathes and shifts a little while standing.
  float stoop = (build > 3.5 && build < 4.5) ? 0.11 : 0.0;
  float idle = (1.0 - gait) * 0.012 * sin(t * 1.3 + seed * 6.0);
  float run = clamp(gait - 1.0, 0.0, 1.0);
  gait = min(gait, 1.0);
  // Dancers bounce on the beat; pushers and runners lean into it.
  float dance = (pose > 9.5 && pose < 10.5) ? 1.0 : 0.0;
  float sitting = (pose > 10.5 && pose < 11.5) ? 1.0 : 0.0;
  float lean = 0.1 * run + ((pose > 14.5) ? 0.12 : 0.0) + ((pose > 13.5 && pose < 14.5) ? 0.06 : 0.0);
  float bob = 0.012 * abs(sin(ph)) * gait + dance * 0.05 * abs(sin(t * 6.6 + seed * 3.0)) - sitting * 0.33;
  vec2 hip = vec2(0.0, 0.93 + bob), sh = vec2(0.04 + stoop + lean, 1.42 + bob + idle);
  vec2 head = vec2(0.07 + stoop * 1.3 + lean * 1.3, 1.63 + bob + idle);
  float d = length((q - head) / vec2(0.92, 1.08)) - 0.1;
  d = smin(d, cap(q, sh + vec2(0.0, 0.05), head + vec2(-0.01, -0.08), 0.045), 0.05);
  // A long coat reaches the knees; others wear a jacket to the hip.
  bool coat = build > 4.5 && build < 5.5;
  d = smin(d, taper(q, hip + vec2(-0.01, coat ? -0.38 : 0.07), sh, coat ? 0.2 : 0.125, 0.165), 0.03);
  vec2 tip;
  for (int i = 0; i < 2; i++) {
    float qh = ph + float(i) * PI;
    float th = (0.3 + 0.37 * run) * sin(qh) * gait;
    float bend = (0.5 + 0.8 * run) * smoothstep(0.0, 1.0, cos(qh)) * gait + 0.04;
    // Sitting: thighs forward, shins hanging. Kicking: one leg swings hard.
    if (sitting > 0.5) { th = 1.45 + 0.08 * sin(t * 1.7 + float(i) * 2.0 + seed); bend = 1.45 - 0.15 * float(i); }
    if (i == 0 && pose > 11.5 && pose < 12.5) { float kk = pow(max(0.0, sin(t * 3.0 + seed * 5.0)), 4.0); th = -0.3 + 1.5 * kk; bend = 0.6 * (1.0 - kk); }
    if (i == 0 && pose > 12.5 && pose < 13.5) { float st = pow(max(0.0, sin(t * 5.0 + seed * 5.0)), 2.0); th = 0.5 - 0.5 * st; bend = 1.1 - 1.0 * st; }
    if (dance > 0.5) { th = 0.15 * sin(t * 3.3 + float(i) * PI + seed); bend = 0.2 + 0.2 * abs(sin(t * 6.6)); }
    d = smin(d, limb(q, hip + vec2(0.0, -0.02), th, 0.45, th - bend, 0.46, 0.078, 0.058, tip), 0.05);
    d = min(d, cap(q, tip + vec2(-0.02, 0.02), tip + vec2(0.1, 0.0), 0.034));
  }
  vec2 handQ = vec2(0.27, 1.1);
  for (int i = 0; i < 2; i++) {
    float qh = ph + float(i) * PI;
    float ua = -0.2 * sin(qh) * gait, fa = ua + 0.2 + 0.08 * gait, l2 = 0.27;
    if (pose > 0.5 && pose < 1.5) { ua = 0.06; fa = -0.15; l2 = 0.17; }
    // Crossed: the forearm folds back across the chest.
    if (pose > 1.5 && pose < 2.5) { ua = 0.12; fa = 1.95; l2 = 0.2; }
    if (i == 0) {
      float lift = smoothstep(0.55, 0.95, sin(t * 0.8 + seed * 9.0));
      if (pose > 2.5 && pose < 3.5) { ua = 0.25; fa = 2.95; }
      if (pose > 3.5 && pose < 4.5) { ua = 0.25; fa = mix(1.1, 2.75, lift); }
      if (pose > 4.5 && pose < 5.5) { ua = 2.6 + 0.2 * sin(t * 9.0 + seed); fa = ua + 0.35 + 0.25 * sin(t * 9.0 + seed); }
      if (pose > 5.5 && pose < 6.5) { ua = 1.45; fa = 1.45; }
      if (pose > 6.5 && pose < 7.5) { ua = 0.25; fa = mix(1.2, 2.7, lift); }
      if (pose > 7.5 && pose < 8.5) { ua = 0.7 + 0.25 * sin(t * 5.0 + seed); fa = ua + 0.5; }
      if (pose > 8.5 && pose < 9.5) { ua = 1.2 + 0.15 * sin(t * 2.0 + seed); fa = 1.35; }
      if (pose > 13.5 && pose < 14.5) { ua = 1.3; fa = 2.2; }
      if (pose > 14.5) { ua = 1.35; fa = 1.5; }
      if (hold > 1.5) { ua = 0.5; fa = 2.45; }
      else if (hold > 0.5 && pose < 6.5) { ua = 0.32; fa = 1.3; }
      if (smoke >= 0.0) { ua = mix(0.28, 0.12, smoke); fa = mix(1.25, 2.75, smoke); }
    }
    // Dancers throw both arms up and down; runners pump them.
    if (dance > 0.5) { ua = 2.4 + 0.5 * sin(t * 6.6 + float(i) * PI + seed); fa = ua + 0.3; }
    if (run > 0.0 && pose < 0.5) { ua *= 2.7; fa = ua + 1.2; }
    if (i == 1 && pose > 14.5) { ua = 1.3; fa = 1.45; }
    if (i == 1 && pose > 13.5 && pose < 14.5) { ua = 1.2; fa = 2.1; }
    d = smin(d, limb(q, sh + vec2(-0.02, -0.04), ua, 0.29, fa, l2, 0.048, 0.04, tip), 0.03);
    if (i == 0) handQ = tip;
  }
  // Headwear and hair.
  if (coat) {
    d = min(d, cap(q, head + vec2(-0.16, 0.08), head + vec2(0.18, 0.08), 0.017));
    d = min(d, rbox(q, head + vec2(0.0, 0.15), vec2(0.085, 0.065), 0.03));
  }
  if (build > 5.5 && build < 6.5) d = smin(d, length(q - head - vec2(-0.02, 0.01)) - 0.13, 0.08);
  if (build > 6.5 && build < 7.5) {
    d = min(d, length(q - head - vec2(-0.01, 0.05)) - 0.1);
    d = min(d, cap(q, head + vec2(0.02, 0.07), head + vec2(0.17, 0.06), 0.02));
  }
  if (build > 7.5 && build < 8.5) d = smin(d, taper(q, head + vec2(-0.05, 0.04), head + vec2(-0.11, -0.36), 0.11, 0.06), 0.04);
  // Staff wear a paper cap.
  if (build > 8.5) d = min(d, rbox(q, head + vec2(0.0, 0.12), vec2(0.095, 0.035), 0.012));
  // The old walk with a stick.
  if (build > 3.5 && build < 4.5) d = min(d, cap(q, handQ, vec2(handQ.x + 0.08, 0.0), 0.014));
  // A phone of the late nineties, or a can.
  if (pose > 2.5 && pose < 3.5) d = min(d, rbox(q, handQ + vec2(0.0, 0.05), vec2(0.025, 0.06), 0.01));
  if (pose > 3.5 && pose < 4.5) d = min(d, rbox(q, handQ + vec2(0.02, 0.04), vec2(0.03, 0.055), 0.008));
  hand = handQ * sc;
  return d * min(sc.x, sc.y);
}
// A plain upright shape: head and a long soft body, no limbs.
float pillar(vec2 p, float ph, float gait) {
  float sway = 0.03 * sin(ph) * gait;
  float d = length(p - vec2(0.06 + sway, 1.62)) - 0.12;
  return smin(d, taper(p, vec2(0.0, 0.12), vec2(0.03 + sway, 1.4), 0.12, 0.175), 0.08);
}
float bike(vec2 p) {
  vec2 bb = vec2(0.0, 0.33), rh = vec2(-0.52, 0.33), fh = vec2(0.52, 0.33), seat = vec2(-0.12, 0.86), hd = vec2(0.38, 0.84);
  float w = min(abs(length(p - rh) - 0.3), abs(length(p - fh) - 0.3)) - 0.02;
  w = min(w, min(length(p - rh), length(p - fh)) - 0.035);
  float f = min(min(cap(p, bb, seat, 0.018), cap(p, seat, hd, 0.018)), min(cap(p, bb, hd + vec2(0.0, -0.05), 0.02), cap(p, bb, rh, 0.016)));
  f = min(f, min(cap(p, seat, rh, 0.014), cap(p, hd, fh, 0.018)));
  f = min(f, min(cap(p, hd, hd + vec2(-0.04, 0.14), 0.016), cap(p, seat + vec2(-0.08, 0.03), seat + vec2(0.06, 0.03), 0.024)));
  return min(w, f);
}
// On a bike: the legs follow the pedals by a two-bone reach.
float rider(vec2 p, float ph, out vec2 hand) {
  vec2 hip = vec2(-0.1, 0.95), sh = vec2(0.14, 1.42);
  float d = smin(length(p - vec2(0.24, 1.62)) - 0.1, taper(p, hip, sh, 0.12, 0.16), 0.05);
  for (int i = 0; i < 2; i++) {
    vec2 pedal = vec2(0.0, 0.33) + 0.16 * vec2(cos(ph + float(i) * PI), sin(ph + float(i) * PI));
    vec2 v = pedal - hip;
    float D = length(v), h = sqrt(max(0.0, 0.46 * 0.46 - D * D * 0.25));
    vec2 knee = hip + v * 0.5 + normalize(vec2(-v.y, v.x)) * h;
    d = smin(d, min(taper(p, hip, knee, 0.078, 0.06), taper(p, knee, pedal, 0.058, 0.045)), 0.04);
  }
  hand = vec2(0.36, 0.98);
  return smin(d, taper(p, sh + vec2(0.0, -0.04), hand, 0.048, 0.04), 0.03);
}
float leg(vec2 p, vec2 top, float len, float a, float r0, float r1) { return taper(p, top, top + len * dir(a), r0, r1); }
// The dog: a scruffy mongrel, lanky and hunched, with spiky tufts and a long snout.
// When it stops, it sits: the rear folds down and the front legs stand straight.
float mutt(vec2 p, float ph, float gait) {
  float sit = 1.0 - gait;
  vec2 rear = vec2(-0.24, mix(0.5, 0.26, sit)), front = vec2(0.16, mix(0.55, 0.62, sit));
  float d = taper(p, rear, front, 0.11, 0.1);
  // Head low and forward, a long snout, two pricked ears.
  vec2 hd = front + vec2(0.17, mix(0.08, 0.16, sit));
  d = smin(d, length(p - hd) - 0.08, 0.05);
  d = min(d, taper(p, hd + vec2(0.04, -0.01), hd + vec2(0.24, -0.06), 0.05, 0.022));
  d = min(d, taper(p, hd + vec2(-0.02, 0.05), hd + vec2(-0.04, 0.17), 0.035, 0.01));
  d = min(d, taper(p, hd + vec2(0.03, 0.05), hd + vec2(0.06, 0.16), 0.03, 0.01));
  // A thin tail that hangs, wagging a little.
  d = min(d, taper(p, rear + vec2(-0.06, 0.04), rear + vec2(-0.2, -0.12 + 0.04 * sin(ph * 2.0 + 1.0)), 0.025, 0.01));
  for (int i = 0; i < 4; i++) {
    float fi = float(i), isF = i < 2 ? 1.0 : 0.0;
    vec2 top = isF > 0.5 ? front + vec2(0.04 * mod(fi, 2.0), -0.06) : rear + vec2(0.05 * mod(fi, 2.0), -0.04);
    float swing = 0.45 * sin(ph + fi * 1.57 + mod(fi, 2.0) * PI) * gait;
    float len = isF > 0.5 ? mix(0.45, 0.56, sit) : mix(0.45, 0.2, sit);
    float ang = isF > 0.5 ? swing : mix(swing, 1.2, sit);
    d = min(d, leg(p, top, len, ang, 0.032, 0.022));
  }
  // Spiky tufts along the back and the head: a sawtooth on the outline above the spine.
  float spine = smoothstep(rear.y - 0.05, rear.y + 0.12, p.y) * smoothstep(0.05, -0.02, d);
  float teeth = abs(fract(p.x * 18.0) - 0.5) * 2.0;
  return d - 0.03 * spine * teeth + 0.006 * sin(p.x * 160.0 + p.y * 90.0);
}
float moto(vec2 p) {
  float w = min(abs(length(p - vec2(-0.72, 0.33)) - 0.28) - 0.055, abs(length(p - vec2(0.74, 0.33)) - 0.28) - 0.055);
  float body = taper(p, vec2(-0.42, 0.66), vec2(0.32, 0.8), 0.15, 0.19);
  body = smin(body, rbox(p, vec2(0.0, 0.48), vec2(0.24, 0.14), 0.06), 0.08);
  float parts = min(cap(p, vec2(0.46, 0.96), vec2(0.74, 0.33), 0.03), cap(p, vec2(0.44, 0.98), vec2(0.3, 1.06), 0.025));
  parts = min(parts, taper(p, vec2(-0.4, 0.7), vec2(-0.8, 0.76), 0.07, 0.05));
  parts = min(parts, cap(p, vec2(-0.2, 0.38), vec2(-0.72, 0.36), 0.03));
  return min(min(w, body), parts);
}
float motoRider(vec2 p) {
  float d = smin(length(p - vec2(0.2, 1.43)) - 0.14, taper(p, vec2(-0.22, 0.92), vec2(0.1, 1.3), 0.13, 0.16), 0.05);
  d = smin(d, taper(p, vec2(0.08, 1.24), vec2(0.38, 1.0), 0.05, 0.042), 0.03);
  return smin(d, min(taper(p, vec2(-0.2, 0.9), vec2(0.16, 0.74), 0.085, 0.07), taper(p, vec2(0.16, 0.74), vec2(0.06, 0.36), 0.07, 0.05)), 0.04);
}
// A small hatchback in profile.
float car(vec2 p, out float glass) {
  float body = rbox(p, vec2(0.0, 0.6), vec2(2.05, 0.28), 0.16);
  vec2 q = p - vec2(-0.25, 1.08);
  float cab = rbox(p, vec2(-0.25, 1.08), vec2(1.15, 0.32), 0.14);
  cab = max(cab, dot(q, normalize(vec2(0.75, 0.66))) - 0.78);
  cab = max(cab, dot(q, normalize(vec2(-0.4, 0.92))) - 0.3);
  float d = smin(body, cab, 0.06);
  float arch = min(length(p - vec2(-1.3, 0.34)), length(p - vec2(1.3, 0.34)));
  d = max(d, -(arch - 0.38));
  d = min(d, arch - 0.31);
  glass = smoothstep(0.03, -0.02, cab + 0.08) * step(0.92, p.y);
  return d;
}
// An umbrella held in the hand: a shallow canopy on eight ribs, tipped into the walk.
// The hem dips between the rib tips; a ferrule on top, a hooked handle below the hand.
float umbrella(vec2 p, vec2 hand, float tilt) {
  vec2 up = vec2(sin(tilt), cos(tilt)), side = vec2(up.y, -up.x);
  vec2 c = hand + up * 0.62;
  vec2 l = vec2(dot(p - c, side), dot(p - c, up));
  // The canopy: an arc 1.05 m wide and 0.3 m tall, 0.025 m thick at the crown.
  float arc = length(l / vec2(0.53, 0.3)) - 1.0;
  // The hem: lowest at each rib tip, curving up between them.
  float hemY = -0.03 + 0.06 * abs(sin(l.x * 3.1416 / 0.265));
  float shell = max(arc * 0.3, hemY - l.y);
  float d = shell;
  d = min(d, cap(l, vec2(0.0, 0.29), vec2(0.0, 0.36), 0.012));
  // Shaft and the J of the handle.
  vec2 h0 = hand - up * 0.08;
  d = min(d, cap(p, c, h0, 0.012));
  d = min(d, abs(length(p - (h0 - side * 0.045)) - 0.045) - 0.012 + max(0.0, dot(p - h0, up)) * 10.0);
  return d;
}
`;
