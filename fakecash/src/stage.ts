import * as THREE from 'three';

// Whimsical backlit sunlit sky: cobalt zenith, coral horizon, golden sunbeams, clouds, and guilloche.

const BACKDROP_VERT = /* glsl */ `
precision highp float;
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.9999, 1.0);
}
`;

const BACKDROP_FRAG = /* glsl */ `
precision highp float;

const float PI = 3.14159265359;

uniform float uTime;
uniform float uAspect;
uniform vec2 uSunUv;
uniform float uInspect;

varying vec2 vUv;

float ign(vec2 fc) {
  return fract(52.9829189 * fract(dot(fc, vec2(0.06711056, 0.00583715))));
}

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.52;
  mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = rot * p * 2.02 + vec2(13.7, 29.3);
    a *= 0.5;
  }
  return v;
}

// Sculpted puffy storybook cumulus silhouette built from overlapping rounded lobes.
float puffRidge(float x, float freq, float drift, float seed) {
  float t = x * freq + uTime * drift + seed;
  float base = sin(t) * 0.11 + sin(t * 2.13 + 1.4) * 0.065 + sin(t * 3.7 + 2.7) * 0.032;
  float puffs = abs(sin(t * 1.65 + 0.5)) * 0.12 + abs(sin(t * 3.1 - 0.8)) * 0.055;
  return base + puffs;
}

// Delicate engraved banknote spirograph rosette floating in the sunlit sky.
float guillocheRing(vec2 q, float baseR, float amp, float petals, float spin, float width) {
  float r = length(q);
  float a = atan(q.y, q.x) + spin;
  float wave = baseR + amp * sin(a * petals) + amp * 0.45 * cos(a * (petals * 2.0 - 3.0) - spin * 1.5);
  float d = abs(r - wave);
  return 1.0 - smoothstep(width * 0.15, width, d);
}

// Stylized floating cloud puff SDF for whimsical mid-sky drifters.
vec2 driftingCloud(vec2 q, vec2 center, float sc) {
  vec2 d = (q - center) / sc;
  float c0 = length(d - vec2(0.0, 0.02)) - 0.24;
  float c1 = length(d - vec2(-0.22, -0.05)) - 0.17;
  float c2 = length(d - vec2(0.23, -0.04)) - 0.18;
  float c3 = length(d - vec2(-0.08, 0.10)) - 0.16;
  float c4 = length(d - vec2(0.11, 0.09)) - 0.15;
  float sdf = min(min(min(c0, c1), min(c2, c3)), c4);
  // Flat soft storybook cloud base.
  sdf = max(sdf, -(d.y + 0.14));
  float body = 1.0 - smoothstep(-0.02, 0.045, sdf);
  float rim = (1.0 - smoothstep(0.0, 0.075, abs(sdf))) * smoothstep(-0.12, 0.18, d.y);
  return vec2(body, rim);
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float ax = max(0.65, uAspect);
  vec2 q = vec2(p.x * ax, p.y);
  vec2 sun = vec2(uSunUv.x * ax, uSunUv.y);

  vec2 toSun = q - sun;
  float distSun = length(toSun);
  float ang = atan(toSun.y, toSun.x);

  // Vibrant painterly sky: deep royal cobalt zenith -> periwinkle -> warm coral-apricot horizon.
  vec3 colZenith = vec3(0.042, 0.088, 0.34);
  vec3 colMid    = vec3(0.14, 0.24, 0.56);
  vec3 colCoral  = vec3(0.76, 0.30, 0.36);
  vec3 colGold   = vec3(1.12, 0.68, 0.28);

  float hGrad = clamp(p.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 sky = mix(colCoral, colMid, smoothstep(0.12, 0.64, hGrad));
  sky = mix(sky, colZenith, smoothstep(0.54, 1.0, hGrad));
  // Warm golden-apricot atmospheric glow sweeping across the middle horizon.
  sky = mix(sky, colGold, exp(-pow((p.y - 0.06) * 2.0, 2.0)) * 0.36);

  // Subtle whimsical mint-aqua sky ribbon arcing across the upper right.
  float arc = exp(-pow((p.y - 0.42 - sin(p.x * 1.9 + uTime * 0.14) * 0.14) * 3.4, 2.0));
  sky += vec3(0.05, 0.32, 0.36) * arc * smoothstep(-0.35, 0.85, p.x) * 0.55;

  // Radiant incandescent sun disc and warm backlit bloom right behind the falling bills.
  float sunDisc = 1.0 - smoothstep(0.14, 0.30, distSun);
  float sunCore = exp(-distSun * distSun * 4.2);
  float sunHalo = exp(-distSun * 1.38);
  float prismRing = exp(-pow((distSun - 0.54) * 13.0, 2.0));
  vec3 ringCol = 0.55 + 0.45 * cos(6.28318 * (ang * 0.16 + vec3(0.0, 0.33, 0.67)));

  // Sweeping golden volumetric god-rays pouring outward from the sun.
  float rayA = pow(0.5 + 0.5 * sin(ang * 10.0 + uTime * 0.12), 2.6);
  float rayB = pow(0.5 + 0.5 * sin(ang * 17.0 - uTime * 0.09 + 1.1), 3.4);
  float rays = (rayA * 0.65 + rayB * 0.35) * exp(-distSun * 0.92) * smoothstep(0.06, 0.34, distSun);

  vec3 col = sky
    + vec3(1.05, 0.56, 0.32) * sunHalo * 0.68
    + vec3(1.45, 1.12, 0.62) * sunCore * 1.10
    + vec3(1.75, 1.56, 1.12) * sunDisc * 0.85
    + vec3(1.22, 0.92, 0.48) * rays * 0.38
    + ringCol * prismRing * 0.24;

  // Giant golden-ink banknote guilloche rosettes revolving gently around the backlit sun.
  vec2 gq = q - sun;
  float g1 = guillocheRing(gq, 0.42, 0.036, 12.0, uTime * 0.065, 0.009);
  float g2 = guillocheRing(gq, 0.72, 0.055, 16.0, -uTime * 0.042, 0.0085);
  float g3 = guillocheRing(gq, 1.08, 0.048, 22.0, uTime * 0.028, 0.008);
  float gFade = 1.0 - smoothstep(0.45, 1.75, length(gq));
  col += vec3(1.25, 1.02, 0.58) * (g1 * 0.26 + g2 * 0.19) * gFade;
  col += vec3(0.65, 0.98, 1.08) * g3 * 0.15 * gFade;

  // Fine compass clock-ticks around the middle rosette.
  float rG = length(gq);
  float aG = atan(gq.y, gq.x) + uTime * 0.025;
  float ticks = (1.0 - smoothstep(0.002, 0.012, abs(rG - 0.57))) * smoothstep(0.84, 0.96, cos(aG * 48.0));
  col += vec3(1.2, 1.05, 0.72) * ticks * 0.20;

  // Whimsical drifting storybook clouds floating in the upper-mid sky with golden rim light.
  float c1x = mod(uTime * 0.045 + 0.7, 3.6) - 1.8;
  vec2 puff1 = driftingCloud(q, vec2(c1x, 0.38), 0.78);
  float sunP1 = exp(-length(vec2(c1x, 0.38) - sun) * 0.9);
  vec3 p1Body = mix(vec3(0.28, 0.28, 0.54), vec3(0.86, 0.56, 0.54), sunP1 * 0.65);
  col = mix(col, p1Body, puff1.x * 0.72);
  col += vec3(1.4, 1.08, 0.68) * puff1.y * (0.45 + 0.55 * sunP1);

  float c2x = mod(uTime * 0.032 + 2.4, 3.8) - 1.9;
  vec2 puff2 = driftingCloud(q, vec2(c2x, 0.54), 0.58);
  float sunP2 = exp(-length(vec2(c2x, 0.54) - sun) * 0.9);
  vec3 p2Body = mix(vec3(0.22, 0.24, 0.48), vec3(0.76, 0.48, 0.56), sunP2 * 0.6);
  col = mix(col, p2Body, puff2.x * 0.65);
  col += vec3(1.35, 1.02, 0.66) * puff2.y * (0.42 + 0.52 * sunP2);

  // Far billowing sunset cloudbank across the lower horizon.
  float rFar = -0.34 + puffRidge(p.x, 2.2, 0.035, 1.2) + (fbm(vec2(p.x * 2.8 + uTime * 0.025, 1.5)) - 0.5) * 0.14;
  float farBody = 1.0 - smoothstep(rFar - 0.06, rFar + 0.04, p.y);
  float farRim = (1.0 - smoothstep(0.0, 0.09, abs(p.y - rFar))) * smoothstep(-0.15, 0.55, exp(-distSun * 0.6));
  float sunAlign = exp(-distSun * 0.75);
  vec3 farShade = mix(vec3(0.24, 0.16, 0.42), vec3(0.58, 0.28, 0.44), sunAlign * 0.7);
  col = mix(col, farShade, farBody * 0.82);
  col += vec3(1.38, 0.88, 0.46) * farRim * (0.48 + 0.62 * sunAlign);

  // Foreground velvety indigo-violet cumulus puffs with bright honey-gold silver linings.
  float rNear = -0.62 + puffRidge(p.x, 2.9, 0.055, 5.4) + (fbm(vec2(p.x * 3.6 + uTime * 0.04, 4.2)) - 0.5) * 0.11;
  float nearBody = 1.0 - smoothstep(rNear - 0.045, rNear + 0.035, p.y);
  float nearRim = 1.0 - smoothstep(0.0, 0.075, abs(p.y - rNear));
  vec3 nearShade = mix(vec3(0.095, 0.088, 0.24), vec3(0.26, 0.14, 0.34), sunAlign * 0.65);
  col = mix(col, nearShade, nearBody * 0.92);
  col += vec3(1.48, 1.04, 0.54) * nearRim * (0.52 + 0.65 * sunAlign);

  // Twinkling storybook stars in the deep royal-cobalt upper corners.
  vec2 starCell = floor((q + vec2(4.0)) * 26.0);
  vec2 starF = fract((q + vec2(4.0)) * 26.0) - 0.5;
  float sRnd = hash21(starCell);
  if (sRnd > 0.958) {
    float twinkle = 0.45 + 0.55 * sin(uTime * 2.1 + sRnd * 90.0);
    // Tiny four-point diamond sparkle.
    float dStar = abs(starF.x) + abs(starF.y);
    float star = (1.0 - smoothstep(0.02, 0.26, dStar)) * twinkle * smoothstep(0.05, 0.78, p.y) * (1.0 - farBody);
    col += vec3(1.2, 1.12, 0.88) * star * 0.78;
  }

  // Soft edge framing keeps Bar v3 corners legible while keeping full vibrant sky chroma.
  float vig = 1.0 - smoothstep(0.55, 1.62, length(p * vec2(0.88, 0.92)));
  col *= mix(0.68, 0.56, uInspect) + mix(0.32, 0.44, uInspect) * vig;

  // Saturated filmic shoulder preserves rich sky hues instead of washing to grey.
  col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
  col = clamp(col, 0.0, 1.0);
  col = pow(col, vec3(1.0 / 2.2));
  col += (ign(gl_FragCoord.xy) - 0.5) / 255.0;

  gl_FragColor = vec4(col, 1.0);
}
`;

