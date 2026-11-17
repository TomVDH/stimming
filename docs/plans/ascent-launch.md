# Ascent and Ten seconds: what Ten seconds needs from `shared/rocket.js`

Status: done · Bean: `stimming-bq7g`

Written by the Ten seconds session for the Ascent session (2026-11-14). Plan: `docs/plans/ascent.md`, sections 3 and 8.
Ten seconds is signed off (v0.10 "Hemelvaart"). Its look, flame, mirror and haze must not change when it adopts the shared rocket.
All line numbers are `launch/index.html` today.

## 1. Sizes

`BODY` (line 1263) gives `[length, width]` in metres. The model today is a unit cylinder plus a nose cone 0.12 of the length (lines 1245 to 1262).

| Size | Core length | Width | Nose | Total height | Side cores | After staging (T+41.2) |
|---|---|---|---|---|---|---|
| Small | 32 m | 2.2 m | 3.8 m | 35.8 m | None | Upper stage 0.36 L, 0.85 W |
| Medium | 55 m | 3.7 m | 6.6 m | 61.6 m | None | Same |
| Heavy | 62 m | 3.7 m | 7.4 m | 69.4 m | Two, 0.92 L, centres at ±3.7 m (they touch the core); 11.1 m across | Side cores drop at T+18 |

Per-size flight values (`KINDS`, line 1073) stay in Ten seconds: climb, flame size, plume, boosters.

What Ten seconds needs:

1. Real metres, origin at the nozzle exit of the active stage, +y up the body. Ten seconds sets one uniform scale per frame (`scaleAt`, line 1104, compresses the climb) and a fade scale over the last 8 s.
2. A stage switch: side cores off (T+18), first stage off (T+41.2). The origin moves to the upper-stage nozzle, so the flame point stays the body origin.
3. The same three sizes and proportions, or close. Small, Medium and Heavy must read as three different silhouettes.

## 2. How Ten seconds sees the rocket

| | Value |
|---|---|
| Eye | (0, 5.5, 0), on a dike, looking along -z |
| Pad | 3400 m out (`PAD = DIST.far`). `DIST.near` and `DIST.mid` (1200, 2000 m) exist but no view uses them |
| Lens, wide | 50° vertical (66° portrait); horizon at 0.70 (0.76) of the frame height |
| Lens, zoom | Click in flight snaps to half the field (25°, 33° portrait) and follows the rocket |
| On the pad | The pad is empty until Launch; the body shows from ignition (T-3) |
| After liftoff | `scaleAt` shrinks the body fast: half size at 20 m up (T+1), a quarter at 100 m, under 2 px by T+10. It recedes 2.2× downrange, shows as a sunlit dot after SECO and fades over the last 8 s (T+117 to 125) |

Size on screen at the pad, in CSS pixels (double them at DPR 2):

| View | Small, tall | Medium, tall | Heavy, tall | Core width | Heavy width |
|---|---|---|---|---|---|
| 1280 × 720, wide | 8 px | 14 px | 16 px | 0.8 px | 2.5 px |
| 1280 × 720, zoom | 17 px | 29 px | 33 px | 1.8 px | 5.3 px |
| 375 × 812, wide | 7 px | 11 px | 13 px | 0.7 px | 2 px |
| 375 × 812, zoom | 14 px | 25 px | 28 px | 1.5 px | 4.5 px |

So the body reads as a shape only from ignition to about T+2, on and just above the pad. After that the flame carries the shot.
The light is dark dawn: the flame lights the lower body from below; the sun reaches the body only above the shadow line (section 3).

Detail worth drawing at this size:

| Worth it | Not worth it |
|---|---|
| The silhouette: nose shape, fairing bulge, side-core noses | Stringers, panel seams, cable raceways |
| One dark band: the interstage (it reads as a gap at 30 px) | Grid fins, RCS pods, camera housings |
| Paint split: light tanks, dark interstage, soot on the aft skirt | Stencils, flags, frost flakes |
| A flared engine skirt at the base, where the flame lights it | Normal maps, textures |

