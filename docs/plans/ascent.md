# Ascent

A Lab toy (`ascent/`). A rocket flies from a dawn pad to deep space on cameras fixed to its hull. The probe it carries parts, opens its wings and coasts on alone.
Bean: `stimming-ng4g`. Branch: `feature/stimming-ng4g` (worktree `.worktrees/stimming-ng4g`), not merged.

## Decisions (Tom, 2026-11-10)

- Look: Photoreal. The samples stay at `ascent/looks.html`.
- The flight plays itself; the viewer cuts cameras. Static hull mounts, Dutch angles.
- The end: the camera moves to the probe. It opens its solar wings and coasts on, cosmic and lonely.
- Ascent is its own toy, not Act 2 of Ten seconds.
- Window seat gives sky and clouds and a porthole camera (not built yet).

## Files

| File | Holds |
|---|---|
| `ascent/index.html` | Page, bar, post, loop, exposure by phase. `?t=<s>` opens paused there. `?debug` gives `window.__as.still(t, cam)`. |
| `ascent/flight.js` | Every state as a function of time: height, downrange, attitude, events (`EV`), sun, sunlight through the air. |
| `ascent/space.js` | The backdrop: single-scatter air on the GPU at any height, Earth, towns, Moon, Sun, planets, stars, Milky Way. |
| `ascent/rocket.js` | Stages, fairing halves, flames (tail and end-on disc), trail, vapour, ice flakes. |
| `ascent/probe.js` | Probe bus, dish, boom, two folding wings with a sun drive. |
| `ascent/cams.js` | Hull mounts, probe mounts and the director's cuts. |
| `ascent/looks.html` | The look spike: three shots in three looks. |

## Blockout state

Real foundations: the time-based flight, the sky model, the wing deploy.
First passes: the rocket and probe models, the trail, the cut list, the exposure.

## Pick up here

1. Watch live playback in a visible pane. Only stills are checked; frame rate is not.
2. The orbit window shot reads as flat blue haze. Clouds and land need to read.
3. The high dawn plume: the lit exhaust cloud against a dark sky.
4. Sound: roar with a lowpass that closes as the air thins, hull hum in vacuum, thuds at staging.
5. Porthole camera with Window seat's glass: rain, frost, clear.

Later: richer rocket and probe models, a Lab menu tile and icon, the Dutch name (Tom), Bar v2 check at 1280, 375 × 812 and 812 × 375.
