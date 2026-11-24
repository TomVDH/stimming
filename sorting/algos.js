// Sorting sounds: the algorithms, as generators over one array.
// Each generator changes the array in place, then yields the step.
// Steps: cmp (i, j), swap (i, j), move (from, to), read (i), mark (v).
// A move takes the bar at from and sets it in at to; the bars between step right.
// Values are distinct: 0 to n - 1.

const cmp = (i, j) => ({ k: 'cmp', i, j });
const swap = (a, i, j) => { const t = a[i]; a[i] = a[j]; a[j] = t; return { k: 'swap', i, j }; };
function move(a, from, to) {
  const v = a[from];
  for (let k = from; k > to; k--) a[k] = a[k - 1];
  a[to] = v;
  return { k: 'move', from, to };
}
const read = i => ({ k: 'read', i });
const mark = v => ({ k: 'mark', v });

/* ---------- exchange ---------- */

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

// Bubble passes that run right, then left.
function* cocktail(a) {
  let lo = 0, hi = a.length - 1;
  while (lo < hi) {
    let last = lo;
    for (let i = lo; i < hi; i++) {
      yield cmp(i, i + 1);
      if (a[i] > a[i + 1]) { yield swap(a, i, i + 1); last = i; }
    }
    hi = last;
    last = hi;
    for (let i = hi; i > lo; i--) {
      yield cmp(i - 1, i);
      if (a[i - 1] > a[i]) { yield swap(a, i - 1, i); last = i; }
    }
    lo = last;
  }
}

// Odd pairs, then even pairs, until a pass swaps nothing.
function* oddEven(a) {
  for (let done = false; !done;) {
    done = true;
    for (const start of [1, 0]) {
      for (let i = start; i + 1 < a.length; i += 2) {
        yield cmp(i, i + 1);
        if (a[i] > a[i + 1]) { yield swap(a, i, i + 1); done = false; }
      }
    }
  }
}

// Bubble with a gap that shrinks by 1.3 each pass.
function* comb(a) {
  let gap = a.length, done = false;
  while (gap > 1 || !done) {
    gap = Math.max(1, Math.floor(gap / 1.3));
    done = true;
    for (let i = 0; i + gap < a.length; i++) {
      yield cmp(i, i + gap);
      if (a[i] > a[i + gap]) { yield swap(a, i, i + gap); done = false; }
    }
  }
}

// One bar walks back until it fits, then the walk goes on.
function* gnome(a) {
  let i = 1;
  while (i < a.length) {
    if (i === 0) { i = 1; continue; }
    yield cmp(i - 1, i);
    if (a[i - 1] <= a[i]) i++;
    else { yield swap(a, i - 1, i); i--; }
  }
}

// Compares pairs from the two ends inward, then each half; repeats until calm.
function* circle(a) {
  function* pass(lo, hi) {
    if (lo >= hi) return false;
    let swapped = false;
    for (let i = lo, j = hi; i < j; i++, j--) {
      yield cmp(i, j);
      if (a[i] > a[j]) { yield swap(a, i, j); swapped = true; }
    }
    // An odd span leaves a middle bar; it checks its right neighbour.
    if ((hi - lo) % 2 === 0) {
      const m = (lo + hi) >> 1;
      yield cmp(m, m + 1);
      if (a[m] > a[m + 1]) { yield swap(a, m, m + 1); swapped = true; }
    }
    const mid = (lo + hi) >> 1;
    const l = yield* pass(lo, mid);
    const r = yield* pass(mid + 1, hi);
    return swapped || l || r;
  }
  while (yield* pass(0, a.length - 1));
}

/* ---------- insertion ---------- */

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

// A binary search finds the slot; one move sets the bar in.
function* binaryInsertion(a) {
  for (let i = 1; i < a.length; i++) {
    yield mark(a[i]);
    let lo = 0, hi = i;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      yield cmp(m, i);
      if (a[m] < a[i]) lo = m + 1; else hi = m;
    }
    if (lo < i) yield move(a, i, lo);
  }
  yield mark(-1);
}