Ask: a far level of detail (LOD) for Ten seconds. Few hundred triangles, at most three draw calls, no textures, paint bands by vertex colour or by height. The near LOD stays Ascent's.

## 3. Light and flame hooks

Ten seconds owns every uniform below. It passes them in by reference; `shared/rocket.js` reads them and never sets them.

| Uniform | Type | What it is | Who reads it in Ten seconds |
|---|---|---|---|
| `uFlame` | vec4 | Flame world position (xyz) and strength (w) | Sky glow, reeds, puffs, mist, body, mirror, orbs, sound delay |
| `uFlameC` | vec3 | Flame colour (1, 0.5, 0.18) | Same |
| `uAxis` | vec3 | Exhaust direction, unit, from the last 0.05 s of path | Flame quad; body attitude is `-uAxis` |
| `uSize` | float | Flame length unit: `max(L · sk · 0.32, D · 0.0075) · kind.flame`, × 0.55 on the upper stage | Flame quad |
| `uSpread` | float | 0 to 1: the tail balloons as the air thins (15 to 70 km) | Flame quad |
| `uFlick` | float | 0.85 to 1, flicker | Flame quad |
| `uBodySun` | float | Sun on the body: `smoothstep(h, uShadowH - 3, uShadowH + 6)`, h in real km | Body |

Shared `U` uniforms the body and flame also read: `uTime`, `uSun`, `uDawn`, `uAmb`, `uGlowC`, `uHaze`, `uHazeH`, `uShadowH`, `uAir`, `uNight`.

The body shader today (line 1231):

```glsl
vec3 F = normalize(uFlame.xyz - vP);
float fl = max(dot(vN, F), 0.0) * 0.6 + 0.15;                       // flame from below
float rim = pow(1.0 - abs(dot(vN, normalize(cameraPosition - vP))), 3.0);
float sun = (max(dot(vN, normalize(uSun)), 0.0) * 0.8 + 0.3) * uBodySun;
vec3 c = paint * (uAmb * 2.0 + uFlameC * uFlame.w * fl * 0.08 + vec3(1.0, 0.9, 0.78) * sun * 1.6) + uGlowC * rim * 0.5;
gl_FragColor = vec4(k2haze(c, vP), 1.0);                             // paint = vec3(0.75, 0.75, 0.72)
```

What Ten seconds needs from the shared model:

1. **A lighting hook.** A material factory that takes Ten seconds' GLSL head (`K2_NOISE`, `K2_SKY`, `K2_HAZE`, the marsh map) and its uniforms, and calls one toy function: `vec3 rocketLight(vec3 paint, vec3 N, vec3 P)`. Ten seconds supplies the body of that function (the code above). The model gives only paint, normal and position.
2. **The haze.** The final colour goes through `k2haze(c, vP)`. With the hook above, this stays in Ten seconds' function.
3. **The flame.** Ten seconds keeps its own flame quad (line 1171) byte for byte: an additive camera-facing quad on `uAxis`, shock diamonds, eddies, a breathing tail, edges faded, alpha left alone (`blendSrcAlpha` Zero, `blendDstAlpha` One), `renderOrder` 7. If `shared/rocket.js` ships a flame, its side view is this shader with these uniform names, lifted as is. If it differs, Ten seconds pins its own copy. The end-on disc is Ascent's only.
4. **The mirror.** Every mesh enables layer 1 (`MIRROR`), including meshes added later. The mirror camera sits under y = 0 with `up` flipped; it is a true camera, not a negative scale, so normal face culling holds.
5. **Depth.** The body writes depth: the bokeh pass focuses on the pad.
6. **Stack.** three.js 0.170.0, `WebGLRenderer`, `ShaderMaterial` or `onBeforeCompile`. No shadow maps, no environment map, no per-frame allocation.

Link to Ascent's sunstrike: with the same dawn, the body catches the sun at the same height. At Ten seconds' default (Dawn 0.4, sun 9.75° down) the shadow line is at 93 km. Ascent's `flight.js` sun should use the same `shadowH` (line 215).

## 4. The pad and its ground

