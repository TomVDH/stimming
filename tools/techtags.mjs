// Derives each toy's renderer tags from its code. Prints JSON.
// --write puts { tier, webgpu } in each toy's toys.json "tech" field, after "access".
// Usage: node tools/techtags.mjs [--table | --write] [id ...]
// Plan: docs/plans/access.md, section "Tech tags". Bean stimming-9ex4.
import { readFileSync, readdirSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const toys = JSON.parse(readFileSync(join(ROOT, 'toys.json'), 'utf8'));
const args = process.argv.slice(2);
const table = args.includes('--table');
const ids = args.filter(a => !a.startsWith('--'));

// Tiers from docs/stack.md, lightest first.
const TIERS = ['dom', 'canvas2d', 'webgl2', 'three'];
// Each test reads source text; a match turns the tag on.
const TESTS = {
  webgpu: /WebGPURenderer|['"]three\/webgpu['"]|navigator\.gpu/,
  three: /from\s*['"]three(\/[^'"]*)?['"]|import\(\s*['"]three/,
  // shared/gl.js and shared/environment.js are the raw WebGL2 kit.
  webgl2: /getContext\(\s*['"]webgl2['"]|shared\/(gl|environment)\.js/,
  canvas2d: /getContext\(\s*['"]2d['"]/,
};

// The toy's own files: the page, its scripts, its TypeScript source.
// dist/ is a build of src/, so the scan skips it.
function files(dir, depth = 0) {
  if (!existsSync(dir) || depth > 3) return [];
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === 'dist' || name === 'node_modules' ? [] : files(p, depth + 1);
    return ['.html', '.js', '.mjs', '.ts'].includes(extname(name)) && name !== 'legacy.html' ? [p] : [];
  });
}

function tags(id) {
  const text = files(join(ROOT, id)).map(f => readFileSync(f, 'utf8')).join('\n');
  if (!text) return null;
  const has = Object.fromEntries(Object.entries(TESTS).map(([k, re]) => [k, re.test(text)]));
  // The tier is the heaviest renderer the code reaches.
  const tier = [...TIERS].reverse().find(t => t === 'dom' || has[t]);
  return { tier, webgpu: has.webgpu, also: TIERS.filter(t => t !== tier && t !== 'dom' && has[t]) };
}

const out = {};
for (const id of ids.length ? ids : Object.keys(toys)) out[id] = tags(id);

if (args.includes('--write')) {
  // Field order: docs/standards/code.md. "access" and "tech" follow "sound".
  const next = {};
  for (const [id, toy] of Object.entries(toys)) {
    const t = out[id], entry = {};
    for (const [k, v] of Object.entries(toy)) {
      if (k === 'access' || k === 'tech') continue;
      entry[k] = v;
      if (k === 'sound') {
        entry.access = toy.access ?? null;
        entry.tech = t ? { tier: t.tier, webgpu: t.webgpu } : toy.tech ?? null;
      }
    }
    next[id] = entry;
  }
  writeFileSync(join(ROOT, 'toys.json'), JSON.stringify(next, null, 2) + '\n');
  console.log(`toys.json: tech for ${Object.values(out).filter(Boolean).length} toys`);
} else if (table) {
  const count = {};
  for (const t of Object.values(out)) if (t) count[t.tier + (t.webgpu ? '+webgpu' : '')] = (count[t.tier + (t.webgpu ? '+webgpu' : '')] || 0) + 1;
  for (const [id, t] of Object.entries(out)) console.log(`${id.padEnd(16)} ${t ? `${t.tier}${t.webgpu ? ' +webgpu' : ''}${t.also.length ? `  (also ${t.also.join(', ')})` : ''}` : 'no files'}`);
  console.log('\n' + JSON.stringify(count));
} else {
  console.log(JSON.stringify(out, null, 2));
}
