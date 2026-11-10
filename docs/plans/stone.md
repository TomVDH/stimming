# Worry stone (`stone`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A rough, dull stone fills the stage. Rub it and it polishes under your strokes: the surface turns glassy, and its hidden play of colour wakes and slides as the light moves. Splash it to see the finished polish for a few seconds, then it dries back.

**Architecture:** Raw WebGL2, one full-screen stone. A polish buffer (ping-pong, K1-style accumulation, no decay) records where you rubbed. A wet buffer records water and dries from the edges. One shading pass reads both, plus a procedural stone body, a height field and a light that follows the pointer.

**Tech stack:** raw WebGL2 on the `shared/stim.js` helpers; Tone.js through `kit.tone()`. No three.js.

**Spec:** idea 22 in [toy-ideas.md](../toy-ideas.md); rank 4 in [fidgets.md](fidgets.md); batch rules in [README.md](README.md); Bar v2 in [bar-v2.md](bar-v2.md).

| | |
|---|---|
| Size, estimate | S to M · $12 to $20 |
| Kits | K1 accumulation pattern from `trails/index.html` (`K1: accumulation and decay`), used with decay off. |
| Before the build | F3 in [fidgets.md](fidgets.md): no "warms in colour" |

## The shot

A dark stage. One smooth, palm-sized stone, close up, fills about 80 % of the frame. It is an oval with a shallow thumb-shaped dip in its centre.
One soft key light from above, a little to the side, and a dark ground with a soft contact shadow.
The stone starts rough and matte: grey, dusty, with only a hint of what lies inside.
Nothing else: no hand, no cloth, no tools.

The first frame is a picture: the stone already carries one polished stroke across its dip, where the play of colour shows through.

## Hero moments

1. **The first stroke.** Rub across the stone and the stroke turns glassy at once. Under it, the colour wakes.
2. **The flash.** Move the pointer and the light moves with it. Labradorite flashes from grey to electric blue and gold across one polished patch, then goes dark as the angle passes.
3. **Wet.** Splash the stone: the whole surface shows its finished polish, every band and flash, then dries back from the edges over 4 s. Lapidaries wet a rough stone to preview its polish.
4. **The dip.** The thumb dip polishes first and deepest, as real worry stones wear.

## Loop

- **Drag on the stone:** rub. Polish builds under the pointer, faster with speed and with a held press.
- **Pointer move, no press:** the key light follows the pointer, so flashes slide.
- **Tap:** a small splash of water at the tap point. It beads, then dries.
- **Wet (W):** water over the whole stone, then it dries.
- **+ Stone:** a new rough stone of the same kind with a new pattern.
- **Untouched:** no drift. The loop sleeps when the water is dry.

## Bar (Bar v2)

| Slot | Content |
|---|---|
| Top left | Choice: Stone, `segments`: Labradorite, Agate, Obsidian (keys 1, 2, 3) |
| Bottom left | Actions: Wet (key `W`), `+ Stone` (key `N`) |
| Bottom right | none |
| Bottom centre | Keys: `[DRAG] rub` · `[MOVE] tilt the light` · `[CLICK] splash` · `[W] wet` |
| Settings | Grit (slider: how fast polish builds) · Quality (shared) |
| Settings footer | Reset: the current stone goes back to rough |

Three visible controls.

| Stone | Inside | Polish shows | True detail |
|---|---|---|---|
| Labradorite | grey feldspar with lamellar patches | blue, green and gold flashes in narrow angle windows | Thin layers inside the crystal interfere, as a soap film does (labradorescence). |
| Agate | concentric bands, translucent | bands deepen; light glows through the thin edges | Polish lets light into the stone, so the bands glow from within. |
| Obsidian | black volcanic glass | a mirror-black surface with a soft rainbow sheen in bands | Tiny aligned crystals and bubbles scatter a sheen (rainbow obsidian). |

### At 375 px

- The stone turns upright and fills 86 % of the width.
- The choice moves bottom left as a stepper; the actions move bottom right.
- Touch: drag rubs; the light follows the touch while it is down, and eases back to the default after release.

## Tech

**Stone body.** A procedural field per kind, built once per stone into a texture:

- Labradorite: domain-warped noise for the feldspar, plus a patch map. Each patch has a lamella thickness and an orientation.
- Agate: distance to a warped seed curve, banded with varied widths; a translucency term from band and edge distance.
- Obsidian: near-black with a flow-banded sheen map.