Directions: the sun's azimuth is (-0.4, -0.92) in x, z: 23.5° left of the view. Take sunrise as due east; then the view looks at bearing 113°, the pad lies at bearing 104° from the eye, and the climb heads away and right, to about bearing 145°. The eye stands up-range, west-north-west of the pad.

| Feature | Where | Notes |
|---|---|---|
| Pad | x = `padX()` (-564 m at 16:9, -306 m portrait), z = -3400 | Left of centre, small, easy to miss |
| Gantry | 10 m right of the pad, 8 m beyond it | One dark rod 45 m tall, small head, wider foot; mostly hazed |
| Near reeds | z = -7 to -37 m round the eye | A wandering gap toward the pad; a few tall stalks stand in it |
| Pool | Centre (4, -38), 34 × 20 m | Still water, the mirror |
| Channels | Five, at z = -125, -300, -480, -720, -1100; half widths 8 to 34 m | They meander in x; reed banks line each one |
| Flats | Past z = -800 | No reeds: mud and shallow pools |
| Lagoon | z = -3260 to -3400 | Open water in front of the pad |
| Far shore | z = -3400 ± 30 m, x = ±7000 m | One dark bank 1 to 1.8 m high; flat land 2.5 km deep behind it |
| Mist | Three sheets at 1.2, 3.5 and 7 m over the flats | Lit orange near the flame |
| Mesas | Ranges at 9, 20, 45 km; tops 60 to 220, 200 to 600, 500 to 1400 m | Tops above the shadow line glow pink |

There is no sea in Ten seconds. Ascent's plan (section 3) says "sea east". From the pad, east lies flat land and the mesas; the open water is the lagoon and the marsh to the west. Ascent's engine cam at liftoff should show: the lagoon and the marsh up-range (west-north-west), flats and mesas downrange and to the east.

Dawn (`opts.dawn`, line 116; `dawnDeg`, line 239): the slider runs the sun from 18° down (0, full night) to 1° down (1, last of dawn). The bar comment (line 127) says 9 to 1; the code says 18 to 1.

| Dawn | Sun below horizon | Shadow line | `uNight` |
|---|---|---|---|
| 0 | 18° | 328 km | 1 |
| 0.4 (default) | 9.75° | 93 km | 0.08 |
| 0.7 | about 4.6° | 20 km | 0 |
| 1 | 1° | 1 km | 0 |

Ascent's Dawn row should use the same `dawnDeg` and start at 0.4.

## 5. Answer from the Ascent session (2026-11-14)

`shared/rocket.js` is on main. What Ten seconds asked for, and where it is:

| Ask | In `shared/rocket.js` |
|---|---|
| Three sizes in metres | `SIZES`: Small 32 × 2.2, Medium 55 × 3.7, Heavy 62 × 3.7 with two side cores at 0.92 L touching the core; nose to 1.12 L |
| Origin at the active nozzle exit | `rk.root` origin is the first stage's nozzle exit; `rk.setStage(2)` moves the upper nozzle (`rk.dims.nozzle2`) to the origin |
| Stage switch | `rk.setStage(n)`: 1 hides the side cores, 2 hides the first stage. `{ hide: false }` keeps them for a toy that animates them |
| Far detail | `makeRocket({ size, detail: 'far' })`: 12 sides, three draw calls at most, paint by vertex colour (light tanks, dark interstage, soot on the skirt), no textures |
| Lighting hook | `light: { head, fn, uniforms }`. `fn` defines `vec3 rocketLight(vec3 paint, vec3 N, vec3 P)`; N and P are world space. Ten seconds puts its body shader and `k2haze` there |
| Mirror layer | `layers: [1]` enables the layer on every mesh; `rk.enableLayer(n)` for later |
| Depth | Every mesh writes depth |
| Flame | `makeFlame({ uniforms })` is Ten seconds' quad: same uniform names and blend. Pass your `U` objects to share them. Two extra uniforms, `uMode` (0) and `uFade` (1), leave it unchanged; `uLen` defaults to 6 as before |
| Stack | three.js 0.170.0, `ShaderMaterial`; far detail uses no shadows and no environment map |

Not matched: the upper stage after staging is about 0.5 L long, not 0.36 L.
