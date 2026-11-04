# Collatz coral (`coral`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Every number's path back to 1 grows as one branch of a coral, under moving underwater light. Tap a branch tip to hear its path sung down to the root.

**Architecture:** three.js 0.170 as a thin host: an orthographic camera, one instanced segment mesh, and bloom. The CPU builds the Collatz tree once, lays it out from two turn angles, and rebuilds the layout live as the Bend slider moves. Growth, glow and caustics are shader uniforms.

**Tech stack:** three.js 0.170 (InstancedBufferGeometry, EffectComposer, UnrealBloomPass, OutputPass), Tone.js through `kit.tone()`.

**Spec:** shortlist 50 in [toy-ideas.md](../toy-ideas.md); rank 12 in [toy-plan.md](../toy-plan.md); batch rules in [README.md](README.md).

| | |
|---|---|
| Size, estimate | S · $10 to $15 |
| Kits | none |
| Before the build | nothing |

## The shot

Deep water, lighter toward the surface at the top of the frame. A coral rises from one root at the bottom centre: a thick trunk near 1, fanning into thousands of fine tips.
Caustic light ripples slowly over it from above. Fresh tips glow; older wood is deeper in colour.
The first frame shows the full grown coral for N = 20,000, already lit.

## Hero moments

1. **It grows.** On load, and on Grow, branches extend from the root outward with glowing tips, like a time-lapse of a reef.
2. **It bends.** Drag the Bend slider and the whole coral sways and curls in real time, from kelp to fan to tight spiral.
3. **The hailstone song.** Tap a tip: a pulse runs down its branch to the root while its sequence plays as a melody. It rises on odd steps, falls on halvings, and always ends on 4, 2, 1, home.
4. **Thickness that means something.** Branch width follows how many numbers pass through it, so the trunk is heavy and the tips are hair-thin, like real coral.

## Loop

- Drag: pan. Wheel or pinch: zoom.
- Tap a branch: the hailstone song for the nearest tip. A tap in open water sends a soft ring of caustic light out from that point.
- Bend: reshape the coral.
- Grow: add the next quarter of N, which grows in.
- Shuffle: a new angle ratio and palette.

## Bar

| Control | Content |
|---|---|
| Chips (dot plus name) | Reef, Bone, Abyss, Ember |
| Slider | Bend |
| Actions | Grow, Shuffle |
| Settings | Count: 5k, 20k, 60k · Caustics: Off, On · Quality: Standard, High (shared) |
| How | Click/Tap: sing a branch · Drag: pan · Wheel/Pinch: zoom · Space: grow (mouse devices only) |

| Palette | Root (OKLCH) | Tip (OKLCH) | Water (OKLCH) |
|---|---|---|---|
| Reef | 0.55 0.12 35 | 0.85 0.12 20 | 0.25 0.05 210 |
| Bone | 0.7 0.03 80 | 0.95 0.02 90 | 0.2 0.05 255 |
| Abyss | 0.4 0.12 290 | 0.85 0.15 195 | 0.1 0.02 260 |
| Ember | 0.45 0.14 30 | 0.9 0.15 70 | 0.13 0.02 30 |

## Tech

**The tree.**

- `parent(n)` is `n / 2` for even n, else `3n + 1`. Walk each n from 1 to N up the path until a known node, then add the new nodes.
- Store nodes in typed arrays: value (Float64), parent index, depth, subtree count. Use a `Map` from value to index.
- Values stay below 2⁵³, so plain numbers are exact.
- Expect up to about 6N nodes. Measure the real count in Task 1 and note it in the bean.
- Birth order is the node's index, in order of first visit. Growth reads it.
- Subtree count: accumulate from the leaves to the root, in reverse index order.

**Layout.** `layout(e, o)`: heading(n) = heading(parent) + turn, where turn is `e` for even n and `o` for odd n. Then pos(n) = pos(parent) + L · dir(heading).

- Bend b in [0, 1] sets `e = lerp(0.05, 0.22, b)` rad and `o = −e * ratio`. The ratio is 1.9 by default; Shuffle picks 1.4 to 2.4.
- Width is `0.6 + 0.8 * log2(subtree + 1)`.
- One pass is O(nodes), about 5 ms for 360k nodes. It runs at most once per frame while the slider moves, then uploads the instance buffer.

