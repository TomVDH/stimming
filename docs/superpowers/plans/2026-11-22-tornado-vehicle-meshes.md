# Tornado alley vehicle meshes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Draw Tornado alley's three vehicles as rasterized meshes with today's look, so every vehicle program compiles in seconds on D3D11 and Windows gets its vehicles back.

**Architecture:** JS builds each kind's mesh at load from the hull and box tables in `traffic.js`. In `before()` the toy draws the vehicles into its own multisampled targets (behind and front of the funnels, one output per program), and two layer passes lay those pictures into `tLayB`/`tLayF` at the far and near vehicle slots. Lamps, spray and trail stay GLSL passes.

**Tech Stack:** Raw WebGL2, GLSL ES 3.0, `shared/gl.js` helpers, node `--test`.

**Spec:** `docs/plans/tornado-meshes.md`

## Global Constraints

- No change in `shared/`. No new library, no downloaded model.
- One fragment output per large program (D3D11 compiles a multi-output program again at its first draw).
- Every vehicle program under 5 s with `python tools/fxc/fxc.py` at level 1.
- Comments: ASD-STE100, double density, twelve words or fewer per line.
- Commit only with `tools/commit.sh`; bean `stimming-wx3m` in each commit.

## Review Focus

- A ray through a wheel arch: the mesh shows the well (id 8) where the GLSL showed it, not the hull's flat side.
- Glass seen at a grazing angle: the exit point still lands on the far window, so `see` matches.
- A vehicle past the eye (z < 0.3): no body draws, only its trail; no mesh clips into the camera.
- The sun below the horizon (`uSun.y <= 0`): the shadow map pass is skipped and nothing reads a stale map.
- Two vehicles overlapping on screen: the depth buffer sorts them; neither paints over the nearer one.

---

### Task 1: Hull meshes from the plane tables

**Files:**
- Create: `tornado/vmesh.js`
- Modify: `tornado/traffic.js` (export `HULLS`, `BOXES`, `ARCH`, `WS`)
- Test: `tests/vmesh.test.mjs`

**Interfaces:**
- Produces: `hullMesh(c: number[3], h: number[3], e: number, planes: number[4][]): { pos: number[], nrm: number[] }` (triangles, flat normals, local frame); `rayHull(ro, rd, c, h, e, planes): number` (JS port of `hBox` + `hPl`, entry t or Infinity).

- [ ] **Step 1: Write the failing tests**

```js
test('a plain box has 12 triangles, every vertex inside its planes', () => {
  const m = hullMesh([0, 1, 0], [1, 0.5, 2], 0, []);
  assert.equal(m.pos.length / 9, 12);
  for (let i = 0; i < m.pos.length; i += 3) assert.ok(Math.abs(m.pos[i]) <= 1 + 1e-6 && Math.abs(m.pos[i + 2]) <= 2 + 1e-6);
});
test('the mesh and the ray test agree on 2000 rays per hull', () => {
  for (const hs of HULLS) for (const hl of hs) {
    // first triangle hit vs rayHull, within 1e-4 m
  }
});
```

- [ ] **Step 2:** Run `node --test tests/vmesh.test.mjs`. Expected: FAIL, `hullMesh` not defined.
- [ ] **Step 3:** Implement `hullMesh`: start from a 20 m cube's six faces, clip every face polygon by each plane (Sutherland-Hodgman), add the cap polygon each plane cuts; the box's six faces, its twelve edge planes `(g, ±R)` as in `hBox`, then the table planes, in that order. Fan-triangulate. Implement `rayHull` from `hPl` and `hBox`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `Tornado alley: hull meshes from the vehicles' plane tables (stimming-wx3m)`.

### Task 2: Arches, wheels and small parts; one mesh per kind

**Files:**
- Modify: `tornado/vmesh.js`
- Test: `tests/vmesh.test.mjs`

