// The simulator's WebGL2 renderer.
// Pass 1 adds every body's light into a float target.
// The eyepiece shows that target through the eye, straight to the canvas.
// The camera stacks noisy subs on a virtual monitor.
// The software draws over them.
// The monitor pass then shows that screen in a dark room.
import quadVert from './shaders/quad.vert.glsl';
import bodyVert from './shaders/body.vert.glsl';
import bodyFrag from './shaders/body.frag.glsl';
import skyChunk from './shaders/sky.glsl';
import eyeFrag from './shaders/eye.frag.glsl';
import stackFrag from './shaders/stack.frag.glsl';
import cameraFrag from './shaders/camera.frag.glsl';
import uiFrag from './shaders/ui.frag.glsl';
import monitorFrag from './shaders/monitor.frag.glsl';

// Floats per body instance: pos (4), colour (4), shape (4).
export const STRIDE = 12;
export const PROBE_W = 120;
export const PROBE_H = 80;

type Uniform = number | readonly number[];
type Prog = { p: WebGLProgram; loc: Map<string, WebGLUniformLocation | null> };
type Target = { tex: WebGLTexture; fb: WebGLFramebuffer };

const HEAD = '#version 300 es\nprecision highp float;\n';

export class Renderer {
  readonly gl: WebGL2RenderingContext;
  private body: Prog;
  private eyeP: Prog;
  private stackP: Prog;
  private camP: Prog;
  private uiP: Prog;
  private monP: Prog;
  private vao: WebGLVertexArrayObject;
  private inst: WebGLBuffer;
  private light: Target | null = null;
  private acc: Target[] = [];
  private screenT: Target | null = null;
  private uiTex: WebGLTexture;
  private atlas: WebGLTexture;
  private ping = 0;
  private probe: Target | null = null;
  // Work size: the light and the stack; the virtual monitor in camera mode.
  w = 0;
  h = 0;
  // Canvas size in device px.
  cw = 0;
  ch = 0;
  levels = 1;

