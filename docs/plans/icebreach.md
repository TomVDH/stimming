# Ice breach (`icebreach`) plan

Status: active, MVP in the Lab (2026-11-23) · Bean: `stimming-ri97`

## Context

Tom picked Ice breach on 2026-11-23 as the XXL to start today (idea 240, batch 9, group C):
"Arctic night. A submarine's sail breaks up through pack ice; slabs tilt and slide, a snow plume rises, black water floods the floe."
Tom on the sub: "we should have a sub model in buoy business -- go".
This plan names the full toy in stages. Stage 1 is the MVP that ships to the Lab.

## 1. Reference (opened before the model)

All from Wikimedia Commons.

| Reference | What it gave the look |
|---|---|
| `Akula class submarine starboard quarter view.JPEG`, `Akula class submarine.JPG` | A low, long sail with a sloped, rounded front and a flat top. The sail flows aft into the casing in a long fairing. Black hull, worn anechoic tiles in rows. |
| `AkulaSchema2.png` (side plan) | Proportions: 110 m hull, about 13.5 m across. Sail front base 35 m from the bow, flat top 38 m to 46 m, aft fairing ends at 63 m. Sail top about 4 m over the hull crown. Masts and the escape pod in the sail. |
| `US Navy 090321-N-8273J-240 ... USS Annapolis ... breaks through three feet of ice` | The hero frame: a black sail in a flat white floe, a low eye. Broken slabs lean on the sail's base. A cap of snow and ice balances on the sail top. A raised wedge of floe beside the sail, cracked in lines. |
| `USS Connecticut surfaces through the ice ... ICEX 2018` | Slabs piled round the sail base, blue-white cut faces, snow on top. Low sun behind haze, long shadows across the floe. |
| `USS Hampton surfaces through the ice ...`, `USS Annapolis ICEX.jpg` | The floe far off: pressure ridges as a low broken line on the horizon. |

### The model

Buoy Business (`E:\dev\havoc`) carries an Akula GLB (`lab/ocean/assets/akula.glb`). Its licence is unknown ("confirm before shipping"), and Stimming is a public repo.
Tom, 2026-11-23: "we had a akula model -- pls use that". The toy loads that GLB (`icebreach/akula.glb`). Tom cleared it for the public repo the same day: "Yes, it's cleared".

## 2. The full toy (XXL): stages in order

The scene: a flat floe on the Arctic Ocean at polar night. A low moon behind the sail and to the left, out of frame. Pressure ridges on the horizon. The camera is a long lens (17 degrees across) 7 m over the floe, as from a pressure ridge, 115 m from the sail.

| Stage | What it adds |
|---|---|
| 1. MVP | Hold to surface: the ice bulges, groans and cracks in a star, then breaks. Slabs tilt and slide off the hull. A snow plume rises. Black water floods the floe. Release (before the breach) or tap (after it) to dive. The sea calms and refreezes. Sound. Slider: Ice (thickness). |
| 2. Crew | The hatch opens on the sail top; two figures climb out with a lamp. Masts rise one by one. |
| 3. Weather | Drifting snow over the floe, a wind choice, a halo round the moon. |
| 4. Under | A second shot under the ice: the dark hull rises toward the lit cracks. |
| 5. Pack | The floe drifts; a pressure ridge grinds in the distance. |

## 3. MVP (stage 1)

- Stack: Scene, three.js 0.170 (WebGL2). One fixed long shot; drag looks round a little. Built 2026-11-23: `docs/toys/icebreach.md`.
- The sub: the Buoy Business Akula GLB, black anechoic paint, wet sheen fresh from the sea; the masts rise once she is up.
- The ice: a Voronoi field in a star layout round the sail, 1.6 m thick with a snow layer. Each slab is a rigid body: buoyancy, the hull's push, the pack's pull back home. Before the breach the slabs tent up over the sail and the cracks open in a star.
- Water: black open water in the hole with the moon in it; a flood that spills over the floe and freezes; new ice that greys the hole over a minute.
- Plume: a K3 fluid with Fire's smoke shading (from Ship launch's `mist.js`), snow powder thrown up where slabs break and fall.
- Light: polar night, the moon low behind the sail, a cold sky fill, ACES, bloom, grain.
- Sound: ice groans and cracks, the hull's rush, water, slabs that crash back. Muted by default.
- Bar v3: Surface (hold, Space), Dive (D), slider Ice.

## 4. QA

1280, 375 x 812 and 812 x 375; reduced motion; hidden tab; idle sleep; clean console. Captures in `docs/qa/icebreach/`.
