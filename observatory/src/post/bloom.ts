// Load order: sky/haze runs first.
import '../sky/haze.ts';
// Copied from railgun/src/post/bloom.ts.
// The ladder rung is trimmed.
import { CanvasTexture, NoColorSpace, Vector2 } from 'three';
import type { IUniform } from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { quality } from '../../../shared/stim.js';
import { renderer } from '../setup.ts';

/* ---------- bloom ---------- */
// Bloom on a float target.
// Only bright sources cross the threshold.
// A seeded generator keeps the lens dirt the same on every load.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Lens dirt, drawn once: soft smudges, fine specks, a few hairs.
function makeDirt() {
  const rnd = rng(7);
  const c = document.createElement('canvas'), x = c.getContext('2d')!;
  c.width = 512; c.height = 320;
  x.fillStyle = '#000'; x.fillRect(0, 0, 512, 320);
  for (let i = 0; i < 46; i++) {
    const px = rnd() * 512, py = rnd() * 320, r = 12 + rnd() * 60, g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, `rgba(255,255,255,${0.04 + rnd() * 0.12})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
  }
  for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(255,255,255,${0.1 + rnd() * 0.35})`; x.beginPath(); x.arc(rnd() * 512, rnd() * 320, 0.4 + rnd() * 1.4, 0, 7); x.fill(); }
  x.strokeStyle = 'rgba(255,255,255,0.18)'; x.lineWidth = 0.7;
  for (let i = 0; i < 4; i++) { x.beginPath(); const sx = rnd() * 512, sy = rnd() * 320; x.moveTo(sx, sy); x.bezierCurveTo(sx + 40 * rnd(), sy + 30 * rnd(), sx + 60 * rnd(), sy - 20 * rnd(), sx + 90 * rnd(), sy + 10 * rnd()); x.stroke(); }
  const t = new CanvasTexture(c);
  t.colorSpace = NoColorSpace;
  return t;
}
// three types the high pass uniforms as a bare object.
export type Bloom = UnrealBloomPass & { highPassUniforms: { smoothWidth: IUniform<number> } };
export function makeBloom(strength: number, radius: number, threshold: number): Bloom {
  const bloom = new UnrealBloomPass(new Vector2(256, 256), strength, radius, threshold) as Bloom;
  const full = bloom.setSize.bind(bloom);
  // A wide, soft knee: lit stone blooms only a trace.
  // Lamps run far past it and bloom in full.
  bloom.highPassUniforms.smoothWidth.value = 5.0;
  // Full size on High, 0.7 on Standard, half on phones.
  // The composer passes device pixels.
  bloom.setSize = (w, h) => {
    const m = w / renderer.getPixelRatio() < 640 ? 0.5 : quality() === 'high' ? 1 : 0.7;
    full(Math.max(1, w * m), Math.max(1, h * m));
  };
  // A sigma of radius / 2.5 gives each layer a round falloff.
  for (const m of bloom.separableBlurMaterials) {
    const r = m.defines.KERNEL_RADIUS, sg = r / 2.5;
    m.uniforms.gaussianCoefficients.value = Array.from({ length: r }, (_, i) => Math.exp(-0.5 * i * i / (sg * sg)));
  }
  // A cubic B-spline read of each mip keeps the glow round.
  const cm = bloom.compositeMaterial;
  cm.fragmentShader = cm.fragmentShader
    .replace('void main() {', /* glsl */`vec4 bsw(float v) {
      vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v, s = n * n * n;
      float x = s.x, y = s.y - 4.0 * s.x, z = s.z - 4.0 * s.y + 6.0 * s.x;
      return vec4(x, y, z, 6.0 - x - y - z) / 6.0;
    }
    vec4 bic(sampler2D t, vec2 uv) {
      vec2 ts = vec2(textureSize(t, 0)), p = uv * ts - 0.5, fp = fract(p);
      p -= fp;
      vec4 xc = bsw(fp.x), yc = bsw(fp.y);
      vec4 c = p.xxyy + vec2(-0.5, 1.5).xyxy, w = vec4(xc.xz + xc.yw, yc.xz + yc.yw);
      vec4 o = (c + vec4(xc.yw, yc.yw) / w) / ts.xxyy;
      float sx = w.x / (w.x + w.y), sy = w.z / (w.z + w.w);
      return mix(mix(texture2D(t, o.yw), texture2D(t, o.xw), sx), mix(texture2D(t, o.yz), texture2D(t, o.xz), sx), sy);
    }
    void main() {`)
    .replace(/texture2D\(blurTexture([1-5]), vUv\)/g, 'bic(blurTexture$1, vUv)')
    // Lens dirt: smudges and specks light up where the bloom is bright.
    .replace('vec4 bsw(float v) {', 'uniform sampler2D tDirt;\n    uniform float uDirtK;\n    vec4 bsw(float v) {')
    .replace(/\}\s*$/, '  gl_FragColor.rgb *= 1.0 + uDirtK * texture2D(tDirt, vUv).rgb;\n}');
  const dirt = makeDirt();
  cm.uniforms.tDirt = { value: dirt };
  cm.uniforms.uDirtK = { value: 1.6 };
  cm.needsUpdate = true;
  // Halation: the widest blur levels bleed warm red, as on film.
  bloom.bloomTintColors[3].set(1.0, 0.72, 0.55);
  bloom.bloomTintColors[4].set(1.0, 0.55, 0.38);
  // The bloom's dispose also frees the lens dirt.
  const free = bloom.dispose.bind(bloom);
  bloom.dispose = () => { free(); dirt.dispose(); };
  return bloom;
}
