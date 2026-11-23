// Load order: world/lights runs first.
import './lights.ts';
import { Color, Mesh, MeshLambertMaterial, MeshStandardMaterial, Vector2, Vector3 } from 'three';
import type { Material } from 'three';
import { scene } from '../setup.ts';
import { SUN_END, SUN_START, streakForDusk, sunsetAz } from '../core/opening.ts';
import { HAZE_C, HORIZON, ZENITH, fog, skyU } from '../sky/haze.ts';
import { LAT, NIGHT_MAG, setStarLimit, setStreak } from '../sky/stars.ts';
import { HEMI_I, TOP, hemi } from './hill.ts';
import { altAzDir } from '../sky/altaz.ts';

/* ---------- the golden hour and the dusk: a warm west, last light on the hilltop ---------- */
// w is the dusk: 1 at the start, 0 at full night.
// It is linear in the sun's altitude, from SUN_START to SUN_END.
// The golden hour runs from SUN_START down to DUSK_ALT.
// The dusk runs from DUSK_ALT down to SUN_END.
// At w = 0 every value is the night look's own value.

// Linear colours at w = 1.
// The zenith is deep blue.
// The horizon is slate.
const DUSK_ZEN = new Color(0.010, 0.022, 0.075);
const DUSK_HOR = new Color(0.075, 0.085, 0.11);
// The sunset glow's peak, low in the west.
const DUSK_WARM = new Color(0.42, 0.16, 0.035);
// The haze holds some of the twilight.
const DUSK_HAZE = new Color(0.05, 0.055, 0.07);
// Twilight lights the land this many times more than starlight.
const DUSK_HEMI = 1.6;
// The last light: a warm, low light from the sunset.
const LAST_LIGHT = new Color(1.0, 0.5, 0.22).multiplyScalar(9);
// The sun's light stands a little over the horizon on high ground.
const LAST_ALT = 8;
// The earth's shadow climbs from below the treeline to over the domes.
const SHADOW_LO = TOP - 10, SHADOW_HI = TOP + 18;
// The sun's glow at dusk: its spread in radians, its fade with height.
const DUSK_GLOW = new Vector2(0.75, 10);

// The dusk look starts at this sun altitude, in degrees.
const DUSK_ALT = -4;
// Linear colours in the golden hour, the sun behind the western ridge.
// The sky overhead is a deeper blue.
// The horizon is pale.
const GOLD_ZEN = new Color(0.035, 0.10, 0.28);
const GOLD_HOR = new Color(0.20, 0.235, 0.29);
// The glow is gold low in the west, and wide.
const GOLD_WARM = new Color(1.15, 0.55, 0.15);
const GOLD_GLOW = new Vector2(1.0, 8.5);
// The haze holds a little more light than at dusk.
const GOLD_HAZE = new Color(0.085, 0.09, 0.105);
// The late sun: gold, low, from the west.
const GOLD_LIGHT = new Color(1.0, 0.62, 0.30).multiplyScalar(24);
// It stands this many degrees up, lower than the dusk's light.
// So it rakes across the crowns.
const GOLD_ALT = 4;
// The exposure holds the bright sky.
// So the sky's fill on the land is less than at dusk.
// The shade then stays deep against the sun.
const GOLD_HEMI = 1.15;
// The sun's light reaches down into the valley.
const GOLD_SHADOW = TOP - 70;
// The late sun on the far ridges' west faces.
const GOLD_RIDGE = new Color(1.0, 0.62, 0.30).multiplyScalar(0.12);

const sunAz = sunsetAz(new Date(), LAT);
altAzDir({ alt: 0, az: sunAz }, skyU.uSun.value);

const duskU = {
  uDuskC: { value: new Color(0, 0, 0) },
  uDuskDir: { value: altAzDir({ alt: LAST_ALT, az: sunAz }) },
  uDuskY: { value: SHADOW_LO },
};

