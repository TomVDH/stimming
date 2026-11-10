// Image intensifier: photocathode, MCP, phosphor, eyepiece.
// Each stage is one fullscreen pass on the three.js renderer.
import * as THREE from 'three';

const VERT = /* glsl */`
  out vec2 vUv;
  void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// The signal source: the rendered scene or the webcam.
const SIG = /* glsl */`
  uniform sampler2D tScene, tCam;
  uniform float uCam, uMirror, uExpo, uCamExpo;
  uniform vec4 uCamXf;
  uniform vec3 uW;
  vec3 s2l(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
  float sigAt(vec2 uv) {
    if (uCam > 0.5) {
      vec2 u = uv * uCamXf.xy + uCamXf.zw;
      if (uMirror > 0.5) u.x = 1.0 - u.x;
      return dot(s2l(texture(tCam, u).rgb), uW) * uCamExpo;
    }
    return dot(max(texture(tScene, uv).rgb, 0.0), uW) * uExpo;
  }`;

// Tube layout: centre and radius in CSS pixels, and a per-tube gain trim.
const TUBES = /* glsl */`
  uniform vec4 uTube[4];
  uniform int uN;
  uniform vec2 uScreen;`;

const HASH = /* glsl */`
  uint pcg(uint v) { uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
  float rnd(inout uint s) { s = pcg(s); return float(s) * (1.0 / 4294967296.0); }
  float h2(vec2 p, float k) { return float(pcg(uint(int(p.x) + 4096) * 7919u ^ pcg(uint(int(p.y) + 4096) + uint(k) * 104729u))) / 4294967296.0; }`;

function fsTri() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  return g;
}
function mat(frag, uniforms) {
  return new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: 'out highp vec4 outColor;\n' + frag, uniforms, depthTest: false, depthWrite: false });
}
function rt(w, h, { filter = THREE.LinearFilter, depth = false, samples = 0, depthTexture = null } = {}) {
  return new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: filter, magFilter: filter, depthBuffer: depth, samples, depthTexture });
}

export class Tube {
  constructor(renderer) {
    this.r = renderer;
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(fsTri());
    this.quad.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.quad);

    const tubeU = { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) };
    const nU = { value: 1 }, screenU = { value: new THREE.Vector2(1, 1) };
    this.u = { tubeU, nU, screenU };
    const sigU = {
      tScene: { value: null }, tCam: { value: null }, uCam: { value: 0 }, uMirror: { value: 0 },
      uExpo: { value: 1 }, uCamExpo: { value: 14 }, uCamXf: { value: new THREE.Vector4(1, 1, 0, 0) },
      uW: { value: new THREE.Vector3(0.56, 0.32, 0.12) },
    };
    this.sigU = sigU;

    // Half resolution signal: one bilinear tap averages two by two.
    this.mHalf = mat(/* glsl */`
      ${SIG}
      in vec2 vUv;
      // Green carries only the light above the halo threshold.
      void main() { float s = sigAt(vUv); outColor = vec4(s, max(s - 40.0, 0.0), 0.0, 1.0); }`, sigU);

    // Four bilinear taps average a four by four box.
    this.mDown = mat(/* glsl */`
      uniform sampler2D tSrc; uniform vec2 uTexel;
      in vec2 vUv;
      void main() {
        vec2 o = uTexel;
        vec2 s = texture(tSrc, vUv + vec2(-o.x, -o.y)).rg + texture(tSrc, vUv + vec2(o.x, -o.y)).rg
               + texture(tSrc, vUv + vec2(-o.x, o.y)).rg + texture(tSrc, vUv + vec2(o.x, o.y)).rg;
        outColor = vec4(s * 0.25, 0.0, 1.0);
      }`, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } });

    // MCP halo: a flat disc of fixed size round every bright point.
    // Veiling glare adds a wide soft skirt.
    this.mHalo = mat(/* glsl */`
      uniform sampler2D tHalf, tWide, tWider;
      uniform vec2 uDisc, uWideTexel, uWiderTexel;
      uniform float uHalo, uGlow, uGlow2, uFrame;
      in vec2 vUv;
      void main() {
        // Fixed jitter: a moving one makes halos shimmer.
        float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
        float s = 0.0;
        const int N = 96;
        for (int i = 0; i < N; i++) {
          float f = (float(i) + 0.5) / float(N);
          float a = float(i) * 2.39996323 + ign * 0.5;
          s += texture(tHalf, vUv + vec2(cos(a), sin(a)) * sqrt(f) * uDisc).g;
        }
        s /= float(N);
        float g = 0.0;
        for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++) {
          float w = exp(-float(x * x + y * y) * 0.35);
          g += texture(tWide, vUv + vec2(x, y) * uWideTexel * 1.5).g * w;
        }
        g /= 8.6;
        // Scatter in the optics spreads a faint skirt across the tube.
        float g2 = 0.0;
        for (int y = -3; y <= 3; y++) for (int x = -3; x <= 3; x++) {
          float w = exp(-float(x * x + y * y) * 0.16);
          g2 += texture(tWider, vUv + vec2(x, y) * uWiderTexel * 1.6).g * w;
        }
        g2 /= 19.0;
        outColor = vec4(uHalo * s + uGlow * g + uGlow2 * g2, 0.0, 0.0, 1.0);
      }`, {
      tHalf: { value: null }, tWide: { value: null }, tWider: { value: null },
      uDisc: { value: new THREE.Vector2() }, uWideTexel: { value: new THREE.Vector2() }, uWiderTexel: { value: new THREE.Vector2() },
      uHalo: { value: 0.25 }, uGlow: { value: 0.03 }, uGlow2: { value: 0.012 }, uFrame: { value: 0 },
    });

    // Objective lens: depth of field from the scene depth buffer.
    // Out-of-focus light spreads over a disc and thins out.
    this.mDof = mat(/* glsl */`
      uniform sampler2D tColor, tDepth;
      uniform vec2 uTexel;
      uniform float uNear, uFar, uFocusInv, uAper, uMaxR, uFrame;
      uniform vec3 uW;
      in vec2 vUv;
      float dist(vec2 uv) {
        float z = texture(tDepth, uv).x;
        return uNear * uFar / (uFar - z * (uFar - uNear));
      }
      float coc(float d) { return min(uMaxR, uAper * abs(uFocusInv - 1.0 / d)); }
      float sig(vec2 uv) { return dot(max(texture(tColor, uv).rgb, 0.0), uW); }
      void main() {
        float d0 = dist(vUv), r0 = coc(d0);
        float s0 = sig(vUv);
        float w0 = 1.0 / max(r0 * r0, 1.0);
        float sum = s0 * w0, wsum = w0;
        if (uMaxR > 0.5) {
          float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
          const int N = 40;
          for (int i = 0; i < N; i++) {
            float f = (float(i) + 0.5) / float(N);
            float r = sqrt(f) * uMaxR;
            float a = float(i) * 2.39996323 + ign * 6.2831853;
            vec2 uv = vUv + vec2(cos(a), sin(a)) * r * uTexel;
            float d = dist(uv), cr = coc(d);
            // Near blur spills over; far blur stops at sharper near edges.
            float reach = d < d0 ? cr : min(cr, r0);
            float w = clamp(reach - r + 1.0, 0.0, 1.0) / max(cr * cr, 1.0);
            sum += sig(uv) * w; wsum += w;
          }
        }
        float s = sum / wsum;
        outColor = vec4(s, s, s, d0);
      }`, {
      tColor: { value: null }, tDepth: { value: null }, uTexel: { value: new THREE.Vector2() },
      uNear: { value: 0.1 }, uFar: { value: 6000 }, uFocusInv: { value: 0 }, uAper: { value: 20 }, uMaxR: { value: 14 }, uFrame: { value: 0 },
      uW: { value: new THREE.Vector3(1 / 3, 1 / 3, 1 / 3) },
    });

    // Automatic brightness control, one texel per tube.
    // Gain falls fast on a bright source and climbs back slowly.
    this.mGain = mat(/* glsl */`
      ${TUBES}
      uniform sampler2D tLum, tPrev;
      uniform float uDt, uGmax, uTarget, uPeakK;
      in vec2 vUv;
      void main() {
        int i = int(gl_FragCoord.x);
        vec4 prev = texelFetch(tPrev, ivec2(i, 0), 0);
        if (i >= uN) { outColor = prev; return; }
        vec4 T = uTube[i];
        // Every luminance texel inside the tube counts.
        ivec2 sz = textureSize(tLum, 0);
        vec2 px = uScreen / vec2(sz);
        ivec2 lo = clamp(ivec2((T.xy - T.z) / px), ivec2(0), sz - 1);
        ivec2 hi = clamp(ivec2((T.xy + T.z) / px), ivec2(0), sz - 1);
        float sum = 0.0, wsum = 0.0, peak = 0.0;
        for (int y = 0; y < 128; y++) {
          int ty = lo.y + y;
          if (ty > hi.y) break;
          for (int x = 0; x < 128; x++) {
            int tx = lo.x + x;
            if (tx > hi.x) break;
            vec2 c = (vec2(tx, ty) + 0.5) * px;
            if (length(c - T.xy) > T.z) continue;
            float v = texelFetch(tLum, ivec2(tx, ty), 0).r;
            sum += v; wsum += 1.0; peak = max(peak, v);
          }
        }
        // Peak counts as energy, so texel size cancels out.
        float lam = sum / max(wsum, 1.0) + uPeakK * peak * px.x * px.y / 1024.0;
        float gt = min(uGmax, uTarget / max(lam, 1e-4));
        float g = prev.r > 0.0 ? prev.r : gt;
        float lg = log(gt) - log(g);
        g = exp(log(g) + clamp(lg, -3.5 * uDt, 1.2 * uDt));
        // Overload: how far the ABC is past its floor.
        float over = lam * uGmax / uTarget;
        outColor = vec4(g, over, 0.0, 1.0);
      }`, {
      ...{ uTube: tubeU, uN: nU, uScreen: screenU },
      tLum: { value: null }, tPrev: { value: null }, uDt: { value: 0.016 }, uGmax: { value: 0.13 }, uTarget: { value: 0.62 }, uPeakK: { value: 0.3 },
    });

    // The tube proper: photoelectron statistics, fixed pattern, gain, phosphor decay.
    this.mTube = mat(/* glsl */`
      ${SIG}
      ${TUBES}
      ${HASH}
      uniform sampler2D tHalo, tGain, tPrev;
      uniform vec2 uCells;
      uniform float uFrame, uKq, uDt, uTau, uTail, uPower, uScint, uEbi, uDist, uSoft;
      in vec2 vUv;

      // MCP gain varies per photoelectron: a gamma law, shape 2, mean 1.
      // Excess noise factor 1 + 1/k = 1.5, as measured for chevron MCPs.
      float mcp(float n, inout uint s) {
        if (n < 0.5) return 0.0;
        if (n > 8.5) {
          float u1 = max(rnd(s), 1e-7), u2 = rnd(s);
          return max(0.0, n + sqrt(n * 0.5) * sqrt(-2.0 * log(u1)) * cos(6.2831853 * u2));
        }
        float a = 0.0;
        for (int j = 0; j < 9; j++) {
          if (float(j) >= n) break;
          a -= log(max(rnd(s) * rnd(s), 1e-9));
        }
        return a * 0.5;
      }
      float vn(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h2(i, 3.0), h2(i + vec2(1, 0), 3.0), f.x), mix(h2(i + vec2(0, 1), 3.0), h2(i + vec2(1, 1), 3.0), f.x), f.y);
      }

      float poisson(float lam, inout uint s) {
        if (lam < 10.0) {
          float L = exp(-lam), p = 1.0, k = 0.0;
          for (int j = 0; j < 26; j++) { p *= rnd(s); if (p <= L) break; k += 1.0; }
          return k;
        }
        float u1 = max(rnd(s), 1e-7), u2 = rnd(s);
        return max(0.0, lam + sqrt(lam) * sqrt(-2.0 * log(u1)) * cos(6.2831853 * u2));
      }

      // Hex lattice: cell id in xy, distance to the cell edge in z.
      vec3 hex(vec2 p) {
        const vec2 r = vec2(1.0, 1.7320508);
        vec2 a = mod(p, r) - r * 0.5, b = mod(p - r * 0.5, r) - r * 0.5;
        vec2 g = dot(a, a) < dot(b, b) ? a : b;
        vec2 id = p - g;
        vec2 ag = abs(g);
        float e = 0.5 - max(dot(ag, normalize(r)), ag.x);
        return vec3(id, e);
      }

      float tubeY(int i, vec2 p, uint seed) {
        vec4 T = uTube[i];
        vec2 q = (p - T.xy) / T.z;
        float fi = float(i);
        // Shear: a fibre-optic twister seam offsets the image by a pixel.
        if (i == 0) q.x += 0.0025 * smoothstep(-0.004, 0.004, q.y - 0.18 - 0.03 * q.x);
        float r2 = dot(q, q);
        // Objective distortion pulls the rim slightly.
        vec2 pd = T.xy + q * (1.0 + uDist * r2) * T.z;
        vec2 uv = pd / uScreen;
        // Resolution falls off toward the rim.
        float soft = uSoft * (0.6 + 2.2 * r2 * r2);
        vec2 o = soft / uScreen;
        float S = 0.4 * sigAt(uv) + 0.15 * (sigAt(uv + vec2(o.x, 0.0)) + sigAt(uv - vec2(o.x, 0.0)) + sigAt(uv + vec2(0.0, o.y)) + sigAt(uv - vec2(0.0, o.y)));
        S += texture(tHalo, uv).r + uEbi;
        // Fibre bundle: each fibre has its own small gain error.
        vec3 fib = hex(q * 150.0 + fi * 13.1);
        float fp = 1.0 + 0.07 * (h2(fib.xy * 4.0, 11.0 + fi) - 0.5);
        // Chicken wire: the multifibre seams print a faint honeycomb.
        vec3 mf = hex(q * 9.5 + vec2(fi * 3.7, fi * 1.3));
        fp *= 1.0 - 0.14 * smoothstep(0.04, 0.0, mf.z);
        // Blemishes: dead spots fixed in the screen of each tube.
        for (int k = 0; k < 6; k++) {
          vec2 c = vec2(h2(vec2(k, 3), 50.0 + fi), h2(vec2(k, 7), 70.0 + fi)) * 1.6 - 0.8;
          float rad = 0.004 + 0.012 * h2(vec2(k, 9), 90.0 + fi);
          fp *= 1.0 - (0.55 + 0.45 * h2(vec2(k, 1), 30.0 + fi)) * smoothstep(rad, rad * 0.35, length(q - c));
        }
        // Photocathode sensitivity drifts a few percent across the tube.
        fp *= 1.0 + 0.06 * (vn(q * 2.2 + fi * 7.0) - 0.5) + 0.03 * (vn(q * 6.0 - fi * 3.0) - 0.5);
        vec2 gs = texelFetch(tGain, ivec2(i, 0), 0).rg;
        float G = gs.r;
        // Autogating: once MCP gain hits its floor, about 60x down,
        // the cathode is pulsed off for part of each frame.
        // Fewer photoelectrons reach the MCP, so gain rises to hold brightness.
        float duty = clamp(60.0 / max(gs.g, 60.0), 0.02, 1.0);
        float lam = S * uKq * fp * T.w * duty;
        uint s = seed ^ (uint(i) * 2654435761u);
        float n = mcp(poisson(lam, s), s);
        // Ion feedback and field emission: random bright sparks.
        if (rnd(s) < uScint * clamp(G / 0.13, 0.15, 4.0)) n += uKq * (3.0 + 9.0 * rnd(s));
        // One emission point glows steadily in tube one.
        if (i == 1) n += uKq * 9.0 * smoothstep(0.006, 0.0, length(q - vec2(-0.31, 0.22)));
        return n * G / (uKq * duty) * uPower;
      }

      void main() {
        vec2 cell = floor(vUv * uCells);
        vec2 p = (cell + 0.5) / uCells * uScreen;
        uint seed = pcg(uint(cell.x) + pcg(uint(cell.y) + pcg(uint(uFrame))));
        float y = 0.0, wsum = 0.0;
        for (int i = 0; i < 4; i++) {
          if (i >= uN) break;
          float d = length(p - uTube[i].xy) / uTube[i].z;
          if (d > 1.03) continue;
          float w = clamp((1.03 - d) / 0.08, 0.0, 1.0);
          y += w * tubeY(i, p, seed);
          wsum += w;
        }
        y = wsum > 0.0 ? y / wsum : 0.0;
        // P43 decays to 10 % in about a millisecond: each frame stands alone.
        // A weak slow tail keeps a trace of bright light only.
        float slow = texture(tPrev, vUv).g;
        float k = exp(-uDt / uTau);
        slow = slow * k + uTail * y * (1.0 - k);
        outColor = vec4(y + slow, slow, 0.0, 1.0);
      }`, {
      ...sigU, uTube: tubeU, uN: nU, uScreen: screenU,
      tHalo: { value: null }, tGain: { value: null }, tPrev: { value: null }, uCells: { value: new THREE.Vector2() },
      uFrame: { value: 0 }, uKq: { value: 1 }, uDt: { value: 0.016 }, uTau: { value: 0.12 }, uTail: { value: 0.05 }, uPower: { value: 0 },
      uScint: { value: 0.00008 }, uEbi: { value: 0.1 }, uDist: { value: -0.035 }, uSoft: { value: 0.7 },
    });

    // Eyepiece: phosphor colour, rim, vignette, eye position, lateral colour.
    this.mOut = mat(/* glsl */`
      ${TUBES}
      ${HASH}
      uniform sampler2D tTube, tGain;
      uniform vec2 uCellTexel, uPupil;
      uniform float uPhos, uTime, uFrame, uFlick;
      in vec2 vUv;

      float lum(vec2 uv, float d) {
        // The eyepiece softens toward the rim.
        // Eight taps on a ring keep the blur round at every radius.
        vec2 o = uCellTexel * (0.6 + 1.6 * d * d * d * d);
        float s = 0.3 * texture(tTube, uv).r;
        for (int k = 0; k < 8; k++) {
          float a = float(k) * 0.785398 + 0.39;
          s += 0.0875 * texture(tTube, uv + vec2(cos(a), sin(a)) * o).r;
        }
        return s;
      }
      // Phosphor colours from CIE 1931 chromaticity, in linear sRGB.
      // P43 (Gd2O2S:Tb) sits at x 0.333, y 0.556; P45 (Y2O2S:Tb) near x 0.29, y 0.31.
      vec3 xyRGB(vec2 xy) {
        vec3 X = vec3(xy.x / xy.y, 1.0, (1.0 - xy.x - xy.y) / xy.y);
        return mat3(3.2406, -0.9689, 0.0557, -1.5372, 1.8758, -0.2040, -0.4986, 0.0415, 1.0570) * X;
      }
      vec3 phos(float L) {
        vec3 c = xyRGB(mix(vec2(0.333, 0.556), vec2(0.29, 0.31), uPhos));
        c = max(c, 0.0);
        c /= max(c.r, max(c.g, c.b));
        // The eye adapts to a uniform green field and sees it less saturated.
        c = mix(c, vec3(1.0), 0.16);
        c /= dot(c, vec3(0.2126, 0.7152, 0.0722));
        vec3 col = L * c;
        // Past the display gamut, a bright screen reads paler to the eye.
        float m = max(col.r, max(col.g, col.b));
        return min(mix(col, vec3(L), smoothstep(0.75, 1.5, m)), vec3(1.0));
      }
      void main() {
        vec2 p = vUv * uScreen;
        vec3 col = vec3(0.0);
        float spill = 0.0;
        for (int i = 0; i < 4; i++) {
          if (i >= uN) break;
          vec4 T = uTube[i];
          vec2 q = (p - T.xy) / T.z;
          float d = length(q);
          float aa = 1.5 / T.z;
          float m = smoothstep(1.0, 1.0 - aa, d);
          // Light scatters onto the eyecup just past the rim.
          spill = max(spill, exp(-max(d - 1.0, 0.0) * 140.0) * step(1.0, d));
          if (m <= 0.0) continue;
          // Lateral colour splits the rim into warm and cool fringes.
          float ca = 0.006 * d * d;
          vec2 c = T.xy / uScreen;
          vec2 uv = vUv;
          float Lr = lum(c + (uv - c) * (1.0 + ca), d);
          float Lg = lum(uv, d);
          float Lb = lum(c + (uv - c) * (1.0 - ca), d);
          float over = texelFetch(tGain, ivec2(i, 0), 0).g;
          // Only a true overload makes the protection circuit pulse.
          float fl = 1.0 - uFlick * smoothstep(40.0, 120.0, over) * (0.06 + 0.06 * sin(uTime * 9.0 + float(i)));
          vec3 L = 1.0 - exp(-vec3(Lr, Lg, Lb) * fl);
          vec3 cc = vec3(phos(L.r).r, phos(L.g).g, phos(L.b).b);
          // Eyepiece vignette, and a dark crescent where the eye sits off axis.
          float vig = 1.0 - 0.5 * pow(d, 2.6);
          float cres = smoothstep(0.62, 1.0, d) * clamp(0.5 + 2.4 * dot(q, uPupil), 0.0, 1.0);
          vig *= 1.0 - 0.75 * cres;
          col = max(col, cc * vig * m);
        }
        // The eyecup catches a faint ring of tube light.
        col += vec3(0.0015, 0.005, 0.0015) * mix(vec3(1.0), vec3(1.6, 1.0, 2.0), uPhos) * spill;
        // Out-of-focus dust on the eyepiece lens.
        for (int k = 0; k < 4; k++) {
          vec2 dp = vec2(h2(vec2(k, 2), 5.0), h2(vec2(k, 4), 6.0)) * uScreen;
          col *= 1.0 - 0.06 * smoothstep(26.0, 6.0, length(p - dp));
        }
        col = mix(12.92 * col, 1.055 * pow(col, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, col));
        uint s = pcg(uint(gl_FragCoord.x) + pcg(uint(gl_FragCoord.y) + pcg(uint(uFrame))));
        col += (rnd(s) - 0.5) / 255.0;
        outColor = vec4(col, 1.0);
      }`, {
      uTube: tubeU, uN: nU, uScreen: screenU,
      tTube: { value: null }, tGain: { value: null }, uCellTexel: { value: new THREE.Vector2() }, uPupil: { value: new THREE.Vector2() },
      uPhos: { value: 0 }, uTime: { value: 0 }, uFrame: { value: 0 }, uFlick: { value: 1 },
    });

    this.gain = [rt(4, 1, { filter: THREE.NearestFilter }), rt(4, 1, { filter: THREE.NearestFilter })];
    this.frame = 0;
  }

  // Sizes: css is the stage, sceneScale and cellPx set the internal grids.
  resize(cssW, cssH, sceneScale, cellPx, samples) {
    const sw = Math.max(8, Math.round(cssW * sceneScale)), sh = Math.max(8, Math.round(cssH * sceneScale));
    this.sceneRT?.depthTexture?.dispose();
    this.sceneRT?.dispose();
    this.dofRT?.dispose();
    const dt = new THREE.DepthTexture(sw, sh);
    dt.type = THREE.FloatType;
    this.sceneRT = rt(sw, sh, { depth: true, samples, depthTexture: dt });
    this.dofRT = rt(sw, sh);
    this.sceneScale = sceneScale;
    const hw = Math.ceil(sw / 2), hh = Math.ceil(sh / 2);
    const w8 = Math.ceil(hw / 4), h8 = Math.ceil(hh / 4), w32 = Math.ceil(w8 / 4), h32 = Math.ceil(h8 / 4);
    [this.half, this.d8, this.d32, this.halo].forEach(t => t?.dispose());
    this.half = rt(hw, hh); this.d8 = rt(w8, h8); this.d32 = rt(w32, h32); this.halo = rt(hw, hh);
    const cw = Math.max(8, Math.round(cssW / cellPx)), ch = Math.max(8, Math.round(cssH / cellPx));
    this.tube?.forEach(t => t.dispose());
    this.tube = [rt(cw, ch), rt(cw, ch)];
    this.u.screenU.value.set(cssW, cssH);
    this.mTube.uniforms.uCells.value.set(cw, ch);
    this.mOut.uniforms.uCellTexel.value.set(1 / cw, 1 / ch);
    this.sigU.tScene.value = this.dofRT.texture;
    this.cssW = cssW; this.cssH = cssH;
  }

  setTubes(list) {
    this.u.nU.value = list.length;
    list.forEach((t, i) => this.u.tubeU.value[i].set(t.x, t.y, t.r, t.trim));
    // The halo disc is a fixed fraction of the tube.
    const r = list[0].r * 0.055;
    this.mHalo.uniforms.uDisc.value.set(r / this.cssW, r / this.cssH);
  }

  // Focus at a distance in metres; Infinity is the far stop.
  // The aperture is 21.7 mm; blur radius is aperture times dioptre error.
  setFocus(dist, focalPx) {
    const u = this.mDof.uniforms;
    u.uFocusInv.value = Number.isFinite(dist) ? 1 / dist : 0;
    u.uAper.value = 0.0217 * focalPx * this.sceneScale * 0.5;
    u.uMaxR.value = 16 * this.sceneScale;
  }

  // Scene distance under a CSS point, from the depth of field target.
  depthAt(x, y) {
    const b = new Uint16Array(4);
    const px = Math.floor(x / this.cssW * this.dofRT.width), py = Math.floor((1 - y / this.cssH) * this.dofRT.height);
    this.r.readRenderTargetPixels(this.dofRT, px, py, 1, 1, b);
    return THREE.DataUtils.fromHalfFloat(b[3]);
  }

  // Signal and distance under a CSS point, for QA.
  probe(x, y) {
    const b = new Uint16Array(4);
    const px = Math.floor(x / this.cssW * this.dofRT.width), py = Math.floor((1 - y / this.cssH) * this.dofRT.height);
    this.r.readRenderTargetPixels(this.dofRT, px, py, 1, 1, b);
    return [THREE.DataUtils.fromHalfFloat(b[0]), THREE.DataUtils.fromHalfFloat(b[3])].map(v => +v.toFixed(2));
  }

  // Cold tubes: clear decay and gain state.
  cold() {
    const r = this.r, prev = r.getRenderTarget();
    [...this.gain, ...this.tube].forEach(t => { r.setRenderTarget(t); r.setClearColor(0x000000, 0); r.clear(); });
    r.setRenderTarget(prev);
  }

  pass(m, target) {
    this.quad.material = m;
    this.r.setRenderTarget(target);
    this.r.render(this.scene, this.cam);
  }

  // One frame: scene, then the tube chain, then the eyepiece to screen.
  render(world, camera, dt, t, pre) {
    const r = this.r;
    this.frame++;
    if (!this.sigU.uCam.value) {
      pre?.(r, camera, this.sceneRT);
      r.setRenderTarget(this.sceneRT);
      r.setClearColor(0x000000, 1);
      r.clear();
      r.render(world, camera);
      const du = this.mDof.uniforms;
      du.tColor.value = this.sceneRT.texture; du.tDepth.value = this.sceneRT.depthTexture;
      du.uTexel.value.set(1 / this.sceneRT.width, 1 / this.sceneRT.height);
      du.uNear.value = camera.near; du.uFar.value = camera.far;
      this.pass(this.mDof, this.dofRT);
    }
    this.pass(this.mHalf, this.half);
    const dn = this.mDown.uniforms;
    dn.tSrc.value = this.half.texture; dn.uTexel.value.set(1 / this.half.width, 1 / this.half.height);
    this.pass(this.mDown, this.d8);
    dn.tSrc.value = this.d8.texture; dn.uTexel.value.set(1 / this.d8.width, 1 / this.d8.height);
    this.pass(this.mDown, this.d32);

    const hu = this.mHalo.uniforms;
    hu.tHalf.value = this.half.texture; hu.tWide.value = this.d8.texture;
    hu.uWideTexel.value.set(1 / this.d8.width, 1 / this.d8.height);
    hu.tWider.value = this.d32.texture;
    hu.uWiderTexel.value.set(1 / this.d32.width, 1 / this.d32.height);
    hu.uFrame.value = this.frame % 64;
    this.pass(this.mHalo, this.halo);

    const [g0, g1] = this.gain;
    const gu = this.mGain.uniforms;
    gu.tLum.value = this.d32.texture; gu.tPrev.value = g0.texture; gu.uDt.value = dt;
    this.pass(this.mGain, g1);
    this.gain = [g1, g0];

    const [p0, p1] = this.tube;
    const tu = this.mTube.uniforms;
    tu.tHalo.value = this.halo.texture; tu.tGain.value = g1.texture; tu.tPrev.value = p0.texture;
    tu.uFrame.value = this.frame; tu.uDt.value = dt;
    this.pass(this.mTube, p1);
    this.tube = [p1, p0];

    const ou = this.mOut.uniforms;
    ou.tTube.value = p1.texture; ou.tGain.value = g1.texture; ou.uTime.value = t; ou.uFrame.value = this.frame;
    this.pass(this.mOut, null);
  }
}