const MOTES_VERT = /* glsl */ `
precision highp float;

attribute float aSize;
attribute float aPhase;
attribute float aKind;

uniform float uTime;
uniform float uPixelRatio;

varying float vAlpha;
varying float vKind;
varying float vPhase;

void main() {
  vec3 p = position;
  float rise = mod(p.y + uTime * (0.14 + 0.09 * aKind) + 4.4, 8.8) - 4.4;
  p.y = rise;
  p.x += sin(uTime * 0.36 + aPhase) * 0.36;
  p.z += cos(uTime * 0.28 + aPhase * 1.3) * 0.24;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float twinkle = 0.5 + 0.5 * sin(uTime * 1.5 + aPhase * 3.1);
  vAlpha = mix(0.44, 0.38, aKind) * (0.55 + 0.45 * twinkle);
  vKind = aKind;
  vPhase = aPhase + uTime * 0.4;

  gl_PointSize = aSize * uPixelRatio * (11.5 / max(1.2, -mv.z));
}
`;

const MOTES_FRAG = /* glsl */ `
precision highp float;

varying float vAlpha;
varying float vKind;
varying float vPhase;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  if (r > 1.0) discard;

  // Kind 0: golden sun-sparkles. Kind 1: whimsical iridescent soap bubbles.
  float spark = pow(1.0 - r, 2.2) + 0.45 * exp(-abs(c.x) * 24.0 - abs(c.y) * 5.0) + 0.45 * exp(-abs(c.y) * 24.0 - abs(c.x) * 5.0);
  float ring = smoothstep(0.62, 0.88, r) * (1.0 - smoothstep(0.88, 1.0, r));
  float specDot = exp(-dot(c - vec2(-0.18, -0.18), c - vec2(-0.18, -0.18)) * 38.0);
  float bubble = ring * 0.92 + specDot * 0.85 + pow(1.0 - r, 3.0) * 0.14;

  vec3 gold = vec3(1.0, 0.90, 0.58);
  vec3 irid = 0.58 + 0.42 * cos(6.28318 * (atan(c.y, c.x) * 0.16 + vPhase * 0.12 + vec3(0.0, 0.33, 0.67)));
  vec3 col = mix(gold, irid, step(0.5, vKind));
  float shape = mix(clamp(spark, 0.0, 1.0), clamp(bubble, 0.0, 1.0), step(0.5, vKind));

  gl_FragColor = vec4(col, shape * vAlpha);
}
`;

