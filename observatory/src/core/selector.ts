// The celestial selector: two beats.
// A tap locks a star; a choice of telescope sends it.
import type { Star } from './catalog.ts';

// The two telescopes that can answer a pick.
export type Scope = 'refractor' | 'reflector';

// mode: idle, hover over a star, or locked on a star.
// last: the telescope the last choice sent.
export type SelState = { mode: 'idle' | 'hover' | 'locked'; star: Star | null; last: Scope };

// The first hover's hairline runs to the big dome.
export function makeSelector(): SelState {
  return { mode: 'idle', star: null, last: 'reflector' };
}

// A hover shows the star under the pointer.
// A lock holds its star until a choice or a release.
export function hover(s: SelState, star: Star | null): void {
  if (s.mode === 'locked') return;
  s.star = star;
  s.mode = star ? 'hover' : 'idle';
}

// A tap on a star locks it.
// A tap on empty sky releases a lock.
export function tapSel(s: SelState, star: Star | null): 'lock' | 'release' | 'none' {
  if (star) { s.star = star; s.mode = 'locked'; return 'lock'; }
  if (s.mode !== 'locked') return 'none';
  release(s);
  return 'release';
}

// A choice sends the locked star.
// It gives null when no star is locked.
export function choose(s: SelState, scope: Scope): Star | null {
  if (s.mode !== 'locked') return null;
  const star = s.star;
  s.last = scope;
  release(s);
  return star;
}

export function release(s: SelState): void {
  s.mode = 'idle';
  s.star = null;
}
