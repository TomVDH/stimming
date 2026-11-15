// Ascent steam: the cloud at liftoff as a lit volume, raymarched small.
// Shape: two rolls out of the trench, a dome under the rocket, the exhaust column.
// Moving noise erodes the shape into billows.
// Light: the flame with self-shadow, the floodlights, the sky.
// The march stops at the scene's depth, so the rocket and tower sit inside it.
import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const VS = /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export class SteamPass extends Pass {
  constructor() {
    super();
    this.U = {
      tDepth: { value: null }, uProjInv: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() },
      uNear: { value: 0.1 }, uFar: { value: 20000 }, uEye: { value: new THREE.Vector3() },
      uPad: { value: new THREE.Vector3() }, uU: { value: new THREE.Vector3(1, 0, 0) }, uV: { value: new THREE.Vector3(0, 0, 1) },
      uAge: { value: 0 }, uH: { value: 0 }, uTime: { value: 0 },
      uFlame: { value: new THREE.Vector4() }, uFlameC: { value: new THREE.Color(1, 0.55, 0.22) },
      uLamps: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
      uSky: { value: new THREE.Color() }, uSun: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      uRes: { value: new THREE.Vector2(1, 1) },
    };
    this.volRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });
    this.vol = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: this.U, depthTest: false, depthWrite: false, vertexShader: VS,
      fragmentShader: /* glsl */`
      precision highp float;
      uniform sampler2D tDepth;
      uniform mat4 uProjInv, uCamWorld;
      uniform float uNear, uFar, uAge, uH, uTime;
      uniform vec3 uEye, uPad, uU, uV, uFlameC, uSky, uSun, uSunDir;
      uniform vec4 uFlame, uLamps[4];
      uniform vec2 uRes;
      varying vec2 vUv;
      float h31(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float vn(vec3 x) {
        vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(h31(i), h31(i + vec3(1, 0, 0)), f.x), mix(h31(i + vec3(0, 1, 0)), h31(i + vec3(1, 1, 0)), f.x), f.y),
                   mix(mix(h31(i + vec3(0, 0, 1)), h31(i + vec3(1, 0, 1)), f.x), mix(h31(i + vec3(0, 1, 1)), h31(i + vec3(1, 1, 1)), f.x), f.y), f.z);
      }
      float fbm(vec3 p) { return vn(p) * 0.55 + vn(p * 2.03 + 7.1) * 0.3 + vn(p * 4.1 + 3.3) * 0.15; }
      // Occupancy of the cloud's shape at pad point p, 0 to 1.
      float shape(vec3 p) {
        float a = uAge, occ = 0.0;
        // Two rolls out of the trench mouths, along V both ways.
        for (int k = 0; k < 2; k++) {
          float side = k == 0 ? 1.0 : -1.0;
          vec3 q = vec3(dot(p, uV) * side, p.y, dot(p, uU));
          float run = 320.0 * (1.0 - exp(-a / 5.0));
          float s = clamp(q.x - 36.0, 0.0, run);
          float R = 6.0 + 0.3 * s + 8.0 * min(a / 6.0, 1.0);
          vec3 c = vec3(36.0 + s, 0.65 * R + 1.0 + 0.1 * a, 0.08 * s * sin(s * 0.012 + float(k) * 2.0));
          occ = max(occ, smoothstep(1.0, 0.45, length((q - c) / vec3(1.0, 0.75, 1.25)) / R));
        }
        // A dome boils up round the mount.
        float rd = 16.0 + 26.0 * (1.0 - exp(-a / 2.5));
        occ = max(occ, smoothstep(1.0, 0.4, length((p - vec3(0.0, rd * 0.3, 0.0)) / vec3(1.0, 0.75, 1.0)) / rd));
        // The column under the rising rocket, widest near the ground.
        float top = min(uH, 900.0);
        if (top > 2.0 && p.y < top) {
          float rc = 5.0 + 0.05 * p.y + 14.0 * smoothstep(top, 0.0, p.y) * min(a / 8.0, 1.0);
          occ = max(occ, smoothstep(1.0, 0.35, length(p.xz) / rc) * smoothstep(top, top - 60.0, p.y));
        }
        return occ * step(-1.0, p.y);
      }
      // Extinction per metre at pad point p.
      // far: the eye's distance in metres; fine noise fades with it.
      float density(vec3 p, float far) {
        float s = shape(p);
        if (s <= 0.0) return 0.0;
        // Billows rise and roll outward; the noise eats the edges.
        vec3 w = p * 0.03 + vec3(0.0, -uTime * 0.12, uTime * 0.05);
        float fine = 1.0 / (1.0 + far / 250.0);
        float n = fbm(w) * 0.6 + vn(p * 0.12 - uTime * 0.3) * 0.25 + mix(0.5, vn(p * 0.35 + uTime * 0.2), fine) * 0.15;
        float d = clamp(s * 1.5 - (1.0 - n) * 1.7, 0.0, 1.0);
        return d * d * 0.07 * smoothstep(0.0, 0.6, uAge) * (1.0 - smoothstep(55.0, 80.0, uAge));
      }
      // Box round the pad, and the column above it.
      vec2 box(vec3 o, vec3 d, vec3 lo, vec3 hi) {
        vec3 inv = 1.0 / d, a = (lo - o) * inv, b = (hi - o) * inv;
        vec3 mn = min(a, b), mx = max(a, b);
        return vec2(max(max(mn.x, mn.y), mn.z), min(min(mx.x, mx.y), mx.z));
      }
      void main() {
        vec4 v = uProjInv * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
        vec3 dv = normalize(v.xyz / v.w);
        vec3 d = normalize(mat3(uCamWorld) * dv);
        // The scene's depth, as distance along this ray.
        float z = texture2D(tDepth, vUv).r * 2.0 - 1.0;
        float viewZ = 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear));
        float tScene = viewZ / max(-dv.z, 1e-4);
        vec3 o = uEye - uPad;
        vec2 tb = box(o, d, vec3(-480.0, -2.0, -480.0), vec3(480.0, max(uH, 300.0) + 10.0, 480.0));
        float t0 = max(tb.x, 0.0), t1 = min(tb.y, tScene);
        if (t1 <= t0 || uAge <= 0.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
        const int N = 30;
        float ds = (t1 - t0) / float(N);
        // A per-pixel offset hides the step pattern.
        float jit = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
        vec3 F = uFlame.xyz - uPad;
        vec3 S = vec3(0.0); float T = 1.0;
        for (int i = 0; i < N; i++) {
          float t = t0 + (float(i) + jit) * ds;
          vec3 p = o + d * t;
          float sig = density(p, t);
          if (sig <= 0.0005) continue;
          // The flame's light, shadowed by the cloud between.
          vec3 lf = F - p; float df = length(lf); lf /= df;
          float sh = 0.0, sl = min(df, 60.0) / 3.0;
          // Shadow rays read the bare shape: cheaper, and soft enough.
          for (int j = 1; j <= 3; j++) sh += shape(p + lf * sl * float(j));
          float tf = exp(-sh * sl * 0.05);
          vec3 Li = uFlameC * uFlame.w * 1.2e4 / (df * df + 3600.0) * (tf + 0.06);
          for (int k = 0; k < 4; k++) {
            vec3 ll = uLamps[k].xyz - uPad - p; float dl = length(ll);
            Li += vec3(1.0, 0.68, 0.34) * uLamps[k].w * 500.0 / (dl * dl + 900.0);
          }
          Li += uSky * (2.5 + 2.0 * smoothstep(0.0, 120.0, p.y)) + uSun * max(uSunDir.y + 0.3, 0.0) * 4.0;
          float a = 1.0 - exp(-sig * ds);
          S += T * a * Li * 0.92;
          T *= 1.0 - a;
          if (T < 0.02) break;
        }
        gl_FragColor = vec4(S, T);
      }`,
    }));
    this.CU = { tDiffuse: { value: null }, tVol: { value: this.volRT.texture } };
    this.comp = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: this.CU, depthTest: false, depthWrite: false, vertexShader: VS,
      fragmentShader: /* glsl */`uniform sampler2D tDiffuse, tVol; varying vec2 vUv;
        // A small tent blur smooths the coarse march as it scales up.
        void main() {
          vec4 c = texture2D(tDiffuse, vUv);
          vec2 px = 1.0 / vec2(textureSize(tVol, 0));
          vec4 s = texture2D(tVol, vUv) * 0.4 + (texture2D(tVol, vUv + vec2(px.x, 0.0)) + texture2D(tVol, vUv - vec2(px.x, 0.0)) + texture2D(tVol, vUv + vec2(0.0, px.y)) + texture2D(tVol, vUv - vec2(0.0, px.y))) * 0.15;
          gl_FragColor = vec4(c.rgb * s.a + s.rgb, c.a);
        }`,
    }));
  }

  setSize(w, h) {
    // The march runs at a third of the frame; the cloud is soft enough.
    this.volRT.setSize(Math.max(1, Math.round(w / 3)), Math.max(1, Math.round(h / 3)));
    this.U.uRes.value.set(w, h);
  }

  render(renderer, writeBuffer, readBuffer) {
    this.U.tDepth.value = readBuffer.depthTexture;
    renderer.setRenderTarget(this.volRT);
    this.vol.render(renderer);
    this.CU.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.comp.render(renderer);
  }

  dispose() { this.volRT.dispose(); this.vol.dispose(); this.comp.dispose(); }
}
