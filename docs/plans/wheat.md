# Wheat storm (`wheat`)

Status: built as a Lab toy, 2026-11-22; waits on Tom's look. Bean: `stimming-tqse`. Idea 21, group C. Toy doc: [wheat.md](../toys/wheat.md).

Tom's brief: "MVP at high fidelity, with icons for the lab and intro as well, bar v3". Idea: "Wind ripples through a wheat field; tap to call lightning."

## Defaults (Tom's open question: 3D or flat, and the presentation)

| | Choice | Why |
|---|---|---|
| Space | 3D field and sky on a flat stage. The camera does not move. | Waves need depth to roll toward the eye; a fixed camera keeps it a diorama. |
| Camera | 4 m over the field, looking out level at the storm; the frame is shifted down, so the horizon sits 34% from the top. About 48 degrees across. | At eye height everything past 30 m packs into a thin band; from 4 m the waves and the gust front roll across most of the frame, and the near heads still read one by one. |
| Light | A low evening sun from the left and a little behind, 9 degrees up. It lights the wheat orange-gold and the storm's face. | The reference photos: sunlit gold wheat under a slate-violet storm is the strongest picture of the subject. |
| Sky | One dark cloud base over the whole frame, a volume with Fire's smoke shading (K3 lighting). A pale strip of clear sky under its far edge, at the horizon. | Tom's ruling: every cloud volume follows Fire's smoke shader. The bright strip sets off the dark base. |
| Wheat | Instanced heads, awns and upper stalks to about 60 m; past that, a canopy shader with the same wind. | Near heads must read one by one; far wheat reads as a surface with a sheen. |
| Apart from Tornado alley | No tornado, no road, no farm. A low evening sun from the left, not a grey day; a level look out over open wheat, not a road view. | The brief. |
| Renderer | Raw WebGL2 on `shared/gl.js`; bloom from `shared/glow.js`. Small programs, so D3D11 links each fast. | Per-pixel sky and field; instancing for the heads. |

## The hero moment

Gusts roll across the field toward the eye, diagonally, as bright and dark bands. A bending head shows its pale side and catches the sky, so a gust is a bright band; the stalks swing back behind it, so a dark trough follows.

A tap on the field calls a bolt there. A tap on the sky calls one out of the cloud base there; it lands 1.5 to 5 km out.

1. Light first: a stepped leader, then the return stroke. The channel burns white with a violet glow, and the field, the cloud base and the air flash. A restrike follows in about 90 ms. The channel glows out in half a second.
2. The thunder comes on the audio clock, after the distance over 343 m/s. A near strike cracks and booms; a far one only rolls, low.
3. The gust front: a ring of wind runs out from the strike point at 19 m/s and flattens the wheat away from it. Behind the ring the stalks spring back past upright and wave. When it reaches the eye, the near heads lie over and the wind roars.

## Bar

| Control | Content |
|---|---|
| Action | Strike (Space): a bolt at a random place in the field |
| Slider | Wind: the strength of the gusts |
| How | Tap: call lightning there. Space: strike. |

## Sound (muted by default)

- Wind in the wheat: a dry rustle and a low wind tone that swell with the gusts at the eye.
- Thunder: a crack and a boom when near; a long low roll when far. Each is new: a random set of bursts.
- The gust front: a rising roar of rustle when the ring reaches the eye.

## Flashing light

A strike flashes at most twice; strikes come at most one per 0.6 s, so the frame never flashes more than three times in a second. Reduced motion: one soft flash, no restrike, no drift of the wind.

## Frame loop

Drifting at 30 fps while the wind blows. Lively while a strike or a gust front is in flight. Asleep 60 s after the last input. Hidden: stopped.

## Tasks

- [x] Plan, references
- [x] Blockout on the stage, screenshot
- [x] Hero: gusts, strike, thunder, gust front
- [x] Sound
- [x] Bar v3
- [x] Icon round, emblems, intro emblem
- [x] Lab entry
- [x] QA, toy doc
