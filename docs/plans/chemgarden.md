# Chemical garden (`chemgarden`) plan

Status: built as a Lab MVP on 2026-11-22, on Bar v3; the toy doc is `docs/toys/chemgarden.md` · Bean: `stimming-eekd`

**Goal:** One glass tank of water glass in a dark room. Drop a metal-salt crystal in, and a hollow tower grows up through the liquid in the metal's colour. It wobbles, bursts at its tip, branches and reaches the surface.

**Tech:** Scene type, three.js 0.170 (Tom, 2026-11-17). Tone-free Web Audio through `audioKit()`. Bar v3.

**Source:** idea 124 in [toy-ideas.md](../toy-ideas.md). Batch rules in [README.md](README.md). MVP: one hero moment at high finish, no extra modes.

## The shot

- One tank, almost square on, the eye just under the waterline. The tank fills most of the stage.
- A soft lamp stands behind the tank, warm at its heart and cool at its edge. Its glow comes through the liquid, which has a faint straw tint.
- The floor of the tank holds pale grit. Seeds sit on it as small faceted crystals.
- The waterline is a bright silver band near the top. The glass edges catch the light as thin lines.
- At 375 px the camera moves in, so the tank height fills the portrait stage.

The first frame is a picture: a garden of eight towers in mixed salts, already grown.

## Hero moment

1. **Drop.** Click over the tank. A crystal of the current salt enters at the surface with a small ring and sinks.
2. **Land.** It lands on the grit with a small puff.
3. **Bulb.** A gel skin forms around the seed and swells.
4. **Burst.** The skin bursts and a thin tube jets up.
5. **Grow.** The tube climbs in pulses: it wobbles, swells a bead at its tip, the bead pops with a puff of colour, and the tube goes on, thinner, at a kink. Now and then it branches.
6. **Surface.** At the waterline the tip turns and spreads a little, then stops.

## Salts (real colours)

| Salt | Metal | Colour | Habit |
|---|---|---|---|
| Copper | copper(II) sulfate | blue to cyan | steady tall tubes |
| Cobalt | cobalt(II) chloride | violet to magenta | thin fronds, many branches |
| Nickel | nickel(II) sulfate | pale green | thin straight wisps |
| Iron | iron(III) chloride | rust orange | thick, crusty, short bushes |

## Bar (Bar v3)

| Part | Content |
|---|---|
| Choice | Salt: Copper, Cobalt, Nickel, Iron (keys 1 to 4), each with a colour dot |
| Actions | Scatter (Space): a handful of seeds across the tank · Clear (C): the towers crumble and the tank is empty |
| Slider | Strength: the water glass. Weak gives thin, fast wisps; strong gives thick, slow, bulbous towers. |
| Settings | Quality (shared) |
| Help | Click: drop a crystal · Drag: sprinkle a line · Space: scatter · C: clear |

## Tech

- **Towers:** one `InstancedMesh` of capsule segments. Each instance holds two ends and two radii. A custom shader draws a hollow skin: back light comes through the middle, the rim is dense colour, a fresh tip is pale.
- **Growth:** a CPU model per tube in `garden.js` (pure logic with a node test): buoyant climb, noise wobble, pulses, tip beads that pop, branches, a stop at the surface.
- **Particles:** one `Points` pool for burst puffs, landing dust and the falling crystal's trail.
- **Post:** RenderPass, half-size bloom with a threshold, a grade pass (vignette, grain), OutputPass.
- **Programs stay small** for Windows D3D11.

## Sound

- Drop: a small plop at the surface. Land: a glassy tick.
- Each tip burst: a soft wet pop, pitch from tube width, panned with the tower.
- Growth: a faint fizz bed, its level from the total growth rate.
- Muted by default. No hit repeats exactly.

## Loop and rules

- Lively while a seed falls, a tower grows or a puff lives. Then the loop stops. No ambient drift.
- Pointer parallax of a few degrees; none under reduced motion.
- Reduced motion: growth steps without wobble, no parallax, puffs fade in place.
- Watchdog: pixel ratio, then bloom size, then the segment budget.

## Tasks

1. Blockout: tank, lamp, grit, static towers. Screenshot at 1280 x 800.
2. Growth model and the hero moment.
3. Look: tower shader, glass, bloom, grade.
4. Sound.
5. Bar v3, icon round, emblems, Lab entry.
6. QA Q1 to Q10, toy doc, commit.
