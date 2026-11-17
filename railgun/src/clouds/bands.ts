// @ts-nocheck
// Load order: clouds/shafts runs first.
import './shafts.ts';

/* ---------- bands: draw order by distance ---------- */
// Clouds and smoke write no depth, so draw order decides what covers what.
// Each band holds one span of distance from the eye; far bands draw first.
// Names follow docs/plans/railgun-volumes.md.
export const BAND = {
  // Sky: the dome with the cirrus and the deck.
  sky: -1,
  // Country, 80 to 200 km: the ranges; they write depth.
  country: -0.9,
  // Deep, 100 to 300 km: giants, then towers.
  giants: 1.45, deep: 1.5,
  // Far, 50 to 100 km: far mids and far dust domes.
  far: 1.6,
  // Rock, 40 to 50 km: the rock and all it sheds, back to front.
  domes: 1.8, fireball: 1.9, shards: 1.95, smoke: 2, debris: 2.05, ribbons: 2.1, glows: 2.12,
  // Mid, 5 to 40 km: heaps and near mids.
  mids: 2.15, heaps: 2.2,
  // Near, 0 to 5 km: the gun's volumes, dust and the ion line.
  plume: 2.2, shell: 2.3, shockRing: 2.4, dust: 2.5, ionPuffs: 2.55, ion: 2.6,
  // Sparks and lights over everything; then the lens.
  sparks: 3, lights: 4,
};
// A card layer past this distance draws in the Far band, behind the rock.
export const ROCK_FAR = 48000;
