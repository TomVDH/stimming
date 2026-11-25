# Gas giant dive (`gasgiant/`)

| | |
|---|---|
| Dutch | Duik in een gasreus /dœyk ɪn ən ˈɣɑsˌrøːs/ (draft) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.74 0.12 185)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 367, group C: fall from orbit past the rings into the cloud bands. Bean `stimming-vxno`. Plan: [gasgiant.md](../plans/gasgiant.md). Tom sized the full toy XXXL; this is the MVP cut, "the plunge": from 260 km over the cloud tops to crush depth, 640 km down at about 1,000 bar.

## Rules

- One descent column. The capsule hangs where the hand lets go; the Depth slider takes it back up.
- A held dive takes about 3 min 20 s to crush depth: fast in the sky, slow in the decks, a glide through the voids.
- Units are km and seconds; altitude counts from the 1 bar level. Thunder runs at 1.2 km/s, the speed of sound in hydrogen.
- No more than three flash starts a second, always. Lightning starts in the water, indigo, salt and last decks and the lightning nest; none under the last deck.
- The loop runs at full rate while the hand dives, the capsule moves or a flash runs. The bands flow and the storm turns at 30 fps until the toy sleeps.

## Direction

- Seen from a capsule window (Tom, 2026-11-23), after Window seat: an angled view across a curved wall, a machined bezel, a tapered liner, two panes. The window lights the cabin, with one bounce of its light off the liner and wall; a dim lamp behind the eye shows the metal and paint.
- Entry: between 200 and 110 km, while the capsule falls fast, plasma streams past the pane in Fire's flame colours. It lights the cabin and melts the frost.
- A fictional giant in green, teal and purple (Tom, 2026-11-23): mint zones, jade and teal belts, a purple storm with a magenta heart and teal filaments.
- Bright rings arch over the northern sky, seen from their unlit side. Their shadow lies on the deck.
- A low sun at the side, 10 degrees up (Tom, 2026-11-23): the heads on the deck throw long shadows.
- Everything outside is raymarched. The storm's billows swirl on angle and log radius, as Tornado alley's storm deck does.
- The top deck (Tom, 2026-11-24): whole cover with no holes or breaks, in east-west bands with a few large swirls like Tornado alley's (Tom: "a couple of swirls that otherwise integrate into cloud bands"). A tile 4,096 km square, baked once at load, holds five whirls 300 to 840 km across; each drags the band lines round it and winds them into a calm core. One stands ahead of the start view. A step toward the sun lights each roll's sunward side. On the deck the sun leads; shade keeps little fill and takes a bruised violet in the folds, as under Tornado alley's storm base.
- Grandeur over the tops (Tom, 2026-11-24): far bands fade into the limb's teal over 1,100 km, brightest toward the sun; the haze over the deck glows with a 40 km scale height, so a band of atmosphere stands over the curve and fades into space.
- Twisters take Tornado alley's funnel light (Tom, 2026-11-24): a lit flank that falls off into the body, cool slate shade that darkens with depth, a darker top under the ceiling.
- The upper void's twisters are alien, tall and imposing (Tom, 2026-11-24), in three varieties: banded, wide, smooth. Each bakes once at load into an unrolled wall (angle across, height up). The march wraps the wall round a bent, swaying axis and turns it, so the collars spiral up; a girth wave climbs the column. The light stays live: normals from the wall, a rim toward the light, flashes. Fourteen stand ahead of the eye, 42 km tall (Tom, 2026-11-24): two up front, seven in the middle distance (110 to 250 km), five far off (320 to 850 km, seeded). One is a medium wedge; the rest are thin, and about half taper to a tip at the base wherever they stand (Tom, 2026-11-24). They are backlit: their light comes from behind them, as the eye sees them, and from above, so the rims glow. The backlight is volumetric: each sample measures the column between it and the light behind, so thin edges and wisps glow through and the core stays dark. The ceiling sags into a wall cloud round each top, and the top fades out in it, raggedly, so the ceiling shows through (Tom, 2026-11-24: soft edges). Over cloud a foot melts into the deck in a dust heap; over a hole in the deck the funnel tapers to a tip in the air (Tom, 2026-11-24). They cost about 0.6 ms a frame on the RTX 3070. The other voids keep their noise twisters.
- Flipbook cards (Tom, 2026-11-24): the spike's backlit twister, 1.5 times the girth, baked once as 3 varieties by 12 turn frames, 1,024 by 692 pixels. Each frame keeps light and alpha only; the GPU packs them as BC5, 32.5 MB with mips (RG8 where RGTC is missing). Each card is a vertical plane through its twister, square to the view. It turns slowly, bends in a slow S from a fixed foot, sways, churns at the edges, and its wall climbs (two scrolled copies cross-fade). Colour comes from the light: jade cores, mint rims, the floor's green at the foot. Alpha gradients mask the top and the foot. The body is opaque; only the soft edge passes light (Tom, 2026-11-24). Flashes light the thin parts most. The default, marched near and cards far (Tom, 2026-11-24: "fully marched ones for the close ones"; made default the same day), marches the spike's density and backlight live within a set distance (60 km: the two up front) and draws cards past it. The marched ones share the cards' girth and colours; a tip twister tapers to a tip, and the top thins out over a long reach into the wall cloud. With cards or marched twisters the wall cloud and the dust widen to the 1.5 times girth. At -20 km with the bake off: 6.8 ms marched near, 6.7 ms all cards, 6.9 ms the relief march, 5.4 ms with none.
- Ceiling funnels, a Dev mode (Tom, 2026-11-24: "the cloud layer warped down as a contiguous piece", as in Tornado alley): at each twister the ceiling's own cloud is pulled down to the floor, at the cards' girth, its wall ragged by the deck's noise and swirling on angle and log radius. It is part of the cloud density, so the far bake holds it and the rolling rebake turns it; no twister layer draws. Its light taps toward the ceiling shift per pixel, so the ceiling's shadow does not band its smooth wall. It is backlit and side-lit (Tom, 2026-11-24): where the view grazes the wall the rim glows toward the light behind, the side to the light lifts, and the body is a little brighter; Dev, Funnel rim scales it. With the bake off at full size and 1.5 times the steps it costs 2.7 ms over the relief march. At -20 km, 1,620 by 1,194, on the RTX 3070: 6.1 ms a frame against 7.2 ms for the live march. `probe-flipbook.html` shows the cards alone and times them. The cards bake when the eye first comes within 12 km of the void's ceiling, one frame each animation frame, and the BC5 packing takes one mip level a frame; the relief march draws until they are ready. A card reads its frames at a mip level set by its distance, since a read in the march's branches has no derivatives (Tom, 2026-11-24: flicker and vertical streaks).
- The upper void is 42 km tall, with a solid base (Tom, 2026-11-24). Narrow rifts let god rays in close by, wide breaks far off. The shafts are not the void's green: pearl under the ceiling, then rose-violet or ice blue by place; each tapers and fades as it falls. The haze is pale white near the eye; the void's green bleeds in with distance, and far shafts take it too. The brown deck under it stays mostly closed, with few breaks. Its towers fray at the rim and fade at each end, so no hard edge shows; near the window's end, 1,600 km out, cloud and haze melt into the end fog, so the far floor draws no line (Tom, 2026-11-24: soft edges). A far funnel's edge widens to about a pixel, so it does not stipple. The march settles over frames (Tom, 2026-11-24: far things dissolved into noise): each frame takes 15% new march over the last; a turn, a fast fall or a flash takes more. The jitter is interleaved gradient noise. The far view bakes (Tom, 2026-11-24: "bake the layer up to a certain distance"): past 25 km the march runs once into a cube map round the eye, 1,280 square per face, three jittered passes per strip, built in strips over a few frames once the eye hangs still and again when it moves 0.1 km. While the eye hangs still the bake rolls (Tom, 2026-11-24): a second cube builds one strip a frame, about 144 frames a pass, then the two swap and the view cross-fades over 1.5 s, so the baked clouds keep drifting. About 0.2 ms a frame; the second cube takes about 98 MB. Each frame then marches only the near 25 km and reads the bake past it; a second cube holds the depth where its clouds reach half cover, so a thin wisp does not hide a twister. The twisters stay live: past the near reach they go over the bake, opaque, tinted toward the horizon's colour by the haze in front, and hidden behind its clouds. While diving the march runs in full. At -20 km on the RTX 3070: 2.3 ms a frame against 4.9 ms. Dev: Render, Bake past, km (0 is off). The history is full size: the half-size march shifts its rays by a sub-pixel each frame (eight Halton steps), so a still view sharpens to near full detail.
- At the first touch the capsule skims the tops to their horizon; thunderheads in one 90 km cell in fifteen punch up to 32 to 40 km, lumpy towers with domed tops and thin anvils frayed at the rim, pushed downwind; the haze lid's sheets pass as thin streaks combed by the wind. Inside the white deck, dense billows stand against brighter gaps (Tom, 2026-11-23).
- Near the eye the white deck shows relief at Juno's scale: popcorn heads and folded ridges along the bands, with shaded valleys (Tom, 2026-11-23).
- Three decks with a void under each of the upper two (Tom, 2026-11-23). Hourglass towers join each floor to its ceiling, far off in the haze.
- A deep, majestic, abyssal dive with much variance in the layers (Tom, 2026-11-23). Sixteen layers, top down (diagram: [gasgiant-layers.svg](../plans/gasgiant-layers.svg)):

