# Opal turn (`opal`)

Status: built as a Lab toy, 2026-11-23. Bean `stimming-c7nv`. Idea 116, group F: quiet to use, rich to look at.

## The idea

Drag slowly to tilt a polished opal. Patches of play-of-colour flare up and slide across its depth.

## Defaults (Tom's open question: 3D or flat, and the presentation)

| Choice | Default | Why |
|---|---|---|
| Stone | Black opal, semi-translucent (a black crystal) | The dark body gives the most saturated flashes and suits the dark stage. The translucent crown keeps the depth, so the patches slide with parallax. A crystal opal is pale and washes out on dark velvet. |
| Presentation | 3D: one oval cabochon on a tray of dark velvet, seen from above and a little in front | The tilt is the toy. A flat stone cannot tilt. |
| Light | One soft box, behind and above, its window reflected on the dome | The photos all show one bright window on the dome. |
| Tilt | The tray tilts with the stone, up to 26 degrees; it holds where you leave it | A stone that rolls off its velvet breaks the picture. |

## How it renders

Stack type: Shader. Raw WebGL2 on `shared/gl.js`, bloom from `shared/glow.js`. Two programs: the scene and the final tone.

1. Each pixel casts a ray into the tray's frame. It hits the dome (an ellipsoid on the velvet) or the velvet.
2. On the dome: Fresnel reflection of the soft box; the ray refracts in (n = 1.45).
3. Inside: the ray crosses four colour layers above black potch. Each layer is a warped Voronoi of domains. A domain has a lattice normal near the stacking axis and a lattice spacing.
4. Bragg: a domain flashes when the half vector of the light and the view lies on its normal. Its wavelength is 2 n d cos(theta), so a patch shifts toward blue as the angle grows.
5. Pinfire: two layers of small cells, hashed in the shader.
6. Velvet: a sheen lobe at grazing angles, pile noise, the stone's soft shadow and contact shade.
7. Domain data comes from one data texture that the CPU also reads. So sound knows which patch flares, and where.

## Hero moment

Drag slowly: the tray tilts. Harlequin patches of red, green and blue flare, roll across their cells, slide against the layers above them, and fade. The window highlight slides over the dome. A pinfire glitter follows the drag.

## Bar (Bar v3)

- Action Turn (Space): one slow rocking turn of the stone, 7 s.
- Slider Lamp: moves the soft box from behind left to behind right.
- Keys: arrows tilt.

## Sound

Muted by default. A flaring patch rings a soft glass tone: its pitch by its colour (red low, blue high), panned by its place. Velvet whispers under a fast tilt.

## Frame loop

Lively while a drag, a spring or a Turn runs. Drifting at 30 fps: a slow hand tremor of 1 degree. Asleep 60 s after input. Reduced motion: no tremor; Turn rocks at half reach.

## Tasks

1. Blockout on the stage, screenshot (Q3).
2. Hero: domains, Bragg colour, parallax, highlight, velvet.
3. Sound, bar, icon round, emblems, Lab entry.
4. QA Q1 to Q10, toy doc.
