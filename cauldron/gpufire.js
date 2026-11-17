// Soup cauldron's WebGPU fire: Fire's own engine (fire/index.html) under the pot.
// It draws the flame volume only; the page screens it over the WebGL2 pot.
// Adapted from Fire, itself from the three.js webgpu_volume_fire example (MIT).
import { oklchRgb } from '../shared/stim.js';

/* ---------- the pot, in the cauldron's units ---------- */
// The soup rests at y = 0; the coals lie at GROUND.
let GROUND = -2.36;
const BCY = -0.48, RO = [1.154, 1.181, 1.154], RI = [1.104, 1.131, 1.104];
const RY = 0.13, RR = 1.01, RT = 0.08;
// Fire's wood ramp: start, mid, end, then the smoke tint.
const WOOD = [[0.93, 0.11, 95], [0.72, 0.19, 52], [0.6, 0.24, 30], [0.8, 0.03, 50]];

export async function createGpuFire({ ground = -2.36 } = {}) {
  if (!navigator.gpu) return null;
  GROUND = ground;
  const [THREE, TSL, { snoise, snoiseVec3 }, { ImprovedNoise }, { gaussianBlur }, { bloom }] = await Promise.all([
    import('three/webgpu'),
    import('three/tsl'),
    import('three/addons/tsl/math/curlNoise.js'),
    import('three/addons/math/ImprovedNoise.js'),
    import('three/addons/tsl/display/GaussianBlurNode.js'),
    import('three/addons/tsl/display/BloomNode.js'),
  ]);
  const {
    vec3, vec4, uvec3, float, Fn, uniform, texture3D, textureStore, instanceIndex,
    screenCoordinate, pass, smoothstep, mix, min, max, floor, mx_noise_float, storage, storageTexture, If,
    cameraPosition, positionWorld, interleavedGradientNoise, frameId, fract, saturation, select,
  } = TSL;

  const renderer = new THREE.WebGPURenderer();
  await renderer.init();
  // WebGPURenderer can fall back to WebGL 2; this probe does not.
  if (!renderer.backend.isWebGPUBackend) { renderer.dispose(); return null; }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 2;
  const canvas = renderer.domElement;
  const okColor = (L, C, h, c = new THREE.Color()) => c.setRGB(...oklchRgb(L, C, h), THREE.SRGBColorSpace);

  /* ---------- the sim box ---------- */
  // Fire's cell is 0.12; ?cell= sets a finer or coarser grid.
  const CELL = Math.min(0.2, Math.max(0.05, +new URLSearchParams(location.search).get('cell') || 0.12));
  // The box spans the pot and the air round it, up past the rim.
  // Debug: ?box=fire uses Fire's own 12 x 12 x 24 box, no pot, open floor.
  const FIREBOX = new URLSearchParams(location.search).get('box') === 'fire';
  const GRID_SIZE_X = Math.round((FIREBOX ? 12 : 7.2) / CELL);
  const GRID_SIZE_Z = FIREBOX ? 2 * GRID_SIZE_X : GRID_SIZE_X;
  // Two cells of solid floor lie under the coals.
  // The ground is open to the gas, as in Fire; the volume hides what lies under it.
  // A solid floor starves the flame of inflow; ?floor=solid shows that.
  const OPEN = FIREBOX || new URLSearchParams(location.search).get('floor') !== 'solid';
  const BOX_Y0 = OPEN ? GROUND - 0.8 : GROUND - 2 * CELL;
  const GRID_SIZE_Y = FIREBOX ? GRID_SIZE_X : Math.round((6.6 - BOX_Y0) / CELL);
  const CELL_COUNT = GRID_SIZE_X * GRID_SIZE_Y * GRID_SIZE_Z;
  const VX = GRID_SIZE_X * CELL, VY = GRID_SIZE_Y * CELL, VZ = GRID_SIZE_Z * CELL;
  const VOLUME_CENTER = new THREE.Vector3(0, BOX_Y0 + VY / 2, 0);
  // Fire runs 2 Jacobi passes; pressure warm-starts from the last step.
  // ?jacobi= sets the count; it stays even, so pressure ends in A.
  const PRESSURE_ITERATIONS = 2 * Math.round(Math.min(40, Math.max(2, +new URLSearchParams(location.search).get('jacobi') || 2)) / 2);
  const TEXEL_X = 1 / GRID_SIZE_X, TEXEL_Y = 1 / GRID_SIZE_Y, TEXEL_Z = 1 / GRID_SIZE_Z;
  const uVolumeWorldSize = uniform(new THREE.Vector3(VX, VY, VZ));
  const CENTER = vec3(VOLUME_CENTER.x, VOLUME_CENTER.y, VOLUME_CENTER.z);
  // Fire's box is 12 x 12 x 24; its forces scale by 12.
  const FIRE_Y = 12;
  // KF turns Fire's box-space offsets into this box's.
  const KF = vec3(12 / VX, 12 / VY, 24 / VZ);
  const toUVW = w => w.sub(CENTER).div(uVolumeWorldSize).add(0.5);
  const toWorld = uvw => uvw.sub(0.5).mul(uVolumeWorldSize).add(CENTER);

  // The belly below the rim and the ground are solid.
  const POT_C = vec3(0, BCY, 0), POT_R = vec3(...RO);
  // Debug: ?pot=0 burns the fire in open air, as in Fire.
  const POT_ON = !FIREBOX && new URLSearchParams(location.search).get('pot') !== '0';
  const solid = w => POT_ON ? w.sub(POT_C).div(POT_R).length().lessThan(1.0).and(w.y.lessThan(RY)).or(w.y.lessThan(OPEN ? -100 : GROUND)) : w.y.lessThan(OPEN ? -100 : GROUND);

  /* ---------- Fire's constants and uniforms ---------- */
  const TURBULENCE = 3.2, SMOKE_LIFESPAN = 2.4, FIRE_LIFESPAN = 1.3, SIM_SPEED = 1.2;
  const EMIT_T = 5.5, EMIT_D = 7.0;
  const WIND_RADIUS = 1.8;
  const uDt = uniform(0.016);
  const uTime = uniform(0);
  const uBuoyancy = uniform(3.0);
  const uWeight = uniform(0.15);
  const uTurbulence = uniform(TURBULENCE);
  const uTurbulenceDecay = uniform(0.1);
  const uTurbFrequency = uniform(10.0);
  const uVelDamping = uniform(0.25);
  const uVorticity = uniform(3.0);
  const uCooling = uniform(1 / FIRE_LIFESPAN);
  const uDissipation = uniform(1 / SMOKE_LIFESPAN);
  const uEmitDensity = uniform(EMIT_D);
  const uEmitTemperature = uniform(EMIT_T);
  const uAirPosition = uniform(new THREE.Vector3(0, -100, 0));
  const uAirVelocity = uniform(new THREE.Vector3());
  const uFireIntensity = uniform(40.0);
  const uFireGlowSpread = uniform(5.0);
  const uShadowAbsorption = uniform(2.0);
  const uShadowAmbient = uniform(0.5);
  const uFireStartColor = uniform(new THREE.Color());
  const uFireMidColor = uniform(new THREE.Color());
  const uFireEndColor = uniform(new THREE.Color());
  const uSmokeTint = uniform(new THREE.Color());
  const uAsymmetry = uniform(0.0);
  const uPowderStrength = uniform(0.59);
  const uMultiScattering = uniform(1.0);
  const uPointLightVolumeIntensity = uniform(2.0);
  const uPointLightSurfaceIntensity = uniform(10.0);
  const uLightNearIntensity = uniform(10.0);
  const uLightFarIntensity = uniform(15.0);
  const uLightFarDistance = uniform(10.0);
  const uFlameHeight = uniform(1.3);
  const uSway = uniform(new THREE.Vector3());
  const uFlicker = uniform(1.0);
  const uColorNoise = uniform(0.0);
  const uSaturation = uniform(1.1);
  const uGlow = uniform(1.0);
  const denoiseStrength = uniform(0.75);
  const cpuNoise = new ImprovedNoise();
  // The flame's foot: the white-hot spot on the coals.
  const CORE = new THREE.Vector3(0, GROUND, 0);
  const uCore = uniform(CORE);
  // Debug: ?see=0 drops the pot occlusion in the march.
  const DBG = new URLSearchParams(location.search).get('dbg');
  const uDbgBox = uniform(DBG === 'box' ? 1 : 0), uDbgDye = uniform(DBG === 'dye' ? 1 : 0);
  // Deflect sets how much blocked flow turns along the belly; ?deflect= tunes it.
  // Cling: how hard hot gas hugs the belly and climbs it, in world units a second squared.
  const uCling = uniform(+(new URLSearchParams(location.search).get('cling') ?? 12));
  const uDeflect = uniform(+(new URLSearchParams(location.search).get('deflect') ?? 1));
  const uExpand = uniform(+(new URLSearchParams(location.search).get('expand') ?? 5));
  const uSeenOn = uniform(new URLSearchParams(location.search).get('see') === '0' ? 0 : 1);

  /* ---------- storage 3D textures ---------- */
  function createStorage3D(name) {
    const texture = new THREE.Storage3DTexture(GRID_SIZE_X, GRID_SIZE_Y, GRID_SIZE_Z);
    texture.name = name;
    texture.format = THREE.RGBAFormat;
    texture.type = THREE.HalfFloatType;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = texture.wrapT = texture.wrapR = THREE.ClampToEdgeWrapping;
    return texture;
  }
  const velTexA = createStorage3D('velocity A');
  const velTexB = createStorage3D('velocity B');
  const dyeTexA = createStorage3D('dye A');
  const dyeTexB = createStorage3D('dye B');
  const divTex = createStorage3D('divergence');
  const pressTexA = createStorage3D('pressure A');
  const pressTexB = createStorage3D('pressure B');
  const curlNoiseTex = createStorage3D('curl noise');
  const curlTex = createStorage3D('curl');
  curlNoiseTex.wrapS = curlNoiseTex.wrapT = curlNoiseTex.wrapR = THREE.RepeatWrapping;
  // Dye holds density, temperature and age.
  const dyeTexNode = texture3D(dyeTexA);
  const dyeTexWriteNode = storageTexture(dyeTexB).toWriteOnly();
  const curlNoiseTexNode = texture3D(curlNoiseTex);

  /* ---------- the emitter: a white-hot disc on the coals ---------- */
  // Fire's ground layer: 0.06 apart, 0.02 to 0.48 above the coals.
  const corePts = [];
  const STEP = 0.06, CORE_R = 0.7;
  // Points sit half a step off the grid, never on a cell centre:
  // a point on a centre reads back its own cell and its heat runs away.
  for (let x = -CORE_R + STEP / 2; x <= CORE_R; x += STEP) {
    for (let z = -CORE_R + STEP / 2; z <= CORE_R; z += STEP) {
      if (x * x + z * z > CORE_R * CORE_R) continue;
      for (let y = 0.02; y <= 0.48; y += STEP) corePts.push(x, GROUND + y, z, 0);
    }
  }
  const EMIT_COUNT = corePts.length / 4;
  const emitterAttribute = new THREE.StorageBufferAttribute(new Float32Array(corePts), 4);
  const emitterBuffer = storage(emitterAttribute, 'vec4', EMIT_COUNT).toReadOnly();

  const getVoxelCoord = id => uvec3(id.mod(GRID_SIZE_X), id.div(GRID_SIZE_X).mod(GRID_SIZE_Y), id.div(GRID_SIZE_X * GRID_SIZE_Y));
  const coordToUVW = coord => vec3(coord).add(0.5).div(vec3(GRID_SIZE_X, GRID_SIZE_Y, GRID_SIZE_Z));

  /* ---------- fluid simulation kernels ---------- */
  // Curl noise keeps Fire's frequency in world units.
  const computeCurlNoisePass = Fn(() => {
    const coord = getVoxelCoord(instanceIndex);
    const uvw = coordToUVW(coord);
    const freq = uTurbFrequency;
    const e = float(0.1).div(freq);
    const dx = vec3(e, 0.0, 0.0), dy = vec3(0.0, e, 0.0), dz = vec3(0.0, 0.0, e);
    const p = toWorld(uvw).div(FIRE_Y);
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
  })().compute(CELL_COUNT);

  const curlPass = Fn(() => {
    const coord = getVoxelCoord(instanceIndex);
    const uvw = coordToUVW(coord);
    const vR = texture3D(velTexA, uvw.add(vec3(TEXEL_X, 0, 0)), 0).xyz;
    const vL = texture3D(velTexA, uvw.sub(vec3(TEXEL_X, 0, 0)), 0).xyz;
    const vU = texture3D(velTexA, uvw.add(vec3(0, TEXEL_Y, 0)), 0).xyz;
    const vD = texture3D(velTexA, uvw.sub(vec3(0, TEXEL_Y, 0)), 0).xyz;
    const vF = texture3D(velTexA, uvw.add(vec3(0, 0, TEXEL_Z)), 0).xyz;
    const vB = texture3D(velTexA, uvw.sub(vec3(0, 0, TEXEL_Z)), 0).xyz;
    const w = vec3(
      vU.z.sub(vD.z).sub(vF.y.sub(vB.y)),
      vF.x.sub(vB.x).sub(vR.z.sub(vL.z)),
      vR.y.sub(vL.y).sub(vU.x.sub(vD.x)),
    ).div(2 * CELL);
    textureStore(curlTex, coord, vec4(w, w.length())).toWriteOnly();
  })().compute(CELL_COUNT);

  // Fire's velocity step, then the pot as a free-slip wall.
  const BAND = (2 * CELL) / RO[0];
  const advectVelocityPass = Fn(() => {
    const coord = getVoxelCoord(instanceIndex);
    const uvw = coordToUVW(coord);
    const vel = texture3D(velTexA, uvw, 0).xyz;
    const prevPos = uvw.sub(vel.div(uVolumeWorldSize).mul(uDt));
    const newVel = texture3D(velTexA, prevPos, 0).xyz.toVar();

    const dye = dyeTexNode.sample(uvw).level(0);
    const density = dye.r, temperature = dye.g, age = dye.b;

    // Hot air rises, smoke weight pulls down.
    const buoyancyForce = temperature.mul(uBuoyancy).sub(density.mul(uWeight)).mul(FIRE_Y);
    newVel.addAssign(vec3(0, buoyancyForce, 0).mul(uDt));

    // Thermal turbulence follows heat and decays with age.
    const thermalNoisePos = uvw.add(vec3(0, age.negate().mul(0.6), age.mul(0.13)).mul(KF).div(uTurbFrequency));
    const decay = age.mul(uTurbulenceDecay.negate()).exp();
    const thermalTurbulence = curlNoiseTexNode.sample(thermalNoisePos).level(0).xyz.mul(uTurbulence).mul(temperature).mul(decay);
    // Ambient turbulence stirs cooled smoke over time.
    const ambientNoisePos = uvw.mul(0.5).add(vec3(0, uTime.mul(0.25), uTime.mul(0.06)).mul(KF).div(uTurbFrequency));
    const ambientTurbulence = curlNoiseTexNode.sample(ambientNoisePos).level(0).xyz.mul(uTurbulence.mul(0.2)).mul(density);
    newVel.addAssign(thermalTurbulence.add(ambientTurbulence).mul(FIRE_Y).mul(uDt));

    newVel.mulAssign(max(float(1).sub(uVelDamping.mul(uDt)), 0));

    // Vorticity confinement spins small curls back up into tongues.
    const wC = texture3D(curlTex, uvw, 0);
    const eta = vec3(
      texture3D(curlTex, uvw.add(vec3(TEXEL_X, 0, 0)), 0).w.sub(texture3D(curlTex, uvw.sub(vec3(TEXEL_X, 0, 0)), 0).w),
      texture3D(curlTex, uvw.add(vec3(0, TEXEL_Y, 0)), 0).w.sub(texture3D(curlTex, uvw.sub(vec3(0, TEXEL_Y, 0)), 0).w),
      texture3D(curlTex, uvw.add(vec3(0, 0, TEXEL_Z)), 0).w.sub(texture3D(curlTex, uvw.sub(vec3(0, 0, TEXEL_Z)), 0).w),
    );
    const N = eta.div(eta.length().add(1e-5));
    const where = temperature.add(density.mul(0.5)).clamp(0, 1);
    newVel.addAssign(N.cross(wC.xyz).mul(uVorticity.mul(CELL)).mul(where).mul(uDt));

    // A drag through the air blows a gust round the pointer.
    const worldPos = toWorld(uvw);
    const airDist = worldPos.distance(uAirPosition);
    If(airDist.lessThan(WIND_RADIUS), () => {
      const falloff = smoothstep(0.0, 1.0, float(1.0).sub(airDist.div(WIND_RADIUS)));
      newVel.addAssign(uAirVelocity.mul(2.5).mul(uDt).mul(falloff));
    });

    // Velocity fades near the side and top walls; the floor is solid.
    const edge = min(uvw, vec3(1).sub(uvw));
    newVel.mulAssign(smoothstep(0.0, 0.08, min(edge.x, min(OPEN ? edge.y : float(1).sub(uvw.y), edge.z))));

    // Inside the pot or the ground, the gas stands still.
    // Just outside the belly, the inward part of the flow goes.
    const rel = worldPos.sub(POT_C);
    const r = rel.div(POT_R).length();
    If(solid(worldPos), () => {
      newVel.assign(vec3(0));
    }).ElseIf(r.lessThan(POT_ON ? 1 + BAND : 0).and(worldPos.y.lessThan(RY + 0.2)), () => {
      const n = rel.div(POT_R.mul(POT_R)).normalize();
      const vn = min(newVel.dot(n), 0);
      newVel.subAssign(n.mul(vn));
      // The lost push turns along the belly, out and up the sides.
      const radial = vec3(rel.x, 0, rel.z);
      const tg = radial.sub(n.mul(radial.dot(n))).normalize();
      newVel.addAssign(tg.mul(vn.negate()).mul(uDeflect));
    });
    // Hot gas clings to the iron and runs up it, as in the WebGL fire.
    If(POT_ON ? r.lessThan(1.4).and(worldPos.y.lessThan(RY)).and(solid(worldPos).not()) : float(0).greaterThan(1), () => {
      const n = rel.div(POT_R.mul(POT_R)).normalize();
      const near = smoothstep(0.45, 0.0, r.sub(1.0).mul(1.15)).mul(temperature.clamp(0.0, 1.0));
      const tu = vec3(0, 1, 0).sub(n.mul(n.y));
      newVel.addAssign(tu.normalize().mul(uCling).sub(n.mul(uCling)).mul(near).mul(uDt));
    });
    // The floor stops downward flow.
    If(worldPos.y.lessThan(OPEN ? -100 : GROUND + CELL), () => { newVel.assign(vec3(newVel.x, max(newVel.y, 0), newVel.z)); });

    textureStore(velTexB, coord, vec4(newVel, 0)).toWriteOnly();
  })().compute(CELL_COUNT);

  const divergencePass = Fn(() => {
    const coord = getVoxelCoord(instanceIndex);
    const uvw = coordToUVW(coord);
    const vR = texture3D(velTexB, uvw.add(vec3(TEXEL_X, 0, 0)), 0).x;
    const vL = texture3D(velTexB, uvw.sub(vec3(TEXEL_X, 0, 0)), 0).x;
    const vU = texture3D(velTexB, uvw.add(vec3(0, TEXEL_Y, 0)), 0).y;
    const vD = texture3D(velTexB, uvw.sub(vec3(0, TEXEL_Y, 0)), 0).y;
    const vF = texture3D(velTexB, uvw.add(vec3(0, 0, TEXEL_Z)), 0).z;
    const vB = texture3D(velTexB, uvw.sub(vec3(0, 0, TEXEL_Z)), 0).z;
    const divergence = vR.sub(vL).add(vU.sub(vD)).add(vF.sub(vB)).mul(0.5);
    // Burning gas expands; the solve then pushes it out of hot cells.
    // Fire has no such term; ?expand=0 turns it off.
    const heat = dyeTexNode.sample(uvw).level(0).g;
    textureStore(divTex, coord, vec4(divergence.sub(heat.mul(uExpand).mul(CELL)), 0, 0, 0)).toWriteOnly();
  })().compute(CELL_COUNT);

  // A solid neighbour takes the centre cell's pressure.
  const pAt = (tex, uvw, off, pC) => select(solid(toWorld(uvw.add(off))), pC, texture3D(tex, uvw.add(off), 0).x);
  const OFFS = [vec3(TEXEL_X, 0, 0), vec3(-TEXEL_X, 0, 0), vec3(0, TEXEL_Y, 0), vec3(0, -TEXEL_Y, 0), vec3(0, 0, TEXEL_Z), vec3(0, 0, -TEXEL_Z)];
  const jacobi = (pressRead, pressWrite) => Fn(() => {
    const coord = getVoxelCoord(instanceIndex);
    const uvw = coordToUVW(coord);
    const pC = texture3D(pressRead, uvw, 0).x;
    const [pR, pL, pU, pD, pF, pB] = OFFS.map(o => pAt(pressRead, uvw, o, pC));
    const divergence = texture3D(divTex, uvw, 0).x;
    const pressure = pR.add(pL).add(pU).add(pD).add(pF).add(pB).sub(divergence).div(6);
    textureStore(pressWrite, coord, vec4(pressure, 0, 0, 0)).toWriteOnly();
  })().compute(CELL_COUNT);
  const jacobiPassAB = jacobi(pressTexA, pressTexB);
  const jacobiPassBA = jacobi(pressTexB, pressTexA);

  const projectPass = Fn(() => {
    const coord = getVoxelCoord(instanceIndex);
    const uvw = coordToUVW(coord);
    const pC = texture3D(pressTexA, uvw, 0).x;
    const [pR, pL, pU, pD, pF, pB] = OFFS.map(o => pAt(pressTexA, uvw, o, pC));
    const gradient = vec3(pR.sub(pL), pU.sub(pD), pF.sub(pB)).mul(0.5);
    const vel = texture3D(velTexB, uvw, 0).xyz.sub(gradient);
    // The solid keeps zero velocity.
    textureStore(velTexA, coord, vec4(select(solid(toWorld(uvw)), vec3(0), vel), 0)).toWriteOnly();
  })().compute(CELL_COUNT);

  const advectDyePass = Fn(() => {
    const coord = getVoxelCoord(instanceIndex);
    const uvw = coordToUVW(coord);
    const vel = texture3D(velTexA, uvw, 0).xyz;
    const prevPos = uvw.sub(vel.div(uVolumeWorldSize).mul(uDt));
    const dye = dyeTexNode.sample(prevPos).level(0);
    const density = dye.r.mul(max(float(1).sub(uDissipation.mul(uDt)), 0)).toVar();
    const temperature = dye.g.mul(max(float(1).sub(uCooling.mul(uDt)), 0)).toVar();
    const gridDims = vec3(GRID_SIZE_X, GRID_SIZE_Y, GRID_SIZE_Z);
    const nearestUVW = floor(prevPos.mul(gridDims)).add(0.5).div(gridDims);
    const age = dyeTexNode.sample(nearestUVW).level(0).b.add(uDt).toVar();
    temperature.assign(temperature.clamp(0, 12));
    If(density.lessThanEqual(0.01), () => { age.assign(0.0); });
    // The pot and the ground hold no dye.
    const out = select(solid(toWorld(uvw)), vec4(0), vec4(density, temperature, age, 0));
    textureStore(dyeTexWriteNode, coord, out).toWriteOnly();
  })().compute(CELL_COUNT);

  const emitPass = Fn(() => {
    const vertexPos = emitterBuffer.element(instanceIndex).xyz;
    const uvw = toUVW(vertexPos);
    // Threads past the last point stay silent; a dispatch rounds up to whole workgroups.
    If(instanceIndex.lessThan(EMIT_COUNT).and(uvw.x.greaterThanEqual(0)).and(uvw.x.lessThanEqual(1))
      .and(uvw.y.greaterThanEqual(0)).and(uvw.y.lessThanEqual(1))
      .and(uvw.z.greaterThanEqual(0)).and(uvw.z.lessThanEqual(1)), () => {
      const coord = uvec3(uvw.mul(vec3(GRID_SIZE_X, GRID_SIZE_Y, GRID_SIZE_Z)));
      const flicker = mx_noise_float(vertexPos.mul(9.0).add(vec3(0.0, uTime.negate().mul(2.5), uTime.mul(0.7)))).mul(0.5).add(0.5);
      const baseEmission = uEmitTemperature.greaterThan(0.0).select(float(1.0), float(0.0));
      const densityVal = uEmitDensity.mul(float(1 / 120)).mul(flicker.mul(0.85).add(0.15)).mul(baseEmission);
      If(densityVal.greaterThan(0.0), () => {
        const tempVal = uEmitTemperature.mul(float(1 / 120)).mul(flicker.mul(0.85).add(0.15)).mul(baseEmission);
        const currentDye = dyeTexNode.sample(uvw).level(0);
        const newDensity = currentDye.r.add(densityVal);
        const newTemp = currentDye.g.add(tempVal).clamp(0.0, 12.0);
        const newAge = mix(currentDye.b, float(0.0), densityVal.div(max(newDensity, 0.001)));
        textureStore(dyeTexWriteNode, coord, vec4(newDensity, newTemp, newAge, 0)).toWriteOnly();
      });
    });
  })().compute(EMIT_COUNT);
  const stepPasses = [curlPass, advectVelocityPass, divergencePass];
  for (let i = 0; i < PRESSURE_ITERATIONS; i++) stepPasses.push(i % 2 === 0 ? jacobiPassAB : jacobiPassBA);
  stepPasses.push(projectPass, advectDyePass, emitPass);

  /* ---------- the scene: the volume and its two lights ---------- */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  // The key light backlights the smoke, at Fire's offset from the flame.
  const keyLight = new THREE.SpotLight(0xffffff, 400);
  keyLight.position.set(-4.5, GROUND + 14.5, -9);
  keyLight.angle = Math.PI / 5;
  keyLight.penumbra = 1;
  keyLight.decay = 2;
  keyLight.distance = 0;
  keyLight.target.position.copy(CORE);
  scene.add(keyLight, keyLight.target);
  const uKeyLightPos = uniform(keyLight.position);

  /* ---------- the volume ---------- */
  const volumetricMaterial = new THREE.VolumeNodeMaterial();
  // Fewer march steps than Fire's 22; the blur hides the difference.
  volumetricMaterial.steps = 16;
  volumetricMaterial.transparent = true;
  volumetricMaterial.blending = THREE.AdditiveBlending;
  volumetricMaterial.depthWrite = false;
  volumetricMaterial.offsetNode = fract(interleavedGradientNoise(screenCoordinate).add(float(frameId).mul(0.618033988749895)));

  const fireRamp = Fn(([t]) => {
    const color = vec3(0).toVar();
    color.assign(mix(vec3(0.0, 0.0, 0.0), uFireEndColor, smoothstep(0.05, 0.35, t)));
    color.assign(mix(color, uFireMidColor, smoothstep(0.35, 0.65, t)));
    color.assign(mix(color, uFireStartColor, smoothstep(0.65, 1.0, t)));
    return color;
  });

  const henyeyGreenstein = Fn(([cosTheta, g]) => {
    const g2 = g.mul(g);
    const denom = float(1.0).add(g2).sub(float(2.0).mul(g).mul(cosTheta));
    return float(1.0).sub(g2).div(denom.pow(1.5)).mul(0.079577);
  });

  // 1 where the eye sees the point; 0 behind the pot, the soup or the ground.
  const seen = Fn(([p]) => {
    const ro = cameraPosition;
    const v = p.sub(ro);
    const L = v.length();
    const rd = v.div(L);
    const o = ro.sub(POT_C).div(POT_R), d = rd.div(POT_R);
    const a = d.dot(d), b = o.dot(d), c = o.dot(o).sub(1.0);
    const h = b.mul(b).sub(a.mul(c));
    const vis = float(1.0).toVar();
    If(h.greaterThan(0.0), () => {
      const sh = h.sqrt();
      const t0 = b.negate().sub(sh).div(a), t1 = b.negate().add(sh).div(a);
      // The ray meets the belly wall below the rim.
      If(t0.greaterThan(0.0).and(t0.lessThan(L)).and(ro.y.add(rd.y.mul(t0)).lessThan(RY)), () => { vis.assign(0.0); });
      // The ray drops through the opening onto the soup.
      const ts = ro.y.negate().div(rd.y);
      If(ts.greaterThan(t0).and(ts.lessThan(t1)).and(ts.lessThan(L)), () => { vis.assign(0.0); });
    });
    return vis.mul(p.y.greaterThan(GROUND).select(float(1.0), float(0.0)));
  });

  const getVolumeSample = ({ positionRay }) => {
    const uvw = toUVW(positionRay).toVar();
    // Velocity warps the lookup, so smoke turns wispy.
    const noiseDistortion = texture3D(velTexA, uvw, 0).xyz.div(uVolumeWorldSize).mul(0.15);
    const distortedUVW = uvw.add(noiseDistortion).clamp(0.0, 1.0).toVar();
    const sample = dyeTexNode.sample(distortedUVW).level(0);
    const vis = mix(float(1.0), seen(positionRay), uSeenOn);
    const density = sample.r.mul(vis).toVar();
    const temperature = sample.g.mul(vis);
    const age = sample.b;
    const detailNoise = snoise(positionRay.mul(5.5).add(vec3(0, age.mul(0.8).negate(), 0)));
    density.mulAssign(detailNoise.mul(0.35).add(0.85));
    // The floor is not a wall, so it does not fade.
    const edge = min(distortedUVW, vec3(1).sub(distortedUVW));
    density.mulAssign(smoothstep(0.0, 0.06, min(edge.x, min(float(1).sub(distortedUVW.y), edge.z))));
    return { density, temperature, age };
  };

  // Smoke takes key light through a short self-shadow march.
  volumetricMaterial.scatteringNode = Fn(({ positionRay }) => {
    const { density } = getVolumeSample({ positionRay });
    const lightDir = uKeyLightPos.sub(positionRay).normalize();
    const shadowDensitySum = float(0.0).toVar();
    const shadowStepSize = 0.35;
    for (let i = 0; i < 2; i++) {
      const shadowPos = positionRay.add(lightDir.mul((i + 0.5) * shadowStepSize));
      const shadowUVW = toUVW(shadowPos);
      const shadowEdge = min(shadowUVW, vec3(1).sub(shadowUVW));
      const shadowFade = smoothstep(0.0, 0.06, min(shadowEdge.x, min(shadowEdge.y, shadowEdge.z)));
      shadowDensitySum.addAssign(texture3D(dyeTexA, shadowUVW, 0).r.mul(shadowFade));
    }
    const tau = shadowDensitySum.mul(shadowStepSize).mul(uShadowAbsorption);
    const beer = tau.negate().exp();
    const multiScatter = tau.mul(0.25).negate().exp().mul(0.5);
    const baseTransmittance = mix(beer, beer.add(multiScatter), uMultiScattering);
    const powder = float(1.0).sub(tau.mul(2.0).negate().exp());
    const finalTransmittance = mix(baseTransmittance, baseTransmittance.mul(powder), uPowderStrength);
    const lightTransmittance = finalTransmittance.add(uShadowAmbient).clamp(0.0, 1.0);
    const viewDir = cameraPosition.sub(positionRay).normalize();
    const cosTheta = viewDir.dot(lightDir).clamp(-1.0, 1.0);
    const phase = henyeyGreenstein(cosTheta, uAsymmetry);
    return uSmokeTint.mul(density).mul(lightTransmittance).mul(phase.mul(12.56637));
  });

  // Fire is emission tinted by temperature.
  volumetricMaterial.scatteringEmissiveNode = Fn(({ positionRay }) => {
    const { density, temperature } = getVolumeSample({ positionRay });
    const firePower = float(6.0).sub(uFireGlowSpread);
    const t = temperature.clamp(0, 1);
    const fire = fireRamp(t).mul(temperature.pow(firePower)).mul(uFireIntensity);
    const distance = positionRay.sub(uKeyLightPos).length();
    const attenuation = float(400.0).div(distance.pow(2.0));
    return fire.mul(density.add(0.15)).mul(attenuation).add(vec3(0.0, 0.3, 0.6).mul(uDbgBox)).add(vec3(density, temperature, 0).mul(uDbgDye));
  });

  const volumetricMesh = new THREE.Mesh(new THREE.BoxGeometry(VX, VY, VZ), volumetricMaterial);
  volumetricMesh.position.copy(VOLUME_CENTER);
  scene.add(volumetricMesh);

  /* ---------- the flame light ---------- */
  const isVolume = Fn(({ material }) => float(material && material.isVolumeNodeMaterial ? 1.0 : 0.0))();
  // A flickering capsule on smoke, a point on surfaces.
  const pointLightColor = Fn(() => {
    const P = positionWorld;
    const A = uCore;
    const H = vec3(0.0, uFlameHeight, 0.0);
    const V = P.sub(A);
    const t = V.dot(H).div(H.dot(H)).clamp(0.0, 1.0);
    const C = A.add(uSway).add(H.mul(t));
    const distToSegment = P.sub(C).length();
    const r = float(1.2);
    const softAttenuation = float(1.0).div(distToSegment.pow(2.0).add(r.pow(2.0)));
    const distToLight = P.sub(A).length();
    const defaultAttenuation = distToLight.pow(2.0).max(0.01).reciprocal();
    const attenuationCorrection = isVolume.equal(1.0).select(softAttenuation.div(defaultAttenuation), float(1.0));
    const currentIntensity = isVolume.equal(1.0).select(uPointLightVolumeIntensity, uPointLightSurfaceIntensity);
    const colorT = uEmitTemperature.div(8.34).mul(0.5).add(0.20).add(uColorNoise).clamp(0.0, 1.0);
    const finalFireColor = saturation(fireRamp(colorT), uSaturation);
    const fadeIn = smoothstep(0.0, 3.0, uTime);
    const baseColor = finalFireColor.mul(uGlow).mul(0.12).mul(uFireIntensity).mul(currentIntensity).mul(uFlicker).mul(fadeIn);
    const distRatio = distToSegment.div(uLightFarDistance).clamp(0.0, 1.0);
    const distanceScale = mix(uLightNearIntensity, uLightFarIntensity, smoothstep(0.0, 1.0, distRatio));
    const finalScale = isVolume.equal(1.0).select(distanceScale, float(1.0));
    return baseColor.mul(attenuationCorrection).mul(finalScale);
  })();
  const pointLight = new THREE.PointLight(0xffffff, 1, 100, 2);
  pointLight.colorNode = pointLightColor;
  // The light sits in the core, under the belly.
  pointLight.position.set(0, GROUND + 0.5, 0);
  scene.add(pointLight);

  /* ---------- render: Fire's pipeline; the scene holds only the volume and its lights ---------- */
  // The volume renders alone on layer 10 at half resolution, then blurs.
  const LAYER_VOLUMETRIC_LIGHTING = 10;
  const volumetricLayer = new THREE.Layers();
  volumetricLayer.disableAll();
  volumetricLayer.enable(LAYER_VOLUMETRIC_LIGHTING);
  volumetricMesh.layers.disableAll();
  volumetricMesh.layers.enable(LAYER_VOLUMETRIC_LIGHTING);
  keyLight.layers.enable(LAYER_VOLUMETRIC_LIGHTING);
  pointLight.layers.enable(LAYER_VOLUMETRIC_LIGHTING);
  const renderPipeline = new THREE.RenderPipeline(renderer);
  const scenePass = pass(scene, camera);
  const volumetricPass = pass(scene, camera);
  volumetricPass.setLayers(volumetricLayer);
  volumetricPass.setResolutionScale(0.5);
  const blurredVolumetricPass = gaussianBlur(volumetricPass, denoiseStrength, 1);
  const adjustedVolumetric = vec4(saturation(blurredVolumetricPass.rgb, uSaturation), blurredVolumetricPass.a).mul(0.5);
  const scenePassColor = scenePass.max(adjustedVolumetric).add(adjustedVolumetric);
  const bloomPass = bloom(scenePassColor);
  bloomPass.threshold.value = 0.5;
  bloomPass.strength.value = 0.1;
  bloomPass.radius.value = 1.0;
  // Opaque light on black: the page's screen blend adds it in full.
  renderPipeline.outputNode = vec4(scenePassColor.add(bloomPass).rgb, 1.0);

  /* ---------- Fire's tune and feed ---------- */
  okColor(...WOOD[0], uFireStartColor.value);
  okColor(...WOOD[1], uFireMidColor.value);
  okColor(...WOOD[2], uFireEndColor.value);
  okColor(...WOOD[3], uSmokeTint.value);
  uSmokeTint.value.multiplyScalar(0.35);
  // Fire's defaults: wood, Temperature 0.5, Turbulence 0.4; Intensity is the Fire slider.
  const temp = 0.5, chaos = 0.4;
  let intensity = 0.5;
  const live = { emit: 1, smoke: 1, flick: 1, sway: 1 };
  function tune() {
    const I = intensity, T = temp, C = chaos;
    live.emit = I < 0.02 ? 0 : 0.35 + 0.7 * I;
    uFireIntensity.value = 30 + 16 * I;
    uBuoyancy.value = 2.2 + 2.0 * T;
    // A little short of Fire: the flames cool a tenth faster, so they stand lower.
    uCooling.value = 1.1 / (0.9 + 0.9 * T + 0.4 * I);
    // Smoke clears twice as fast as Fire's, so the haze stays off the soup.
    uDissipation.value = 2 / Math.max(0.3, (3.2 - 1.8 * T) * (0.3 + 0.55));
    live.smoke = 0.6;
    uFireGlowSpread.value = 4.4 + 1.0 * T;
    uTurbulence.value = (1.8 + 3.4 * C) / Math.sqrt(SIM_SPEED);
    uVorticity.value = 1 + 6 * C;
    live.flick = 0.5 + 1.2 * C;
    live.sway = 0.5 + 1.3 * C;
  }
  function feed() {
    const base = live.emit;
    uEmitTemperature.value = EMIT_T * base;
    uEmitDensity.value = EMIT_D * base * live.smoke;
    const lt = Math.max(Math.min(uEmitTemperature.value, 7.5), 3.2);
    const ld = Math.max(uEmitDensity.value, 0.4 * EMIT_D);
    uGlow.value = ((lt / 8.34) ** 4 * (ld / 11.02)) / 0.12;
  }
  tune();

  /* ---------- warm-up ---------- */
  await renderer.compileComputeAsync([computeCurlNoisePass, ...new Set(stepPasses)]);
  renderer.compute(computeCurlNoisePass);
  await scenePass.compileAsync(renderer);
  const cameraMask = camera.layers.mask;
  camera.layers.mask = volumetricLayer.mask;
  await volumetricPass.compileAsync(renderer);
  camera.layers.mask = cameraMask;
  canvas.setAttribute('aria-hidden', 'true');

  /* ---------- the page drives it ---------- */
  let simulationTime = 0, simAccumulator = 0;
  function updateTemporalUniforms(time) {
    uTime.value = time % 1000;
    uFlameHeight.value = 1.3 + cpuNoise.noise(0, time * 2.5, 0) * 0.2 * live.sway;
    uSway.value.set(cpuNoise.noise(time * 3.5, 0, 0) * 0.4 * live.sway, 0, cpuNoise.noise(0, 0, time * 3.5) * 0.4 * live.sway);
    uFlicker.value = (cpuNoise.noise(0, time * 0.8, 0) * 0.12 + cpuNoise.noise(0, time * 15.0, 0) * 0.06) * live.flick + 0.82;
    uColorNoise.value = cpuNoise.noise(time * 5.0, time * 5.0, 0) * 0.08;
  }
  function simulate(step) {
    uDt.value = step;
    simulationTime += step;
    updateTemporalUniforms(simulationTime);
    renderer.compute(stepPasses);
    const swap = dyeTexNode.value;
    dyeTexNode.value = dyeTexWriteNode.value;
    dyeTexWriteNode.value = swap;
  }
  const v3 = new THREE.Vector3();
  return {
    canvas,
    // The page's pixel size and pixel ratio; Fire's Standard cap holds 1.4 megapixels.
    resize(w, h, dpr) {
      renderer.setPixelRatio(Math.min(dpr, 1.5, Math.sqrt(1.4e6 / (w * h))));
      renderer.setSize(w, h, false);
    },
    // The cauldron's eye: position, axes, focal length and principal point, in CSS pixels.
    setCam(cam, w, h) {
      camera.position.set(...cam.pos);
      camera.up.set(...cam.up);
      camera.lookAt(v3.set(cam.pos[0] + cam.fwd[0], cam.pos[1] + cam.fwd[1], cam.pos[2] + cam.fwd[2]));
      camera.updateMatrixWorld();
      const n = camera.near, f = camera.far, k = n / cam.focal;
      // An off-centre frustum puts the principal point where the cauldron's lens has it.
      camera.coordinateSystem = renderer.coordinateSystem;
      camera.projectionMatrix.makePerspective(-cam.ppx * k, (w - cam.ppx) * k, cam.ppy * k, (cam.ppy - h) * k, n, f, renderer.coordinateSystem);
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    },
    setFire(v) { intensity = v; tune(); },
    // One frame: up to four fixed steps, then the render.
    frame(dt) {
      feed();
      const simStep = (1 / 120) * SIM_SPEED;
      simAccumulator = Math.min(simAccumulator + Math.min(dt, 1 / 20) * SIM_SPEED, simStep * 4);
      while (simAccumulator >= simStep) { simulate(simStep); simAccumulator -= simStep; }
      const sizeFactor = Math.sqrt((EMIT_T / 8.34) * (EMIT_D / 11.02) * (uFireIntensity.value / 5.63));
      const t = Math.min(Math.max(simulationTime / 3.0, 0.0), 1.0);
      pointLight.distance = Math.max(0.01, 40.0 * Math.max(0.2, sizeFactor) * t * t * (3.0 - 2.0 * t));
      renderPipeline.render();
    },
    dispose() { renderer.dispose(); canvas.remove(); },
  };
}
