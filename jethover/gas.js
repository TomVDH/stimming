/* ---------- K3: Fire's fluid, a copy for Jet hover ---------- */
// Copy of shared/fire.js. Jet hover adds jets, a solid floor, steam and sky light.
// Each addition carries the mark "Jet hover:".
// Shared fire and smoke: a 3D fluid on the GPU, drawn as a lit volume.
// Fire is the reference port. The base is the three.js webgpu_volume_fire example (MIT).
// It needs three.js 0.186.1, WebGPURenderer on the WebGPU backend, and TSL.
//
// The module imports nothing. The toy passes the namespaces that it loads:
//   const THREE = await import('three/webgpu'), TSL = await import('three/tsl');
//   const curl = await import('three/addons/tsl/math/curlNoise.js');
//   const fire = createFire({ THREE, TSL, curl, renderer });
//   fire.setEmitters(points);            // flat x, y, z, in emitter space
//   const vol = fire.volume({ steps });  // after the scene and the camera
//   scene.add(vol.mesh, vol.shadowMesh);
//   fire.u.lightPos.value = keyLight.position;
//   await fire.compile();
//   fire.step(1 / 120);                  // once per fixed step
//
// The dye holds four channels: r smoke, g heat, b age, a tint.
// Tint is a second flame colour that the toy feeds at a spot. Fire calls it salt.
// The box is size wide and sits on center. Fire's box stands on y = 0.
// fire.u holds every uniform. The toy sets values; the module sets only dt.
// fireRamp and tintRamp are TSL functions, so the toy can colour its own light.
// Geometry options are fixed at create time; they compile into the kernels.

/**
 * A TSL node. The pinned @types/three is 0.170 and has no 0.186 TSL types.
 * @typedef {any} Node
 */
/**
 * The three/webgpu namespace, 0.186.1. @types/three 0.170 has no Storage3DTexture.
 * @typedef {Record<string, any>} ThreeWebGPU
 */
/**
 * The three/tsl namespace, 0.186.1.
 * @typedef {Record<string, any>} ThreeTSL
 */
/**
 * The curl noise addon: three/addons/tsl/math/curlNoise.js.
 * @typedef {{ snoise: (p: Node) => Node, snoiseVec3: (p: Node) => Node }} CurlNoise
 */
/** @typedef {{ x: number, y: number, z: number, set(x: number, y: number, z: number): any, copy(v: any): any }} Vec3 */
/** @typedef {{ x: number, y: number, set(x: number, y: number): any, copy(v: any): any, lerp(v: any, t: number): any }} Vec2 */
/** @typedef {{ r: number, g: number, b: number, copy(c: any): any, lerp(c: any, t: number): any }} Rgb */
/** @typedef {{ elements: number[], copy(m: any): any }} Mat4 */
// A uniform is a TSL node too, so it keeps the node methods.
/** @typedef {{ value: number, [method: string]: any }} UNum */
/** @typedef {{ value: Vec3, [method: string]: any }} UVec3 */
/** @typedef {{ value: Vec2, [method: string]: any }} UVec2 */
/** @typedef {{ value: Rgb, [method: string]: any }} UColor */
/** @typedef {{ value: Mat4, [method: string]: any }} UMat4 */

/**
 * Every uniform of the fire. Defaults are the example's values.
 * @typedef {object} FireUniforms
 * @property {UNum} dt Step length in seconds. step() sets it.
 * @property {UNum} time Clock for the noise, in seconds.
 * @property {UVec3} size Box size in world units.
 * @property {UNum} buoyancy Lift per unit of heat.
 * @property {UNum} weight Pull per unit of smoke.
 * @property {UNum} turbulence Curl noise strength.
 * @property {UNum} turbulenceDecay How fast heat turbulence fades with age.
 * @property {UNum} turbFrequency Curl noise frequency. The noise bakes once, at compile.
 * @property {UNum} velDamping Velocity loss per second.
 * @property {UNum} vorticity Vorticity confinement strength.
 * @property {UNum} swirl Spin round the source, as a twister.
 * @property {UVec3} wind A steady push on hot gas and smoke.
 * @property {UNum} cooling Heat loss per second.
 * @property {UNum} dissipation Smoke loss per second.
 * @property {UNum} emitDensity Smoke per emitter point.
 * @property {UNum} emitTemperature Heat per emitter point. Zero stops emission.
 * @property {UNum} emitGain Scales all emission.
 * @property {UNum} emitCount Live emitter points. setEmitters() sets it.
 * @property {UMat4} emitMatrix Emitter space to world space.
 * @property {UVec3} sourcePosition The source in world space.
 * @property {UVec3} sourceVelocity Source motion that pushes wind.
 * @property {UNum} sourceSpeed Source speed; it adds emission and wind noise.
 * @property {UNum} motionBoost Extra emission per unit of source speed.
 * @property {UNum} windStrength Scales the source's wind.
 * @property {UVec3} gustPosition Centre of a gust sphere, as a pointer drag.
 * @property {UVec3} gustVelocity Gust velocity.
 * @property {UNum} tintFeed Tint that the emitters give off now.
 * @property {UVec2} tintSpot Where the tint is strongest, in emitter x and z.
 * @property {UNum} tintFade Extra tint loss per second.
 * @property {UNum} intensity Flame brightness.
 * @property {UNum} glowSpread Lower values give a wider glow.
 * @property {UColor} startColor Hottest stop of the flame ramp.
 * @property {UColor} midColor Middle stop of the flame ramp.
 * @property {UColor} endColor Coolest stop of the flame ramp.
 * @property {UColor} smokeTint Smoke colour under the key light.
 * @property {UColor} tintStart Hottest stop of the tint ramp.
 * @property {UColor} tintMid Middle stop of the tint ramp.
 * @property {UColor} tintEnd Coolest stop of the tint ramp.
 * @property {UNum} shadowAbsorption Smoke self-shadow strength.
 * @property {UNum} shadowAmbient Light that reaches smoke in shadow.
 * @property {UNum} asymmetry Henyey-Greenstein phase g.
 * @property {UNum} powder Powder effect strength.
 * @property {UNum} multiScattering Multiple scattering share, from 0 to 1.
 * @property {UVec3} lightPos The key light. Set the value to the light's position.
 */

