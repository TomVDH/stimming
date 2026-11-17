
vec2 sphHit(vec3 ro, vec3 rd, vec3 c, float r) {
  vec3 oc = ro - c;
  float b = dot(oc, rd), h = b * b - dot(oc, oc) + r * r;
  if (h < 0.0) return vec2(-1.0);
  h = sqrt(h);
  return vec2(-b - h, -b + h);
}
float vhg(float c, float k) { return (1.0 - k * k) / pow(1.0 + k * k - 2.0 * k * c, 1.5); }
// VHAZE: how much of the distance haze a volume takes.
#ifndef VHAZE
#define VHAZE 0.6
#endif
void main() {
  vec3 rd = normalize(vP - cameraPosition);
  vec2 h = sphHit(cameraPosition, rd, uC, uR);
  // A slab from the ground to uSlab clips low volumes; steps stay dense.
  if (abs(rd.y) > 1e-5) {
    float ta = -cameraPosition.y / rd.y, tb = (uSlab - cameraPosition.y) / rd.y;
    h = vec2(max(h.x, min(ta, tb)), min(h.y, max(ta, tb)));
  }
  // The march stops at the gun: smoke behind it stays hidden, smoke in front shows.
  float zb = texture(uGunD, gl_FragCoord.xy / uDRes).r;
  if (zb < 1.0) {
    float zn = zb * 2.0 - 1.0, vz = 2.0 * uNF.x * uNF.y / (uNF.y + uNF.x - zn * (uNF.y - uNF.x));
    h.y = min(h.y, vz / max(dot(rd, uCamFwd), 1e-3));
  }
  if (h.y <= max(h.x, 0.0)) discard;
  float t0 = max(h.x, 0.0), dt = (h.y - t0) / float(uVSteps);
  // Each pixel starts its march at its own offset.
  float t = t0 + dt * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  // The comet trail's phase: a forward lobe and a weak back lobe.
  float cs = dot(rd, uSun), ph = 0.5 * vhg(cs, 0.6) + 0.5 * vhg(cs, -0.2);
  float T = 1.0, wsum = 0.0, tsum = 0.0;
  vec3 col = vec3(0.0);
  for (int i = 0; i < 48; i++) {
    if (i >= uVSteps || T < 0.02) break;
    vec3 p = cameraPosition + rd * t, em;
    float d = dens(p, em);
    // Far volumes sink behind the horizon too.
    float hz = hzFade(p);
    d *= hz; em *= hz;
    if (d > 0.0) {
      float tl = 0.0;
#ifdef VSHADE
      // A cheap volume shades itself in closed form.
      tl = vshade(p, d);
#else
      // The comet trail's light: a short march toward the sun.
      vec3 e2, ql = p;
      float ls = uLs;
      for (int j = 0; j < 5; j++) {
        if (j >= uLSteps) break;
        ql += uSun * ls;
        tl += dens(ql, e2) * ls;
        ls *= 1.8;
      }
#endif
      // The second term stands in for light that scatters many times.
      // The gun's shadow cuts shafts through the dust.
      vec3 Ls = sunAt(p.y) * (exp(-tl) * 0.8 + exp(-tl * 0.18) * 0.2) * ph * 1.25 * (0.15 + 0.85 * sunVis(p));
      // Sky light grades from the horizon below to the zenith above.
      float hgt = clamp(0.5 + 0.5 * (p.y - uC.y) / uR, 0.0, 1.0);
      vec3 L = Ls + mix(uHorC, uZenC, hgt) * 0.3 + vlight(p);
      float a = 1.0 - exp(-d * dt);
      col += T * alb(p) * L * a;
      wsum += T * a; tsum += T * a * t;
      T *= 1.0 - a;
    }
    // Emission is radiance per metre.
    col += T * em * dt;
    t += dt;
  }
  float al = 1.0 - T;
  if (al < 0.002 && max(col.r, col.b) < 0.002) discard;
  // The air acts once, at the volume's mean depth.
  vec3 Pm = cameraPosition + rd * (wsum > 0.0 ? tsum / wsum : 0.5 * (t0 + h.y));
  // The blast keeps its own thinner air: the shared air washes the fireball out.
  vec3 Ta = airT(Pm) * (1.0 - VHAZE * k2hazeAmount(Pm));
  col = col * Ta + k2skyB(rd, 0.0) * (1.0 - Ta) * al;
  gl_FragColor = vec4(col, al);
}