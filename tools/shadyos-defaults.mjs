// Writes shadyos/defaults.js from shadyos/content.yaml.
// The OS runs on defaults.js when content.yaml fails to parse.
// Run from the repo root: node tools/shadyos-defaults.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const URL_YAML = 'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.mjs';
// Node cannot import over https, so the module loads as a data URL.
const src = await (await fetch(URL_YAML)).text();
const { load } = await import(`data:text/javascript;base64,${Buffer.from(src).toString('base64')}`);
const data = load(readFileSync('shadyos/content.yaml', 'utf8'));
writeFileSync('shadyos/defaults.js', `// Built-in lines: a snapshot of content.yaml.\n// The OS runs on these when content.yaml fails.\n// Make it again after a content change: node tools/shadyos-defaults.mjs\nexport default ${JSON.stringify(data, null, 1)};\n`);
console.log('shadyos/defaults.js:', Object.keys(data).length, 'keys');