// Insertion over wide gaps first; the gaps follow Ciura.
function* shell(a) {
  const gaps = [701, 301, 132, 57, 23, 10, 4, 1].filter(g => g < a.length);
  for (const g of gaps) {
    for (let i = g; i < a.length; i++) {
      for (let j = i; j >= g; j -= g) {
        yield cmp(j - g, j);
        if (a[j - g] <= a[j]) break;
        yield swap(a, j - g, j);
      }
    }
  }
}

/* ---------- selection ---------- */

function* selection(a) {
  for (let i = 0; i < a.length - 1; i++) {
    let m = i;
    yield mark(a[m]);
    for (let j = i + 1; j < a.length; j++) {
      yield cmp(j, m);
      if (a[j] < a[m]) { m = j; yield mark(a[m]); }
    }
    if (m !== i) yield swap(a, i, m);
  }
  yield mark(-1);
}

// The lowest bar goes left and the highest goes right in one pass.
function* doubleSelection(a) {
  for (let lo = 0, hi = a.length - 1; lo < hi; lo++, hi--) {
    let mn = lo, mx = lo;
    for (let j = lo + 1; j <= hi; j++) {
      yield cmp(j, mn);
      if (a[j] < a[mn]) mn = j;
      yield cmp(j, mx);
      if (a[j] > a[mx]) mx = j;
    }
    yield mark(a[mn]);
    if (mn !== lo) yield swap(a, lo, mn);
    // The highest bar may have stood at lo; the swap moved it to mn.
    if (mx === lo) mx = mn;
    if (mx !== hi) yield swap(a, hi, mx);
  }
  yield mark(-1);
}

// Each bar counts the bars below it, then swaps into its own slot.
function* cycle(a) {
  for (let cs = 0; cs < a.length - 1; cs++) {
    for (;;) {
      yield mark(a[cs]);
      let pos = cs;
      for (let j = cs + 1; j < a.length; j++) {
        yield cmp(j, cs);
        if (a[j] < a[cs]) pos++;
      }
      if (pos === cs) break;
      yield swap(a, cs, pos);
    }
  }
  yield mark(-1);
}

// Only flips of the front of the row: the highest bar flips to the front, then to its place.
function* pancake(a) {
  function* flip(k) {
    for (let i = 0, j = k; i < j; i++, j--) yield swap(a, i, j);
  }
  for (let size = a.length; size > 1; size--) {
    let m = 0;
    for (let j = 1; j < size; j++) {
      yield cmp(j, m);
      if (a[j] > a[m]) m = j;
    }
    if (m === size - 1) continue;
    yield mark(a[m]);
    if (m > 0) yield* flip(m);
    yield* flip(size - 1);
  }
  yield mark(-1);
}

/* ---------- merge ---------- */

// Merges two neighbour runs in place: a bar from the right run moves left.
function* mergeRuns(a, lo, mid, hi) {
  let i = lo, j = mid;
  while (i < j && j < hi) {
    yield cmp(i, j);
    if (a[i] <= a[j]) i++;
    else { yield move(a, j, i); i++; j++; }
  }
}

function* merge(a, lo = 0, hi = a.length) {
  if (hi - lo < 2) return;
  const mid = (lo + hi) >> 1;
  yield* merge(a, lo, mid);
  yield* merge(a, mid, hi);
  yield* mergeRuns(a, lo, mid, hi);
}

// Runs of 1, then 2, then 4, merged left to right.
function* bottomUp(a) {
  const n = a.length;
  for (let w = 1; w < n; w *= 2) {
    for (let lo = 0; lo + w < n; lo += 2 * w) yield* mergeRuns(a, lo, lo + w, Math.min(lo + 2 * w, n));
  }
}

