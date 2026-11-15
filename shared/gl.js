// Raw WebGL2 plumbing for shader toys: programs, targets, the full-screen triangle.
// It never imports three.js.
// Each call takes the toy's own context first.
//
// The usual boot:
//   const P = await linked(gl, { scene: program(gl, TRI_VS, SCENE_FS), final: program(gl, TRI_VS, FINAL_FS) });
//   const vao = gl.createVertexArray();
//   const a = target(gl, w, h);
//   gl.useProgram(P.final.p); bind(gl, P.final, 'uSrc', 0, a); tri(gl, null, vao);
//
// The parts:
//   program(gl, vs, fs)       compiles and links; it does not wait
//   linked(gl, set)           waits for the driver, checks each link, maps uniforms
//   uniforms(gl, prog)        maps every active uniform, arrays by their bare name
//   renderable(gl, format)    probes a 4 x 4 target of that format
//   target(gl, w, h, opts)    a texture and its framebuffer, with an optional depth buffer
//   msTarget(gl, w, h, n)     a multisampled colour and depth pair, for a blit
//   free(gl, t)               deletes a target, a pair or a multisampled target
//   bind(gl, prog, name, unit, t)  puts a texture on a unit and points the sampler at it
//   to(gl, dst), tri(gl, dst) draw to a target, or to the screen when dst is null
//   onContextLoss(canvas, h)  keeps a lost context restorable and calls the toy back

/**
 * A program and the locations of its uniforms.
 * @typedef {object} Prog
 * @property {WebGLProgram} p
 * @property {WebGLShader} v
 * @property {WebGLShader} f
 * @property {Record<string, WebGLUniformLocation>} u
 */

/**
 * A texture with its framebuffer.
 * @typedef {object} Target
 * @property {WebGLTexture} tex
 * @property {WebGLFramebuffer} fb
 * @property {WebGLRenderbuffer | null} depth
 * @property {number} w
 * @property {number} h
 */

/**
 * A multisampled colour and depth pair. It resolves into a Target by blit.
 * @typedef {object} MsTarget
 * @property {WebGLFramebuffer} fb
 * @property {WebGLRenderbuffer} color
 * @property {WebGLRenderbuffer} depth
 * @property {number} w
 * @property {number} h
 * @property {boolean} ok  True when the framebuffer is complete.
 */

/**
 * Two targets that swap roles each step: read from r, write to w.
 * @typedef {{ r: Target, w: Target }} Pair
 */

/**
 * @typedef {object} TargetOptions
 * @property {number} [format]  Internal format. Default RGBA16F.
 * @property {number} [filter]  Min and mag filter. Default LINEAR.
 * @property {boolean} [depth]  Adds a DEPTH_COMPONENT24 renderbuffer.
 * @property {boolean} [mips]   Allocates every mip level and filters between them.
 * @property {boolean} [clear]  Clears the new target to transparent black.
 * @property {boolean} [check]  Throws when the framebuffer is not complete.
 */

/**
 * @typedef {object} LinkOptions
 * @property {number} [limit]  Milliseconds to poll. After that, the link check blocks. Default: no limit.
 * @property {() => Promise<unknown>} [wait]  One poll step. Default nextFrame.
 */

/**
 * @typedef {object} LossHandlers
 * @property {() => void} [lost]  Runs when the context goes. Stop the frame loop here.
 * @property {() => unknown} [restored]  Runs when a new context arrives. Rebuild every GL object here.
 * @property {(err: unknown) => void} [failed]  Runs when restored throws or rejects.
 */

// The full-screen triangle: three vertices from gl_VertexID, no buffer.
// vUv runs from 0 to 1 over the screen.
export const TRI_VS = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/** One animation frame, as a promise. */
export const nextFrame = () => new Promise(r => requestAnimationFrame(r));

/**
 * Compiles two shaders and links them.
 * It reads no status, so the driver can link in parallel.
 * @param {WebGL2RenderingContext} gl
 * @param {string} vs
 * @param {string} fs
 * @param {string[]} [attrs]  Attribute names, bound to locations 0, 1, 2 in order.
 * @returns {Prog}
 */
export function program(gl, vs, fs, attrs = []) {
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const p = gl.createProgram(), v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  attrs.forEach((name, i) => gl.bindAttribLocation(p, i, name));
  gl.linkProgram(p);
  return { p, v, f, u: {} };
}

/**
 * Maps every active uniform to its location.
 * An array maps by its bare name, without [0].
 * @param {WebGL2RenderingContext} gl
 * @param {Prog} prog
 * @returns {Prog}
 */
export function uniforms(gl, prog) {
  const n = gl.getProgramParameter(prog.p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const name = gl.getActiveUniform(prog.p, i).name;
    prog.u[name.replace(/\[0\]$/, '')] = gl.getUniformLocation(prog.p, name);
  }
  return prog;
}

/**
 * Waits for the driver to link a set of programs.
 * Then it checks each link and maps the uniforms.
 * A failed link throws the first shader log.
 * @template {Record<string, Prog>} S
 * @param {WebGL2RenderingContext} gl
 * @param {S} set
 * @param {LinkOptions} [options]
 * @returns {Promise<S>}
 */
