# Superconductor track (`supercon/`)

| | |
|---|---|
| Dutch | Supergeleiderbaan /ˈsypərɣəˌlɛidərˌbaːn/ (draft) |
| Motto | Taking the scenic route without touching it. |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.8 0.1 220)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 130, group A, a science toy: a frosty puck floats and locks over a magnet track; push it. Bean `stimming-jm2w`. Plan: [supercon.md](../plans/supercon.md).

## Rules

- One ring, one puck, one hero: the lock. No modes.
- Flux pinning holds the puck's height, tilt and side place as stiff springs (7 Hz). Along the ring the field does not change, so the puck glides with only a slow drag (tau 40 s).
- A hold re-pins the puck in small snaps: the pin jumps to the hand when the hand leads it by 1.1 mm or 2 degrees.
- The puck warms over 52 s of loop time, so it is down before the 60 s sleep. The frost thins from 28 % warmth; the lock sags from 74 %; at full warmth the puck is down on the track and slides to a stop on the plating.
- A pour of liquid nitrogen sets the warmth back to zero. A dropped puck rises back to its pinned height, level.
- The loop runs while the puck moves, a pour or beads are in flight, or the hand holds. A cold puck drifts at 30 fps while fog pours. The loop sleeps once the puck is down and the fog is gone, about 55 s after the last pour, or 60 s after the last input; the warmth clock sleeps with it.

## Direction

- 3D, three.js 0.170. A fixed camera 22 degrees over the bench, the ring centred; a tall frame looks down at 46 degrees, so the ring fills its width.
- A dark room. A bench of black epoxy with wipe marks and fine wear. One cool lamp from the upper left throws the puck's shadow and lights the fog; a faint blue fill from behind.
- The ring: 0.34 m across. Two rows of nickel-plated magnet blocks (56 a row) with a steel strip between them, on a low base of black anodised aluminium.
- The puck: a disc 66 mm across and 5 mm thick, wrapped in film over a dark disc with a faint gold coat. Frost: drifts of thick crust, a dusting of rime between them, ragged rime on the rim, and a few ice glints. Warm, the film is wet and glassy.
- Fog: a raymarched volume in Fire's smoke shading: the light comes from `shared/smoke.js` (`SM_FIRE`); `vapour.js` keeps its own taps toward the lamp and its tau scale. Puffs are born at the rim, sink, and spread on the track and the bench; a gliding puck leaves a trail.
- True details: the gap under the puck and its shadow on the track; the puck leans out a little at speed; a push rocks it along the track; nitrogen beads skate on their own vapour (Leidenfrost) and shrink away.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Actions | Push (Space): a shove along the ring, the way it runs. Cool (C): a pour of liquid nitrogen. |
| Slider | Height: the pinned height, 4 to 26 mm; stored as `stimming.supercon.height` |
| Settings | Quality (shared) |
| How to play | Drag, hold and drag, click, Space, C |

| Gesture | Does |
|---|---|
| Drag the puck | It follows the hand round the ring; let go and it glides on |
| Hold the puck, then drag | Up and down lift it; sideways tips it about the view line. It stays in the new pose. |
| Click or tap | Pours liquid nitrogen on the puck |
| Keys | Space pushes; C cools |

## Sound

Raw Web Audio on the shared kit, muted by default. A soft high boil hiss with pops while the puck is cold, panned with the puck. A faint air rush with speed. A film crinkle on a grab, a push and a release. A small dry tick on each snap of the pin. The pour: a gurgling stream and a hard boil that thins out; glassy ticks as beads hop. The drop: a ceramic clack on nickel; a short scrape while it slides. A small, bright room.

## Reduced motion

The fog stands still round the puck. The puck keeps its pose; gestures still answer. No drifting frames.

## QA

Captures in `docs/qa/supercon/`. Q10 on the build PC: 7.8 ms mean, 8.1 ms p95 through a glide and a pour (headless Edge, D3D11, RTX 3070; vsync bound).

## Open for Tom

- 3D or flat: 3D by default.
- The pour as the way to cool: the brief says "re-dip". A pour onto the track is how the real demo keeps a puck cold.
- The Dutch name (draft Supergeleiderbaan) and the icon pick.
