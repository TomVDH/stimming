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
| 6 | Rambutan | Glassy grey-white flesh at two depths, fibrous along the ray, clearer at the seed; a papery seed coat; a thin dark gap at a cream and red shell. Crimson skin under many long soft spines (the fuzz ribbons) with curled dark tips |
| 7 | Mangosteen | Six snow-white segments as soft pillows with shaded creases, each bulging to a rounded lobe; a dark gap; a thick wine-red rind, near black at the skin, a few yellow latex beads. Skin a glossy near-black purple; an olive four-lobed cap |
| 8 | Passion fruit | A mound of 300 soft golden jelly sacs as real geometry, each with a dark seed off its middle, over a juice floor; a thick spongy pith with a yellow lining. Skin: deep purple folds and dimples, fine white specks |
| 9 | Starfruit | A deep star slice: clear golden flesh at two depths with small juice-cell glints; a pale star core, a pale vein out along each arm, faint walls from each valley; small flat seeds near the core; a thin skin, brown at the ridge tips. Waxy golden skin, ridges green then brown at the crest |
| 0 | Fig | Wet strands of flesh, each a round ridge of its own shade, deep wine at the middle to rose and pale pink at the rind; many honey seeds with small shadows; an irregular dark slit in the middle; a cream rind with strands reaching in. Skin dark purple, green toward the stem, faint ribs and a dusty bloom |
| Ribbon | Lemon | Tapered yellow peel with oil glands, pale pith, membranes and radial juice sacs |
| Ribbon | Mango | Blushed gold skin with lenticels, orange fibrous flesh, a flat ejectable stone and recessed opposite hollow |
| Ribbon | Avocado | Uneven green skin, creamy green-to-yellow flesh, a rounded ejectable stone and its recessed hollow |
| Ribbon | Papaya | Green-gold skin, salmon-orange flesh and a recessed chamber of individual dark seeds; repeated squeeze releases black seeds |
| Ribbon | Coconut | Coarse brown fibers, thick pale flesh and a recessed central cavity |

## Play

| Input | Act |
|---|---|
| Press the fruit | A dent where pressed. Release: it springs back with a hop. |
| Hold still | Squeeze: a ring confirms the hold, the fruit squashes flat and its fuzz ruffles. An open piece first gives juice; repeated squeezes work loose its seeds, arils or stone. |
| Swipe through it | Slice: a warm cut trail previews the line; juice in the fruit's colour bursts out; the halves swing their faces to the eye. |
| Tap a half | It hops, wobbles and throws a few drops. Repeated taps release its seeds, arils or stone where present. |
| Hold a half | That half squashes and drips juice from its face; release: it springs back and squirts. |
| Drag the background | No action. The studio lighting stays fixed. |
| Swipe through a half or a wedge | It splits lengthwise along the preview line. The new wedges open, separate on contact and settle on the table. |
| Flick a half or a wedge | A quick short drag throws that piece. It slides, turns, bounces and pushes other pieces; arils, pulp sacs or seeds tumble out where the fruit has them. The visible table edge rebounds it into frame. |
| Join or Space | Every piece and loose bit returns to the fruit; the juice clears; the two halves meet with a thunk. |
| Pick a fruit | The fruit on stage rolls off to the left; the new one rolls in from the right. |
| Keys | 1 to 0 pick a fruit, Space slices or joins, F throws the last-touched open piece, hold S squeezes that piece |

## Bar v3

Choice Fruit opens a scrollable ribbon; keys 1 to 0 still pick directly. Slice changes to Join while the fruit is open. Flick (F) is available only when pieces are open. Squeeze (S) is a hold action. Each fruit determines its own fuzz; there is no Fuzz control. Quality in Settings.

## How it works

three.js 0.170, WebGL2, custom shaders only. The ideas of raspberry.luruke.com are reworked as our own code; no code is copied (that page shows no licence).

