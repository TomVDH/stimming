// Sorting sounds: the algorithms, as generators over one array.
// Each generator changes the array in place, then yields the step.
// Steps: cmp (i, j), swap (i, j), move (from, to), read (i), mark (v).
// A move takes the bar at from and sets it in at to; the bars between step right.

const cmp = (i, j) => ({ k: 'cmp', i, j });
const swap = (a, i, j) => { const t = a[i]; a[i] = a[j]; a[j] = t; return { k: 'swap', i, j }; };
function move(a, from, to) {
  const v = a[from];
  for (let k = from; k > to; k--) a[k] = a[k - 1];
  a[to] = v;
  return { k: 'move', from, to };
}
const mark = v => ({ k: 'mark', v });

function* bubble(a) {
  let end = a.length - 1;
  while (end > 0) {
    let last = 0;
    for (let i = 0; i < end; i++) {
      yield cmp(i, i + 1);
      if (a[i] > a[i + 1]) { yield swap(a, i, i + 1); last = i; }
    }
    // Past the last swap the row is already in order.
    end = last;
  }
}

function* insertion(a) {
  for (let i = 1; i < a.length; i++) {
    yield mark(a[i]);
    for (let j = i; j > 0; j--) {
      yield cmp(j - 1, j);
      if (a[j - 1] <= a[j]) break;
      yield swap(a, j - 1, j);
    }
  }
  yield mark(-1);
}

// Lomuto partition; the middle bar goes to the end as the pivot.
function* quick(a, lo = 0, hi = a.length - 1) {
  if (lo >= hi) return;
  const m = (lo + hi) >> 1;
  if (m !== hi) yield swap(a, m, hi);
  const p = a[hi];
  yield mark(p);
  let s = lo;
  for (let i = lo; i < hi; i++) {
    yield cmp(i, hi);
    if (a[i] < p) {
      if (i !== s) yield swap(a, i, s);
      s++;
    }
  }
  if (s !== hi) yield swap(a, s, hi);
  yield mark(-1);
  yield* quick(a, lo, s - 1);
  yield* quick(a, s + 1, hi);
}

// In place: a bar from the right run moves left into the left run.
function* merge(a, lo = 0, hi = a.length) {
  if (hi - lo < 2) return;
  const mid = (lo + hi) >> 1;
  yield* merge(a, lo, mid);
  yield* merge(a, mid, hi);
  let i = lo, j = mid;
  while (i < j && j < hi) {
    yield cmp(i, j);
    if (a[i] <= a[j]) i++;
    else { yield move(a, j, i); i++; j++; }
  }
}

function* sift(a, root, end) {
  for (;;) {
    let c = 2 * root + 1;
    if (c >= end) return;
    if (c + 1 < end) {
      yield cmp(c, c + 1);
      if (a[c + 1] > a[c]) c++;
    }
    yield cmp(root, c);
    if (a[root] >= a[c]) return;
    yield swap(a, root, c);
    root = c;
  }
}
function* heap(a) {
  const n = a.length;
  for (let i = (n >> 1) - 1; i >= 0; i--) yield* sift(a, i, n);
  for (let end = n - 1; end > 0; end--) {
    yield swap(a, 0, end);
    yield* sift(a, 0, end);
  }
}

// LSD radix in base 4, stable, by moves.
// Each pass gathers digit 0, then 1, then 2 at the front; digit 3 stays last.
function* radix(a) {
  const max = Math.max(...a);
  for (let shift = 0; (max >> shift) > 0; shift += 2) {
    let p = 0;
    for (let d = 0; d < 3; d++) {
      for (let k = p; k < a.length; k++) {
        yield { k: 'read', i: k };
        if (((a[k] >> shift) & 3) === d) {
          if (k !== p) yield move(a, k, p);
          p++;
        }
      }
    }
  }
}

export const ALGOS = { bubble, insertion, quick, merge, heap, radix };
export const NAMES = { bubble: 'Bubble', insertion: 'Insertion', quick: 'Quick', merge: 'Merge', heap: 'Heap', radix: 'Radix' };

// Fisher-Yates over 0 to n - 1; a sorted result shuffles again.
export function shuffled(n, rnd = Math.random) {
  const a = Array.from({ length: n }, (_, i) => i);
  do {
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
  } while (n > 1 && isSorted(a));
  return a;
}
export function isSorted(a) {
  for (let i = 1; i < a.length; i++) if (a[i - 1] > a[i]) return false;
  return true;
}