// Finds the runs already in order, then merges them in pairs.
function* natural(a) {
  const n = a.length;
  for (;;) {
    const starts = [0];
    for (let i = 1; i < n; i++) {
      yield cmp(i - 1, i);
      if (a[i - 1] > a[i]) starts.push(i);
    }
    if (starts.length === 1) return;
    starts.push(n);
    for (let r = 0; r + 2 < starts.length; r += 2) yield* mergeRuns(a, starts[r], starts[r + 1], starts[r + 2]);
  }
}

/* ---------- quick ---------- */

// Lomuto partition; the middle bar goes to the end as the pivot.
function* partition(a, lo, hi) {
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
  return s;
}

function* quick(a, lo = 0, hi = a.length - 1) {
  if (lo >= hi) return;
  const s = yield* partition(a, lo, hi);
  yield* quick(a, lo, s - 1);
  yield* quick(a, s + 1, hi);
}

// Hoare partition: two scans close in from the ends and trade bars.
function* hoare(a, lo = 0, hi = a.length - 1) {
  if (lo >= hi) return;
  let pi = (lo + hi) >> 1;
  const p = a[pi];
  yield mark(p);
  let i = lo - 1, j = hi + 1;
  for (;;) {
    do { i++; yield cmp(i, pi); } while (a[i] < p);
    do { j--; yield cmp(j, pi); } while (a[j] > p);
    if (i >= j) break;
    yield swap(a, i, j);
    // The pivot bar may move in the swap.
    if (pi === i) pi = j; else if (pi === j) pi = i;
  }
  yield mark(-1);
  yield* hoare(a, lo, j);
  yield* hoare(a, j + 1, hi);
}

// Two pivots, at the ends, part the range in three.
function* dualPivot(a, lo = 0, hi = a.length - 1) {
  if (lo >= hi) return;
  yield cmp(lo, hi);
  if (a[lo] > a[hi]) yield swap(a, lo, hi);
  const p = a[lo], q = a[hi];
  yield mark(q);
  let l = lo + 1, g = hi - 1, k = l;
  while (k <= g) {
    yield cmp(k, lo);
    if (a[k] < p) {
      if (k !== l) yield swap(a, k, l);
      l++;
    } else {
      yield cmp(k, hi);
      if (a[k] > q) {
        for (;;) {
          yield cmp(g, hi);
          if (a[g] > q && k < g) g--; else break;
        }
        if (k !== g) yield swap(a, k, g);
        g--;
        yield cmp(k, lo);
        if (a[k] < p) {
          if (k !== l) yield swap(a, k, l);
          l++;
        }
      }
    }
    k++;
  }
  l--; g++;
  if (lo !== l) yield swap(a, lo, l);
  if (hi !== g) yield swap(a, hi, g);
  yield mark(-1);
  yield* dualPivot(a, lo, l - 1);
  yield* dualPivot(a, l + 1, g - 1);
  yield* dualPivot(a, g + 1, hi);
}

// Dijkstra's three-way partition: below, the pivot, above.
function* threeWay(a, lo = 0, hi = a.length - 1) {
  if (lo >= hi) return;
  const m = (lo + hi) >> 1;
  if (m !== lo) yield swap(a, lo, m);
  const p = a[lo];
  yield mark(p);
  let lt = lo, gt = hi, i = lo + 1;
  while (i <= gt) {
    yield cmp(i, lt);
    if (a[i] < p) { yield swap(a, lt, i); lt++; i++; }
    else if (a[i] > p) { if (i !== gt) yield swap(a, i, gt); gt--; }
    else i++;
  }
  yield mark(-1);
  yield* threeWay(a, lo, lt - 1);
  yield* threeWay(a, gt + 1, hi);
}

