// @ts-nocheck
// Load order: post/chain runs first.
import '../post/chain.ts';
import * as THREE from 'three';
import { Pass } from 'three/addons/postprocessing/Pass.js';
import { reduced } from '../../../shared/stim.js';
import { Tube } from '../../../nvg/tube.js';
import { state } from '../state.ts';
import { camera, clamp, renderer } from '../setup.ts';
import { FALL, barrelPt } from '../world/axis.ts';
import { U } from '../world/uniforms.ts';
import { ast } from '../rock/asteroid.ts';
import { SHIP_AIM_R, ship, shipAim } from '../ship/battleship.ts';
import { composer } from '../post/chain.ts';
import { fallT } from '../play/approach.ts';
import { charge, laserGain } from '../play/charge.ts';
import { lzA, lzB } from '../gun/laser.ts';
import { tgtLead, tgtLive, tgtPos, tgtR, tgtShown } from '../play/shot.ts';
import { aimNow } from '../ship/hit.ts';

/* ---------- sight: Monolith over an image intensifier ---------- */
// The sight runs the finished frame through the NVG toy's tube, white phosphor.
// Its marks and words burn in as negatives through a key (stimming-cido).
const sightFx = { tube: null, out: null, kc: null, kx: null, keyTex: null, keyMat: null, kd: 1, last: 0, size: '' };
export function sightSetup() {
  if (sightFx.tube) { sightSize(); return; }
  const t = sightFx.tube = new Tube(renderer);
  // The frame is the tube's camera signal.
  const su = t.sigU;
  su.uCam.value = 1; su.uMirror.value = 0; su.uCamXf.value.set(1, 1, 0, 0);
  // The NVG toy's defaults: grain, gain and afterglow at their middles.
  const tu = t.mTube.uniforms;
  tu.uPower.value = 1; tu.uScint.value = 0.00008; tu.uKq.value = 0.55;
  tu.uTail.value = 0.057; tu.uTau.value = 0.15;
  t.mGain.uniforms.uGmax.value = 0.022 * Math.pow(14, 0.55);
  t.mOut.uniforms.uPhos.value = 1;
  t.mOut.uniforms.uPupil.value.set(0, -0.06);
  // Tom: no chromatic aberration, no hex in the grain.
  // The sight's own copies of the materials drop the lateral colour and the honeycomb.
  t.mOut.fragmentShader = t.mOut.fragmentShader.replace('float ca = 0.006 * d * d;', 'float ca = 0.0;');
  t.mTube.fragmentShader = t.mTube.fragmentShader
    .replace('float fp = 1.0 + 0.07 * (h2(fib.xy * 4.0, 11.0 + fi) - 0.5);', 'float fp = 1.0;')
    .replace('fp *= 1.0 - 0.14 * smoothstep(0.04, 0.0, mf.z);', '');
  // The tube's last pass draws into a target; the key pass then draws on.
  const pass0 = t.pass.bind(t);
  t.pass = (m, target) => pass0(m, m === t.mOut ? sightFx.out : target);
  sightFx.kc = document.createElement('canvas');
  sightFx.kx = sightFx.kc.getContext('2d');
  sightFx.keyTex = new THREE.CanvasTexture(sightFx.kc);
  sightFx.keyTex.minFilter = THREE.LinearFilter; sightFx.keyTex.generateMipmaps = false; sightFx.keyTex.premultiplyAlpha = true;
  sightFx.keyMat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, depthTest: false, depthWrite: false,
    uniforms: { tImg: { value: null }, tKey: { value: sightFx.keyTex }, uTexel: { value: new THREE.Vector2() }, uNeg: { value: 0.9 } },
    vertexShader: /* glsl */`out vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */`
      out highp vec4 outColor;
      uniform sampler2D tImg, tKey;
      uniform vec2 uTexel;
      uniform float uNeg;
      in vec2 vUv;
      void main() {
        vec3 c = texture(tImg, vUv).rgb;
        vec4 k = texture(tKey, vUv);
        // Green, the soft band: the picture turns to its negative.
        vec3 o = mix(c, 1.0 - c, clamp(k.g, 0.0, 1.0) * uNeg);
        // Red, the core: the far extreme of the light round it.
        // A plain negative vanishes on mid grey; the core never does.
        if (k.r > 0.004) {
          float L = 0.0;
          for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++)
            L += dot(texture(tImg, vUv + vec2(x, y) * uTexel * 3.0).rgb, vec3(0.2126, 0.7152, 0.0722));
          L /= 25.0;
          vec3 far = L < 0.5 ? vec3(0.93, 0.96, 1.0) : vec3(0.02);
          o = mix(o, far, clamp(k.r, 0.0, 1.0));
        }
        // Blue, the burn: the phosphor is worn where the marks sat for years.
        // The picture dims inside them; its own grain shows through.
        // An offset sample lights one edge and shades the other.
        float b = clamp(k.b, 0.0, 1.0);
        if (b > 0.002 || texture(tKey, vUv + uTexel * 2.0).b > 0.002) {
          float e = texture(tKey, vUv + vec2(-1.5, 1.5) * uTexel).b - texture(tKey, vUv + vec2(1.5, -1.5) * uTexel).b;
          float L = dot(c, vec3(0.2126, 0.7152, 0.0722));
          // On a bright picture the burn dims; on a dark one it glows as a ghost.
          vec3 dim = o * (1.0 - 0.5 * b), ghost = o + vec3(0.8, 0.86, 0.95) * 0.42 * b;
          o = mix(dim, ghost, smoothstep(0.32, 0.08, L));
          o += vec3(0.9, 0.95, 1.0) * clamp(e, -1.0, 1.0) * (0.12 + 0.25 * L);
        }
        outColor = vec4(o, 1.0);
      }`,
  });
  sightSize();
}
// The tube and the key follow the stage size and the render scale.
export function sightSize() {
  const f = sightFx;
  if (!f.tube) return;
  const { w, h, dpr } = state.size, key = `${w}x${h}x${dpr}`;
  if (f.size === key) return;
  f.size = key;
  // The tube's grids: the NVG toy's caps, about one CSS pixel per grain cell.
  const s = Math.min(dpr * 0.85, Math.sqrt(1.25e6 / (w * h)));
  f.tube.resize(w, h, s, 1.2, 0);
  f.tube.setTubes([{ x: w / 2, y: h / 2, r: Math.hypot(w, h) / 2 * 1.08, trim: 1 }]);
  f.tube.cold();
  // The tube clears with alpha 0; the scene keeps its opaque clear.
  renderer.setClearColor(0x000000, 1);
  const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
  f.out?.dispose();
  f.out = new THREE.WebGLRenderTarget(bw, bh, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
  f.keyMat.uniforms.uTexel.value.set(1 / bw, 1 / bh);
  f.kd = Math.min(dpr, 1.5);
  f.kc.width = Math.round(w * f.kd); f.kc.height = Math.round(h * f.kd);
  f.keyTex.dispose();
}
// The last pass in the chain while the sight is on.
class SightPass extends Pass {
  constructor() { super(); this.enabled = false; this.needsSwap = false; }
  render(r, writeBuffer, readBuffer) {
    const f = sightFx;
    if (!f.tube) return;
    const now = performance.now(), dt = f.last ? clamp((now - f.last) / 1000, 1 / 120, 0.1) : 1 / 30;
    f.last = now;
    f.tube.sigU.tCam.value = readBuffer.texture;
    // Tom: the big chunky grain. The NVG toy's own photon count, starved at any hour.
    f.tube.sigU.uCamExpo.value = 14;
    f.tube.mOut.uniforms.uFlick.value = reduced() ? 0 : 1;
    f.tube.render(null, null, dt, now / 1000);
    f.keyMat.uniforms.tImg.value = f.out.texture;
    f.keyMat.uniforms.uNeg.value = reduced() ? 0.9 : 0.86 + 0.08 * Math.sin(now / 1000 * 1.3);
    f.tube.quad.material = f.keyMat;
    r.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    r.render(f.tube.scene, f.tube.cam);
  }
}
export const sightPass = new SightPass();
composer.addPass(sightPass);

// The marks, in CSS pixels, from the toy's own geometry.
const skP = new THREE.Vector3(), skQ = new THREE.Vector3(), skV = new THREE.Vector3(), skT = new THREE.Vector3();
function skScreen(v) {
  skP.copy(v).project(camera);
  return { x: (skP.x * 0.5 + 0.5) * state.size.w, y: (0.5 - skP.y * 0.5) * state.size.h, ok: skP.z < 1 };
}
export function sightMarks() {
  const W = state.size.w, H = state.size.h, fpx = (H / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const bore = skScreen(barrelPt(60000, 0, 0, skQ));
  const m = { W, H, phone: W < 640, bore, state: 'hold', lvl: 0 };
  // A ship kill keeps its hit in ship.fx.
  // A rock hit sets uHitP.
  const kill = state.tgtKind === 'ship' && ship.fx && ship.fx.kill ? ship.fx : null;
  const hitAge = state.simT - (kill ? kill.t0 : U.uHitP.value.w), gone = !tgtShown() || !tgtLive();
  if (state.shot && !state.shot.hit) { m.state = 'fired'; m.left = Math.max(0, state.shot.hitT - (state.simT - state.shot.t0)); }
  else if (hitAge >= 0 && hitAge < 8 && gone) m.state = 'struck';
  else if (charge) { m.lvl = clamp(U.uCharge.value, 0, 1); m.state = m.lvl >= 1 ? 'full' : 'charging'; }
  if (m.state === 'struck') {
    if (kill) skV.copy(kill.P); else skV.set(U.uHitP.value.x, U.uHitP.value.y, U.uHitP.value.z);
    const D = skV.distanceTo(camera.position);
    m.hit = { ...skScreen(skV), r: (kill ? SHIP_AIM_R : U.uHitR.value) / D * fpx, D };
    return m;
  }
  // The marks read the live target.
  // That is the rock or an unbroken ship.
  if (gone) return m;
  const P = tgtPos(skT), rock = skScreen(P), D = P.distanceTo(camera.position);
  if (!rock.ok) return m;
  m.rock = { ...rock, r: Math.max(6, tgtR() / D * fpx), D };
  // The rock's velocity: it falls FALL metres along -away over the size's time.
  // The ship's velocity: its track over the next second.
  const v = state.tgtKind === 'rock' ? skV.copy(ast.away).multiplyScalar(ast.state === 'approach' ? -FALL / fallT() : 0) : shipAim(state.simT + 1, skV).sub(P);
  m.rdot = v.dot(skQ.copy(P).sub(camera.position)) / D;
  // The intercept point is the target's place after one flight.
  const c = charge ? clamp(U.uCharge.value, 0.12, 1) : 1, T = THREE.MathUtils.lerp(11.5, 8.5, c) + 0.3;
  m.pip = skScreen(state.tgtKind === 'rock' ? skQ.copy(P).addScaledVector(v, T) : tgtLead(T - 0.3, skQ));
  m.lay = aimNow.err * 1000;
  return m;
}
// Draw the marks twice: a blurred green band, then a red core.
export function sightKey() {
  const f = sightFx, x = f.kx;
  if (!x) return;
  // Phones and short stages draw at four fifths.
  const m = sightMarks(), k = m.phone || m.H < 500 ? 0.8 : 1;
  const ph = reduced() ? 0.5 : (Math.floor(state.simT * 10) / 10) % 1;
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.clearRect(0, 0, f.kc.width, f.kc.height);
  // Every mark is burnt into the phosphor: one pass, in the blue channel.
  // Only the laser stays live light, in the red core.
  for (const band of [false]) {
    x.setTransform(f.kd, 0, 0, f.kd, 0, 0);
    x.filter = `blur(${0.6 * k}px)`;
    x.globalCompositeOperation = 'lighter';
    const col = '#00f';
    x.strokeStyle = x.fillStyle = col;
    x.lineJoin = 'round';
    const lw = w => (x.lineWidth = band ? 5 : w * k);
    const line = pts => { x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke(); };
    const box = (a, b, w, h, fill) => { if (fill) { if (h > 0) x.fillRect(a, b, w, h); } else { lw(1.1); x.strokeRect(a, b, w, h); } };
    const dot = (a, b, r) => { x.beginPath(); x.arc(a, b, r, 0, Math.PI * 2); x.fill(); };
    const word = (a, b, str, sz, align = 'center', ls = 0.45, wt = 500) => {
      x.font = `${wt} ${sz * k}px Gabarito, sans-serif`;
      x.letterSpacing = `${ls * sz * k}px`;
      x.textAlign = align;
      // Letter spacing trails the last glyph; centred and right text shift back.
      const tr = align === 'center' ? ls * sz * k / 2 : align === 'right' ? ls * sz * k : 0;
      if (band) { x.lineWidth = 4.4; x.strokeText(str, a + tr, b); }
      x.fillText(str, a + tr, b);
    };
    const { bore, W } = m;
    // The gun's horizon: one hairline, open round the bore.
    lw(1);
    const gap = 48 * k;
    line([[0, bore.y], [bore.x - gap, bore.y]]); line([[bore.x + gap, bore.y], [W, bore.y]]);
    // The monolith: two slender blocks round the aim gap; the lower fills with the charge.
    // The monolith stands at most an eighth of the stage tall, so its word stays clear.
    const mw = 8 * k, mh = Math.min(112 * k, m.H * 0.13), g2 = 13 * k, mx = bore.x - mw / 2, up = bore.y - g2 - mh, lo = bore.y + g2;
    box(mx, up, mw, mh); box(mx, lo, mw, mh);
    if (m.lvl > 0) box(mx, lo + mh * (1 - m.lvl), mw, mh * m.lvl, true);
    if (m.state === 'full') box(mx, up, mw, mh, true);
    // The ranging laser: the tube sees the IR beam and its spot on the rock.
    // The beam enters from the emitter's side and ends on the rock.
    const lg = laserGain();
    if (lg > 0 && m.rock) {
      const e = skScreen(skQ.lerpVectors(lzA, lzB, 0.0005));
      if (e.ok) {
        x.strokeStyle = x.fillStyle = '#f00';
        lw(band ? 5 : 0.8 + 1.6 * lg);
        line([[e.x, e.y], [m.rock.x, m.rock.y]]);
        dot(m.rock.x, m.rock.y, band ? 6 + 4 * lg : (1.5 + 3.5 * lg) * k);
        x.strokeStyle = x.fillStyle = col;
      }
    }
    if (m.rock) {
      const { rock } = m, hgt = rock.r * 1.25 + 12 * k;
      // Two obelisks either side of the rock, the height of its disc.
      for (const sx of [-1, 1]) {
        const ox = rock.x + sx * (rock.r + 17 * k), tp = rock.y - hgt, bt = rock.y + hgt;
        if (band) { lw(5); line([[ox, bt], [ox, tp]]); }
        else { x.beginPath(); x.moveTo(ox - 2.2 * k, bt); x.lineTo(ox - 1.2 * k, tp + 9 * k); x.lineTo(ox, tp); x.lineTo(ox + 1.2 * k, tp + 9 * k); x.lineTo(ox + 2.2 * k, bt); x.closePath(); x.fill(); }
      }
      if (m.state !== 'fired') {
        // The lead: beads drift from the rock to the intercept ring.
        if (m.pip.ok) {
          const dx = m.pip.x - rock.x, dy = m.pip.y - rock.y, d = Math.hypot(dx, dy) || 1, a0 = Math.min(0.9, rock.r * 0.6 / d);
          for (let i = 0; i < 6; i++) { const u = a0 + (1 - a0) * ((i + ph) / 6); if (u < 0.96) dot(rock.x + dx * u, rock.y + dy * u, band ? 4 : 2 * k); }
          lw(1.2); x.beginPath(); x.arc(m.pip.x, m.pip.y, 6 * k, 0, Math.PI * 2); x.stroke();
          if (m.state !== 'hold') word(m.pip.x, m.pip.y - 14 * k, m.lay.toFixed(0), 10, 'center', 0.3);
        }
      } else {
        // In flight: beads climb the bolt's path from the bore to the rock.
        const dx = rock.x - bore.x, dy = rock.y - bore.y;
        for (let i = 0; i < 9; i++) { const u = (i + ph) / 9; dot(bore.x + dx * u, bore.y + dy * u, band ? 4 : (1.4 + 1.2 * u) * k); }
      }
      // The range in light figures beside the rock; closing speed under it.
      const right = !m.phone && rock.x >= bore.x, al = m.phone ? 'center' : right ? 'left' : 'right';
      const tx = m.phone ? clamp(rock.x, 90, W - 90) : rock.x + (right ? 1 : -1) * (rock.r + 36 * k);
      const ty = m.phone ? rock.y - hgt - 34 * k : rock.y + 2;
      word(tx, ty, (rock.D / 1000).toFixed(2), 34, al, 0.1, 400);
      word(tx, ty + 22 * k, m.state === 'fired' ? 'KM' : `KM  ·  −${Math.round(Math.abs(m.rdot))} M/S`, 11, al, 0.5);
    }
    if (m.hit && m.hit.ok) {
      // Struck: a ring broken into six arcs where the rock was.
      const R = m.hit.r + 22 * k;
      lw(1.6);
      for (let i = 0; i < 6; i++) { const a0 = i / 6 * Math.PI * 2 + 0.2; x.beginPath(); x.arc(m.hit.x, m.hit.y, R, a0, a0 + Math.PI * 2 / 6 - 0.32); x.stroke(); }
      word(m.hit.x, m.hit.y - R - 18 * k, `${(m.hit.D / 1000).toFixed(2)} KM`, 12, 'center', 0.5);
    }
    // Under the monolith: one word, or the count.
    const big = m.state === 'charging' || m.state === 'fired';
    const w0 = { hold: 'HOLD', charging: `${Math.round(m.lvl * 100)}`, full: 'RELEASE', fired: (m.left ?? 0).toFixed(1), struck: 'STRUCK' }[m.state];
    word(bore.x, lo + mh + (big ? 34 : 28) * k, w0, big ? 22 : 12, 'center', big ? 0.12 : 0.6, big ? 400 : 500);
  }
  // Blue, the burn: the gun's name is burnt into the tube's phosphor.
  // It sits top centre, clear of the bar; on phones under its top row.
  x.setTransform(f.kd, 0, 0, f.kd, 0, 0);
  x.filter = `blur(${0.8 * k}px)`;
  x.globalCompositeOperation = 'lighter';
  x.fillStyle = '#00f';
  x.font = `600 ${26 * k}px Gabarito, sans-serif`;
  x.letterSpacing = `${0.55 * 26 * k}px`;
  x.textAlign = 'center';
  x.fillText('SCINFAXI', m.W / 2 + 0.275 * 26 * k, (m.phone ? 92 : 50) * k);
  x.filter = 'none';
  x.globalCompositeOperation = 'source-over';
  f.keyTex.needsUpdate = true;
}