**Draw.**

- One instanced quad per node, from the parent's position to its own. Attributes: a (vec2), b (vec2), width, birth, highlight.
- **Growth:** visible when `birth < uGrow`. Tip glow is `exp(−(uGrow − birth) / 400)`.
- **Colour:** the palette mixes from root to tip by depth.
- **Caustics:** three rotated sine-warp layers in screen space, drifting, which brighten the coral from above. They fade with depth into the frame.
- Water background gradient, light rays from the top, a vignette and grain. Bloom at a high threshold catches only glowing tips and the pulse.

**Hit test.** A uniform grid over tip positions, rebuilt after each layout. Tap picks the nearest tip within 24 px.

**Song.** The path from the tapped n to 1. Each value v maps to note `round(14 * log2(v) / log2(peak))` of 15, a major pentatonic over three octaves; `peak` is the path's highest value. Every song uses the full range, and 1 is always the tonic. Tempo is 7 notes per second.
The pulse runs down the same path in step with the notes: the highlight attribute takes a start time per node.

## Sound

- **Song notes:** a soft marimba-like voice, FMSynth with harmonicity 3 and a short decay, panned by node x.
- **The last three notes (4, 2, 1):** they slow down and resolve to the tonic with a longer tail.
- **Growth:** soft bubble ticks, a sine with a fast upward glide, at most 8 per second, quieter with depth.
- **Bed:** a low, filtered underwater drone at −36 dB, while lively only.

## Finesse

- Branches thicken toward the root by traffic, not by depth, so busy paths look structural.
- Caustics touch the upper coral more than the lower.
- The Bend morph eases: the layout follows the slider with τ 80 ms, so the coral sways rather than snaps.
- The melody makes the math audible: long climbs for numbers like 27, quick falls for powers of two.
- The palette's root and tip hues are far apart, so depth reads as colour.

## Reduced motion and idle

- **Reduced motion:** growth appears at once with a fade, caustics stay still, and a tap lights the whole path at once while the song plays.
- **Idle:** with Caustics on, the toy drifts: 30 fps, asleep 60 s after the last input. With Caustics off, the loop sleeps once growth ends.

## Review focus

1. **Count at 60k on a phone:** the build takes about 200 ms. Run it in idle slices, as Snow globe's start does, so the intro does not hitch.
2. **Bend dragged fast:** the layout runs at most once per frame. Input never queues layouts.
3. **A tap during a song:** the old song stops at once, and the new one starts.
4. **Zoomed far in:** segments keep a minimum width of 1 px, and the hit test still works.
5. **Grow at 60k:** it stops adding at a cap of 120k, and the button shows `aria-disabled`.

## Tasks

### Task 1: The tree and the still coral

**Files:** Create `coral/index.html` and the bean.

**Produces:** `buildTree(N)` returns `{ value, parent, depth, sub, count }`; `layout(e, o)` fills `posA` and `posB`; `coralMat`.

- [ ] Tree, layout, instanced draw, palettes, water and bloom.
- [ ] Note the node counts for 5k, 20k and 60k in the bean.
- [ ] Q1, Q2 and stills of the four palettes at 1280 and 375 px. Checkpoint with Tom.
- [ ] Commit: `Collatz coral: the tree, laid out and lit`.

### Task 2: Growth, bend and caustics

- [ ] `uGrow` animation, tip glow, the live Bend, Grow, Shuffle and caustics.
- [ ] Commit: `Collatz coral: it grows, bends and catches the light`.

### Task 3: The hailstone song

**Produces:** `pickTip(x, y)` returns an index or −1; `sing(index)`.

- [ ] Hit grid, path highlight pulse and song timing.
- [ ] Commit: `Collatz coral: tap a branch to hear it sung home`.

### Task 4: Sound

- [ ] Song voice, cadence, growth ticks and bed. Q9.
- [ ] Commit: `Collatz coral: marimba song and growth ticks`.

### Task 5: Bar, menu and QA

- [ ] Bar, Settings and persistence. Pan and zoom limits. `toys.json`, and the menu Lab entry with its hook.
- [ ] Q1 to Q10. Tick the bean and record the cost. Commit.

## Kit handoff

None. The host scaffold (orthographic camera, pan and zoom, bloom) is what Ulam spiral needs too. Whichever builds second copies it.