**Height.** An oval dome with the thumb dip, plus fine rough noise. The normal comes from the height. Roughness noise fades as polish rises.

**Polish buffer.** Half resolution, `R16F`, ping-pong. A rub stamps a soft brush along the stroke, scaled by speed, press time and Grit, and capped at 1. The dip gets a 1.5 times bonus. No decay.

**Wet buffer.** Quarter resolution, `R16F`. A splash stamps water. Each frame it dries: faster at thin edges, slower in the dip, where water pools. A splash may leave a few beads that roll toward the dip.

**Shading.** One pass:

1. Effective polish = max(polish, wet).
2. Rough part: diffuse, dusty, a little chalky. Polished part: a clear coat with a sharp specular.
3. Play of colour: for Labradorite, a thin-film colour from the lamella thickness and the angle between the light, the view and the patch orientation, gated by polish. A narrow window makes it flash, not glow.
4. Agate: a sub-surface term through thin edges, gated by polish.
5. Obsidian: a sheen term along the flow bands, gated by polish.
6. Wet adds a dark tint where the water stands and a bright film specular.

**Light.** The key light direction follows the pointer with a 120 ms ease. The contact shadow on the ground moves with it.

**Post.** A mild bloom on the specular and the flashes; grade with grain and a vignette.

## Sound

- **Rub:** friction noise. Rough stone: grainy, low-passed brown noise with random crackle. As the polish under the pointer rises, the noise turns smoother, higher and quieter, until a near-polished surface gives a faint squeak.
- **Splash:** a small drip and a short spread hiss.
- **Wet:** a pour across the stone.
- **+ Stone:** a soft knock as the new stone settles.
- Level follows rub speed. Pan follows x. Jitter on every event. Muted by default.

## Finesse

- The sound tells you the polish under your thumb.
- Flashes sit in narrow windows, so a small move makes them appear and vanish.
- Water dries from the edges and lingers in the dip.
- A fully polished stone shows the key light as a small sharp highlight.
- Each new stone has a new pattern; no two are the same.

## Reduced motion and idle

- **Reduced motion:** the light does not follow the pointer; it stays at the default angle. Flashes still show where the polish meets the default angle. Water dries without beads.
- **Idle:** lively during a rub and while water dries. It sleeps when the stone is dry and the pointer is still. A pointer move wakes it for the light.

## Review focus

1. **Polish saturation:** a long rub caps at 1; the colour gate never over-brightens.
2. **Light follow on touch:** after release the light eases back, so a touch user still sees the flash windows.
3. **Stone change:** the polish and wet buffers clear; the body texture rebuilds within one frame budget.
4. **Pixel cost:** the shading pass is one full-screen pass; the buffers are half and quarter size.

## Tasks

### Task 1: Blockout (checkpoint)

**Files:** Create `stone/index.html`, the `toys.json` entry and the menu Lab entry with a low-fi icon and its `toys.stone` hook. Commit shared files with `--hunks`.

**Produces:** `buildStone(kind, seed)`, the height and normal, the polish buffer and `rub(x, y, v)`, the shading pass for Labradorite.

- [ ] One Labradorite stone, rough, with the first-frame stroke. Rub polishes; the light follows the pointer.
- [ ] Bar v2 spec with Stone, Wet, + Stone and Grit wired as stubs.
- [ ] Q1, Q2 and stills at 1280 and 375 px: rough, half polished, a flash. Checkpoint with Tom.
- [ ] Commit: `Worry stone: blockout, rub to polish`.

### Task 2: Three stones and water

- [ ] Agate and Obsidian bodies and their shading. The wet buffer, splash, Wet and drying.
- [ ] Q4: the loop sleeps when the stone is dry. A still of each stone, rough and wet.
- [ ] Commit: `Worry stone: agate, obsidian and water`.

### Task 3: Sound

- [ ] Rub noise that follows polish, splash, pour, knock. Q9.
- [ ] Commit: `Worry stone: the rub smooths as it polishes`.

### Task 4: Finish and QA

- [ ] Grit and persistence. The performance ladder: pixel ratio 1, then the buffer sizes.
- [ ] Q1 to Q10 in the browser pane. Tick the bean and record the cost. Commit.

## Kit handoff

None. The polish and wet buffers, marked as sections, suit Breath mirror (#115) or Chalk and sponge later.
