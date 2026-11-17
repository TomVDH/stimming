// Maps each CDN URL import to the types of its pinned dev package.
// Keep each URL equal to the importmap text in AGENTS.md.
declare module 'https://cdn.jsdelivr.net/npm/culori@4.0.1/+esm' {
  export * from 'culori';
}

// esbuild loads a .glsl import as its source text.
declare module '*.glsl' {
  const source: string;
  export default source;
}