// Quick sort that turns to heap sort when it runs too deep.
// Short ranges finish by insertion.
function* intro(a) {
  function* ins(lo, hi) {
    for (let i = lo + 1; i <= hi; i++) {
      for (let j = i; j > lo; j--) {
        yield cmp(j - 1, j);
        if (a[j - 1] <= a[j]) break;
        yield swap(a, j - 1, j);
      }
    }
  }
  function* go(lo, hi, depth) {
    if (hi - lo < 12) { yield* ins(lo, hi); return; }
    if (depth === 0) { yield* heapRange(a, lo, hi + 1, 2); return; }
    const s = yield* partition(a, lo, hi);
    yield* go(lo, s - 1, depth - 1);
    yield* go(s + 1, hi, depth - 1);
  }
  // A low depth limit, so the heap sort shows.
  yield* go(0, a.length - 1, Math.max(1, Math.floor(Math.log2(a.length))));
}

/* ---------- heap ---------- */

// Sifts the root of a d-ary heap down, inside [base, end).
function* sift(a, base, root, end, d) {
  for (;;) {
    const first = base + d * (root - base) + 1;
    if (first >= end) return;
    let c = first;
    for (let k = first + 1; k < Math.min(first + d, end); k++) {
      yield cmp(c, k);
      if (a[k] > a[c]) c = k;
    }
    yield cmp(root, c);
    if (a[root] >= a[c]) return;
    yield swap(a, root, c);
    root = c;
  }
}
function* heapRange(a, lo, hi, d) {
  const n = hi - lo;
  for (let i = lo + Math.floor((n - 2) / d); i >= lo; i--) yield* sift(a, lo, i, hi, d);
  for (let end = hi - 1; end > lo; end--) {
    yield swap(a, lo, end);
    yield* sift(a, lo, lo, end, d);
  }
}
const heap = a => heapRange(a, 0, a.length, 2);
const ternaryHeap = a => heapRange(a, 0, a.length, 3);

/* ---------- digits ---------- */

// LSD radix in base 4, stable, by moves.
// Each pass gathers digit 0, then 1, then 2 at the front; digit 3 stays last.
function* radix(a) {
  const max = Math.max(...a);
  for (let shift = 0; (max >> shift) > 0; shift += 2) {
    let p = 0;
    for (let d = 0; d < 3; d++) {
      for (let k = p; k < a.length; k++) {
        yield read(k);
        if (((a[k] >> shift) & 3) === d) {
          if (k !== p) yield move(a, k, p);
          p++;
        }
      }
    }
  }
}

// MSD radix in base 4: sort by the top digit, then each bucket by the next.
function* msd(a) {
  function* go(lo, hi, shift) {
    if (hi - lo < 2 || shift < 0) return;
    const bounds = [lo];
    let p = lo;
    for (let d = 0; d < 3; d++) {
      for (let k = p; k < hi; k++) {
        yield read(k);
        if (((a[k] >> shift) & 3) === d) {
          if (k !== p) yield move(a, k, p);
          p++;
        }
      }
      bounds.push(p);
    }
    bounds.push(hi);
    for (let b = 0; b < 4; b++) yield* go(bounds[b], bounds[b + 1], shift - 2);
  }
  const max = Math.max(...a);
  let top = 0;
  while ((max >> (top + 2)) > 0) top += 2;
  yield* go(0, a.length, top);
}

/* ---------- networks ---------- */

// A fixed compare and exchange: the order of steps never depends on the bars.
function* exchange(a, i, j, up) {
  yield cmp(i, j);
  if ((a[i] > a[j]) === up) yield swap(a, i, j);
}

// Bitonic sort for any length: halves sort in opposite directions, then merge.
function* bitonic(a) {
  const pow2below = n => { let k = 1; while (k * 2 < n) k *= 2; return k; };
  function* mergeB(lo, n, up) {
    if (n < 2) return;
    const m = pow2below(n);
    for (let i = lo; i < lo + n - m; i++) yield* exchange(a, i, i + m, up);
    yield* mergeB(lo, m, up);
    yield* mergeB(lo + m, n - m, up);
  }
  function* sortB(lo, n, up) {
    if (n < 2) return;
    const m = n >> 1;
    yield* sortB(lo, m, !up);
    yield* sortB(lo + m, n - m, up);
    yield* mergeB(lo, n, up);
  }
  yield* sortB(0, a.length, true);
}

