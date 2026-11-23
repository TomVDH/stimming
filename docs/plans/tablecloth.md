# Tablecloth yank

Status: done, built as a Lab toy, 2026-11-23. Bean `stimming-nf4i`. Toy doc: `docs/toys/tablecloth.md`.
Idea 112, group E, a physics loop: "Drag the cloth edge and yank it. Plates and glasses stay put or crash, depending on how fast you pull."
Tom's brief: an MVP at high fidelity, Lab and intro icons, Bar v3. One hero moment, finished.

## Defaults (chosen in the build chat)

| | Choice | Why |
|---|---|---|
| Type | Scene: three.js 0.170, WebGL | The setting shivers in depth, glasses tip, pieces fall to a floor in front of the table. A flat view loses the fall. |
| Shot | A fixed camera at the table's pull-end corner, above and back, looking along the table. The hem hangs at the near end; the floor in front of the pull end is in frame. A tall frame stands further back. | The pull runs toward the viewer and down on screen. A setting that comes off the end lands in the foreground. |
| Place | A dining room at night. One warm pendant lamp above the table makes a pool of light; one candle on the table flickers. The room falls off into dark haze. | Light carries the scene: the pool on the white cloth, glints on glass and cutlery, the candle in the wine. |
| Table | A walnut table, 1.4 x 0.85 m, top at 0.75 m, on four legs | A table for two. |
| Cloth | White satin damask, 2.1 x 1.5 m, hanging about 0.33 m on each side | A smooth cloth is the one that works for the trick. |
| Setting | Two places across the table: a dinner plate, a knife, a fork, a wine glass with red wine, a tumbler with water. A brass candlestick with a white candle between them. 11 pieces. | Enough to read as a set table; few enough to keep the sim cheap. |

## The physics, from the real trick

Sources: University of Maryland lecture demo "Tablecloth" (lecdem.physics.umd.edu), Rutgers demo 1F20.30 "Tablecloth and Dishes".

- Friction acts only while the cloth is under a piece. A piece gains a speed of about mu g t, where t is the time the cloth needs to clear it. A fast pull keeps t short.
- A slow pull lets static friction carry the piece with the cloth, to the edge and off.
- The pull goes down over the edge, so the cloth does not lift the near edge of the setting.
- A tall piece tips when friction times its centre height beats gravity times its base radius. A wine glass is at risk; a plate is not.
- After the cloth clears, a piece slides a little on the bare wood and stops.
- When the trailing edge of the cloth passes under a piece, it flicks it: the piece jumps a hair, rattles and its liquid sloshes.

## Hero

1. Press the hanging hem: the hand takes the whole hem.
2. Drag: the cloth follows the hand, down and toward the viewer.
3. Fast: let go mid-flick and the hand follows through. The cloth whips out from under the setting. Plates rattle, glasses rock, wine sloshes, the candle flame leans. All stays on the table, a few centimetres closer to the pull end. The cloth flies past and drops to the floor.
4. Slow: the setting rides with the cloth. The near pieces reach the edge, tip and fall. Glass and porcelain shatter on the boards; wine and water splash; cutlery clatters; the candle goes out.
5. Reset: the pieces lift, the cloth flies back under them, the shards fade, and each piece lowers into its place with a soft clink. The table resets by itself 2.5 s after all comes to rest.

## Sim

- Cloth: Verlet particles on a 48 x 34 grid at 120 Hz, structural, shear and bend links, a tether to the held hem along the path over the table's edges, collision with the table block (top and apron) and the floor, friction on both.
- Pieces: rigid bodies after Wrecking ball (sphere sets) at 240 Hz; plane contacts solve friction once at the contact centroid. Each contact under the cloth takes the cloth's velocity at that point; elsewhere the table's wood.
- Shatter: a glass or plate that meets the floor fast breaks into curved shards (lathe patches of its own shape) and glitter. The foot and stem of a wine glass survive.
- Liquid: each glass has a slosh oscillator (first mode of a cylinder). The surface stays level in the world and lags the glass. A tipped glass pours.

## Sound

Raw Web Audio on the shared kit, muted by default. Cloth hiss that follows the slip speed, a snap as the trailing edge clears, plate chatter, glass clinks, cutlery ticks, a slosh, the crash of porcelain and glass on the floor, the clatter of steel, a small dining room echo.

## Bar v3

Actions: Yank (Space): a clean yank at the Speed set (0.6 to 8 m/s, log scale). Reset (R). Slider: Speed. Help rows for drag, release, Space and R. A released flick follows through at 1.5 times its speed.

## Loop

Lively while the hand holds the cloth, the cloth moves, a piece moves, a shard flies, the liquid sloshes or the reset runs. The candle drifts at 30 fps and sleeps 60 s after the last input; audio rests as soon as nothing moves. Reduced motion: no flame flicker, no camera shake; the reset places pieces on straight paths.
