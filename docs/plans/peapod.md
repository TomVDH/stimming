# Pea pod (`peapod`) plan

Status: active · Bean: `stimming-us9s`

Idea 67, group D. Sources: the shortlist row in `docs/toy-ideas.md`, rank 7 in `docs/plans/fidgets.md`, and the Pea pod row in `docs/toy-plan.md`.
Tom's brief for batch 3: an MVP at high fidelity, with icons, the intro emblem and Bar v3. One hero moment, finished. No extra modes.
`fidgets.md` rates it M and high risk: "a soft body that splits is fiddly to make satisfying". Feel is everything.

## The hero moment

1. Press on the stage: the pod dents under the pointer at once, and swells round the dent. The seam pales. Fibres creak.
2. Hold: the pressure builds. Small cracks tick. Let go early and the pod relaxes; quick taps add up.
3. The seam gives with a snap. The crack runs from the dent to both ends in a few frames.
4. The two valves fall open like a book and rock to rest. A fine mist of juice catches the light.
5. The peas spring out, left and right in turn, as they hang in the pod. They bounce, click into each other, roll and settle.
6. When all is still, the view pans along the table to the next pod. The old valves and peas leave the frame.

## Defaults (open questions, answered here)

| Question | Default | Why |
|---|---|---|
| 3D or flat | 3D, three.js 0.170 (Scene type) | The pod is a round shell, and a rolling pea reads only with a moving highlight, a turning hilum and a soft shadow. Flat would lose the curl of the valves. |
| Stage | A dark, plain table under one low warm key light from the upper left, with a cool fill. A high three-quarter view. | Long soft shadows carry the scene; the wet pod and the peas catch the light. No props (Look rule). |
| Squeeze | Press and hold anywhere on the stage. The dent goes to the point on the pod nearest the pointer, so a touch need not hit the thin pod. Space squeezes at the middle. | One gesture, any device. The crack starts where you press, as on a real pod. |
| Next pod | A pan along the table after all comes to rest; a press during the settle starts it at once. | The table is endless; nothing pops in. |
| Slider | Spring: from a fresh pod that opens gently to a dry pod that springs, twists and flings its peas far. | Explosive dehiscence is a true pod mechanism. One slider shapes the hero moment and adds no mode. |

## Tech

- Pod: two valves, each a shell grid (outer skin, inner lining, rim) rebuilt on the CPU per frame while it moves. Shape from a few numbers: length, curve, taper, the bumps of the peas, the dent, the swell, the open angle, the curl and the twist. Each number is a damped spring, so the motion has overshoot and weight.
- K4 (Verlet, from `washline/core.js`) is not used. A shell from the kit's cloth needs shape matching to hold a pod form, and the snap then depends on solver iterations. The spring model gives a snap that is the same each time. Kit rules are kept: nothing is copied, so no section is marked.
- Peas: spheres with a little squash, a pale hilum spot that shows the roll, size and colour jitter. Physics: gravity, a bounce on the table, slip to roll friction, rolling drag, pea to pea contact, and the open valves as capsules.
- Light: a directional key with soft shadows, a hemisphere fill, a back rim. Bloom with a threshold for the wet glints. A grade pass with a vignette and grain.
- Frame loop: lively while anything moves; no ambient drift, so the loop stops when all is still. Hidden stops at once.

## Sound

Raw Web Audio on `audioKit()`, muted by default, panned with the source, jittered.

- Squeeze: a soft squish on each press, then a fibre creak (band-passed noise in short grains) and a thin wavering squeak, both rising with the pressure.
- Snap: a sharp click, a short zip as the crack runs, a low body knock.
- Peas: a wooden tock per bounce by size and speed, a glassy click per pea to pea hit, a soft roll bed by total speed.
- Pan: a soft slide; the new pod lands with a dull tap.

## Bar v3

| Control | Content |
|---|---|
| Action | Squeeze (Space, hold) |
| Slider | Spring |
| Settings | Quality only |
| How to play | Hold to squeeze · Drag to move the dent · Tap to pinch · Space to squeeze |

## Reduced motion

The squeeze answers as usual. The open plays at half speed with no twist, and the peas leave gently. The pan is a cut through black.

## QA

Q1 to Q10 in `docs/plans/README.md`. Hero captures: the blockout, the squeeze, the snap, the peas in flight, the rest, the pan.