// Adds the last light to a lit material.
// It lights only faces above the earth's shadow line.
// At night uDuskC is black, so the night frame skips the branch.
// world/hero adds it to the hero model's materials.
export function patch(m: Material): void {
  const prev = m.onBeforeCompile, key = m.customProgramCacheKey();
  m.onBeforeCompile = (sh, r) => {
    prev.call(m, sh, r);
    Object.assign(sh.uniforms, duskU);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uDuskC, uDuskDir;\nuniform float uDuskY;')
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        #ifdef USE_FOG
        if (uDuskC != vec3(0.0)) {
          vec3 nW = inverseTransformDirection(normal, viewMatrix);
          float lit = max(dot(nW, uDuskDir), 0.0) * smoothstep(uDuskY - 5.0, uDuskY + 5.0, vHazeP.y);
          reflectedLight.directDiffuse += uDuskC * lit * BRDF_Lambert(diffuseColor.rgb);
        }
        #endif`);
  };
  // The patch changes the program, so the cache key changes too.
  m.customProgramCacheKey = () => key + '|dusk';
}

const patched = new Set<Material>();
scene.traverse((o) => {
  if (!(o instanceof Mesh)) return;
  const m = o.material as Material;
  if (patched.has(m)) return;
  if (m instanceof MeshLambertMaterial || m instanceof MeshStandardMaterial) { patch(m); patched.add(m); }
});

// Each channel is night times (dusk / night) to the power w.
// The light then falls at an even pace to the eye.
function toward(out: Color, night: Color, dusk: Color, w: number): void {
  out.setRGB(night.r * (dusk.r / night.r) ** w, night.g * (dusk.g / night.g) ** w, night.b * (dusk.b / night.b) ** w);
}

// Sets the scene for a dusk w and a star limit.
export function setDusk(w: number, magLimit: number): void {
  const alt = SUN_END + (SUN_START - SUN_END) * w;
  // d is the dusk's own w: 1 at DUSK_ALT, 0 at night.
  const d = Math.min(1, Math.max(0, (alt - SUN_END) / (DUSK_ALT - SUN_END)));
  // g is the golden hour: 1 at the start, 0 at DUSK_ALT.
  const g = Math.min(1, Math.max(0, (alt - DUSK_ALT) / (SUN_START - DUSK_ALT)));
  toward(skyU.uZen.value, ZENITH, DUSK_ZEN, d);
  toward(skyU.uHor.value, HORIZON, DUSK_HOR, d);
  toward(fog.color, HAZE_C, DUSK_HAZE, d);
  skyU.uWarm.value.copy(DUSK_WARM).multiplyScalar(d * d);
  skyU.uGlow.value.copy(DUSK_GLOW);
  hemi.intensity = HEMI_I * DUSK_HEMI ** d;
  duskU.uDuskC.value.copy(LAST_LIGHT).multiplyScalar(d ** 1.5);
  duskU.uDuskY.value = SHADOW_LO + (SHADOW_HI - SHADOW_LO) * (1 - d);
  altAzDir({ alt: LAST_ALT + (GOLD_ALT - LAST_ALT) * g, az: sunAz }, duskU.uDuskDir.value);
  skyU.uRidge.value.copy(GOLD_RIDGE).multiplyScalar(g * g);
  // The golden hour goes from the dusk's start toward its own look.
  if (g > 0) {
    toward(skyU.uZen.value, DUSK_ZEN, GOLD_ZEN, g);
    toward(skyU.uHor.value, DUSK_HOR, GOLD_HOR, g);
    toward(fog.color, DUSK_HAZE, GOLD_HAZE, g);
    toward(skyU.uWarm.value, DUSK_WARM, GOLD_WARM, g);
    skyU.uGlow.value.lerp(GOLD_GLOW, g);
    hemi.intensity *= (GOLD_HEMI / DUSK_HEMI) ** g;
    toward(duskU.uDuskC.value, LAST_LIGHT, GOLD_LIGHT, g);
    duskU.uDuskY.value = SHADOW_LO + (GOLD_SHADOW - SHADOW_LO) * g;
  }
  setStarLimit(w > 0 ? magLimit : NIGHT_MAG);
  setStreak(streakForDusk(w));
}
