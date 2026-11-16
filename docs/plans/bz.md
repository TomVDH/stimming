# BZ reaction (`bz`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A petri dish of the Belousov-Zhabotinsky reaction on a lightbox. Touch it to start target rings and spirals that pulse out, collide and wipe each other out.

**Architecture:** An excitable-medium sim (Oregonator or a three-variable cyclic model) on ping-pong float textures in raw WebGL2, the same pattern as Turing skin (`turing/index.html`). A composite pass draws the dish, the dye and the glass.

**Tech stack:** raw WebGL2 on `shared/gl.js`; `shared/grade.js`, `shared/output.js`. No three.js.

**Spec:** idea 3 in [toy-ideas.md](../toy-ideas.md) (tool-approved); batch rules in [README.md](README.md); Bar v2 in [bar-v2.md](bar-v2.md). Bean `stimming-e75e`.

| | |
|---|---|
| Size, estimate | S · $10 to $20 |
| Kits | Turing skin's ping-pong step and brush |
| Before the build | nothing |

## The shot

Top down on a round glass dish over a warm white lightbox, the page dark around it. The liquid is a thin layer of orange-red; the oxidised fronts are deep blue.
At load, two or three target patterns already pulse, so the first frame moves.

## Hero moments

1. **The first ring.** A tap drops a blue dot that opens into rings, one every 2 s or so.
2. **Spirals.** Drag across a front to break it; the two free ends curl into a pair of spirals.
3. **Annihilation.** Two fronts meet and both vanish, leaving a clean seam.

## Loop

- **Tap:** seed a pacemaker.
- **Drag:** cut fronts (spirals) or stir (a smear).
- **Untouched:** spirals keep turning. The sim runs at a low step rate when nothing is pointed at, and stops after 60 s idle.

## Bar (Bar v2)

| Slot | Content |
|---|---|
| Top left | Choice: Dye, `segments`: Ferroin, Ink, Neon (keys 1, 2, 3) |
| Bottom left | Actions: Shuffle (seed a few pacemakers), Clear |
| Bottom right | Slider: Speed |
| Bottom centre | Keys: `[CLICK] seed` · `[DRAG] cut` |
| Settings | Grid size · Quality (shared) |

## Sound

A soft glassy click at each seed and a low swell with the count of fronts. Muted by default.

## Reduced motion and idle

Reduced motion: the sim steps at a quarter rate. Idle: steps slow, then stop after 60 s.

## Tasks

### Task 1: Blockout (checkpoint)
- [ ] Dish, sim, seed and cut. Stills at 1280 and 375 px. Checkpoint with Tom.
- [ ] `toys.json` entry and menu Lab entry with a low-fi icon.

### Task 2: Look
- [ ] Dye colour ramps, dish rim and meniscus, lightbox falloff, grain.

### Task 3: Finish and QA
- [ ] Sound, Settings, persistence. QA in the browser pane. Tick the bean, record the cost.
