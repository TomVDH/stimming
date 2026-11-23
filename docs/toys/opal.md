# Opal turn (`opal/`)

| | |
|---|---|
| Dutch | Opaal /oːˈpaːl/ (draft) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.8 0.17 160)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 116, group F: drag slowly to tilt a polished opal; patches of play-of-colour flare up and slide across its depth. Bean `stimming-c7nv`. Plan: [opal.md](../plans/opal.md), an MVP.

## Rules

- One stone, one tray of velvet, one soft light. No props.
- Colour comes only from Bragg diffraction in domains. The body stays dark.
- One domain table drives the picture and the sound.

## Direction

- A black opal (a semi-translucent black crystal): a dark blue-grey body, a clear crown over four colour layers and black potch. The dark body gives the most saturated flashes; the translucent crown keeps the depth.
- 3D. An oval cabochon on a tray of deep indigo velvet, seen from above and 26 degrees in front. A tall stage turns the stone lengthwise.
- One soft box behind the stone, 50 degrees up. Its window shows on the dome; it throws a pool of light on the velvet and a soft shadow forward.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Action | Turn (Space): one slow rocking turn, 7 s |
| Slider | Lamp: the soft box from behind left to behind right (stored) |
| Settings | Quality (shared) |

| Input | Does |
|---|---|
| Drag | Tilts the tray, up to 26 degrees; it holds where you leave it |
| Tap | The tapped side dips; the spring lifts it back |
| Arrows | Tilt a step of 4 degrees |
| Space | Turn |

## The model

- The stone: an ellipsoid dome, semi-axes 1, 0.72 and 0.4, on the velvet at z = 0. Each pixel casts one ray into the tray's frame.
- The dome: Fresnel (n = 1.45) against a dark room and the soft box's rounded window.
- Inside: the ray refracts and crosses four flat colour layers (z 0.29 to 0.075). Each layer is a warped Voronoi of domains from a data texture: jitter, lattice normal, base wavelength, lobe width, gain.
- A domain flashes when the half vector of the refracted light and view lies on its lattice normal. The lobe width adds the soft box's spread. Its wavelength is the base times the cosine to the light, so a patch shifts toward blue as the tilt grows.
- The lattice bends across a domain, so a flash rolls over it. Fine stripes cross it, as stacking faults do. Deep layers have softer borders and less light.
- Pinfire: two layers of small points, hashed in the shader, with narrow lobes.
- The velvet: indigo pile with a grazing sheen, the light's pool, the stone's shadow (closest approach of the light ray to the dome) and a contact shade.
- The tilt is a spring with a little overshoot. The idle hand trembles about one degree.

## Sound

Web Audio, muted by default. The CPU reads the same domain table: a patch whose flash rises past the mark rings a small glass tone (three partials, a short bright room). Its pitch follows its colour on a pentatonic scale, red low and blue high; it pans with the patch. One tone at most every 0.28 s; weak flares stay silent. Velvet rustles under a fast tilt. Drift alone makes no sound, and the context sleeps.

## Frame loop

Lively while the spring, a Turn, the Lamp or a drag moves. Drifting at 30 fps. Asleep 60 s after the last input, with the tremor eased out over 2 s. Reduced motion: no tremor; a Turn rocks at half reach; a tap rocks at half strength.

## Files

| File | Holds |
|---|---|
| `main.js` | Page, bar, tilt spring, pointer and keys, frame loop |
| `domains.js` | The domain table and its CPU flash model |
| `render.js` | Two programs and bloom |
| `shaders.js` | SCENE and FINAL |
| `sound.js` | Glass tones and velvet |

QA captures: `docs/qa/opal/`.
