import * as THREE from 'three';

// Minimalist backlit gallery backdrop with true analytical 85mm optical lens bokeh.

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

uniform float uTime;
uniform float uAspect;
uniform vec2 uSunUv;
uniform float uInspect;

varying vec2 vUv;

float ign(vec2 fc) {
  return fract(52.9829189 * fract(dot(fc, vec2(0.06711056, 0.00583715))));
}

// Analytical cinema-lens bokeh PSF: creamy soft fill, gentle aperture rim, subtle chromatic edge.
vec3 bokehOrb(vec2 q, vec2 center, float radius, float softness, vec3 tint, float power) {
  vec2 d = q - center;
  float r = length(d) / radius;
  if (r > 1.35) return vec3(0.0);

  // Subtle longitudinal chromatic dispersion splits warm outer rim from cool inner core.
  float rR = r * 0.985;
  float rG = r;
  float rB = r * 1.018;

  float fillR = 1.0 - smoothstep(1.0 - softness, 1.0 + softness * 0.45, rR);
  float fillG = 1.0 - smoothstep(1.0 - softness, 1.0 + softness * 0.45, rG);
  float fillB = 1.0 - smoothstep(1.0 - softness, 1.0 + softness * 0.45, rB);

  // Gentle spherical-aberration edge bloom (not a hard ring).
  float rimD = abs(r - (0.86 - softness * 0.15)) / max(0.08, softness * 0.55);
  float rim = exp(-(rimD * rimD));
  vec3 psf = vec3(fillR, fillG, fillB) * 0.72 + vec3(rim * 0.36);

  // Smooth Gaussian attenuation avoids flat cutout discs.
  float falloff = exp(-r * r * 0.55);
  return tint * psf * falloff * power;
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float ax = max(0.65, uAspect);
  vec2 q = vec2(p.x * ax, p.y);
  vec2 lightPos = vec2(uSunUv.x * ax, uSunUv.y);

  // Quiet, velvety charcoal-espresso to deep slate studio gradient.
  vec3 topCol = vec3(0.017, 0.019, 0.028);
  vec3 midCol = vec3(0.030, 0.029, 0.038);
  vec3 botCol = vec3(0.020, 0.019, 0.026);

  float vMix = clamp(p.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 col = mix(botCol, midCol, smoothstep(0.0, 0.52, vMix));
  col = mix(col, topCol, smoothstep(0.52, 1.0, vMix));

  // Soft diffused backlit studio scrim pours warm amber-ivory light from behind the notes.
  vec2 dl = (q - lightPos) * vec2(0.76, 0.90);
  float d2 = dot(dl, dl);
  col += vec3(0.095, 0.078, 0.062) * exp(-d2 * 0.85) * (1.0 - uInspect * 0.22);
  col += vec3(0.115, 0.092, 0.070) * exp(-d2 * 2.8) * (1.0 - uInspect * 0.28);

  // Subtle cool architectural edge bounce on the far right balances the warm scrim.
  vec2 dc = (q - vec2(0.88 * ax, -0.32)) * vec2(0.68, 0.82);
  col += vec3(0.014, 0.022, 0.036) * exp(-dot(dc, dc) * 1.3);

  // Curated optical lens bokeh: slow, soft, multi-depth defocused studio light pools.
  float t = uTime * 0.14;
  float bScale = 1.0 - uInspect * 0.30;

  // Deep background ultra-soft washes (very large, barely-there light atmosphere).
  col += bokehOrb(q, vec2(-0.62 * ax + sin(t * 0.7) * 0.08,  0.34 + cos(t * 0.5) * 0.06), 0.44, 0.65, vec3(0.95, 0.76, 0.54), 0.048 * bScale);
  col += bokehOrb(q, vec2( 0.54 * ax + cos(t * 0.6) * 0.09,  0.22 + sin(t * 0.4) * 0.07), 0.52, 0.72, vec3(0.56, 0.66, 0.86), 0.036 * bScale);
  col += bokehOrb(q, vec2( 0.12 * ax + sin(t * 0.5) * 0.07, -0.44 + cos(t * 0.6) * 0.06), 0.48, 0.68, vec3(0.92, 0.68, 0.58), 0.038 * bScale);

  // Mid-depth creamy 85mm bokeh discs with subtle optical aperture bloom.
  col += bokehOrb(q, vec2(-0.34 * ax + sin(t * 0.9 + 1.1) * 0.07,  0.48 + cos(t * 0.7 + 0.4) * 0.05), 0.19, 0.26, vec3(1.00, 0.84, 0.62), 0.062 * bScale);
  col += bokehOrb(q, vec2( 0.38 * ax + cos(t * 0.8 + 2.3) * 0.08,  0.42 + sin(t * 0.6 + 1.2) * 0.06), 0.16, 0.24, vec3(0.96, 0.82, 0.66), 0.054 * bScale);
  col += bokehOrb(q, vec2(-0.74 * ax + sin(t * 0.6 + 3.5) * 0.06, -0.18 + cos(t * 0.8 + 2.1) * 0.06), 0.22, 0.30, vec3(0.68, 0.76, 0.94), 0.042 * bScale);
  col += bokehOrb(q, vec2( 0.68 * ax + cos(t * 0.7 + 4.2) * 0.07, -0.26 + sin(t * 0.5 + 3.0) * 0.05), 0.21, 0.28, vec3(0.98, 0.78, 0.58), 0.050 * bScale);
  col += bokehOrb(q, vec2(-0.08 * ax + sin(t * 0.8 + 5.1) * 0.06, -0.62 + cos(t * 0.6 + 4.4) * 0.04), 0.17, 0.25, vec3(0.94, 0.80, 0.64), 0.046 * bScale);

  // Smaller crisp-edged distant specular bokeh accents (restrained, low-key).
  col += bokehOrb(q, vec2(-0.48 * ax + cos(t * 1.1 + 0.8) * 0.05,  0.14 + sin(t * 0.9 + 1.7) * 0.05), 0.085, 0.16, vec3(1.00, 0.88, 0.70), 0.068 * bScale);
  col += bokehOrb(q, vec2( 0.26 * ax + sin(t * 1.0 + 2.7) * 0.05, -0.08 + cos(t * 0.8 + 0.9) * 0.05), 0.075, 0.15, vec3(0.98, 0.86, 0.68), 0.058 * bScale);
  col += bokehOrb(q, vec2( 0.58 * ax + cos(t * 0.9 + 4.8) * 0.05,  0.58 + sin(t * 1.1 + 2.2) * 0.04), 0.095, 0.18, vec3(0.76, 0.84, 0.98), 0.048 * bScale);
  col += bokehOrb(q, vec2(-0.22 * ax + sin(t * 1.2 + 3.9) * 0.05, -0.34 + cos(t * 0.9 + 3.1) * 0.05), 0.068, 0.15, vec3(1.00, 0.82, 0.64), 0.054 * bScale);

  // Quiet editorial vignette frames the backlit center.
  float vig = 1.0 - smoothstep(0.42, 1.52, length(p * vec2(0.90, 0.94)));
  col *= 0.54 + 0.46 * vig;

  // sRGB encode plus delicate medium-format micro-grain to eliminate gradient banding.
  col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2));
  float grain = (ign(gl_FragCoord.xy) - 0.5) * 0.014;
  col = clamp(col + grain, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
`;

export class StudioStage {
  readonly group = new THREE.Group();
  private wallGeo: THREE.PlaneGeometry;
  private wallMat: THREE.ShaderMaterial;

  constructor() {
    this.wallGeo = new THREE.PlaneGeometry(2, 2, 1, 1);
    this.wallMat = new THREE.ShaderMaterial({
      vertexShader: BACKDROP_VERT,
      fragmentShader: BACKDROP_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uAspect: { value: 16 / 9 },
        uSunUv: { value: new THREE.Vector2(-0.10, 0.16) },
        uInspect: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });
    const wall = new THREE.Mesh(this.wallGeo, this.wallMat);
    wall.frustumCulled = false;
    wall.renderOrder = -1000;
    this.group.add(wall);
  }

  update(
    time: number,
    backDir: THREE.Vector3,
    inspectMix: number,
    _dpr: number,
    aspect: number,
    reduced: boolean,
  ) {
    this.wallMat.uniforms.uTime.value = reduced ? 0 : time;
    this.wallMat.uniforms.uAspect.value = aspect;
    (this.wallMat.uniforms.uSunUv.value as THREE.Vector2).set(backDir.x * 1.0, backDir.y * 0.9);
    this.wallMat.uniforms.uInspect.value = inspectMix;
  }

  dispose() {
    this.wallGeo.dispose();
    this.wallMat.dispose();
  }
}
