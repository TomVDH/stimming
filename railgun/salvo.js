// Salvo: the hold banks rounds; the release ripples them out.
// Plain numbers only; no three.js, so node tests can load it.

// Hold seconds at which each round banks.
// The first entry is heldOf(ARM), the arm point.
export const BANK = [2.41, 5.5, 8.6, 12.6, 14.6];
// Each round carries this power.
export const ROUND_C = 0.35;
// Damage at or past this line breaks the rock.
export const KILL_LINE = 1.0;
// Seconds between two launches.
export const GAP = 0.5;
// Round 1 leaves the muzzle this long after the release.
export const LAUNCH = 0.3;
export const MAX_ROUNDS = 5;

// The count of rounds banked after held seconds.
export const bankAt = held => BANK.filter(t => t <= held).length;

// Seconds from the release to round j's launch; j counts from 1.
export const launchAt = j => +(LAUNCH + GAP * (j - 1)).toFixed(6);

// One kick: a fast slam, a hold, then the return.
const kick = (t, hold, tau) => (t <= 0 ? 0 : (1 - Math.exp(-t / 0.06)) * Math.exp(-Math.max(0, t - hold) / tau));

// The barrel's slide in metres, age seconds after the release.
// Round j kicks to j/5 of the cap.
// Early rounds hold 0.15 s and return fast.
// The last round holds 0.6 s and runs out over 3.5 s, as Rail does.
export function recoilAt(age, n, cap) {
  let s = 0;
  for (let j = 1; j <= n; j++) {
    const last = j === n;
    s = Math.max(s, (j / MAX_ROUNDS) * kick(age - launchAt(j), last ? 0.6 : 0.15, last ? 3.5 : 0.6));
  }
  return cap * s;
}

// The damage a target has taken; chunks is the count of big pieces.
export const makeTally = (chunks = 3) => ({ dmg: 0, broken: false, hunted: 0, chunks });

// One round lands: it craters, breaks, hunts a chunk, or misses.
export function landRound(t, c) {
  if (t.broken) {
    if (t.hunted >= t.chunks) return 'miss';
    t.hunted++;
    return 'hunt';
  }
  t.dmg += c;
  if (t.dmg >= KILL_LINE - 1e-9) { t.broken = true; return 'break'; }
  return 'crater';
}

// Round loudness: it rises to 1 on the last round of a full bank.
export const roundGain = (j, n) => 0.45 + 0.55 * j / MAX_ROUNDS;
