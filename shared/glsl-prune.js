// @ts-check
// Shared: prunes GLSL to the functions a program can reach.
// The D3D11 compiler (FXC) pays for every function, called or not.
// A large scene split into passes gives each pass only its own code.

const ID = /[A-Za-z_]\w*/g;
const SIG = /([A-Za-z_]\w*)\s*\([^()]*\)\s*$/;
const PROTO = /^\s*[A-Za-z_]\w*(?:\s+[A-Za-z_]\w*)*\s+([A-Za-z_]\w*)\s*\([^=;]*\)\s*;\s*$/;

/**
 * Splits GLSL into top-level parts: preprocessor lines, statements and functions.
 * @param {string} text GLSL with its comments removed.
 * @returns {{ text: string, fn?: string, proto?: string }[]}
 */
function split(text) {
  /** @type {{ text: string, fn?: string, proto?: string }[]} */
  const parts = [];
  let i = 0, start = 0, depth = 0, head = '';
  const n = text.length;
  const push = (end, extra = {}) => {
    const t = text.slice(start, end).trim();
    if (t) parts.push({ text: t, ...extra });
    start = end;
    head = '';
  };
  while (i < n) {
    const ch = text[i];
    // A preprocessor line is one part, at the top level only.
    if (depth === 0 && ch === '#' && text.slice(start, i).trim() === '') {
      const end = text.indexOf('\n', i);
      i = end < 0 ? n : end;
      push(i);
      continue;
    }
    if (ch === '{') {
      if (depth === 0) head = text.slice(start, i);
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const m = head.match(SIG);
        // A body after a signature is a function; a struct waits for its ';'.
        if (m) { push(i + 1, { fn: m[1] }); i++; continue; }
      }
    } else if (ch === ';' && depth === 0) {
      const t = text.slice(start, i + 1);
      const m = !t.includes('=') && t.match(PROTO);
      push(i + 1, m ? { proto: m[1] } : {});
      i++;
      continue;
    }
    i++;
  }
  push(n);
  return parts;
}

/**
 * Keeps every declaration, and the functions that the roots reach.
 * Overloads share a name, so a call keeps them all.
 * @param {string} src GLSL source.
 * @param {string[]} [roots] Function names to start from.
 * @returns {string}
 */
export function pruneGLSL(src, roots = ['main']) {
  const text = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, '');
  const parts = split(text);
  /** @type {Map<string, number[]>} */
  const named = new Map();
  const add = (/** @type {string} */ k, /** @type {number} */ i) => { const l = named.get(k); if (l) l.push(i); else named.set(k, [i]); };
  parts.forEach((p, i) => { if (p.fn) add(p.fn, i); else if (p.proto) add(p.proto, i); });
  const keep = new Set();
  const queue = [...roots];
  // A declaration can call a function too: in an initializer or a macro.
  parts.forEach((p, i) => { if (!p.fn && !p.proto) { keep.add(i); queue.push(...(p.text.match(ID) || [])); } });
  const seen = new Set();
  while (queue.length) {
    const k = /** @type {string} */ (queue.pop());
    if (seen.has(k)) continue;
    seen.add(k);
    for (const i of named.get(k) || []) {
      keep.add(i);
      if (parts[i].fn) queue.push(...(parts[i].text.match(ID) || []));
    }
  }
  return parts.filter((_, i) => keep.has(i)).map(p => p.text).join('\n');
}