| km | Layer | Kind |
|---|---|---|
| 40 to 22 | Haze lid | Thin teal sheets over the tops |
| 22 to 0 | Ammonia | White deck, popcorn heads and ridges |
| 0 to -40 | Upper void | Solid storm ceiling, coloured god rays near and far, towers, six alien twisters |
| -40 to -50 | Brown | Deck |
| -50 to -64 | Mushball fall | Void: slush hail falls in streaks |
| -64 to -92 | Water | Deck, lightning |
| -92 to -140 | Shelves | Violet sheets 16 km apart, some whole, some lace |
| -140 to -158 | Veil | Purple gauze |
| -158 to -230 | Nave | A forest of columns 72 km tall |
| -230 to -262 | Indigo | Heaped deck, lightning |
| -262 to -360 | Gyre | Void: colossal towers, a vast eyewall 440 km off, rays down its eye |
| -360 to -385 | Salt | Pale jade deck in long wave rows, lightning |
| -385 to -425 | Lightning nest | Void: floor-to-ceiling bolts, three flash starts a second |
| -425 to -470 | Stairs | Laminae 9 km apart, teal and violet by turns |
| -470 to -500 | Last | Dark magenta deck, tall heads, rare lightning |
| -500 to -640 | Dark | Clear gas; the light fails; the hull fails at -640 |

