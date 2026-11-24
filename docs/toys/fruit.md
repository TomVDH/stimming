# Fruit slice (`fruit`)

Lab toy. Bean `stimming-7pgt`. Plan: `docs/plans/fruit.md`. Started as Kiwi (2026-11-23); renamed when the fruits became ten.

One big fruit on a dark ground, under a warm key from the front left, a hot rim light from behind and a soft top light. Far lamps open into soft discs behind it.

## Fruits

| Key | Fruit | Inside |
|---|---|---|
| 1 | Kiwi | Flesh drawn at two depths, wandering pale rays; 38 spokes of jelly cells, each a juice bead round a black seed; a raised fibrous core. Fuzz with rubbed short patches |
| 2 | Pomegranate | 380 arils as real geometry: long teardrops pressed flat against their neighbours, juice lit through to a seed inside; some sliced flat at the cut. Open chambers between spongy pith walls; a crown with dry stamens |
| 3 | Blood orange | One wet translucent face: dark maroon flesh with red and orange patches; each cut sac a small round dome, so the studio's reflection breaks into crinkled glints; faint segment walls, a soft pale core, a narrow pink-white albedo, a thick orange rind with oil glands |
| 4 | Peach | Pale cream wet flesh; dark red at the stone that thins into soft threads, each angle its own reach; red under a blushed skin. An almond stone with deep furrows and pits, red flesh caught in them, in one half; its wet red hollow in the other |
| 5 | Dragon fruit | Grey-white translucent wet flesh, finely crinkled, black oval seeds each in a clear halo; a thick magenta rind that blushes inward. Skin crimson-magenta with thick fleshy bracts in a spiral, green at the tips, a crown of them at one end |
| 6 | Rambutan | Glassy white flesh round a brown seed; long hooked spines (the fuzz ribbons) |
| 7 | Mangosteen | A thick crimson rind round white segments; a green four-lobed cap |
| 8 | Passion fruit | A mound of 300 soft golden jelly sacs as real geometry, each with a dark seed off its middle, over a juice floor; a thick spongy pith with a yellow lining. Skin: deep purple folds and dimples, fine white specks |
| 9 | Starfruit | A star slice: translucent yellow flesh, a pale star core, brown seeds |
| 0 | Fig | A white rind round red fibres and pale seeds, a small dark hollow |

## Play

| Input | Act |
|---|---|
| Press the fruit | A dent where pressed. Release: it springs back with a hop. |
| Hold | Squeeze: the fruit squashes flat and its fuzz ruffles. |
| Swipe across it | Slice: juice in the fruit's colour bursts out; the halves swing their faces to the eye. |
| Tap a half | It hops and wobbles and throws a few drops. |
| Hold a half | That half squashes and drips juice from its face; release: it springs back and squirts. |
| Drag the background | The lights swing round the fruit. From behind, light comes through the skin and the flesh. |
| Swipe across a half or a wedge | It splits lengthwise, along the swipe: two wedges open like a book, each with a lengthwise cut face. Wedges split again while they are wide enough. |
| Flick a half or a wedge | A quick short drag: it jolts, and its loose bits tumble out of the face: arils, pulp sacs or seeds. They bounce, roll and rest on the floor until the next fruit. |
| Tap the gap | Join: every piece slides back, the wedges become the two halves, which meet with a thunk. |
| Pick a fruit | The fruit on stage rolls off to the left; the new one rolls in from the right. |
| Keys | 1 to 0 pick a fruit, Space slices or joins, F flicks every piece (or slices a whole fruit), hold S squeezes |

## Bar v3

Choice Fruit (ten options, a stepper; keys 1 to 0). Actions Slice (Space), Flick (F) and Squeeze (S, hold). Slider Fuzz, kept per fruit: any fruit can grow fuzz. Quality in Settings.

## How it works

three.js 0.170, WebGL2, custom shaders only. The ideas of raspberry.luruke.com are reworked as our own code; no code is copied (that page shows no licence).