  constructor(readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error('webgl2');
    if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('float targets');
    this.gl = gl;
    this.body = this.prog(bodyVert, bodyFrag);
    this.eyeP = this.prog(quadVert, HEAD + skyChunk + eyeFrag);
    this.stackP = this.prog(quadVert, HEAD + skyChunk + stackFrag);
    this.camP = this.prog(quadVert, HEAD + skyChunk + cameraFrag);
    this.uiP = this.prog(quadVert, HEAD + uiFrag);
    this.monP = this.prog(quadVert, HEAD + monitorFrag);
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    const corners = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, corners);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.inst = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.inst);
    for (let i = 0; i < 3; i++) {
      gl.enableVertexAttribArray(1 + i);
      gl.vertexAttribPointer(1 + i, 4, gl.FLOAT, false, STRIDE * 4, i * 16);
      gl.vertexAttribDivisor(1 + i, 1);
    }
    gl.bindVertexArray(null);
    this.uiTex = this.plainTex(gl.LINEAR);
    this.atlas = this.plainTex(gl.LINEAR);
  }

  private plainTex(filter: number): WebGLTexture {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    return t;
  }

  private prog(vs: string, fs: string): Prog {
    const gl = this.gl;
    const sh = (type: number, src: string): WebGLShader => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
    return { p, loc: new Map() };
  }

  private use(pr: Prog, u: Record<string, Uniform>): void {
    const gl = this.gl;
    gl.useProgram(pr.p);
    for (const [k, v] of Object.entries(u)) {
      let l = pr.loc.get(k);
      if (l === undefined) {
        l = gl.getUniformLocation(pr.p, k);
        pr.loc.set(k, l);
      }
      if (!l) continue;
      if (typeof v === 'number') gl.uniform1f(l, v);
      else if (v.length === 2) gl.uniform2fv(l, v);
      else if (v.length === 3) gl.uniform3fv(l, v);
      else gl.uniform4fv(l, v);
    }
  }

  private target(w: number, h: number, format: number, levels: number, filter: number): Target {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, levels, format, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, levels > 1 ? gl.LINEAR_MIPMAP_LINEAR : filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fb };
  }

  private drop(t: Target | null): void {
    if (!t) return;
    this.gl.deleteTexture(t.tex);
    this.gl.deleteFramebuffer(t.fb);
  }

  // Sizes the canvas, and the work targets when the work size changes.
  resize(cw: number, ch: number, w: number, h: number): void {
    const gl = this.gl;
    if (cw !== this.cw || ch !== this.ch) {
      this.cw = cw;
      this.ch = ch;
      this.canvas.width = cw;
      this.canvas.height = ch;
    }
    if (w === this.w && h === this.h) return;
    this.w = w;
    this.h = h;
    this.drop(this.light);
    this.acc.forEach((t) => this.drop(t));
    this.drop(this.screenT);
    this.levels = Math.floor(Math.log2(Math.max(w, h))) + 1;
    this.light = this.target(w, h, gl.RGBA16F, this.levels, gl.LINEAR);
    this.acc = [this.target(w, h, gl.RGBA32F, 1, gl.NEAREST), this.target(w, h, gl.RGBA32F, 1, gl.NEAREST)];
    this.screenT = this.target(w, h, gl.RGBA8, this.levels, gl.LINEAR);
    if (!this.probe) this.probe = this.target(PROBE_W, PROBE_H, gl.RGBA32F, 1, gl.NEAREST);
  }

  // The grating's spectra: rows of temperature, columns of wavelength.
  setAtlas(data: Uint8Array, cols: number, rows: number): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.atlas);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, cols, rows, 0, gl.RED, gl.UNSIGNED_BYTE, data);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  }

  // Pass 1: every body's light, added.
  bodies(data: Float32Array, count: number, u: Record<string, Uniform>): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.light!.fb);
    gl.viewport(0, 0, this.w, this.h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (count > 0) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      this.bind(0, this.atlas, this.body, 'u_atlas');
      this.use(this.body, { ...u, u_res: [this.w, this.h] });
      gl.bindVertexArray(this.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.inst);
      gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, count * STRIDE), gl.DYNAMIC_DRAW);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
      gl.bindVertexArray(null);
      gl.disable(gl.BLEND);
    }
  }

  private screen(pr: Prog, u: Record<string, Uniform>, fb: WebGLFramebuffer | null, w = this.w, h = this.h): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.viewport(0, 0, w, h);
    this.use(pr, { ...u, u_res: [w, h] });
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private bind(unit: number, tex: WebGLTexture, pr: Prog, name: string): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.useProgram(pr.p);
    gl.uniform1i(gl.getUniformLocation(pr.p, name), unit);
  }

  // The eyepiece view, straight to the canvas; work size equals the canvas.
  eye(u: Record<string, Uniform>): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.light!.tex);
    gl.generateMipmap(gl.TEXTURE_2D);
    this.bind(0, this.light!.tex, this.eyeP, 'u_tex');
    this.screen(this.eyeP, u, null);
  }

  // One camera sub into the stack.
  stack(u: Record<string, Uniform>): void {
    const src = this.acc[this.ping], dst = this.acc[1 - this.ping];
    this.bind(0, this.light!.tex, this.stackP, 'u_tex');
    this.bind(1, src.tex, this.stackP, 'u_acc');
    this.screen(this.stackP, u, dst.fb);
    this.ping = 1 - this.ping;
  }

  // The stretched stack, onto the virtual monitor.
  camera(u: Record<string, Uniform>): void {
    this.bind(0, this.acc[this.ping].tex, this.camP, 'u_acc');
    this.screen(this.camP, u, this.screenT!.fb);
  }

  // The software's own drawing, over the image on the virtual monitor.
  // fresh uploads the canvas; otherwise the last upload stands.
  ui(src: HTMLCanvasElement | null): void {
    const gl = this.gl;
    if (src) {
      gl.bindTexture(gl.TEXTURE_2D, this.uiTex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    }
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this.bind(0, this.uiTex, this.uiP, 'u_ui');
    this.screen(this.uiP, {}, this.screenT!.fb);
    gl.disable(gl.BLEND);
  }

  // The monitor in its room, to the canvas.
  monitor(u: Record<string, Uniform>): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.screenT!.tex);
    gl.generateMipmap(gl.TEXTURE_2D);
    this.bind(0, this.screenT!.tex, this.monP, 'u_screen');
    this.screen(this.monP, { ...u, u_levels: this.levels }, null, this.cw, this.ch);
  }

  // A coarse grid of the stack, read back for the statistics.
  sample(rect: readonly number[]): Float32Array {
    const gl = this.gl;
    const out = new Float32Array(PROBE_W * PROBE_H * 4);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.acc[this.ping].fb);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.probe!.fb);
    const [x0, y0, x1, y1] = rect;
    gl.blitFramebuffer(Math.round(x0), Math.round(this.h - y1), Math.round(x1), Math.round(this.h - y0), 0, 0, PROBE_W, PROBE_H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.probe!.fb);
    gl.readPixels(0, 0, PROBE_W, PROBE_H, gl.RGBA, gl.FLOAT, out);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return out;
  }

  dispose(): void {
    const gl = this.gl;
    this.drop(this.light);
    this.acc.forEach((t) => this.drop(t));
    this.drop(this.screenT);
    this.drop(this.probe);
    gl.deleteTexture(this.uiTex);
    gl.deleteTexture(this.atlas);
    for (const pr of [this.body, this.eyeP, this.stackP, this.camP, this.uiP, this.monP]) gl.deleteProgram(pr.p);
    gl.deleteBuffer(this.inst);
    gl.deleteVertexArray(this.vao);
  }
}
