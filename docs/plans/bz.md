# BZ reaction (`bz`) implementation plan

Status: built as a Lab MVP (2026-11-22) · Bean: `stimming-e75e` · Toy doc: [bz.md](../toys/bz.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A petri dish of the Belousov-Zhabotinsky reaction on a lightbox. Touch it to start target rings and spirals that pulse out, collide and wipe each other out.

**Architecture:** An excitable-medium sim (Oregonator or a three-variable cyclic model) on ping-pong float textures in raw WebGL2, the same pattern as Turing skin (`turing/index.html`). A composite pass draws the dish, the dye and the glass.

**Tech stack:** raw WebGL2 on `shared/gl.js`; `shared/grade.js`, `shared/output.js`. No three.js.

**Spec:** idea 3 in [toy-ideas.md](../toy-ideas.md) (tool-approved); batch rules in [README.md](README.md); Bar v3 in [bar-v3.md](bar-v3.md). Bean `stimming-e75e`.

| | |
|---|---|
| Size, estimate | S · $10 to $20 |
| Kits | Turing skin's ping-pong step and brush |
| Before the build | nothing |

## The shot

Top down on a round glass dish over a warm white lightbox, the page dark around it. The liquid is a thin layer of red-orange; the oxidised fronts are pale blue-white, as in photos of real ferroin dishes.
At load, two or three target patterns already pulse, so the first frame moves.

## Hero moments

1. **The first ring.** A tap drops a blue dot that opens into rings, one every 1.1 to 1.5 s.
2. **Spirals.** Drag across a front to break it; the two free ends curl into a pair of spirals.
3. **Annihilation.** Two fronts meet and both vanish, leaving a clean seam.

## Loop

- **Tap:** seed a pacemaker.
- **Drag:** cut fronts (spirals) or stir (a smear).
- **Untouched:** spirals keep turning. The sim runs at a low step rate when nothing is pointed at, and stops after 60 s idle.

## Bar (Bar v3)

| Slot | Content |
|---|---|
| Actions | Shuffle (S: a fresh dish with new seeds), Clear (C) |
| Slider | Speed |
| How to play | Click seeds, drag cuts, S, C |
| Settings | Quality (shared) |

The MVP has no Dye choice and no Grid size row: one dish in real ferroin colours.

## Sound

A soft glassy click at each seed and a low swell with the count of fronts. Muted by default.

## Reduced motion and idle

Reduced motion: the sim steps at a quarter rate and sleeps 8 s after the last input. Idle: the sim slows to a stop 60 s after the last input.

## Tasks

### Task 1: Blockout (checkpoint)
- [x] Dish, sim, seed and cut. Stills at 1280 and 375 px. Checkpoint with Tom (no checkpoint: batch 4 ran unattended).
- [x] `toys.json` entry and menu Lab entry, from A of spike bz-1 (Tom's pick).

### Task 2: Look
- [x] Dye colour by Beer-Lambert, dish rim and meniscus, lightbox falloff, bubbles, grain.

### Task 3: Finish and QA
- [x] Sound, Settings, persistence. QA headless (Q1 to Q10). Tick the bean. The cost is not recorded.
