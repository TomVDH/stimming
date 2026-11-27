// Ear clipping for simple polygons. Shared by the page and the pack script.
// Input: flat [x0, y0, x1, y1, ...]. Output: triangle corner indices.
export function earclip(p) {
  const n = p.length >> 1;
  const idx = [];
  if (n < 3) return idx;
  // Orient counter-clockwise, then clip ears.
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += p[i * 2] * p[j * 2 + 1] - p[j * 2] * p[i * 2 + 1];
  }
  const prev = new Int32Array(n), next = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const a = area >= 0 ? i : n - 1 - i;
    prev[a] = area >= 0 ? (i + n - 1) % n : (n - 1 - ((i + n - 1) % n));
    next[a] = area >= 0 ? (i + 1) % n : (n - 1 - ((i + 1) % n));
  }
  // For a clockwise polygon the walk runs backward through the same indices.
  if (area < 0) for (let i = 0; i < n; i++) { prev[i] = (i + 1) % n; next[i] = (i + n - 1) % n; }
  else for (let i = 0; i < n; i++) { prev[i] = (i + n - 1) % n; next[i] = (i + 1) % n; }
  const X = i => p[i * 2], Y = i => p[i * 2 + 1];
  const cross = (a, b, c) => (X(b) - X(a)) * (Y(c) - Y(a)) - (Y(b) - Y(a)) * (X(c) - X(a));
  const inside = (a, b, c, q) => cross(a, b, q) >= 0 && cross(b, c, q) >= 0 && cross(c, a, q) >= 0;
  let left = n, v = 0, guard = 0;
  while (left > 3 && guard++ < n * n + 8) {
    const a = prev[v], c = next[v];
    let ear = cross(a, v, c) > 0;
    if (ear) {
      for (let q = next[c]; q !== a; q = next[q]) {
        if ((X(q) === X(a) && Y(q) === Y(a)) || (X(q) === X(c) && Y(q) === Y(c)) || (X(q) === X(v) && Y(q) === Y(v))) continue;
        if (inside(a, v, c, q)) { ear = false; break; }
      }
    }
    if (ear) {
      idx.push(a, v, c);
      next[a] = c; prev[c] = a; left--; v = c;
      guard = 0;
    } else v = next[v];
  }
  // A stuck polygon (self-touching) falls back to a fan of what remains.
  if (left >= 3) {
    const s = v;
    for (let q = next[s]; next[q] !== s; q = next[q]) idx.push(s, q, next[q]);
  }
  return idx;
}
