// Strangereal sky: an anime-blue dome with a towering cumulus bank on the
// horizon and puffs higher up. Clouds are crisp-edged and self-shaded:
// lit tops, lavender shadow sides, a bright rim where the sun is behind.
import * as THREE from 'three';

export function skyDome(group) {
  const u = {
    uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Vector3(1, 1, 1) }, uT: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: /* glsl */ `varying vec3 vD; void main() { vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec3 vD;
      uniform vec3 uSun, uSunCol; uniform float uT;
      float hh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hh(i), hh(i + vec2(1, 0)), f.x), mix(hh(i + vec2(0, 1)), hh(i + 1.0), f.x), f.y); }
      float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
      // The bank: towers of cloud whose tops rise and fall along the horizon.
      float bank(vec2 q) {
        // Some columns tower into cumulonimbus; others stay low.
        float top = 0.04 + 0.42 * pow(fbm(vec2(q.x * 1.6, 3.1)), 2.6) + 0.07 * fbm(vec2(q.x * 9.0, 7.7));
        float edge = top + 0.035 * (fbm(q * vec2(14.0, 22.0)) - 0.5);
        return smoothstep(0.004, -0.004, q.y - edge) * smoothstep(-0.02, 0.03, q.y);
      }
      // Puffs: scattered fair-weather cumulus higher in the sky.
      float puffs(vec2 q) {
        float n = fbm(q * vec2(5.0, 11.0) + 4.0);
        return smoothstep(0.64, 0.67, n) * smoothstep(0.22, 0.32, q.y) * smoothstep(0.75, 0.45, q.y);
      }
      void main() {
        vec3 d = normalize(vD);
        float e = d.y, az = atan(d.x, -d.z);
        // Anime gradient: pale cyan at the horizon, azure, then ultramarine.
        vec3 hor = vec3(0.55, 0.8, 1.0), mid = vec3(0.08, 0.34, 0.95), zen = vec3(0.015, 0.07, 0.38);
        vec3 c = mix(hor, mid, smoothstep(0.0, 0.2, e));
        c = mix(c, zen, smoothstep(0.18, 0.75, e));
        float cs = max(dot(d, uSun), 0.0);
        c += uSunCol * (0.12 * pow(cs, 6.0) + 0.5 * pow(cs, 300.0));
        // Cloud space: azimuth and height; the deck drifts slowly.
        vec2 q = vec2(az + uT * 0.0004, e);
        float sAz = atan(uSun.x, -uSun.z);
        vec2 toSun = normalize(vec2(sAz - q.x, uSun.y - e) + 1e-4);
        float dB = bank(q), dP = puffs(q), dens = max(dB, dP);
        if (dens > 0.001) {
          // March toward the sun: cloud in the way puts this point in shade.
          float occ = 0.0;
          for (int i = 1; i <= 4; i++) {
            vec2 s = q + toSun * float(i) * 0.012;
            occ += max(bank(s), puffs(s));
          }
          float lit = 1.0 - smoothstep(0.5, 2.6, occ);
          // Lower parts sit in their own shadow; tops catch the light.
          float base = dB > dP ? smoothstep(0.0, 0.12, e) : 0.6;
          vec3 shadowC = vec3(0.3, 0.36, 0.7), litC = vec3(1.08, 1.04, 1.0) * mix(vec3(1.0), uSunCol / max(uSunCol.r, 0.01), 0.25);
          vec3 cloud = mix(shadowC * (0.75 + 0.25 * base), litC, lit * (0.45 + 0.55 * base));
          // A bright rim where the sun sits behind the cloud's edge.
          float rim = (1.0 - smoothstep(0.85, 1.0, dens)) * pow(cs, 4.0);
          cloud += uSunCol * rim * 1.2;
          // The bank's foot dissolves into the horizon haze.
          cloud = mix(cloud, hor, (1.0 - smoothstep(0.0, 0.06, e)) * 0.7);
          c = mix(c, cloud, dens);
        }
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(26000, 64, 32), mat);
  dome.renderOrder = -9;
  dome.frustumCulled = false;
  group.add(dome);
  return {
    // The horizon and mid colours, for the city's haze to match.
    haze: { lo: new THREE.Vector3(0.62, 0.84, 1.0), hi: new THREE.Vector3(0.12, 0.42, 1.0) },
    tick(t, sun, cam) {
      u.uT.value = t;
      u.uSun.value.copy(sun.dir);
      u.uSunCol.value.copy(sun.col).multiplyScalar(1 / 2.6);
      dome.position.copy(cam.position);
    },
  };
}