// Batcher's odd-even merge sort, for any length.
function* batcher(a) {
  const n = a.length;
  for (let p = 1; p < n; p *= 2) {
    for (let k = p; k >= 1; k = Math.floor(k / 2)) {
      for (let j = k % p; j + k < n; j += 2 * k) {
        for (let i = 0; i < k && i + j + k < n; i++) {
          if (Math.floor((i + j) / (2 * p)) === Math.floor((i + j + k) / (2 * p))) yield* exchange(a, i + j, i + j + k, true);
        }
      }
    }
  }
}

/* ---------- slow ---------- */

// Sorts the first two thirds, the last two thirds, then the first two thirds again.
function* stooge(a, lo = 0, hi = a.length - 1) {
  yield cmp(lo, hi);
  if (a[lo] > a[hi]) yield swap(a, lo, hi);
  if (hi - lo + 1 >= 3) {
    const t = Math.floor((hi - lo + 1) / 3);
    yield* stooge(a, lo, hi - t);
    yield* stooge(a, lo + t, hi);
    yield* stooge(a, lo, hi - t);
  }
}

// Multiply and surrender: find the top bar, put it last, sort the rest the same way.
function* slow(a, i = 0, j = a.length - 1) {
  if (i >= j) return;
  const m = (i + j) >> 1;
  yield* slow(a, i, m);
  yield* slow(a, m + 1, j);
  yield cmp(m, j);
  if (a[m] > a[j]) yield swap(a, m, j);
  yield* slow(a, i, j - 1);
}

/* ---------- the list ---------- */

// The picker's order and groups. Keys 1 to 6 stay on the first six algorithms.
export const LIST = [
  ['bubble', 'Bubble', 'Exchange', '1'],
  ['cocktail', 'Cocktail shaker', 'Exchange'],
  ['oddeven', 'Odd-even', 'Exchange'],
  ['comb', 'Comb', 'Exchange'],
  ['gnome', 'Gnome', 'Exchange'],
  ['circle', 'Circle', 'Exchange'],
  ['insertion', 'Insertion', 'Insertion', '2'],
  ['binary', 'Binary insertion', 'Insertion'],
  ['shell', 'Shell', 'Insertion'],
  ['selection', 'Selection', 'Selection'],
  ['double', 'Double selection', 'Selection'],
  ['cycle', 'Cycle', 'Selection'],
  ['pancake', 'Pancake', 'Selection'],
  ['merge', 'Merge', 'Merge', '4'],
  ['bottomup', 'Bottom-up merge', 'Merge'],
  ['natural', 'Natural merge', 'Merge'],
  ['quick', 'Quick', 'Quick', '3'],
  ['hoare', 'Hoare quick', 'Quick'],
  ['dualpivot', 'Dual-pivot quick', 'Quick'],
  ['threeway', 'Three-way quick', 'Quick'],
  ['intro', 'Introsort', 'Quick'],
  ['heap', 'Heap', 'Heap', '5'],
  ['ternary', 'Ternary heap', 'Heap'],
  ['radix', 'LSD radix', 'Digits', '6'],
  ['msd', 'MSD radix', 'Digits'],
  ['bitonic', 'Bitonic', 'Networks'],
  ['batcher', 'Odd-even merge', 'Networks'],
  ['stooge', 'Stooge', 'Slow'],
  ['slow', 'Slowsort', 'Slow'],
];
export const ALGOS = {
  bubble, cocktail, oddeven: oddEven, comb, gnome, circle,
  insertion, binary: binaryInsertion, shell,
  selection, double: doubleSelection, cycle, pancake,
  merge, bottomup: bottomUp, natural,
  quick, hoare, dualpivot: dualPivot, threeway: threeWay, intro,
  heap, ternary: ternaryHeap,
  radix, msd,
  bitonic, batcher,
  stooge, slow,
};
export const NAMES = Object.fromEntries(LIST.map(([k, name]) => [k, name]));

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
