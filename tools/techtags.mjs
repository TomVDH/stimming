// Derives each toy's renderer tags from its code. Prints JSON; writes nothing.
// Usage: node tools/techtags.mjs [--table] [id ...]
// Plan: docs/plans/access.md, section "Tech tags". Bean stimming-9ex4.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
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

if (table) {
  const count = {};
  for (const t of Object.values(out)) if (t) count[t.tier + (t.webgpu ? '+webgpu' : '')] = (count[t.tier + (t.webgpu ? '+webgpu' : '')] || 0) + 1;
  for (const [id, t] of Object.entries(out)) console.log(`${id.padEnd(16)} ${t ? `${t.tier}${t.webgpu ? ' +webgpu' : ''}${t.also.length ? `  (also ${t.also.join(', ')})` : ''}` : 'no files'}`);
  console.log('\n' + JSON.stringify(count));
} else {
  console.log(JSON.stringify(out, null, 2));
}
