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
