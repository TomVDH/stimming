// Load order: play/ambient runs first.
import './ambient.ts';
import { stepShip } from '../../ship.js';
import { state } from '../state.ts';
import { SIZES, opts } from '../setup.ts';
import { ast, astSize, placeAst } from '../rock/asteroid.ts';
import { ship } from '../ship/battleship.ts';
import { stepFrags } from '../rock/fragments.ts';
import { stepAmbient } from './ambient.ts';
import { stepImpacts } from '../ship/hulks.ts';
import { stepChunks, stepRain, stepShards } from '../fx/volumes.ts';
import { stepHulks, stepShipFx } from '../ship/hit.ts';
import { fill, spin } from './reset.ts';
import { startStrike } from '../rock/strike.ts';
import { stepShipSound } from '../sound/ship.ts';

/* ---------- the approach ---------- */
// The rock falls down its track.
// Past the horizon line it strikes the planet, at the same speed.
// The fair window: the whole fall, a few minutes, until contact.
// A kill takes about 22 s: ranging 1.0, full charge 8.6, bolt 8.5 to 11.5.
// The live strike, or null; the Strike test dev toggle.
state.strike = null; state.strikeTest = false;
// Fast rock: a dev toggle that runs the fall ten times faster.
state.fastRock = false;
export const fallT = () => SIZES[opts.size].T / (state.fastRock ? 10 : 1);
export function stepAst(dt: number) {
  if (state.tgtKind === 'ship') stepShip(ship, state.simT);
  stepShipFx(dt);
  stepHulks(dt);
  stepImpacts();
  stepShipSound();
  stepFrags();
  stepShards(dt);
  stepRain(dt);
  stepChunks();
  stepAmbient(dt);
  const falling = ast.state === 'approach' || ast.state === 'hold' || ast.state === 'strike';
  // The rock sheds no ember sparks (Tom: no small yellow wisps).
  // A crater's shove eases back onto the path over a second and a half.
  if (ast.jolt.lengthSq() > 1) { ast.jolt.multiplyScalar(Math.exp(-dt / 1.5)); if (ast.state === 'hold') placeAst(); } else ast.jolt.set(0, 0, 0);
  if (falling) {
    // One steady speed from first sight to the ground.
    ast.s = Math.min(state.strike ? state.strike.s1 : 1, ast.s + dt / fallT());
    // Past the horizon line the strike starts; a rewind holds it back.
    // Only a rock strikes.
    // The ship mode has no falling rock.
    if (!state.strike && ast.s >= 1 && !spin && !fill && state.tgtKind === 'rock') startStrike();
    placeAst();
    astSize();
  }
}