**Interfaces:**
- Consumes: `hullMesh`, `rayHull`.
- Produces: `vehicleMesh(kind: 0 | 1 | 2): { pos: Float32Array, nrm: Float32Array, id: Float32Array }` (local frame: x right, y up, z forward; `id` as `vHit` ids: 1 to 16).

- [ ] **Step 1: Write the failing tests**

```js
test('each kind matches vHit on 5000 rays: same id, t within 1e-3 m', () => {
  for (const kind of [0, 1, 2]) { /* JS vHit port vs mesh first hit */ }
});
test('an arch cut leaves the well (id 8) inside the cylinder', () => { /* ray at the arch centre from the side */ });
```

- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement: the arch notch on each side face (circle radius `ARCH[k][3]`, 24 segments, cut to `x0 = ARCH[k][4]`), the well as a cylinder strip (id 8); wheels as 24-sided cylinders with the rim disc (id 11 inside 0.62 r); rods (8 sides, radius `max(r0, 0.01)`), capsules, the dish (spherical cap, 16 x 6), cups and boxes via `hullMesh`. Add a JS `vHitJS(kind, ro, rd)` port for the test only.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `Tornado alley: one mesh per vehicle kind, matching the ray test (stimming-wx3m)`.

### Task 3: The vehicle mesh renderer

**Files:**
- Create: `tornado/vdraw.js`
- Modify: `tornado/traffic.js` (export the shading GLSL: `vPart*`, `vBend`, `vShade`, `vLobe` as `VSHADE_GLSL`)

**Interfaces:**
- Consumes: `vehicleMesh`, `VSHADE_GLSL`, main.js `SHARED` GLSL (camera, sky, `sunCover`, `hazed`), line.js `lineEnv`, `ggx`, road.js `envBRDF`.
- Produces: `vehDraw(gl, { shared }) -> { draw(w, h, traf, near: boolean, funnelTex), texB: WebGLTexture, texF: WebGLTexture, ready: boolean }`.

- [ ] **Step 1:** Vertex shader: per vehicle uniforms (C, heading, roll, pitch, shutter offset); outputs local hit point, local normal, id, world position.
- [ ] **Step 2:** Fragment shader, one output: `vPart`, `vBend`, glass exit by tracing the cab hull's planes, `vShade`, haze; `behindF(z)` share selects behind or front by a uniform. Self-shadow from a 512 x 512 sun shadow map per vehicle (PCF 2 x 2).
- [ ] **Step 3:** Targets: 4x MSAA colour + depth, resolved to `texB` and `texF`; four draws at the shutter moments `(k + 0.5) / 4 - 0.5`, averaged.
- [ ] **Step 4:** Road shadow: one quad on the road per vehicle reads the shadow map; the contact blob as today.
- [ ] **Step 5:** Verify: `python tools/fxc/fxc.py` on each program's HLSL (`tools/fxc/graball.mjs`) under 5 s.
- [ ] **Step 6:** Commit: `Tornado alley: the vehicles draw as meshes into their own targets (stimming-wx3m)`.

### Task 4: Into the frame, and Windows gets its vehicles back

**Files:**
- Modify: `tornado/main.js` (passes `passCarsFar`/`passCarsNear` read `texB`/`texF`; `before()` calls `vehDraw.draw`; drop `CARS`), `tornado/traffic.js` (the body leaves `vehicle()`; shadow, spray and trail stay)

- [ ] **Step 1:** Replace the two car passes' bodies with `texelFetch` of the group's targets.
- [ ] **Step 2:** Run `node tools/fxc/same.mjs` near and far scenarios; diff against main; screenshots for Tom.
- [ ] **Step 3:** App pane on D3D11: first frame, no freeze, vehicles present; `__qa.gpuTime()` before and after.
- [ ] **Step 4:** Update `docs/plans/tornado-meshes.md` and both beans; commit: `Tornado alley: the vehicles draw as meshes on every platform (stimming-wx3m)`.
