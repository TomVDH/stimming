# Glowing pickle (`pickle`)

Status: built as a Lab toy, 2026-11-23; waits on Tom's look. Bean: `stimming-f6pg`. Idea 134, group A, a lab demonstration.
Tom's brief: "MVP at high fidelity, with icons for the lab and intro as well, bar v3". Idea: "Plug in a gherkin; it hums and glows sodium yellow."

## References

- Wikimedia Commons, `File:Glowing_Pickle_Alejandro_Garcia.webm` (frames at 8 s to 31 s): the glow sits at one end only. Its core is yellow-white; the light spreads amber through the green flesh for about half the length. Smoke rises from the hot end. In the dark only the lit half shows, orange.
- Wikipedia, "Glowing pickle demonstration": the sodium doublet at 589.0 and 589.6 nm is the only line. The warm-up draws 6 to 7 A; the current drops below 1 A once the glow starts. At about 210 V the warm-up takes 5 to 10 s. The flashing comes from vapour pockets near an electrode.

## Defaults (Tom's open question: 3D or flat, and the presentation)

| | Choice | Why |
|---|---|---|
| Type | Scene: three.js 0.170, WebGL | The glow lights real objects: the plate, the forks, the table. Light on form needs 3D. |
| Shot | A fixed camera, low, at three-quarters to the pickle; the plate fills about two thirds of the width. A tall stage looks more along the pickle. | The glowing end faces the camera; the forks and the leads read as the circuit. |
| Set | A white plate on a dark table in a dim room. A gherkin across the plate, a steel fork pushed into each end, a clip lead on each fork. Nothing else. | Look rule: no props. The plate is the classroom demonstration. |
| Room light | Very dim and cool, from the upper left, as from a window with the blinds down. | The first frame is a picture: the pickle reads green, the forks glint. |
| Glow light | A point light at the hot end, sodium orange, with soft shadows. A grade pulls the scene toward one hue as the glow takes over. | Sodium light is monochrome: colours go, only orange and dark remain. |
| Steam | A raymarched volume at half size, Fire's smoke light from `shared/smoke.js`, lit by the glow from below. | Tom's rule: smoke and steam follow Fire's shader. |
| Mains | 230 V, 50 Hz. The Variac slider sets 90 to 230 V. | Tom is in Belgium. |

## The hero moment

1. Switch on: a clunk; the mains hum starts at once (50 Hz with a 100 Hz buzz).
2. Warm-up, about 4 s at 230 V: the pickle heats; first wisps of steam; the sizzle grows; small spits of brine.
3. Ignition at the right end: a flare, then a pulsing sodium glow. The plate, the forks and the room go monochrome orange. The current drops, so the hum thins and an arc rasp takes over.
4. While it glows the end scorches and darkens; steam rises lit from below.
5. Switch off: the yellow dies in a tenth of a second; the scorched end glows dull red for about 3 s, then goes dark. Steam goes on for some seconds.

## Bar

| Control | Content |
|---|---|
| Action | Switch (Space): power on and off; it shows its state |
| Action | Fresh (N): a new pickle; only while the power is off |
| Slider | Variac: 90 to 230 V. Low volts: a slow warm-up and a dim glow. |
| How | Click the stage: the switch. Space: the switch. N: a fresh pickle. |

## Frame loop

Lively while the power is on, the pickle is hot, or steam shows. Then the loop stops.
60 s after the last input the power switches itself off, so the toy settles and sleeps.
Hidden: stopped. Reduced motion: the glow does not flicker or flash; it rises and falls slowly; fewer spits.

## Tasks

- [x] Plan, references
- [x] Blockout on the stage, screenshot
- [x] Hero: warm-up, steam, spits, ignition, glow, scorch, die-down
- [x] Sound
- [x] Bar v3
- [x] Icon round, emblems, intro emblem
- [x] Lab entry
- [x] QA, toy doc
