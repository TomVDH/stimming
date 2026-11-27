// Fruit gesture thresholds stay stable across stage sizes and pointer types.
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function gestureLimits(width, height, pointerType = 'mouse') {
  const short = Math.max(1, Math.min(width, height));
  const touch = pointerType === 'touch' || pointerType === 'pen';
  return {
    slop: touch ? 16 : 9,
    slice: clamp(short * 0.12, touch ? 44 : 38, touch ? 72 : 68),
    flickMax: clamp(short * 0.24, 78, 124),
    flickMs: touch ? 480 : 400,
    flickSpeed: touch ? 420 : 520,
    holdMs: touch ? 300 : 260,
  };
}

export function isFlick(distance, elapsedMs, speed, limits) {
  return distance >= limits.slop
    && distance <= limits.flickMax
    && elapsedMs <= limits.flickMs
    && speed >= limits.flickSpeed;
}
