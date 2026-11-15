# Spark wheel: spark types, a hot wheel, a better roller (`stimming-0d7r`) design

> Design spec. Tom picked the direction on 2026-11-14. Plan: `docs/plans/spark-zany-plan.md` (not written yet). Build nothing until Tom approves this doc, then the plan.

**Goal:** Spark wheel gets five new spark types that each have a trick, a wheel that heats up while it grinds and sheds the heat in one big flare, a roller with more detail, and a slightly smaller wheel on the stage.

**Why (Tom):** "more spark types, slightly more detail on roller, slightly smaller, more pizazz, let's get zany." The toy looks good but every type does the same thing, and a long grind gives nothing back.

**Where:** `spark/index.html` only (the WebGPU build, three.js 0.186.1, TSL). `spark/legacy.html` (Classic) stays as it is. No new library. No shared file changes.

## Approaches

| | Way | Trade-off |
|---|---|---|
| 1 | More metals: new colours and spark lengths only | Small. Every type still behaves the same. Not zany. |
| 2 | Types that behave: each type has its own trick, and the smoke joins in | Medium. Variety, but a long grind still pays nothing. |
| 3 | Way 2, plus a wheel that heats up and flares | Largest. The whole picture changes as you hold Space. |

**Tom picked 3.** Reason: the hot wheel gives Space a reason to be held, and it is the one part that changes the whole picture.

## Goals

1. Eight spark types in the choice: Ferro, Steel, Titanium (as today), then Sparkler, Comet, Ice, Confetti, Popcorn.
2. Each new type is clear from one second of sparks, with no label read.
3. A grind of about six seconds heats the rim from dark to red to white and ends in a flare. Each type has its own flare.
4. The roller reads as a made part, and its spin shows on the face.
5. The wheel is slightly smaller on screen, so sparks and smoke have more room.

## Non-goals

- No new gestures. Drag, click and Space stay as they are.
- No heat gauge, score or counter on screen. The rim's colour is the gauge.
- No change to Classic, to the menu icon, to `toys.json` or to the vignette.
- No smoke in the wet-floor mirror (as today).

## Anti-goals

- Skeuomorphic or fussy detail on the roller. It stays a bare machined wheel on its fork.
- A flare that fires so often it stops being an event.
- A drop below 30 fps on Standard quality.
- Brand names or brand looks.

## The spark types

Each type is one entry in the page's `METALS` table (rename it `TYPES`). The three metals keep their present values.

| Type | Sparks | Trick | Smoke | Flare |
|---|---|---|---|---|
| Ferro | As today | As today: stars, floor bounces | As today | A wide fan of its own sparks, every one a star, over a rising fireball |
| Steel | As today | As today: long forked streamers | As today | A wide fan of long streamers over a small fireball |
| Titanium | As today | As today: few, long, white | As today | A blinding white fan and a white fireball |
| Sparkler | Gold-white, short, many | Every spark forks; each fork forks once more | Thin, warm | One huge star: forks three levels deep |
| Comet | Few, big, slow, long tails | Each comet lays its own smoke trail through the air | Trails only | A salvo of twelve comets in a fan |
| Ice | Blue-white, crisp | Cold fog sinks and pools on the floor | Thick, pale blue, falls | A frost burst: a fan of ice shards, and a fog bank that rolls out over the floor |
| Confetti | Every spark its own bright colour | They flutter down slowly and lie on the floor as coloured bits for about six seconds | None | A confetti cannon: a tall cone of colours |
| Popcorn | Dull yellow kernels, short tails | A kernel lands, waits, then pops up white and bounces | A small puff of steam at each pop | Every kernel on the floor pops at once |

Rules that hold for all types:

