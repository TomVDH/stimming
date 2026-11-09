// Shared air: height fog, sky, stars and point emitters for every place.
// Radiance is in tube units: one unit is one photoelectron per cell per frame.
import * as THREE from 'three';

// A seeded random source keeps each place the same on every load.
export function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* ---------- fog ---------- */
// Two exponential layers: a thin dense one on the ground, a tall thin haze.
// uFog holds density and inverse scale height for each layer.
export function makeAir() {
  return {
    uFog: { value: new THREE.Vector4(0.01, 0.5, 0.0004, 1 / 600) },
    uFogCol: { value: new THREE.Color(3, 3, 3) },
    uFogGlow: { value: new THREE.Vector3(-0.9, 0.6, 0.6) },
    uFogTime: { value: 0 },
    uSky: { value: new THREE.Vector4(4.4, 0.75, 3.2, 0) },
  };
}

export const FOG_GLSL = /* glsl */`
  uniform vec4 uFog;
  uniform vec3 uFogCol, uFogGlow;
  uniform float uFogTime;
  float fh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float fvn(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(fh(i), fh(i + vec2(1, 0)), f.x), mix(fh(i + vec2(0, 1)), fh(i + vec2(1, 1)), f.x), f.y);
  }
  // Mean density factor of one layer between two heights.
  float layerK(float hc, float hp, float b) {
    float dh = hp - hc;
    return abs(dh) > 0.01 ? (exp(-b * hc) - exp(-b * hp)) / (b * dh) : exp(-b * hc);
  }
  float fogDepth(vec3 cam, vec3 p) {
    float d = length(p - cam);
    // A mirrored point below the water lies on the same optical path.
    float hc = max(cam.y, 0.0), hp = abs(p.y);
    float od1 = uFog.x * d * layerK(hc, hp, uFog.y);
    float od2 = uFog.z * d * layerK(hc, hp, uFog.w);
    // Banks drift; the ground layer is patchy, the haze is even.
    vec2 m = mix(cam.xz, p.xz, 0.55);
    float n = 0.6 * fvn(m * 0.012 + vec2(uFogTime * 0.011, uFogTime * 0.004)) + 0.4 * fvn(m * 0.045 - vec2(uFogTime * 0.02, 0.0));
    return od1 * (0.25 + 1.5 * n) + od2;
  }
  // Light the fog with the sky, brighter toward the town glow.
  vec3 fogLight(vec3 rd) {
    float az = atan(rd.x, -rd.z);
    return uFogCol * (1.0 + uFogGlow.y * exp(-pow((az - uFogGlow.x) / uFogGlow.z, 2.0)));
  }
  vec3 applyFog(vec3 col, vec3 cam, vec3 p) {
    float T = exp(-fogDepth(cam, p));
    return col * T + fogLight(normalize(p - cam)) * (1.0 - T);
  }
  // Transmittance to infinity along a direction.
  float skyT(vec3 cam, vec3 dir) {
    float s = max(dir.y, 0.012);
    float hc = max(cam.y, 0.0);
    return exp(-(uFog.x / uFog.y * exp(-uFog.y * hc) * 0.6 + uFog.z / uFog.w * exp(-uFog.w * hc)) / s);
  }`;

// Patches built-in materials so every surface sits inside the fog.
export function fogify(root, air) {
  root.traverse(o => {
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    mats.forEach(m => {
      if (m.isShaderMaterial || m.userData.fogged) return;
      m.userData.fogged = true;
      const prev = m.onBeforeCompile;
      m.onBeforeCompile = (sh, r) => {
        prev?.call(m, sh, r);
        Object.assign(sh.uniforms, air);
        sh.vertexShader = sh.vertexShader
          .replace('#include <fog_pars_vertex>', 'varying vec3 vFogW;')
          .replace('#include <fog_vertex>', `
            vec4 fw = vec4(transformed, 1.0);
            #ifdef USE_INSTANCING
              fw = instanceMatrix * fw;
            #endif
            vFogW = (modelMatrix * fw).xyz;`);
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <fog_pars_fragment>', FOG_GLSL + '\nvarying vec3 vFogW;')
          .replace('#include <fog_fragment>', 'gl_FragColor.rgb = applyFog(gl_FragColor.rgb, cameraPosition, vFogW);');
      };
      const key = prev ? prev.toString() : '';
      m.customProgramCacheKey = () => 'nvgfog:' + key;
      m.needsUpdate = true;
    });
  });
}

