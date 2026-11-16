# Terrarium (`terrarium`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A sealed glass jar of moss and ferns sits on a dark stage. Mist it; drops bead and run down the inside of the glass, and the green inside wakes up.

**Architecture:** One raw WebGL2 scene. The jar is a ray-traced glass cylinder with a dome lid. The plants are a small set of SDF fronds and a moss height field inside it. The glass layer uses `shared/wetglass.js` for drops, runs and fog.

**Tech stack:** raw WebGL2 on `shared/gl.js`; `shared/wetglass.js`, `shared/weather.js`, `shared/glow.js`, `shared/output.js`; Tone.js through `kit.tone()`. No three.js.

**Spec:** idea 361 in [toy-ideas.md](../toy-ideas.md) (Tom's add, 2026-11-14); batch rules in [README.md](README.md); Bar v2 in [bar-v2.md](bar-v2.md). Bean `stimming-ral1`.

| | |
|---|---|
| Size, estimate | M · $20 to $35 |
| Kits | `shared/wetglass.js` for the glass, `shared/environment.js` for the frame loop |
| Before the build | nothing |

## The shot

A deep green-black stage. One tall glass jar stands in the middle, a little below centre, with a cork or glass dome lid.
Inside: a bed of moss on dark soil and pebbles, two or three ferns, a small mushroom cluster.
A soft grow light sits above and behind, so the glass has a long vertical rim and the leaves glow at their edges.
At rest the glass is lightly fogged and the plants are a little dull and curled.

## Hero moments

1. **The mist.** Click and hold to spray. A fine cone of mist enters from the lid; the glass fogs, then beads.
2. **Runs.** Beads join and run down the glass in wiggly tracks that clear the fog behind them.
3. **The green wakes.** The moss lifts and brightens; fern fronds uncurl over 4 to 6 s; the mushrooms glisten.
4. **The jar breathes.** Over a minute the fog slowly returns from the top as a condensation cycle.

## Loop

- **Hold:** mist. Longer holds give heavier drops and more runs.
- **Drag on the glass:** wipe a clear stripe with a finger; the fog creeps back.
- **Tap a frond:** it twitches and drops a bead.
- **Untouched:** the condensation cycle runs once, then the loop sleeps.

## Bar (Bar v2)

| Slot | Content |
|---|---|
| Top left | Choice: Plants, `segments`: Fern, Moss, Bog (keys 1, 2, 3) |
| Bottom left | Action: Mist (key `M`) |
| Bottom right | Slider: Light (the grow light, dusk to noon) |
| Bottom centre | Keys: `[HOLD] mist` · `[DRAG] wipe` · `[CLICK] poke` |
| Settings | Fog return speed · Quality (shared) |

## Sound

Mist: a soft pump hiss. Drops: small wet ticks on glass. The green waking: a faint airy swell. Muted by default.

## Reduced motion and idle

Reduced motion: drops place at once and do not run; fronds open in one step. Idle: the loop sleeps after the fog cycle.

## Tom's direction (2026-11-16, at the blockout)

Tom wants a very richly shaded toy: "glass, fog on glass, droplets, geo-node like plant propagation, maybe some bugs".

| Area | What it asks for | Where it lands |
|---|---|---|
| Glass | Real glass: refraction through the wall, a thick base, caustics on the floor | Task 2 |
| Fog and drops | Fog on the curved glass, beads that merge and run, the wipe | Task 2 |
| Plants | Plants that grow by rules, as geometry nodes do: fronds bud, branch and spread; moss creeps | Task 3, grown from one wetness value |
| Bugs | A few small creatures: a springtail, a woodlouse, a firefly at dusk | New task, after Task 3 |

The blockout's fronds are hand-placed arcs. Task 3 replaces them with a growth rule.

## Tasks

### Task 1: Blockout (checkpoint)
- [ ] Jar, lid, soil, moss, ferns, grow light. Flat shading is fine. Stills at 1280 and 375 px. Checkpoint with Tom.
- [ ] `toys.json` entry and menu Lab entry with a low-fi icon. Commit shared files with `--hunks`.

### Task 2: Glass
- [ ] Wire `shared/wetglass.js` to the jar's curved surface: fog, beads, runs, the wipe stripe.

### Task 3: The green wakes
- [ ] Moss lift and colour, fern unfurl, mushroom gloss, all driven by one wetness value.

### Task 4: Finish and QA
- [ ] Sound, Settings, persistence, performance ladder. QA in the browser pane. Tick the bean, record the cost.