| Part | File | Method |
|---|---|---|
| Depth | `half.js` | The cut-face shader passes the view ray's slide per unit depth (`gPar`); a fruit samples its flesh again below the cut. |
| Harvest flesh | `harvest.js`, `half.js` | Lemon, mango, avocado, papaya and coconut sample a second layer below the cut and add fruit-specific, backlit scattering. Lemon and mango show stronger transmission; avocado and coconut keep a restrained diffuse response. Juice-cell relief breaks the wet reflection. |
| Light | `glsl.js` | Wrap diffuse with a scatter tint; reflections of a procedural studio blurred by roughness; Schlick Fresnel and roughness-dependent microfacet highlights on key and rim lights. |
| Skin materials | `skin-surface.js`, `half.js` | Each fruit has its own procedural relief, roughness, wax coat, bloom and velvet profile. Derivatives transfer surface relief into world-space normals. The skin combines diffuse energy attenuation, GGX highlights and studio reflections with a separate wax layer. Kiwi and peach favor velvet, fig a dusty bloom, citrus oil-gland relief, and mangosteen a stronger wax coat. Skin transmission is restrained independently from wet flesh. |
| Continuous harvest shapes | `harvest-shapes.js`, `half.js`, `main.js` | Lemon, mango, avocado, papaya and coconut sample continuous signed fruit coordinates across both halves. Join normals sample both sides; longitude normals share an average. Closed halves share one origin; floor support separates only as they open. |
| Fruit ribbon | `tray.js`, `tray.css`, `previews/` | The Fruit control opens a Star Chart-style ribbon over fading glass. Transparent renders show one cut half per fruit. Each strip holds 49 views across a 60° arc; hover or keyboard focus turns 30° each way at 30 fps. Rest and reduced motion hold the center view. Selected state, touch scrolling, arrow keys and Escape remain available. `preview.js` bakes the strips through the existing renderer in QA mode. |
| Wedges | `main.js`, `half.js` | A piece is a half's meshes with a sector round the axis: every shader of the half drops what lies outside it. Pieces clone the half's meshes with their own uniforms, relinked to the light rig. A lengthwise cut face draws the fruit's own cross-section pattern, read by depth toward the skin and turned slowly along the length; fruits with open chambers fill them with juice cells there. The two sides of a fresh cut sit a hair inside their own wedges, so wet faces never fight on one depth plane. |
| Piece physics | `main.js`, `piece-physics.js` | Each piece keeps its own table position and velocity, lift, axial rotation, table rotation, size, mass, squeeze history and remaining contents. Children inherit the parent's momentum once, then move independently. Three contacts along the length and up to two across the sector follow its rendered transform; six bounded contact passes separate overlapping pieces by inverse mass with friction and restitution. Each correction refreshes its contacts; low-speed contacts do not bounce. Camera-aware bounds rebound free pieces before they leave view. Gravity, floor bounce and friction settle them. Join springs every piece home before the original halves return. |
| Stones | `main.js`, `peach.js`, `rambutan.js` | The detailed peach stone and rambutan seed belong to one piece after subdivision, never every shader-clipped child. A repeated squeeze can eject that existing mesh as a rolling, bouncing table object. |
| Floor | `main.js` | The whole fruit's lowest skin point sets its rest height. Each open piece finds its lowest transformed hull point, then its lift bounces against that floor contact. Up to eight soft contact shadows ground the pieces separately, spreading and fading while a piece is airborne. |
| Light through | `half.js` | For each skin point, the path each light runs inside the fruit's ellipsoid to reach it (cut short at an open half's face); Beer-Lambert in the fruit's own colour, brightest looking toward the light. Cut faces glow more toward the back light. |
| Halves | `half.js` | A lathe skin per half, the cut face at x = 0. The join ring's normals lie in the cut plane, and a press on the whole fruit dents both halves, so the seam never shows. Skin colour, specks and pores run in fruit space, so the seam does not show. |
| Cut face | `half.js` | A disc that follows the fruit's outline (a crease, a star), or a ring round a pit. Each fruit gives its colour and a relief; the relief bends a wet film that reflects the studio. |
| Arils | `arils.js` (pomegranate, passion fruit) | Each aril is its own mesh: a teardrop whose radius is capped by a smooth minimum against the plane to each neighbour, and by the cut plane. Shading runs in the aril's own sphere space: the view chord, the seed, Beer-Lambert, a sharp studio reflection. Contact and depth darken it. |
| Juice beads | `half.js` | Instanced ellipsoids. Four steps along the view chord in the bead's own space, a chord to each light from every step, Beer-Lambert per channel. A seed inside ends the view ray: seen through the juice. |
| Fuzz | `fuzz.js` | Instanced ribbons on four control points with fibre wrap light. Per fruit: count, length, width, lift and curl (the rambutan's spines). |
| Fruits | `kiwi.js` to `fig.js`, `harvest.js`, listed in `fruits.js` | Shape, skin look, tip parts, the cut face |
| Bits | `bits.js` | Up to 90 loose bits as instanced teardrop juice beads (the cut faces' optics, a seed inside). Gravity, a damped bounce and floor friction turn into a roll. Three moving proxies per fruit piece push and wake resting bits. Bits separate from each other and rest once still. Per fruit: pomegranate arils, passion fruit sacs, kiwi, dragon fruit and starfruit seeds. A hard landing ticks. |
| Puddle | `puddle.js` | Landed drops splat into a float texture over the floor (depth, and colour times depth). Juice flows from deep to shallow while it is thicker than a thin film, so the edge holds and colours mix. The floor draws it with a rim normal from the depth gradient, the floor tinted under it, and a planar reflection: the scene rendered from a mirror camera below the floor, at half size, only while there is juice. It flows for six seconds after the last drop, then rests; a new fruit drains it. |
| Juice | `juice.js` | Up to 120 drops with the bead optics, stretched along their flight |
| Finish | `post.js` | Depth of field (disc gather), bloom, ACES, vignette and grain. Scene and blur targets clear explicitly; non-finite colour or depth samples are contained before bloom. |

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
