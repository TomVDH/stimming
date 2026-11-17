// esbuild loads a .glsl import as its source text.
declare module '*.glsl' {
  const source: string;
  export default source;
}