/**
 * @typedef {object} FireOptions
 * @property {ThreeWebGPU} THREE
 * @property {ThreeTSL} TSL
 * @property {CurlNoise} curl
 * @property {any} renderer A WebGPURenderer after init().
 * @property {[number, number, number]} [grid] Cells on x, y and z. Default 100, 100, 200.
 * @property {[number, number, number]} [size] Box size in world units. Default 12, 12, 24.
 * @property {[number, number, number]} [center] Box centre. Default 0, half the height, 0.
 * @property {number} [pressure] Jacobi iterations. Keep it even. Default 2.
 * @property {number} [emitMax] Emitter point capacity. Default 24000.
 * @property {number} [sourceRadius] Reach of the source's wind. Default 1.2.
 * @property {number} [gustRadius] Reach of a gust. Default 1.8.
 */

/**
 * @typedef {object} FireVolume
 * @property {any} mesh The lit volume. Add it to the scene.
 * @property {any} shadowMesh Casts the smoke shadow. Add it after the mesh.
 * @property {any} material VolumeNodeMaterial of the mesh.
 * @property {any} shadowMaterial VolumeNodeMaterial of the shadow mesh.
 */

/**
 * @typedef {object} Fire
 * @property {FireUniforms} u
 * @property {any} vel Velocity texture after the projection.
 * @property {Node} dye Texture node of the current dye.
 * @property {Node} emitters Read-only storage node of the emitter points, vec4.
 * @property {number} emitMax
 * @property {(p: Node) => Node} toUVW World position to box coordinates.
 * @property {Node} fireRamp TSL function: heat 0 to 1 to a flame colour.
 * @property {Node} tintRamp TSL function: heat 0 to 1 to a tint colour.
 * @property {(flat: ArrayLike<number>) => number} setEmitters Loads points; returns the count.
 * @property {(opts?: { steps?: number, lift?: number }) => FireVolume} volume Builds the volume. Call it once.
 * @property {(n: number) => void} setSteps Ray march steps of the volume and its shadow.
 * @property {(extra?: Node[]) => Promise<void>} compile Compiles the kernels and bakes the curl noise.
 * @property {(dt: number) => void} step One fixed fluid step.
 * @property {() => void} clear Empties velocity and dye.
 * @property {() => void} dispose Frees the textures, geometry and materials.
 */

/**
 * Builds the fire: fluid kernels, emitters, ramps and uniforms.
 * @param {FireOptions} opts
 * @returns {Fire}
 */
