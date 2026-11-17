// Load order: world/lights runs first.
import './lights.ts';
import { Color, Mesh, MeshLambertMaterial, MeshStandardMaterial, Vector3 } from 'three';
import type { Material } from 'three';
import { scene } from '../setup.ts';
import { sunsetAz } from '../core/opening.ts';
import { HAZE_C, HORIZON, ZENITH, fog, skyU } from '../sky/haze.ts';
import { LAT, NIGHT_MAG, setStarLimit } from '../sky/stars.ts';
import { HEMI_I, TOP, hemi } from './hill.ts';
import { altAzDir } from './laser.ts';

/* ---------- the dusk: a warm west, a blue sky, last light on the hilltop ---------- */
// w is the dusk: 1 just after sunset, 0 at full night.
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

const sunAz = sunsetAz(new Date(), LAT);
altAzDir({ alt: 0, az: sunAz }, skyU.uSun.value);

const duskU = {
  uDuskC: { value: new Color(0, 0, 0) },
  uDuskDir: { value: altAzDir({ alt: LAST_ALT, az: sunAz }) },
  uDuskY: { value: SHADOW_LO },
};

// Adds the last light to a lit material.
// It lights only faces above the earth's shadow line.
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
        {
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
  toward(skyU.uZen.value, ZENITH, DUSK_ZEN, w);
  toward(skyU.uHor.value, HORIZON, DUSK_HOR, w);
  toward(fog.color, HAZE_C, DUSK_HAZE, w);
  skyU.uWarm.value.copy(DUSK_WARM).multiplyScalar(w * w);
  hemi.intensity = HEMI_I * DUSK_HEMI ** w;
  duskU.uDuskC.value.copy(LAST_LIGHT).multiplyScalar(w ** 1.5);
  duskU.uDuskY.value = SHADOW_LO + (SHADOW_HI - SHADOW_LO) * (1 - w);
  setStarLimit(w > 0 ? magLimit : NIGHT_MAG);
}