- The voids are expansive stretches, as in Tornado alley (Tom, 2026-11-23): in a void the eye sees to the horizon, 1,600 km, where floor and ceiling meet. Towers gather in clusters and lines with open plains between; some join floor and ceiling, some rise as plumes, some hang. Rain curtains hang from the ceilings; a rare twister drops at a curtain's edge (Tom, 2026-11-23).
- Light gets into the clouds (Tom, 2026-11-23): under the deck tops it comes down through the ceiling, slanted to the sun's side; thin parts glow, cores go dark.
- Each void's ceiling is a storm base after Tornado alley's (Tom, 2026-11-23): folded lumps on a warped field, broad rolls, scud; the lit floor lights the crests, the folds go black.
- God rays and scale (Tom, 2026-11-23): ragged breaks 20 to 40 km across cut through each void's ceiling and the deck above. Light falls through them in slanted shafts that glow in the gas, brightest toward the light, and lands in soft pools on the floors and towers; the rest lies in shade. From above, the top deck stays whole; a break in a lower deck opens onto the lit void below.
- Each layer tints the light. The light fades slowly through the abyss and fails under the last deck. The eye opens up to 8 times as the light fails; flashes dim to match.
- The window has two layers (Tom, 2026-11-23). Against it: the storm's near fog streams past, curtains and banks in the near 32 m after Window seat's, lit by the flashes from their bearing. On it: beads, runs and fog from the shared wet pane, frost in orbit, ammonia rime in the white deck, mist deep down, veils of hue and brightness, heat shimmer.
- Under stress the pane bows in and the view swells; from 120 km down long jagged cracks run in from the rim, branch and join in a web; each new crack jolts the capsule. At 640 km the hull fails: a burst, then black, and the toy wakes at the top.
- Inside a deck, flashes come three times as often.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Actions | Dive (Space, hold) |
| Slider | Depth: drag up to rise, down to sink; it follows the capsule |
| Settings | Quality (shared), Reset (back to the cloud tops) |

