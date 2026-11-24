# Fruit slice (`fruit`)

Status: active. Bean `stimming-7pgt`. Toy doc: `docs/toys/fruit.md`.

## Asks (Tom, 2026-11-23)

1. A new toony fruit toy with the rendering ideas of raspberry.luruke.com. Built as Kiwi.
2. "Other fruits?" then "let's keep going": more fruits; the toy is renamed Fruit slice.
3. "Severely improve quality and realism of all these fruits": the toon bands go; a studio light model and wet cut faces come in.
4. "10 fruits in total, non western fruits too": dragon fruit, rambutan, mangosteen, passion fruit, starfruit and fig join kiwi, pomegranate, blood orange and peach.
5. "Really procedural and very quality, fruit per fruit": the next passes, one fruit at a time, at the raspberry's level.

## Done

| Pass | What |
|---|---|
| Kiwi MVP | Juice beads, fuzz ribbons, toon light, lens finish, slice, squish, sound, Bar v3, icons, Lab tile |
| Registry | One module per fruit; Fruit choice; roll-off swap |
| Realism 1 | Studio reflections, wrap diffuse, wet film on a per-fruit relief, specks, pores; bead chord sign fixed (the march never ran before) |
| Ten fruits | Six new fruits on the shared parts |
| Pomegranate | Arils as packed teardrop meshes, some sliced; open chambers in a spongy pith; skin patches, streaks and scars; a big crown with stamens |
| Kiwi | Seeds in jelly cells along 38 spokes; flesh at two depths; wandering rays; fibrous core; fuzz patches; a stem scar |
| Passion fruit | Pulp of soft jelly sacs on the shared aril builder (`arils.js`); spongy pith and lining; wrinkled, dimpled shell |
| Dragon fruit | After the reference photo (Commons, Pitaya cross section): crinkled wet flesh with seeds in halos; thick two-sided bracts in a spiral, a crown; deeper skin. Bracts could blend into the skin more |
| Peach | After the reference photo (Commons, Autumn red peaches): pale cream flesh, a red stain round the stone breaking into threads, torn-cell domes for the wet film; a bigger almond stone with furrows and pits; hollows now shade their inside (a BackSide normal fix, also for the rambutan) |
| Rambutan | After the reference photo (Commons, Rambutan on white): glassy flesh at two depths, milky fibres along the ray, a soft wet film; seed coat, gap and shell; crimson skin, more and thinner spines with curled dark tips |
| Mangosteen | After the reference photo (Commons, Mangosteens whole and opened): pillowed segments with lobed edges, a dark gap, a wine-red rind; skin darkened to near-black purple; olive cap |
| Starfruit | After reference photos (Commons, carambola whole and star slices): deeper star, clear golden flesh at two depths, veins and walls, smaller seeds; warmer golden skin with green-brown ridge crests; less glow |
| Blood orange | Tried vesicles as geometry: read as a petal mosaic (Tom: not realistic). Now one wet face: dark flesh, sac-scale round domes under a sharp reflection for crinkled glints, faint walls, narrow albedo, thick rind (reference: Commons, Silentcynic, CC BY 3.0) |

## Interaction (Tom, 2026-11-23)

| Pass | What |
|---|---|
| Floor, seams, halves, light | Exact floor contact; no seams; halves squeeze, drip and wobble on their own; light through the fruit with a light drag |
| Juice puddle | Drops pool into one glossy puddle that spreads, holds its edge, mixes colours and mirrors the fruit |
| Wedges | A swipe across a half or wedge splits it lengthwise along the swipe; pieces are sectors of the half; lengthwise faces from each fruit's pattern |
| Loose seeds | Flick a piece (or press F): arils, sacs or seeds tumble out, bounce, roll and rest |

Ideas waiting: tear open or peel, a bite.

## Next: one fruit at a time

For each fruit, against its reference photos:

| Part | Aim |
|---|---|
| Shape | Real proportions; lobes, ridges and creases in the geometry |
| Skin | Procedural detail at several scales; real roughness; a scatter tint |
| Cut face | Cells, fibres and juice as real structure, more of it as geometry or beads where it catches light |
| Light | Contact shadow and occlusion on the cut face; the face's own soft shadow from the rind |

Order: Tom's pick. Each fruit is one pass, one commit, shown before the next.

## Techniques

| Raspberry idea | Here |
|---|---|
| Each drupelet a turbid sphere | Juice beads: kiwi jelly ring, pomegranate arils, passion fruit sacs |
| Hairs as camera-facing ribbons | Kiwi and peach fuzz, rambutan spines |
| Velvet for fine fuzz | A sheen term scaled by the Fuzz slider |
| Baked soft light (SH transfer) | Skipped: needs an offline bake |
| Lens finish | Depth of field, bloom, ACES, vignette, grain, quality presets |