| Part | File | Method |
|---|---|---|
| Depth | `half.js` | The cut-face shader passes the view ray's slide per unit depth (`gPar`); a fruit samples its flesh again below the cut. |
| Light | `glsl.js` | Wrap diffuse with a scatter tint; reflections of a procedural studio (key, rim, fill and top softboxes) blurred by roughness; Schlick Fresnel |
| Wedges | `main.js`, `half.js` | A piece is a half's meshes with a sector round the axis: every shader of the half drops what lies outside it. Pieces clone the half's meshes with their own uniforms, relinked to the light rig. A lengthwise cut face draws the fruit's own cross-section pattern, read by depth toward the skin and turned slowly along the length; fruits with open chambers fill them with juice cells there. Each piece finds its own floor contact. |
| Floor | `main.js` | The whole fruit's lowest skin point sets its rest height. Each frame an open half finds its lowest hull point in its new pose and sits there; its own squash keeps that point down. |
| Light through | `half.js` | For each skin point, the path each light runs inside the fruit's ellipsoid to reach it (cut short at an open half's face); Beer-Lambert in the fruit's own colour, brightest looking toward the light. Cut faces glow more toward the back light. |
| Halves | `half.js` | A lathe skin per half, the cut face at x = 0. The join ring's normals lie in the cut plane, and a press on the whole fruit dents both halves, so the seam never shows. Skin colour, specks and pores run in fruit space, so the seam does not show. |
| Cut face | `half.js` | A disc that follows the fruit's outline (a crease, a star), or a ring round a pit. Each fruit gives its colour and a relief; the relief bends a wet film that reflects the studio. |
| Arils | `arils.js` (pomegranate, passion fruit) | Each aril is its own mesh: a teardrop whose radius is capped by a smooth minimum against the plane to each neighbour, and by the cut plane. Shading runs in the aril's own sphere space: the view chord, the seed, Beer-Lambert, a sharp studio reflection. Contact and depth darken it. |
| Juice beads | `half.js` | Instanced ellipsoids. Four steps along the view chord in the bead's own space, a chord to each light from every step, Beer-Lambert per channel. A seed inside ends the view ray: seen through the juice. |
| Fuzz | `fuzz.js` | Instanced ribbons on four control points with fibre wrap light. Per fruit: count, length, width, lift and curl (the rambutan's spines). |
| Fruits | `kiwi.js` to `fig.js`, listed in `fruits.js` | Shape, skin look, tip parts, the cut face |
| Bits | `bits.js` | Up to 90 loose bits as instanced teardrop juice beads (the cut faces' optics, a seed inside). Gravity, a damped bounce, floor friction that turns into a roll, pushes between bits and off the fruit's pieces, rest once still. Per fruit: pomegranate arils, passion fruit sacs, kiwi, dragon fruit and starfruit seeds. A hard landing ticks. |
| Puddle | `puddle.js` | Landed drops splat into a float texture over the floor (depth, and colour times depth). Juice flows from deep to shallow while it is thicker than a thin film, so the edge holds and colours mix. The floor draws it with a rim normal from the depth gradient, the floor tinted under it, and a planar reflection: the scene rendered from a mirror camera below the floor, at half size, only while there is juice. It flows for six seconds after the last drop, then rests; a new fruit drains it. |
| Juice | `juice.js` | Up to 120 drops with the bead optics, stretched along their flight |
| Finish | `post.js` | Depth of field (disc gather), bloom, ACES, vignette, grain |

Baked soft light (spherical-harmonic transfer) is skipped: it needs an offline bake.

## Sound

Raw Web Audio on the shared kit, muted by default: a squelch, a boing, a knife swish with juice ticking down, a thunk when the halves meet or a fruit lands.

## Frame loop

Lively at full rate while anything moves; drifting at 30 fps (the slow-frame watch counts only full-rate frames); asleep 60 s after the last input. A swap compiles the new shaders at once and restarts the slow-frame watch. Reduced motion: no drift, a smaller burst, no roll (the fruit swaps in place).
QA on D3D11 (RTX 3070, headless Edge, 1280 x 800): every fruit 7.6 to 7.8 ms median during a slice; no quality step after nine swaps.

## Known

- Tom sets the Dutch name; "Fruitsnee" is a draft.
- The menu icon is still the kiwi of round kiwi-1.
- Next: a raspberry-grade procedural pass, one fruit at a time (Tom, 2026-11-23).