| Input | Does |
|---|---|
| Hold on the stage | Dives; the fall gains speed, the frame shakes |
| Release | The fall eases to a hang over about 3 s |
| Drag | Looks round: 25 degrees each way, 15 up and down; the head moves a little |
| Hover (mouse) | The head sways up to 2 cm with the pointer, as in Window seat; the aim follows a third of the way. Still under reduced motion |
| Scroll | Leans to the glass or back into the seat, as in Window seat; leaning in turns the angled view straight out through the port |
| Pinch (two fingers) | Leans, as the scroll does; a pinch never dives |
| Click | A short sink |
| Space (hold) | The same as a hold |

## Loading and state

- The march links in four zones (tops, top, mid, deep). Over 12 km only the top deck renders: its cover is whole, so rays stop at its base (Tom, 2026-11-24: "only the layer that's visible renders"). Every zone's rays stop at its floor. Only the start zone links before the first frame; the others link after it, in the background, while the eye is in the deck. The capsule holds at a zone's edge until that zone has linked.
- A reload or a lost GPU context resumes at the same depth and look, within 30 minutes, in the same tab.

## Sound

Web Audio on the shared kit, muted by default. Wind through a low-pass that falls with pressure, buffets in the dive, a low hum that climbs with depth. Thunder from flashes within 45 km, late by distance at 1.2 km/s, scheduled on the audio clock. Mute and a hidden tab stop every pending sound; the context sleeps after the last one.

## Files

| File | Holds |
|---|---|
| `index.html` | Page skeleton |
| `main.js` | Bar, capsule and eye, gestures, frame loop, ladder |
| `world.js` | Planet, decks, light table, ring profile, palette, shared GLSL |
| `map.js` | Pass 1: bands, the storm, its wake |
| `clouds.js` | Pass 3: the cloud march, voids and towers (noise kit from Volcano); `marchFS(zone)` cuts it into four zone programs. `SWIRL_FS` bakes the top deck's swirl tile |
| `twisters.js` | The upper void's twisters: the wall bake (`WALL_FS`), their march (`TW_MARCH`), the ceiling sag and the foot dust (`TW_DECL`), and the set. The flipbook cards: their bake (`CARD_BAKE_FS`), BC5 packing (`CARD_ENC_FS`, `bakeCards()`) and shading (`CARD_GL`) |
| `probe-flipbook.html` | Dev probe (`noindex`): the cards alone over a painted void, timed |
| `sky.js` | Space, sun, rings, limb haze |
| `post.js` | Pass 4: the composite. The final grade |
| `cabin.js` | The capsule: wall, bezel, liner, panes; the window's two layers (near fog copied from Window seat, wet pane from `shared/wetglass.js`), cracks, the crush |
| `bolts.js` | Lightning timing |
| `sound.js` | Web Audio |

Dev: `?dev` shows the Dev sheet (Tom, 2026-11-23), in groups: Go to (any layer); View (window frame on or off: off takes away wall, bezel, liner, panes and the pane's weather, so the clouds fill the screen; pitch, yaw past the drag's limits); Render (pixels auto or native, clouds at half or full size, steps 1x to 2x, bake past); Twisters (draw as the relief march, flipbook cards, marched near and cards far, or ceiling funnels; marched within, km; card light; funnel rim); Sun (azimuth, elevation); Exposure (exposure, eye gain cap); Clouds (light into cloud, ambient, floor bounce, haze reach, god rays); Storm (flash strength); Window (near fog, drops, pane fog, cracks by depth, off or full); Window effects (Tom, 2026-11-24: frost, entry glow, wipes, rime, rain and drops, pane fog, heat shimmer, near fog, each by depth, off or full); Window timing (crush length, wipe rise and speed, frost melt and return, crack jolt, near fog rush); Window play (crush, entry burn and crack jolt on demand; the crush preview does not return to the top); Reset. The values persist, and apply without `?dev` too.

Links: `?alt=-14` starts at that height; `?out` shows the outside with no cabin; `?qa` exposes the state as `__gg`, times each shader link, and `__gg.bench(n)` times n frames on the GPU. `__gg.tune(id, v)` sets a dev value; `__gg.dbg` shows one light term on the clouds (1 slope, 2 fold, 3 sun, 4 inner, 5 sky and diffuse) or 9, a twister at every curtain.

## QA

Stills: `docs/qa/gasgiant/`.