export function createFire({
  THREE, TSL, curl, renderer,
  grid = [100, 100, 200], size = [12, 12, 24], center, pressure = 2,
  emitMax = 24000, sourceRadius = 1.2, gustRadius = 1.8,
}) {
  const { snoise, snoiseVec3 } = curl;
  const {
    vec3, vec4, uvec3, float, Fn, uniform, texture3D, textureStore, instanceIndex,
    screenCoordinate, smoothstep, mix, min, max, floor, mx_noise_float, storage, storageTexture, If,
    cameraPosition, Loop, positionWorld, interleavedGradientNoise, frameId, fract, cameraViewMatrix,
  } = TSL;

  const [GX, GY, GZ] = grid;
  const [SX, SY, SZ] = size;
  const [CX, CY, CZ] = center ?? [0, SY / 2, 0];
  const CELLS = GX * GY * GZ;
  const DIAGONAL = Math.hypot(SX, SY, SZ);
  const TX = 1 / GX, TY = 1 / GY, TZ = 1 / GZ;
  // Cells are cubes on the default grid, 0.12 world units on a side.
  const CELL = SX / GX;

  /* ---------- uniforms ---------- */
  /** @type {FireUniforms} */
  const u = {
    dt: uniform(0.016),
    time: uniform(0),
    size: uniform(new THREE.Vector3(SX, SY, SZ)),
    buoyancy: uniform(3.0),
    weight: uniform(0.15),
    turbulence: uniform(3.2),
    turbulenceDecay: uniform(0.1),
    turbFrequency: uniform(10.0),
    velDamping: uniform(0.25),
    vorticity: uniform(3.0),
    swirl: uniform(0.0),
    wind: uniform(new THREE.Vector3()),
    cooling: uniform(1 / 1.3),
    dissipation: uniform(1 / 2.4),
    emitDensity: uniform(7.0),
    emitTemperature: uniform(5.5),
    emitGain: uniform(1.0),
    emitCount: uniform(0, 'uint'),
    emitMatrix: uniform(new THREE.Matrix4()),
    sourcePosition: uniform(new THREE.Vector3()),
    sourceVelocity: uniform(new THREE.Vector3()),
    sourceSpeed: uniform(0.0),
    motionBoost: uniform(0.25),
    windStrength: uniform(6.5),
    gustPosition: uniform(new THREE.Vector3(0, -100, 0)),
    gustVelocity: uniform(new THREE.Vector3()),
    tintFeed: uniform(0.0),
    tintSpot: uniform(new THREE.Vector2()),
    tintFade: uniform(0.35),
    intensity: uniform(40.0),
    glowSpread: uniform(5.0),
    startColor: uniform(new THREE.Color()),
    midColor: uniform(new THREE.Color()),
    endColor: uniform(new THREE.Color()),
    smokeTint: uniform(new THREE.Color()),
    tintStart: uniform(new THREE.Color()),
    tintMid: uniform(new THREE.Color()),
    tintEnd: uniform(new THREE.Color()),
    shadowAbsorption: uniform(2.0),
    shadowAmbient: uniform(0.5),
    asymmetry: uniform(0.0),
    powder: uniform(0.59),
    multiScattering: uniform(1.0),
    lightPos: uniform(new THREE.Vector3()),
    // Jet hover: per jet, nozzle xyz; axis xyz and length; speed, heat, steam, radius.
    jetP: [0, 1, 2].map(() => uniform(new THREE.Vector3(0, -100, 0))),
    jetA: [0, 1, 2].map(() => uniform(new THREE.Vector4(0, -1, 0, 0))),
    jetK: [0, 1, 2].map(() => uniform(new THREE.Vector4(0, 0, 0, 0.4))),
    // Jet hover: flat flame gain, in place of Fire's distance falloff.
    glowGain: uniform(1.0),
    // Jet hover: sky light on the smoke, so steam far from the lamps still shows.
    ambient: uniform(new THREE.Color(0, 0, 0)),
    // Jet hover: how fast flame light fades with age, per second.
    glowAge: uniform(2.0),
    // Jet hover: scale of the summed heat that bends the frame.
    heatGain: uniform(100.0),
  };

  /* ---------- storage 3D textures ---------- */
  // rgba16float is storage-writable and linearly filterable.
  const textures = [];
  function storage3D(name) {
    const texture = new THREE.Storage3DTexture(GX, GY, GZ);
    texture.name = name;
    texture.format = THREE.RGBAFormat;
    texture.type = THREE.HalfFloatType;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = texture.wrapT = texture.wrapR = THREE.ClampToEdgeWrapping;
    textures.push(texture);
    return texture;
  }
  const velTexA = storage3D('velocity A');
  const velTexB = storage3D('velocity B');
  const dyeTexA = storage3D('dye A');
  const dyeTexB = storage3D('dye B');
  const divTex = storage3D('divergence');
  const pressTexA = storage3D('pressure A');
  const pressTexB = storage3D('pressure B');
  const curlNoiseTex = storage3D('curl noise');
  // Curl holds the vorticity vector in xyz and its length in w.
  const curlTex = storage3D('curl');
  curlNoiseTex.wrapS = curlNoiseTex.wrapT = curlNoiseTex.wrapR = THREE.RepeatWrapping;
  // The two dye nodes swap their textures after each step.
  const dyeTexNode = texture3D(dyeTexA);
  const dyeTexWriteNode = storageTexture(dyeTexB).toWriteOnly();
  const curlNoiseTexNode = texture3D(curlNoiseTex);

  /* ---------- emitters ---------- */
  // The buffer holds xyz points in emitter space; w is unused.
  const emitterAttribute = new THREE.StorageBufferAttribute(new Float32Array(emitMax * 4), 4);
  const emitterBuffer = storage(emitterAttribute, 'vec4', emitMax).toReadOnly();
  /** @param {ArrayLike<number>} flat */
  function setEmitters(flat) {
    const a = emitterAttribute.array, n = Math.min(flat.length / 3, emitMax);
    for (let i = 0; i < n; i++) { a[i * 4] = flat[i * 3]; a[i * 4 + 1] = flat[i * 3 + 1]; a[i * 4 + 2] = flat[i * 3 + 2]; }
    emitterAttribute.needsUpdate = true;
    u.emitCount.value = n;
    return n;
  }

  const getVoxelCoord = id => uvec3(id.mod(GX), id.div(GX).mod(GY), id.div(GX * GY));
  const coordToUVW = coord => vec3(coord).add(0.5).div(vec3(GX, GY, GZ));
  const toUVW = p => p.sub(vec3(CX, CY, CZ)).div(u.size).add(0.5);

  /* ---------- fluid kernels ---------- */
  // Curl noise is computed once into a 3D texture.
  const curlNoisePass = Fn(() => {
    const coord = getVoxelCoord(instanceIndex);
    const uvw = coordToUVW(coord);
    const freq = u.turbFrequency;
    const e = float(0.1).div(freq);
    const dx = vec3(e, 0.0, 0.0);
    const dy = vec3(0.0, e, 0.0);
    const dz = vec3(0.0, 0.0, e);
    const p = uvw.mul(vec3(SX / SY, 1.0, SZ / SY));
    const p_x0 = snoiseVec3(p.sub(dx).mul(freq));
    const p_x1 = snoiseVec3(p.add(dx).mul(freq));
    const p_y0 = snoiseVec3(p.sub(dy).mul(freq));
    const p_y1 = snoiseVec3(p.add(dy).mul(freq));
    const p_z0 = snoiseVec3(p.sub(dz).mul(freq));
    const p_z1 = snoiseVec3(p.add(dz).mul(freq));
    const x = p_y1.z.sub(p_y0.z).sub(p_z1.y).add(p_z0.y);
    const y = p_z1.x.sub(p_z0.x).sub(p_x1.z).add(p_x0.z);
    const z = p_x1.y.sub(p_x0.y).sub(p_y1.x).add(p_y0.x);
    textureStore(curlNoiseTex, coord, vec4(vec3(x, y, z).mul(5.0), 0.0)).toWriteOnly();
  })().compute(CELLS);

  // Clear empties the velocity and both dye textures.
  const clearPass = Fn(() => {
    const coord = getVoxelCoord(instanceIndex);
    textureStore(velTexA, coord, vec4(0)).toWriteOnly();
    textureStore(dyeTexA, coord, vec4(0)).toWriteOnly();
    textureStore(dyeTexB, coord, vec4(0)).toWriteOnly();
  })().compute(CELLS);

  // Vorticity is the curl of the projected velocity.
  const curlPass = Fn(() => {
    const coord = getVoxelCoord(instanceIndex);
    const uvw = coordToUVW(coord);
    const vR = texture3D(velTexA, uvw.add(vec3(TX, 0, 0)), 0).xyz;
    const vL = texture3D(velTexA, uvw.sub(vec3(TX, 0, 0)), 0).xyz;
    const vU = texture3D(velTexA, uvw.add(vec3(0, TY, 0)), 0).xyz;
    const vD = texture3D(velTexA, uvw.sub(vec3(0, TY, 0)), 0).xyz;
    const vF = texture3D(velTexA, uvw.add(vec3(0, 0, TZ)), 0).xyz;
    const vB = texture3D(velTexA, uvw.sub(vec3(0, 0, TZ)), 0).xyz;
    const w = vec3(
      vU.z.sub(vD.z).sub(vF.y.sub(vB.y)),
      vF.x.sub(vB.x).sub(vR.z.sub(vL.z)),
      vR.y.sub(vL.y).sub(vU.x.sub(vD.x)),
    ).div(2 * CELL);
    textureStore(curlTex, coord, vec4(w, w.length())).toWriteOnly();
  })().compute(CELLS);

  // Advects velocity, then adds buoyancy, turbulence, source wind and gust wind.
  const advectVelocityPass = Fn(() => {
    const coord = getVoxelCoord(instanceIndex);
    const uvw = coordToUVW(coord);
    const vel = texture3D(velTexA, uvw, 0).xyz;
    const prevPos = uvw.sub(vel.div(u.size).mul(u.dt));
    const newVel = texture3D(velTexA, prevPos, 0).xyz.toVar();

    const dye = dyeTexNode.sample(uvw).level(0);
    const density = dye.r;
    const temperature = dye.g;
    const age = dye.b;

    // Hot air rises; smoke weight pulls down.
    const buoyancyForce = temperature.mul(u.buoyancy).sub(density.mul(u.weight)).mul(SY);
    newVel.addAssign(vec3(0, buoyancyForce, 0).mul(u.dt));

    // Thermal turbulence follows heat and decays with age.
    const thermalNoisePos = uvw.add(vec3(0, age.negate().mul(0.6), age.mul(0.13)).div(u.turbFrequency));
    const decay = age.mul(u.turbulenceDecay.negate()).exp();
    const thermalTurbulence = curlNoiseTexNode.sample(thermalNoisePos).level(0).xyz.mul(u.turbulence).mul(temperature).mul(decay);
    // Ambient turbulence stirs cooled smoke over time.
    const ambientNoisePos = uvw.mul(0.5).add(vec3(0, u.time.mul(0.25), u.time.mul(0.06)).div(u.turbFrequency));
    const ambientTurbulence = curlNoiseTexNode.sample(ambientNoisePos).level(0).xyz.mul(u.turbulence.mul(0.2)).mul(density);
    newVel.addAssign(thermalTurbulence.add(ambientTurbulence).mul(SY).mul(u.dt));

    newVel.mulAssign(max(float(1).sub(u.velDamping.mul(u.dt)), 0));

    // Vorticity confinement spins small curls back up into tongues.
    // The force runs across the gradient of the curl length.
    const wC = texture3D(curlTex, uvw, 0);
    const eta = vec3(
      texture3D(curlTex, uvw.add(vec3(TX, 0, 0)), 0).w.sub(texture3D(curlTex, uvw.sub(vec3(TX, 0, 0)), 0).w),
      texture3D(curlTex, uvw.add(vec3(0, TY, 0)), 0).w.sub(texture3D(curlTex, uvw.sub(vec3(0, TY, 0)), 0).w),
      texture3D(curlTex, uvw.add(vec3(0, 0, TZ)), 0).w.sub(texture3D(curlTex, uvw.sub(vec3(0, 0, TZ)), 0).w),
    );
    const N = eta.div(eta.length().add(1e-5));
    // Hot gas and smoke take the force; empty air stays calm.
    const where = temperature.add(density.mul(0.5)).clamp(0, 1);
    newVel.addAssign(N.cross(wC.xyz).mul(u.vorticity.mul(CELL)).mul(where).mul(u.dt));

    // A moving source pushes wind through a sphere around it.
    const worldPos = uvw.sub(0.5).mul(u.size).add(vec3(CX, CY, CZ));
    const dist = worldPos.distance(u.sourcePosition);
    const blockRadius = float(sourceRadius);
    If(dist.lessThan(blockRadius), () => {
      const falloff = smoothstep(0.0, 1.0, float(1.0).sub(dist.div(blockRadius)));
      const windNoisePos = uvw.add(vec3(0.0, u.time.mul(0.5), 0.0).div(u.turbFrequency));
      const windTurbulence = curlNoiseTexNode.sample(windNoisePos).level(0).xyz.mul(u.turbulence).mul(u.sourceSpeed);
      newVel.addAssign(u.sourceVelocity.mul(u.windStrength).add(windTurbulence).mul(u.dt).mul(falloff));
    });

    // A gust blows round its centre.
    const airDist = worldPos.distance(u.gustPosition);
    If(airDist.lessThan(gustRadius), () => {
      const falloff = smoothstep(0.0, 1.0, float(1.0).sub(airDist.div(gustRadius)));
      newVel.addAssign(u.gustVelocity.mul(2.5).mul(u.dt).mul(falloff));
    });

    // Swirl spins hot gas round the source and draws it inward.
    const rel = worldPos.xz.sub(u.sourcePosition.xz);
    const rl = rel.length().add(0.35);
    const spin = vec3(rel.y.negate(), 0, rel.x).sub(vec3(rel.x, 0, rel.y).mul(0.45)).div(rl);
    const hot = temperature.add(density.mul(0.3)).clamp(0, 1);
    newVel.addAssign(spin.mul(u.swirl).mul(float(1.0).sub(smoothstep(0.5, 6.0, rl))).mul(hot).mul(u.dt));
    // Wind pushes hot gas and smoke sideways.
    newVel.addAssign(u.wind.mul(temperature.add(density.mul(0.5)).clamp(0, 1)).mul(u.dt));

    // Jet hover: each jet drives its core along its axis.
    // Where a jet lands, the wall jet runs out over the floor.
    const floorY = float(CY - SY / 2);
    const relax = min(u.dt.mul(18.0), 1.0);
    for (let j = 0; j < 3; j++) {
      const P = u.jetP[j], A = u.jetA[j].xyz, L = u.jetA[j].w, K = u.jetK[j];
      const w = worldPos.sub(P);
      const sRaw = w.dot(A);
      const s = sRaw.clamp(0.0, L);
      const r = w.sub(A.mul(s)).length();
      const R = K.w.add(s.mul(0.1));
      const core = float(1.0).sub(smoothstep(R.mul(0.35), R, r)).mul(smoothstep(-0.4, 0.1, sRaw)).mul(float(1.0).sub(smoothstep(L.sub(0.6), L.add(0.2), sRaw)));
      newVel.assign(mix(newVel, A.mul(K.x), core.mul(relax)));
      const land = P.add(A.mul(L));
      const d = worldPos.xz.sub(land.xz);
      const rr = d.length().add(1e-3);
      const hgt = worldPos.y.sub(floorY);
      const band = float(1.0).sub(smoothstep(0.25, 1.4, hgt)).mul(smoothstep(0.2, 1.0, rr)).mul(rr.div(4.5).negate().exp());
      // A soft wall jet: the steam rolls out, it is not thrown.
      const out = vec3(d.x.div(rr), 0.15, d.y.div(rr)).mul(K.x.mul(0.6));
      newVel.assign(mix(newVel, out, band.mul(relax).mul(0.45)));
    }

    // Velocity fades near the box walls.
    // Jet hover: the floor is solid, so the fade skips it; gas there cannot sink.
    const edge = min(uvw, vec3(1).sub(uvw));
    newVel.mulAssign(smoothstep(0.0, 0.08, min(edge.x, min(float(1).sub(uvw.y), edge.z))));
    If(uvw.y.lessThan(1.5 / GY), () => { newVel.y.assign(max(newVel.y, 0.0)); });

    textureStore(velTexB, coord, vec4(newVel, 0)).toWriteOnly();
  })().compute(CELLS);

  const divergencePass = Fn(() => {
    const coord = getVoxelCoord(instanceIndex);
    const uvw = coordToUVW(coord);
    const vR = texture3D(velTexB, uvw.add(vec3(TX, 0, 0)), 0).x;
    const vL = texture3D(velTexB, uvw.sub(vec3(TX, 0, 0)), 0).x;
    const vU = texture3D(velTexB, uvw.add(vec3(0, TY, 0)), 0).y;
    const vD = texture3D(velTexB, uvw.sub(vec3(0, TY, 0)), 0).y;
    const vF = texture3D(velTexB, uvw.add(vec3(0, 0, TZ)), 0).z;
    const vB = texture3D(velTexB, uvw.sub(vec3(0, 0, TZ)), 0).z;
    const divergence = vR.sub(vL).add(vU.sub(vD)).add(vF.sub(vB)).mul(0.5);
    textureStore(divTex, coord, vec4(divergence, 0, 0, 0)).toWriteOnly();
  })().compute(CELLS);

  // The Jacobi pressure solve ping-pongs between A and B.
  const jacobi = (pressRead, pressWrite) => Fn(() => {
    const coord = getVoxelCoord(instanceIndex);
    const uvw = coordToUVW(coord);
    const pR = texture3D(pressRead, uvw.add(vec3(TX, 0, 0)), 0).x;
    const pL = texture3D(pressRead, uvw.sub(vec3(TX, 0, 0)), 0).x;
    const pU = texture3D(pressRead, uvw.add(vec3(0, TY, 0)), 0).x;
    const pD = texture3D(pressRead, uvw.sub(vec3(0, TY, 0)), 0).x;
    const pF = texture3D(pressRead, uvw.add(vec3(0, 0, TZ)), 0).x;
    const pB = texture3D(pressRead, uvw.sub(vec3(0, 0, TZ)), 0).x;
    const divergence = texture3D(divTex, uvw, 0).x;
    const p = pR.add(pL).add(pU).add(pD).add(pF).add(pB).sub(divergence).div(6);
    textureStore(pressWrite, coord, vec4(p, 0, 0, 0)).toWriteOnly();
  })().compute(CELLS);
  const jacobiPassAB = jacobi(pressTexA, pressTexB);
  const jacobiPassBA = jacobi(pressTexB, pressTexA);

  // Subtracting the pressure gradient makes velocity divergence-free.
  // An even iteration count leaves pressure in A.
  const projectPass = Fn(() => {
    const coord = getVoxelCoord(instanceIndex);
    const uvw = coordToUVW(coord);
    const pR = texture3D(pressTexA, uvw.add(vec3(TX, 0, 0)), 0).x;
    const pL = texture3D(pressTexA, uvw.sub(vec3(TX, 0, 0)), 0).x;
    const pU = texture3D(pressTexA, uvw.add(vec3(0, TY, 0)), 0).x;
    const pD = texture3D(pressTexA, uvw.sub(vec3(0, TY, 0)), 0).x;
    const pF = texture3D(pressTexA, uvw.add(vec3(0, 0, TZ)), 0).x;
    const pB = texture3D(pressTexA, uvw.sub(vec3(0, 0, TZ)), 0).x;
    const gradient = vec3(pR.sub(pL), pU.sub(pD), pF.sub(pB)).mul(0.5);
    const vel = texture3D(velTexB, uvw, 0).xyz.sub(gradient);
    textureStore(velTexA, coord, vec4(vel, 0)).toWriteOnly();
  })().compute(CELLS);

  // Advects smoke and heat; smoke dissipates, heat cools.
  const advectDyePass = Fn(() => {
    const coord = getVoxelCoord(instanceIndex);
    const uvw = coordToUVW(coord);
    const vel = texture3D(velTexA, uvw, 0).xyz;
    const prevPos = uvw.sub(vel.div(u.size).mul(u.dt));
    const dye = dyeTexNode.sample(prevPos).level(0);
    const density = dye.r.mul(max(float(1).sub(u.dissipation.mul(u.dt)), 0)).toVar();
    const temperature = dye.g.mul(max(float(1).sub(u.cooling.mul(u.dt)), 0)).toVar();
    // Age uses a nearest lookup to avoid numerical diffusion.
    const gridDims = vec3(GX, GY, GZ);
    const nearestUVW = floor(prevPos.mul(gridDims)).add(0.5).div(gridDims);
    const age = dyeTexNode.sample(nearestUVW).level(0).b.add(u.dt).toVar();
    // Jet hover: hot jets heat their cores; steam flashes off the damp floor.
    const wp = uvw.sub(0.5).mul(u.size).add(vec3(CX, CY, CZ));
    const floorY = float(CY - SY / 2);
    for (let j = 0; j < 3; j++) {
      const P = u.jetP[j], A = u.jetA[j].xyz, L = u.jetA[j].w, K = u.jetK[j];
      const w = wp.sub(P);
      const sRaw = w.dot(A);
      const s = sRaw.clamp(0.0, L);
      const r = w.sub(A.mul(s)).length();
      const R = K.w.mul(0.8).add(s.mul(0.06));
      const core = float(1.0).sub(smoothstep(R.mul(0.2), R, r)).mul(smoothstep(-0.2, 0.15, sRaw)).mul(float(1.0).sub(smoothstep(L.sub(0.3), L.add(0.3), sRaw)));
      temperature.addAssign(K.y.mul(core).mul(u.dt));
      density.addAssign(K.y.mul(0.04).mul(core).mul(u.dt));
      const land = P.add(A.mul(L));
      const rr = wp.xz.distance(land.xz);
      const hgt = wp.y.sub(floorY);
      const ring = smoothstep(0.4, 1.4, rr).mul(float(1.0).sub(smoothstep(2.0, 6.5, rr))).mul(float(1.0).sub(smoothstep(0.15, 0.9, hgt)));
      const patch = smoothstep(0.45, 0.8, mx_noise_float(wp.mul(vec3(1.3, 0.0, 1.3)).add(vec3(u.time.mul(0.35), 0.0, u.time.mul(-0.2)))).mul(0.5).add(0.5));
      density.addAssign(K.z.mul(ring).mul(patch.mul(1.6).add(0.1)).mul(u.dt));
      temperature.addAssign(K.z.mul(0.05).mul(ring).mul(u.dt));
    }
    temperature.assign(temperature.clamp(0, 12));
    If(density.lessThanEqual(0.01), () => { age.assign(0.0); });
    // Alpha carries tint; it clears with the smoke and fades faster.
    const tint = dye.a.mul(max(float(1).sub(u.dissipation.add(u.tintFade).mul(u.dt)), 0));
    textureStore(dyeTexWriteNode, coord, vec4(density, temperature, age, tint)).toWriteOnly();
  })().compute(CELLS);

  // Emits smoke and heat from every emitter point.
  const emitPass = Fn(() => {
    const vertexPos = emitterBuffer.element(instanceIndex).xyz;
    const worldPos = u.emitMatrix.mul(vec4(vertexPos, 1.0)).xyz;
    const uvw = toUVW(worldPos);
    // Points past the count stay silent.
    If(instanceIndex.lessThan(u.emitCount).and(uvw.x.greaterThanEqual(0)).and(uvw.x.lessThanEqual(1))
      .and(uvw.y.greaterThanEqual(0)).and(uvw.y.lessThanEqual(1))
      .and(uvw.z.greaterThanEqual(0)).and(uvw.z.lessThanEqual(1)), () => {
      const coord = uvec3(uvw.mul(vec3(GX, GY, GZ)));
      const flicker = mx_noise_float(vertexPos.mul(9.0).add(vec3(0.0, u.time.negate().mul(2.5), u.time.mul(0.7)))).mul(0.5).add(0.5);
      const baseEmission = u.emitTemperature.greaterThan(0.0).select(float(1.0), float(0.0));
      // A moving source emits more.
      const emissionFactor = baseEmission.add(u.sourceSpeed.mul(u.motionBoost)).mul(u.emitGain);
      const densityVal = u.emitDensity.mul(float(1 / 120)).mul(flicker.mul(0.85).add(0.15)).mul(emissionFactor);
      If(densityVal.greaterThan(0.0), () => {
        const tempVal = u.emitTemperature.mul(float(1 / 120)).mul(flicker.mul(0.85).add(0.15)).mul(emissionFactor);
        const currentDye = dyeTexNode.sample(uvw).level(0);
        const newDensity = currentDye.r.add(densityVal);
        const newTemp = currentDye.g.add(tempVal).clamp(0.0, 12.0);
        const newAge = mix(currentDye.b, float(0.0), densityVal.div(max(newDensity, 0.001)));
        // Tint rises in streaks, strongest near its spot.
        const near = float(1.0).sub(smoothstep(0.1, 0.8, vertexPos.xz.distance(u.tintSpot)));
        const streak = smoothstep(0.36, 0.62, mx_noise_float(vertexPos.mul(vec3(4.0, 1.5, 4.0)).add(vec3(u.time.mul(0.6), u.time.mul(-2.2), 0.0))).mul(0.5).add(0.5));
        const tintVal = densityVal.mul(u.tintFeed).mul(near.mul(0.9).add(0.1)).mul(streak).mul(4.5);
        textureStore(dyeTexWriteNode, coord, vec4(newDensity, newTemp, newAge, currentDye.a.add(tintVal))).toWriteOnly();
      });
    });
  })().compute(emitMax);

  const stepPasses = [curlPass, advectVelocityPass, divergencePass];
  for (let i = 0; i < pressure; i++) stepPasses.push(i % 2 === 0 ? jacobiPassAB : jacobiPassBA);
  stepPasses.push(projectPass, advectDyePass, emitPass);

  /* ---------- ramps ---------- */
  // A blackbody-style ramp: end, mid, then start colour.
  const ramp = (end, mid, start) => Fn(([t]) => {
    const color = vec3(0).toVar();
    color.assign(mix(vec3(0.0, 0.0, 0.0), end, smoothstep(0.05, 0.35, t)));
    color.assign(mix(color, mid, smoothstep(0.35, 0.65, t)));
    color.assign(mix(color, start, smoothstep(0.65, 1.0, t)));
    return color;
  });
  const fireRamp = ramp(u.endColor, u.midColor, u.startColor);
  // The tint ramp uses the same stops as the flame ramp.
  const tintRamp = ramp(u.tintEnd, u.tintMid, u.tintStart);

  const henyeyGreenstein = Fn(([cosTheta, g]) => {
    const g2 = g.mul(g);
    const denom = float(1.0).add(g2).sub(float(2.0).mul(g).mul(cosTheta));
    return float(1.0).sub(g2).div(denom.pow(1.5)).mul(0.079577);
  });

  const getVolumeSample = ({ positionRay }) => {
    const uvw = toUVW(positionRay).toVar();
    // Velocity warps the lookup, so smoke turns wispy.
    const noiseDistortion = texture3D(velTexA, uvw, 0).xyz.div(u.size).mul(0.15);
    const distortedUVW = uvw.add(noiseDistortion).clamp(0.0, 1.0).toVar();
    const sample = dyeTexNode.sample(distortedUVW).level(0);
    // Tint is a share of the smoke, so thin smoke keeps its colour.
    const tint = sample.a.div(max(sample.r, 0.03)).clamp(0.0, 2.0).toVar();
    const density = sample.r;
    const age = sample.b;
    const temperature = sample.g;
    // Simplex noise adds fine detail.
    const detailNoise = snoise(positionRay.mul(5.5).add(vec3(0, age.mul(0.8).negate(), 0)));
    density.mulAssign(detailNoise.mul(0.35).add(0.85));
    const edge = min(distortedUVW, vec3(1).sub(distortedUVW));
    // Jet hover: steam lies on the floor, so the floor edge does not fade it.
    density.mulAssign(smoothstep(0.0, 0.22, min(edge.x, min(float(1).sub(distortedUVW.y), edge.z))));
    return { density, temperature, age, tint, distortedUVW };
  };

  /* ---------- volume ---------- */
  /** @type {FireVolume | null} */
  let vol = null;
  /** @param {{ steps?: number, lift?: number }} [o] */
  // Jet hover: sceneZ gives the scene's view z at the pixel; gas behind it stays hidden.
  /** @param {{ steps?: number, lift?: number, sceneZ?: () => Node }} [o] */
  function volume({ steps = 22, lift = 0.4, sceneZ } = {}) {
    // Jet hover: 1 where the ray sample lies in front of the scene, else 0.
    const seen = p => sceneZ ? cameraViewMatrix.mul(vec4(p, 1.0)).z.greaterThan(sceneZ()).select(float(1.0), float(0.0)) : float(1.0);
    if (vol) return vol;
    // The volume ray marches the dye texture.
    const material = new THREE.VolumeNodeMaterial();
    material.steps = steps;
    material.transparent = true;
    material.blending = THREE.AdditiveBlending;
    material.depthWrite = false;
    // Dithering hides banding; a blur pass in the toy hides the dither.
    material.offsetNode = fract(interleavedGradientNoise(screenCoordinate).add(float(frameId).mul(0.618033988749895)));

    // Smoke takes key light through a short self-shadow march.
    material.scatteringNode = Fn(({ positionRay }) => {
      const { density } = getVolumeSample({ positionRay });
      const lightDir = u.lightPos.sub(positionRay).normalize();
      const shadowDensitySum = float(0.0).toVar();
      const shadowStepSize = 0.35;
      for (let i = 0; i < 2; i++) {
        const shadowPos = positionRay.add(lightDir.mul((i + 0.5) * shadowStepSize));
        const shadowUVW = toUVW(shadowPos);
        const shadowEdge = min(shadowUVW, vec3(1).sub(shadowUVW));
        const shadowFade = smoothstep(0.0, 0.06, min(shadowEdge.x, min(shadowEdge.y, shadowEdge.z)));
        shadowDensitySum.addAssign(texture3D(dyeTexA, shadowUVW, 0).r.mul(shadowFade));
      }
      const tau = shadowDensitySum.mul(shadowStepSize).mul(u.shadowAbsorption);
      const beer = tau.negate().exp();
      const multiScatter = tau.mul(0.25).negate().exp().mul(0.5);
      const baseTransmittance = mix(beer, beer.add(multiScatter), u.multiScattering);
      const powder = float(1.0).sub(tau.mul(2.0).negate().exp());
      const finalTransmittance = mix(baseTransmittance, baseTransmittance.mul(powder), u.powder);
      const lightTransmittance = finalTransmittance.add(u.shadowAmbient).clamp(0.0, 1.0);
      const viewDir = cameraPosition.sub(positionRay).normalize();
      const cosTheta = viewDir.dot(lightDir).clamp(-1.0, 1.0);
      const phase = henyeyGreenstein(cosTheta, u.asymmetry);
      return u.smokeTint.mul(density).mul(lightTransmittance).mul(phase.mul(12.56637)).mul(seen(positionRay));
    });

    // Fire is emission tinted by heat.
    material.scatteringEmissiveNode = Fn(({ positionRay }) => {
      const { density, temperature, tint, age } = getVolumeSample({ positionRay });
      const firePower = float(6.0).sub(u.glowSpread);
      const t = temperature.clamp(0, 1);
      // The tint takes over the mantle; the hottest core stays pale.
      const w = smoothstep(0.03, 0.4, tint).mul(float(1.0).sub(smoothstep(0.9, 1.0, t).mul(0.35)));
      const fire = mix(fireRamp(t), tintRamp(t), w).mul(temperature.pow(firePower)).mul(u.intensity);
      // Jet hover: a flat gain, and young gas glows more than old.
      const young = age.mul(u.glowAge).negate().exp().mul(0.8).add(0.2);
      // Jet hover: sky light falls on the smoke from above.
      const sky = u.ambient.mul(density);
      return fire.mul(density.add(0.15)).mul(u.glowGain).mul(young).add(sky).mul(seen(positionRay));
    });

    // The smoke casts a soft shadow from the key light.
    const volumeCastShadow = Fn(() => {
      const startPos = positionWorld;
      const lightDir = positionWorld.sub(cameraPosition).normalize();
      const marchSteps = uniform('int').onRenderUpdate(({ material: m, object }) => m.steps || (object && object.material && object.material.steps) || material.steps);
      const stepSize = float(DIAGONAL).div(marchSteps).toVar();
      const rayDir = lightDir.toVar();
      const distTravelled = float(0.0).toVar();
      const transmittance = float(1.0).toVar();
      Loop(marchSteps, () => {
        const positionRay = startPos.add(rayDir.mul(distTravelled));
        const { density } = getVolumeSample({ positionRay });
        const absorption = density.mul(u.shadowAbsorption).mul(0.01);
        transmittance.mulAssign(absorption.negate().mul(stepSize).exp());
        distTravelled.addAssign(stepSize);
      });
      transmittance.greaterThanEqual(0.99).discard();
      return vec4(vec3(0), transmittance.oneMinus().mul(5));
    });

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(SX, SY, SZ), material);
    mesh.position.set(CX, CY + lift, CZ);
    mesh.receiveShadow = true;

    const shadowMaterial = new THREE.VolumeNodeMaterial();
    shadowMaterial.steps = material.steps;
    shadowMaterial.offsetNode = material.offsetNode;
    shadowMaterial.castShadowNode = volumeCastShadow();
    shadowMaterial.shadowSide = THREE.FrontSide;
    shadowMaterial.colorWrite = false;
    shadowMaterial.depthWrite = false;
    shadowMaterial.blending = THREE.CustomBlending;
    shadowMaterial.blendEquation = THREE.AddEquation;
    shadowMaterial.blendSrc = THREE.ZeroFactor;
    shadowMaterial.blendDst = THREE.OneMinusSrcAlphaFactor;
    shadowMaterial.blendEquationAlpha = THREE.AddEquation;
    shadowMaterial.blendSrcAlpha = THREE.OneFactor;
    shadowMaterial.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;

    const shadowMesh = new THREE.Mesh(new THREE.BoxGeometry(SX, SY, SZ), shadowMaterial);
    shadowMesh.position.set(CX, CY + lift, CZ);
    shadowMesh.castShadow = true;

    // Jet hover: a twin volume sums the heat along each ray, for the shimmer.
    // r holds heat times rising noise cells; g holds the plain heat.
    const heatMaterial = new THREE.VolumeNodeMaterial();
    heatMaterial.steps = Math.max(12, Math.round(steps / 2));
    heatMaterial.transparent = true;
    heatMaterial.blending = THREE.AdditiveBlending;
    heatMaterial.depthWrite = false;
    heatMaterial.offsetNode = material.offsetNode;
    heatMaterial.scatteringEmissiveNode = Fn(({ positionRay }) => {
      const uvw = toUVW(positionRay);
      const T = dyeTexNode.sample(uvw.clamp(0.0, 1.0)).level(0).g.min(2.5);
      const cellNoise = mx_noise_float(positionRay.mul(vec3(2.6, 1.6, 2.6)).add(vec3(0.0, u.time.mul(-3.2), 0.0)));
      return vec3(T.mul(cellNoise), T, 0.0).mul(u.heatGain).mul(seen(positionRay));
    });
    const heatMesh = new THREE.Mesh(new THREE.BoxGeometry(SX, SY, SZ), heatMaterial);
    heatMesh.position.set(CX, CY + lift, CZ);

    vol = { mesh, shadowMesh, material, shadowMaterial, heatMesh, heatMaterial };
    return vol;
  }

  return {
    u,
    vel: velTexA,
    get dye() { return dyeTexNode; },
    emitters: emitterBuffer,
    emitMax,
    toUVW,
    fireRamp,
    tintRamp,
    setEmitters,
    volume,
    setSteps(n) {
      if (!vol) return;
      vol.material.steps = vol.shadowMaterial.steps = n;
      vol.heatMaterial.steps = Math.max(12, Math.round(n / 2));
    },
    async compile(extra = []) {
      // Kernels compile off the critical path, so loading never freezes.
      await renderer.compileComputeAsync([curlNoisePass, clearPass, ...extra, ...new Set(stepPasses)]);
      renderer.compute(curlNoisePass);
    },
    step(dt) {
      u.dt.value = dt;
      renderer.compute(stepPasses);
      // The dye textures ping-pong each step.
      const swap = dyeTexNode.value;
      dyeTexNode.value = dyeTexWriteNode.value;
      dyeTexWriteNode.value = swap;
    },
    clear() { renderer.compute(clearPass); },
    dispose() {
      textures.forEach(t => t.dispose());
      if (!vol) return;
      vol.mesh.geometry.dispose();
      vol.shadowMesh.geometry.dispose();
      vol.material.dispose();
      vol.heatMesh.geometry.dispose();
      vol.heatMaterial.dispose();
      vol.shadowMaterial.dispose();
    },
  };
}
/* ---------- end K3 ---------- */