export class StudioStage {
  readonly group = new THREE.Group();
  private wallGeo: THREE.PlaneGeometry;
  private wallMat: THREE.ShaderMaterial;
  private dustGeo: THREE.BufferGeometry;
  private dustMat: THREE.ShaderMaterial;
  private dustPoints: THREE.Points;

  constructor() {
    this.wallGeo = new THREE.PlaneGeometry(2, 2, 1, 1);
    this.wallMat = new THREE.ShaderMaterial({
      vertexShader: BACKDROP_VERT,
      fragmentShader: BACKDROP_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uAspect: { value: 16 / 9 },
        uSunUv: { value: new THREE.Vector2(-0.08, 0.22) },
        uInspect: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });
    const wall = new THREE.Mesh(this.wallGeo, this.wallMat);
    wall.frustumCulled = false;
    wall.renderOrder = -1000;
    this.group.add(wall);

    const count = 96;
    const pos = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const kinds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const isBubble = i % 3 === 0 ? 1 : 0;
      pos[i * 3] = (Math.random() - 0.5) * 13.6;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8.4;
      pos[i * 3 + 2] = -7.4 + Math.random() * 6.0;
      sizes[i] = isBubble ? (6.5 + Math.random() * 11.0) : (2.0 + Math.random() * 3.4);
      phases[i] = Math.random() * Math.PI * 2;
      kinds[i] = isBubble;
    }
    this.dustGeo = new THREE.BufferGeometry();
    this.dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dustGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.dustGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    this.dustGeo.setAttribute('aKind', new THREE.BufferAttribute(kinds, 1));

    this.dustMat = new THREE.ShaderMaterial({
      vertexShader: MOTES_VERT,
      fragmentShader: MOTES_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.dustPoints = new THREE.Points(this.dustGeo, this.dustMat);
    this.dustPoints.renderOrder = -500;
    this.group.add(this.dustPoints);
  }

  update(
    time: number,
    backDir: THREE.Vector3,
    inspectMix: number,
    dpr: number,
    aspect: number,
    reduced: boolean,
  ) {
    this.wallMat.uniforms.uTime.value = reduced ? 0 : time;
    this.wallMat.uniforms.uAspect.value = aspect;
    (this.wallMat.uniforms.uSunUv.value as THREE.Vector2).set(backDir.x * 1.1, backDir.y * 1.0);
    this.wallMat.uniforms.uInspect.value = inspectMix;
    this.dustMat.uniforms.uTime.value = reduced ? 0 : time;
    this.dustMat.uniforms.uPixelRatio.value = dpr;
    this.dustPoints.visible = !reduced;
  }

  dispose() {
    this.wallGeo.dispose();
    this.wallMat.dispose();
    this.dustGeo.dispose();
    this.dustMat.dispose();
  }
}