export async function linked(gl, set, { limit = Infinity, wait = nextFrame } = {}) {
  const par = gl.getExtension('KHR_parallel_shader_compile');
  const all = Object.values(set), t0 = performance.now();
  // Polling lets the driver link off the main thread.
  if (par) while (!gl.isContextLost() && performance.now() - t0 < limit && !all.every(q => gl.getProgramParameter(q.p, par.COMPLETION_STATUS_KHR))) await wait();
  for (const q of all) {
    if (!gl.getProgramParameter(q.p, gl.LINK_STATUS)) throw new Error(gl.getShaderInfoLog(q.f) || gl.getShaderInfoLog(q.v) || gl.getProgramInfoLog(q.p) || 'link failed');
    uniforms(gl, q);
  }
  return set;
}

/**
 * Tells if the driver can draw into a texture of this format.
 * @param {WebGL2RenderingContext} gl
 * @param {number} format  A sized internal format, for example gl.RGBA16F.
 */
export function renderable(gl, format) {
  const t = gl.createTexture(), fb = gl.createFramebuffer();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texStorage2D(gl.TEXTURE_2D, 1, format, 4, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteFramebuffer(fb);
  gl.deleteTexture(t);
  return ok;
}

/**
 * A colour target: an immutable texture and its framebuffer.
 * The texture clamps at its edges.
 * The framebuffer stays bound when the call returns.
 * @param {WebGL2RenderingContext} gl
 * @param {number} w
 * @param {number} h
 * @param {TargetOptions} [options]
 * @returns {Target}
 */
export function target(gl, w, h, { format = gl.RGBA16F, filter = gl.LINEAR, depth = false, mips = false, clear = false, check = false } = {}) {
  const tex = gl.createTexture();
  const levels = mips ? Math.floor(Math.log2(Math.max(w, h))) + 1 : 1;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texStorage2D(gl.TEXTURE_2D, levels, format, w, h);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  let rb = null;
  if (depth) {
    rb = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
  }
  if (check && gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('target format is not renderable');
  if (clear) {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  return { tex, fb, depth: rb, w, h };
}

/**
 * A multisampled colour and depth pair.
 * Blit it into a Target of the same size.
 * Read `ok` before use: some drivers refuse a multisampled float format.
 * @param {WebGL2RenderingContext} gl
 * @param {number} w
 * @param {number} h
 * @param {number} samples
 * @param {{ format?: number }} [options]
 * @returns {MsTarget}
 */
export function msTarget(gl, w, h, samples, { format = gl.RGBA16F } = {}) {
  const fb = gl.createFramebuffer(), color = gl.createRenderbuffer(), depth = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, color);
  gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, format, w, h);
  gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
  gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, w, h);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, color);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  return { fb, color, depth, w, h, ok };
}

/**
 * Deletes a target, a pair or a multisampled target.
 * Null does nothing.
 * @param {WebGL2RenderingContext} gl
 * @param {Target | MsTarget | Pair | null | undefined} t
 */
export function free(gl, t) {
  if (!t) return;
  if ('r' in t) { free(gl, t.r); free(gl, t.w); return; }
  if ('tex' in t) gl.deleteTexture(t.tex);
  if ('color' in t) gl.deleteRenderbuffer(t.color);
  if (t.depth) gl.deleteRenderbuffer(t.depth);
  gl.deleteFramebuffer(t.fb);
}

/**
 * Binds a texture to a unit and points the sampler at that unit.
 * The program must be in use.
 * @param {WebGL2RenderingContext} gl
 * @param {Prog} prog
 * @param {string} name  The sampler uniform.
 * @param {number} unit
 * @param {Target | WebGLTexture} t  A target or a bare texture.
 */
export function bind(gl, prog, name, unit, t) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, 'tex' in t ? t.tex : t);
  gl.uniform1i(prog.u[name], unit);
}

/**
 * Binds a target's framebuffer and fits the viewport to it.
 * Null means the screen, at the canvas size.
 * @param {WebGL2RenderingContext} gl
 * @param {{ fb: WebGLFramebuffer, w: number, h: number } | null} dst
 */
export function to(gl, dst) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.fb : null);
  gl.viewport(0, 0, dst ? dst.w : gl.canvas.width, dst ? dst.h : gl.canvas.height);
}

/**
 * Draws the full-screen triangle into a target.
 * Null means the screen.
 * Pass an empty vertex array, or bind one before the call.
 * @param {WebGL2RenderingContext} gl
 * @param {{ fb: WebGLFramebuffer, w: number, h: number } | null} dst
 * @param {WebGLVertexArrayObject | null} [vao]
 */
export function tri(gl, dst, vao = null) {
  to(gl, dst);
  if (vao) gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

/**
 * Keeps a lost context restorable and calls the toy back.
 * Every GL object and extension dies with the context.
 * Restored must get the extensions and build every GL object again.
 * @param {HTMLCanvasElement} canvas
 * @param {LossHandlers} handlers
 * @returns {() => void}  Removes both listeners.
 */
export function onContextLoss(canvas, { lost, restored, failed = err => console.error(err) }) {
  /** @param {Event} e */
  const onLost = e => {
    // Without preventDefault the browser never gives the context back.
    e.preventDefault();
    lost?.();
  };
  const onRestored = async () => {
    try { await restored?.(); } catch (err) { failed(err); }
  };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  return () => {
    canvas.removeEventListener('webglcontextlost', onLost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
  };
}
