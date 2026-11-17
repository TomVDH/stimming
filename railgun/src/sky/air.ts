// Load order: sky/atmosphere runs first.
import './atmosphere.ts';
// Blue light scatters out of the line of sight first.
// The sky's own colour fills what the air removes.
import AIR from './air.glsl';
export { AIR };

/* ---------- air: Rayleigh scattering for far objects ---------- */