- The choice label changes from `Metal` to `Sparks`. Eight options make it a stepper; the shell does this by itself. Keys 1 to 8 pick a type.
- A change of type takes effect on the next spark. Sparks and smoke already in the air stay as they are, except that all smoke takes the new type's tint and lift (so a switch to Ice makes hanging smoke sink; this is accepted).
- Reduced motion: no flare flash, flares at half size, Sparkler forks once only. Other rules stay as today (half the sparks, no smoke).
- The wet floor's hiss and steam puffs apply only to types that are hot (not Ice, not Confetti).
- The three metals share one flare shape (the builder's call, 2026-11-14): a wide fan of the type's own sparks plus a fireball. Their difference is the sparks themselves.
- With Smoke off, or under reduced motion, every flare still shows its sparks. Ice then has shards only; Comet has its big sparks with no trails. No setting is forced on or hidden.

### What the code needs for the types

- **Colour per spark.** Today every spark takes the blackbody ramp from its heat. Add one instanced attribute with a tint and a mix amount, so a spark can be ramp-coloured (metals, Sparkler, Comet), tinted (Ice) or fully its own colour (Confetti, Popcorn). Embers get the same tint, so floor bits keep their colour.
- **Deeper forks.** `launch()` forks one level today (`fd`). Sparkler allows two levels; its flare allows three. A hard cap on children per frame keeps the ring buffer (8000 slots) from wrapping inside one second.
- **Delayed second acts.** Popcorn and Confetti chain a second flight segment with a later start time. The spark system already holds segments with a future start time, so this is a `launch()` rule, not a new system.
- **Smoke per type.** The fluid's lift becomes a per-type value that glides on a change: positive for hot smoke, negative for Ice fog. Comet trails and Popcorn steam use the existing puff queue (`wisp()`), which already caps puffs at four a step.
- **Flutter.** Confetti cannot wobble in a closed-form path. Its fall is a second segment with high drag and a small random sideways speed. That reads as flutter and costs nothing extra.
- **Floor bits.** Confetti bits and popped corn use the ember ring with a tint and a longer life (about six seconds, then a fade). The ring grows from 512 to 2048 slots so a cannon does not wipe it. Nothing stays until Reset.
- **The smoke box stays as it is** (4.8 long, 2.4 deep, 6 high, same cell size), so the frame cost does not grow. The dye gets a soft fade at the side walls, so the Ice fog thins into the dark and does not stop at a flat plane. The fog bank is therefore a patch round the wheel and down the jet, not the whole floor. If stills show the patch is too small, a wider box is a new decision for Tom, with its frame cost measured first.

## The hot wheel

- **Heat** is one number from 0 to 1. It rises while sparks fly and falls when they stop.
  - Rise: about six seconds of full grind from cold to 1. Flicks and strikes add a little each.
  - Fall: back to cold in about five seconds with the wheel at rest.
- **What heat changes**, all smoothly:
  - The rim glows. Each type has its own three-step glow, and it glides on a change of type. Hot types (the metals, Sparkler, Comet, Popcorn): deep red, orange, white. Ice: deep blue, cyan, white, like frost. Confetti: the glow cycles through the colours. The flint tube glows a little less. The glow uses the materials' emissive colour, so bloom picks it up.
  - More and bigger sparks (up to about 1.8 times the count, 1.4 times the size).
  - More smoke and a real flame tongue at the flint (the heat fed to the fluid rises with it). Hot types only: Ice gets more fog and no flame; Confetti gets neither.
  - A stronger warm light on the mount and floor.
- **The flare.** When heat reaches 1:
  - The type's flare fires once (table above), with a burst of light and a large puff into the fluid: a rising fireball for the hot types, a rolling fog bank for Ice, nothing for Confetti.
  - Heat drops to about 0.35 and the wheel keeps turning. A held Space builds to the next flare in about four seconds.
  - One new sound: a low thump with a crackle after it. All other sounds stay.
- **Reset** sets heat to 0.

## The roller

- **Face with holes.** The face becomes a plate with five round holes on a circle, so the spin shows and light passes through. The far face has the same holes, in line.
- **Bevel.** A small chamfer where the face meets the knurled rim.
- **Axle nut.** A hex nut on the pin, on both sides.
- The knurled rim, the lathe rings on the face, the fork, the flint tube and the foot stay.
- The wet-floor mirror shows the same wheel, as today.
- The smoke still treats the wheel as a solid disc. Smoke does not pass through the holes.

## Size

- Wide stage: wheel radius from about 21% of the stage height to about 18%. The hub stays near 30% across; it may sit a little higher so the foot keeps its place above the bottom edge.
- Tall stage: the same step down, from about 12.7% to about 11%.
- The camera moves back; nothing in the scene is scaled. The drag-to-spin gain is retuned by hand so a flick feels the same.

## Constraints

- Hold 30 fps or better. Idle pages do no per-frame work; the loop still stops when nothing moves. Heat that is still cooling counts as moving only while the rim's glow is visible.
- Bar v2 rules: one choice group top left, at most five visible controls. No new control is added. `tests/bar-v2.html` must pass.
- Check 1280 px wide, 375 x 812 and 812 x 375.
- TSL pitfall, found twice on this toy: a value first used inside a `select()`, `Loop` or `If` body is undefined outside it. Declare shared values with `.toVar()` first, or use `step`/`mix` masks.
- Code comments follow ASD-STE100.
- Commit only through `tools/commit.sh`, one logical commit at a time.

## Left to the builder

- All numbers: spark counts, speeds, drags, lifetimes, tints, heat rates, the flare's size, hole size and place.
- How the holed face is built (for example two thin extruded plates inside an open knurled tube).
- How heat is fed to the materials and the fluid.
- The flare's light and its thump (within "one new sound").
- The order of work, as long as each commit leaves the page working.

## Not checkable in the agent's browser pane

The pane is usually hidden and fires no animation frames. So these stay open for Tom after the build: frame rate on a visible screen, sound by ear, drag by hand, a phone.
