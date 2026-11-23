// Builds every TypeScript toy: each <toy>/src/main.ts becomes <toy>/dist/main.js.
// Run: node tools/build.mjs          (build once, write to disk)
// Run: node tools/build.mjs --dev    (serve the repo on port 8000, rebuild on change)
import * as esbuild from 'esbuild';
import { readdirSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dev = process.argv.includes('--dev');
const port = Number(process.env.PORT || 8000);

// A toy is TypeScript when it has src/main.ts.
const toys = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'node_modules')
  .map((d) => d.name)
  .filter((name) => existsSync(join(root, name, 'src', 'main.ts')));

// Code outside the toy's src stays a separate file on the site.
// The import path is rewritten from the source file to the bundle.
const keepOutside = (toy) => ({
  name: 'keep-outside',
  setup(build) {
    const src = join(root, toy, 'src') + sep;
    build.onResolve({ filter: /^\.\.?\// }, (args) => {
      const abs = resolve(args.resolveDir, args.path);
      if (abs.startsWith(src)) return undefined;
      let path = relative(join(root, toy, 'dist'), abs).split(sep).join('/');
      if (!path.startsWith('.')) path = './' + path;
      return { path, external: true };
    });
  },
});

const options = (toy) => ({
  entryPoints: [join(root, toy, 'src', 'main.ts')],
  outfile: join(root, toy, 'dist', 'main.js'),
  bundle: true,
  format: 'esm',
  target: 'es2022',
  // Bare imports resolve through the page's importmap.
  external: ['three', 'three/*', 'culori', 'tone', 'gsap', 'simplex-noise'],
  loader: { '.glsl': 'text' },
  sourcemap: dev ? 'inline' : false,
  legalComments: 'none',
  logLevel: 'info',
  plugins: [keepOutside(toy)],
});

if (!toys.length) console.log('No TypeScript toys found.');

// A toy may build more pages than main.ts: each extra entry writes <toy>/dist/<name>.js.
const extras = { observatory: ['viewer', 'sim/main', 'viewer-modern'] };
const extraOptions = (toy, name) => ({
  ...options(toy),
  entryPoints: [join(root, toy, 'src', `${name}.ts`)],
  outfile: join(root, toy, 'dist', `${name}.js`),
});
const builds = [
  ...toys.map((toy) => options(toy)),
  ...Object.entries(extras).flatMap(([toy, names]) => names.map((name) => extraOptions(toy, name))),
];

if (!dev) {
  await Promise.all(builds.map((o) => esbuild.build(o)));
} else {
  const contexts = await Promise.all(builds.map((o) => esbuild.context(o)));
  await Promise.all(contexts.map((c) => c.watch()));
  // One context serves the whole repo; every context writes its bundle to disk.
  const first = contexts[0] ?? (await esbuild.context({ logLevel: 'info' }));
  // The server listens on this machine only.
  const { port: p } = await first.serve({ servedir: root, port, host: '127.0.0.1' });
  console.log(`Serving ${root} on http://localhost:${p}/`);
}
