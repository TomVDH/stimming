// Water wheel renderer: raw WebGL2.
// The static layer paints once per size; each frame draws wheels, water and the grade.
import { TRI_VS, program, linked, target, free, bind, tri } from '../shared/gl.js';
import { bloomChain } from '../shared/glow.js';
import { BASE, WHEEL_VS, WHEEL_FS, SPLAT_VS, SPLAT_FS, WATER, RAYS, FINAL } from './shaders.js';

// Linear light colours: the low evening sun, the dusk sky, the warm horizon.
export const SUN_COL = [3.2, 1.7, 0.75];
const SKY_COL = [0.035, 0.045, 0.085], LOW_COL = [0.5, 0.22, 0.09];
const MAX_LEVEL = 48;

export async function makeRender(gl) {
  if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('no float targets');
  const P = await linked(gl, {
    base: program(gl, TRI_VS, BASE), wheel: program(gl, WHEEL_VS, WHEEL_FS),
    splat: program(gl, SPLAT_VS, SPLAT_FS, ['aP']), water: program(gl, TRI_VS, WATER), rays: program(gl, TRI_VS, RAYS), final: program(gl, TRI_VS, FINAL),
  });
  const vao = gl.createVertexArray();
  const pvao = gl.createVertexArray(), pbuf = gl.createBuffer();
  gl.bindVertexArray(pvao);
  gl.bindBuffer(gl.ARRAY_BUFFER, pbuf);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);
  gl.bindVertexArray(null);
  let pdata = new Float32Array(4 * 4096);
  const bloom = bloomChain(gl, { max: 5 });
  const staticTex = gl.createTexture();
  const paint = document.createElement('canvas');
  let base = null, scene = null, out = null, dens = null, rays = null;
  let W = 0, H = 0, dpr = 1, cssW = 1, cssH = 1, L = null, sunW = [0, 0], densDiv = 2;
  const levels = new Float32Array(MAX_LEVEL);

  // World to clip space: x, y scale, then x, y offset.
  const xf = () => {
    const { s, ox, oy } = L.view;
    return [(2 * s) / cssW, (2 * s) / cssH, (2 * ox) / cssW - 1, 1 - (2 * oy) / cssH];
  };
  const sunUv = () => { const { s, ox, oy } = L.view; return [(ox + sunW[0] * s) / cssW, 1 - (oy - sunW[1] * s) / cssH]; };

  function resize(w, h, ratio, layout, { lowDens = false } = {}) {
    W = Math.max(2, Math.round(w * ratio)); H = Math.max(2, Math.round(h * ratio));
    dpr = ratio; cssW = w; cssH = h; L = layout;
    densDiv = lowDens ? 4 : 2;
    gl.canvas.width = W; gl.canvas.height = H;
    [base, scene, out, dens, rays].forEach(t => free(gl, t));
    base = target(gl, W, H);
    scene = target(gl, W, H);
    out = target(gl, W, H);
    dens = target(gl, Math.ceil(W / densDiv), Math.ceil(H / densDiv), { clear: true });
    rays = target(gl, Math.ceil(W / 2), Math.ceil(H / 2), { clear: true });
    const w0 = L.wheels[0];
    // The sun stands behind the top wheel, so it shows between the arms.
    sunW = [w0.cx - 0.42 * w0.R, w0.cy + 0.36 * w0.R];
    paintStatic();
    // The sky and the static layer draw once into the base.
    const b = P.base;
    gl.useProgram(b.p);
    bind(gl, b, 'uStatic', 0, staticTex);
    gl.uniform2fv(b.u.uSunUv, sunUv());
    gl.uniform2f(b.u.uAsp, cssW / cssH, 1);
    gl.uniform3fv(b.u.uSunCol, SUN_COL);
    gl.uniform3fv(b.u.uSkyCol, SKY_COL);
    gl.uniform3fv(b.u.uLowCol, LOW_COL);
    gl.disable(gl.BLEND);
    tri(gl, base, vao);
  }

  /* ---------- the static layer ---------- */
  function paintStatic() {
    paint.width = W; paint.height = H;
    const c = paint.getContext('2d');
    const { s, ox, oy } = L.view, k = dpr;
    const X = x => (ox + x * s) * k, Y = y => (oy - y * s) * k;
    const E = L.edge, w0 = L.wheels[0];
    c.clearRect(0, 0, W, H);
    const noise = (x, f, seed) => Math.sin(x * f + seed) * 0.5 + Math.sin(x * f * 2.3 + seed * 1.7) * 0.25 + Math.sin(x * f * 5.1 + seed * 0.3) * 0.1;
    const ridge = (y0, amp, f, seed, fill) => {
      c.beginPath();
      c.moveTo(0, H);
      for (let px = 0; px <= W + 8; px += 8) {
        const x = (px / k - ox) / s;
        c.lineTo(px, Y(y0 + amp * noise(x, f, seed)));
      }
      c.lineTo(W, H);
      c.closePath();
      c.fillStyle = fill;
      c.fill();
    };
    // Far ridges sit under the sun, soft in the haze.
    ridge(sunW[1] - 0.9, 0.45, 0.35, 1.3, 'rgba(120, 64, 42, 0.5)');
    ridge(sunW[1] - 2.2, 0.6, 0.5, 4.1, 'rgba(58, 34, 28, 0.85)');

    // The near bank: steps down under the wheels, or one slope on a tall stage.
    const bank = [];
    const head = L.floors[0];
    const floorAt = (f, x) => {
      for (const sg of f.segs) if (x >= sg.lo && x <= sg.hi) return sg.ay + (sg.by - sg.ay) * ((x - sg.ax) / (sg.bx - sg.ax));
      return f.pts[0][1];
    };
    const T = 0.1;
    // The bank carries each flume where it can, so few flumes need trestles.
    const step0 = w0.cx - w0.R - 0.3;
    bank.push([E.left - 1, floorAt(head, E.left - 1) - T], [step0, floorAt(head, step0) - T]);
    if (!L.tall) {
      L.wheels.forEach((w, i) => {
        const f = L.floors[i + 1];
        const at = i ? w.cx - w.R - 0.3 : step0;
        const prevY = bank[bank.length - 1][1];
        const ledge = f.pts[0][1] - T;
        if (i) bank.push([at, prevY]);
        bank.push([at + 0.25, ledge]);
        const knee = f.pts.length > 2 ? f.pts[1][0] : f.pts[0][0] + f.flow * 1.5 * w.R;
        bank.push([knee, floorAt(f, knee) - T]);
      });
      bank.push([E.right + 1, bank[bank.length - 1][1] - 0.2]);
    } else {
      const last = L.floors[L.floors.length - 1];
      bank.push([E.right + 1, last.pts[0][1] - 0.9]);
    }
    const bankY = x => {
      for (let i = 0; i < bank.length - 1; i++) {
        const [ax, ay] = bank[i], [bx, by] = bank[i + 1];
        if (x >= ax && x <= bx) return ay + (by - ay) * ((x - ax) / Math.max(1e-6, bx - ax));
      }
      return bank[bank.length - 1][1];
    };
    // Stone piers carry each axle.
    c.fillStyle = 'rgb(30, 23, 21)';
    for (const w of L.wheels) {
      const hw = 0.13 * w.R, top = w.cy + 0.06, foot = Math.min(bankY(w.cx), w.cy - w.R - 0.6) - 0.3;
      c.beginPath();
      c.moveTo(X(w.cx - hw), Y(top)); c.lineTo(X(w.cx + hw), Y(top));
      c.lineTo(X(w.cx + hw * 1.6), Y(foot)); c.lineTo(X(w.cx - hw * 1.6), Y(foot));
      c.closePath(); c.fill();
    }
    c.beginPath();
    c.moveTo(X(bank[0][0]), H + 4);
    bank.forEach(([x, y]) => c.lineTo(X(x), Y(y)));
    c.lineTo(X(bank[bank.length - 1][0]), H + 4);
    c.closePath();
    const g = c.createLinearGradient(0, Y(bank[0][1]), 0, H);
    g.addColorStop(0, 'rgb(34, 25, 22)'); g.addColorStop(1, 'rgb(14, 11, 11)');
    c.fillStyle = g; c.fill();
    // The sun is behind the bank: its top edges take a warm rim.
    c.beginPath();
    bank.forEach(([x, y], i) => (i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y))));
    c.strokeStyle = 'rgba(255, 168, 96, 0.55)';
    c.lineWidth = 1.6 * k;
    c.stroke();

    // Flumes: boards with an end wall, on trestles where they cross a gap.
    for (const f of L.floors) {
      const [ax, ay] = f.pts[0];
      for (const sg of f.segs) {
        const n = Math.max(1, Math.floor(Math.abs(sg.bx - sg.ax) / 1.3));
        c.fillStyle = 'rgb(26, 17, 12)';
        for (let i = 1; i <= n; i++) {
          const x = sg.ax + ((sg.bx - sg.ax) * (i - 0.5)) / n;
          const y = sg.ay + ((sg.by - sg.ay) * (i - 0.5)) / n - T;
          const foot = Math.max(bankY(x), y - 2.6);
          if (foot >= y - 0.05) continue;
          if (L.wheels.some(w => Math.abs(x - w.cx) < w.R + 0.05 && y > w.cy - w.R - 0.3 && foot < w.cy + w.R)) continue;
          c.fillRect(X(x) - 0.045 * s * k, Y(y), 0.09 * s * k, (y - foot) * s * k);
        }
      }
      c.beginPath();
      f.pts.forEach(([x, y], i) => (i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y))));
      for (let i = f.pts.length - 1; i >= 0; i--) c.lineTo(X(f.pts[i][0]), Y(f.pts[i][1] - T));
      c.closePath();
      c.fillStyle = 'rgb(62, 38, 23)';
      c.fill();
      // The end wall stands up from the floor.
      const wx = X(ax), wd = 0.08 * s * k * -f.flow;
      c.fillRect(Math.min(wx, wx + wd), Y(ay + 0.28), Math.abs(wd), 0.28 * s * k + T * s * k);
      c.beginPath();
      f.pts.forEach(([x, y], i) => (i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y))));
      c.strokeStyle = 'rgba(255, 184, 110, 0.5)';
      c.lineWidth = 1.2 * k;
      c.stroke();
    }

    gl.bindTexture(gl.TEXTURE_2D, staticTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, paint);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    paint.width = paint.height = 1;
  }

  /* ---------- each frame ---------- */
  // The water line in each bucket, in world y, from its fill.
  function bucketLevels(sim, w) {
    const st = (2 * Math.PI) / w.n, rIn = w.R - w.D, rOut = w.R - 0.01;
    levels.fill(-1e4);
    for (let k = 0; k < w.n && k < MAX_LEVEL; k++) {
      const f = w.fill[k];
      if (f < 0.15) continue;
      const a0 = k * st + w.ang, a1 = (k + 1) * st + w.ang, lean = w.dir * 0.45 * st;
      // The four corners: two on the sole, two at the rim.
      const ys = [rIn * Math.cos(a0), rIn * Math.cos(a1), rOut * Math.cos(a0 - lean), rOut * Math.cos(a1 - lean)].map(y => w.cy + y);
      const low = Math.min(...ys);
      const mouth = Math.min(ys[2], ys[3]);
      const hold = Math.max(0.03, mouth - low + 0.02);
      levels[k] = low + hold * Math.min(1, Math.pow(f / Math.max(1, sim.cap(w, k)), 0.32));
    }
    return levels;
  }

  function frame(sim, { frameNo = 0, frozen = false, bloomLevels = 5 } = {}) {
    if (!base) return;
    const X = xf(), { s } = L.view;
    // The base is the backdrop of every frame.
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, base.fb);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, scene.fb);
    gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.NEAREST);

    // Wheels, over the base.
    const p = P.wheel;
    gl.useProgram(p.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.fb);
    gl.viewport(0, 0, W, H);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(vao);
    gl.uniform4fv(p.u.uXf, X);
    gl.uniform2fv(p.u.uSun, sunW);
    gl.uniform3fv(p.u.uSunCol, SUN_COL);
    gl.uniform3fv(p.u.uSkyCol, SKY_COL);
    gl.uniform1f(p.u.uPx, 1 / (s * dpr));
    for (const w of sim.wheels) {
      gl.uniform2f(p.u.uC, w.cx, w.cy);
      gl.uniform1f(p.u.uR, w.R);
      gl.uniform1f(p.u.uD, w.D);
      gl.uniform1f(p.u.uN, w.n);
      gl.uniform1f(p.u.uArms, w.arms);
      gl.uniform1f(p.u.uAng, w.ang);
      gl.uniform1f(p.u.uDir, w.dir);
      gl.uniform1f(p.u.uWet, w.wet);
      gl.uniform1fv(p.u.uLevel, bucketLevels(sim, w));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    // Water: splats into the density field.
    const P0 = sim.P, S0 = sim.S;
    const need = Math.max(P0.n, S0.n) * 4;
    if (pdata.length < need) pdata = new Float32Array(need * 2);
    for (let j = 0; j < P0.n; j++) {
      const o = j * 4;
      pdata[o] = P0.x[j]; pdata[o + 1] = P0.y[j]; pdata[o + 2] = P0.foam[j]; pdata[o + 3] = 1;
    }
    const sp = P.splat;
    gl.useProgram(sp.p);
    gl.uniform4fv(sp.u.uXf, X);
    gl.bindVertexArray(pvao);
    gl.bindBuffer(gl.ARRAY_BUFFER, pbuf);
    gl.bufferData(gl.ARRAY_BUFFER, pdata.subarray(0, P0.n * 4), gl.DYNAMIC_DRAW);
    gl.bindFramebuffer(gl.FRAMEBUFFER, dens.fb);
    gl.viewport(0, 0, dens.w, dens.h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFunc(gl.ONE, gl.ONE);
    // A splat spans about a quarter metre.
    gl.uniform1f(sp.u.uSize, Math.max(3, (0.26 * s * dpr) / densDiv));
    gl.uniform1f(sp.u.uMode, 0);
    if (P0.n) gl.drawArrays(gl.POINTS, 0, P0.n);

    // The water pass composes the scene and the water into out.
    gl.disable(gl.BLEND);
    const wa = P.water;
    gl.useProgram(wa.p);
    bind(gl, wa, 'uScene', 0, scene);
    bind(gl, wa, 'uDens', 1, dens);
    gl.uniform2f(wa.u.uTexel, 1 / dens.w, 1 / dens.h);
    gl.uniform2fv(wa.u.uSunUv, sunUv());
    gl.uniform2f(wa.u.uAsp, cssW / cssH, 1);
    gl.uniform3fv(wa.u.uSunCol, SUN_COL);
    gl.uniform3fv(wa.u.uSkyCol, SKY_COL);
    tri(gl, out, vao);

    // Spray: sunlit glints, added on top.
    if (S0.n) {
      for (let j = 0; j < S0.n; j++) {
        const o = j * 4;
        pdata[o] = S0.x[j]; pdata[o + 1] = S0.y[j]; pdata[o + 2] = 0; pdata[o + 3] = S0.k[j] * Math.min(1, S0.life[j] * 3);
      }
      gl.useProgram(sp.p);
      gl.bindVertexArray(pvao);
      gl.bindBuffer(gl.ARRAY_BUFFER, pbuf);
      gl.bufferData(gl.ARRAY_BUFFER, pdata.subarray(0, S0.n * 4), gl.DYNAMIC_DRAW);
      gl.bindFramebuffer(gl.FRAMEBUFFER, out.fb);
      gl.viewport(0, 0, W, H);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.uniform1f(sp.u.uMode, 1);
      gl.uniform1f(sp.u.uSize, Math.max(2, 0.05 * s * dpr));
      gl.uniform3f(sp.u.uTint, SUN_COL[0] * 0.5, SUN_COL[1] * 0.5, SUN_COL[2] * 0.6);
      gl.drawArrays(gl.POINTS, 0, S0.n);
      gl.disable(gl.BLEND);
    }

    // Bloom, then sun shafts from the bloom, then the grade to the screen.
    const bt = bloom.render(out.tex, W, H, { threshold: 1.0, cap: 10, levels: bloomLevels });
    const ra = P.rays;
    gl.useProgram(ra.p);
    bind(gl, ra, 'uSrc', 0, bt);
    gl.uniform2fv(ra.u.uSunUv, sunUv());
    gl.uniform2f(ra.u.uAsp, cssW / cssH, 1);
    tri(gl, rays, vao);
    const f = P.final;
    gl.useProgram(f.p);
    bind(gl, f, 'uHdr', 0, out);
    bind(gl, f, 'uBloom', 1, bt);
    bind(gl, f, 'uRays', 2, rays);
    gl.uniform1f(f.u.uRaysK, 0.22);
    gl.uniform1f(f.u.uExpo, 0.8);
    gl.uniform1f(f.u.uBloomK, 0.3);
    gl.uniform1f(f.u.uFrame, frozen ? 0 : frameNo % 64);
    gl.uniform2f(f.u.uRes, W, H);
    tri(gl, null, vao);
  }

  // World point to stage CSS pixels.
  const toCss = (x, y) => [L.view.ox + x * L.view.s, L.view.oy - y * L.view.s];
  const toWorld = (px, py) => [(px - L.view.ox) / L.view.s, (L.view.oy - py) / L.view.s];

  return { resize, frame, toCss, toWorld, get sun() { return sunW; } };
}
