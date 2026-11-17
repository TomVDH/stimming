// Tap or drag. The input code feeds it the pointer's travel and press time.

// A tap moves less than this many pixels.
const TAP_PX = 8;
// A tap lasts less than this many milliseconds.
const TAP_MS = 400;

export function classify(dxPx: number, dyPx: number, ms: number): 'tap' | 'drag' {
  return Math.hypot(dxPx, dyPx) < TAP_PX && ms < TAP_MS ? 'tap' : 'drag';
}