/* ---------- sky ---------- */
// The dome centres on the eye and keeps its parent's mirror.
const ID = new THREE.Matrix4();
function follow(o, cam) {
  o.matrixWorld.copy(o.parent ? o.parent.matrixWorld : ID).setPosition(cam.position);
}

// Clouds sit on a plane high up; the town lights them from below.
const CLOUD_GLSL = /* glsl */`
  uniform vec4 uSky;
  float ch(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }
  float cvn(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(ch(i), ch(i + vec2(1, 0)), f.x), mix(ch(i + vec2(0, 1)), ch(i + vec2(1, 1)), f.x), f.y);
  }
  float cloud(vec3 d, float t) {
    if (uSky.w <= 0.0 || d.y <= 0.01) return 0.0;
    vec2 uv = d.xz / d.y * 0.9 + vec2(t * 0.004, t * 0.0016);
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { s += a * cvn(uv); uv = uv * 2.07 + 3.1; a *= 0.5; }
    return smoothstep(1.0 - uSky.w, 1.0 - uSky.w + 0.28, s) * smoothstep(0.01, 0.12, d.y);
  }`;

export function buildSky(air) {
  const mat = new THREE.ShaderMaterial({
    uniforms: air,
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = position;
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vDir;
      ${FOG_GLSL}
      ${CLOUD_GLSL}
      float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vn(p); p *= 2.03; a *= 0.5; } return s; }
      void main() {
        vec3 d = normalize(vDir);
        // The mirror pass flips the sphere; the sky stays the right way up.
        d.y = abs(d.y);
        float el = d.y;
        float az = atan(d.x, -d.z);
        // Airglow is bright in the near infrared and peaks low.
        float sky = mix(uSky.x, uSky.y, pow(smoothstep(-0.02, 0.9, el), 0.55));
        float town = exp(-pow((az - uFogGlow.x) / 0.42, 2.0));
        sky += uSky.z * town * exp(-el * 9.0);
        vec3 mw = normalize(vec3(0.42, 0.55, 0.72));
        float band = exp(-pow(dot(d, mw) / 0.2, 2.0));
        float mott = fbm(vec2(az * 3.2, el * 6.0)) * fbm(vec2(az * 9.0 + 3.0, el * 14.0));
        sky += band * (0.35 + 1.6 * mott) * smoothstep(0.0, 0.25, el);
        // Low cloud glows with town light and hides the stars.
        float c = cloud(d, uFogTime);
        float lit = uSky.x * 0.9 + uSky.z * 1.6 * town * exp(-el * 3.0);
        sky = mix(sky, lit * (0.7 + 0.3 * vn(d.xz / max(d.y, 0.05) * 3.0)), c);
        float T = skyT(cameraPosition, d);
        sky = sky * T + fogLight(d).r * (1.0 - T);
        gl_FragColor = vec4(vec3(sky), 1.0);
      }`,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(3600, 48, 24), mat);
  m.renderOrder = -1;
  m.frustumCulled = false;
  m.onBeforeRender = (r, s, cam) => follow(m, cam);
  return m;
}

export function buildStars(air, R) {
  const N = 9000, pos = new Float32Array(N * 3), val = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    const y = lerp(-0.08, 1, R()), a = R() * Math.PI * 2, r = Math.sqrt(1 - y * y);
    pos.set([Math.cos(a) * r * 3400, y * 3400, Math.sin(a) * r * 3400], i * 3);
    // Faint stars far outnumber bright ones.
    const u = Math.max(R(), 1e-4);
    val[i * 2] = Math.min(3000, 4.5 * Math.pow(u, -1.2));
    val[i * 2 + 1] = R() * 6.283;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aVal', new THREE.BufferAttribute(val, 2));
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...air, uPx: { value: 1 } },
    vertexShader: /* glsl */`
      attribute vec2 aVal;
      uniform float uPx;
      varying float vI;
      ${FOG_GLSL}
      ${CLOUD_GLSL}
      void main() {
        vec3 d = normalize(position);
        float el = d.y;
        // Low stars twinkle harder through more air.
        float tw = 1.0 + (0.12 + 0.4 * (1.0 - smoothstep(0.0, 0.5, el))) * sin(uFogTime * (7.0 + aVal.y) + aVal.y * 13.0);
        vI = aVal.x * tw * smoothstep(-0.02, 0.06, el) * skyT(cameraPosition, d) * (1.0 - cloud(d, uFogTime));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = 1.9 * uPx;
      }`,
    fragmentShader: /* glsl */`
      varying float vI;
      void main() {
        vec2 d = gl_PointCoord * 2.0 - 1.0;
        gl_FragColor = vec4(vec3(vI * exp(-dot(d, d) * 3.5)), 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const p = new THREE.Points(g, mat);
  p.frustumCulled = false;
  p.renderOrder = 1;
  p.onBeforeRender = (r, s, cam) => follow(p, cam);
  return p;
}

/* ---------- emitters ---------- */
// One additive point cloud holds every lamp, strobe and eye.
// Fog dims each core and spreads the lost light into a soft glow.
export class Emitters {
  constructor(max, air) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.val = new Float32Array(max * 2);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aVal', new THREE.BufferAttribute(this.val, 2).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { ...air, uPx: { value: 1 } },
      vertexShader: /* glsl */`
        attribute vec2 aVal;
        uniform float uPx;
        varying float vI, vT, vCore, vSize;
        ${FOG_GLSL}
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          // A mirrored lamp travels the same air as its source.
          vec3 src = vec3(wp.x, abs(wp.y), wp.z);
          vT = exp(-fogDepth(cameraPosition, src));
          vI = aVal.x;
          vCore = max(1.5, aVal.y * uPx);
          float glow = 18.0 * uPx * (0.6 + 0.4 * clamp(log(1.0 + aVal.x) / 9.0, 0.0, 1.0));
          vSize = max(vCore, (1.0 - vT) > 0.02 ? glow : 0.0);
          gl_Position = projectionMatrix * viewMatrix * wp;
          gl_PointSize = vSize;
        }`,
      fragmentShader: /* glsl */`
        varying float vI, vT, vCore, vSize;
        void main() {
          float r = length(gl_PointCoord * 2.0 - 1.0) * vSize * 0.5;
          float rc = vCore * 0.5;
          float core = vI * vT * exp(-r * r / (rc * rc) * 4.0);
          float rg = vSize * 0.5;
          float glow = vI * (1.0 - vT) * 1.6 * (rc * rc) / (rg * rg) * exp(-r * r / (rg * rg) * 3.0) * 0.7;
          gl_FragColor = vec4(vec3(core + glow), 1.0);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
    this.n = 0;
  }
  begin() { this.n = 0; }
  // Size is in CSS pixels; intensity is peak radiance.
  add(p, intensity, size = 2.2) {
    if (this.n >= this.max || !(intensity > 0)) return;
    const i = this.n++;
    this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
    this.val[i * 2] = Math.min(intensity, 30000); this.val[i * 2 + 1] = size;
  }
  end() {
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aVal.needsUpdate = true;
    g.setDrawRange(0, this.n);
  }
}

export function lambert(albedo, opts = {}) {
  return new THREE.MeshLambertMaterial({ color: new THREE.Color(albedo, albedo, albedo), ...opts });
}
