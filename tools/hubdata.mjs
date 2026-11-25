// Refreshes the desk's data: run it when a toy folder or a renderer changes.
// Writes accesslab/hub.json (toy folders toys.json lacks) and the tech tags in accesslab/access-data.js.
// Usage: node tools/hubdata.mjs. Bean stimming-9ex4.
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const toys = JSON.parse(readFileSync(join(ROOT, 'toys.json'), 'utf8'));
// Folders with an index.html that are pages, not toys.
const PAGES = new Set(['shared', 'icons', 'docs', 'tools', 'tests', 'lab', 'credits', 'overview', 'node_modules', 'dist']);

const unlisted = readdirSync(ROOT, { withFileTypes: true })
  .filter(d => d.isDirectory() && !d.name.startsWith('.') && !PAGES.has(d.name) && !/lab$/.test(d.name) && !toys[d.name])
  .map(d => [d.name, join(ROOT, d.name, 'index.html')])
  .filter(([, f]) => existsSync(f))
  .map(([id, f]) => [id, readFileSync(f, 'utf8').match(/<title>([^<]*)/)?.[1]?.trim() || id]);
writeFileSync(join(ROOT, 'accesslab', 'hub.json'), JSON.stringify({ note: 'Written by tools/hubdata.mjs. Toy folders not in toys.json yet.', date: new Date().toISOString().slice(0, 10), unlisted }, null, 2) + '\n');

// The tech tags come from tools/techtags.mjs, packed onto one line.
const tech = JSON.parse(execFileSync(process.execPath, [join(ROOT, 'tools', 'techtags.mjs')], { encoding: 'utf8' }));
const pack = Object.entries(tech).map(([k, v]) => `${k}: ${JSON.stringify((v ? v.tier : 'dom') + (v?.webgpu ? '+gpu' : ''))}`).join(', ');
const dataFile = join(ROOT, 'accesslab', 'access-data.js');
writeFileSync(dataFile, readFileSync(dataFile, 'utf8').replace(/const PACK = \{[^}]*\};/, `const PACK = { ${pack} };`));

console.log(`${unlisted.length} unlisted: ${unlisted.map(u => u[0]).join(', ')}; ${Object.keys(tech).length} tech tags`);
